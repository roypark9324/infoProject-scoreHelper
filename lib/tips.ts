// 벌점 관리 도우미 - 벌점을 줄이는 방법 (IPO의 '출력': 원인 분석 + 해결 방안)
// 1) SOLUTIONS: 사유마다 미리 써 둔 해결 방법. 원인 분석 1~3위 아래에 보여 준다.
// 2) 팁 게시판: 학생들이 사유별 팁을 올리고 "도움이 돼요"를 누른다. (테이블은 supabase/tips.sql)

import { REASONS } from "./reasons";
import { createClient } from "./supabase";

/** 사유 id → 해결 방법 (2개씩). 학교 규정에 맞게 고치려면 이 목록만 바꾸면 된다. */
export const SOLUTIONS: Record<string, string[]> = {
  "room-untidy": [
    "점호 전 5분을 ‘정리 타임’으로 정해 책상·침구·바닥부터 정리하기",
    "룸메이트와 청소 당번표를 만들어 번갈아 맡기",
  ],
  "roll-call-late": [
    "점호·퇴실 10분 전에 알람을 맞추고 반복 일정으로 등록하기",
    "샤워·정리처럼 점호 전에 할 일은 미리 끝내 두기",
  ],
  "study-room-late": [
    "마지막 수업 전에 가져갈 책과 준비물을 미리 챙겨 두기",
    "수업이 끝나면 곧바로 이동하는 습관 들이기 (친구와 같이 가면 더 잘 지켜져요)",
  ],
  "cleaning-untidy": [
    "청소 구역 점검표를 만들어 마지막에 한 번 더 확인하기",
    "구역을 나누어 맡을 사람을 미리 정하기",
  ],
  "morning-assembly": [
    "전날 취침 시간을 정해 두고 기상 알람을 2개 맞추기",
    "룸메이트와 서로 깨워 주기로 약속하기",
  ],
  "wrong-place-free-period": [
    "공강 시간표와 장소를 휴대폰 메모에 적어 두기",
    "장소를 옮겨야 하면 먼저 선생님께 말씀드리고 허락받기",
  ],
  "enter-others-room": [
    "친구와의 이야기는 공용 공간에서, 허용된 시간에 하기",
    "야간 점호 후에는 내 방에 머무는 것을 나만의 규칙으로 정하기",
  ],
  "disturbing-others": [
    "취침·학습 시간에는 목소리와 소리를 줄이고 이어폰 쓰기",
    "친구와의 대화나 장난은 공용 공간에서 하기",
  ],
  "forbidden-item": [
    "반입 가능한 물품 목록을 미리 확인하고 챙기기",
    "애매한 물건은 가져오기 전에 사감 선생님께 먼저 물어보기",
  ],
  "room-door-misuse": [
    "문은 정해진 방법으로만 사용하기",
    "사생활이 필요하거나 불편한 일이 있으면 선생님께 상담하기",
  ],
  "place-violation": [
    "취침은 내 침대에서만 하기",
    "이동하기 전에 지금 있어도 되는 장소인지 규정으로 확인하기",
  ],
  "loud-noise": [
    "노래·장난은 허용된 공간과 시간에만 하기",
    "복도와 방에서는 소리를 줄이는 습관 들이기",
  ],
  "wander-after-lights-out": [
    "화장실·물 마시기는 취침 전에 미리 다녀오기",
    "급한 일이 생기면 혼자 돌아다니지 말고 사감 선생님께 알리기",
  ],
  "prohibited-possession": [
    "해당 물품은 아예 학교에 가져오지 않기",
    "친구가 맡기려 하면 정중히 거절하고, 필요하면 선생님께 알리기",
  ],
  "delivery-food": [
    "야식이 먹고 싶을 때를 대비해 허용된 간식을 미리 준비해 두기",
    "친구가 같이 시키자고 해도 규정을 이야기하며 거절하기",
  ],
  "unauthorized-out": [
    "외출은 반드시 신청하고 허락받은 뒤에 나가기",
    "급한 일이 생기면 나가기 전에 먼저 선생님께 연락하기",
  ],
  "skip-dorm-after-leave": [
    "외출·외박 신청서에 적은 장소와 시간 그대로 움직이기",
    "일정이 바뀌면 바로 선생님께 연락해 변경을 허락받기",
  ],
  "take-others-food": [
    "남의 물건은 반드시 주인에게 먼저 물어보고 쓰기",
    "내 간식을 미리 준비해 두기",
  ],
};

export const TIP_MIN = 5;
export const TIP_MAX = 200;

/** 팁 작성 폼 검사. 문제가 없으면 빈 배열. */
export function validateTip(reasonId: string, body: string): string[] {
  const errors: string[] = [];
  if (!REASONS.some((r) => r.id === reasonId)) errors.push("어떤 사유에 대한 팁인지 선택하세요.");
  const n = body.trim().length;
  if (n < TIP_MIN) errors.push(`팁은 ${TIP_MIN}자 이상 써 주세요.`);
  if (n > TIP_MAX) errors.push(`팁은 ${TIP_MAX}자 이하로 써 주세요.`);
  return errors;
}

export interface CommunityTip {
  id: string;
  authorId: string;
  reasonId: string;
  body: string;
  createdAt: number;
  /** 도움이 돼요 개수 */
  votes: number;
  /** 내가 도움이 돼요를 눌렀는지 */
  votedByMe: boolean;
}

export interface TipBoard {
  userId: string;
  isTeacher: boolean;
  tips: CommunityTip[];
}

interface TipRow {
  id: string;
  author_id: string;
  reason_id: string;
  body: string;
  created_at: string;
}

interface VoteRow {
  tip_id: string;
  voter_id: string;
}

function explain(error: { code?: string; message: string }): Error {
  if (["PGRST205", "PGRST202", "42P01", "42883"].includes(error.code ?? "")) {
    return new Error("팁 게시판용 DB가 아직 없습니다. supabase/tips.sql을 SQL Editor에서 실행하세요.");
  }
  return new Error(error.message);
}

/** 도움이 돼요가 많은 순, 같으면 최신순 */
function byHelpful(a: CommunityTip, b: CommunityTip): number {
  return b.votes - a.votes || b.createdAt - a.createdAt;
}

/** 사유마다 도움이 돼요가 가장 많은 팁 1개 (원인 분석 아래에 함께 보여 줄 때 쓴다) */
export function bestTipByReason(tips: CommunityTip[]): Map<string, CommunityTip> {
  const best = new Map<string, CommunityTip>();
  for (const t of [...tips].sort(byHelpful)) {
    if (!best.has(t.reasonId)) best.set(t.reasonId, t);
  }
  return best;
}

export async function fetchTips(): Promise<TipBoard> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("로그인 정보를 확인하지 못했습니다. 다시 로그인하세요.");

  const [teacher, tips, votes] = await Promise.all([
    supabase.rpc("is_teacher"),
    supabase.from("tips").select("id, author_id, reason_id, body, created_at"),
    supabase.from("tip_votes").select("tip_id, voter_id"),
  ]);
  if (teacher.error) throw explain(teacher.error);
  if (tips.error) throw explain(tips.error);
  if (votes.error) throw explain(votes.error);

  const count = new Map<string, number>();
  const mine = new Set<string>();
  for (const v of votes.data as VoteRow[]) {
    count.set(v.tip_id, (count.get(v.tip_id) ?? 0) + 1);
    if (v.voter_id === auth.user.id) mine.add(v.tip_id);
  }

  const list = (tips.data as TipRow[])
    .map<CommunityTip>((r) => ({
      id: r.id,
      authorId: r.author_id,
      reasonId: r.reason_id,
      body: r.body,
      createdAt: new Date(r.created_at).getTime(),
      votes: count.get(r.id) ?? 0,
      votedByMe: mine.has(r.id),
    }))
    .sort(byHelpful);

  return { userId: auth.user.id, isTeacher: teacher.data === true, tips: list };
}

export async function postTip(reasonId: string, body: string): Promise<void> {
  const { error } = await createClient().from("tips").insert({ reason_id: reasonId, body: body.trim() });
  if (error) throw explain(error);
}

export async function deleteTip(id: string): Promise<void> {
  const { error } = await createClient().from("tips").delete().eq("id", id);
  if (error) throw explain(error);
}

/** 도움이 돼요를 누르거나(true) 취소한다(false). */
export async function setVote(tipId: string, on: boolean, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = on
    ? await supabase.from("tip_votes").insert({ tip_id: tipId })
    : await supabase.from("tip_votes").delete().eq("tip_id", tipId).eq("voter_id", userId);
  if (error) {
    if (error.code === "23505") return; // 이미 눌러 둔 상태
    throw explain(error);
  }
}
