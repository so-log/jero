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

/** 커버 색 5종(lib/constants/covers 와 동일). */
export const TRIP_COVERS = [
  "blue",
  "mint",
  "coral",
  "purple",
  "amber",
] as const satisfies readonly CoverColor[];

/** 초대 역할 — UI 기본 editor, **owner 초대 불가**(결정 C). 생성자만 서버가 owner 로 추가. */
export const inviteSchema = z.object({
  email: z.string().trim().email("올바른 이메일을 입력해 주세요"),
  role: z.enum(["editor", "viewer"]),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type InviteRole = InviteInput["role"];

export const tripSchema = z
  .object({
    title: z.string().trim().min(1, "여행 제목을 입력해 주세요"),
    icon: z.enum(TRIP_ICONS),
    cover: z.enum(TRIP_COVERS),
    country: z.string().trim().max(40),
    region: z.string().trim().max(40),
    // 캘린더 선택값(ISO). 미선택이면 빈 문자열 → 검증 실패.
    start_date: z.string().min(1, "시작일과 종료일을 선택해 주세요"),
    end_date: z.string().min(1, "시작일과 종료일을 선택해 주세요"),
    members: z.array(inviteSchema),
    startMode: z.enum(["blank", "template"]),
    templateId: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
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
  2: ["start_date", "end_date"],
  3: [],
  4: ["startMode", "templateId"],
};
