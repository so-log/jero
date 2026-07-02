import { AuthLanding } from "@/features/auth";

/**
 * 01 로그인/랜딩 — `/`(= 로그인). 로그인 상태면 `/trips` 리다이렉트(서버 세션 검증, §8.2 — 인증 도입 시).
 * 비로그인 열람 가능: "공유 링크로 둘러보기" → /share/demo.
 */
export default function HomePage() {
  return <AuthLanding />;
}
