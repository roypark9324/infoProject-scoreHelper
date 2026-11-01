import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 벌점 관리 도우미",
};

const CONTACT = "whdgus9324@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 text-sm leading-relaxed text-neutral-800">
      <h1 className="text-xl font-bold">개인정보처리방침</h1>
      <p className="mt-2 text-neutral-500">
        ‘벌점 관리 도우미’는 학생이 자신의 벌점·상점을 기록하고 관리하도록 돕는 정보과학 프로젝트(2608 박종현)입니다.
        이 서비스가 어떤 정보를 어떻게 쓰는지 알려 드립니다. 시행일: 2026년 11월 2일
      </p>

      <h2 className="mt-8 text-base font-bold">1. 수집하는 정보</h2>
      <ul className="mt-2 list-disc pl-5">
        <li>Google 로그인 때 Google이 알려 주는 이메일 주소와 이름(프로필)</li>
        <li>내가 직접 입력한 벌점·상점 기록(날짜, 구분, 사유, 점수, 메모), 목표 점수, 직접 등록한 활동</li>
        <li>상점 모집 글(선생님), 참여 신청(학생), 벌점 줄이기 팁과 ‘도움이 돼요’ 표시</li>
      </ul>

      <h2 className="mt-8 text-base font-bold">2. 이용 목적</h2>
      <p className="mt-2">
        로그인 확인, 누적 점수·원인 분석·추세 같은 통계 제공, 상점 모집 신청과 인정 처리, 팁 게시판 운영에만 씁니다.
        광고나 판매에는 쓰지 않습니다.
      </p>

      <h2 className="mt-8 text-base font-bold">3. 누구에게 보이나요</h2>
      <ul className="mt-2 list-disc pl-5">
        <li>내 벌점·상점 기록은 내 계정으로 로그인한 나만 볼 수 있습니다.</li>
        <li>상점 모집에 참여 신청을 하면, 그 글을 올린 선생님에게 내 이름과 이메일이 보입니다.</li>
        <li>모집 글에는 글을 올린 선생님의 이메일이 표시됩니다.</li>
        <li>팁은 이름 없이 ‘익명 학생’으로 다른 사용자에게 보입니다.</li>
        <li>서비스 운영자(개발자)는 데이터베이스 관리 화면에서 저장된 정보를 볼 수 있습니다. 운영·오류 확인 외의 목적으로 열람하지 않습니다.</li>
      </ul>

      <h2 className="mt-8 text-base font-bold">4. 정보를 맡아 주는 서비스</h2>
      <p className="mt-2">서비스를 운영하기 위해 아래 외부 서비스를 사용하며, 필요한 범위에서만 정보가 전달됩니다.</p>
      <ul className="mt-2 list-disc pl-5">
        <li>Google: 로그인</li>
        <li>Supabase: 로그인 정보와 기록 저장(데이터베이스)</li>
        <li>Vercel: 웹사이트 제공</li>
      </ul>
      <p className="mt-2">이 밖의 제3자에게 정보를 제공하거나 판매하지 않습니다.</p>

      <h2 className="mt-8 text-base font-bold">5. 보관과 삭제</h2>
      <p className="mt-2">
        기록과 팁은 목록의 [삭제] 버튼으로 직접 지울 수 있습니다. 계정과 저장된 모든 정보의 삭제를 원하면 아래 연락처로
        요청해 주세요. 확인 후 삭제합니다.
      </p>

      <h2 className="mt-8 text-base font-bold">6. 쿠키와 브라우저 저장소</h2>
      <p className="mt-2">로그인 상태를 유지하기 위해 브라우저의 쿠키 또는 저장소를 사용합니다. 분석·광고용 추적은 하지 않습니다.</p>

      <h2 className="mt-8 text-base font-bold">7. 문의와 개정</h2>
      <p className="mt-2">
        문의: <a className="text-blue-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
        <br />내용이 바뀌면 이 페이지에 새 시행일과 함께 알립니다.
      </p>

      <p className="mt-10 text-xs text-neutral-400">
        <Link href="/" className="underline">
          처음으로
        </Link>
        {" · "}
        <Link href="/terms" className="underline">
          이용약관
        </Link>
      </p>
    </div>
  );
}
