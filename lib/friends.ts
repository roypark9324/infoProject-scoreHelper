// 벌점 관리 도우미 - 친구 + 벌점 대결
// 테이블과 함수는 supabase/friends.sql 참고. 친구끼리는 '누적 벌점 합계'만 보이고 기록 내용은 보이지 않는다.

import { createClient } from "./supabase";

export type FriendStatus = "pending" | "accepted";

export interface Friendship {
  id: string;
  requesterId: string;
  requesterEmail: string;
  requesterName: string;
  addresseeId: string;
  addresseeEmail: string;
  addresseeName: string;
  status: FriendStatus;
}

export interface FriendsData {
  /** 지금 로그인한 사용자의 id */
  userId: string;
  friendships: Friendship[];
}

/** 대결 순위표의 한 줄 */
export interface ScoreRow {
  userId: string;
  name: string;
  email: string;
  /** 선택한 기간의 누적 벌점 (벌점 − 상점, 0 아래로는 내려가지 않음) */
  net: number;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  requester_email: string;
  requester_name: string;
  addressee_id: string;
  addressee_email: string;
  addressee_name: string;
  status: FriendStatus;
}

interface ScoreRowDb {
  user_id: string;
  name: string;
  email: string;
  net: number | string;
}

const COLS =
  "id, requester_id, requester_email, requester_name, addressee_id, addressee_email, addressee_name, status";

/** 테이블·함수가 아직 없을 때 등 흔한 실패를 학생이 알아볼 수 있는 문장으로 바꾼다. */
function explain(error: { code?: string; message: string }): Error {
  if (["PGRST205", "PGRST202", "42P01", "42883"].includes(error.code ?? "")) {
    return new Error("친구 기능용 DB가 아직 없습니다. supabase/friends.sql을 SQL Editor에서 실행하세요.");
  }
  return new Error(error.message);
}

export async function fetchFriends(): Promise<FriendsData> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("로그인 정보를 확인하지 못했습니다. 다시 로그인하세요.");

  const { data, error } = await supabase.from("friendships").select(COLS).order("created_at", { ascending: true });
  if (error) throw explain(error);

  return {
    userId: auth.user.id,
    friendships: (data as FriendshipRow[]).map((r) => ({
      id: r.id,
      requesterId: r.requester_id,
      requesterEmail: r.requester_email,
      requesterName: r.requester_name,
      addresseeId: r.addressee_id,
      addresseeEmail: r.addressee_email,
      addresseeName: r.addressee_name,
      status: r.status,
    })),
  };
}

/** 나 + 수락된 친구의 누적 벌점 (since 이후 기록만, YYYY-MM-DD). 적은 순으로 온다. */
export async function fetchScores(since: string): Promise<ScoreRow[]> {
  const { data, error } = await createClient().rpc("friend_scores", { p_since: since });
  if (error) throw explain(error);
  return (data as ScoreRowDb[]).map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email,
    net: Number(r.net),
  }));
}

export async function requestFriend(email: string): Promise<void> {
  const { error } = await createClient().rpc("request_friend", { p_email: email });
  if (error) throw explain(error);
}

export async function acceptFriend(id: string): Promise<void> {
  const { error } = await createClient().rpc("accept_friend", { p_id: id });
  if (error) throw explain(error);
}

/** 요청 거절·취소·친구 끊기 모두 관계 행을 지우는 것으로 처리한다. */
export async function removeFriend(id: string): Promise<void> {
  const { error } = await createClient().from("friendships").delete().eq("id", id);
  if (error) throw explain(error);
}
