import type { EvidenceChip, TripContextInput } from "../types";

/**
 * 여행 데이터 → LLM 컨텍스트 텍스트 (설계 §3.4). **순수 함수** — DOM·네트워크 무지.
 *
 * 전송 범위는 최소로 고정한다(§6.5): 장소명·카테고리·지역·날짜.
 * **`memo` 는 포함하지 않는다**(계약 C2-b) — 타입(`TripContextInput`)에 아예 없어서 실수로도 못 넣는다.
 * 멤버 이메일·프로필·예산/정산 금액도 전송 대상이 아니다.
 */

/** 컨텍스트 토큰 상한 관리용 — Day 요약·장소 목록 노출 개수(설계 §3.4 "상위 K"). */
const MAX_PLACES = 40;
const MAX_SIMILAR = 8;

function formatDayCounts(places: TripContextInput["places"]): string {
  const counts = new Map<string, number>();
  for (const p of places) {
    if (!p.scheduled_date) continue;
    counts.set(p.scheduled_date, (counts.get(p.scheduled_date) ?? 0) + 1);
  }
  if (counts.size === 0) return "아직 일정에 배정된 장소가 없음";
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, n]) => `${date}: ${n}곳`)
    .join(", ");
}

function formatPlace(p: TripContextInput["places"][number]): string {
  const where = p.area ? ` (${p.area})` : "";
  const when = p.scheduled_date ? ` [${p.scheduled_date}]` : " [저장만]";
  return `- ${p.name} · ${p.category}${where}${when}`;
}

/**
 * 시스템 프롬프트에 주입할 **데이터 블록 본문**을 만든다.
 * 이 문자열은 "지시"가 아니라 "자료"로 취급되어야 한다 — 감싸는 가드는 `systemPrompt.ts` 담당.
 */
export function buildTripContext(input: TripContextInput): string {
  const { trip, cities, places, similar } = input;

  const lines: string[] = [];

  const where = [trip.country, trip.region].filter(Boolean).join(" ");
  lines.push(`여행: ${trip.title}${where ? ` (${where})` : ""}`);
  lines.push(`기간: ${trip.start_date} ~ ${trip.end_date}`);

  if (cities.length > 1) {
    const ordered = [...cities].sort((a, b) => a.seq - b.seq);
    lines.push(
      `도시: ${ordered.map((c) => `${c.name} ${c.nights}박`).join(" → ")}`,
    );
  }

  lines.push(`날짜별 일정 밀도: ${formatDayCounts(places)}`);

  const shown = places.slice(0, MAX_PLACES);
  if (shown.length > 0) {
    lines.push("", `담은 장소 (${places.length}곳${places.length > shown.length ? `, 상위 ${shown.length}개 표시` : ""}):`);
    lines.push(...shown.map(formatPlace));
  } else {
    lines.push("", "담은 장소: 없음");
  }

  const related = similar.slice(0, MAX_SIMILAR);
  if (related.length > 0) {
    lines.push("", "질문과 관련도가 높은 장소:");
    lines.push(...related.map((s) => `- ${s.content}`));
  }

  return lines.join("\n");
}

/**
 * 답변에 붙일 "참고" 칩 — **실제로 컨텍스트에 넣은 것만** 나열한다(기획 §3 E).
 * 근거가 없으면 빈 배열이라 UI 에 칩이 뜨지 않는다(있는 척하지 않는다).
 */
export function buildEvidenceChips(input: TripContextInput): EvidenceChip[] {
  const chips: EvidenceChip[] = [];

  if (input.places.length > 0) {
    chips.push({ label: `저장한 장소 ${input.places.length}곳`, icon: "bookmark" });
  }
  const scheduled = input.places.filter((p) => p.scheduled_date).length;
  if (scheduled > 0) {
    chips.push({ label: `일정 ${scheduled}곳`, icon: "calendar" });
  }
  if (input.cities.length > 1) {
    chips.push({ label: `도시 ${input.cities.length}곳`, icon: "map-pin" });
  }
  if (input.similar.length > 0) {
    chips.push({ label: `관련 장소 ${input.similar.length}건`, icon: "route" });
  }
  return chips;
}
