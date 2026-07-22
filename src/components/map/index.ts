/**
 * components/map — 지도 표현 레이어(표현 전용, 도메인 로직 없음).
 * 04 플랜 뷰의 마커/동선/커서 스펙(플랜 뷰.dc.html) 구현. features 가 좌표·순서를 넘겨 조립한다.
 */
export { TripMap } from "./TripMap";
export { MapFallback } from "./MapFallback";
export { clusterMarkers } from "./stubs";
export {
  reverseGeocode,
  geocodeCity,
  getPlaceDetails,
  type GeocodeResult,
  type PlaceDetails,
} from "./geocode";
export { fetchTravelTimeMatrix, type TravelMode } from "./distanceMatrix";
export {
  usePlacesAutocomplete,
  type PlaceSelection,
} from "./usePlacesAutocomplete";
export {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  hasMapsKey,
  supportsAdvancedMarkers,
} from "./config";
export type {
  LatLng,
  LiveCursor,
  RouteStyle,
  SavedMarker,
  ScheduledMarker,
  TripMapProps,
} from "./types";
