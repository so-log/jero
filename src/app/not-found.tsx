import { SystemPage } from "@/features/system";

/**
 * 404 — 없는 URL · 삭제된 여행(`notFound()`). 서버가 404 상태를 응답.
 */
export default function NotFound() {
  return <SystemPage variant="404" />;
}
