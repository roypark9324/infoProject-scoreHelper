// 벌점 관리 도우미 - 기록(records) 타입과 입력값 검사 (IPO의 '입력' + '처리 6')
// 차시 3: 화면 state 배열에만 담는다. 차시 7에서 Supabase 저장으로 확장.

import type { MeritActivity, ReasonKind } from "./reasons";

/** 저장된 기록 1건 */
export interface ScoreRecord {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  kind: ReasonKind;
  reasonId: string;
  /** 저장 당시 사유 이름 (기준표가 바뀌어도 목록이 흔들리지 않도록 함께 보관) */
  reasonLabel: string;
  /** 항상 양수. 벌점/상점 여부는 kind로 구분한다. */
  points: number;
  memo: string;
  /** 입력 시각 (최신순 정렬용) */
  createdAt: number;
}

/** 입력 폼이 들고 있는 값 (검사 전이라 문자열 그대로) */
export interface RecordDraft {
  date: string;
  kind: ReasonKind;
  reasonId: string;
  points: string;
  memo: string;
}

/** 오늘 날짜를 YYYY-MM-DD로 */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 입력값 검사. 문제가 없으면 빈 배열,
 * 문제가 있으면 사용자에게 보여 줄 안내 문구들을 담아 돌려준다.
 */
export function validateDraft(draft: RecordDraft): string[] {
  const errors: string[] = [];

  if (!draft.date) {
    errors.push("날짜를 입력하세요.");
  } else if (draft.date > todayISO()) {
    errors.push("미래 날짜는 입력할 수 없습니다.");
  }

  if (!draft.reasonId) {
    errors.push("사유를 선택하세요.");
  }

  const pointsError = validatePoints(draft.points);
  if (pointsError) errors.push(pointsError);

  return errors;
}

/** 점수 칸 검사 (벌점·상점 기록, 활동 등록이 함께 쓴다). 문제가 없으면 null. */
function validatePoints(points: string): string | null {
  const n = Number(points);
  if (points.trim() === "" || Number.isNaN(n)) return "점수는 숫자로 입력하세요.";
  if (n <= 0) return "점수는 0보다 커야 합니다.";
  if (!Number.isInteger(n * 2)) return "점수는 0.5점 단위로 입력하세요.";
  return null;
}

/** 모집 활동 등록 폼 값 검사. 문제가 없으면 빈 배열. */
export function validateActivity(name: string, points: string): string[] {
  const errors: string[] = [];
  if (name.trim() === "") errors.push("활동 이름을 입력하세요.");
  const pointsError = validatePoints(points);
  if (pointsError) errors.push(pointsError);
  return errors;
}

/** 검사를 통과한 값으로 모집 활동 만들기 */
export function makeActivity(name: string, points: string): MeritActivity {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
    name: name.trim(),
    points: Number(points),
  };
}

/** 검사를 통과한 draft를 저장용 기록으로 변환 */
export function draftToRecord(draft: RecordDraft, reasonLabel: string): ScoreRecord {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
    date: draft.date,
    kind: draft.kind,
    reasonId: draft.reasonId,
    reasonLabel,
    points: Number(draft.points),
    memo: draft.memo.trim(),
    createdAt: Date.now(),
  };
}
