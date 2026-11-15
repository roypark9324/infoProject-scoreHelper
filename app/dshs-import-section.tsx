"use client";

// dshs.app 상·벌점 내역 가져오기
// dshs.app의 상·벌점 화면에서 내역을 복사해 붙여 넣으면, 날짜·사유·점수를 읽어 한 번에 기록으로 저장한다.
// 비밀번호는 필요 없고, 붙여 넣은 글자는 이 브라우저에서만 읽는다. 이미 있는 기록은 건너뛴다.
// (dshs.app 로그인으로 자동 연동하는 방법은 README의 'dshs.app 연동' 참고)

import { useState } from "react";
import { importRowToRecord, parseDshsText, type ImportRow } from "@/lib/dshs-import";
import { todayISO, type ScoreRecord } from "@/lib/records";

interface Props {
  records: ScoreRecord[];
  /** 기록 1건을 저장한다. 실패하면 화면 위쪽에 안내가 뜬다. */
  onAdd: (record: ScoreRecord) => Promise<void>;
}

const STATUS_LABEL = { new: "추가", duplicate: "이미 있음", invalid: "읽지 못함" } as const;
const STATUS_STYLE = {
  new: "bg-blue-50 text-blue-700",
  duplicate: "bg-neutral-100 text-neutral-500",
  invalid: "bg-red-50 text-red-700",
} as const;

export default function DshsImportSection({ records, onAdd }: Props) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const fresh = rows?.filter((r) => r.status === "new") ?? [];

  function handleAnalyze() {
    setDone(null);
    setRows(parseDshsText(text, records, todayISO()));
  }

  async function handleImport() {
    setBusy(true);
    for (const row of fresh) await onAdd(importRowToRecord(row));
    setBusy(false);
    setDone(`${fresh.length}건을 기록에 보냈어요. 목록에서 확인하세요.`);
    setText("");
    setRows(null);
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-bold">dshs.app 내역 가져오기</h2>
      <p className="mt-1 text-xs text-neutral-500">
        dshs.app의 상·벌점 화면에서 내역을 복사해 아래에 붙여 넣으세요. 한 줄에 <b>날짜 · 사유 · 점수</b>가 있으면 읽어
        와요. 점수가 <b>+</b>면 벌점, <b>−</b>면 상점이에요. (비밀번호는 필요 없어요.)
      </p>

      <textarea
        value={text}
        rows={5}
        placeholder={"예)\n2026.11.03  호실 불청결  +0.5\n2026-11-05  도서관 정리 돕기  -2"}
        onChange={(e) => {
          setText(e.target.value);
          setRows(null);
          setDone(null);
        }}
        className="mt-3 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-xs"
      />
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={text.trim() === "" || busy}
        className="mt-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        분석하기
      </button>

      {done && <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{done}</p>}

      {rows && rows.length === 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          읽을 수 있는 줄이 없어요. 한 줄에 날짜와 점수가 함께 있는지 확인해 주세요.
        </p>
      )}

      {rows && rows.length > 0 && (
        <>
          <ul className="mt-3 grid gap-1.5">
            {rows.map((r) => (
              <li key={r.line} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
                {r.status === "invalid" ? (
                  <span className="min-w-0 text-xs text-neutral-500">
                    {r.line}번째 줄 “{r.raw}” — {r.message}
                  </span>
                ) : (
                  <span className="min-w-0">
                    {r.date} · {r.reasonLabel} ·{" "}
                    <b className={r.kind === "penalty" ? "text-red-600" : "text-blue-600"}>
                      {r.kind === "penalty" ? "벌점" : "상점"} {r.points}점
                    </b>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleImport}
            disabled={fresh.length === 0 || busy}
            className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? "저장하는 중…" : `${fresh.length}건 기록에 추가`}
          </button>
        </>
      )}
    </section>
  );
}
