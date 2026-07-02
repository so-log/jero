import type { Metadata } from "next";
import { pretendard } from "./fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "jero — 함께 짜는 여행 계획",
  description:
    "친구들과 함께 여행 일정·동선·예산을 짜는 협업 여행 플래너. 위치 저장에 그치지 않고 순서·동선·예산·역할까지 함께 관리합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
