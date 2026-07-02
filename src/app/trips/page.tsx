import { TripsHome } from "@/features/trip";
import type { TripFilter } from "@/features/trip";

/**
 * 02 내 여행 목록(홈) — `/trips`. 필터는 `?tab=upcoming|past|all`(기본 upcoming) URL 동기화.
 * Next 16: searchParams 는 Promise. 비로그인 가드(→ `/`)는 인증 도입 시 추가(01·미들웨어).
 */
export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "upcoming" } = await searchParams;
  const filter: TripFilter =
    tab === "past" || tab === "all" ? tab : "upcoming";
  return <TripsHome tab={filter} />;
}
