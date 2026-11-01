"use client";

// 벌점 줄이기 팁 게시판
// - 학생이 사유(원인)별로 "이렇게 하니까 안 받게 됐어요" 같은 팁을 올린다. 글쓴이는 이름 없이 '익명 학생'으로 보인다.
// - [도움이 돼요]를 누르면 위로 올라가고, 가장 많이 받은 팁은 '원인 분석' 아래에도 함께 나온다.
// - 내가 쓴 글은 직접 지우고, 부적절한 글은 선생님이 지운다. (테이블은 supabase/tips.sql)

import { useCallback, useEffect, useState } from "react";
import { REASONS, getReason } from "@/lib/reasons";
import {
  TIP_MAX,
  deleteTip,
  fetchTips,
  postTip,
  setVote,
  validateTip,
  type CommunityTip,
  type TipBoard,
} from "@/lib/tips";

const PAGE = 10;

interface Props {
  /** 불러온 팁을 부모에게 알려 준다. (원인 분석 아래에 '친구들의 팁'으로 쓰인다) */
  onTips: (tips: CommunityTip[]) => void;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
}

export default function TipsSection({ onTips }: Props) {
  const [data, setData] = useState<TipBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 작성 칸
  const [reasonId, setReasonId] = useState("");
  const [body, setBody] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  // 보기
  const [filter, setFilter] = useState("");
  const [shown, setShown] = useState(PAGE);

  const reload = useCallback(async () => {
    try {
      const next = await fetchTips();
      setData(next);
      onTips(next.tips);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [onTips]);

  useEffect(() => {
    let cancelled = false;
    fetchTips()
      .then((next) => {
        if (cancelled) return;
        setData(next);
        onTips(next.tips);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [onTips]);

  /** 버튼 동작 하나를 실행하고 목록을 다시 불러온다. 실패하면 안내만 띄운다. */
  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateTip(reasonId, body);
    if (found.length > 0) {
      setFormErrors(found);
      return;
    }
    setFormErrors([]);
    void act(async () => {
      await postTip(reasonId, body);
      setBody("");
      setFilter(reasonId); // 방금 올린 팁이 바로 보이도록 그 사유로 모아 본다
      setShown(PAGE);
    });
  }

  const all = data?.tips ?? [];
  const list = filter ? all.filter((t) => t.reasonId === filter) : all;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-bold">벌점 줄이기 팁 게시판</h2>
      <p className="mt-1 text-xs text-neutral-500">
        “이렇게 하니까 안 받게 됐어요” 하는 팁을 사유별로 나눠 보세요. 글쓴이는 이름 없이 ‘익명 학생’으로
        보여요.
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ── 팁 올리기 ── */}
      <form onSubmit={handleSubmit} className="mt-4 grid gap-2 rounded-xl border border-green-100 bg-green-50/40 p-3">
        <span className="text-xs font-semibold text-green-800">내 팁 올리기</span>
        <select
          value={reasonId}
          onChange={(e) => setReasonId(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          aria-label="팁을 올릴 사유"
        >
          <option value="">어떤 사유에 대한 팁인가요?</option>
          {REASONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <textarea
          value={body}
          maxLength={TIP_MAX}
          rows={3}
          placeholder="예: 마지막 수업 전에 독서실 준비물을 미리 챙겨 두니까 늦지 않게 됐어요."
          onChange={(e) => setBody(e.target.value)}
          className="resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          aria-label="팁 내용"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-400">
            {body.trim().length} / {TIP_MAX}자
          </span>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            팁 올리기
          </button>
        </div>
        {formErrors.length > 0 && (
          <ul className="text-xs text-red-700">
            {formErrors.map((msg) => (
              <li key={msg}>• {msg}</li>
            ))}
          </ul>
        )}
      </form>

      {/* ── 팁 목록 ── */}
      <div className="mt-5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">친구들의 팁 {all.length > 0 && <span className="text-neutral-400">{list.length}개</span>}</h3>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setShown(PAGE);
          }}
          className="max-w-[55%] rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs"
          aria-label="사유별로 보기"
        >
          <option value="">전체 사유</option>
          {REASONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {!data && !error && <p className="mt-3 text-xs text-neutral-400">불러오는 중…</p>}

      {data && list.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
          {filter ? "이 사유에 대한 팁이 아직 없어요. 첫 팁을 올려 보세요." : "아직 올라온 팁이 없어요. 첫 팁을 올려 보세요."}
        </p>
      )}

      {data && list.length > 0 && (
        <>
          <ul className="mt-3 grid gap-2.5">
            {list.slice(0, shown).map((tip) => {
              const mine = tip.authorId === data.userId;
              return (
                <li key={tip.id} className="rounded-xl border border-neutral-200 p-3">
                  <p className="text-xs font-semibold text-red-700">{getReason(tip.reasonId)?.label ?? "기타"}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{tip.body}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-neutral-400">{mine ? "내가 쓴 팁" : "익명 학생"}</span>
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        aria-pressed={tip.votedByMe}
                        onClick={() => act(() => setVote(tip.id, !tip.votedByMe, data.userId))}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                          tip.votedByMe
                            ? "bg-green-700 text-white"
                            : "bg-white text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        👍 도움이 돼요 {tip.votes}
                      </button>
                      {(mine || data.isTeacher) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm("이 팁을 삭제할까요?")) void act(() => deleteTip(tip.id));
                          }}
                          className="rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-red-600 disabled:opacity-50"
                        >
                          삭제
                        </button>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {list.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-3 w-full rounded-lg py-2 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50"
            >
              더 보기
            </button>
          )}
        </>
      )}
    </section>
  );
}
