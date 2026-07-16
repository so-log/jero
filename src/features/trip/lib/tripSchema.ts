import { z } from "zod";

import type { CoverColor } from "@/lib/constants/covers";
import type { IconName } from "@/lib/constants/icons";

/**
 * 여행 생성 입력 단일 출처 (03, 데이터 계약 §4). RHF + Zod 다단계 폼이 이 스키마를 공유한다.
 * 클라 검증은 UX 보조일 뿐 — 신뢰 경계는 서버다. 생성·역할·소유 관계는 서버에서 재검증한다(§8.2·§8.3).
 */

/** 대표 아이콘 6종(03 §12 고정 세트). */
export const TRIP_ICONS = [
  "building",
  "palmtree",
  "mountain",
  "utensils",
  "landmark",
  "waves",
] as const satisfies readonly IconName[];

/** 커버 색 프리셋 5종(lib/constants/covers 와 동일). 이 외 임의 hex 도 저장 가능(coverSchema). */
export const TRIP_COVERS = [
  "blue",
  "mint",
  "coral",
  "purple",
  "amber",
] as const satisfies readonly CoverColor[];

/** 커버 값 검증 — 프리셋 키 또는 임의 hex('#RGB'/'#RRGGBB'). cover_color 는 text 라 스키마 변경 없음. */
export const coverSchema = z.union([
  z.enum(TRIP_COVERS),
  z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "올바른 색을 선택해 주세요"),
]);

/** 초대 역할 — UI 기본 editor, **owner 초대 불가**(결정 C). 생성자만 서버가 owner 로 추가. */
export const inviteSchema = z.object({
  email: z.string().trim().email("올바른 이메일을 입력해 주세요"),
  role: z.enum(["editor", "viewer"]),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type InviteRole = InviteInput["role"];

/** 여행 도시(다중 도시, Phase 2). 날짜는 저장 안 함 — start_date + nights·순서로 파생(citySchedule). */
export const citySchema = z.object({
  name: z.string().trim().min(1, "도시 이름을 입력해 주세요"),
  country: z.string().trim().max(40).optional(),
  /** 박수(0=당일). */
  nights: z.number().int().min(0).max(90),
});

export type CityInput = z.infer<typeof citySchema>;

export const tripSchema = z
  .object({
    title: z.string().trim().min(1, "여행 제목을 입력해 주세요"),
    icon: z.enum(TRIP_ICONS),
    cover: coverSchema,
    country: z.string().trim().max(40),
    region: z.string().trim().max(40),
    // 시작일(ISO). 미선택이면 빈 문자열 → 검증 실패. 종료일은 도시 박수 합으로 파생.
    start_date: z.string().min(1, "시작일을 선택해 주세요"),
    end_date: z.string().min(1, "시작일을 선택해 주세요"),
    // 다중 도시(최소 1). 도시 1개면 기존 단일 도시 여행과 동일.
    cities: z.array(citySchema).min(1, "도시를 하나 이상 추가해 주세요"),
    members: z.array(inviteSchema),
    startMode: z.enum(["blank", "template"]),
    templateId: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    // 시작·종료 모두 선택됐고 종료가 시작보다 빠르면 거부(빈 값은 위 min(1) 이 처리).
    if (v.start_date && v.end_date && v.end_date < v.start_date) {
      ctx.addIssue({
        path: ["end_date"],
        code: "custom",
        message: "종료일은 시작일과 같거나 이후여야 해요",
      });
    }
    if (v.startMode === "template" && !v.templateId) {
      ctx.addIssue({
        path: ["templateId"],
        code: "custom",
        message: "복제할 템플릿을 선택해 주세요",
      });
    }
  });

export type CreateTripInput = z.infer<typeof tripSchema>;

/** 단계별 검증 대상 필드(RHF trigger 용). Step3(멤버)는 추가 시 검증되므로 게이트 없음. */
export const STEP_FIELDS: Record<number, (keyof CreateTripInput)[]> = {
  1: ["title", "icon", "cover", "country", "region"],
  2: ["start_date", "cities"], // end_date 는 박수 합으로 파생(Step 이 계산)
  3: [],
  4: ["startMode", "templateId"],
};
