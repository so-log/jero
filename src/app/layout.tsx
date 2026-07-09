import type { Metadata } from "next";
import { preload } from "react-dom";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "jero — 함께 짜는 여행 계획",
  description:
    "친구들과 함께 여행 일정·동선·예산을 짜는 협업 여행 플래너. 위치 저장에 그치지 않고 순서·동선·예산·역할까지 함께 관리합니다.",
};

/** Pretendard dynamic-subset 중 가장 흔한 청크(라틴+기본 한글)만 preload → FCP 보전(§8.3).
 *  나머지 청크는 렌더된 글리프의 unicode-range 매칭 시에만 로드된다(full 2MB 대체). */
const PRELOAD_CHUNKS = [91, 90] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  for (const n of PRELOAD_CHUNKS) {
    preload(`/fonts/pretendard/PretendardVariable.subset.${n}.woff2`, {
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    });
  }

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
