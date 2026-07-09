"use client";

import { deriveDays, usePlacesQuery } from "@/features/itinerary";
import type { CategoryKey } from "@/lib/constants/category";
import { formatPeriod, nightsDays } from "@/lib/tripDate";

/**
 * 팜플렛 뷰모델(2차, 팜플렛_설계 §2·§9) — 기존 usePlacesQuery(trip+places) 재사용.
 * **신규 쿼리·마이그레이션 없음.** 일정 장소(scheduled)를 Day별로 묶고 표지 메타를 파생한다.
 * 컴포넌트 직접 fetch 금지(§7.1) — 이 훅 경유.
 */
export interface PamphletDayItem {
  /** 'HH:MM' | ''. */
  t: string;
  name: string;
  cat: CategoryKey;
  memo: string;
}
export interface PamphletDay {
  /** "DAY 2" 등 실제 Day 번호 라벨. */
  label: string;
  /** "7.18 금". */
  date: string;
  items: PamphletDayItem[];
}
export interface PamphletData {
  title: string;
  dates: string;
  nights: string;
  place: string;
  intro: string;
  highlights: string[];
  days: PamphletDay[];
  isEmpty: boolean;
  isLoading: boolean;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}.${d} ${wd}`;
}

export function usePamphletData(tripId: string): PamphletData {
  const { data, isLoading } = usePlacesQuery(tripId);

  if (!data) {
    return {
      title: "",
      dates: "",
      nights: "",
      place: "",
      intro: "",
      highlights: [],
      days: [],
      isEmpty: true,
      isLoading,
    };
  }

  const { trip, places } = data;
  const days: PamphletDay[] = deriveDays(trip.start_date, trip.end_date)
    .map((d, i) => {
      const items: PamphletDayItem[] = places
        .filter((p) => p.scheduled_date === d.date)
        .sort((a, b) => (a.order_in_day ?? 0) - (b.order_in_day ?? 0))
        .map((p) => ({
          t: p.start_time ?? "",
          name: p.name,
          cat: p.category,
          memo: p.memo ?? "",
        }));
      return { number: i + 1, date: dateLabel(d.date), items };
    })
    .filter((d) => d.items.length > 0)
    .map((d) => ({ label: `DAY ${d.number}`, date: d.date, items: d.items }));

  const place = [trip.country, trip.region].filter(Boolean).join(" · ") || "여행";
  const nights = nightsDays(trip.start_date, trip.end_date).label;
  const highlights = days.flatMap((d) => d.items.map((it) => it.name)).slice(0, 4);
  const intro = `${place}에서 보내는 ${nights}. 저장한 장소와 동선을 순서대로 담았어요. QR을 스캔하면 실시간 플랜을 함께 볼 수 있어요.`;

  return {
    title: trip.title,
    dates: formatPeriod(trip.start_date, trip.end_date),
    nights,
    place,
    intro,
    highlights,
    days,
    isEmpty: days.length === 0,
    isLoading,
  };
}
