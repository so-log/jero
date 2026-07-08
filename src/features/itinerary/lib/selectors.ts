import type {
  LiveCursor,
  ScheduledMarker,
  SavedMarker as SavedMarkerVM,
} from "@/components/map";
import type { CategoryKey } from "@/lib/constants/category";
import type { CursorPeer } from "@/store/cursorStore";

import type { Day, MemberDto, PlaceDto, PlacesResponse } from "../types";

/**
 * 순수 셀렉터 — 도메인(PlaceDto) → 화면/지도 뷰모델 투영(설계 §4 "혼용 금지", §10).
 * 부수효과 없음. usePlacesQuery 단일 소스를 04 가 셀렉터로 투영(중복 fetch 금지).
 */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 'YYYY-MM-DD' 를 로컬 타임존 영향 없이 파싱(UTC 자정) — 요일 계산용. */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 기간(start~end)에서 Day 목록 파생 — index·날짜·라벨·요일(여행 현지 기준, 설계 §11 타임존). */
export function deriveDays(startDate: string, endDate: string): Day[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const days: Day[] = [];
  for (
    let cur = start, i = 0;
    cur.getTime() <= end.getTime();
    cur = new Date(cur.getTime() + 86_400_000), i++
  ) {
    days.push({
      index: i,
      date: toISODate(cur),
      label: `Day ${i + 1}`,
      weekday: WEEKDAYS[cur.getUTCDay()],
    });
  }
  return days;
}

/** 특정 날짜의 일정 장소만, order_in_day 순으로. */
export function placesForDay(places: PlaceDto[], date: string): PlaceDto[] {
  return places
    .filter((p) => p.scheduled_date === date)
    .sort((a, b) => (a.order_in_day ?? 0) - (b.order_in_day ?? 0));
}

/** 좌표가 있는 일정 장소 → 번호 마커(순서). 좌표 없으면 지도에서 제외. */
export function toScheduledMarkers(dayPlaces: PlaceDto[]): ScheduledMarker[] {
  return dayPlaces
    .filter((p) => p.lat != null && p.lng != null)
    .map((p, i) => ({
      id: p.id,
      position: { lat: p.lat as number, lng: p.lng as number },
      order: i + 1,
      category: p.category,
    }));
}

/** 좌표가 있는 저장 장소 → 다이아 마커. */
/**
 * 실시간 커서(2차 A) — cursorStore 피어(userId→좌표)를 멤버(이름·색)와 매핑해 LiveCursor[] 로 투영.
 * 색·이름은 presence 아바타와 동일 소스(MemberDto = profile.avatar_color/name). 본인은 store 에서 이미 제외됨.
 */
export function peersToCursors(
  peers: Record<string, CursorPeer>,
  members: MemberDto[],
): LiveCursor[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  return Object.entries(peers).map(([userId, p]) => {
    const m = byId.get(userId);
    return {
      id: userId,
      name: m?.name ?? "멤버",
      color: m?.color ?? "#8A94A6",
      position: { lat: p.lat, lng: p.lng },
    };
  });
}

export function toSavedMarkers(savedPlaces: PlaceDto[]): SavedMarkerVM[] {
  return savedPlaces
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      position: { lat: p.lat as number, lng: p.lng as number },
      category: p.category,
    }));
}

/**
 * 특정 날짜의 일정 장소를 `orderedIds` 순서로 재배치 — order_in_day 를 1-based 로 재부여(드래그 낙관적 갱신).
 * 순수 함수: usePlacesQuery 캐시(PlacesResponse)를 입력받아 새 객체를 반환한다(불변). 대상 날짜 밖 장소는 그대로 둔다.
 * orderedIds 에 없는 그 날 장소는 원래 상대 순서를 유지해 뒤에 붙인다(부분 목록 방어).
 */
export function reorderDayPlaces(
  response: PlacesResponse,
  date: string,
  orderedIds: string[],
): PlacesResponse {
  const rank = new Map(orderedIds.map((id, i) => [id, i + 1]));
  const dayPlaces = response.places.filter((p) => p.scheduled_date === date);
  // orderedIds 에 빠진 그 날 장소는 기존 순서로 뒤에 이어 붙인다.
  let tail = orderedIds.length;
  for (const p of placesForDay(dayPlaces, date)) {
    if (!rank.has(p.id)) rank.set(p.id, ++tail);
  }
  return {
    ...response,
    places: response.places.map((p) =>
      p.scheduled_date === date && rank.has(p.id)
        ? { ...p, order_in_day: rank.get(p.id) as number }
        : p,
    ),
  };
}

/** 카테고리 필터(리스트용) — 'all' 이면 전체. 마커 mute 는 지도에서 opacity 로 처리. */
export function filterByCategory(
  places: PlaceDto[],
  category: CategoryKey | "all",
): PlaceDto[] {
  if (category === "all") return places;
  return places.filter((p) => p.category === category);
}
