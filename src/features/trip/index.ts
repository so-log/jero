/**
 * features/trip — 02 내 여행 목록(홈) + 단일 여행 상세 쿼리.
 * 쿼리 키: ['trips'](목록) ↔ ['trip', id](상세). 카드 진입 시 seed 로 캐시 연속성(설계 §4).
 */
export { TripsHome } from "./components/TripsHome";
export { CreateTripWizard } from "./components/CreateTripWizard";
export { TripDatesDialog } from "./components/TripDatesDialog";
export { useTripsQuery, useTripQuery } from "./api/useTripsQuery";
export { useUpdateTrip } from "./api/useUpdateTrip";
export { tripSchema, inviteSchema, type CreateTripInput, type InviteRole } from "./lib/tripSchema";
export type { TripSummaryDto, TripFilter } from "./types";
