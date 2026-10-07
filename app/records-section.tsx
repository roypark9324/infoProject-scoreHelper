"use client";

// 차시 3: 기록 입력 폼 + 입력값 검사 + 입력한 기록 목록
// - 사유를 고르면 기본 배점이 점수 칸에 자동 입력된다.
// - 저장하기를 누르면 검사(validateDraft)를 먼저 하고, 통과할 때만 목록에 추가한다.
// - 차시 4: 기록 배열은 page.tsx가 들고 있고, 이 컴포넌트는 추가·삭제만 알려 준다.
//   (요약 카드·원인 분석도 같은 기록으로 계산해야 하기 때문)
// - 지금은 화면 state에만 담는다. (새로고침하면 사라짐 → 차시 7에서 DB로)

import { useState } from "react";
import {
  KIND_LABEL,
  REASONS,
  getReason,
  type MeritActivity,
  type ReasonKind,
} from "@/lib/reasons";
import {
  draftToRecord,
  makeActivity,
  todayISO,
  validateActivity,
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

interface Props {
  records: ScoreRecord[];
  onAdd: (record: ScoreRecord) => void;
  onDelete: (id: string) => void;
  /** 선생님이 모집한 상점 활동 목록 (상점 기록의 사유가 된다) */
  activities: MeritActivity[];
  onAddActivity: (activity: MeritActivity) => void;
  onDeleteActivity: (id: string) => void;
}

export default function RecordsSection({
  records,
  onAdd,
  onDelete,
  activities,
  onAddActivity,
  onDeleteActivity,
}: Props) {
  const [draft, setDraft] = useState<RecordDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);
  // 모집 활동 등록 칸
  const [activityName, setActivityName] = useState("");
  const [activityPoints, setActivityPoints] = useState("");
  const [activityErrors, setActivityErrors] = useState<string[]>([]);

  const isMerit = draft.kind === "merit";
  // 벌점은 기준표에서, 상점은 등록한 모집 활동에서 고른다.
  const options = isMerit
    ? activities.map((a) => ({ id: a.id, text: `${a.name} (${a.points}점)` }))
    : REASONS.map((r) => ({ id: r.id, text: `${r.label} (${r.category} · 기준 ${r.points}점)` }));

  /** 선택한 사유(벌점 기준표 항목 또는 모집 활동)의 이름·기본 배점 */
  function findReason(kind: ReasonKind, id: string): { label: string; points: number } | undefined {
    if (kind === "merit") {
      const a = activities.find((x) => x.id === id);
      return a && { label: a.name, points: a.points };
    }
    return getReason(id);
  }

  function update<K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  // 구분을 바꾸면 사유 목록이 달라지므로 사유·점수를 초기화한다.
  function handleKindChange(kind: ReasonKind) {
    setDraft((prev) => ({ ...prev, kind, reasonId: "", points: "" }));
  }

  // 사유를 고르면 기본 배점을 점수 칸에 자동으로 채운다.
  function handleReasonChange(reasonId: string) {
    const reason = findReason(draft.kind, reasonId);
    setDraft((prev) => ({
      ...prev,
      reasonId,
      points: reason ? String(reason.points) : "",
    }));
  }

  // 모집 활동 등록: 검사를 통과하면 목록에 추가하고 칸을 비운다.
  function handleAddActivity() {
    const found = validateActivity(activityName, activityPoints);
    if (found.length > 0) {
      setActivityErrors(found);
      return;
    }
    onAddActivity(makeActivity(activityName, activityPoints));
    setActivityErrors([]);
    setActivityName("");
    setActivityPoints("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateDraft(draft);
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    const reason = findReason(draft.kind, draft.reasonId);
    const record = draftToRecord(draft, reason?.label ?? "기타");
    onAdd(record);
    setErrors([]);
    // 날짜·구분은 유지하고 사유·점수·메모만 비운다 (연속 입력 편하게).
    setDraft((prev) => ({ ...prev, reasonId: "", points: "", memo: "" }));
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-bold">기록 입력</h2>
      <p className="mt-1 text-xs text-neutral-500">
        받은 벌점·상점을 한 건씩 입력하세요. 사유를 고르면 기준 점수가 자동으로 채워집니다.
        상점은 선생님이 모집한 활동을 먼저 등록한 뒤 골라서 기록해요.
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

        {/* 상점: 선생님이 모집한 활동 등록 */}
        {isMerit && (
          <div className="grid gap-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <span className="text-xs font-semibold text-blue-700">모집 활동 등록</span>
            <p className="text-xs text-neutral-500">
              선생님이 &quot;이 활동을 하면 상점 줄게&quot; 하고 모집한 활동을 이름과 점수로 등록해
              두세요. 등록하면 아래 사유 목록에서 고를 수 있어요.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={activityName}
                maxLength={40}
                placeholder="활동 이름 (예: 도서관 정리 돕기)"
                onChange={(e) => setActivityName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddActivity();
                  }
                }}
                className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
              <input
                type="number"
                inputMode="decimal"
                min={0.5}
                step={0.5}
                value={activityPoints}
                placeholder="점수"
                onChange={(e) => setActivityPoints(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddActivity();
                  }
                }}
                className="w-20 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleAddActivity}
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                활동 등록
              </button>
            </div>
            {activityErrors.length > 0 && (
              <ul className="text-xs text-red-700">
                {activityErrors.map((msg) => (
                  <li key={msg}>• {msg}</li>
                ))}
              </ul>
            )}
            {activities.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {activities.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-blue-700 ring-1 ring-blue-200"
                  >
                    {a.name} · {a.points}점
                    <button
                      type="button"
                      onClick={() => onDeleteActivity(a.id)}
                      className="text-neutral-400 hover:text-neutral-700"
                      aria-label={`${a.name} 활동 삭제`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 사유 */}
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-neutral-700">{isMerit ? "한 활동" : "사유"}</span>
          <select
            value={draft.reasonId}
            onChange={(e) => handleReasonChange(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2"
          >
            <option value="">
              {isMerit && activities.length === 0
                ? "먼저 위에서 모집 활동을 등록하세요"
                : isMerit
                  ? "한 활동을 선택하세요"
                  : "사유를 선택하세요"}
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.text}
              </option>
            ))}
          </select>
        </label>

        {/* 점수 */}
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-neutral-700">점수</span>
          <input
            type="number"
            inputMode="decimal"
            min={0.5}
            step={0.5}
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
                    onClick={() => onDelete(r.id)}
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
