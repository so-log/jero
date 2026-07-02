"use client";

import { usePlacesStore } from "../store/placesStore";

/**
 * "일정에 추가" 배정 시seam — 04 §13 "저장↔일정 배정 플로우" 진입점.
 *
 * 현재는 **스텁**: 로컬 UI 상태(placesStore.assigned)만 갱신해 카드/핀 표시를 데모한다.
 * TODO(supabase): useMutation 으로 교체 — 실제 배정은 같은 Place 행을 갱신한다.
 *   mutationFn: ({placeId, date}) => supabase.from('place')
 *       .update({ scheduled_date: date, order_in_day: <해당 날 마지막+1>, scheduled_by: me })
 *       .eq('id', placeId)
 *   onSuccess: invalidate(['places', tripId]) → 04(동선)·05(일정표)에 즉시 반영(설계 §5).
 *   unassign: scheduled_date=null 로 되돌림. 권한은 서버/RLS 재검증(§8.2).
 */
export function useAddPlaceToSchedule() {
  const assignLocal = usePlacesStore((s) => s.assignLocal);
  const unassignLocal = usePlacesStore((s) => s.unassignLocal);

  return {
    /** day: 1-based Day 번호. (스텁: 로컬만) */
    assign: (placeId: string, day: number) => assignLocal(placeId, day),
    unassign: (placeId: string) => unassignLocal(placeId),
  };
}
