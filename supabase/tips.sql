-- 벌점 관리 도우미 - 벌점 줄이기 팁 게시판 (학생들이 사유별 팁을 올리고 "도움이 돼요"를 누른다)
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여 넣고 Run.
-- schema.sql, board.sql을 먼저 실행한 뒤에 실행한다. (선생님 확인 함수 is_teacher()를 쓴다)
-- 여러 번 실행해도 괜찮다.
--
-- 글쓴이는 화면에 이름 없이 "익명 학생"으로만 보인다. 부적절한 글은 선생님 계정이 삭제할 수 있다.

-- ── 팁 ───────────────────────────────────────────────────────────
create table if not exists public.tips (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason_id  text not null,
  body       text not null check (char_length(body) between 5 and 200),
  created_at timestamptz not null default now()
);
create index if not exists tips_reason_idx on public.tips (reason_id, created_at desc);

-- ── 도움이 돼요 (한 사람이 한 팁에 한 번) ─────────────────────────
create table if not exists public.tip_votes (
  tip_id     uuid not null references public.tips (id) on delete cascade,
  voter_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tip_id, voter_id)
);

-- ── 권한 + RLS ───────────────────────────────────────────────────
-- 팁은 수정 기능이 없으므로 update 권한은 주지 않는다.
grant select, insert, delete on public.tips to authenticated;
grant select, insert, delete on public.tip_votes to authenticated;

alter table public.tips      enable row level security;
alter table public.tip_votes enable row level security;

-- 팁: 로그인한 누구나 읽고, 내 이름으로만 쓰고, 내 글(또는 선생님은 모든 글)만 지운다.
drop policy if exists "tips read" on public.tips;
create policy "tips read" on public.tips
  for select to authenticated using (true);

drop policy if exists "tips insert" on public.tips;
create policy "tips insert" on public.tips
  for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists "tips delete" on public.tips;
create policy "tips delete" on public.tips
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_teacher());

-- 도움이 돼요: 로그인한 누구나 개수를 보고, 내 표만 넣고 뺀다.
drop policy if exists "votes read" on public.tip_votes;
create policy "votes read" on public.tip_votes
  for select to authenticated using (true);

drop policy if exists "votes insert" on public.tip_votes;
create policy "votes insert" on public.tip_votes
  for insert to authenticated with check (voter_id = (select auth.uid()));

drop policy if exists "votes delete own" on public.tip_votes;
create policy "votes delete own" on public.tip_votes
  for delete to authenticated using (voter_id = (select auth.uid()));

notify pgrst, 'reload schema';
