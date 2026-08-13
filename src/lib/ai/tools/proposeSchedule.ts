import { tool } from "ai";
import { z } from "zod";

import {
  coursePlanSchema,
  MAX_COURSE_PLACES,
} from "@/features/assistant/lib/assistantSchema";
import type { CoursePlan } from "@/features/assistant/types";

import type { PlaceCandidate } from "../places";

/**
 * `proposeSchedule` 도구 (설계 §5.1) — **부작용 없음. 제안만 한다.**
 *
 * 모델에게 쓰기 도구를 주지 않는다는 결정(설계 §5.1)의 실체가 이 도구다. 모델은 "어떤 장소를
 * 몇째 날 몇 번째로 두면 좋은지"까지만 말하고, 실제 `place` 행 생성·배정은 사용자가 "코스 적용"을
 * 눌렀을 때 **클라이언트의 기존 뮤테이션**이 수행한다(`useAssistantActions`).
 *
 * ★ grounding 2중 방어의 서버측(설계 §4):
 *   좌표를 **모델에게 받지 않는다**. 모델은 이름만 대고, 좌표·주소·place_id 는
 *   같은 요청에서 `searchPlaces` 가 Places 로 실존을 확인한 후보(`grounded`)에서만 채워진다.
 *   화이트리스트에 없는 이름은 조용히 **탈락**한다 — 지어낸 장소가 일정에 들어갈 경로가 없다.
 */

/** 모델이 채우는 항목 — 좌표·주소는 요구하지 않는다(지어낼 여지를 주지 않는다). */
const itemSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .describe("searchPlaces 로 확인된 장소의 이름. 검색되지 않은 이름은 제외된다."),
  day: z.number().int().min(1).describe("1-based Day 번호."),
  order: z.number().int().min(1).describe("그 Day 안에서의 방문 순서(1부터)."),
  reason: z
    .string()
    .max(120)
    .describe("이 장소를 그 자리에 둔 이유 한 줄."),
});

const inputSchema = z.object({
  summary: z.string().max(200).describe("코스 한 줄 요약. 예: '도보 위주 2일 코스'"),
  items: z.array(itemSchema).min(1).max(MAX_COURSE_PLACES),
});

/** 도구가 모델에게 돌려주는 결과 — 무엇이 채택·탈락했는지 알려 다음 발화를 교정시킨다. */
export interface ProposeScheduleOutput {
  accepted: number;
  /** 화이트리스트에 없거나 기간을 벗어나 제외된 이름들. */
  dropped: string[];
}

/** 이름 비교용 정규화 — 공백·대소문자 차이로 매칭이 깨지지 않게 한다. */
function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

/**
 * 모델이 댄 이름 → grounding 통과 후보. 정확 일치 우선, 없으면 포함 관계로 완화한다
 * ("시부야 스카이" ↔ "Shibuya Sky 전망대" 처럼 모델이 수식어를 덧붙이는 경우).
 */
function resolve(
  name: string,
  grounded: PlaceCandidate[],
): PlaceCandidate | undefined {
  const target = normalize(name);
  return (
    grounded.find((g) => normalize(g.name) === target) ??
    grounded.find(
      (g) =>
        normalize(g.name).includes(target) || target.includes(normalize(g.name)),
    )
  );
}

/**
 * 요청 단위 도구 인스턴스. `grounded` 는 같은 요청의 `searchPlaces` 가 채우는 **살아있는 배열**이라
 * (도구 호출 순서상 검색이 먼저 일어난다) 참조로 넘긴다.
 *
 * @param grounded Places 가 실존을 확인해준 후보 목록(카드 화이트리스트와 동일 출처)
 * @param dayCount 여행 일수 — 기간을 벗어난 Day 제안은 적용 시 조용히 무시되므로 여기서 걸러낸다
 */
export function createProposeScheduleTool(
  grounded: PlaceCandidate[],
  dayCount: number,
) {
  let proposed: CoursePlan | null = null;

  const proposeScheduleTool = tool({
    description:
      "Day 별 방문 순서가 있는 코스를 제안한다. 부작용 없음 — 실제 일정 반영은 사용자가 화면에서 직접 승인한다. " +
      "여기 넣는 장소는 반드시 searchPlaces 로 먼저 확인한 것이어야 한다.",
    inputSchema,
    execute: ({ summary, items }): ProposeScheduleOutput => {
      const dropped: string[] = [];
      const places: CoursePlan["places"] = [];

      for (const item of items) {
        const match = item.day <= dayCount ? resolve(item.name, grounded) : undefined;
        if (!match) {
          dropped.push(item.name);
          continue;
        }
        places.push({
          // 이름·좌표·카테고리는 **Places 결과**를 쓴다(모델 입력 아님).
          name: match.name,
          category: match.category,
          lat: match.lat,
          lng: match.lng,
          googlePlaceId: match.googlePlaceId,
          address: match.address,
          day: item.day,
          order: item.order,
          reason: item.reason,
        });
      }

      // 최종 형태는 공유 스키마로 확정한다 — 여기를 통과한 것만 클라로 나간다(설계 §6.3).
      const parsed = coursePlanSchema.safeParse({ summary, places });
      proposed = parsed.success ? parsed.data : null;

      return { accepted: parsed.success ? places.length : 0, dropped };
    },
  });

  return {
    tools: { proposeSchedule: proposeScheduleTool },
    /** 마지막으로 확정된 코스 제안(없으면 null) — 라우트가 스트림 프레임으로 내보낸다. */
    get proposal(): CoursePlan | null {
      return proposed;
    },
  };
}
