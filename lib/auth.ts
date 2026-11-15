// 로그인 (Supabase Auth · 이메일/비밀번호).
// Google 연동을 대체한다. 로그인 상태는 Supabase가 브라우저 쿠키에 저장한다.
// 비밀번호는 Supabase가 암호화(해시)해서 보관하므로 이 앱 코드와 DB 테이블에는 남지 않는다.

import type { Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "./supabase";

export const MIN_PASSWORD_LENGTH = 8;

const NOT_CONFIGURED = "Supabase 설정(.env.local)이 비어 있습니다.";

/** Supabase가 영어로 주는 흔한 오류를 학생이 알아볼 문장으로 바꾼다. */
function explain(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 맞지 않습니다.";
  if (m.includes("email not confirmed")) return "이메일 인증이 아직 끝나지 않았습니다. 받은 메일의 링크를 눌러 주세요.";
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "이미 가입된 이메일입니다. 로그인해 주세요.";
  }
  if (m.includes("password") && m.includes("characters")) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  if (m.includes("rate limit") || m.includes("too many")) return "요청이 너무 많습니다. 잠시 뒤 다시 시도하세요.";
  if (m.includes("signups not allowed")) return "지금은 회원가입이 막혀 있습니다.";
  return message;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignUpResult {
  error: string | null;
  /** true면 메일 인증이 필요해 아직 로그인되지 않은 상태 */
  needsEmailConfirm: boolean;
}

/** 회원가입. 이름은 가입 정보(full_name)에 담아 두고, DB 트리거가 프로필(역할=학생)을 만든다. */
export async function signUp({ name, email, password }: SignUpInput): Promise<SignUpResult> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, needsEmailConfirm: false };
  const { data, error } = await createClient().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim() } },
  });
  if (error) return { error: explain(error.message), needsEmailConfirm: false };
  // 이미 가입된 이메일이면 Supabase는 오류 대신 identities가 빈 사용자를 돌려준다.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { error: "이미 가입된 이메일입니다. 로그인해 주세요.", needsEmailConfirm: false };
  }
  return { error: null, needsEmailConfirm: !data.session };
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const { error } = await createClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return { error: error ? explain(error.message) : null };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await createClient().auth.signOut();
}

/** 로그인 상태가 바뀔 때마다 callback을 부른다. 반환값은 구독 해제 함수. */
export function watchSession(callback: (session: Session | null) => void): () => void {
  if (!isSupabaseConfigured()) {
    callback(null);
    return () => {};
  }
  const supabase = createClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
