-- 벌점 관리 도우미 - 친구 + 벌점 대결, 모집 마감일 (탐구 일지 5회 피드백 반영)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여 넣고 Run.
-- schema.sql, board.sql을 먼저 실행한 뒤에 실행한다. 여러 번 실행해도 괜찮다.
--
-- 친구가 되면 서로의 '누적 벌점 합계'만 볼 수 있다. 기록(사유·날짜·메모)은 계속 본인만 볼 수 있다.
-- 합계는 security definer 함수(friend_scores)가 대신 계산해 주고, records 테이블 자체의 권한은 넓히지 않는다.

-- ── 친구 관계 ────────────────────────────────────────────────────
create table if not exists public.friendships (
  id              uuid primary key default gen_random_uuid(),
  requester_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  requester_email text not null default (auth.jwt() ->> 'email'),
  requester_name  text not null default (coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '')),
  addressee_id    uuid not null references auth.users (id) on delete cascade,
  addressee_email text not null,
  addressee_name  text not null default '',
  status          text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at      timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

-- 읽기·취소(삭제)만 직접 허용. 만들기와 수락은 아래 함수로만 한다.
grant select, delete on public.friendships to authenticated;
alter table public.friendships enable row level security;

drop policy if exists "friends read" on public.friendships;
create policy "friends read" on public.friendships
  for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

drop policy if exists "friends delete" on public.friendships;
create policy "friends delete" on public.friendships
  for delete to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

-- ── 친구 요청 (이메일로) ─────────────────────────────────────────
create or replace function public.request_friend(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target auth.users;
begin
  select * into target from auth.users where lower(email) = lower(trim(p_email));
  if not found then
    raise exception '그 이메일로 가입한 사용자를 찾을 수 없습니다.';
  end if;
  if target.id = auth.uid() then
    raise exception '나에게는 친구 요청을 보낼 수 없습니다.';
  end if;
  if exists (
    select 1 from public.friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = target.id)
       or (f.requester_id = target.id and f.addressee_id = auth.uid())
  ) then
    raise exception '이미 친구이거나 요청이 진행 중입니다.';
  end if;

  insert into public.friendships (requester_id, addressee_id, addressee_email, addressee_name)
  values (auth.uid(), target.id, target.email, coalesce(target.raw_user_meta_data ->> 'full_name', ''));
end;
$$;
revoke all on function public.request_friend(text) from public, anon;
grant execute on function public.request_friend(text) to authenticated;

-- ── 친구 요청 수락 (받은 사람만) ─────────────────────────────────
create or replace function public.accept_friend(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friendships
     set status = 'accepted'
   where id = p_id and addressee_id = auth.uid() and status = 'pending';
  if not found then
    raise exception '수락할 수 있는 친구 요청이 없습니다.';
  end if;
end;
$$;
revoke all on function public.accept_friend(uuid) from public, anon;
grant execute on function public.accept_friend(uuid) to authenticated;

-- ── 벌점 대결용 합계 (나 + 수락된 친구) ──────────────────────────
-- p_since 이후 기록의 '받은 벌점 − 상점'(0 아래로 내려가지 않음)만 돌려준다.
-- 앱의 calcTotals와 같은 계산이다. 기록 내용은 돌려주지 않는다.
create or replace function public.friend_scores(p_since date)
returns table (user_id uuid, name text, email text, net numeric)
language sql
security definer
set search_path = public
stable
as $$
  with people as (
    select auth.uid() as uid, (auth.jwt() ->> 'email') as email,
           coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '') as name
    union
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end,
           case when f.requester_id = auth.uid() then f.addressee_email else f.requester_email end,
           case when f.requester_id = auth.uid() then f.addressee_name else f.requester_name end
    from public.friendships f
    where f.status = 'accepted' and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  )
  select p.uid, p.name, p.email,
         greatest(0, coalesce(sum(case r.kind when 'penalty' then r.points else -r.points end), 0))
  from people p
  left join public.records r on r.user_id = p.uid and r.record_date >= p_since
  group by p.uid, p.name, p.email
  order by 4 asc, 2 asc;
$$;
revoke all on function public.friend_scores(date) from public, anon;
grant execute on function public.friend_scores(date) to authenticated;

-- ── 모집 마감일 (선택) ───────────────────────────────────────────
alter table public.merit_posts add column if not exists deadline date;

-- 마감일이 지난 글에는 새로 신청할 수 없게 신청 정책을 다시 만든다.
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
        and (p.deadline is null or p.deadline >= (now() at time zone 'Asia/Seoul')::date)
    )
  );

notify pgrst, 'reload schema';
