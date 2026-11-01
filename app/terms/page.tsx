import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 | 벌점 관리 도우미",
};

const CONTACT = "whdgus9324@gmail.com";

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 text-sm leading-relaxed text-neutral-800">
      <h1 className="text-xl font-bold">이용약관</h1>
      <p className="mt-2 text-neutral-500">
        ‘벌점 관리 도우미’(정보과학 프로젝트, 2608 박종현)를 이용하기 전에 읽어 주세요. 시행일: 2026년 11월 2일
      </p>

      <h2 className="mt-8 text-base font-bold">1. 서비스 내용</h2>
      <p className="mt-2">
        학생이 직접 입력한 벌점·상점으로 누적 점수, 원인 분석, 추세, 상쇄 계획을 계산해 보여 주고, 선생님의 상점 모집과
        학생들의 팁 공유를 돕는 학습용 웹 서비스입니다.
      </p>

      <h2 className="mt-8 text-base font-bold">2. 학교 공식 기록이 아닙니다</h2>
      <p className="mt-2">
        이 서비스의 점수는 이용자가 입력한 값으로 계산한 참고용 수치입니다. 학교의 공식 벌점·상점 기록과 연결되어 있지
        않으며, 실제 점수와 조치는 학교의 기준과 기록이 우선합니다.
      </p>

      <h2 className="mt-8 text-base font-bold">3. 계정</h2>
      <p className="mt-2">Google 계정으로 로그인합니다. 선생님 권한은 서비스 운영자가 선생님 이메일을 등록한 계정에만 주어집니다.</p>

      <h2 className="mt-8 text-base font-bold">4. 이용자가 지킬 일</h2>
      <ul className="mt-2 list-disc pl-5">
        <li>사실대로 기록하고, 다른 사람의 계정을 쓰지 않습니다.</li>
        <li>팁과 모집 글에 욕설, 비방, 개인정보, 거짓 정보를 쓰지 않습니다.</li>
        <li>서비스를 정상적으로 쓰지 못하게 하는 행동(과도한 반복 요청 등)을 하지 않습니다.</li>
      </ul>

      <h2 className="mt-8 text-base font-bold">5. 게시물 관리</h2>
      <p className="mt-2">
        팁은 이름 없이 다른 이용자에게 공개됩니다. 부적절한 글은 선생님 또는 운영자가 삭제할 수 있고, 반복하면 이용이
        제한될 수 있습니다.
      </p>

      <h2 className="mt-8 text-base font-bold">6. 서비스의 변경과 중단</h2>
      <p className="mt-2">
        학습 프로젝트라서 기능이 바뀌거나 예고 없이 중단될 수 있습니다. 중요한 점수는 따로 적어 두세요. 서비스 이용 중 생긴
        손해에 대해 운영자는 법이 정한 범위를 넘는 책임을 지지 않습니다.
      </p>

      <h2 className="mt-8 text-base font-bold">7. 개인정보와 문의</h2>
      <p className="mt-2">
        개인정보는 <Link href="/privacy" className="text-blue-700 underline">개인정보처리방침</Link>에 따라 다룹니다. 문의:{" "}
        <a className="text-blue-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>

      <p className="mt-10 text-xs text-neutral-400">
        <Link href="/" className="underline">
          처음으로
        </Link>
        {" · "}
        <Link href="/privacy" className="underline">
          개인정보처리방침
        </Link>
      </p>
    </div>
  );
}
