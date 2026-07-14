import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { COVER } from "@/lib/constants/covers";

import type { TripSummaryDto } from "../types";
import { TripCard } from "./TripCard";

/**
 * 02 여행 카드 커버 렌더(F3) — 프리셋 키·임의 hex·구버전 알 수 없는 값 모두 크래시 없이 렌더.
 * ★ /trips 목록에서 COVER[undefined] 크래시가 없어야 한다(resolver 경유).
 */
function makeTrip(cover_color: string): TripSummaryDto {
  return {
    id: "t1",
    title: "도쿄, 우리끼리 4일",
    cover_color,
    cover_icon: "building",
    start_date: "2026-08-01",
    end_date: "2026-08-04",
    my_role: "owner",
    member_avatars: [],
    place_count: 3,
    search_text: "도쿄",
  };
}

function coverBg(container: HTMLElement): string {
  const el = container.querySelector<HTMLElement>(".h-32");
  return el?.style.background ?? "";
}

/** jsdom 은 inline background 의 hex 를 rgb() 로 재직렬화 → 기대값도 같은 경로로 정규화해 비교. */
function normalize(bg: string): string {
  const d = document.createElement("div");
  d.style.background = bg;
  return d.style.background;
}

describe("TripCard 커버 렌더", () => {
  it("프리셋 키는 프리셋 그라데이션으로 렌더", () => {
    const { container } = render(<TripCard trip={makeTrip("mint")} todayISO="2026-07-14" />);
    expect(screen.getByText("도쿄, 우리끼리 4일")).toBeInTheDocument();
    expect(coverBg(container)).toBe(normalize(COVER.mint.gradient));
  });

  it("임의 hex 저장값도 크래시 없이 그 색으로 렌더", () => {
    const { container } = render(
      <TripCard trip={makeTrip("#FF8800")} todayISO="2026-07-14" />,
    );
    // #FF8800 → rgb(255, 136, 0)
    expect(coverBg(container)).toContain("255, 136, 0");
    expect(coverBg(container)).not.toBe(normalize(COVER.blue.gradient));
  });

  it("알 수 없는 구버전 값은 기본색으로 폴백(크래시 없음)", () => {
    const { container } = render(
      <TripCard trip={makeTrip("legacy-unknown")} todayISO="2026-07-14" />,
    );
    expect(coverBg(container)).toBe(normalize(COVER.blue.gradient));
  });
});
