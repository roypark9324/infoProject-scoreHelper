"use client";

// 친구 + 벌점 대결
// - 이메일로 친구 요청을 보내고, 받은 요청을 수락한다.
// - 수락된 친구끼리 선택한 기간의 누적 벌점이 가장 적은 순서로 순위를 보여 준다. (적을수록 이긴다)
// 친구에게는 합계만 보이고 기록 내용은 보이지 않는다. DB는 supabase/friends.sql.

import { useCallback, useEffect, useState } from "react";
import {
  acceptFriend,
  fetchFriends,
  fetchScores,
  removeFriend,
  requestFriend,
  type FriendsData,
  type Friendship,
  type ScoreRow,
} from "@/lib/friends";
import { fetchProfiles, type Profile } from "@/lib/profiles";
import { PERIOD_LABEL, periodStart, type Period } from "@/lib/score";
import Avatar from "./avatar";

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
}

function label(name: string, email: string): string {
  return name ? `${name} (${email})` : email;
}

const RANK_PERIODS: Period[] = ["month", "year"];

/** 나와 수락된 친구의 프로필. 프로필 DB가 아직 없어도 친구 기능은 그대로 쓰도록 실패하면 빈 값을 돌려준다. */
async function loadProfiles(friends: FriendsData): Promise<Record<string, Profile>> {
  const ids = [friends.userId];
  for (const f of friends.friendships) {
    if (f.status === "accepted") ids.push(f.requesterId === friends.userId ? f.addresseeId : f.requesterId);
  }
  try {
    return await fetchProfiles(ids);
  } catch {
    return {};
  }
}

export default function FriendsSection() {
  const [data, setData] = useState<FriendsData | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [period, setPeriod] = useState<Period>("month");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p: Period) => {
    const [friends, rows] = await Promise.all([fetchFriends(), fetchScores(periodStart(p))]);
    const found = await loadProfiles(friends);
    setData(friends);
    setScores(rows);
    setProfiles(found);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFriends(), fetchScores(periodStart(period))])
      .then(async ([friends, rows]) => {
        const found = await loadProfiles(friends);
        if (cancelled) return;
        setData(friends);
        setScores(rows);
        setProfiles(found);
      })
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [period]);

  /** 버튼 동작 하나를 실행하고 목록을 다시 불러온다. 실패하면 안내만 띄운다. */
  async function act(action: () => Promise<void>, done?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load(period);
      if (done) setNotice(done);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value.includes("@")) {
      setError("친구의 이메일 주소를 입력하세요.");
      return;
    }
    void act(async () => {
      await requestFriend(value);
      setEmail("");
    }, "친구 요청을 보냈어요. 상대가 수락하면 대결이 시작돼요.");
  }

  const userId = data?.userId ?? "";
  const incoming = (data?.friendships ?? []).filter((f) => f.status === "pending" && f.addresseeId === userId);
  const outgoing = (data?.friendships ?? []).filter((f) => f.status === "pending" && f.requesterId === userId);
  const accepted = (data?.friendships ?? []).filter((f) => f.status === "accepted");

  function friendOf(f: Friendship): { id: string; name: string; email: string } {
    return f.requesterId === userId
      ? { id: f.addresseeId, name: f.addresseeName, email: f.addresseeEmail }
      : { id: f.requesterId, name: f.requesterName, email: f.requesterEmail };
  }

  const best = scores.length > 0 ? scores[0].net : 0;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-bold">친구 · 벌점 대결</h2>
      <p className="mt-1 text-xs text-neutral-500">
        친구를 추가하면 서로의 <b>누적 벌점 합계</b>만 순위로 보여요. 벌점이 가장 적은 사람이 1등! (사유·날짜 같은 기록은
        친구에게 보이지 않아요.)
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</p>}
      {!data && !error && <p className="mt-3 text-xs text-neutral-400">불러오는 중…</p>}

      {data && (
        <>
          {/* 순위표 */}
          <div className="mt-4 flex items-center gap-2" role="group" aria-label="대결 기간">
            <span className="text-xs text-neutral-500">대결 기간</span>
            {RANK_PERIODS.map((p) => (
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

          {accepted.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
              아직 친구가 없어요. 아래에서 친구 이메일로 요청을 보내 보세요.
            </p>
          ) : (
            <ol className="mt-3 grid gap-2">
              {scores.map((row, i) => {
                const me = row.userId === userId;
                const leader = row.net === best;
                return (
                  <li
                    key={row.userId}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                      me ? "border-blue-200 bg-blue-50/50" : "border-neutral-200"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <b className="shrink-0 text-neutral-400">{i + 1}위</b>
                      <Avatar url={profiles[row.userId]?.avatarUrl ?? null} name={profiles[row.userId]?.displayName || row.name || row.email} size={28} />
                      <span className="min-w-0 truncate">
                        {me ? "나" : profiles[row.userId]?.displayName || label(row.name, row.email)}
                        {leader && <span className="ml-2" aria-label="1등">🏆</span>}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold">{row.net}점</span>
                  </li>
                );
              })}
            </ol>
          )}

          {/* 친구 요청 */}
          <form onSubmit={handleRequest} className="mt-4 flex gap-2">
            <input
              type="email"
              value={email}
              placeholder="친구 이메일"
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              친구 요청
            </button>
          </form>

          {incoming.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold">받은 친구 요청</h3>
              <ul className="mt-2 grid gap-1.5">
                {incoming.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{label(f.requesterName, f.requesterEmail)}</span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(() => acceptFriend(f.id), "친구가 됐어요!")}
                        className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        수락
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(() => removeFriend(f.id))}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        거절
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {outgoing.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold">보낸 요청 (수락 대기)</h3>
              <ul className="mt-2 grid gap-1.5">
                {outgoing.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{label(f.addresseeName, f.addresseeEmail)}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(() => removeFriend(f.id))}
                      className="shrink-0 text-xs text-neutral-400 underline hover:text-neutral-700 disabled:opacity-50"
                    >
                      요청 취소
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {accepted.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold">내 친구</h3>
              <ul className="mt-2 grid gap-1.5">
                {accepted.map((f) => {
                  const other = friendOf(f);
                  const p = profiles[other.id];
                  return (
                    <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar url={p?.avatarUrl ?? null} name={p?.displayName || other.name || other.email} size={36} />
                        <span className="min-w-0">
                          <span className="block truncate">
                            {p?.displayName || label(other.name, other.email)}
                            {p?.grade && <span className="ml-2 text-xs text-neutral-400">{p.grade}학년</span>}
                          </span>
                          {p?.bio && <span className="block truncate text-xs text-neutral-500">{p.bio}</span>}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("친구를 끊을까요? 서로의 순위가 더 이상 보이지 않아요.")) {
                            void act(() => removeFriend(f.id));
                          }
                        }}
                        className="shrink-0 text-xs text-neutral-400 underline hover:text-red-600 disabled:opacity-50"
                      >
                        친구 끊기
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
