"use client";

// 로그인 화면.
// ⚠️ 지금 "Google로 로그인" 버튼은 임시입니다 — 실제 Google 계정 인증 없이
//    로그인 상태 표시만 저장합니다. 6차시에서 Supabase Auth의 Google 로그인으로 교체합니다.

import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-stub";

export default function LoginPage() {
  const router = useRouter();

  function handleGoogleLogin() {
    signIn();
    router.push("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 py-16 text-center">
      <h1 className="text-xl font-bold">벌점 관리 도우미</h1>
      <p className="mt-1 text-sm text-neutral-500">로그인하고 내 벌점을 관리하세요</p>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-bold shadow-sm hover:bg-neutral-50"
      >
        Google로 로그인
      </button>

      <p className="mt-4 text-xs text-neutral-400">
        지금은 임시 로그인입니다. 6차시에서 실제 Google 계정 연동으로 바뀝니다.
      </p>

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
