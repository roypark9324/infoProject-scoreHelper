"use client";

// 로그인 여부에 따라 화면을 잠그는 껍데기.
// - 로그인 안 됨: "로그인 후 이용 가능합니다" 카드 → 누르면 /login 으로 이동
// - 로그인 됨: 원래 화면(children) + 로그아웃 버튼
// ⚠️ 실제 Google 계정 인증은 6차시(Supabase Auth)에서 붙입니다. 지금은 임시 상태입니다.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, signOut } from "@/lib/auth-stub";

type Phase = "loading" | "in" | "out";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    const sync = () => setPhase(isLoggedIn() ? "in" : "out");
    sync();
    // 다른 탭에서 로그인/로그아웃하면 이 화면도 따라 바뀌도록
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
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
      <div className="mx-auto flex w-full max-w-2xl items-center justify-end px-4 pt-4">
        <button
          type="button"
          onClick={() => {
            signOut();
            setPhase("out");
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-100"
        >
          로그아웃
        </button>
      </div>
      {children}
    </>
  );
}
