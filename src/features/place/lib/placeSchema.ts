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
});

export type PlaceForm = z.infer<typeof placeSchema>;
