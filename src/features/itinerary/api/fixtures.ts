import type { MemberDto, PlacesResponse } from "../types";

/**
 * 04 플랜 / 05 일정표 fixture — 데이터 계약 §5 응답 예시를 단일 출처로 확장.
 * Supabase 연동 전까지 usePlacesQuery/useMembersQuery 가 이 fixture 를 반환한다(§7.2).
 * 좌표는 실제 도쿄 lat/lng. duration_min(분)·scheduled_by 는 05 주/일 모드용.
 */
export const PLAN_FIXTURE: PlacesResponse = {
  trip: {
    id: "trip_1",
    title: "도쿄, 우리끼리 4일",
    start_date: "2026-04-18",
    end_date: "2026-04-21",
    my_role: "owner",
    cover_icon: "plane",
  },
  places: [
    // Day 1 — 2026-04-18
    { id: "d1a", name: "츠키지 장외시장", category: "food", scheduled_date: "2026-04-18", order_in_day: 1, start_time: "09:00", duration_min: 90, memo: "아침 스시 · 오픈런", lat: 35.6654, lng: 139.7707, scheduled_by: "m2" },
    { id: "d1b", name: "하마리큐 정원", category: "museum", scheduled_date: "2026-04-18", order_in_day: 2, start_time: "10:40", duration_min: 84, memo: "정원 산책 · ¥300", lat: 35.6597, lng: 139.7634, scheduled_by: "m3" },
    { id: "d1c", name: "긴자 식스", category: "shopping", scheduled_date: "2026-04-18", order_in_day: 3, start_time: "13:00", duration_min: 108, memo: "점심 + 쇼핑", lat: 35.6695, lng: 139.7649, scheduled_by: "m1" },
    { id: "d1d", name: "블루보틀 긴자", category: "cafe", scheduled_date: "2026-04-18", order_in_day: 4, start_time: "15:10", duration_min: 66, memo: "커피 브레이크", lat: 35.6717, lng: 139.766, scheduled_by: "m4" },
    { id: "d1e", name: "도쿄타워", category: "museum", scheduled_date: "2026-04-18", order_in_day: 5, start_time: "17:30", duration_min: 90, memo: "전망대 · 야경", lat: 35.6586, lng: 139.7454, scheduled_by: "m1" },
    // Day 2 — 2026-04-19
    { id: "d2a", name: "시부야 스크램블", category: "etc", scheduled_date: "2026-04-19", order_in_day: 1, start_time: "10:00", duration_min: 72, memo: null, lat: 35.6595, lng: 139.7004, scheduled_by: "m2" },
    { id: "d2b", name: "미야시타 파크", category: "shopping", scheduled_date: "2026-04-19", order_in_day: 2, start_time: "11:30", duration_min: 72, memo: null, lat: 35.6618, lng: 139.7035, scheduled_by: "m3" },
    { id: "d2c", name: "사라베스 시부야", category: "food", scheduled_date: "2026-04-19", order_in_day: 3, start_time: "13:00", duration_min: 90, memo: "브런치 예약 완료", lat: 35.6604, lng: 139.6993, scheduled_by: "m1" },
    { id: "d2d", name: "네즈 미술관", category: "museum", scheduled_date: "2026-04-19", order_in_day: 4, start_time: "15:30", duration_min: 90, memo: null, lat: 35.6646, lng: 139.7167, scheduled_by: "m4" },
    // Day 3 — 2026-04-20
    { id: "d3a", name: "센소지", category: "museum", scheduled_date: "2026-04-20", order_in_day: 1, start_time: "09:30", duration_min: 60, memo: null, lat: 35.7148, lng: 139.7967, scheduled_by: "m3" },
    { id: "d3b", name: "나카미세 거리", category: "shopping", scheduled_date: "2026-04-20", order_in_day: 2, start_time: "10:40", duration_min: 60, memo: null, lat: 35.7117, lng: 139.7959, scheduled_by: "m1" },
    { id: "d3c", name: "우에노 공원", category: "museum", scheduled_date: "2026-04-20", order_in_day: 3, start_time: "14:00", duration_min: 90, memo: null, lat: 35.7156, lng: 139.7731, scheduled_by: "m4" },
    { id: "d3d", name: "아메요코", category: "gift", scheduled_date: "2026-04-20", order_in_day: 4, start_time: "16:00", duration_min: 90, memo: "기념품 쇼핑", lat: 35.7089, lng: 139.7741, scheduled_by: "m3" },
    // Day 4 — 2026-04-21
    { id: "d4a", name: "호텔 체크아웃", category: "hotel", scheduled_date: "2026-04-21", order_in_day: 1, start_time: "10:00", duration_min: 60, memo: "짐 보관 맡기기", lat: 35.6938, lng: 139.7036, scheduled_by: "m1" },
    { id: "d4b", name: "롯폰기 힐스", category: "shopping", scheduled_date: "2026-04-21", order_in_day: 2, start_time: "11:30", duration_min: 90, memo: null, lat: 35.6604, lng: 139.7292, scheduled_by: "m2" },
    { id: "d4c", name: "모리 미술관", category: "museum", scheduled_date: "2026-04-21", order_in_day: 3, start_time: "13:30", duration_min: 90, memo: null, lat: 35.6606, lng: 139.7296, scheduled_by: "m3" },
  ],
  // 저장 장소(scheduled_date=null) — 06 보관함. folder_id·area·saved_by 보유. 04 다이아 마커와 단일 소스.
  saved_places: [
    { id: "p1", name: "이치란 라멘 시부야", category: "food", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: "돈코츠 · 24시간 영업", lat: 35.6595, lng: 139.7006, folder_id: "f-food", area: "시부야", saved_by: "m2" },
    { id: "p2", name: "스시잔마이 츠키지", category: "food", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: "오마카세 점심 추천", lat: 35.6657, lng: 139.7704, folder_id: "f-food", area: "주오구 츠키지", saved_by: "m1" },
    { id: "p3", name: "우동 신", category: "food", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: null, lat: 35.6896, lng: 139.7006, folder_id: "f-food", area: "신주쿠", saved_by: "m3" },
    { id: "p4", name: "블루보틀 기요스미", category: "cafe", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: "도쿄 1호점", lat: 35.6816, lng: 139.8003, folder_id: "f-cafe", area: "기요스미시라카와", saved_by: "m4" },
    { id: "p5", name: "사루타히코 커피", category: "cafe", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: null, lat: 35.6467, lng: 139.71, folder_id: "f-cafe", area: "에비스", saved_by: "m1" },
    { id: "p6", name: "돈키호테 시부야", category: "shopping", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: "심야 쇼핑 가능", lat: 35.6615, lng: 139.6982, folder_id: "f-shop", area: "시부야", saved_by: "m2" },
    { id: "p7", name: "긴자 식스", category: "shopping", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: null, lat: 35.6695, lng: 139.7649, folder_id: "f-shop", area: "긴자", saved_by: "m3" },
    { id: "p8", name: "시부야 스카이", category: "museum", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: "선셋 시간대 예약", lat: 35.658, lng: 139.7016, folder_id: "f-view", area: "시부야", saved_by: "m1" },
    { id: "p9", name: "팀랩 플래닛", category: "museum", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: "물 들어가는 전시 · 양말 준비", lat: 35.6485, lng: 139.7905, folder_id: "f-view", area: "도요스", saved_by: "m4" },
    { id: "p10", name: "네즈 신사", category: "etc", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: "센본도리이 포토스팟", lat: 35.72, lng: 139.76, folder_id: "f-wish", area: "분쿄구", saved_by: "m3" },
    { id: "p11", name: "나카메구로 빈티지", category: "gift", scheduled_date: null, order_in_day: null, start_time: null, duration_min: null, memo: null, lat: 35.6447, lng: 139.6993, folder_id: "f-wish", area: "나카메구로", saved_by: "m2" },
  ],
  folders: [
    { id: "f-food", name: "맛집", icon: "utensils", color: "#E8615C" },
    { id: "f-cafe", name: "카페", icon: "coffee", color: "#C5893A" },
    { id: "f-shop", name: "쇼핑", icon: "shopping-bag", color: "#D9609A" },
    { id: "f-view", name: "명소·뷰", icon: "landmark", color: "#3B7DF0" },
    { id: "f-wish", name: "가보고 싶은", icon: "bookmark", color: "#8B6FE0" },
  ],
};

/** 접속 멤버 fixture — 04·05 헤더 presence + 05 "추가" 아바타(scheduled_by). */
export const MEMBERS_FIXTURE: MemberDto[] = [
  { id: "m1", name: "지호", initial: "지", color: "#3B7DF0", role: "owner", online: true },
  { id: "m2", name: "민준", initial: "민", color: "#FF8A65", role: "editor", online: true },
  { id: "m3", name: "서윤", initial: "서", color: "#3FC4A0", role: "editor", online: true },
  { id: "m4", name: "도윤", initial: "도", color: "#B07CF0", role: "viewer", online: false },
];
