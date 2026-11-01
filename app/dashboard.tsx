"use client";

import { useEffect, useState } from "react";
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
import type { MeritActivity } from "@/lib/reasons";
import RecordsSection from "./records-section";
import CauseAnalysis from "./cause-analysis";
import TrendChart from "./trend-chart";
import OffsetPlan from "./offset-plan";
import BoardSection from "./board-section";
import ConnectionStatus from "./connection-status";
import {
  deleteActivity,
  deleteRecord,
  fetchActivities,
  fetchRecords,
  fetchTarget,
  insertActivity,
  insertRecord,
  saveTarget,
} from "@/lib/db";

// 차시 2: 화면 뼈대 + 점수 표시 영역.
// 차시 4: 입력한 기록(records)으로 누적 벌점을 실제 계산하고, 원인 분석을 보여 준다.
// 차시 5: 조회 기간 선택, 월별 추세, 상쇄 계획을 더해 결과 화면을 완성한다.
// 차시 7: 기록·모집 활동·목표 점수를 Supabase DB에 저장한다.
// 차시 8: 로그인하면 저장된 기록을 불러와 같은 통계로 보여 준다.
// 이후: 선생님이 올린 상점 모집 글(게시판)에 학생이 신청하고, 인정되면 상점 기록이 자동으로 들어온다.

/** 목표 점수 기본값 = '안전' 단계의 상한 */
const DEFAULT_TARGET = 10;

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
}

export default function Dashboard() {
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [activities, setActivities] = useState<MeritActivity[]>([]);
  // 게시판에서 모집 중인 활동. 상쇄 계획에서 내가 등록한 활동과 함께 쓴다.
  const [boardActivities, setBoardActivities] = useState<MeritActivity[]>([]);
  const [period, setPeriod] = useState<Period>("year");
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // 차시 8: 처음 열 때 DB에서 내 기록·활동·목표 점수를 불러온다.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRecords(), fetchActivities(), fetchTarget()])
      .then(([r, a, t]) => {
        if (cancelled) return;
        setRecords(r);
        setActivities(a);
        setTarget(t);
      })
      .catch((e) => !cancelled && setDbError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // 차시 7: 저장·삭제는 DB에 성공한 뒤에만 화면에 반영한다. (화면과 DB가 어긋나지 않게)
  async function run(action: () => Promise<void>) {
    setDbError(null);
    try {
      await action();
    } catch (e) {
      setDbError(errorMessage(e));
    }
  }

  // 선생님이 인정해 준 상점이 목록에 나타나도록 기록을 다시 불러온다.
  const refreshRecords = () =>
    run(async () => {
      setRecords(await fetchRecords());
    });

  const handleAddRecord = (record: ScoreRecord) =>
    run(async () => {
      const saved = await insertRecord(record);
      setRecords((prev) => [saved, ...prev]);
    });
  const handleDeleteRecord = (id: string) =>
    run(async () => {
      await deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    });
  const handleAddActivity = (activity: MeritActivity) =>
    run(async () => {
      const saved = await insertActivity(activity);
      setActivities((prev) => [...prev, saved]);
    });
  const handleDeleteActivity = (id: string) =>
    run(async () => {
      await deleteActivity(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
    });
  const handleTargetChange = (next: number) => {
    setTarget(next);
    void run(() => saveTarget(next));
  };

  // 요약·원인 분석·상쇄 계획은 선택한 기간의 기록으로 계산한다.
  const periodRecords = filterByPeriod(records, period);
  // 학년이 끝나면 벌점 내역이 초기화되므로, 추세도 이번 학년 기록만 쓴다.
  const yearRecords = filterByPeriod(records, "year");

  const totals = calcTotals(periodRecords);
  const penalty = totals.net;
  const level = getRiskLevel(penalty);
  const remaining = remainingTo(penalty, CLEANING_THRESHOLD);
  const meta = RISK_META[level];
  const progress = Math.min(100, Math.round((penalty / CLEANING_THRESHOLD) * 100));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold">벌점 관리 도우미</h1>
        <p className="mt-1 text-sm text-neutral-500">
          내가 받은 벌점을 기록에서 끝내지 않고, 원인과 상쇄 방법까지 보여 주는 서비스
        </p>
      </header>

      {dbError && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {dbError}
        </p>
      )}
      {loading && <p className="mb-3 text-xs text-neutral-400">저장된 기록을 불러오는 중…</p>}

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
          onAdd={handleAddRecord}
          onDelete={handleDeleteRecord}
          activities={activities}
          onAddActivity={handleAddActivity}
          onDeleteActivity={handleDeleteActivity}
        />
      </div>

      {/* ── 상점 모집 게시판: 선생님이 모집 → 학생 신청 → 선생님 인정 ── */}
      <div className="mt-4">
        <BoardSection onOpenPosts={setBoardActivities} onRefreshRecords={refreshRecords} />
      </div>

      {/* ── 결과 화면: 원인 분석(차시 4) + 상쇄 계획·월별 추세(차시 5) ── */}
      <div className="mt-4 grid gap-4">
        <CauseAnalysis records={periodRecords} />
        <OffsetPlan
          net={penalty}
          target={target}
          onTargetChange={handleTargetChange}
          activities={[...activities, ...boardActivities]}
        />
        {/* 추세는 기간 선택과 상관없이 최근 6개월(이번 학년 안)을 보여 준다 */}
        <TrendChart records={yearRecords} />
      </div>

      <p className="mt-8 text-center text-xs text-neutral-400">
        2608 박종현 · 정보과학 프로젝트
      </p>
      <ConnectionStatus />
    </div>
  );
}
