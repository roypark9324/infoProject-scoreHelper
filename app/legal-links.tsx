import Link from "next/link";

// 개인정보처리방침·이용약관 링크. 로그인 전 화면과 로그인 화면, 메인 화면 아래에 둔다.
export default function LegalLinks() {
  return (
    <p className="mt-4 text-center text-xs text-neutral-400">
      <Link href="/privacy" className="underline">
        개인정보처리방침
      </Link>
      <span aria-hidden> · </span>
      <Link href="/terms" className="underline">
        이용약관
      </Link>
    </p>
  );
}
