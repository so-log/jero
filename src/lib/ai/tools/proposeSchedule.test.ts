/**
 * @vitest-environment node
 *
 * proposeSchedule 도구 (설계 §5.1·§5.2). 검증 축 3가지:
 *  ① **부작용 없음** — 제안만 만든다(쓰기 경로 자체가 없다)
 *  ② **grounding** — 좌표·이름은 Places 화이트리스트에서만 온다. 모델이 댄 이름이 거기 없으면 탈락
 *  ③ **기간 방어** — 여행 일수를 벗어난 Day 는 배정할 날짜가 없으므로 여기서 걸러진다
 */
import { describe, expect, it } from "vitest";

import type { PlaceCandidate } from "../places";
import {
  createProposeScheduleTool,
  type ProposeScheduleOutput,
} from "./proposeSchedule";

function candidate(name: string, id: string): PlaceCandidate {
  return {
    name,
    address: `${name} 주소`,
    lat: 35.6,
    lng: 139.7,
    googlePlaceId: id,
    category: "cafe",
  };
}

type Item = {
  name: string;
  day: number;
  order: number;
  reason: string;
};

async function run(
  toolset: ReturnType<typeof createProposeScheduleTool>,
  summary: string,
  items: Item[],
): Promise<ProposeScheduleOutput> {
  const execute = toolset.tools.proposeSchedule.execute;
  if (!execute) throw new Error("execute 없음");
  const out = await execute(
    { summary, items },
    { toolCallId: "t", messages: [], context: {} },
  );
  // AI SDK 의 execute 반환은 "값 | 스트림" 유니온이라 좁혀 쓴다(이 도구는 값만 돌려준다).
  if (Symbol.asyncIterator in out) throw new Error("스트리밍 결과가 아닙니다");
  return out;
}

describe("createProposeScheduleTool", () => {
  it("grounding 된 장소로 코스를 만든다 — 좌표는 Places 결과에서 온다", async () => {
    const grounded = [candidate("블루보틀 아오야마", "p1")];
    const tool = createProposeScheduleTool(grounded, 4);

    const out = await run(tool, "도보 코스", [
      { name: "블루보틀 아오야마", day: 1, order: 1, reason: "오전에 좋아요" },
    ]);

    expect(out).toEqual({ accepted: 1, dropped: [] });
    expect(tool.proposal).toEqual({
      summary: "도보 코스",
      places: [
        {
          name: "블루보틀 아오야마",
          category: "cafe",
          lat: 35.6,
          lng: 139.7,
          googlePlaceId: "p1",
          address: "블루보틀 아오야마 주소",
          day: 1,
          order: 1,
          reason: "오전에 좋아요",
        },
      ],
    });
  });

  it("★ 화이트리스트에 없는 이름은 탈락한다(환각 차단)", async () => {
    const tool = createProposeScheduleTool([candidate("실존 카페", "p1")], 4);

    const out = await run(tool, "코스", [
      { name: "실존 카페", day: 1, order: 1, reason: "a" },
      { name: "가상의 카페 ABC", day: 1, order: 2, reason: "b" },
    ]);

    expect(out).toEqual({ accepted: 1, dropped: ["가상의 카페 ABC"] });
    expect(tool.proposal?.places.map((p) => p.name)).toEqual(["실존 카페"]);
  });

  it("★ grounding 결과가 하나도 없으면 코스가 만들어지지 않는다", async () => {
    const tool = createProposeScheduleTool([], 4);

    const out = await run(tool, "코스", [
      { name: "아무 카페", day: 1, order: 1, reason: "a" },
    ]);

    expect(out).toEqual({ accepted: 0, dropped: ["아무 카페"] });
    // 스키마가 최소 1건을 요구하므로 제안 자체가 성립하지 않는다.
    expect(tool.proposal).toBeNull();
  });

  it("★ 여행 기간을 벗어난 Day 는 탈락한다", async () => {
    const tool = createProposeScheduleTool([candidate("카페", "p1")], 2);

    const out = await run(tool, "코스", [
      { name: "카페", day: 3, order: 1, reason: "a" },
    ]);

    expect(out.dropped).toEqual(["카페"]);
    expect(tool.proposal).toBeNull();
  });

  it("공백·대소문자·수식어 차이를 흡수해 매칭한다", async () => {
    const tool = createProposeScheduleTool([candidate("Shibuya Sky", "p9")], 3);

    const out = await run(tool, "코스", [
      { name: "shibuyasky", day: 1, order: 1, reason: "야경" },
    ]);

    expect(out.accepted).toBe(1);
    // 표시 이름은 모델이 쓴 문자열이 아니라 **Places 가 준 이름**이다.
    expect(tool.proposal?.places[0].name).toBe("Shibuya Sky");
    expect(tool.proposal?.places[0].googlePlaceId).toBe("p9");
  });

  it("여러 번 호출하면 마지막 제안이 남는다", async () => {
    const tool = createProposeScheduleTool(
      [candidate("A", "p1"), candidate("B", "p2")],
      3,
    );

    await run(tool, "첫 제안", [{ name: "A", day: 1, order: 1, reason: "a" }]);
    await run(tool, "고친 제안", [{ name: "B", day: 2, order: 1, reason: "b" }]);

    expect(tool.proposal?.summary).toBe("고친 제안");
    expect(tool.proposal?.places.map((p) => p.name)).toEqual(["B"]);
  });
});
