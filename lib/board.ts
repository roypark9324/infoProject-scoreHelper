// 벌점 관리 도우미 - 상점 모집 게시판 (선생님이 모집 → 학생 신청 → 선생님 인정)
// 테이블과 권한은 supabase/board.sql 참고. 누가 선생님인지는 DB가 판단하고(is_teacher),
// 인정하면 DB 함수(decide_application)가 그 학생의 상점 기록을 대신 만들어 준다.

import type { MeritActivity } from "./reasons";
import { createClient } from "./supabase";

export interface MeritPost {
  id: string;
  authorId: string;
  authorEmail: string;
  title: string;
  description: string;
  /** 인정되면 받는 상점 (양수) */
  points: number;
  isOpen: boolean;
  createdAt: number;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface Application {
  id: string;
  postId: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  status: ApplicationStatus;
  createdAt: number;
}

export interface BoardData {
  /** 지금 로그인한 사용자의 id */
  userId: string;
  isTeacher: boolean;
  posts: MeritPost[];
  /** 내 신청 + (선생님이면) 내 모집 글에 들어온 신청 */
  applications: Application[];
}

const POST_COLS = "id, author_id, author_email, title, description, points, is_open, created_at";
const APP_COLS = "id, post_id, student_id, student_email, student_name, status, created_at";

interface PostRow {
  id: string;
  author_id: string;
  author_email: string;
  title: string;
  description: string;
  points: number;
  is_open: boolean;
  created_at: string;
}

interface ApplicationRow {
  id: string;
  post_id: string;
  student_id: string;
  student_email: string;
  student_name: string;
  status: ApplicationStatus;
  created_at: string;
}

/** 테이블·함수가 아직 없을 때 등 흔한 실패를 학생이 알아볼 수 있는 문장으로 바꾼다. */
function explain(error: { code?: string; message: string }): Error {
  if (["PGRST205", "PGRST202", "42P01", "42883"].includes(error.code ?? "")) {
    return new Error("모집 게시판용 DB가 아직 없습니다. supabase/board.sql을 SQL Editor에서 실행하세요.");
  }
  return new Error(error.message);
}

function toPost(row: PostRow): MeritPost {
  return {
    id: row.id,
    authorId: row.author_id,
    authorEmail: row.author_email,
    title: row.title,
    description: row.description,
    points: Number(row.points),
    isOpen: row.is_open,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    postId: row.post_id,
    studentId: row.student_id,
    studentEmail: row.student_email,
    studentName: row.student_name,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** 모집 중인 글을 '상쇄 계획'이 쓰는 활동 형태로 바꾼다. (id는 개인 활동과 겹치지 않게 접두어를 붙임) */
export function postsToActivities(posts: MeritPost[]): MeritActivity[] {
  return posts.filter((p) => p.isOpen).map((p) => ({ id: `post:${p.id}`, name: p.title, points: p.points }));
}

export async function fetchBoard(): Promise<BoardData> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("로그인 정보를 확인하지 못했습니다. 다시 로그인하세요.");

  const [teacher, posts, applications] = await Promise.all([
    supabase.rpc("is_teacher"),
    supabase.from("merit_posts").select(POST_COLS).order("created_at", { ascending: false }),
    supabase.from("merit_applications").select(APP_COLS).order("created_at", { ascending: true }),
  ]);
  if (teacher.error) throw explain(teacher.error);
  if (posts.error) throw explain(posts.error);
  if (applications.error) throw explain(applications.error);

  return {
    userId: auth.user.id,
    isTeacher: teacher.data === true,
    posts: (posts.data as PostRow[]).map(toPost),
    applications: (applications.data as ApplicationRow[]).map(toApplication),
  };
}

// ── 선생님 ─────────────────────────────────────────────

export async function createPost(input: { title: string; description: string; points: number }): Promise<void> {
  const { error } = await createClient()
    .from("merit_posts")
    .insert({ title: input.title, description: input.description, points: input.points });
  if (error) throw explain(error);
}

export async function setPostOpen(id: string, isOpen: boolean): Promise<void> {
  const { error } = await createClient().from("merit_posts").update({ is_open: isOpen }).eq("id", id);
  if (error) throw explain(error);
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await createClient().from("merit_posts").delete().eq("id", id);
  if (error) throw explain(error);
}

/** 신청을 인정(true)하거나 거절(false). 인정하면 그 학생의 상점 기록이 자동으로 생긴다. */
export async function decideApplication(id: string, approve: boolean): Promise<void> {
  const { error } = await createClient().rpc("decide_application", { p_id: id, p_approve: approve });
  if (error) throw explain(error);
}

// ── 학생 ───────────────────────────────────────────────

export async function applyToPost(postId: string): Promise<void> {
  const { error } = await createClient().from("merit_applications").insert({ post_id: postId });
  if (error) {
    if (error.code === "23505") throw new Error("이미 신청한 모집입니다.");
    throw explain(error);
  }
}

export async function cancelApplication(id: string): Promise<void> {
  const { error } = await createClient().from("merit_applications").delete().eq("id", id);
  if (error) throw explain(error);
}
