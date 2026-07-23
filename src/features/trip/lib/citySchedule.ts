/**
 * 다중 도시 날짜 파생(순수, 설계 §1.3·§4) — 도시는 박수·순서만 저장, 날짜는 여기서 계산(단일 출처).
 * 부수효과 없음. 도시 1개면 전체 여행을 덮어 기존 단일 도시 UX 와 동일(하위호환).
 */

/** 도시 간 이동 수단(다중 도시 Phase 5, 설계 §11). */
export type TransferMode = "train" | "flight" | "bus" | "car" | "etc";

/**
 * "도착 이동"(다중 도시 Phase 5) — non-first 도시가 "그 도시로 어떻게 왔는가"를 담는다(additive, 모두 nullable).
 * trip_city 컬럼(arrival_*)과 1:1. 단일 도시/첫 도시엔 없음(하위호환).
 */
export interface CityArrival {
  mode: TransferMode | null;
  name: string | null;
  /** 'HH:MM' 출발/이동 시각. */
  time: string | null;
  durationMin: number | null;
}

/** trip_city 행(seq 순 정렬 전제 아님 — 셀렉터가 정렬). */
export interface TripCity {
  id: string;
  name: string;
  country: string | null;
  lat: number | null;
  lng: number | null;
  /** 박수. */
  nights: number;
  /** 여행 내 순서(0-based). */
  seq: number;
  /** 도착 이동(Phase 5) — 없으면 null 필드. */
  arrival?: CityArrival | null;
}

/** 도시별 파생 날짜 구간(startDate~endDate 포함, dayCount 일). */
export interface CitySegment {
  cityId: string;
  name: string;
  /** 'YYYY-MM-DD' 도시 시작일. */
  startDate: string;
  /** 'YYYY-MM-DD' 도시 마지막일(포함). */
  endDate: string;
  /** 이 도시가 차지하는 일수. */
  dayCount: number;
  seq: number;
  /** 도착 이동(Phase 5) — 이 도시(seq>0)로 온 이동. startDate 가 경계(이동)일. */
  arrival?: CityArrival | null;
}

/** 'YYYY-MM-DD' → UTC 자정 Date(타임존 영향 없이). */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysISO(iso: string, days: number): string {
  const base = parseDate(iso);
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * 도시 목록(seq 순) + 여행 시작일 → 도시별 날짜 구간.
 * 누적 규칙(§1.3): 각 도시가 nights 일을 차지하되 **마지막 도시는 +1일**(체크아웃/복귀일 포함)
 * → 마지막 도시 endDate = 여행 end_date, Σ 일수 = 총 박수 + 1 = 여행 총 일수. 겹침·공백 없음.
 * 도시 1개면 전체 여행을 덮는다(단일 도시 하위호환).
 */
export function citySchedule(cities: TripCity[], tripStart: string): CitySegment[] {
  const sorted = [...cities].sort((a, b) => a.seq - b.seq);
  const segments: CitySegment[] = [];
  let cursor = 0; // 시작일로부터의 day 오프셋
  for (let i = 0; i < sorted.length; i++) {
    const city = sorted[i];
    const isLast = i === sorted.length - 1;
    const dayCount = isLast ? city.nights + 1 : city.nights;
    const startDate = addDaysISO(tripStart, cursor);
    const endDate = addDaysISO(tripStart, cursor + dayCount - 1);
    segments.push({
      cityId: city.id,
      name: city.name,
      startDate,
      endDate,
      dayCount,
      seq: city.seq,
      arrival: city.arrival ?? null,
    });
    cursor += dayCount;
  }
  return segments;
}

/** 특정 날짜('YYYY-MM-DD')가 속한 도시 구간. 범위 밖이면 null. */
export function cityForDate(
  schedule: CitySegment[],
  date: string,
): CitySegment | null {
  return (
    schedule.find((s) => s.startDate <= date && date <= s.endDate) ?? null
  );
}
