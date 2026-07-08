import { deriveDays } from "@/features/itinerary";
import type { PlaceDto } from "@/features/itinerary";
import type { CategoryKey } from "@/lib/constants/category";

/**
 * 여행 통계(2차 E) 순수 셀렉터 — 일정 장소(scheduled)로 이동거리·분포를 집계한다(설계 §E, 기획 15).
 * 서버 저장 없음. 컴포넌트 직접 fetch 금지(§7.1) — usePlacesQuery 결과의 places(일정)만 넘겨받는다.
 * 이동거리는 연속 일정 좌표 간 **Haversine 직선 합**(좌표 없는 장소 제외).
 */
export interface DayDistance {
  /** 1-based Day. */
  day: number;
  date: string;
  /** 축 라벨(예: "D1"). */
  label: string;
  km: number;
  count: number;
}
export interface CategoryStat {
  category: CategoryKey;
  count: number;
  /** 정수 % (합 100 근사). */
  pct: number;
}
export interface AreaStat {
  area: string;
  count: number;
}
export interface TripStats {
  totalDistanceKm: number;
  perDay: DayDistance[];
  byCategory: CategoryStat[];
  byArea: AreaStat[];
  /** 일정 장소 수(scheduled). */
  placeCount: number;
  /** 여행 일수. */
  tripDays: number;
  /** 하루 평균 장소 수(소수 1자리). */
  avgPerDay: number;
}

interface Coord {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** 두 좌표 간 Haversine 직선 거리(km). */
export function haversineKm(a: Coord, b: Coord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

function hasCoord(p: PlaceDto): p is PlaceDto & { lat: number; lng: number } {
  return typeof p.lat === "number" && typeof p.lng === "number";
}

/** 한 날의 연속 일정(순서) 좌표 간 거리 합. 좌표 없는 장소는 건너뛴다(연결 유지). */
function dayDistanceKm(dayPlaces: PlaceDto[]): number {
  const coords = [...dayPlaces]
    .sort((a, b) => (a.order_in_day ?? 0) - (b.order_in_day ?? 0))
    .filter(hasCoord);
  let km = 0;
  for (let i = 1; i < coords.length; i++) {
    km += haversineKm(coords[i - 1], coords[i]);
  }
  return km;
}

/**
 * @param places 일정 장소(scheduled_date != null). usePlacesQuery 의 `places`.
 * @param trip   기간(start_date·end_date).
 */
export function computeTripStats(
  places: PlaceDto[],
  trip: { start_date: string; end_date: string },
): TripStats {
  const days = deriveDays(trip.start_date, trip.end_date);

  const perDay: DayDistance[] = days.map((d) => {
    const dayPlaces = places.filter((p) => p.scheduled_date === d.date);
    return {
      day: d.index + 1,
      date: d.date,
      label: `D${d.index + 1}`,
      km: round1(dayDistanceKm(dayPlaces)),
      count: dayPlaces.length,
    };
  });

  const totalDistanceKm = round1(
    perDay.reduce((sum, d) => sum + d.km, 0),
  );

  // 카테고리 분포(내림차순 + 정수 %).
  const catCount = new Map<CategoryKey, number>();
  for (const p of places) {
    catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
  }
  const placeCount = places.length;
  const byCategory: CategoryStat[] = [...catCount.entries()]
    .map(([category, count]) => ({
      category,
      count,
      pct: placeCount > 0 ? Math.round((count / placeCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 지역 분포(area 있는 것만, 내림차순).
  const areaCount = new Map<string, number>();
  for (const p of places) {
    const area = p.area?.trim();
    if (area) areaCount.set(area, (areaCount.get(area) ?? 0) + 1);
  }
  const byArea: AreaStat[] = [...areaCount.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  const tripDays = days.length;
  const avgPerDay = tripDays > 0 ? round1(placeCount / tripDays) : 0;

  return {
    totalDistanceKm,
    perDay,
    byCategory,
    byArea,
    placeCount,
    tripDays,
    avgPerDay,
  };
}
