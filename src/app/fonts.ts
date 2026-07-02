import localFont from "next/font/local";

/**
 * Pretendard Variable — self-host (외부 CDN 미사용, CSP `font-src 'self'`).
 *
 * ⚠️ 빌드/실행 전 폰트 파일을 아래 경로에 배치해야 합니다 (없으면 `next dev`·`build` 실패):
 *   src/app/fonts/PretendardVariable.woff2
 * 다운로드: https://github.com/orioncactus/pretendard/releases (PretendardVariable.woff2)
 *   - 번들이 부담되면 한글 subset(woff2 subset) 적용 검토 — 현재는 full variable.
 * (참고: `yarn typecheck` 은 파일 존재를 검사하지 않으므로 영향 없음)
 */
export const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "100 900", // Pretendard Variable 표준 wght 축
  display: "swap",
  preload: true,
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});
