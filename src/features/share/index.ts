/**
 * features/share — 08 공개 읽기 전용 공유 뷰(/share/[token]). 04 컴포넌트를 canEdit=false 로 재사용.
 * 토큰 스코프·만료·민감 필드 제외는 서버가 최종 강제(§8.2·§8.5).
 */
export { SharedTripView } from "./components/SharedTripView";
export { useSharedTripQuery } from "./api/useSharedTripQuery";
