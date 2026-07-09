import { PamphletExportView } from "@/features/pamphlet";

/**
 * 팜플렛 내보내기 — `/trips/[id]/pamphlet` (2차, 팜플렛_설계 §1). 설정 + A4 3단 미리보기.
 * 멤버(owner/editor)만. 미인증 가드는 미들웨어(/trips/*), viewer 분기는 뷰에서(서버 RLS 이중화).
 * Next 16: params 는 Promise.
 */
export default async function PamphletPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PamphletExportView tripId={id} />;
}
