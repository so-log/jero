"use client";

import { useAssistantStatus } from "../api/useAssistantStatus";
import { useAssistantStore } from "../store/assistantStore";
import { AssistantFab } from "./AssistantFab";
import { AssistantPanel } from "./AssistantPanel";

/**
 * 어시스턴트 진입점 — FAB + 패널을 워크스페이스에 얹는다(기획 §2).
 *
 * 노출 조건(하나라도 어긋나면 **아무것도 렌더하지 않는다** → 기존 화면 회귀 0):
 *  ① 서버가 판정한 feature flag(키 없으면 false)
 *  ② 뷰가 `plan` 또는 `places`(1차 범위, 계약 C9 #5)
 *
 * `viewer` 는 노출된다 — 대화는 가능하고 실행만 막힌다(기획 §7.1).
 */
export function AssistantLauncher({
  tripId,
  tripTitle,
  canEdit,
  view,
}: {
  tripId: string;
  tripTitle: string;
  canEdit: boolean;
  view: string;
}) {
  const { data: enabled = false } = useAssistantStatus();
  const open = useAssistantStore((s) => s.open);
  const openPanel = useAssistantStore((s) => s.openPanel);
  const closePanel = useAssistantStore((s) => s.closePanel);

  const inScope = view === "plan" || view === "places";
  if (!enabled || !inScope) return null;

  if (!open) return <AssistantFab onClick={openPanel} />;

  return (
    <AssistantPanel
      tripId={tripId}
      tripTitle={tripTitle}
      canEdit={canEdit}
      onClose={closePanel}
    />
  );
}
