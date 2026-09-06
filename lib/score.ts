// 벌점 관리 도우미 - 점수 계산 규칙 (IPO의 '처리' 부분)
// 차시 4에서 실제 기록 배열을 받아 계산하도록 확장할 예정.

/** 청소 대상이 되는 누적 벌점 기준선 */
export const CLEANING_THRESHOLD = 30;
/** 퇴사 위기 기준선 */
export const EXPULSION_THRESHOLD = 40;

export type RiskLevel = "safe" | "warning" | "danger";

export const RISK_META: Record<
  RiskLevel,
  { label: string; range: string; color: string; bg: string }
> = {
  safe: { label: "안전", range: "10점 이하", color: "#15803d", bg: "#dcfce7" },
  warning: { label: "주의", range: "11 ~ 24점", color: "#b45309", bg: "#fef9c3" },
  danger: { label: "위험", range: "25점 이상", color: "#b91c1c", bg: "#fee2e2" },
};

/** 누적 벌점 -> 위험 단계 */
export function getRiskLevel(penalty: number): RiskLevel {
  if (penalty >= 25) return "danger";
  if (penalty >= 11) return "warning";
  return "safe";
}

/** 기준선까지 남은 점수 (음수면 이미 초과) */
export function remainingTo(penalty: number, threshold = CLEANING_THRESHOLD): number {
  return threshold - penalty;
}
