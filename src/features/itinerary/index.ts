/**
 * features/itinerary — 04 플랜 · 05 일정표(후속)의 일정 도메인.
 * usePlacesQuery 단일 소스 → 순수 셀렉터로 화면/지도 뷰모델 투영(설계 §3·§4).
 */
export { PlanView } from "./components/PlanView";
export { CalendarView } from "./components/CalendarView";
export { ItineraryPanel } from "./components/ItineraryPanel";
export { usePlacesQuery, useMembersQuery } from "./api/usePlacesQuery";
export { useReorderPlaces, type ReorderInput } from "./api/useReorderPlaces";
export { usePlanStore } from "./store/planStore";
export { PLAN_FIXTURE, MEMBERS_FIXTURE } from "./api/fixtures";
export {
  deriveDays,
  placesForDay,
  reorderDayPlaces,
  toScheduledMarkers,
  toSavedMarkers,
} from "./lib/selectors";
export type {
  Day,
  FolderDto,
  MemberDto,
  PlaceDto,
  PlacesResponse,
  TripDto,
} from "./types";
