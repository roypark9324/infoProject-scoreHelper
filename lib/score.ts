// 벌점 관리 도우미 - 점수 계산 규칙 (IPO의 '처리' 부분)
// 차시 4: 실제 기록 배열을 받아 누적 벌점과 원인 분석을 계산한다.
// 차시 5: 조회 기간 필터, 월별 추세, 상쇄 계획 계산을 추가한다.

import type { ScoreRecord } from "./records";
import type { MeritActivity } from "./reasons";

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

// ── 입력 4: 조회 기간 ──────────────────────────────────

export type Period = "month" | "3months" | "year";

export const PERIOD_LABEL: Record<Period, string> = {
  month: "이번 달",
  "3months": "최근 3개월",
  year: "학년 전체",
};

/** Date → YYYY-MM-DD (records.date와 같은 형식이라 문자열로 크기 비교가 된다) */
function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * 이번 학년이 시작되는 날짜 (3월 1일, YYYY-MM-DD).
 * 학년이 끝나면 벌점 내역이 초기화되므로, 이 날짜 이전 기록은 점수 계산에서 제외한다.
 */
export function schoolYearStart(today = new Date()): string {
  const y = today.getFullYear();
  return today.getMonth() >= 2 ? `${y}-03-01` : `${y - 1}-03-01`;
}

/** 기간이 시작되는 날짜 (YYYY-MM-DD). 어떤 기간이든 이번 학년 시작일보다 앞서지 않는다. */
export function periodStart(period: Period, today = new Date()): string {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0 = 1월
  const yearStart = schoolYearStart(today);
  if (period === "year") return yearStart;
  const start = period === "month" ? toISO(new Date(y, m, 1)) : toISO(new Date(y, m - 2, 1));
  return start > yearStart ? start : yearStart;
}

/** 선택한 기간 안의 기록만 남긴다 */
export function filterByPeriod(records: ScoreRecord[], period: Period, today = new Date()) {
  const start = periodStart(period, today);
  return records.filter((r) => r.date >= start);
}

// ── 처리 4: 월별 추세 ──────────────────────────────────

export interface MonthStat {
  /** YYYY-MM */
  month: string;
  /** 화면용 이름 (예: "9월") */
  label: string;
  penaltySum: number;
  meritSum: number;
}

/** 이번 달을 포함한 최근 N개월의 월별 벌점·상점 합계 (기록이 없는 달은 0) */
export function monthlyTrend(records: ScoreRecord[], months = 6, today = new Date()): MonthStat[] {
  const stats: MonthStat[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    stats.push({
      month: toISO(d).slice(0, 7),
      label: `${d.getMonth() + 1}월`,
      penaltySum: 0,
      meritSum: 0,
    });
  }
  const byMonth = new Map(stats.map((s) => [s.month, s]));
  for (const r of records) {
    const s = byMonth.get(r.date.slice(0, 7));
    if (!s) continue;
    if (r.kind === "penalty") s.penaltySum += r.points;
    else s.meritSum += r.points;
  }
  return stats;
}

// ── 처리 5: 상쇄 계획 ──────────────────────────────────

export interface OffsetOption {
  activity: MeritActivity;
  /** 이 활동을 몇 번 해야 하는지 */
  times: number;
  /** times번 했을 때 받는 상점 합계 */
  points: number;
}

export interface OffsetPlan {
  /** 목표 점수까지 줄여야 하는 점수 (0이면 이미 목표 달성) */
  need: number;
  /** 활동별로 몇 번 해야 하는지 (횟수가 적은 순, 같으면 필요한 점수에 딱 맞는 순) */
  options: OffsetOption[];
}

/**
 * 현재 누적 벌점을 목표 점수까지 내리려면, 등록된 모집 활동을 각각 몇 번 해야 하는지 계산.
 * 필요한 점수 ÷ 활동 배점을 올림해서 횟수를 구한다. 등록된 활동이 없으면 options는 빈 배열.
 */
export function calcOffsetPlan(net: number, target: number, activities: MeritActivity[]): OffsetPlan {
  const need = Math.max(0, net - target);
  const options = activities
    .map((activity) => {
      const times = Math.ceil(need / activity.points);
      return { activity, times, points: times * activity.points };
    })
    .sort((a, b) => a.times - b.times || a.points - b.points);
  return { need, options };
}
