"use client";

// 알림 종 (탐구 일지 5회 피드백: 새 상점 활동 / 마감 임박 알림)
// 따로 알림 테이블을 두지 않고, 이미 있는 게시판·친구 데이터로 알림을 계산해 보여 준다.
//  - 새 모집 글: 마지막으로 '확인함'을 누른 뒤 다른 사람이 올린 모집 글
//  - 마감 임박: 마감이 3일 이내이고 아직 신청하지 않은 모집 글
//  - 받은 친구 요청
//  - 내 모집 글에 들어온 신청 (인정 대기)
// '새 글'의 기준 시각만 이 브라우저(localStorage)에 저장한다.

import { useCallback, useEffect, useState } from "react";
import { daysLeft, deadlineLabel, fetchBoard, isAcceptingApplications } from "@/lib/board";
import { fetchFriends } from "@/lib/friends";

const SEEN_KEY = "buljeom:notifications-seen-at";
/** 마감이 이 날수 이내로 남으면 '마감 임박'으로 알린다. */
const SOON_DAYS = 3;

interface Notice {
  id: string;
  text: string;
  tone: "info" | "warn";
}

function readSeenAt(): number {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (raw) return Number(raw);
    // 처음 쓰는 브라우저면 지금까지의 글은 '새 글'로 치지 않는다.
    window.localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    // 저장소를 못 쓰는 환경이면 새 글 알림은 건너뛴다.
  }
  return Date.now();
}

async function buildNotices(): Promise<Notice[]> {
  const [board, friends] = await Promise.all([fetchBoard(), fetchFriends().catch(() => null)]);
  const seenAt = readSeenAt();
  const applied = new Set(board.applications.filter((a) => a.studentId === board.userId).map((a) => a.postId));
  const notices: Notice[] = [];

  for (const post of board.posts) {
    const mine = post.authorId === board.userId;
    if (mine) {
      const waiting = board.applications.filter((a) => a.postId === post.id && a.status === "pending").length;
      if (waiting > 0) {
        notices.push({
          id: `wait:${post.id}`,
          text: `내 모집 “${post.title}”에 인정 대기 신청이 ${waiting}건 있어요.`,
          tone: "info",
        });
      }
      continue;
    }
    if (!isAcceptingApplications(post) || applied.has(post.id)) continue;

    const left = daysLeft(post);
    if (left !== null && left <= SOON_DAYS) {
      notices.push({
        id: `soon:${post.id}`,
        text: `“${post.title}” 신청이 곧 끝나요. (${deadlineLabel(post)})`,
        tone: "warn",
      });
    } else if (post.createdAt > seenAt) {
      notices.push({
        id: `new:${post.id}`,
        text: `새 상점 활동: “${post.title}” (상점 ${post.points}점)`,
        tone: "info",
      });
    }
  }

  if (friends) {
    for (const f of friends.friendships) {
      if (f.status === "pending" && f.addresseeId === friends.userId) {
        notices.push({
          id: `friend:${f.id}`,
          text: `${f.requesterName || f.requesterEmail}님이 친구 요청을 보냈어요.`,
          tone: "info",
        });
      }
    }
  }

  // 마감 임박을 맨 위로
  return notices.sort((a, b) => Number(b.tone === "warn") - Number(a.tone === "warn"));
}

export default function NotificationBell() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setNotices(await buildNotices());
      setFailed(false);
    } catch {
      // 게시판 DB가 없는 등 오류는 각 게시판 칸이 안내하므로, 종은 조용히 비워 둔다.
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    buildNotices()
      .then((next) => !cancelled && setNotices(next))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  function markSeen() {
    try {
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      // 무시
    }
    void refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`알림 ${notices.length}개`}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          void refresh();
        }}
        className="relative rounded-full px-3 py-1.5 text-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
      >
        <span aria-hidden>🔔</span>
        {notices.length > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[11px] font-bold leading-5 text-white">
            {notices.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl bg-white p-3 text-sm shadow-lg ring-1 ring-black/10">
          <div className="flex items-center justify-between">
            <b>알림</b>
            <button type="button" onClick={markSeen} className="text-xs text-neutral-400 underline hover:text-neutral-700">
              새 글 알림 지우기
            </button>
          </div>
          {failed ? (
            <p className="mt-2 text-xs text-neutral-400">알림을 불러오지 못했어요.</p>
          ) : notices.length === 0 ? (
            <p className="mt-2 text-xs text-neutral-400">새 알림이 없어요.</p>
          ) : (
            <ul className="mt-2 grid gap-1.5">
              {notices.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-lg px-2.5 py-1.5 text-xs ${
                    n.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  {n.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
