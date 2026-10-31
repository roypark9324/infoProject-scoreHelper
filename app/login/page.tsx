"use client";

// 로그인 화면. "Google로 로그인"을 누르면 Supabase Auth가 Google 계정 선택 화면으로 보내고,
// 인증이 끝나면 첫 화면(/)으로 돌아온다. (차시 6)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGoogleLogin() {
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle();
    // 성공하면 Google 화면으로 이동하므로 여기까지 돌아오는 건 실패했을 때뿐이다.
    if (result.error) {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 py-16 text-center">
      <h1 className="text-xl font-bold">벌점 관리 도우미</h1>
      <p className="mt-1 text-sm text-neutral-500">로그인하고 내 벌점을 관리하세요</p>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={busy}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-bold shadow-sm hover:bg-neutral-50 disabled:opacity-60"
      >
        {busy ? "Google로 이동 중…" : "Google로 로그인"}
      </button>

      {error && (
        <p role="alert" className="mt-4 text-xs text-red-600">
          로그인에 실패했습니다: {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => router.push("/")}
        className="mt-6 text-xs text-neutral-400 underline"
      >
        홈으로 돌아가기
      </button>
    </div>
  );
}
