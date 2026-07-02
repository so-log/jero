import type { TripSummaryDto } from "../types";

/**
 * 02 내 여행 목록 fixture — 계약 §5 trips 응답 형태. trip_1 은 워크스페이스(04~07) fixture 와 동일 여행.
 * 날짜는 미래/과거 혼합으로 예정/지난 그룹·D-day 를 모두 보여준다(과거 trip_1 은 워크스페이스 데모용).
 */
export const TRIPS_FIXTURE: TripSummaryDto[] = [
  {
    id: "trip_1",
    title: "도쿄, 우리끼리 4일",
    cover_color: "blue",
    cover_icon: "building",
    start_date: "2026-04-18",
    end_date: "2026-04-21",
    my_role: "owner",
    member_avatars: [
      { initial: "지", color: "#3B7DF0" },
      { initial: "민", color: "#FF8A65" },
      { initial: "서", color: "#3FC4A0" },
      { initial: "도", color: "#B07CF0" },
    ],
    place_count: 12,
    search_text: "도쿄 우리끼리 4일 츠키지 긴자 시부야 센소지",
  },
  {
    id: "trip_2",
    title: "제주 한 바퀴",
    cover_color: "mint",
    cover_icon: "palmtree",
    start_date: "2026-08-09",
    end_date: "2026-08-11",
    my_role: "editor",
    member_avatars: [
      { initial: "지", color: "#3B7DF0" },
      { initial: "하", color: "#F2A65A" },
      { initial: "유", color: "#3FC4A0" },
    ],
    place_count: 8,
    search_text: "제주 한 바퀴 성산 우도 협재",
  },
  {
    id: "trip_3",
    title: "오사카 먹킷리스트",
    cover_color: "coral",
    cover_icon: "utensils",
    start_date: "2026-09-20",
    end_date: "2026-09-24",
    my_role: "viewer",
    member_avatars: [
      { initial: "태", color: "#FF8A65" },
      { initial: "민", color: "#3B7DF0" },
      { initial: "서", color: "#3FC4A0" },
      { initial: "도", color: "#B07CF0" },
      { initial: "하", color: "#F2A65A" },
    ],
    place_count: 15,
    search_text: "오사카 먹킷리스트 도톤보리 신사이바시",
  },
  {
    id: "trip_4",
    title: "방콕 휴양",
    cover_color: "amber",
    cover_icon: "palmtree",
    start_date: "2025-11-02",
    end_date: "2025-11-06",
    my_role: "owner",
    member_avatars: [
      { initial: "지", color: "#3B7DF0" },
      { initial: "민", color: "#FF8A65" },
    ],
    place_count: 9,
    search_text: "방콕 휴양 카오산 짜뚜짝",
  },
  {
    id: "trip_5",
    title: "강릉 주말 드라이브",
    cover_color: "purple",
    cover_icon: "mountain",
    start_date: "2025-09-13",
    end_date: "2025-09-14",
    my_role: "editor",
    member_avatars: [
      { initial: "지", color: "#3B7DF0" },
      { initial: "서", color: "#3FC4A0" },
      { initial: "태", color: "#FF8A65" },
    ],
    place_count: 6,
    search_text: "강릉 주말 드라이브 안목 경포",
  },
];
