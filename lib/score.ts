// 벌점 관리 도우미 - 점수 계산 규칙 (IPO의 '처리' 부분)
// 차시 4: 실제 기록 배열을 받아 누적 벌점과 원인 분석을 계산한다.

import type { ScoreRecord } from "./records";

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

// ── 처리 1: 누적 점수 계산 ─────────────────────────────

export interface ScoreTotals {
  /** 받은 벌점 합계 */
  penaltySum: number;
  /** 받은 상점(감면) 합계 */
  meritSum: number;
  /** 현재 누적 벌점 = 벌점 합계 − 상점 합계 (0점 아래로는 내려가지 않음) */
  net: number;
}

/** 기록 배열 → 벌점은 더하고 상점은 빼서 현재 누적 벌점 계산 */
export function calcTotals(records: ScoreRecord[]): ScoreTotals {
  let penaltySum = 0;
  let meritSum = 0;
  for (const r of records) {
    if (r.kind === "penalty") penaltySum += r.points;
    else meritSum += r.points;
  }
  return { penaltySum, meritSum, net: Math.max(0, penaltySum - meritSum) };
}

// ── 처리 3: 원인 분석 ──────────────────────────────────

export interface CauseStat {
  reasonId: string;
  reasonLabel: string;
  /** 이 사유로 벌점을 받은 횟수 */
  count: number;
  /** 이 사유로 받은 벌점 합계 */
  total: number;
}

/**
 * 벌점 기록만 사유별로 묶어 횟수·점수 합계를 내고,
 * 점수 합계가 큰 순(같으면 횟수가 많은 순)으로 정렬해 돌려준다.
 */
export function analyzeCauses(records: ScoreRecord[]): CauseStat[] {
  const byReason = new Map<string, CauseStat>();
  for (const r of records) {
    if (r.kind !== "penalty") continue;
    const stat = byReason.get(r.reasonId) ?? {
      reasonId: r.reasonId,
      reasonLabel: r.reasonLabel,
      count: 0,
      total: 0,
    };
    stat.count += 1;
    stat.total += r.points;
    byReason.set(r.reasonId, stat);
  }
  return [...byReason.values()].sort((a, b) => b.total - a.total || b.count - a.count);
}

/** 자주 걸리는 원인 상위 N개 (기본 3개) */
export function topCauses(records: ScoreRecord[], n = 3): CauseStat[] {
  return analyzeCauses(records).slice(0, n);
}
