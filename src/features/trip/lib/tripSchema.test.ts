import { describe, expect, it } from "vitest";

import { inviteSchema, tripSchema, type CreateTripInput } from "./tripSchema";

/** 03/10 폼 스키마 — 제목 필수·템플릿 refine·초대 역할(C: editor 기본, owner 불가). */
const baseTrip: CreateTripInput = {
  title: "도쿄",
  icon: "building",
  cover: "blue",
  country: "일본",
  region: "도쿄",
  start_date: "2026-04-18",
  end_date: "2026-04-21",
  members: [],
  startMode: "blank",
  templateId: null,
};

describe("tripSchema", () => {
  it("유효 입력 통과", () => {
    expect(tripSchema.safeParse(baseTrip).success).toBe(true);
  });
  it("제목 미입력 → 실패(메시지)", () => {
    const r = tripSchema.safeParse({ ...baseTrip, title: "  " });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("여행 제목을 입력해 주세요");
    }
  });
  it("템플릿 모드인데 templateId 없음 → 실패", () => {
    const r = tripSchema.safeParse({ ...baseTrip, startMode: "template", templateId: null });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("templateId"))).toBe(true);
    }
  });
  it("템플릿 모드 + templateId 있음 → 통과", () => {
    const r = tripSchema.safeParse({ ...baseTrip, startMode: "template", templateId: "tpl-tokyo" });
    expect(r.success).toBe(true);
  });
});

describe("inviteSchema (결정 C)", () => {
  it("role editor/viewer 허용", () => {
    expect(inviteSchema.safeParse({ email: "a@b.com", role: "editor" }).success).toBe(true);
    expect(inviteSchema.safeParse({ email: "a@b.com", role: "viewer" }).success).toBe(true);
  });
  it("role owner 는 거부(초대 불가)", () => {
    expect(inviteSchema.safeParse({ email: "a@b.com", role: "owner" }).success).toBe(false);
  });
  it("잘못된 이메일 거부", () => {
    expect(inviteSchema.safeParse({ email: "nope", role: "editor" }).success).toBe(false);
  });
});
