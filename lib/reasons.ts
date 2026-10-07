// 벌점 관리 도우미 - 사유 기준표 (IPO의 '입력' 부분)
// 대전과학고등학교 생활지도 규정(기숙사 중심)을 참고해 정리한 목록.
// 출처: 나무위키 "대전과학고등학교/생활" (학생 편집 문서라 해마다 조금씩 다를 수 있음).
// 실제 최신 학교 규정과 다르면 이 파일의 항목/배점만 고치면 된다.
//
// 참고한 누적 벌점 조치: 20점 담임 상담 / 30점 교내봉사 / 40점 사회봉사 /
//   50점 특별교육 / 60점 출석정지 / 70점 퇴학 (2023년부터 퇴사 조치도 가능).
// 상점(감면): 정해진 기준표가 없다. 선생님이 "이런 활동을 도와주면 상점 줄게" 하고 모집하면,
//   학생이 그 활동(이름·점수)을 'MeritActivity'로 등록해 두고 한 일에 해당하는 활동을 골라 기록한다.
//   학기당 감면 한도는 없다(확인됨).
// 벌점 내역은 한 학년이 끝나면 초기화된다 → 점수 계산은 이번 학년(3월 1일~) 기록만 쓴다.

/** 벌점(penalty) / 상점(merit) */
export type ReasonKind = "penalty" | "merit";

/** 사유 분류 - 원인 분석을 묶어 보기 위한 갈래 */
export type ReasonCategory = "학습" | "생활" | "기숙사";

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
  merit: "상점(감면)",
};

/** 선생님이 모집한 상점 활동 (학생이 직접 등록). 상점 기록의 사유가 된다. */
export interface MeritActivity {
  id: string;
  /** 활동 이름 (예: "도서관 정리 돕기") */
  name: string;
  /** 이 활동을 하면 받는 상점 (양수) */
  points: number;
}

/** 벌점 사유 기준표 (대전과학고 생활지도 규정 참고) */
export const REASONS: Reason[] = [
  // ── 벌점 0.5점 ────────────────────────────
  { id: "room-untidy", label: "호실 불청결", kind: "penalty", points: 0.5, category: "기숙사" },

  // ── 벌점 1점 ──────────────────────────────
  { id: "roll-call-late", label: "점호 불참 · 기숙사 퇴실 지각", kind: "penalty", points: 1, category: "기숙사" },
  { id: "study-room-late", label: "독서실 입실 지각", kind: "penalty", points: 1, category: "학습" },
  { id: "cleaning-untidy", label: "독서실·청소구역 정리 불량", kind: "penalty", points: 1, category: "기숙사" },
  { id: "morning-assembly", label: "여명 조례 불참", kind: "penalty", points: 1, category: "생활" },
  { id: "wrong-place-free-period", label: "공강 시간에 지정된 장소에 없음", kind: "penalty", points: 1, category: "학습" },

  // ── 벌점 2점 ──────────────────────────────
  { id: "enter-others-room", label: "타인 방 출입 · 야간 점호 후 재외출", kind: "penalty", points: 2, category: "기숙사" },
  { id: "disturbing-others", label: "다른 사람에게 방해되는 행동", kind: "penalty", points: 2, category: "기숙사" },
  { id: "forbidden-item", label: "허용되지 않는 물품 기숙사 비치", kind: "penalty", points: 2, category: "기숙사" },

  // ── 벌점 3점 ──────────────────────────────
  { id: "room-door-misuse", label: "호실 문 잠금·가림 등 부적절한 행위", kind: "penalty", points: 3, category: "기숙사" },
  { id: "place-violation", label: "장소 위반(타인 방 출입·취침 등)", kind: "penalty", points: 3, category: "기숙사" },
  { id: "loud-noise", label: "큰 소리로 노래·소란", kind: "penalty", points: 3, category: "기숙사" },
  { id: "wander-after-lights-out", label: "취침 시간 외 돌아다님", kind: "penalty", points: 3, category: "기숙사" },

  // ── 벌점 4점 ──────────────────────────────
  { id: "prohibited-possession", label: "음란·사행성 물품, 흉기 소지", kind: "penalty", points: 4, category: "생활" },
  { id: "delivery-food", label: "외부 배달 음식 교내 반입", kind: "penalty", points: 4, category: "생활" },

  // ── 벌점 5점 ──────────────────────────────
  { id: "unauthorized-out", label: "무단 외출", kind: "penalty", points: 5, category: "생활" },
  { id: "skip-dorm-after-leave", label: "외출·외박 신청 후 신고 없이 임의 거취", kind: "penalty", points: 5, category: "기숙사" },
  { id: "take-others-food", label: "허락 없이 남의 음식물에 손댐", kind: "penalty", points: 5, category: "생활" },
];

/** id로 벌점 사유 1개 찾기 (상점 활동은 MeritActivity 목록에서 찾는다) */
export function getReason(id: string): Reason | undefined {
  return REASONS.find((r) => r.id === id);
}
