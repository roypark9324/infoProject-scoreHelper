import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "벌점 관리 도우미",
  description:
    "학생이 받은 벌점·상점 내역을 입력하면 누적 점수, 사유별 통계, 상쇄 방법을 보여 주는 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
