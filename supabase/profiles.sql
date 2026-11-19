-- 벌점 관리 도우미 - 내 프로필 (이름, 학년, 소개, 프로필 사진)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여 넣고 Run.
-- friends.sql을 먼저 실행한 뒤에 실행한다. 여러 번 실행해도 괜찮다.
--
-- 테이블 이름을 user_profiles로 한 이유: remove-roles.sql이 예전 역할용 'profiles' 테이블을 지우기 때문이다.
-- 프로필은 나와 '수락된 친구'만 읽을 수 있고, 고치는 것은 본인만 할 수 있다.
-- 사진은 avatars 저장소(2MB 이하 jpg/png/webp)에 '내 id 폴더' 안에만 올릴 수 있다.

-- ── 프로필 ───────────────────────────────────────────────────────
create table if not exists public.user_profiles (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 20),
  grade        smallint check (grade between 1 and 3),
  bio          text not null default '' check (char_length(bio) <= 200),
  avatar_path  text,
  updated_at   timestamptz not null default now()
);

grant select, insert, update, delete on public.user_profiles to authenticated;
alter table public.user_profiles enable row level security;

drop policy if exists "profiles read" on public.user_profiles;
create policy "profiles read" on public.user_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = (select auth.uid()) and f.addressee_id = user_profiles.user_id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = user_profiles.user_id))
    )
  );

drop policy if exists "profiles insert" on public.user_profiles;
create policy "profiles insert" on public.user_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "profiles update" on public.user_profiles;
create policy "profiles update" on public.user_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "profiles delete" on public.user_profiles;
create policy "profiles delete" on public.user_profiles
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── 프로필 사진 저장소 ───────────────────────────────────────────
-- 공개 저장소: 사진 주소를 아는 사람은 볼 수 있다. 파일 이름에 내 id와 시각이 들어 있어 주소를 추측하기 어렵다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "avatars select own" on storage.objects;
create policy "avatars select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

notify pgrst, 'reload schema';
