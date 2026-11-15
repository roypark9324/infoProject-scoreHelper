"use client";

// 내 계정
// - 모두: 이름·이메일·역할 표시
// - 학생: [선생님 계정 신청] → 관리자가 승인하면 선생님이 된다 (승인 전까지는 '신청함' 표시)
// - 관리자: 대기 중인 신청을 승인/거절하고, 승인된 선생님을 해제한다
// 역할은 DB(profiles.role)가 정한다. (supabase/accounts.sql)

import { useCallback, useEffect, useState } from "react";
import {
  ROLE_LABEL,
  decideTeacher,
  fetchAllProfiles,
  fetchMyProfile,
  requestTeacher,
  revokeTeacher,
  type Profile,
} from "@/lib/profile";

interface State {
  me: Profile;
  /** 관리자일 때만 채워진다 */
  all: Profile[];
}

async function load(): Promise<State> {
  const me = await fetchMyProfile();
  const all = me.role === "admin" ? await fetchAllProfiles() : [];
  return { me, all };
}

function label(p: Profile): string {
  return p.name ? `${p.name} (${p.email})` : p.email;
}

export default function AccountSection() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((next) => !cancelled && setState(next))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다."));
    return () => {
      cancelled = true;
    };
  }, []);

  /** 버튼 동작 하나를 실행하고 계정 정보를 다시 불러온다. 실패하면 안내만 띄운다. */
  const act = useCallback(async (action?: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      if (action) await action();
      setState(await load());
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, []);

  const me = state?.me;
  const pending = state?.all.filter((p) => p.teacherRequest === "pending" && p.role === "student") ?? [];
  const teachers = state?.all.filter((p) => p.role === "teacher") ?? [];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">내 계정</h2>
        <button
          type="button"
          onClick={() => act()}
          disabled={busy}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {!me && !error && <p className="mt-3 text-xs text-neutral-400">불러오는 중…</p>}

      {me && (
        <>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{me.name || "이름 없음"}</span>
            <span className="text-xs text-neutral-400">{me.email}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                me.role === "student" ? "bg-neutral-100 text-neutral-600" : "bg-blue-50 text-blue-700"
              }`}
            >
              {ROLE_LABEL[me.role]}
            </span>
          </p>

          {me.role === "student" && (
            <div className="mt-3 rounded-xl border border-neutral-200 p-3 text-xs text-neutral-600">
              {me.teacherRequest === "pending" ? (
                <p>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                    선생님 신청함 · 관리자 승인 대기
                  </span>{" "}
                  승인되면 [새로고침]을 눌러 확인하세요.
                </p>
              ) : (
                <>
                  <p>
                    선생님이신가요? 신청하면 관리자가 확인한 뒤 승인합니다. 승인되면 상점 모집 글을 올리고 신청을 인정할 수 있어요.
                  </p>
                  {me.teacherRequest === "rejected" && (
                    <p className="mt-1 text-red-600">이전 신청이 승인되지 않았습니다. 다시 신청할 수 있어요.</p>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(requestTeacher)}
                    className="mt-2 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    선생님 계정 신청
                  </button>
                </>
              )}
            </div>
          )}

          {me.role === "admin" && (
            <div className="mt-4 grid gap-4">
              <div>
                <h3 className="text-sm font-bold">
                  선생님 신청 <span className="text-neutral-400">({pending.length})</span>
                </h3>
                {pending.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-center text-xs text-neutral-400">
                    대기 중인 신청이 없습니다.
                  </p>
                ) : (
                  <ul className="mt-2 grid gap-1.5">
                    {pending.map((p) => (
                      <li
                        key={p.userId}
                        className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">{label(p)}</span>
                        <span className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => act(() => decideTeacher(p.userId, true))}
                            className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => act(() => decideTeacher(p.userId, false))}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
                          >
                            거절
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold">
                  승인된 선생님 <span className="text-neutral-400">({teachers.length})</span>
                </h3>
                {teachers.length === 0 ? (
                  <p className="mt-2 text-xs text-neutral-400">아직 없습니다.</p>
                ) : (
                  <ul className="mt-2 grid gap-1.5">
                    {teachers.map((p) => (
                      <li
                        key={p.userId}
                        className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">{label(p)}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`${label(p)}의 선생님 권한을 해제할까요? (학생 계정으로 돌아갑니다)`)) {
                              void act(() => revokeTeacher(p.userId));
                            }
                          }}
                          className="shrink-0 rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-red-600 disabled:opacity-50"
                        >
                          권한 해제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
