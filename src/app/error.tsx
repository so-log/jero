"use client";

import { SystemPage } from "@/features/system";

/**
 * 500 — 세그먼트 경계 error boundary. "다시 시도"=reset()로 재렌더 시도.
 * 사용자에겐 일반화 메시지 + 추적 ID(error.digest)만, 상세 스택은 서버 로깅(§8.5).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SystemPage
      variant="error"
      onRetry={reset}
      helper={error.digest ? `오류 코드 · ${error.digest}` : undefined}
    />
  );
}
