-- 벌점 관리 도우미 - 선생님/관리자 역할 기능 제거 (한 번만 실행)
-- 실행 순서: board.sql → tips.sql → 이 파일. (두 파일이 is_teacher()를 더 이상 쓰지 않게 된 뒤에 지운다.)
-- 예전 accounts.sql이 만든 프로필 테이블·가입 트리거·역할 함수를 모두 지운다. 여러 번 실행해도 괜찮다.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 테이블을 먼저 지워야 그 테이블의 정책이 is_admin()을 놓아 준다.
drop table if exists public.profiles;

drop function if exists public.request_teacher();
drop function if exists public.decide_teacher(uuid, boolean);
drop function if exists public.revoke_teacher(uuid);
drop function if exists public.is_teacher();
drop function if exists public.is_admin();

notify pgrst, 'reload schema';
