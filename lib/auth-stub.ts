// 임시 로그인 상태 (브라우저 localStorage 기반)
// ⚠️ 6차시에서 Supabase Auth(Google 로그인)로 교체할 자리표시용 코드입니다.
//    지금은 "로그인했다는 표시"만 저장하고, 실제 계정 인증은 하지 않습니다.

const KEY = "buljeom.tempLoggedIn";

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function signIn(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // localStorage를 못 쓰는 환경이면 그냥 무시
  }
}

export function signOut(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
