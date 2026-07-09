import { describe, expect, it } from "vitest";

import { faces, faceLabel, type PamphletSections } from "./faces";

const ALL: PamphletSections = { cover: true, schedule: true, prep: true, intro: true, qr: true };

describe("faces (섹션 → 면 매핑)", () => {
  it("전체 활성 + 3일: 앞[표지·Day1·Day2] / 뒤[Day3·준비물·소개·QR]", () => {
    const { front, back } = faces(ALL, 3);
    expect(front).toEqual([{ k: "cover" }, { k: "day", dayIndex: 0 }, { k: "day", dayIndex: 1 }]);
    expect(back).toEqual([
      { k: "day", dayIndex: 2 },
      { k: "prep" },
      { k: "intro" },
      { k: "qr" },
    ]);
  });

  it("표지 off: 앞에서 표지 제외", () => {
    const { front } = faces({ ...ALL, cover: false }, 2);
    expect(front).toEqual([{ k: "day", dayIndex: 0 }, { k: "day", dayIndex: 1 }]);
  });

  it("일정 off: Day 패널 전부 제외", () => {
    const { front, back } = faces({ ...ALL, schedule: false }, 3);
    expect(front).toEqual([{ k: "cover" }]);
    expect(back).toEqual([{ k: "prep" }, { k: "intro" }, { k: "qr" }]);
  });

  it("1일: 앞[표지·Day1], 뒤엔 Day 없음", () => {
    const { front, back } = faces(ALL, 1);
    expect(front).toEqual([{ k: "cover" }, { k: "day", dayIndex: 0 }]);
    expect(back.some((c) => c.k === "day")).toBe(false);
  });

  it("일정 0일: 표지 + 뒷면 섹션만", () => {
    const { front, back } = faces(ALL, 0);
    expect(front).toEqual([{ k: "cover" }]);
    expect(back).toEqual([{ k: "prep" }, { k: "intro" }, { k: "qr" }]);
  });

  it("faceLabel: 셀별 라벨", () => {
    const labels = ["DAY 1", "DAY 2", "DAY 3"];
    expect(faceLabel({ k: "cover" }, labels)).toBe("표지");
    expect(faceLabel({ k: "day", dayIndex: 2 }, labels)).toBe("Day 3 일정");
    expect(faceLabel({ k: "qr" }, labels)).toBe("QR · 함께 편집");
  });
});
