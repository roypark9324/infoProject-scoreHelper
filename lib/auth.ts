// 로그인 (Supabase Auth + Google).
// 임시 로그인(auth-stub)을 대체한다. 로그인 상태는 Supabase가 브라우저 쿠키에 저장한다.

import type { Session } from "@supabase/supabase-js";
import { createClient, isGoogleLoginEnabled, isSupabaseConfigured } from "./supabase";

/** Google 로그인 시작 — Google 화면으로 이동했다가 이 사이트의 첫 화면으로 돌아온다. */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase 설정(.env.local)이 비어 있습니다." };
  }
  // 꺼져 있는 채로 이동하면 Supabase의 오류 화면(JSON)만 보이므로 먼저 확인한다.
  if (!(await isGoogleLoginEnabled())) {
    return {
      error:
        "Supabase에서 Google 로그인이 아직 켜져 있지 않습니다. (Authentication → Sign In / Providers → Google)",
    };
  }
  const { error } = await createClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  return { error: error ? error.message : null };
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
