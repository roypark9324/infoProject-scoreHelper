-- 벌점 관리 도우미 - 계정 역할 (학생 / 선생님 / 관리자) + 선생님 신청·승인
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여 넣고 Run.
-- 실행 순서: schema.sql → accounts.sql → board.sql → tips.sql. 여러 번 실행해도 괜찮다.
--
-- 역할은 profiles.role 에만 저장한다. (로그인 때 사용자가 보내는 값(user_metadata)은 믿지 않는다.)
--   student : 회원가입하면 기본값
--   teacher : 선생님 신청 → 관리자가 승인하면 바뀜
--   admin   : 서비스 운영자. 아래 한 줄을 SQL Editor에서 직접 실행해야만 만들 수 있다.
--
--   update public.profiles set role = 'admin' where email = '내이메일@example.com';
--
-- 브라우저(Publishable key)에는 profiles 수정 권한을 주지 않는다.
-- 신청·승인·해제는 아래 함수로만 가능하다.

-- ── 프로필 (로그인한 사용자 1명당 1행) ───────────────────────────
create table if not exists public.profiles (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  email                text not null,
  name                 text not null default '',
  role                 text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  teacher_request      text not null default 'none' check (teacher_request in ('none', 'pending', 'rejected')),
  teacher_requested_at timestamptz,
  created_at           timestamptz not null default now()
);

-- 회원가입하면 프로필을 자동으로 만든다. 이름은 가입 화면에서 받은 값(full_name)을 쓴다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, name)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 30)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이미 가입해 있던 계정에도 프로필을 만들어 둔다.
insert into public.profiles (user_id, email, name)
select u.id, lower(coalesce(u.email, '')), left(coalesce(u.raw_user_meta_data ->> 'full_name', ''), 30)
from auth.users u
on conflict (user_id) do nothing;

-- ── 역할 확인 함수 ───────────────────────────────────────────────
-- profiles 를 직접 읽지 않고도 쓸 수 있고, RLS 정책 안에서 불러도 순환하지 않도록 security definer 로 만든다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 게시판·팁 게시판이 쓰는 함수. 승인된 선생님과 관리자는 선생님 기능을 쓸 수 있다.
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('teacher', 'admin')
  );
$$;
revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

-- ── 권한 + RLS: 읽기만 가능. 내 프로필, 관리자는 전체 ─────────────
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
alter table public.profiles enable row level security;

drop policy if exists "profile read own" on public.profiles;
create policy "profile read own" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "profile read admin" on public.profiles;
create policy "profile read admin" on public.profiles
  for select to authenticated using (public.is_admin());

-- ── 선생님 신청 (학생) ───────────────────────────────────────────
create or replace function public.request_teacher()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set teacher_request = 'pending', teacher_requested_at = now()
   where user_id = auth.uid()
     and role = 'student'
     and teacher_request in ('none', 'rejected');
  if not found then
    raise exception '선생님 신청을 할 수 없는 상태입니다. (이미 신청했거나 선생님·관리자 계정입니다)';
  end if;
end;
$$;
revoke all on function public.request_teacher() from public, anon;
grant execute on function public.request_teacher() to authenticated;

-- ── 승인 / 거절 (관리자 전용) ────────────────────────────────────
create or replace function public.decide_teacher(p_user uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 처리할 수 있습니다.';
  end if;

  if p_approve then
    update public.profiles
       set role = 'teacher', teacher_request = 'none'
     where user_id = p_user and role = 'student' and teacher_request = 'pending';
  else
    update public.profiles
       set teacher_request = 'rejected'
     where user_id = p_user and role = 'student' and teacher_request = 'pending';
  end if;

  if not found then
    raise exception '대기 중인 신청을 찾을 수 없습니다.';
  end if;
end;
$$;
revoke all on function public.decide_teacher(uuid, boolean) from public, anon;
grant execute on function public.decide_teacher(uuid, boolean) to authenticated;

-- ── 선생님 권한 해제 (관리자 전용) ────────────────────────────────
create or replace function public.revoke_teacher(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 처리할 수 있습니다.';
  end if;

  update public.profiles
     set role = 'student', teacher_request = 'none'
   where user_id = p_user and role = 'teacher';

  if not found then
    raise exception '선생님 계정을 찾을 수 없습니다.';
  end if;
end;
$$;
revoke all on function public.revoke_teacher(uuid) from public, anon;
grant execute on function public.revoke_teacher(uuid) to authenticated;

notify pgrst, 'reload schema';
