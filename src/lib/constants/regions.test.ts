import { describe, expect, it } from "vitest";

import { citiesForCountry, COUNTRIES } from "./regions";

describe("citiesForCountry (지역 콤보박스 제안)", () => {
  it("나라에 매칭되는 도시 목록을 반환한다", () => {
    expect(citiesForCountry("일본")).toContain("도쿄");
    expect(citiesForCountry("프랑스")).toContain("파리");
  });

  it("공백은 트림해 매칭한다", () => {
    expect(citiesForCountry(" 일본 ")).toContain("도쿄");
  });

  it("제안 없는/미입력 나라는 빈 배열(자유 입력 허용)", () => {
    expect(citiesForCountry("아무국가")).toEqual([]);
    expect(citiesForCountry(undefined)).toEqual([]);
    expect(citiesForCountry("")).toEqual([]);
  });

  it("주요 여행국이 목록에 포함된다", () => {
    expect(COUNTRIES).toContain("프랑스");
    expect(COUNTRIES).toContain("일본");
  });
});
