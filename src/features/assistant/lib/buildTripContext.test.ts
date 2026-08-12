import { describe, expect, it } from "vitest";

import type { TripContextInput } from "../types";
import { buildEvidenceChips, buildTripContext } from "./buildTripContext";

/**
 * 컨텍스트 조립 (설계 §3.4). 핵심 회귀: **전송 범위 최소화**(§6.5) — memo·이메일·금액 없음.
 */

function input(overrides: Partial<TripContextInput> = {}): TripContextInput {
  return {
    trip: {
      title: "도쿄, 우리끼리 4일",
      start_date: "2026-04-18",
      end_date: "2026-04-21",
      country: "일본",
      region: "도쿄",
    },
    cities: [],
    places: [
      {
        name: "츠키지 장외시장",
        category: "food",
        area: "츠키지",
        scheduled_date: "2026-04-18",
      },
      { name: "센소지", category: "museum", area: null, scheduled_date: null },
    ],
    similar: [],
    ...overrides,
  };
}

describe("buildTripContext", () => {
  it("여행 메타(제목·기간·지역)를 담는다", () => {
    const text = buildTripContext(input());
    expect(text).toContain("도쿄, 우리끼리 4일");
    expect(text).toContain("2026-04-18 ~ 2026-04-21");
    expect(text).toContain("일본 도쿄");
  });

  it("날짜별 일정 밀도를 요약한다(빈 Day 판단 근거)", () => {
    expect(buildTripContext(input())).toContain("2026-04-18: 1곳");
  });

  it("일정이 없으면 없다고 적는다", () => {
    const text = buildTripContext(
      input({
        places: [
          { name: "센소지", category: "museum", area: null, scheduled_date: null },
        ],
      }),
    );
    expect(text).toContain("아직 일정에 배정된 장소가 없음");
  });

  it("저장만 된 장소와 일정 장소를 구분해 표기한다", () => {
    const text = buildTripContext(input());
    expect(text).toContain("- 센소지 · museum [저장만]");
    expect(text).toContain("- 츠키지 장외시장 · food (츠키지) [2026-04-18]");
  });

  it("다중 도시일 때만 도시 축을 넣는다", () => {
    expect(buildTripContext(input())).not.toContain("도시:");
    const multi = buildTripContext(
      input({
        cities: [
          { name: "오사카", nights: 2, seq: 1 },
          { name: "도쿄", nights: 1, seq: 0 },
        ],
      }),
    );
    expect(multi).toContain("도시: 도쿄 1박 → 오사카 2박");
  });

  it("RAG 유사 장소를 별도 섹션으로 넣는다", () => {
    const text = buildTripContext(
      input({ similar: [{ content: "블루보틀 · cafe · 아오야마", similarity: 0.8 }] }),
    );
    expect(text).toContain("질문과 관련도가 높은 장소");
    expect(text).toContain("블루보틀 · cafe · 아오야마");
  });

  it("장소가 많으면 상위 일부만 노출한다(토큰 상한)", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      name: `장소${i}`,
      category: "etc",
      area: null,
      scheduled_date: null,
    }));
    const text = buildTripContext(input({ places: many }));
    expect(text).toContain("담은 장소 (60곳, 상위 40개 표시)");
    expect(text).not.toContain("장소45");
  });

  it("★ memo 는 타입에도 없고 출력에도 없다(계약 C2-b)", () => {
    const text = buildTripContext(input());
    // 컨텍스트에는 name·category·area·date 만 — 메모성 문자열이 끼어들 자리가 없다.
    expect(text).not.toContain("아침 스시");
    expect(text).not.toMatch(/memo/i);
  });
});

describe("buildEvidenceChips", () => {
  it("실제로 넣은 근거만 칩으로 만든다", () => {
    const chips = buildEvidenceChips(input());
    expect(chips.map((c) => c.label)).toEqual(["저장한 장소 2곳", "일정 1곳"]);
  });

  it("근거가 없으면 빈 배열(있는 척하지 않는다)", () => {
    expect(buildEvidenceChips(input({ places: [], cities: [], similar: [] }))).toEqual(
      [],
    );
  });

  it("RAG 결과가 있으면 관련 장소 칩이 붙는다", () => {
    const chips = buildEvidenceChips(
      input({ similar: [{ content: "x", similarity: 0.7 }] }),
    );
    expect(chips.some((c) => c.label === "관련 장소 1건")).toBe(true);
  });

  it("다중 도시일 때만 도시 칩", () => {
    const chips = buildEvidenceChips(
      input({
        cities: [
          { name: "도쿄", nights: 1, seq: 0 },
          { name: "오사카", nights: 2, seq: 1 },
        ],
      }),
    );
    expect(chips.some((c) => c.label === "도시 2곳")).toBe(true);
  });
});
