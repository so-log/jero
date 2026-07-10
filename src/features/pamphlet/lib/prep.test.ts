import { describe, expect, it } from "vitest";

import { DEFAULT_PREP, decodePrep, encodePrep, type PrepItem } from "./prep";

describe("prep encode/decode (인쇄 반영, §13)", () => {
  it("편집된 준비물을 round-trip 보존한다(라벨·on·추가 항목)", () => {
    const edited: PrepItem[] = [
      { label: "여권 · 신분증", on: false }, // 기본 on → off 로 편집
      { label: "우산 / 양산", on: true }, // off → on
      { label: "카메라 삼각대", on: true }, // 사용자 추가
    ];
    const decoded = decodePrep(encodePrep(edited));
    expect(decoded).toEqual(edited);
  });

  it("빈 값/누락이면 기본 목록으로 폴백한다", () => {
    expect(decodePrep(undefined)).toEqual(DEFAULT_PREP);
    expect(decodePrep("")).toEqual(DEFAULT_PREP);
  });

  it("형식 불량(비 JSON·배열 아님·필드 누락)이면 기본 목록으로 폴백한다", () => {
    expect(decodePrep("not-json")).toEqual(DEFAULT_PREP);
    expect(decodePrep('{"label":"x"}')).toEqual(DEFAULT_PREP);
    expect(decodePrep('[{"label":"x"}]')).toEqual(DEFAULT_PREP); // on 없음 → 항목 제외 → 폴백
  });

  it("불량 항목은 버리고 정상 항목만 유지한다", () => {
    const raw = JSON.stringify([
      { label: "여권", on: true },
      { label: 123, on: true }, // label 타입 불량 → 제외
      { label: "카드", on: "yes" }, // on 타입 불량 → 제외
    ]);
    expect(decodePrep(raw)).toEqual([{ label: "여권", on: true }]);
  });

  it("배열은 첫 요소를 사용한다(URLSearchParams 중복 방어)", () => {
    const s = encodePrep([{ label: "여권", on: true }]);
    expect(decodePrep([s, "other"])).toEqual([{ label: "여권", on: true }]);
  });
});
