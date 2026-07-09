import type { ReactNode } from "react";

import type { CategoryKey } from "@/lib/constants/category";

/**
 * 지도 표현 레이어 뷰모델 (표현 전용). 도메인(Place·Membership)에서 좌표·순서를
 * 뽑아 이 형태로 넘긴다 — components/map 은 도메인 타입을 직접 알지 않는다.
 * 좌표는 lat/lng (데이터 계약 §4.5). 시안의 x/y% 는 목업이라 사용하지 않는다.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 일정 장소 — 번호 마커(순서). scheduled_date 가 있는 place. */
export interface ScheduledMarker {
  id: string;
  position: LatLng;
  /** 1-based 표시 순번(order_in_day 순). */
  order: number;
  category: CategoryKey;
}

/** 저장 장소 — 다이아 마커. scheduled_date=null 인 place. filterToday OFF 일 때만 노출. */
export interface SavedMarker {
  id: string;
  position: LatLng;
  category: CategoryKey;
}

/**
 * 실시간 커서 — 타 멤버 포인터(이름·색). color 는 profile.avatar_color(계약 §4.1).
 * 데이터는 상위(PlanView)가 cursorStore 피어 × 멤버로 투영해 넘긴다(2차 A, broadcast 실연동).
 */
export interface LiveCursor {
  id: string;
  name: string;
  color: string;
  position: LatLng;
}

export type RouteStyle = "solid" | "dashed";

/** 마커 앵커 — OverlayView 픽셀 오프셋 / AdvancedMarker 컨테이너 transform 에 매핑. */
export type MarkerAnchor = "center" | "bottom" | "topleft";

export interface TripMapProps {
  /** 선택 날짜의 일정 장소(번호 마커 + 동선). order 순으로 동선을 그린다. */
  scheduled: ScheduledMarker[];
  /** 저장 장소(다이아 마커). filterToday=true 면 숨긴다. */
  saved?: SavedMarker[];
  /** "선택한 날짜 일정만 보기" — true 면 저장 마커 숨김(04 §6.2). */
  filterToday?: boolean;
  /** 리스트↔지도 양방향 하이라이트 대상. */
  selectedId?: string | null;
  /** 카테고리 필터 — 'all' 외에는 비매칭 번호 마커를 흐리게(mute). */
  activeCategory?: CategoryKey | "all";
  /** 타 멤버 실시간 커서(목 골격). */
  cursors?: LiveCursor[];
  routeStyle?: RouteStyle;
  /** 명시하면 fitBounds 대신 이 중심/줌 사용. */
  center?: LatLng;
  zoom?: number;
  /** 마커/동선 선택 → selectedId 후보 전달. */
  onSelect?: (id: string) => void;
  /** 지도 빈 곳 클릭 → 좌표(lat/lng). 상위에서 reverse geocoding 후 "장소 추가" 프리필에 사용. */
  onMapClick?: (position: LatLng) => void;
  /** 지도 포인터 이동 → 지도 좌표(lat/lng). 실시간 커서 송신용(도메인 무관, 상위에서 throttle). */
  onPointerMove?: (position: LatLng) => void;
  /** 지도에서 포인터 이탈. 실시간 커서 leave 송신용. */
  onPointerLeave?: () => void;
  /**
   * 등록 장소 0 일 때 지도 위 안내(예: "장소를 추가하면 …").
   * 도메인 카피를 components/map 에 두지 않으려고 슬롯으로 받는다(설계 §8).
   */
  emptyOverlay?: ReactNode;
  /**
   * 범례 슬롯 — undefined=기본(일정 순서/저장한 장소), null=숨김, ReactNode=커스텀(예: 06 "저장한 장소").
   */
  legend?: ReactNode;
  className?: string;
}
