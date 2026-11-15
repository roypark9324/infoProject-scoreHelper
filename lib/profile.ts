// 계정 역할(학생 / 선생님 / 관리자)과 선생님 신청·승인.
// 테이블과 권한은 supabase/accounts.sql 참고. 역할은 DB(profiles.role)만 바꿀 수 있고,
// 브라우저는 신청(request_teacher)과, 관리자의 승인·해제 함수만 부를 수 있다.

import { createClient } from "./supabase";

export type Role = "student" | "teacher" | "admin";
export type TeacherRequest = "none" | "pending" | "rejected";

export const ROLE_LABEL: Record<Role, string> = {
  student: "학생",
  teacher: "선생님",
  admin: "관리자",
};

export interface Profile {
  userId: string;
  email: string;
  name: string;
  role: Role;
  teacherRequest: TeacherRequest;
  requestedAt: number | null;
}

interface ProfileRow {
  user_id: string;
  email: string;
  name: string;
  role: Role;
  teacher_request: TeacherRequest;
  teacher_requested_at: string | null;
}

const COLS = "user_id, email, name, role, teacher_request, teacher_requested_at";

function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    teacherRequest: row.teacher_request,
    requestedAt: row.teacher_requested_at ? new Date(row.teacher_requested_at).getTime() : null,
  };
}

/** 테이블·함수가 아직 없을 때 등 흔한 실패를 학생이 알아볼 수 있는 문장으로 바꾼다. */
function explain(error: { code?: string; message: string }): Error {
  if (["PGRST205", "PGRST202", "42P01", "42883"].includes(error.code ?? "")) {
    return new Error("계정 역할용 DB가 아직 없습니다. supabase/accounts.sql을 SQL Editor에서 실행하세요.");
  }
  return new Error(error.message);
}

/** 내 프로필. (관리자는 전체를 읽을 수 있으므로 반드시 내 user_id로 거른다) */
export async function fetchMyProfile(): Promise<Profile> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("로그인 정보를 확인하지 못했습니다. 다시 로그인하세요.");

  const { data, error } = await supabase
    .from("profiles")
    .select(COLS)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw explain(error);
  if (!data) throw new Error("프로필을 찾을 수 없습니다. supabase/accounts.sql을 실행했는지 확인하세요.");
  return toProfile(data as ProfileRow);
}

/** 관리자 전용: 전체 계정. 일반 계정이 부르면 자기 행만 돌아온다. */
export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await createClient()
    .from("profiles")
    .select(COLS)
    .order("teacher_requested_at", { ascending: true, nullsFirst: false });
  if (error) throw explain(error);
  return (data as ProfileRow[]).map(toProfile);
}

// ── 학생 ───────────────────────────────────────────────

export async function requestTeacher(): Promise<void> {
  const { error } = await createClient().rpc("request_teacher");
  if (error) throw explain(error);
}

// ── 관리자 ─────────────────────────────────────────────

export async function decideTeacher(userId: string, approve: boolean): Promise<void> {
  const { error } = await createClient().rpc("decide_teacher", { p_user: userId, p_approve: approve });
  if (error) throw explain(error);
}

export async function revokeTeacher(userId: string): Promise<void> {
  const { error } = await createClient().rpc("revoke_teacher", { p_user: userId });
  if (error) throw explain(error);
}
