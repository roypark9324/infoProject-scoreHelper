"use client";

// 차시 3: 기록 입력 폼 + 입력값 검사 + 입력한 기록 목록
// - 사유를 고르면 기본 배점이 점수 칸에 자동 입력된다.
// - 저장하기를 누르면 검사(validateDraft)를 먼저 하고, 통과할 때만 목록에 추가한다.
// - 지금은 화면 state에만 담는다. (새로고침하면 사라짐 → 차시 7에서 DB로)

import { useState } from "react";
import { KIND_LABEL, REASONS, getReason, type ReasonKind } from "@/lib/reasons";
import {
  draftToRecord,
  todayISO,
  validateDraft,
  type RecordDraft,
  type ScoreRecord,
} from "@/lib/records";

const EMPTY_DRAFT: RecordDraft = {
  date: todayISO(),
  kind: "penalty",
  reasonId: "",
  points: "",
  memo: "",
};

export default function RecordsSection() {
  const [draft, setDraft] = useState<RecordDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);
  const [records, setRecords] = useState<ScoreRecord[]>([]);

  // 선택한 구분(벌점/상점)에 맞는 사유만 보여 준다.
  const reasonOptions = REASONS.filter((r) => r.kind === draft.kind);

  function update<K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  // 구분을 바꾸면 사유 목록이 달라지므로 사유·점수를 초기화한다.
  function handleKindChange(kind: ReasonKind) {
    setDraft((prev) => ({ ...prev, kind, reasonId: "", points: "" }));
  }

  // 사유를 고르면 기본 배점을 점수 칸에 자동으로 채운다.
  function handleReasonChange(reasonId: string) {
    const reason = getReason(reasonId);
    setDraft((prev) => ({
      ...prev,
      reasonId,
      points: reason ? String(reason.points) : "",
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateDraft(draft);
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    const reason = getReason(draft.reasonId);
    const record = draftToRecord(draft, reason?.label ?? "기타");
    setRecords((prev) => [record, ...prev]);
    setErrors([]);
    // 날짜·구분은 유지하고 사유·점수·메모만 비운다 (연속 입력 편하게).
    setDraft((prev) => ({ ...prev, reasonId: "", points: "", memo: "" }));
  }

  function handleDelete(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-bold">기록 입력</h2>
      <p className="mt-1 text-xs text-neutral-500">
        받은 벌점·상점을 한 건씩 입력하세요. 사유를 고르면 기준 점수가 자동으로 채워집니다.
      </p>

      {/* ── 입력 폼 ─────────────────────────────── */}
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        {/* 구분 (벌점 / 상점) */}
        <div className="flex gap-2">
          {(Object.keys(KIND_LABEL) as ReasonKind[]).map((kind) => {
            const active = draft.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => handleKindChange(kind)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? kind === "penalty"
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-neutral-200 bg-white text-neutral-500"
                }`}
                aria-pressed={active}
              >
                {KIND_LABEL[kind]}
              </button>
            );
          })}
        </div>

        {/* 날짜 */}
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-neutral-700">날짜</span>
          <input
            type="date"
            value={draft.date}
            max={todayISO()}
            onChange={(e) => update("date", e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>

        {/* 사유 */}
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-neutral-700">사유</span>
          <select
            value={draft.reasonId}
            onChange={(e) => handleReasonChange(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2"
          >
            <option value="">사유를 선택하세요</option>
            {reasonOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.category} · 기준 {r.points}점)
              </option>
            ))}
          </select>
        </label>

        {/* 점수 */}
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-neutral-700">점수</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="사유를 고르면 자동 입력됩니다"
            value={draft.points}
            onChange={(e) => update("points", e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2"
          />
          <span className="text-xs text-neutral-400">
            기준과 다르게 받았을 때만 직접 고치세요.
          </span>
        </label>

        {/* 메모 */}
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-neutral-700">메모 (선택)</span>
          <input
            type="text"
            value={draft.memo}
            maxLength={100}
            placeholder="언제·어떤 상황이었는지 짧게"
            onChange={(e) => update("memo", e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>

        {/* 검사 결과 안내 */}
        {errors.length > 0 && (
          <ul className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.map((msg) => (
              <li key={msg}>• {msg}</li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-700"
        >
          저장하기
        </button>
      </form>

      {/* ── 입력한 기록 목록 (최신순) ───────────── */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold">입력한 기록</h3>
          <span className="text-xs text-neutral-400">{records.length}건</span>
        </div>

        {records.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
            아직 입력한 기록이 없습니다. 위 폼으로 첫 기록을 남겨 보세요.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {records.map((r) => {
              const isPenalty = r.kind === "penalty";
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-20 shrink-0 text-neutral-500">{r.date}</span>
                  <span
                    className={`w-9 shrink-0 text-center text-xs font-bold ${
                      isPenalty ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {isPenalty ? "벌점" : "상점"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {r.reasonLabel}
                    {r.memo && (
                      <span className="ml-1 text-xs text-neutral-400">— {r.memo}</span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 font-bold ${
                      isPenalty ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {isPenalty ? "+" : "−"}
                    {r.points}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    aria-label="이 기록 삭제"
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
