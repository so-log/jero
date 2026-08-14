"use client";

import { useAssistantStatus } from "../api/useAssistantStatus";
import { useIndexPlaces } from "../api/useIndexPlaces";
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

  /*
   * RAG 인덱싱 — 워크스페이스 진입 1회(설계 §3.3). 아래 early return 보다 **위**에 둔다:
   *  ① 훅은 조건부로 호출할 수 없고
   *  ② 인덱싱은 패널을 열지 않아도, 범위 밖 뷰(캘린더 등)에 있어도 해두는 편이 낫다
   *     — 나중에 어시스턴트를 열었을 때 이미 근거가 준비돼 있다.
   * 플래그가 꺼져 있으면 훅 내부에서 요청 자체를 보내지 않는다(회귀 0).
   */
  useIndexPlaces(tripId, enabled);

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
