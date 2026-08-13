"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  deriveDays,
  placesForDay,
  useRouteOptimize,
  type PlacesResponse,
} from "@/features/itinerary";
import {
  useAddPlaceToSchedule,
  useDeletePlace,
  useUpsertPlace,
} from "@/features/place";
import type { CategoryKey } from "@/lib/constants/category";

import { useAssistantStore } from "../store/assistantStore";
import type {
  CourseApplyResult,
  CoursePlace,
  CoursePlan,
  PlaceCard,
} from "../types";

/**
 * 어시스턴트 실행 훅 (설계 §5.2) — 추천 카드 저장/일정 배정, 코스 적용·되돌리기, 동선 최적화 연계.
 *
 * ★ 이 훅은 **새 뮤테이션을 만들지 않는다**. 기존 훅(`useUpsertPlace`·`useAddPlaceToSchedule`·
 *   `useDeletePlace`·`useRouteOptimize`)을 **조합만** 한다(CLAUDE.md §7.1 기존 시그니처 보호).
 *   덕분에 권한(RLS editor+)·낙관적 업데이트·무효화 키(`['places', tripId]`)가 이미 검증된
 *   경로를 그대로 탄다 — 04 플랜·05 일정표·06 장소·지도가 자동으로 갱신된다.
 *
 * ★ 쓰기의 주체는 **사용자**다. 모델에는 쓰기 도구가 없고(설계 §5.1), 여기 있는 함수들은
 *   전부 사용자가 버튼을 눌러야 실행된다.
 */

/**
 * 낙관적 캐시가 반영될 때까지 짧게 기다린다.
 *
 * 왜 필요한가: `assign` 은 그 날의 마지막 순서를 **캐시에서 읽어** `order_in_day` 를 정한다.
 * 여러 장소를 연속으로 배정하면 앞 배정이 캐시에 반영되기 전에 뒤 배정이 같은 순서를 계산해
 * 코스 순서가 뒤섞인다. 앞 배정이 캐시에 보이면 곧바로 진행하므로 실제 대기는 거의 0 이다.
 * (`assign` 은 void 반환이라 await 할 수 없다 — 시그니처를 바꾸지 않기 위한 선택이다.)
 */
const SETTLE_TICKS = 20;

/** 카테고리는 계약 enum 이 단일 출처 — 벗어난 값은 `etc` 로 떨어뜨린다(렌더·저장 모두 안전). */
function toCategoryKey(value: string): CategoryKey {
  const keys: CategoryKey[] = [
    "food",
    "cafe",
    "gift",
    "shopping",
    "museum",
    "hotel",
    "transport",
    "etc",
  ];
  return keys.find((k) => k === value) ?? "etc";
}

export function useAssistantActions(tripId: string) {
  const queryClient = useQueryClient();
  const upsert = useUpsertPlace(tripId);
  const schedule = useAddPlaceToSchedule(tripId);
  const deletePlace = useDeletePlace(tripId);
  const optimize = useRouteOptimize(tripId);

  // 적용 결과는 대화(zustand)에 남긴다 — 패널을 닫았다 열어도 중복 적용을 막고 되돌리기를 유지한다.
  const courseResults = useAssistantStore((s) => s.courseResults);
  const setCourseResult = useAssistantStore((s) => s.setCourseResult);
  const clearCourseResult = useAssistantStore((s) => s.clearCourseResult);

  /** 진행 중인 카드 액션 키(카드별 스피너·중복 클릭 차단). */
  const [busyCard, setBusyCard] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [undoing, setUndoing] = useState(false);
  /** 아직 최적화를 제안하지 않은 날짜 큐 — 하나씩 소진한다(적용 직후에만 노출). */
  const [optimizeQueue, setOptimizeQueue] = useState<string[]>([]);

  const placesKey = ["places", tripId];
  const readCache = useCallback(
    (): PlacesResponse | undefined =>
      queryClient.getQueryData<PlacesResponse>(placesKey),
    // placesKey 는 tripId 로만 결정된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, tripId],
  );

  const allIds = useCallback((): Set<string> => {
    const data = readCache();
    if (!data) return new Set<string>();
    return new Set(
      [...data.places, ...data.saved_places].map((p) => p.id),
    );
  }, [readCache]);

  /**
   * 서버 상태를 다시 읽는다 — 방금 생성한 행의 **id 를 알아내는 유일한 경로**다
   * (`useUpsertPlace` 는 id 를 돌려주지 않고, 그 시그니처는 바꾸지 않는다 §7.1).
   * `type: "all"` 로 관찰자가 없는 경우에도 확실히 갱신한다.
   */
  const refetchPlaces = useCallback(async (): Promise<void> => {
    await queryClient.refetchQueries({ queryKey: placesKey, type: "all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, tripId]);

  const waitForAssigned = useCallback(
    async (placeId: string): Promise<void> => {
      for (let i = 0; i < SETTLE_TICKS; i += 1) {
        if (readCache()?.places.some((p) => p.id === placeId)) return;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    },
    [readCache],
  );

  /**
   * 장소 1건 생성. `useUpsertPlace` 는 id 를 돌려주지 않으므로(시그니처 무변경 §7.1)
   * **생성 전후 id 차집합**으로 방금 만든 행을 찾는다. `google_place_id` → 이름 순으로 대조해
   * 실시간으로 다른 멤버가 추가한 행을 잘못 집는 것을 막는다(못 찾으면 null 을 돌려주고 넘어간다).
   */
  const createPlace = useCallback(
    async (input: {
      name: string;
      category: string;
      lat: number;
      lng: number;
      googlePlaceId: string | null;
      address?: string;
    }): Promise<void> => {
      await upsert.mutateAsync({
        name: input.name,
        address: input.address ?? "",
        category: toCategoryKey(input.category),
        folderId: null,
        memo: "",
        lat: input.lat,
        lng: input.lng,
        googlePlaceId: input.googlePlaceId,
      });
    },
    [upsert],
  );

  /** 차집합에서 이 항목에 해당하는 행을 찾아 소비한다(중복 매칭 방지). */
  const takeCreatedId = useCallback(
    (
      pool: PlacesResponse["places"],
      item: { name: string; googlePlaceId: string | null },
    ): string | null => {
      const index = pool.findIndex((p) =>
        item.googlePlaceId
          ? p.google_place_id === item.googlePlaceId
          : p.name === item.name,
      );
      if (index === -1) return null;
      const [row] = pool.splice(index, 1);
      return row.id;
    },
    [],
  );

  /** 추천 카드 "저장" — 일정 배정 없이 보관함에만 추가한다. */
  const savePlace = useCallback(
    async (card: PlaceCard): Promise<boolean> => {
      setBusyCard(card.googlePlaceId);
      try {
        await createPlace(card);
        return true;
      } catch {
        return false;
      } finally {
        setBusyCard(null);
      }
    },
    [createPlace],
  );

  /** 추천 카드 "+ 일정에" — 저장한 뒤 그 Day 말미에 배정한다. */
  const addToSchedule = useCallback(
    async (card: PlaceCard, day: number): Promise<boolean> => {
      setBusyCard(card.googlePlaceId);
      try {
        const before = allIds();
        await createPlace(card);
        await refetchPlaces();
        const data = readCache();
        const pool = [
          ...(data?.places ?? []),
          ...(data?.saved_places ?? []),
        ].filter((p) => !before.has(p.id));
        const id = takeCreatedId(pool, card);
        if (!id) return false;
        schedule.assign(id, day);
        await waitForAssigned(id);
        return true;
      } catch {
        return false;
      } finally {
        setBusyCard(null);
      }
    },
    [
      allIds,
      createPlace,
      readCache,
      refetchPlaces,
      schedule,
      takeCreatedId,
      waitForAssigned,
    ],
  );

  /**
   * 코스 적용 (설계 §5.2 시퀀스) — 항목마다 `생성 → 배정`.
   * 실패해도 **전체 롤백하지 않는다**. 성공분은 남기고 건수를 알린 뒤, 되돌리기는 사용자가 고른다(§7).
   */
  const applyCourse = useCallback(
    async (messageId: string, course: CoursePlan): Promise<CourseApplyResult> => {
      setApplying(true);
      try {
        const data = readCache();
        const days = data
          ? deriveDays(data.trip.start_date, data.trip.end_date)
          : [];
        // 여행 기간을 벗어난 Day 는 배정할 날짜가 없다 — 시작 전에 걸러낸다.
        const items: CoursePlace[] = [...course.places]
          .filter((p) => p.day >= 1 && p.day <= days.length)
          .sort((a, b) => a.day - b.day || a.order - b.order);

        const before = allIds();
        const created: CoursePlace[] = [];
        for (const item of items) {
          try {
            await createPlace(item);
            created.push(item);
          } catch {
            // 개별 실패는 건너뛰고 계속한다(부분 성공 유지).
          }
        }

        // 생성분을 한 번에 다시 읽어 id 를 확보한다(항목마다 왕복하지 않는다).
        await refetchPlaces();
        const fresh = readCache();
        const pool = [
          ...(fresh?.places ?? []),
          ...(fresh?.saved_places ?? []),
        ].filter((p) => !before.has(p.id));

        const createdIds: string[] = [];
        const dates = new Set<string>();
        for (const item of created) {
          const id = takeCreatedId(pool, item);
          if (!id) continue; // 생성은 됐지만 대조 실패 — 배정·되돌리기 대상에서 제외.
          createdIds.push(id);
          schedule.assign(id, item.day);
          // 앞 배정이 캐시에 반영된 뒤 다음으로 — 코스 순서가 그대로 order_in_day 가 된다.
          await waitForAssigned(id);
          const date = days[item.day - 1]?.date;
          if (date) dates.add(date);
        }

        const applied: CourseApplyResult = {
          total: course.places.length,
          applied: createdIds.length,
          createdIds,
          dates: [...dates].sort(),
        };
        setCourseResult(messageId, applied);
        setOptimizeQueue(applied.dates);
        return applied;
      } finally {
        setApplying(false);
      }
    },
    [
      allIds,
      createPlace,
      readCache,
      refetchPlaces,
      schedule,
      setCourseResult,
      takeCreatedId,
      waitForAssigned,
    ],
  );

  /**
   * 되돌리기 (설계 §5.2-6) — 이번 적용으로 **생성된 행만** 삭제한다.
   * 원래 있던 장소는 건드리지 않는다(스냅샷에 없으므로 구조적으로 불가능).
   */
  const undoCourse = useCallback(
    async (messageId: string): Promise<void> => {
      const applied = useAssistantStore.getState().courseResults[messageId];
      if (!applied) return;
      setUndoing(true);
      try {
        for (const id of applied.createdIds) {
          try {
            await deletePlace.mutateAsync(id);
          } catch {
            // 일부 삭제 실패는 무시 — 남은 것만 계속 지운다.
          }
        }
        clearCourseResult(messageId);
        setOptimizeQueue([]);
      } finally {
        setUndoing(false);
      }
    },
    [clearCourseResult, deletePlace],
  );

  /** 이 답변의 코스가 이미 적용됐는지(중복 적용 차단 + 되돌리기 노출 근거). */
  const resultFor = useCallback(
    (messageId: string): CourseApplyResult | null =>
      courseResults[messageId] ?? null,
    [courseResults],
  );

  /**
   * 동선 최적화 연계 (설계 §5.2-7) — 적용한 날짜를 **기존 16번 훅**에 넘긴다.
   * 계산·저장은 전부 `useRouteOptimize` 안에서 일어난다(신규 알고리즘 없음).
   */
  const optimizeDate = optimizeQueue[0] ?? null;

  const runOptimize = useCallback(async (): Promise<void> => {
    if (!optimizeDate) return;
    const data = readCache();
    if (!data) return;
    await optimize.runPreview(optimizeDate, placesForDay(data.places, optimizeDate));
  }, [optimize, optimizeDate, readCache]);

  const applyOptimize = useCallback((): void => {
    optimize.apply();
    setOptimizeQueue((q) => q.slice(1));
  }, [optimize]);

  const cancelOptimize = useCallback((): void => {
    optimize.cancel();
    setOptimizeQueue((q) => q.slice(1));
  }, [optimize]);

  return {
    savePlace,
    addToSchedule,
    applyCourse,
    undoCourse,
    resultFor,
    busyCard,
    applying,
    undoing,
    /** 최적화 제안 대상 날짜(없으면 버튼 미노출). */
    optimizeDate,
    optimizePreview: optimize.preview,
    isPreviewing: optimize.isPreviewing,
    runOptimize,
    applyOptimize,
    cancelOptimize,
  };
}

/** 패널이 한 번 만들어 카드·코스 블록에 내려주는 액션 묶음(인스턴스 1개 유지). */
export type AssistantActions = ReturnType<typeof useAssistantActions>;
