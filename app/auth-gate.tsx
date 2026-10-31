"use client";

// 로그인 여부에 따라 화면을 잠그는 껍데기.
// - 로그인 안 됨: "로그인 후 이용 가능합니다" 카드 → 누르면 /login 으로 이동
// - 로그인 됨: 원래 화면(children) + 로그아웃 버튼
// 로그인 상태는 Supabase Auth(Google 로그인)가 관리한다. (차시 6)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, watchSession } from "@/lib/auth";

type Phase = "loading" | "in" | "out";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // 로그인·로그아웃·다른 탭의 변화가 있을 때마다 화면이 따라 바뀐다.
    return watchSession((session) => {
      setEmail(session?.user.email ?? null);
      setPhase(session ? "in" : "out");
    });
  }, []);

  if (phase === "loading") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 text-sm text-neutral-400">
        불러오는 중…
      </div>
    );
  }

  if (phase === "out") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold">벌점 관리 도우미</h1>
          <p className="mt-1 text-sm text-neutral-500">
            내가 받은 벌점을 기록에서 끝내지 않고, 원인과 상쇄 방법까지 보여 주는 서비스
          </p>
        </header>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="flex w-full flex-col items-center gap-2 rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-black/5 transition hover:ring-2 hover:ring-neutral-300"
        >
          <span className="text-3xl" aria-hidden>
            🔒
          </span>
          <span className="text-base font-bold">로그인 후 이용 가능합니다</span>
          <span className="text-sm text-neutral-500">눌러서 로그인하기</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl items-center justify-end gap-2 px-4 pt-4">
        {email && <span className="text-xs text-neutral-400">{email}</span>}
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-100"
        >
          로그아웃
        </button>
      </div>
      {children}
    </>
  );
}
