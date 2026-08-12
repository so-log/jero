import { z } from "zod";

import type { CategoryKey } from "@/lib/constants/category";

import { getPlacesServerKey } from "./env";

/**
 * Google Places 서버 클라이언트 — **grounding 의 근거원**(설계 §4). 서버 전용.
 *
 * 환각 방지의 핵심: 카드로 노출되고 일정에 반영될 수 있는 장소는 **여기서 실존이 확인된 것뿐**이다.
 * 모델이 이름을 지어내도 이 조회를 통과하지 못하면 카드가 만들어지지 않는다.
 *
 * Places API (New) `places:searchText` 를 쓴다 — 구 Text Search 는 신규 고객에게 닫혔다.
 * 필드 마스크로 **필요한 필드만** 요청해 과금 tier 를 낮춘다(설계 §8).
 */

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

/** 요청당 결과 상한(설계 §4 "각 최대 5건"). */
export const MAX_RESULTS = 5;
/** 동일 쿼리 캐시 TTL — 한 대화 안의 중복 조회를 막는다(설계 §8). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** grounding 을 통과한 실존 장소. 좌표가 **반드시** 있다(없으면 후보에서 탈락). */
export interface PlaceCandidate {
  name: string;
  address: string;
  lat: number;
  lng: number;
  googlePlaceId: string;
  /** Google types → jero 카테고리 추정. */
  category: CategoryKey;
}

const responseSchema = z.object({
  places: z
    .array(
      z.object({
        id: z.string().optional(),
        displayName: z.object({ text: z.string() }).optional(),
        formattedAddress: z.string().optional(),
        location: z
          .object({ latitude: z.number(), longitude: z.number() })
          .optional(),
        types: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

/**
 * Google Place types → jero 카테고리. 앞쪽 규칙이 우선한다.
 * 매칭이 없으면 `etc` — 분류 실패가 후보 탈락으로 이어지지는 않는다.
 */
const CATEGORY_RULES: { match: string[]; category: CategoryKey }[] = [
  { match: ["cafe", "coffee_shop", "bakery", "tea_house"], category: "cafe" },
  {
    match: ["restaurant", "food", "meal_takeaway", "bar", "meal_delivery"],
    category: "food",
  },
  { match: ["lodging", "hotel", "guest_house", "hostel"], category: "hotel" },
  {
    match: ["museum", "tourist_attraction", "art_gallery", "park", "temple", "shrine", "church", "historical_place", "zoo", "aquarium"],
    category: "museum",
  },
  { match: ["gift_shop", "souvenir_store", "book_store"], category: "gift" },
  {
    match: ["shopping_mall", "store", "department_store", "clothing_store", "market"],
    category: "shopping",
  },
  {
    match: ["train_station", "subway_station", "bus_station", "airport", "transit_station"],
    category: "transport",
  },
];

export function inferCategory(types: string[] | undefined): CategoryKey {
  if (!types || types.length === 0) return "etc";
  for (const rule of CATEGORY_RULES) {
    if (types.some((t) => rule.match.includes(t))) return rule.category;
  }
  return "etc";
}

/** 프로세스 메모리 캐시 — 서버리스라 인스턴스 수명만큼만 산다(그걸로 충분: 한 대화 내 중복 방지). */
const cache = new Map<string, { at: number; value: PlaceCandidate[] }>();

function cacheKey(query: string, near?: string): string {
  return `${query.trim().toLowerCase()}|${near?.trim().toLowerCase() ?? ""}`;
}

export interface SearchPlacesOptions {
  query: string;
  /** 지역 힌트(예: "도쿄 시부야") — 쿼리에 합쳐 검색 정확도를 올린다. */
  near?: string;
  signal?: AbortSignal;
}

/**
 * 실존 장소 검색. 실패·키 없음은 **빈 배열**로 흡수한다 —
 * 도구가 빈 결과를 주면 모델은 "찾지 못했다"고 답해야 하며, 가짜 장소를 만들면 안 된다(설계 §7).
 */
export async function searchPlaces({
  query,
  near,
  signal,
}: SearchPlacesOptions): Promise<PlaceCandidate[]> {
  const apiKey = getPlacesServerKey();
  if (!apiKey || !query.trim()) return [];

  const key = cacheKey(query, near);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const textQuery = near ? `${near} ${query}` : query;

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
        // 필요한 필드만 — 과금 tier·응답 크기를 낮춘다.
        "x-goog-fieldmask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.types",
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: MAX_RESULTS,
        languageCode: "ko",
      }),
      signal,
    });
  } catch {
    return []; // 네트워크 실패 → 근거 없음
  }

  // ★ 응답 본문에 키·쿼터 정보가 실릴 수 있어 로깅·전파하지 않는다(§8.5).
  if (!response.ok) return [];

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return [];
  }

  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) return [];

  const candidates: PlaceCandidate[] = [];
  for (const place of parsed.data.places ?? []) {
    const name = place.displayName?.text?.trim();
    const location = place.location;
    const googlePlaceId = place.id;
    // ★ 좌표·이름·place_id 가 없으면 탈락 — 지도·일정에 반영할 수 없는 후보는 카드가 되지 않는다.
    if (!name || !location || !googlePlaceId) continue;

    candidates.push({
      name,
      address: place.formattedAddress?.trim() ?? "",
      lat: location.latitude,
      lng: location.longitude,
      googlePlaceId,
      category: inferCategory(place.types),
    });
    if (candidates.length >= MAX_RESULTS) break;
  }

  cache.set(key, { at: Date.now(), value: candidates });
  return candidates;
}

/** 테스트 격리용 — 모듈 캐시를 비운다. */
export function clearPlacesCache(): void {
  cache.clear();
}
