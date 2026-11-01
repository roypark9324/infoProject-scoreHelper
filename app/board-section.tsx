"use client";

// 상점 모집 게시판
// - 선생님: "이 활동을 하면 상점 N점" 모집 글을 올리고, 들어온 신청을 인정/거절한다.
//   (인정하면 신청한 학생의 상점 기록이 자동으로 생긴다.)
// - 학생: 모집 중인 글을 보고 [참여 신청]을 누르고, 선생님이 인정하면 상점이 기록된다.
// 누가 선생님인지는 DB의 teachers 목록으로 정해진다. (supabase/board.sql)

import { useCallback, useEffect, useState } from "react";
import {
  applyToPost,
  cancelApplication,
  createPost,
  decideApplication,
  deletePost,
  fetchBoard,
  postsToActivities,
  setPostOpen,
  type Application,
  type BoardData,
  type MeritPost,
} from "@/lib/board";
import type { MeritActivity } from "@/lib/reasons";
import { validateActivity } from "@/lib/records";

interface Props {
  /** 모집 중인 글을 '상쇄 계획'에 쓰도록 부모에게 알려 준다. */
  onOpenPosts: (activities: MeritActivity[]) => void;
  /** 인정된 상점이 기록 목록에 보이도록 부모가 기록을 다시 불러온다. */
  onRefreshRecords: () => void;
}

function who(a: Application): string {
  return a.studentName ? `${a.studentName} (${a.studentEmail})` : a.studentEmail;
}

export default function BoardSection({ onOpenPosts, onRefreshRecords }: Props) {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 선생님: 모집 글 작성 칸
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const reload = useCallback(async () => {
    try {
      const next = await fetchBoard();
      setData(next);
      onOpenPosts(postsToActivities(next.posts));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    }
  }, [onOpenPosts]);

  useEffect(() => {
    let cancelled = false;
    fetchBoard()
      .then((next) => {
        if (cancelled) return;
        setData(next);
        onOpenPosts(postsToActivities(next.posts));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [onOpenPosts]);

  /** 버튼 동작 하나를 실행하고 게시판을 다시 불러온다. 실패하면 안내만 띄운다. */
  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setBusy(true);
    await reload();
    onRefreshRecords();
    setBusy(false);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const found = validateActivity(title, points);
    if (found.length > 0) {
      setFormErrors(found);
      return;
    }
    setFormErrors([]);
    void act(async () => {
      await createPost({ title: title.trim(), description: description.trim(), points: Number(points) });
      setTitle("");
      setDescription("");
      setPoints("");
    });
  }

  const isTeacher = data?.isTeacher ?? false;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold">상점 모집 게시판</h2>
          {isTeacher && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              선생님
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={busy}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
        >
          새로고침
        </button>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        {isTeacher
          ? "“이 활동을 하면 상점을 줄게” 하고 모집 글을 올리세요. 학생이 신청하면 인정해 주세요."
          : "선생님이 올린 모집 글을 보고 [참여 신청]을 누르세요. 선생님이 인정하면 상점이 기록에 자동으로 추가돼요."}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!data && !error && <p className="mt-3 text-xs text-neutral-400">불러오는 중…</p>}

      {data && isTeacher && (
        <TeacherView
          data={data}
          busy={busy}
          title={title}
          description={description}
          points={points}
          formErrors={formErrors}
          onTitle={setTitle}
          onDescription={setDescription}
          onPoints={setPoints}
          onCreate={handleCreate}
          act={act}
        />
      )}

      {data && !isTeacher && <StudentView data={data} busy={busy} act={act} />}
    </section>
  );
}

// ── 선생님 화면 ───────────────────────────────────────

interface TeacherProps {
  data: BoardData;
  busy: boolean;
  title: string;
  description: string;
  points: string;
  formErrors: string[];
  onTitle: (v: string) => void;
  onDescription: (v: string) => void;
  onPoints: (v: string) => void;
  onCreate: (e: React.FormEvent) => void;
  act: (action: () => Promise<void>) => Promise<void>;
}

function TeacherView({
  data,
  busy,
  title,
  description,
  points,
  formErrors,
  onTitle,
  onDescription,
  onPoints,
  onCreate,
  act,
}: TeacherProps) {
  const myPosts = data.posts.filter((p) => p.authorId === data.userId);

  return (
    <>
      <form onSubmit={onCreate} className="mt-4 grid gap-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
        <span className="text-xs font-semibold text-blue-700">새 모집 글</span>
        <input
          type="text"
          value={title}
          maxLength={60}
          placeholder="활동 이름 (예: 도서관 정리 돕기)"
          onChange={(e) => onTitle(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={description}
          maxLength={300}
          placeholder="설명 (선택) — 언제, 어디서, 무엇을 하는지"
          onChange={(e) => onDescription(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0.5}
            step={0.5}
            value={points}
            placeholder="상점 점수"
            onChange={(e) => onPoints(e.target.value)}
            className="w-28 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            모집 올리기
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

      <h3 className="mt-5 text-sm font-bold">내가 올린 모집 글</h3>
      {myPosts.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
          아직 올린 모집 글이 없습니다. 위 칸에서 첫 모집을 올려 보세요.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {myPosts.map((post) => (
            <TeacherPost
              key={post.id}
              post={post}
              applications={data.applications.filter((a) => a.postId === post.id)}
              busy={busy}
              act={act}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function TeacherPost({
  post,
  applications,
  busy,
  act,
}: {
  post: MeritPost;
  applications: Application[];
  busy: boolean;
  act: (action: () => Promise<void>) => Promise<void>;
}) {
  const pending = applications.filter((a) => a.status === "pending");
  const approved = applications.filter((a) => a.status === "approved").length;

  return (
    <li className="rounded-xl border border-neutral-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {post.title} <span className="text-blue-600">· 상점 {post.points}점</span>
            {!post.isOpen && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">마감</span>
            )}
          </p>
          {post.description && <p className="mt-0.5 text-xs text-neutral-500">{post.description}</p>}
          <p className="mt-1 text-xs text-neutral-400">
            인정 {approved}명 · 대기 {pending.length}명
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => act(() => setPostOpen(post.id, !post.isOpen))}
            className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
          >
            {post.isOpen ? "마감" : "다시 열기"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("이 모집 글과 들어온 신청을 모두 삭제할까요? (이미 인정된 상점 기록은 남습니다)")) {
                void act(() => deletePost(post.id));
              }
            }}
            className="rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-red-600 disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <ul className="mt-2 grid gap-1.5 border-t border-neutral-100 pt-2">
          {pending.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{who(a)}</span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(() => decideApplication(a.id, true))}
                  className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  인정
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(() => decideApplication(a.id, false))}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
                >
                  거절
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ── 학생 화면 ─────────────────────────────────────────

function StudentView({
  data,
  busy,
  act,
}: {
  data: BoardData;
  busy: boolean;
  act: (action: () => Promise<void>) => Promise<void>;
}) {
  const mine = data.applications.filter((a) => a.studentId === data.userId);
  // 모집 중인 글 + 마감됐어도 내가 신청해 둔 글
  const visible = data.posts.filter((p) => p.isOpen || mine.some((a) => a.postId === p.id));

  if (visible.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
        지금 모집 중인 활동이 없습니다. 선생님이 모집 글을 올리면 여기에 나타나요.
      </p>
    );
  }

  return (
    <ul className="mt-4 grid gap-3">
      {visible.map((post) => {
        const application = mine.find((a) => a.postId === post.id);
        return (
          <li key={post.id} className="rounded-xl border border-neutral-200 p-3">
            <p className="text-sm font-semibold">
              {post.title} <span className="text-blue-600">· 상점 {post.points}점</span>
            </p>
            {post.description && <p className="mt-0.5 text-xs text-neutral-500">{post.description}</p>}
            <p className="mt-1 text-xs text-neutral-400">모집: {post.authorEmail}</p>

            <div className="mt-2">
              {!application && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(() => applyToPost(post.id))}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  참여 신청
                </button>
              )}
              {application?.status === "pending" && (
                <p className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                    신청함 · 선생님 인정 대기
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(() => cancelApplication(application.id))}
                    className="text-neutral-400 underline hover:text-neutral-700 disabled:opacity-50"
                  >
                    신청 취소
                  </button>
                </p>
              )}
              {application?.status === "approved" && (
                <p className="text-xs">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">인정됨</span>{" "}
                  <span className="text-neutral-500">상점 {post.points}점이 기록에 추가됐어요.</span>
                </p>
              )}
              {application?.status === "rejected" && (
                <p className="text-xs">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-500">
                    인정되지 않음
                  </span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
