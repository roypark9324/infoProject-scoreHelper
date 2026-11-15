-- 벌점 관리 도우미 - 상점 모집 게시판 (누구나 모집 → 다른 사람이 신청 → 모집한 사람이 인정 → 상점 기록 자동 추가)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여 넣고 Run.
-- schema.sql을 먼저 실행한 뒤에 실행한다. 여러 번 실행해도 괜찮다.
--
-- 선생님·관리자 같은 역할은 없다. 가입한 누구나 모집 글을 올리고, 자기 글에 들어온 신청을 인정/거절할 수 있다.
-- 인정하면 신청한 사람의 상점 기록 메모에 '누가 상점을 줬는지'(이름·이메일)가 남는다.

-- ── 모집 글 (로그인한 누구나 작성·읽기) ───────────────────────────
create table if not exists public.merit_posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_email text not null default (auth.jwt() ->> 'email'),
  title        text not null check (char_length(title) between 1 and 60),
  description  text not null default '' check (char_length(description) <= 300),
  points       numeric(5, 1) not null check (points > 0),
  is_open      boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 모집한 사람의 이름 (가입 때 입력한 이름)
alter table public.merit_posts
  add column if not exists author_name text not null default (coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', ''));

-- ── 참여 신청 (누구나 신청, 모집한 사람이 인정/거절) ────────────────
create table if not exists public.merit_applications (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.merit_posts (id) on delete cascade,
  student_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_email text not null default (auth.jwt() ->> 'email'),
  student_name  text not null default (coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '')),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  unique (post_id, student_id)
);
create index if not exists merit_applications_post_idx on public.merit_applications (post_id);

-- 인정된 신청으로 만들어진 상점 기록을 구분하기 위한 칸 (같은 신청이 두 번 기록되지 않게 unique)
alter table public.records
  add column if not exists source_application_id uuid unique
  references public.merit_applications (id) on delete set null;

-- ── 권한 + RLS ───────────────────────────────────────────────────
-- 신청은 update 권한을 주지 않는다. 상태 변경은 아래 decide_application 함수로만 가능하다.
grant select, insert, update, delete on public.merit_posts to authenticated;
grant select, insert, delete on public.merit_applications to authenticated;

alter table public.merit_posts        enable row level security;
alter table public.merit_applications enable row level security;

drop policy if exists "posts read" on public.merit_posts;
create policy "posts read" on public.merit_posts
  for select to authenticated using (true);

-- 예전 '선생님만' 정책 정리
drop policy if exists "posts teacher insert" on public.merit_posts;
drop policy if exists "posts teacher update" on public.merit_posts;
drop policy if exists "posts teacher delete" on public.merit_posts;

-- 모집 글: 내 이름으로만 쓰고, 내 글만 고치고 지운다.
drop policy if exists "posts insert own" on public.merit_posts;
create policy "posts insert own" on public.merit_posts
  for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists "posts update own" on public.merit_posts;
create policy "posts update own" on public.merit_posts
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "posts delete own" on public.merit_posts;
create policy "posts delete own" on public.merit_posts
  for delete to authenticated using (author_id = (select auth.uid()));

-- 신청 읽기: 내 신청, 또는 내가 올린 모집 글에 들어온 신청
drop policy if exists "apps read own" on public.merit_applications;
create policy "apps read own" on public.merit_applications
  for select to authenticated using (student_id = (select auth.uid()));

drop policy if exists "apps read by author" on public.merit_applications;
create policy "apps read by author" on public.merit_applications
  for select to authenticated
  using (exists (
    select 1 from public.merit_posts p
    where p.id = post_id and p.author_id = (select auth.uid())
  ));

-- 신청 만들기: 내 이름으로, 대기 상태로, 모집 중이며 내가 쓰지 않은 글에만
drop policy if exists "apps insert" on public.merit_applications;
create policy "apps insert" on public.merit_applications
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'pending'
    and student_email = (auth.jwt() ->> 'email')
    and exists (
      select 1 from public.merit_posts p
      where p.id = post_id and p.is_open and p.author_id <> (select auth.uid())
    )
  );

-- 신청 취소: 아직 처리되지 않은 내 신청만
drop policy if exists "apps delete own pending" on public.merit_applications;
create policy "apps delete own pending" on public.merit_applications
  for delete to authenticated
  using (student_id = (select auth.uid()) and status = 'pending');

-- ── 인정 / 거절 (모집 글을 올린 사람만) ───────────────────────────
-- 인정하면 신청한 사람의 records에 상점 기록이 자동으로 추가되고, 메모에 '누가 줬는지'가 남는다.
-- 남의 records는 본인만 쓸 수 있으므로, 이 함수만 대신 넣을 수 있게 security definer로 만들었다.
create or replace function public.decide_application(p_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.merit_applications;
  p public.merit_posts;
  giver text;
begin
  select * into a from public.merit_applications where id = p_id for update;
  if not found then
    raise exception '신청을 찾을 수 없습니다.';
  end if;

  select * into p from public.merit_posts where id = a.post_id;
  if p.author_id <> auth.uid() then
    raise exception '내가 올린 모집 글의 신청만 처리할 수 있습니다.';
  end if;

  if a.student_id = auth.uid() then
    raise exception '내 신청은 내가 처리할 수 없습니다.';
  end if;

  if a.status <> 'pending' then
    raise exception '이미 처리된 신청입니다.';
  end if;

  if p_approve then
    giver := case when p.author_name <> '' then p.author_name || ' (' || p.author_email || ')' else p.author_email end;
    update public.merit_applications set status = 'approved', decided_at = now() where id = p_id;
    insert into public.records
      (user_id, record_date, kind, reason_id, reason_label, points, memo, source_application_id)
    values
      (a.student_id, (now() at time zone 'Asia/Seoul')::date, 'merit',
       'post:' || p.id::text, p.title, p.points, '상점 준 사람: ' || giver, a.id);
  else
    update public.merit_applications set status = 'rejected', decided_at = now() where id = p_id;
  end if;
end;
$$;
revoke all on function public.decide_application(uuid, boolean) from public, anon;
grant execute on function public.decide_application(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
