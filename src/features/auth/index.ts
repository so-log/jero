/**
 * features/auth — 01 로그인/랜딩. 구글/이메일 로그인·회원가입(useAuth seam) → 성공 시 /trips.
 * 세션은 서버 발급 HttpOnly 쿠키, 보호 라우트는 서버 검증(§8.2·§8.4).
 */
export { AuthLanding } from "./components/AuthLanding";
export { useAuth } from "./api/useAuth";
