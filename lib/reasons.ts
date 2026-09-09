// 벌점 관리 도우미 - 사유 기준표 (IPO의 '입력' 부분)
// 학교 상벌점 기준표를 미리 목록으로 만들어 두고 고르게 한다.
// 사유를 고르면 여기 적힌 기본 배점이 점수 칸에 자동 입력된다.
// 실제 학교 기준표에 맞춰 항목/배점을 고쳐 쓰면 된다. (차시 3 예시 데이터)

/** 벌점(penalty) / 상점(merit) */
export type ReasonKind = "penalty" | "merit";

/** 사유 분류 - 원인 분석을 묶어 보기 위한 갈래 */
export type ReasonCategory = "수업" | "생활" | "기숙사" | "봉사";

export interface Reason {
  /** 저장·조회에 쓰는 고정 id */
  id: string;
  /** 화면에 보이는 이름 */
  label: string;
  kind: ReasonKind;
  /** 기본 배점 (항상 양수, 벌점도 양수로 저장하고 계산에서 부호를 준다) */
  points: number;
  category: ReasonCategory;
}

export const KIND_LABEL: Record<ReasonKind, string> = {
  penalty: "벌점",
  merit: "상점",
};

/** 사유 기준표 (예시) */
export const REASONS: Reason[] = [
  // ── 벌점 ──────────────────────────────
  { id: "phone-in-class", label: "수업 중 휴대폰 사용", kind: "penalty", points: 5, category: "수업" },
  { id: "class-attitude", label: "수업 태도 불량", kind: "penalty", points: 3, category: "수업" },
  { id: "sleeping-in-class", label: "수업 중 취침", kind: "penalty", points: 2, category: "수업" },
  { id: "late", label: "지각", kind: "penalty", points: 2, category: "생활" },
  { id: "unauthorized-out", label: "무단 외출", kind: "penalty", points: 10, category: "생활" },
  { id: "uniform", label: "복장 불량", kind: "penalty", points: 2, category: "생활" },
  { id: "roll-call-absent", label: "기숙사 점호 불참", kind: "penalty", points: 5, category: "기숙사" },
  { id: "room-untidy", label: "기숙사 정리 불량", kind: "penalty", points: 3, category: "기숙사" },
  { id: "quiet-hours", label: "취침 시간 소란", kind: "penalty", points: 3, category: "기숙사" },

  // ── 상점 ──────────────────────────────
  { id: "volunteer", label: "봉사활동 참여", kind: "merit", points: 2, category: "봉사" },
  { id: "class-helper", label: "학급 도우미 활동", kind: "merit", points: 2, category: "봉사" },
  { id: "clean-up", label: "자율 청소·정리 활동", kind: "merit", points: 1, category: "기숙사" },
  { id: "lost-and-found", label: "분실물 습득 신고", kind: "merit", points: 1, category: "생활" },
  { id: "role-model", label: "모범 행동 표창", kind: "merit", points: 5, category: "생활" },
];

/** id로 사유 1개 찾기 */
export function getReason(id: string): Reason | undefined {
  return REASONS.find((r) => r.id === id);
}
