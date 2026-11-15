"use client";

// 로그인 · 회원가입 화면. 이메일과 비밀번호로 Supabase Auth에 로그인하고, 끝나면 첫 화면(/)으로 간다.
// 회원가입을 하면 학생 계정이 만들어진다. 선생님은 가입 뒤 첫 화면의 '내 계정'에서 신청한다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD_LENGTH, signIn, signUp } from "@/lib/auth";
import LegalLinks from "../legal-links";

type Mode = "login" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 입력값 검사. 문제가 있으면 안내 문장 목록을 돌려준다. */
function validate(mode: Mode, f: { name: string; email: string; password: string; password2: string }): string[] {
  const found: string[] = [];
  if (mode === "signup" && f.name.trim() === "") found.push("이름을 입력하세요.");
  if (!EMAIL_PATTERN.test(f.email.trim())) found.push("올바른 이메일 주소를 입력하세요.");
  if (mode === "login") {
    if (f.password === "") found.push("비밀번호를 입력하세요.");
  } else {
    if (f.password.length < MIN_PASSWORD_LENGTH) found.push(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
    else if (f.password !== f.password2) found.push("비밀번호 확인이 일치하지 않습니다.");
  }
  return found;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setErrors([]);
    setNotice(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(mode, { name, email, password, password2 });
    if (found.length > 0) {
      setErrors(found);
      setNotice(null);
      return;
    }
    setBusy(true);
    setErrors([]);
    setNotice(null);

    if (mode === "login") {
      const result = await signIn(email, password);
      if (result.error) {
        setErrors([result.error]);
        setBusy(false);
        return;
      }
      router.push("/");
      return;
    }

    const result = await signUp({ name, email, password });
    if (result.error) {
      setErrors([result.error]);
      setBusy(false);
      return;
    }
    if (result.needsEmailConfirm) {
      setNotice("가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.");
      setMode("login");
      setPassword("");
      setPassword2("");
      setBusy(false);
      return;
    }
    router.push("/");
  }

  const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col px-4 py-16">
      <h1 className="text-center text-xl font-bold">벌점 관리 도우미</h1>
      <p className="mt-1 text-center text-sm text-neutral-500">
        {mode === "login" ? "로그인하고 내 벌점을 관리하세요" : "회원가입하고 시작하세요"}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 text-sm font-semibold" role="tablist">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`rounded-lg py-2 transition ${
              mode === m ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {m === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-4 grid gap-3">
        {mode === "signup" && (
          <label className="grid gap-1 text-xs font-semibold text-neutral-600">
            이름
            <input
              type="text"
              value={name}
              maxLength={30}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              className={input}
            />
          </label>
        )}
        <label className="grid gap-1 text-xs font-semibold text-neutral-600">
          이메일
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-neutral-600">
          비밀번호
          <input
            type="password"
            value={password}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        {mode === "signup" && (
          <label className="grid gap-1 text-xs font-semibold text-neutral-600">
            비밀번호 확인
            <input
              type="password"
              value={password2}
              autoComplete="new-password"
              onChange={(e) => setPassword2(e.target.value)}
              className={input}
            />
            <span className="font-normal text-neutral-400">{MIN_PASSWORD_LENGTH}자 이상</span>
          </label>
        )}

        {errors.length > 0 && (
          <ul role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {errors.map((msg) => (
              <li key={msg}>• {msg}</li>
            ))}
          </ul>
        )}
        {notice && (
          <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-60"
        >
          {busy ? "처리 중…" : mode === "login" ? "로그인" : "가입하기"}
        </button>
      </form>

      {mode === "signup" && (
        <p className="mt-3 text-center text-xs text-neutral-400">
          선생님이라면 학생 계정으로 가입한 뒤 ‘내 계정’에서 선생님 신청을 하세요. 관리자가 승인하면 선생님 기능이 열립니다.
        </p>
      )}

      <button
        type="button"
        onClick={() => router.push("/")}
        className="mt-6 text-center text-xs text-neutral-400 underline"
      >
        홈으로 돌아가기
      </button>
      <LegalLinks />
    </div>
  );
}
