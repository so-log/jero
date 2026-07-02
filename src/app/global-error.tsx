"use client";

import { SystemPage } from "@/features/system";

import "./globals.css";

/**
 * 루트 error boundary — 루트 레이아웃까지 실패한 경우. 자체 <html>/<body> 를 렌더해야 한다(Next 규약).
 * 일반화 메시지 + 추적 ID 만 노출(§8.5).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <SystemPage
          variant="error"
          onRetry={reset}
          helper={error.digest ? `오류 코드 · ${error.digest}` : undefined}
        />
      </body>
    </html>
  );
}
