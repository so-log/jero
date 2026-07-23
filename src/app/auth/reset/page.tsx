import { ResetPasswordPanel } from "@/features/auth";

/**
 * 비밀번호 재설정 — 복구 링크 진입 후(콜백에서 코드→세션 교환) 새 비밀번호를 설정한다.
 * 세션(복구)이 없으면 만료/무효 안내. 세션은 서버 발급 HttpOnly 쿠키(§8.4).
 */
export default function ResetPasswordPage() {
  return <ResetPasswordPanel />;
}
