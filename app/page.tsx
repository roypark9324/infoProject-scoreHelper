"use client";

import { useState } from "react";
import {
  CLEANING_THRESHOLD,
  PERIOD_LABEL,
  RISK_META,
  calcTotals,
  filterByPeriod,
  getRiskLevel,
  remainingTo,
  type Period,
  type RiskLevel,
} from "@/lib/score";
import type { ScoreRecord } from "@/lib/records";
import RecordsSection from "./records-section";
import CauseAnalysis from "./cause-analysis";
import TrendChart from "./trend-chart";
import OffsetPlan from "./offset-plan";
import AuthGate from "./auth-gate";

// 차시 2: 화면 뼈대 + 점수 표시 영역.
// 차시 4: 입력한 기록(records)으로 누적 벌점을 실제 계산하고, 원인 분석을 보여 준다.
// 차시 5: 조회 기간 선택, 월별 추세, 상쇄 계획을 더해 결과 화면을 완성한다.

/** 목표 점수 기본값 = '안전' 단계의 상한 */
const DEFAULT_TARGET = 10;

export default function HomePage() {
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [period, setPeriod] = useState<Period>("semester");
  const [target, setTarget] = useState(DEFAULT_TARGET);

  // 요약·원인 분석·상쇄 계획은 선택한 기간의 기록으로 계산한다.
  const periodRecords = filterByPeriod(records, period);
  // 감면 한도(학기당 20점)는 기간 선택과 상관없이 이번 학기 기준.
  const semesterMeritSum = calcTotals(filterByPeriod(records, "semester")).meritSum;

  const totals = calcTotals(periodRecords);
  const penalty = totals.net;
  const level = getRiskLevel(penalty);
  const remaining = remainingTo(penalty, CLEANING_THRESHOLD);
  const meta = RISK_META[level];
  const progress = Math.min(100, Math.round((penalty / CLEANING_THRESHOLD) * 100));

  return (
    <AuthGate>
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold">벌점 관리 도우미</h1>
        <p className="mt-1 text-sm text-neutral-500">
          내가 받은 벌점을 기록에서 끝내지 않고, 원인과 상쇄 방법까지 보여 주는 서비스
        </p>
      </header>

      {/* ── 차시 5: 조회 기간 선택 ───────────────────────────── */}
      <div className="mb-3 flex items-center gap-2" role="group" aria-label="조회 기간">
        <span className="text-xs text-neutral-500">조회 기간</span>
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              period === p
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-500 ring-1 ring-neutral-200 hover:text-neutral-800"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {/* ── 점수 표시 영역 (요약 카드) ────────────────────────── */}
      <section
        aria-label="현재 상태 요약"
        className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-neutral-500">현재 누적 벌점</p>
            <p className="mt-1 text-5xl font-extrabold tracking-tight">
              {penalty}
              <span className="ml-1 text-2xl font-semibold text-neutral-400">점</span>
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-sm font-bold"
            style={{ color: meta.color, backgroundColor: meta.bg }}
          >
            {meta.label}
          </span>
        </div>

        <p className="mt-4 text-sm text-neutral-600">
          {remaining > 0 ? (
            <>
              청소 기준 <b>{CLEANING_THRESHOLD}점</b>까지{" "}
              <b className="text-neutral-900">{remaining}점</b> 남았습니다.
            </>
          ) : (
            <>청소 기준 {CLEANING_THRESHOLD}점을 이미 넘었습니다.</>
          )}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          받은 벌점 <span className="text-red-600">{totals.penaltySum}점</span> − 상점(감면){" "}
          <span className="text-blue-600">{totals.meritSum}점</span>
        </p>

        {/* 진행 막대 */}
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: meta.color }}
          />
        </div>

        {/* 3단계 범례 */}
        <ul className="mt-4 flex gap-2 text-center text-xs">
          {(Object.keys(RISK_META) as RiskLevel[]).map((key) => {
            const m = RISK_META[key];
            const active = key === level;
            return (
              <li
                key={key}
                className={`flex-1 rounded-lg px-2 py-2 ${
                  active ? "ring-2" : "opacity-60"
                }`}
                style={{
                  backgroundColor: m.bg,
                  color: m.color,
                  ...(active ? { boxShadow: `0 0 0 2px ${m.color}` } : {}),
                }}
              >
                <div className="font-bold">{m.label}</div>
                <div className="mt-0.5">{m.range}</div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── 차시 3: 기록 입력 폼 + 입력값 검사 + 기록 목록 ───── */}
      <div className="mt-4">
        <RecordsSection
          records={records}
          onAdd={(record) => setRecords((prev) => [record, ...prev])}
          onDelete={(id) => setRecords((prev) => prev.filter((r) => r.id !== id))}
        />
      </div>

      {/* ── 결과 화면: 원인 분석(차시 4) + 상쇄 계획·월별 추세(차시 5) ── */}
      <div className="mt-4 grid gap-4">
        <CauseAnalysis records={periodRecords} />
        <OffsetPlan
          net={penalty}
          target={target}
          onTargetChange={setTarget}
          semesterMeritSum={semesterMeritSum}
        />
        {/* 추세는 기간 선택과 상관없이 최근 6개월을 보여 준다 */}
        <TrendChart records={records} />
      </div>

      <p className="mt-8 text-center text-xs text-neutral-400">
        2608 박종현 · 정보과학 프로젝트
      </p>
    </div>
    </AuthGate>
  );
}
