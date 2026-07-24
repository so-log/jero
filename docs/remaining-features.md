# 미구현 기능 목록 — 설계 대비 구현 갭

## 문서 정보

| 항목 | 내용 |
|---|---|
| 목적 | 최초 설계(기능명세서 v0.1)에서 정의했으나 아직 구현되지 않았거나 부분만 구현된 기능을 정리한다. 후속 작업의 착수 목록으로 사용한다. |
| 근거 | `docs/spec/기능명세서.md`(MVP 10개 · Phase 2/3)와 실제 구현(`src/`)·마이그레이션(`supabase/`)을 대조해 확인. |
| 작성일 | 2026-07-08 |

---

## 1. MVP 10개 구현 상태 요약

| # | 기능(기능명세서 §4) | 상태 | 비고 |
|---|---|---|---|
| 1 | 인증 / 로그인 | ✅ 완료 | 이메일·비번 + **구글 OAuth 실동작**(항목 D 완료) |
| 2 | 여행 생성 마법사(4단계) | ✅ 대부분 | 템플릿 복제 완료. **데모 프리필 잔재 제거 필요**(항목 G) |
| 3 | 지도 + 장소 추가 / 폴더별 저장 | △ 부분 | 폴더 관리 완료. **장소 검색·지도 클릭 등록·좌표 미구현**(항목 H) |
| 4 | 순서 지정(DnD) + 동선 | ✅ 완료 | — |
| 5 | 일정표(월/주/일) | ✅ 완료 | 월·주·일 3모드 모두 구현 |
| 6 | 필터(오늘만/저장만) | ✅ 완료 | — |
| 7 | 공유 / 권한 / 초대 | ✅ 완료 | owner/editor/viewer + 공유·초대 실동작 |
| 8 | 실시간 동시 편집 + 커서 | △ 부분 | 데이터 동기화·접속 아바타 O, **실시간 커서는 아직 목(mock)**(항목 A) |
| 9 | 장소별 메모 | ✅ 대부분 | 메모 저장 O, **인라인 자동저장(debounce)은 미구현**(항목 F, 마이너) |
| 10 | 예산 / 정산 대시보드 | ✅ 완료 | 추가·편집·분담·정산·차트 실동작 |

정리: **MVP 핵심은 대부분 실동작**하며, 남은 것은 아래 6개(부분구현 보완 + 소셜 로그인 설정)다.

---

## 2. 미구현 · 부분구현 상세 (착수 후보)

각 항목: 설계 근거 / 현재 상태 / 남은 작업 / 규모 / 새 기획문서 필요 여부.

### A. 실시간 커서 (§4.8)
- **설계**: 다른 멤버의 포인터(커서·이름·색)를 지도에 실시간 표시.
- **현재**: `LiveCursorLayer` + `useMockCursors`로 **목 데이터만** 표시. `useTripRealtime` 주석에 "실시간 커서 lat/lng는 후속"으로 명시.
- **남은 작업**: presence heartbeat와 동일한 broadcast 채널에 커서 좌표(`{userId, lat, lng}`)를 throttle 전송 → 피어가 수신해 렌더. 인프라(private 채널·broadcast)는 이미 있음.
- **규모**: M · **새 기획문서 불필요**(설계 §4.8·계획 04 §11에 이미 정의).
- **가치**: 실시간 협업이 제품의 핵심 차별점 → 완성 시 임팩트 큼.

### B. 폴더 관리 — 생성/수정/삭제 (§4.3)
- **설계**: 저장 장소를 "맛집·카페·쇼핑" 등 **폴더로 분류**, 폴더 추가/관리.
- **현재**: 폴더 **읽기·표시·필터**는 실동작(`usePlacesQuery`가 `folder` 테이블 조회). 그러나 `FolderSidebar`의 "폴더 추가" 버튼은 **onClick 핸들러가 없는 죽은 버튼**이고, 폴더 생성/이름변경/삭제 쓰기 훅이 없음.
- **남은 작업**: `folder` 테이블 대상 CRUD 훅(`useUpsertFolder`/`useDeleteFolder`) + 폴더 추가/이름변경 UI 배선 + 장소의 folder_id 변경(폴더 이동). RLS는 0002에 folder 포함(확인 필요).
- **규모**: M · **새 기획문서 불필요**(설계에 정의, 시안 buildFolders 있음).

### C. 템플릿 복제로 시작 (§4.2 Step 4)
- **설계**: 여행 생성 시 "빈 여행" 또는 **검증된 템플릿 복제**로 시작.
- **현재**: 마법사 Step4 UI(빈 여행/템플릿 선택)와 `TRIP_TEMPLATES`는 있으나, `create_trip` RPC에 `TODO: startMode='template' 시 템플릿 place 복제` — **실제 복제 미동작**, 템플릿 시드 데이터도 없음.
- **남은 작업**: 템플릿 시드 데이터 정의(장소·폴더·기본 일정) + `create_trip` RPC에 복제 로직 추가(트랜잭션) + 검증.
- **규모**: M~L · **경미한 설계 보강 필요**(템플릿 데이터 구조·시드 목록을 계약/설계에 추가).

### D. 구글 소셜 로그인 (§4.1) — ✅ 완료(2026-07-09)
- **설계**: 이메일 또는 **소셜(구글)** 로그인.
- **완료**: Google Cloud OAuth 클라이언트(`jero-web`) 발급 + Supabase Google provider 등록(Client ID/secret) + URL Configuration(Site URL·Redirect 허용목록). 코드는 기존 그대로(`signInWithOAuth({provider:'google', redirectTo:.../auth/callback})` + 콜백 `exchangeCodeForSession` → `/trips`). 실측: "Google로 계속하기" → 동의 → 로그인 정상.
- **참고**: Google 리디렉션 URI는 앱이 아니라 Supabase callback(`https://<ref>.supabase.co/auth/v1/callback`)이어야 함.

### E. 여행 통계 — 이동거리 · 장소 분포 (§2 강점 매핑)
- **설계**: §2 "보여줄 강점" 표에 "여행 통계(이동거리·장소 분포)"로 언급. (MVP 10에는 미포함 — 강점 어필용 후보.)
- **현재**: 미구현.
- **남은 작업**: 일정 좌표로 총 이동거리 계산 + 카테고리별 장소 분포 차트(Recharts). 예산 대시보드와 유사한 집계 UI.
- **규모**: M · **새 기획문서 필요**(화면·지표 정의). — 당신의 "대시보드·차트" 강점을 한 번 더 보여줄 수 있는 항목.

### F. 장소 메모 인라인 자동저장 (§4.9, 마이너)
- **설계**: 메모 인라인 편집 + 자동 저장(debounce).
- **현재**: 메모 저장은 되나 오버레이 폼 방식(인라인 자동저장 아님).
- **남은 작업**: 인라인 편집 + debounce 저장. **선택 사항**(우선순위 낮음).
- **규모**: S · 새 기획문서 불필요.

### G. 여행 생성 마법사 데모 프리필 제거 (§4.2) — ✅ 완료(2026-07-09, `2b5567b`)
- **완료**: `CreateTripWizard.tsx` DEFAULTS에서 title·country·region 빈 값(placeholder 안내)·members `[]`로 교체(목 멤버 minjun·seoyoon 제거), 소유자=실제 나는 Step3 `useProfileQuery`로 표시. icon/cover 기본선택·검증 로직 유지. `CreateTripWizard.test.tsx` 신규 2건 추가 → 129 tests 그린. 아래는 발견 당시 기록:
- **증상**: "새 여행 만들기" 진입 시 Step1 제목("도쿄, 우리끼리 4일")·나라("일본")·지역("도쿄")이 **데모값으로 미리 채워져 있고**, Step3 멤버에 목 멤버(minjun·seoyoon)가 **박혀 있음**. 실사용/포트폴리오 데모에선 미완성처럼 보임.
- **원인**: 마법사 초기 상태(RHF defaultValues / 멤버 초기 배열)에 남은 **fixture 잔재** (헤더 "지현" 스텁과 동류).
- **남은 작업**: Step1 필드 빈 값 + placeholder("여행 제목을 입력하세요" 등)로, Step3 멤버는 **소유자=실제 나(useProfileQuery)만** 기본. 커버색·아이콘 기본 선택은 유지 가능. 필수 검증 동작은 유지.
- **규모**: S · **새 기획문서 불필요**.

### H. 장소 검색 · 지도 클릭 등록 · 좌표 확보 (§4.3) — ✅ 완료(2026-07-09, `57fec9a`)
- **완료**: `MAPS_LIBRARIES`에 `"places"` 추가 · `usePlacesAutocomplete` 훅을 `PlaceDetailOverlay` "위치·주소"에 부착(선택 시 name·formatted_address·lat·lng·google_place_id 채움, 키 없으면 수기 입력 폴백) · `TripMap` onClick → `reverseGeocode`로 좌표 확보 후 추가 오버레이 프리필 · `useUpsertPlace`가 lat·lng·google_place_id 기록 · `stubs.ts` no-op 제거(실물화) · 좌표 없는 장소는 마커 제외(기대 동작) · `.pac-container` 모달 바깥클릭 가드. 132 tests 그린. 실측: "센소지" 5건 검색→선택 시 이름·주소 자동 채움 확인.
- **보강 — 지도 POI 클릭 추가(2026-07-09, `39239b5`)**: `MAP_OPTIONS.clickableIcons: true` + MapCanvas onClick이 `IconMouseEvent.placeId` 감지 시 `icon.stop()`(기본 인포윈도 억제) 후 placeId 전달 → PlacesView가 `getPlaceDetails(placeId)`로 이름·주소·좌표 확보 → placePrefill(name 포함)로 오버레이. 빈 곳 클릭은 기존 reverseGeocode(주소만) 폴백 유지. 시그니처 additive 확장. 137 tests 그린. 실측: 스타벅스 시부야 POI 클릭 → 이름·주소 자동 채움.
- **보강 — 장소 뷰 지도 패널 드래그 리사이즈/접기(2026-07-09)**: 우측 지도 패널(기존 `w-[356px]` 고정)을 수직 splitter로 가변 폭 전환(`role="separator"` · pointer capture 드래그, 클램프 min 320 / max = 컨테이너 − 좌측예약폭(FolderSidebar 236 + splitter 8 + PlaceList 최소 344 = 588)으로 리스트 ≥344px 보장(`a7e909a`), 드래그 중 전역 `col-resize` 커서 락·텍스트 선택 방지·지도 포인터 차단 오버레이, 포커스 시 키보드 ←/→ 24px 스텝). 접기/펼치기 토글(폴더+리스트 숨겨 지도 풀폭). 폭·접힘 상태 localStorage 유지(`jero:placesMapWidth`·`jero:placesMapCollapsed`). stable key로 접기/펼치기 시 지도 리마운트(타일 리로드) 방지. `lib/resize.ts` 순수 `clampMapWidth` + clamp 6종 테스트 → 143 tests 그린.
- **보강 — 지도 상단 플로팅 검색창(2026-07-09, `74db9ee`)**: `MapSearchBox`(지도 패널 top-left 플로팅 카드, 기존 `usePlacesAutocomplete` 재사용). 선택 시 (1) `flyTo`로 지도 `panTo`+zoom 16 이동, (2) `openOverlay("place", { placePrefill })`로 "장소 추가" 프리필(POI 클릭과 동일 경로). `canEdit`일 때만 노출(viewer 미노출). `TripMap`/`MapCanvas`에 `flyTo` prop additive 추가(center/zoom·fitBounds·드래그와 별도 effect). 144 tests 그린. → 장소 추가 경로 4종: 오버레이 검색 · 지도 검색창 · 빈지점 클릭 · POI 클릭.
- **잔여(코드 아님, 콘솔)**: 지도 클릭의 **주소 자동 채움**이 비어 있었음 → **Geocoding API 미활성/전파 지연** 추정. 좌표는 항상 확보되어 마커는 뜸. 콘솔에서 Geocoding API 사용 설정 + 키 제한 포함 확인(전파 몇 분) 후 재확인.
- 아래는 발견 당시 기록:
- **증상**: 장소 추가 시 "위치·주소"가 **검색이 안 됨**(수기 입력만). 지도의 실제 장소를 **클릭해서 등록할 수 없음**. 그래서 이름만 넣은 장소("도쿄카페")는 **좌표(lat/lng)가 없어** 지도에 마커가 안 뜨고, 플랜의 다이아 마커에도 안 나타남.
- **원인**: (1) 지도 로더가 **`places` 라이브러리를 안 불러옴** — `src/components/map/config.ts` `MAPS_LIBRARIES = ["marker"]` (places 없음). (2) `src/components/map/stubs.ts`에 "Google Places place_id → 좌표 해석 미결"로 명시된 **미구현 스텁**. 즉 콘솔에서 Places API를 켰든 안 켰든, **앱이 Places를 호출하지 않음**.
- **남은 작업**:
  - `MAPS_LIBRARIES`에 `"places"` 추가 + **Places Autocomplete**로 장소 검색(세션 토큰 사용) → 선택 시 place_id·name·**lat/lng** 저장.
  - (선택) **지도 클릭 → reverse geocoding**으로 좌표·주소 확보 후 등록.
  - `place` 스키마에 lat/lng(또는 place_id) 저장 배선 확인 — 이미 컬럼 있으면 값만 채우면 됨.
  - **콘솔 확인**: 키에 **Places API 활성화 + 키 제한(HTTP referrer)에 Places 포함** 필요. (Maps JavaScript API는 이미 켜져 있음 — 지도·마커 렌더 정상.)
- **규모**: M~L · **경미한 설계 보강 권장**(place 좌표/place_id 저장 계약, 04 §13 "place_id·lat/lng 저장 방식" 확정).
- **참고(데이터 모델)**: *저장 장소 ≠ 일정 장소*. 저장만 한 장소는 (a) 플랜 지도에 **다이아 마커**("오늘만 보기" OFF), (b) 일정 리스트엔 **"일정에 추가"** 후 노출 — 이건 스펙 의도. 다만 **좌표가 없으면 다이아도 못 그림** → H가 풀리면 자연 해결. "저장 장소를 일정 리스트에도 바로 노출"을 원하면 별도 UX 결정 필요.

---

## 3. Phase 2 / 3 — 의도적 미구현 (참고)

기능명세서 §3에서 **처음부터 "지금은 안 만든다"**로 분류한 항목이다. 구현 갭이 아니라 계획된 범위 밖이므로, 만들려면 신규 기획이 필요하다.

- **Phase 2**: AI 챗봇(특산물 추천), 여행 일기/발자국(이동거리) 기록, 사진 콜라주, 투어 연계, 변경 이력 타임라인.
- **Phase 3(모바일 전용)**: GPS 자동 발자국, 영수증 OCR, 사진 EXIF 장소 분류, 푸시 알림, 오프라인 모드, 환율 계산기 등.

> 참고: 위 E(여행 통계)와 Phase 2의 "발자국(이동거리)"은 이동거리 계산 로직을 공유한다 — E를 먼저 하면 Phase 2 일부가 수월해진다.

---

## 4. "기획서를 더 써야 하나?"에 대한 답

- **A·B·D·F**: 이미 기능명세서·기획문서(04 등)·시안에 정의돼 있어 **새 문서 없이 바로 구현** 가능.
- **C(템플릿)**: 템플릿 데이터 구조·시드 목록만 설계에 경미하게 보강하면 됨.
- **E(통계)**: MVP 밖 신규 화면이므로 **간단한 기획문서 1장**(화면 목적·지표·차트 구성)을 먼저 쓰는 것을 권장.

즉 대부분은 **구현 단계**로 바로 갈 수 있고, 통계(E)만 짧은 기획을 먼저 두면 된다.

---

## 5. 권장 착수 순서 (포트폴리오 가치 × 규모)

1. **A 실시간 커서** — 차별점(실시간 협업) 완성, 인프라 재사용으로 효율적.
2. **B 폴더 관리** — 장소 저장 UX의 빈 곳(죽은 버튼) 메움, 체감 완성도.
3. **D 구글 OAuth** — 설정 위주로 빠르게 "소셜 로그인 됨" 확보(당신 콘솔 작업 병행).
4. **C 템플릿 복제** — 마법사 완성(시드 데이터 준비 필요).
5. **E 여행 통계** — 대시보드·차트 강점 재강조(짧은 기획 후).
6. **F 메모 자동저장** — 마무리 polish.

> A~F는 대부분 완료(2026-07-08~09). 2026-07-09 실사용 점검에서 발견한 신규 항목:
> 7. **G 마법사 프리필 제거** — 작음, 데모 완성도 직결(먼저).
> 8. **H 장소 검색·지도 클릭 등록** — 중~대, Google Places 연동. H가 풀리면 "저장 장소가 지도/플랜에 안 뜸" 문제도 해결.

> 순서는 제안일 뿐이며, 하나씩 골라 진행하면 된다.

---

## 6. 유지보수 · 후속 (구현과 별개)

- **`middleware` → `proxy` 이전(Next 16) — ✅ 완료(2026-07-09, `4b509e9`)**: `src/middleware.ts` → `src/proxy.ts`(rename), `export function middleware` → `export function proxy`. 로직 100% 보존(hasSupabase 가드·세션 갱신·보호 라우트 판정·비로그인 리다이렉트 `/?returnTo=…`·matcher). `next build` deprecation 경고 소거 확인, 307 리다이렉트(/trips·/settings) 동작 유지, 132 tests 그린. (/login 라우트 부재로 리다이렉트 대상은 기존 `/` 유지.)
- **팜플렛 서버 PDF 승격 — 완료**(2026-07-09, `architecture/팜플렛_설계.md` §5·§13): `POST /api/pamphlet/export`(`puppeteer-core`+`@sparticuz/chromium` headless)로 A4 무인 PDF 다운로드 전환, 실패 시 `window.print()` 폴백. **준비물 편집분 인쇄 반영 — ✅ 완료(2026-07-09, `57cd12a`)**: 편집된 준비물(체크·커스텀 항목)을 `lib/prep.ts` encode/decode로 export payload·print 라우트 쿼리·`window.print` 폴백 URL에 관통 → 프리뷰와 동일 데이터로 PDF 렌더(하드코딩 DEFAULT_PREP 제거). 137 tests 그린. **남은 팜플렛 후속: AI 테마 추천(LLM API 키 필요 — 보류).**
- **Node ≥ 22.12 필요**: 툴체인(vitest 4/@vitejs/plugin-react 6, `std-env` ESM)이 `require(ESM)`(Node ≥22.12 기본)을 요구. 22.11 이하에서는 `yarn run check`(vitest) 실행 불가 → 개발/CI Node 를 22.12+ 로.
- **번들 최적화 — ✅ 완료(2026-07-09, `8b535e0`)**: Recharts 파트를 `*Chart.tsx`로 분리 → 부모 카드가 `next/dynamic(ssr:false)` 지연 로드(예산 도넛·일별추이, 통계 파이·이동추이). 카드 크롬·범례는 즉시 렌더, 차트 영역만 고정 크기 스켈레톤(시프트 없음). 결과: 차트 없는 워크스페이스 뷰(플랜·일정·장소)의 초기 번들에서 Recharts **401KB raw / 115KB gz 제외**, 예산·통계 진입 시에만 청크 로드. (Next 16이 라우트별 First Load JS를 출력하지 않아 `react-loadable-manifest.json`으로 측정 — lazy 모듈 1→5.) 132 tests 그린.
- **폰트 최적화(성능 1순위, `tech-decisions.md` §8.3) — ✅ 완료**: Pretendard Variable woff2가 페이지 전송량의 ~85%(≈2.0MB)·LCP 주원인이었음. **동적 한글 subset woff2로 교체** → LCP 2.3s → **0.6s**, 성능 87 → **100**.
- **접근성 개선(Lighthouse) — ✅ 완료**: 색 대비 AA 미달 토큰 명도 상향, `<main>` 랜드마크 추가, 비밀번호 보기 등 타깃 24px+ → 접근성 **100**.
- **성능 지표 측정 완료**(§8.1~8.3): 번들·빌드·Lighthouse 반영. **Lighthouse(프로덕션 `/`, 데스크톱): 성능 100 · 접근성 100 · 권장사항 100 · SEO 100.**
