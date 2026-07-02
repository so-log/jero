# 워크스페이스 프론트 설계 (04 플랜 · 05 일정표 · 06 장소 · 07 예산)

> 데이터 계약(`데이터모델_계약.md`) 위에 워크스페이스 4뷰의 컴포넌트·상태·통신·인터랙션을 정의한다. 4뷰는 **공통 셸을 공유하고 본문만 교체**한다. 코드는 작성하지 않는다(설계만).

## 1. 개요
- **라우트**: `/trips/[id]?view=plan|calendar|places|budget` (기본 `plan`)
- **구조**: 워크스페이스 공통 레이아웃(상단 바 + 뷰 세그먼트 + presence)이 **셸**, `view` searchParam에 따라 본문만 교체. 4뷰는 별도 라우트 페이지가 아니라 **같은 `[id]` 페이지의 본문 분기**.
- **대상 화면**: 04 플랜(지도+일정), 05 일정표(월/주/일), 06 장소(보관함), 07 예산(대시보드).
- **핵심 원칙**: 04~07은 **동일 `place`/`expense` 데이터를 다른 방식으로 투영**한다(별도 데이터 아님). 05=시간축 투영, 06=저장/배정 관점, 07=지출 집계.

## 2. 공통 워크스페이스 셸
`app/(app)/trips/[id]/layout.tsx` — 4뷰가 공유. 본문(`page.tsx`)이 `view`에 따라 뷰 컴포넌트를 렌더.
> **[F2] 라우트 그룹**: `/trips/[id]`는 목록형 `(main)` 그룹(AppHeader) **밖**에 둔다 → 글로벌 `AppHeader`를 상속하지 않고 **`WorkspaceTopBar`만** 사용(헤더 중첩 방지). 목록형(`/trips`,`/trips/new`,`/settings`)은 `(main)`에서 AppHeader 공유(`trips_frontend.md` §2).

```
app/(app)/trips/[id]/
├─ layout.tsx              # 셸: WorkspaceTopBar + 데이터 프리페치(trip·members) + presence 구독
└─ page.tsx                # searchParams.view → <PlanView|CalendarView|PlacesView|BudgetView/>
```

**셸 구성 컴포넌트** (`features/workspace/components` 또는 `components/ui`로 승격):
| 컴포넌트 | 역할 | 데이터 |
|---|---|---|
| `WorkspaceTopBar` | 목록 버튼·여행 아이콘/제목/기간·viewer 배지·뷰 세그먼트·접속 멤버·공유/더보기 | `trip`, `my_role`, presence |
| `ViewSegment` | 플랜/일정표/장소/예산 토글 (현재 뷰 강조) | `view` searchParam |
| `OnlineMembers` | "접속 중" 아바타(presence) + 온라인 점 | presence 채널 |
| `ShareButton` / `ViewerBadge` | notViewer→공유, viewer→"공유받은 플랜" | `my_role` |

- **뷰 전환**: `ViewSegment`는 `?view=` 쿼리만 바꾼다(라우트 푸시). 셸·데이터(trip·members)는 유지, 본문만 교체 → 전환 비용 최소.
- **presence**: 셸에서 trip 단위 Realtime presence 채널 1회 구독, `OnlineMembers`에 공급. **실시간 커서는 MVP 제외**.

## 3. 컴포넌트 트리 (뷰별)
```
page.tsx (view 분기)
├─ PlanView (features/itinerary + components/map)
│   ├─ ItineraryPanel/        DaySwitcher · DayHeader · CategoryBar · FilterTodayToggle · PlaceCardList(PlaceCard) · EmptyState · ErrorState(재시도) · Skeleton
│   └─ MapPanel/ (components/map)  GoogleMap · RouteLine · NumberedMarker · SavedMarker · MapLegend · ZoomControls
├─ CalendarView (features/itinerary)
│   ├─ CalendarToolbar         PrevTodayNext · RangeLabel · ModeSegment(월/주/일) · AddScheduleButton
│   ├─ MonthGrid · WeekTimeline · DayTimeline
│   └─ EmptyState · ErrorState(재시도) · Skeleton
├─ PlacesView (features/place + components/map)
│   ├─ FolderSidebar(FolderItem · AddFolderButton)
│   ├─ PlaceListPane           ListHeader · SearchSortBar · PlaceGrid(SavedPlaceCard · AddToScheduleMenu) · EmptyState · ErrorState(재시도) · Skeleton
│   └─ MiniMapPanel (components/map)  MapPin · MapLegend
└─ BudgetView (features/budget)
    ├─ MetricCard ×4
    ├─ CategoryDonut · DailyTrendBar   (Recharts)
    ├─ SettlementSummary(SettlementRow · MarkSettledButton)
    └─ ExpenseTable(ExpenseRow: 날짜·항목·결제자·분담·금액) · EmptyState · ErrorState(재시도) · Skeleton
```
- 카테고리 칩·멤버 아바타·역할 배지·세그먼트·토글은 **공통 컨트롤**(`components/ui`)로 04~07·오버레이가 재사용.
- 오버레이(장소 상세·공유·지출 추가)는 10번 문서 소관이지만, 진입 트리거(버튼)는 각 뷰에 위치.

## 4. 상태 경계
**서버상태 (TanStack Query)** — `데이터모델_계약.md` 응답 기준:
| 쿼리 | 키 | 용도 |
|---|---|---|
| `useTripQuery(tripId)` | `['trip', id]` | 셸: 제목·기간·my_role |
| `useMembersQuery(tripId)` | `['members', id]` | 멤버·역할(아바타·정산) |
| `usePlacesQuery(tripId)` | `['places', id]` | 04·05·06 공유 — 전체 place(저장+일정) |
| `useBudgetQuery(tripId)` | `['budget', id]` | 07 — expenses·metrics·settlements |

> `usePlacesQuery` 단일 소스를 04(날짜 필터+좌표), 05(시간축 그룹), 06(폴더 그룹/미배정)이 **셀렉터로 투영**. 중복 fetch 금지.

**클라/UI 상태** — Zustand `workspaceStore` (또는 뷰 로컬) + URL `searchParams`:
| 상태 | 위치 | 비고 |
|---|---|---|
| `view` | URL `?view=` | 셸 |
| `activeDay`(플랜)·`selDay`/`mode`(일정표) | URL 동기화 권장 | 새로고침·공유 복원 |
| `filterToday`·`activeCategory`·`selectedId`(플랜) | Zustand/로컬 | 일시 UI |
| `folder`·검색·정렬(장소) | URL 동기화 권장 | |

- **혼용 금지**: place/expense는 서버상태, 선택·필터·모드는 UI 상태. 파생(N박N일·dday·정산)은 서버 응답 또는 순수 셀렉터(`lib`).
- **실시간**: 셸에서 presence + `postgres_changes`(place·expense·member) 구독 → 변경 시 해당 쿼리 `invalidate`. 낙관적 업데이트(드래그·일정에 추가).

## 5. 쿼리·뮤테이션 매핑
`features/<도메인>/api/` 경유(컴포넌트 직접 fetch 금지).

**조회**: §4 표 참조. 데이터 계약 응답 예시(04 플랜, 07 예산)를 fixture로 사용.

**뮤테이션**:
| 뮤테이션 | 도메인 | 효과 | 무효화 |
|---|---|---|---|
| `useReorderPlaces` | itinerary | 드래그 순서 → `order_in_day` 갱신 | `['places',id]` (낙관적) |
| `useAddPlaceToSchedule` | place | "일정에 추가" → `scheduled_date`(+order) 설정 | `['places',id]` → 04·05 동기화 |
| `useUnschedulePlace` | place | 배정 해제(scheduled_date=null) | `['places',id]` |
| `useUpsertPlace`/`useDeletePlace` | place | 장소 추가·편집·삭제(오버레이①) | `['places',id]` |
| `useUpsertFolder` | place | 폴더 추가 | `['places',id]`/폴더 |
| `useUpsertExpense`/`useDeleteExpense` | budget | 지출 추가·편집(오버레이③) | `['budget',id]` (metrics·settlement 재계산) |
| `useMarkSettled` | budget | 정산 완료 표시 | `['budget',id]` |

- **"일정에 추가"의 단일성**: 06에서 `scheduled_date` 설정 = 04(동선)·05(일정표)에 즉시 반영. 같은 `place` 행이므로 `['places',id]` 무효화 한 번으로 3뷰 동기화.
- **정산·금액**: 클라 계산 금지. `amount_base`·`settlements`는 서버 응답 그대로 표시(데이터 계약 §7).

## 6. 인터랙션 시나리오
**04 플랜**
1. DaySwitcher → `activeDay` 변경 → `usePlacesQuery` 셀렉터로 해당 날 필터, 지도 동선·번호 마커 갱신, 선택 초기화
2. 카테고리 칩 → `activeCategory` → 리스트 필터 + 비매칭 마커 mute(opacity). **필터 중 드래그 비활성**(canDrag=편집&&전체)
3. 카드/마커 선택 → `selectedId` → 리스트↔지도 양방향 하이라이트
4. filterToday OFF → 저장 장소(scheduled_date=null) 마커(다이아) 표시
5. 드래그 정렬(편집) → `useReorderPlaces`(낙관적) → 동선 즉시 갱신
6. "장소 추가" → 오버레이①(#place)

**05 일정표**
1. ModeSegment(월/주/일) → 본문·RangeLabel 교체
2. Prev/Today/Next → 기간 이동, 월에서 여행일 클릭 → 일(day) 모드 진입
3. 이벤트 블록/카드 → 상세/편집(오버레이)
4. "일정 추가"(편집) → 추가 오버레이
> 데이터는 `usePlacesQuery` 동일 소스를 `start_time`·`duration_min`으로 시간축 배치.

**06 장소**
1. 폴더 선택 → `folder` → 리스트·핀 필터("전체 장소"=전체)
2. 검색·정렬 → 폴더 내 필터/정렬
3. 카드/핀 선택 → 양방향 하이라이트
4. "일정에 추가" → Day 드롭다운 → `useAddPlaceToSchedule` → "Day N에 추가됨" + 핀 "D{N}", 04·05 반영. "취소"→`useUnschedulePlace`
5. "장소/폴더 추가"(편집) → 오버레이①/폴더 생성

**07 예산**
1. "지출 추가"(편집) → 오버레이③ → `useUpsertExpense` → 지표·도넛·막대·정산 재계산
2. "정산 완료로 표시" → `useMarkSettled`
3. 차트·정산은 읽기 전용 시각화(서버 계산값)

## 7. 권한 매트릭스
데이터 계약 §6 준수. UI는 보조이며 **서버/RLS가 강제**.
| 동작 | owner | editor | viewer |
|---|---|---|---|
| 4뷰 조회 | ✅ | ✅ | ✅ |
| 장소 추가·편집·삭제, 드래그, 일정에 추가, 폴더 | ✅ | ✅ | ❌ |
| 지출 추가·편집, 정산 완료, 예산 설정 | ✅ | ✅(예산설정은 owner) | ❌ |
| 공유 관리 | ✅ | ❌(열람) | ❌ |
- viewer: "보기 전용"/"공유받은 플랜" 배지, 편집·추가·공유·드래그 UI 미노출(`canEdit=false`). 08 공개 뷰는 같은 읽기 전용 컴포넌트를 `canEdit=false`로 재사용.
- **비멤버 접근**: 인증됐으나 이 여행 멤버가 아니면 `[id]` 라우트 가드(서버/RLS)가 `components/system/SystemPage state="403"`을 렌더(11 `system_frontend.md` §3·§6). 비로그인은 01 로그인 리다이렉트.

## 8. UI 카피 인벤토리 (뷰별)
- **공통 셸**: "목록", "접속 중", "공유", "보기 전용", "공유받은 플랜", 세그먼트(플랜/일정표/장소/예산)
- **04 플랜**: "{Day} 일정 · N곳", "장소 추가", "드래그해서 순서를 바꾸면 지도 동선도 함께 업데이트돼요", 빈: "아직 등록된 장소가 없어요"/"장소 추가하기", 지도 빈: "장소를 추가하면 여기에 순서대로 동선이 그려져요", 로딩: "지도를 불러오는 중…", 범례: "일정 순서"/"저장한 장소"
- **05 일정표**: 모드(월/주/일), "오늘", "일정 추가", 빈: "이 날은 아직 일정이 없어요"/"일정 추가하기"
- **06 장소**: "폴더"/"폴더 추가", "장소 추가", "저장한 장소 검색", "최근 저장순", "일정에 추가"/"Day N에 추가됨"/"저장된 장소", 빈: "저장한 장소가 없어요", 범례: "저장한 장소 · 아직 일정 아님"
- **07 예산**: 지표(총지출/1인당 금액/남은 예산/최다 지출), "카테고리별 지출", "일자별 지출 추이", "정산 요약"/"N건으로 정산"/"정산 완료로 표시", "지출 내역 N건"/"지출 추가", 컬럼(날짜/항목/결제자/분담/금액), 빈: "아직 지출 내역이 없어요"/"지출 추가하기"
> 카피는 `lib/constants` 또는 각 feature에 모아 하드코딩 분산 방지.

## 9. 폴더·네이밍 매핑
```
src/
├─ app/(app)/trips/[id]/{layout,page}.tsx       # 공통 셸 + 뷰 분기
├─ features/
│  ├─ workspace/  components(WorkspaceTopBar·ViewSegment·OnlineMembers) · hooks(usePresence)
│  ├─ itinerary/  components(PlanView·CalendarView·DaySwitcher·PlaceCard·MonthGrid·WeekTimeline·DayTimeline) · api(usePlacesQuery·useReorderPlaces) · lib(selectors)
│  ├─ place/      components(PlacesView·FolderSidebar·SavedPlaceCard·AddToScheduleMenu) · api(useAddPlaceToSchedule·useUpsertPlace·useUpsertFolder)
│  ├─ budget/     components(BudgetView·MetricCard·CategoryDonut·DailyTrendBar·SettlementSummary·ExpenseTable) · api(useBudgetQuery·useUpsertExpense·useMarkSettled)
│  └─ member/     components(MemberAvatar·RoleBadge) · api(useMembersQuery)
├─ components/
│  ├─ map/        GoogleMap·RouteLine·NumberedMarker·SavedMarker·MapPin — 표현 전용 공유(04·06·08), 도메인 로직 없음
│  └─ ui/         shadcn 공통 + 카테고리 칩·아바타·역할 배지·세그먼트·토글·모달 셸
├─ lib/           category 상수(label·색·아이콘)·통화 포맷·날짜(dday/nights)·정산 셀렉터
└─ types/         데이터 계약 생성타입 파생(Place·Expense·Member 뷰모델)
```
- **의존 방향**: `app → features → (components, lib, types)`. **지도는 표현 전용이라 `components/map`으로 승격**(도메인 로직 없음) → `features/itinerary`·`features/place`가 도메인 간 직접참조 없이 `components/map`을 사용. 뷰 합성(PlanView 등)은 feature 내에서 `components/map`을 조립. 카테고리 상수·날짜/통화 유틸은 `lib`로 승격.

## 10. 구글맵 연동
- `@react-google-maps/api`(`components/map`, 표현 전용). `lat`/`lng` 기반(시안의 x/y%는 목업 — 실제는 좌표).
- **마커**: 일정 장소=번호 커스텀 마커(순서), 저장 장소=다이아 마커, 06 배정=「D{N}」. 선택 시 강조·라벨.
- **동선**: 일정 순서대로 `Polyline`(점선/실선). `order_in_day` 순.
- **카테고리 mute**: 활성 카테고리 외 마커 opacity 감소.
- 좌표·검색은 Google Places(place_id 저장) — 입력은 오버레이①/검색에서. 클러스터링·자동완성 상세는 미결.

## 11. 개발 인계 · 미결
- **실시간**: presence + `postgres_changes` 동기화까지 MVP. **커서 후속**. 동시 편집 충돌은 "마지막 반영" 기준(데이터 계약 §8).
  - **낙관적 업데이트 ↔ 실시간 reconciliation**: 드래그·일정에 추가의 낙관적 갱신이 진행 중일 때는 해당 쿼리의 `postgres_changes` invalidate를 디바운스/무시해 깜빡임·되감김을 방지하고, 뮤테이션 settle 직후 재동기화한다.
- **타임존**: `dday`·캘린더·`start_time`은 **여행 현지 기준**으로 통일 필요 — 적용 위치(서버 vs 클라 셀렉터) 구현 시 확정.
- **카테고리**: 통합 단일 enum(데이터 계약 §3) — `lib/constants/category.ts`에 label·색·아이콘 매핑. 시안 라벨 불일치('명소'/'명소·박물관') 단일화.
- **통화**: 07 표시는 `amount_base`(여행 기본 통화) 기준, 원본 통화 병기 여부 구현 시.
- **캘린더 범위**: 임의 연·월 이동·과거 날짜 정책 미결. shadcn Calendar/range + 타임존 주의.
- **드래그 라이브러리**: dnd-kit 권장(04 순서, 필터 중 비활성). 05 블록 드래그(시간 변경)는 후속 후보.
- **차트**: Recharts(도넛·막대), 색은 카테고리 토큰.
