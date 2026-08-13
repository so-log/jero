import { describe, expect, it } from "vitest";

import { coursePlanSchema, MAX_COURSE_PLACES } from "./assistantSchema";

/**
 * 코스 스키마 회귀 (설계 §5.2·§6.3).
 * ★ 핵심: **좌표 없는 항목은 통과하지 못한다** — 코스 항목은 그대로 지도·동선 최적화에 들어가므로
 *   여기서 막지 못하면 좌표 없는 place 가 일정에 생긴다.
 */

/** 좌표를 뺀 나머지 — "좌표 없는 항목" 을 만들 때 그대로 쓴다. */
const WITHOUT_COORDS = {
  name: "블루보틀 아오야마",
  category: "cafe",
  googlePlaceId: "ChIJ_blue",
  address: "도쿄도 미나토구",
  day: 1,
  order: 1,
  reason: "조용해서 오전에 좋아요",
};

const ITEM = { ...WITHOUT_COORDS, lat: 35.6672, lng: 139.7118 };

describe("coursePlanSchema", () => {
  it("좌표·순서가 갖춰진 코스를 통과시킨다", () => {
    const parsed = coursePlanSchema.safeParse({
      summary: "도보 위주 2일 코스",
      places: [ITEM, { ...ITEM, name: "시부야 스카이", day: 2, order: 1 }],
    });
    expect(parsed.success).toBe(true);
  });

  it("★ 좌표가 없는 항목이 있으면 코스 전체를 거부한다", () => {
    expect(
      coursePlanSchema.safeParse({
        summary: "s",
        places: [{ ...WITHOUT_COORDS, lng: 139.7118 }],
      }).success,
    ).toBe(false);

    expect(
      coursePlanSchema.safeParse({
        summary: "s",
        places: [{ ...WITHOUT_COORDS, lat: 35.6672 }],
      }).success,
    ).toBe(false);

    expect(
      coursePlanSchema.safeParse({ summary: "s", places: [WITHOUT_COORDS] })
        .success,
    ).toBe(false);
  });

  it("★ 좌표가 숫자가 아니면 거부한다(문자열 위장 차단)", () => {
    expect(
      coursePlanSchema.safeParse({
        summary: "s",
        places: [{ ...ITEM, lat: "35.6672" }],
      }).success,
    ).toBe(false);
  });

  it("googlePlaceId 는 null 을 허용한다(Places 가 id 를 안 준 경우)", () => {
    expect(
      coursePlanSchema.safeParse({
        summary: "s",
        places: [{ ...ITEM, googlePlaceId: null }],
      }).success,
    ).toBe(true);
  });

  it("계약 밖 카테고리는 거부한다(단일 출처 유지)", () => {
    expect(
      coursePlanSchema.safeParse({
        summary: "s",
        places: [{ ...ITEM, category: "casino" }],
      }).success,
    ).toBe(false);
  });

  it("Day·순서는 1 이상의 정수만", () => {
    expect(
      coursePlanSchema.safeParse({ summary: "s", places: [{ ...ITEM, day: 0 }] })
        .success,
    ).toBe(false);
    expect(
      coursePlanSchema.safeParse({
        summary: "s",
        places: [{ ...ITEM, order: 1.5 }],
      }).success,
    ).toBe(false);
  });

  it("빈 코스와 상한 초과를 거부한다(비용·적용 시간 상한)", () => {
    expect(coursePlanSchema.safeParse({ summary: "s", places: [] }).success).toBe(
      false,
    );
    const tooMany = Array.from({ length: MAX_COURSE_PLACES + 1 }, (_, i) => ({
      ...ITEM,
      order: i + 1,
    }));
    expect(
      coursePlanSchema.safeParse({ summary: "s", places: tooMany }).success,
    ).toBe(false);
  });
});
