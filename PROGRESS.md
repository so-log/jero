# PROGRESS — jero 백엔드 연동(Supabase) 진행상황

> 컨텍스트 복구용 단일 기록. B8 롤아웃(①인증 → ②데이터 CRUD → ③실시간) 기준.
> 상세 계약/설계는 `docs/architecture/데이터모델_계약.md`(단일 출처).
> 최종 갱신: 2026-07-07.

## 브랜치 / main 반영 상태

- 현재 브랜치: **`feat/realtime`** — 커밋 기준 `main`과 **동일**(c2f650c, 0 ahead/0 behind).
- `origin/main` = c2f650c 까지 push 완료. 즉 **아래 "완료" 항목은 전부 main에 반영·푸시됨.**
- 실시간(③) 작업은 아직 **커밋 안 된 작업 트리 변경**으로만 존재(main 위에 얹힘).
- 관련 브랜치 스택: `chore/scaffold-setup`, `feat/auth-supabase`, `feat/data-crud`,
  `feat/schedule-assign`, `feat/share-invite`, `feat/mvp-implementation`(README), `feat/realtime`(현재).

## Supabase 마이그레이션 (`supabase/migrations/`)

| 파일 | 내용 | 적용 |
|---|---|---|
| `0001_auth.sql` | 인증 · profile 프로비저닝 | ✅ 적용됨 |
| `0002_data.sql` | trips/places/budget 스키마 · RLS · RPC | ✅ 적용됨 |
| `0003_share.sql` | 공유 · 초대(accept_invite / get_shared_trip 등) | ✅ 적용됨 |
| `0004_realtime.sql` | 퍼블리케이션 추가(place·expense·expense_split·trip_member) · `realtime.messages` RLS(trip:<id> 멤버 전용 구독) | ✅ **적용됨**(Supabase Dashboard, 2026-07-07). 파일은 아직 미커밋 |

## 완료 (main 반영·푸시됨)

- **인증(0001)** — Supabase Auth(이메일/비번) + SSR 세션 + 라우트 가드 + 콜백.
- **데이터 CRUD·RLS·RPC(0002)** — trips 목록/상세/생성(`create_trip` RPC), places CRUD·reorder,
  budget CRUD(expenses/split/settle).
- **공유·초대(0003)** — 초대 수락(`accept_invite`)·멤버 관리·공개 공유(`get_shared_trip` RPC).
- **저장↔일정 배정** — `useAddPlaceToSchedule`(scheduled_date + order_in_day + scheduled_by).

## ③ 실시간(0004) — 검증 완료·커밋됨 (2026-07-07)

커밋 내용:
- `src/features/workspace/api/useTripRealtime.ts` — trip 단위 **private 채널** 훅:
  presence(**broadcast heartbeat**, 아래 참조) + `postgres_changes`(place/expense/expense_split/
  trip_member) → 쿼리 invalidate. 낙관적↔실시간 reconciliation(in-flight 중 invalidate 디바운스, settle 후 재동기화).
  **버그 수정**: 구독 전 `supabase.realtime.setAuth(access_token)` 추가 — 이게 없으면 private
  채널이 CHANNEL_ERROR 로 구독 실패해 실시간 전체(presence·postgres_changes)가 죽었다.
- `src/features/workspace/components/WorkspaceShell.tsx` — 훅 연결, presence로 멤버 `online` 덮어씀.
- `supabase/migrations/0004_realtime.sql` — 퍼블리케이션 + realtime.messages RLS.
- `e2e/realtime.spec.ts` + `e2e/realtime/{support,fixtures}.ts` — service_role 부트스트랩 기반 2계정 e2e.
- (주의) `layout.tsx`의 `<Providers>` 제거는 **되돌림** — 다시 건드리지 말 것.

### 실시간 검증 결과 (Playwright 2 컨텍스트, 실 Supabase, 2계정)

| 항목 | 결과 |
|---|---|
| (1) A 장소 추가 → B 자동 반영(postgres_changes) | ✅ 통과 |
| (3) A 순서변경 → B 반영 | ✅ 통과 (드래그 무깜빡임은 훅 in-flight 가드 + 수동확인) |
| (4) 비멤버 C 채널 구독 거부(realtime.messages RLS) | ✅ 통과 |
| 콘솔·Supabase 4xx/5xx | ✅ 0건 |
| `yarn run check` / `yarn build` | ✅ 그린 |
| (2) presence "접속 중" 아바타 | ✅ **통과 (broadcast heartbeat 구현)** |

### presence = broadcast heartbeat 로 구현 (네이티브 presence sync 우회)

**원인 규명**: 네이티브 realtime presence 는 `track()`이 `ok` 를 반환해도 `sync` 이벤트가 전혀
전달되지 않는다(브라우저·순수 supabase-js, public·private 모두). 같은 채널에서 **broadcast 는
정상**(self-receive public/private 확인), postgres_changes 도 정상 → **presence 기능 전용**
문제(Supabase 프로젝트측). 대시보드 조사 없이 broadcast 로 우회 구현.

**구현**(`useTripRealtime` 내부만 교체, 인터페이스 `onlineIds` 불변 → WorkspaceShell·TopBar 무변경):
구독 시 + 12s 주기로 자기 user id 를 `presence:hb` broadcast → 피어는 수신 시각 기록, 30s TTL 로
만료(5s 주기 prune). 이탈 시 `presence:bye` broadcast(best-effort; SPA 이탈은 소켓 종료와 경합해
미전달 가능 → 그 경우 TTL 로 자연 정리). `broadcast:{self:true}` 로 자기 자신도 접속 표시.

## 계정(09) — 실연동 완료 (2026-07-07)

- `useProfileQuery` — 본인 `profile` select(RLS). `useUpdateProfile` — **서버 라우트**
  `PATCH /api/account/profile`(세션 검증 + profileSchema 재검증 + update, §8.3) → inv `['profile']`.
  `useDeleteAccount` — **서버 라우트** `DELETE /api/account`: 세션 재확인 → 유일 owner trip 은 다른
  멤버(editor 우선→오래된 순)에게 owner 승계, 나 혼자면 trip cascade 삭제, 생존 trip 의 내 참조
  (created_by·payer_id 등 NOT NULL FK)는 승계자에 재배정·place.saved_by/scheduled_by 는 NULL →
  `auth.admin.deleteUser`(service role, `lib/supabase/admin.ts`). 이후 클라 signOut + 캐시 clear.
- 검증(e2e `account.spec.ts`): 프로필 표시·이름/색 저장·새로고침 유지·워크스페이스 아바타 반영 ✅,
  삭제 위임(A→B owner 승계·여행 생존) ✅, 삭제 단독(여행+계정 cascade) ✅. check/build 그린.
- **참고**: FK 가 대부분 `NO ACTION` 이라 삭제 시 참조 재배정이 필수(마이그레이션 변경 없이 서버에서 처리).

## 작은 UI 3건 — 완료 (2026-07-07)

- **AddToScheduleMenu 드롭다운 방향**: 기본 아래로 열고, 트리거 `getBoundingClientRect` 로 아래 공간
  부족 + 위 공간 충분 시에만 위로 flip(뷰포트 경계 인식). header 잘림 해소.
- **일정에서 빼기(unassign)**: `features/itinerary/api/useUnassignPlace`(scheduled_date=null + 그 날 순서
  컴팩션, 낙관적 + inv `['places',id]`) → PlanView→ItineraryPanel→(SortablePlaceItem)→PlaceCard 에
  hover 제거 버튼 배선. add-to-schedule=place, remove-from-schedule=itinerary 로 도메인 분리(역참조 회피).
- **ShareOverlay 링크 복사**: `lib/clipboard`(navigator.clipboard + execCommand 폴백) + `issueShareLink`
  로 실제 `/share/{token}` 발급·복사 + "복사됨" 피드백/에러. 권한 변경 시 재발급.
- 검증: 컴포넌트 테스트 3파일(+8) 통과, `yarn run check`(77)·build 그린.

## 지출 편집(07) — 완료 (2026-07-08)

- `useUpsertExpense` 를 **id 유무로 insert/update 분기** + expense_split delete→insert 재작성(인원 변경 반영).
  fx_rate 는 저장 시점 스냅샷, day→spent_on 변환. 무효화 `['budget']` → 지표·차트·정산 재계산.
- `overlayStore` 에 `expenseId` 추가 · `useExpenseActions.openEditExpense` · `ExpenseTable` 행 클릭 편집
  · `ExpenseOverlay` expense 프리필(제목 "지출 편집") · `WorkspaceOverlays` 가 budget 캐시에서 expense 조회 전달.
- **정산 충돌 규칙**: 편집은 `trip.settled_at` 을 건드리지 않는다 — 정산은 항상 지출에서 라이브 재계산
  (`computeSettlements`)되어 충돌 없고, `settled_at` 은 UI 미표시 + owner 전용 RLS(editor 편집이 못 건드림). 마이그레이션 무변경.
- 검증: 컴포넌트 테스트(+4, ExpenseOverlay 프리필·ExpenseTable 진입점) + **e2e `budget.spec.ts`**
  (생성→금액 편집→분담 편집→정산/합계 재계산, 실 Supabase). `yarn run check`(81)·build 그린.

## e2e flows 재작성(실인증) — 완료 (2026-07-08)

- `home.spec`: 랜딩 로그인 폼 렌더 · 미인증 보호라우트(/trips) 리다이렉트 · 인증 후 /trips 도달.
- `flows.spec`: (1) 로그인→여행 생성 마법사(4단계, 캘린더 날짜 필수)→워크스페이스, (2) 장소 추가→일정
  배정→예산 지출 관통. stub 단언(demo@trip.co·trip_1·fixture) 제거, service_role 부트스트랩 실인증 기반.
- 티어다운: flows 는 A 소유 여행(부트스트랩 + 마법사 생성분) 전부 삭제 후 계정 정리.
- **부수 발견/수정**: e2e 부트스트랩이 trip.cover 를 hex("#6E9CF2")로 넣어 /trips 목록의 `TripCard`
  (`COVER[cover_color].gradient`)가 500 — 유효 CoverColor 키("blue")로 교체. (앱은 마법사가 항상 유효 키 사용.)
- 검증: **전체 e2e 12/12**(account·budget·flows·home·realtime), `yarn run check`(81)·build 그린.

## 2차 A — 실시간 커서 (2026-07-08)

`docs/architecture/2차_구현_설계.md` A 항목. presence 와 **동일한 private 채널**의 broadcast 재사용.
- `useTripRealtime`: 같은 채널에 `cursor:move`(payload `{userId,lat,lng,ts}`)/`cursor:leave` 추가 →
  본인 제외하고 `cursorStore` 에 피어 좌표 기록(수신시각 기준 5s TTL prune), 송신 transport(send/leave)를 store 에 등록.
  **반환 시그니처(onlineIds) 불변.**
- `src/store/cursorStore.ts`(신규, 중립 전역): 피어 맵(TTL) + send/leave transport. workspace↔itinerary 공유라 전역.
- `src/lib/throttle.ts`(신규): 선행+후행 throttle. PlanView 가 지도 mousemove 를 60ms throttle 해 송신.
- `PlanView`: `useMockCursors` 제거 → `peersToCursors(cursorStore.peers, members)`(색·이름=presence 아바타 동일 소스)
  로 `LiveCursor[]` 투영. 지도 포인터 이벤트를 store.send/leave 로 배선.
- `TripMap`/`MapCanvas`: 도메인 무관 `onPointerMove(LatLng)`/`onPointerLeave`(GoogleMap onMouseMove/onMouseOut) 추가.
  `LiveCursorLayer`/`cursors` 인터페이스 **불변**. `useMockCursors` 삭제.
- 검증: 유닛(throttle·cursorStore·peersToCursors) + e2e `cursor.spec`(2계정 cursor:move/leave 수신·self 필터).
  전체 e2e 13/13, `yarn run check`(88)·build 그린. **지도 위 렌더는 Google Maps 키(env) 필요** — 지도 마커 전반과 동일 제약(렌더 컴포넌트 무변경).
- 새 마이그레이션 없음(broadcast 재사용).

## 2차 B — 폴더 관리 (2026-07-08)

`docs/architecture/2차_구현_설계.md` B 항목. **folder RLS 는 0002 에 이미 존재**(folder_select 멤버 / folder_write editor+) → 새 마이그레이션 없음. place.folder_id 는 `ON DELETE SET NULL`(0002).
- `features/place/api/useFolders.ts`(신규): `useUpsertFolder`(생성/이름변경 id 분기, 낙관적 setQueryData(['places',id]) + 무효화), `useDeleteFolder`(폴더 제거 + 소속 저장장소 folder_id→null 낙관, 서버는 SET NULL). onError 롤백.
- 장소 폴더 이동은 기존 `useUpsertPlace`(folder_id) 재사용 — 신규 훅 없음.
- `FolderSidebar`: "폴더 추가" 인라인 입력 + 폴더별 더보기(이름변경/삭제, ConfirmDialog) 배선. viewer(canEdit=false)는 관리 UI 비노출. 개수는 항상 표시(더보기는 hover 오버레이). `PlacesView` 가 훅→콜백 배선(활성 폴더 삭제 시 전체로).
- 검증: 유닛(useFolders 낙관/롤백 create·rename·delete, FolderSidebar 상호작용·viewer) + e2e `folder.spec`(추가→개수→삭제→미분류, 실 Supabase ON DELETE SET NULL). 전체 e2e 14/14, `yarn run check`(97)·build 그린.

## 2차 C — 템플릿 복제로 시작 (2026-07-08)

`docs/architecture/2차_구현_설계.md` C 항목. **방식 (a) 시드 테이블 + 서버 복제.**
- **마이그레이션 `0005_templates.sql`**(Dashboard 적용 완료): `trip_template`/`template_folder`/
  `template_place`(id=슬러그 text) + 공개 read RLS(쓰기 없음) + 시드 2종(도쿄 클래식 4일 tpl-tokyo 10곳·폴더3·Day1~4,
  제주 드라이브 3일 tpl-jeju 8곳·폴더3·Day1~3) + **create_trip RPC 확장**(`create or replace`):
  startMode='template'+templateId → folder→place 복제, Day 는 새 여행 start_date 기준 오프셋 매핑, security definer owner=호출자.
- 프론트: `useCreateTrip` payload 에 templateId 전달 + onSuccess `['places',id]` 무효화. `TRIP_TEMPLATES` 시드 2종과 일치(osaka 제거).
  Step4Mode 는 기존 templateId 폼값 그대로 → RPC TODO 해소로 실제 복제 동작.
- 검증: 유닛(useCreateTrip templateId/무효화) + e2e template.spec(템플릿 선택→생성→센소지·명소 폴더 복제 렌더, 빈 여행 회귀).
  전체 e2e 16/16, `yarn run check`(99)·build 그린. Supabase 마이그레이션 0001~0005 적용됨.

## 2차 E — 여행 통계 (2026-07-08)

`docs/architecture/2차_구현_설계.md` E + 기획 15. **신규 쿼리·마이그레이션 없음**(usePlacesQuery 재사용).
- `features/stats/lib/stats.ts`: `computeTripStats(places, trip)` 순수 셀렉터 → `totalDistanceKm`(연속 일정 좌표
  Haversine 합, 좌표 없는 장소 제외), `perDay[]`, `byCategory[]`(pct), `byArea[]`, placeCount/tripDays/avgPerDay.
  `haversineKm` 포함. deriveDays 재사용(공유 계약).
- `features/stats/components`: StatsView(usePlacesQuery 재사용, 빈/로딩), StatCard, DistanceTrend(Recharts 막대),
  CategoryPie(Recharts 도넛, **카테고리 색 = CATEGORY 단일 출처**). 예산 대시보드(07) 톤 재사용(import 아님·경계 준수).
- 라우트 `?view=stats` 분기 + ViewSegment 5번째 '통계'(icon activity). 전 멤버(viewer 포함) 열람.
- 검증: 유닛(computeTripStats 거리·분포·빈 + haversine) + 컴포넌트(StatsView 렌더·빈·로딩) + e2e stats.spec(세그먼트→카드·차트 렌더).
  전체 e2e 17/17, `yarn run check`(106)·build 그린.

## 2차 F — 장소 메모 인라인 자동저장 (2026-07-08)

`docs/architecture/2차_구현_설계.md` F. **새 마이그레이션 없음.**
- `useAutosaveMemo(tripId)`(useUpsertPlace.ts): **memo 만 patch** + 낙관적 setQueryData(['places',id]) + 실패 롤백 + settle 무효화.
- `MemoField`: 인라인 textarea + **debounce 600ms**(useEffect+setTimeout, 입력마다 리셋 → 멈춘 뒤 1회 저장) + 상태("저장 중…"/"저장됨").
  placeId 있으면 자동저장(기존 장소), 없으면 onChange 로 폼 동기화(신규 → 제출 저장). viewer(canEdit=false) 읽기 전용.
- `PlaceDetailOverlay`: 메모 폼 textarea → `MemoField`(placeId=place?.id, onChange=setValue('memo') 로 제출 되돌림 방지).
- 검증: 유닛(useAutosaveMemo 낙관/롤백) + 컴포넌트(MemoField 디바운스 1회 저장·저장됨·viewer·신규 onChange).
  전체 e2e 17/17, `yarn run check`(112)·build 그린.

## 남은 후속(2차)

- **D**(OAuth·설정) — `docs/architecture/2차_구현_설계.md` 참조. (A·B·C·E·F 완료)
