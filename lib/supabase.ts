import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// 차시 6: Supabase 연결.
// 브라우저에는 Publishable key만 쓴다. (Secret / service_role 키는 절대 넣지 않는다.)
// NEXT_PUBLIC_ 변수는 process.env.이름 형태로 직접 적어야 빌드할 때 값이 들어간다.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** .env.local에 두 값이 모두 채워져 있는지 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

let browserClient: SupabaseClient | null = null;

/** 브라우저용 Supabase 클라이언트 (로그인과 7차시부터의 기록 저장·조회에 사용, 한 번만 만든다) */
export function createClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      ".env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 넣어 주세요.",
    );
  }
  browserClient ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return browserClient;
}

/** Supabase에서 Google 로그인이 켜져 있는지. 확인하지 못하면 true로 보고 그냥 시도한다. */
export async function isGoogleLoginEnabled(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_KEY },
    });
    if (!res.ok) return true;
    const settings = await res.json();
    return settings?.external?.google !== false;
  } catch {
    return true;
  }
}

export type ConnectionResult = { ok: boolean; message: string };

/** Supabase 서버에 실제로 요청을 보내 URL과 키가 맞는지 확인한다. */
export async function checkConnection(): Promise<ConnectionResult> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { ok: false, message: ".env.local에 URL 또는 키가 비어 있습니다." };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_KEY },
    });
    if (res.ok) return { ok: true, message: "Supabase 연결됨" };
    return { ok: false, message: `연결 실패 (HTTP ${res.status}) — 키를 다시 확인하세요.` };
  } catch {
    return { ok: false, message: "연결 실패 — Project URL을 다시 확인하세요." };
  }
}
