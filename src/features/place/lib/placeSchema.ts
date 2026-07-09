import { z } from "zod";

/**
 * 장소 상세/추가 폼 단일 출처(오버레이 ①, 06). 클라 검증=UX, 서버 재검증(§8.3).
 */
export const placeSchema = z.object({
  name: z.string().trim().min(1, "장소명을 입력해 주세요"),
  address: z.string().trim().max(120),
  category: z.enum([
    "food",
    "cafe",
    "gift",
    "shopping",
    "museum",
    "hotel",
    "transport",
    "etc",
  ]),
  folderId: z.string().nullable(),
  memo: z.string().max(300),
  // 좌표·place_id — Places Autocomplete/지도 클릭으로 채워지는 파생값(사용자 직접 입력 아님).
  // 없으면 null(수기 입력 허용) → 지도 마커만 안 뜬다(계약 §4.5).
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  googlePlaceId: z.string().nullable().optional(),
});

export type PlaceForm = z.infer<typeof placeSchema>;
