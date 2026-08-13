import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLAN_FIXTURE } from "@/features/itinerary";
import type { PlaceDto, PlacesResponse } from "@/features/itinerary";
import { renderHookWithClient } from "@/test/utils";

import { useAssistantStore } from "../store/assistantStore";

import type { CoursePlan, PlaceCard } from "../types";

/**
 * 어시스턴트 실행 훅 (설계 §5.2). 검증 축:
 *  ① 기존 뮤테이션을 **정확한 payload** 로 부르는가(§7.1 조합만)
 *  ② 코스 적용이 `생성 → Day 배정` 순서와 코스 순서를 지키는가
 *  ③ **부분 실패** 시 성공분을 남기고 건수를 알리는가
 *  ④ **되돌리기**가 이번에 만든 행만 지우는가
 *
 * ★ 모킹은 배럴(`@/features/place`)이 아니라 **리프 모듈** 기준이다 — 배럴을 모킹하면
 *   같은 배럴의 다른 export 까지 통째로 날아가 원인 파악이 어려워진다(프로젝트 기존 함정).
 */

const TRIP = "11111111-1111-4111-8111-111111111111";
/** 코스가 딸린 답변 id — 적용 결과가 이 id 로 기록된다. */
const MSG = "a_1";

const upsert = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
const remove = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
const scheduleApi = vi.hoisted(() => ({ assign: vi.fn(), unassign: vi.fn() }));

vi.mock("@/features/place/api/useUpsertPlace", () => ({
  useUpsertPlace: () => upsert,
  useDeletePlace: () => remove,
  useMovePlaceCity: () => ({ mutate: vi.fn() }),
  useAutosaveMemo: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/features/place/api/useAddPlaceToSchedule", () => ({
  useAddPlaceToSchedule: () => scheduleApi,
}));

import { useAssistantActions } from "./useAssistantActions";

const CARD: PlaceCard = {
  name: "블루보틀 아오야마",
  address: "도쿄도 미나토구 미나미아오야마",
  lat: 35.6672,
  lng: 139.7118,
  googlePlaceId: "ChIJ_blue",
  category: "cafe",
};

function coursePlace(name: string, id: string, day: number, order: number) {
  return {
    name,
    category: "cafe",
    lat: 35.6,
    lng: 139.7,
    googlePlaceId: id,
    address: `${name} 주소`,
    day,
    order,
    reason: "이유",
  };
}

const COURSE: CoursePlan = {
  summary: "도보 위주 2일 코스",
  places: [
    coursePlace("첫째날 A", "p1", 1, 1),
    coursePlace("첫째날 B", "p2", 1, 2),
    coursePlace("둘째날 C", "p3", 2, 1),
  ],
};

/** fixture 를 얕은 복사해 테스트마다 독립적인 캐시를 만든다. */
function baseData(): PlacesResponse {
  return {
    ...PLAN_FIXTURE,
    places: [...PLAN_FIXTURE.places],
    saved_places: [...PLAN_FIXTURE.saved_places],
  };
}

function newRow(input: {
  name: string;
  googlePlaceId?: string | null;
  lat?: number | null;
  lng?: number | null;
}): PlaceDto {
  return {
    id: `new_${input.googlePlaceId ?? input.name}`,
    name: input.name,
    category: "cafe",
    area: null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    google_place_id: input.googlePlaceId ?? null,
    memo: null,
    saved_by: null,
    scheduled_date: null,
    order_in_day: null,
    start_time: null,
    duration_min: null,
    scheduled_by: null,
    folder_id: null,
    city_id: null,
  };
}

function setup() {
  const rendered = renderHookWithClient(() => useAssistantActions(TRIP));
  const { client } = rendered;
  client.setQueryData(["places", TRIP], baseData());

  const read = (): PlacesResponse =>
    client.getQueryData<PlacesResponse>(["places", TRIP]) as PlacesResponse;

  // 서버 insert 시뮬레이션 — 캐시에 미배정(saved) 행이 하나 생긴다.
  upsert.mutateAsync.mockImplementation((input: Parameters<typeof newRow>[0]) => {
    const data = read();
    client.setQueryData(["places", TRIP], {
      ...data,
      saved_places: [...data.saved_places, newRow(input)],
    });
    return Promise.resolve(input);
  });

  // 배정 시뮬레이션 — 낙관적 업데이트와 동일하게 saved → places 로 옮긴다.
  scheduleApi.assign.mockImplementation((placeId: string, day: number) => {
    const data = read();
    const target = data.saved_places.find((p) => p.id === placeId);
    if (!target) return;
    const date = `2026-04-${String(17 + day).padStart(2, "0")}`;
    const maxOrder = data.places
      .filter((p) => p.scheduled_date === date)
      .reduce((m, p) => Math.max(m, p.order_in_day ?? 0), 0);
    client.setQueryData(["places", TRIP], {
      ...data,
      places: [
        ...data.places,
        { ...target, scheduled_date: date, order_in_day: maxOrder + 1 },
      ],
      saved_places: data.saved_places.filter((p) => p.id !== placeId),
    });
  });

  remove.mutateAsync.mockResolvedValue(undefined);
  return { ...rendered, read };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAssistantStore.getState().reset();
});

describe("추천 카드 액션", () => {
  it("★ '저장' 은 카드 값 그대로 useUpsertPlace 를 부른다(폴더 없음·일정 배정 없음)", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.savePlace(CARD);
    });

    expect(upsert.mutateAsync).toHaveBeenCalledTimes(1);
    expect(upsert.mutateAsync).toHaveBeenCalledWith({
      name: "블루보틀 아오야마",
      address: "도쿄도 미나토구 미나미아오야마",
      category: "cafe",
      folderId: null,
      memo: "",
      lat: 35.6672,
      lng: 139.7118,
      googlePlaceId: "ChIJ_blue",
    });
    // 저장만 — 일정에는 손대지 않는다.
    expect(scheduleApi.assign).not.toHaveBeenCalled();
  });

  it("★ '+ 일정에' 는 생성한 place id 로 해당 Day 에 배정한다", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.addToSchedule(CARD, 2);
    });

    expect(upsert.mutateAsync).toHaveBeenCalledTimes(1);
    expect(scheduleApi.assign).toHaveBeenCalledWith("new_ChIJ_blue", 2);
  });

  it("저장 실패는 false 를 돌려주고 진행 상태를 푼다", async () => {
    const { result } = setup();
    upsert.mutateAsync.mockRejectedValueOnce(new Error("실패"));

    let ok = true;
    await act(async () => {
      ok = await result.current.savePlace(CARD);
    });

    expect(ok).toBe(false);
    expect(result.current.busyCard).toBeNull();
  });
});

describe("코스 적용 (설계 §5.2)", () => {
  it("★ 항목마다 생성 → 배정을 코스 순서대로 수행한다", async () => {
    const { result, read } = setup();

    await act(async () => {
      await result.current.applyCourse(MSG, COURSE);
    });

    expect(upsert.mutateAsync).toHaveBeenCalledTimes(3);
    expect(scheduleApi.assign.mock.calls).toEqual([
      ["new_p1", 1],
      ["new_p2", 1],
      ["new_p3", 2],
    ]);

    // ★ 같은 Day 에 연속 배정해도 순서가 겹치지 않는다 — 그 날 말미에 **코스 순서대로** 붙는다.
    //   (앞 배정이 캐시에 반영된 뒤 다음을 부르기 때문. 겹치면 일정 카드 순서가 뒤섞인다.)
    const day1 = read().places.filter((p) => p.scheduled_date === "2026-04-18");
    const added = day1.filter((p) => p.id.startsWith("new_"));
    const existingMax = Math.max(
      ...day1.filter((p) => !p.id.startsWith("new_")).map((p) => p.order_in_day ?? 0),
    );
    expect(added.map((p) => [p.id, p.order_in_day])).toEqual([
      ["new_p1", existingMax + 1],
      ["new_p2", existingMax + 2],
    ]);
  });

  it("★ 좌표·카테고리를 그대로 실은 payload 로 생성한다", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.applyCourse(MSG, COURSE);
    });

    expect(upsert.mutateAsync).toHaveBeenNthCalledWith(1, {
      name: "첫째날 A",
      address: "첫째날 A 주소",
      category: "cafe",
      folderId: null,
      memo: "",
      lat: 35.6,
      lng: 139.7,
      googlePlaceId: "p1",
    });
  });

  it("★ 부분 실패: 성공분은 유지하고 'N곳 중 M곳' 을 알린다", async () => {
    const { result } = setup();
    // 두 번째 항목만 실패시킨다.
    const ok = upsert.mutateAsync.getMockImplementation();
    upsert.mutateAsync.mockImplementation((input: { name: string }) =>
      input.name === "첫째날 B"
        ? Promise.reject(new Error("실패"))
        : ok?.(input),
    );

    let applied: Awaited<ReturnType<typeof result.current.applyCourse>> | null =
      null;
    await act(async () => {
      applied = await result.current.applyCourse(MSG, COURSE);
    });

    expect(applied).toMatchObject({ total: 3, applied: 2 });
    // 실패분은 배정되지 않고, 성공분은 그대로 남는다(전체 롤백 없음).
    expect(scheduleApi.assign.mock.calls).toEqual([
      ["new_p1", 1],
      ["new_p3", 2],
    ]);
  });

  it("여행 기간을 벗어난 Day 는 적용하지 않는다", async () => {
    const { result } = setup();
    // fixture 는 2026-04-18~21 (4일).
    const outOfRange: CoursePlan = {
      summary: "s",
      places: [coursePlace("범위 밖", "p9", 9, 1)],
    };

    let applied: Awaited<ReturnType<typeof result.current.applyCourse>> | null =
      null;
    await act(async () => {
      applied = await result.current.applyCourse(MSG, outOfRange);
    });

    expect(upsert.mutateAsync).not.toHaveBeenCalled();
    expect(applied).toMatchObject({ applied: 0 });
  });
});

describe("되돌리기 (설계 §5.2-6)", () => {
  it("★ 이번 적용으로 생성된 행만 삭제한다", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.applyCourse(MSG, COURSE);
    });
    await waitFor(() => expect(result.current.resultFor(MSG)).not.toBeNull());

    await act(async () => {
      await result.current.undoCourse(MSG);
    });

    expect(remove.mutateAsync.mock.calls.map(([id]) => id)).toEqual([
      "new_p1",
      "new_p2",
      "new_p3",
    ]);
    // 원래 있던 fixture 장소는 대상이 아니다.
    const touched = remove.mutateAsync.mock.calls.map(([id]) => id as string);
    expect(touched.some((id) => !id.startsWith("new_"))).toBe(false);
  });

  it("되돌린 뒤에는 결과 안내가 사라진다", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.applyCourse(MSG, COURSE);
    });
    await act(async () => {
      await result.current.undoCourse(MSG);
    });

    expect(result.current.resultFor(MSG)).toBeNull();
    expect(result.current.optimizeDate).toBeNull();
  });
});

describe("동선 최적화 연계 (설계 §5.2-7)", () => {
  it("적용한 날짜가 최적화 대상 큐에 오름차순으로 들어간다", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.applyCourse(MSG, COURSE);
    });

    expect(result.current.resultFor(MSG)?.dates).toEqual(["2026-04-18", "2026-04-19"]);
    expect(result.current.optimizeDate).toBe("2026-04-18");
  });

  it("적용 전에는 최적화 대상이 없다", () => {
    const { result } = setup();
    expect(result.current.optimizeDate).toBeNull();
  });
});

describe("중복 적용 방지", () => {
  it("★ 적용 결과가 답변 id 로 남는다 — 패널을 닫았다 열어도 다시 적용되지 않는다", async () => {
    const { result, unmount } = setup();

    await act(async () => {
      await result.current.applyCourse(MSG, COURSE);
    });
    expect(result.current.resultFor(MSG)).toMatchObject({ applied: 3 });

    // 패널을 닫았다 여는 것 = 훅 인스턴스가 새로 생기는 것.
    unmount();
    const reopened = setup();
    expect(reopened.result.current.resultFor(MSG)).toMatchObject({
      applied: 3,
      createdIds: ["new_p1", "new_p2", "new_p3"],
    });
    // 다른 답변의 코스는 영향을 받지 않는다.
    expect(reopened.result.current.resultFor("a_2")).toBeNull();
  });
});
