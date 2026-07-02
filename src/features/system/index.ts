/**
 * features/system — 11 시스템 페이지(404/500/403/점검). 공통 SystemPage 에 상태 설정 주입.
 * Next 특수 파일(not-found/error/global-error)이 렌더. 08 공유 에러도 이 컴포넌트로 통일.
 */
export { SystemPage } from "./components/SystemPage";
export type { SystemVariant } from "./lib/states";
