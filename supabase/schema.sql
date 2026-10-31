-- 벌점 관리 도우미 - DB 스키마 (차시 7)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여 넣고 Run.
-- 여러 번 실행해도 괜찮게 만들어 두었다. (이미 있는 테이블/정책은 건너뜀)
--
-- 모든 테이블은 로그인한 사용자(auth.uid()) 본인의 행만 읽고 쓸 수 있도록
-- Row Level Security(RLS)를 켠다. 브라우저에서 Publishable key로 접근해도 남의 기록은 보이지 않는다.
-- 벌점 사유 기준표(reasons)는 바뀔 일이 적어 앱 코드(lib/reasons.ts)에 두고, 기록에는 사유 id와 이름을 함께 저장한다.

-- ── 학생 설정 (로그인한 사용자 1명당 1행) ─────────────────────────
create table if not exists public.students (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  target_score integer not null default 10 check (target_score between 0 and 29),
  updated_at   timestamptz not null default now()
);

-- ── 벌점·상점 기록 ───────────────────────────────────────────────
create table if not exists public.records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  record_date  date not null,
  kind         text not null check (kind in ('penalty', 'merit')),
  reason_id    text not null,
  reason_label text not null,
  points       numeric(5, 1) not null check (points > 0),
  memo         text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists records_user_date_idx on public.records (user_id, record_date desc);

-- ── 선생님이 모집한 상점 활동 ────────────────────────────────────
create table if not exists public.merit_activities (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  points     numeric(5, 1) not null check (points > 0),
  created_at timestamptz not null default now()
);
create index if not exists merit_activities_user_idx on public.merit_activities (user_id);

-- ── 권한 + RLS: 로그인한 사용자는 자기 행만 ──────────────────────
grant select, insert, update, delete
  on public.students, public.records, public.merit_activities to authenticated;

alter table public.students         enable row level security;
alter table public.records          enable row level security;
alter table public.merit_activities enable row level security;

drop policy if exists "own rows" on public.students;
create policy "own rows" on public.students
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own rows" on public.records;
create policy "own rows" on public.records
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own rows" on public.merit_activities;
create policy "own rows" on public.merit_activities
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
