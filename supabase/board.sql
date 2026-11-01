-- 벌점 관리 도우미 - 상점 모집 게시판 (선생님이 모집 → 학생 신청 → 선생님 인정 → 상점 기록 자동 추가)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여 넣고 Run.
-- schema.sql을 먼저 실행한 뒤에 실행한다. 여러 번 실행해도 괜찮다.
--
-- 선생님 등록: 아래 한 줄을 SQL Editor에서 실행한다. (이메일은 소문자로)
--   insert into public.teachers (email) values ('teacher@example.com') on conflict do nothing;
-- 선생님 해제: delete from public.teachers where email = 'teacher@example.com';

-- ── 선생님 이메일 목록 ───────────────────────────────────────────
-- 정책을 만들지 않아 브라우저(Publishable key)에서는 읽을 수도 쓸 수도 없다.
-- 대시보드(SQL Editor / Table Editor)에서만 관리한다.
create table if not exists public.teachers (
  email text primary key check (email = lower(email))
);
alter table public.teachers enable row level security;
revoke all on public.teachers from anon, authenticated;

-- 지금 로그인한 사용자가 선생님인지 (teachers 테이블을 직접 못 읽으므로 함수로만 확인)
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teachers t where t.email = lower(auth.jwt() ->> 'email')
  );
$$;
revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

-- ── 모집 글 (선생님만 작성, 로그인한 누구나 읽기) ─────────────────
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

-- ── 참여 신청 (학생이 신청, 선생님이 인정/거절) ────────────────────
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

drop policy if exists "posts teacher insert" on public.merit_posts;
create policy "posts teacher insert" on public.merit_posts
  for insert to authenticated
  with check (public.is_teacher() and author_id = (select auth.uid()));

drop policy if exists "posts teacher update" on public.merit_posts;
create policy "posts teacher update" on public.merit_posts
  for update to authenticated
  using (public.is_teacher() and author_id = (select auth.uid()))
  with check (public.is_teacher() and author_id = (select auth.uid()));

drop policy if exists "posts teacher delete" on public.merit_posts;
create policy "posts teacher delete" on public.merit_posts
  for delete to authenticated
  using (public.is_teacher() and author_id = (select auth.uid()));

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

-- 신청 만들기: 내 이름으로, 대기 상태로, 모집 중인 글에만
drop policy if exists "apps insert" on public.merit_applications;
create policy "apps insert" on public.merit_applications
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'pending'
    and student_email = (auth.jwt() ->> 'email')
    and exists (select 1 from public.merit_posts p where p.id = post_id and p.is_open)
  );

-- 신청 취소: 아직 처리되지 않은 내 신청만
drop policy if exists "apps delete own pending" on public.merit_applications;
create policy "apps delete own pending" on public.merit_applications
  for delete to authenticated
  using (student_id = (select auth.uid()) and status = 'pending');

-- ── 인정 / 거절 (선생님 전용) ────────────────────────────────────
-- 인정하면 신청한 학생의 records에 상점 기록이 자동으로 추가된다.
-- 학생의 records는 본인만 쓸 수 있으므로, 이 함수만 대신 넣을 수 있게 security definer로 만들었다.
create or replace function public.decide_application(p_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.merit_applications;
  p public.merit_posts;
begin
  if not public.is_teacher() then
    raise exception '선생님만 처리할 수 있습니다.';
  end if;

  select * into a from public.merit_applications where id = p_id for update;
  if not found then
    raise exception '신청을 찾을 수 없습니다.';
  end if;

  select * into p from public.merit_posts where id = a.post_id;
  if p.author_id <> auth.uid() then
    raise exception '내가 올린 모집 글의 신청만 처리할 수 있습니다.';
  end if;

  if a.status <> 'pending' then
    raise exception '이미 처리된 신청입니다.';
  end if;

  if p_approve then
    update public.merit_applications set status = 'approved', decided_at = now() where id = p_id;
    insert into public.records
      (user_id, record_date, kind, reason_id, reason_label, points, memo, source_application_id)
    values
      (a.student_id, (now() at time zone 'Asia/Seoul')::date, 'merit',
       'post:' || p.id::text, p.title, p.points, '선생님 인정 (' || p.author_email || ')', a.id);
  else
    update public.merit_applications set status = 'rejected', decided_at = now() where id = p_id;
  end if;
end;
$$;
revoke all on function public.decide_application(uuid, boolean) from public, anon;
grant execute on function public.decide_application(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
