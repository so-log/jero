# share_frontend.md — 뷰어 공유 (08) 프론트엔드 설계

> 대상: **08 뷰어 공유 (공개 읽기 전용)**. 데이터 계약(`데이터모델_계약.md`)의 `share_link`·RLS §6·민감데이터 §8.5를 전제로 한다. 코드는 작성하지 않는다(설계만).

## 1. 개요
- **라우트**: `/share/[token]` (`app/share/[token]/page.tsx`)
- **레이아웃**: 워크스페이스(`app/(app)`)와 **완전히 별도인 공개 레이아웃**(`app/share/layout.tsx`). 인증 미들웨어 **제외**(공개 경로) — 비로그인도 접근.
- **목적**: 추측 불가 토큰으로 공유된 여행의 플랜(일정+동선)을 읽기 전용으로 보여주고 로그인/가입으로 유도.
- **상태**: `normal` / `loading` / `error`(만료·비활성·무효 토큰).
- **핵심 원칙**: 04 플랜 뷰의 일정·지도 컴포넌트를 **`canEdit=false`로 재사용**(중복 구현 금지). 세션 기반 워크스페이스 쿼리와 **데이터 경로 분리**.

## 2. 컴포넌트 트리
```
app/share/[token]/page.tsx                      (서버 컴포넌트 — 토큰 조회 진입)
└─ features/share/components/SharePage          (상태 분기: normal/loading/error)
   ├─ PublicTopBar                              (브랜드 + "읽기 전용" 배지 + 로그인 CTA)   ← components/ui or features/share
   ├─ ShareErrorView                            (error: "링크를 열 수 없어요" + CTA)
   ├─ ReadOnlyNoticeBanner                      ("읽기 전용… 로그인하고 편집하기")
   ├─ ShareTripHeader                           (아이콘·제목·기간 + "함께하는 사람" 멤버 아바타)
   └─ ShareWorkspaceBody
      ├─ features/itinerary/components/ItineraryPanel   ← 04 재사용 (readOnly)
      │  ├─ DaySwitcher                                 ← 04 재사용 (readOnly)
      │  └─ PlaceList / PlaceCard                       ← 04 재사용 (onAdd/onDrag 미주입)
      └─ components/map/PlanMap                        ← 표현 전용 공유 (readOnly: 동선+번호마커, 편집/커서 없음)
└─ ShareFooterWatermark                          ("제이로에서 만든 여행 일정…")
```
- `MemberAvatars`(접속 점·관리 없음)는 04와 동일 표시 컴포넌트를 `online`/`manage` 없이 사용.
- **재사용 컴포넌트는 04 설계(`workspace_frontend.md`)에서 정의**하고, 여기서는 `readOnly` prop으로 소비만 한다.

## 3. 상태 경계
| 구분 | 처리 | 비고 |
|---|---|---|
| 서버 상태(공개 스냅샷) | **TanStack Query** `useSharedTripQuery(token)` 또는 서버 컴포넌트 prefetch | 토큰 기반, 세션 무관 |
| 화면 상태 | `normal` / `loading` / `error` | 쿼리 상태 + 토큰 유효성에서 파생 |
| UI 상태 | `activeDay`, `selectedId` | **로컬 state**(Zustand 불필요). 변경 동작 없음 |
| presence/커서 | **없음** | 공개 뷰는 정적 스냅샷(데이터 계약 §8) |
- 비로그인 최초 로드 성능 위해 **서버 컴포넌트에서 토큰 조회 후 스트리밍** 권장(TanStack Query hydration 또는 RSC props). 클라 컴포넌트는 선택 동기화만.

## 4. 쿼리·뮤테이션 매핑
- `features/share/api/`
  - **`getSharedTrip(token)`** — 공개 읽기 전용. **세션 쿼리와 분리된 별도 엔드포인트**(Supabase RPC 또는 보안 뷰). 토큰→여행 매핑·만료·폐기 검증 포함.
  - 반환은 **공개 안전 스냅샷 타입**(아래 §6): `trip`(title/기간) + `places`(일정: name/category/scheduled_date/order_in_day/start_time/memo/lat/lng) + `members`(표시명·색만). **이메일·예산·내부 ID·saved_by/created_by 제외.**
- **뮤테이션 없음**(읽기 전용). 편집 동작 일절 미주입.
- 타입은 데이터 계약 생성 타입에서 **공개 필드만 Pick한 파생 타입**(`SharedTripView`). 중복 정의 금지.

## 5. 인터랙션 시나리오
1. **유효 토큰 진입** → 서버에서 `getSharedTrip` 성공 → `normal`: 안내 배너 + 헤더 + 일정/지도 렌더.
2. **날짜 전환**(DaySwitcher) → `activeDay` 변경 → 해당 날 일정·동선·번호 마커 갱신(읽기 전용).
3. **카드/마커 선택** → `selectedId` 변경 → 리스트↔지도 양방향 하이라이트(읽기만).
4. **CTA**("로그인하고 편집하기"/"로그인"/"무료로 시작하기") → 01(`/`,`/login`).
5. **만료·무효·폐기 토큰** → `error`: "링크를 열 수 없어요" + "홈으로"/"제이로 시작하기"(→01). 토큰/여행 **존재 여부 비노출 일반화 메시지**.
6. **로딩** → 일정 스켈레톤 + 지도 로딩("공유된 일정을 불러오는 중…").
7. (엣지) 일정 0개 → 04 empty 패턴 축약.

## 6. 권한 / 보안
- **모두 동일한 읽기 전용**. owner/editor/viewer 역할 분기 **없음** — 토큰 스코프 자체가 읽기 전용.
- **서버/토큰으로 강제**(데이터 계약 §6): `share_link.token` 유효(미만료·미폐기) + `role` 스코프 내 데이터만. 편집 API·타 여행 접근 불가.
- **민감 데이터 비노출**(§8.5): 공개 스냅샷은 서버 응답 단계에서 **이메일·예산/정산·내부 ID·작성자 등 제외**. UI 가림이 아니라 응답에서 제외.
- 비로그인 보호 라우트 접근(워크스페이스)은 이 화면이 아니라 01 리다이렉트.

## 7. UI 카피 인벤토리
- 배지: `읽기 전용`
- 안내 배너: `읽기 전용으로 보는 중이에요. 편집하려면 로그인이 필요해요.` / 버튼 `로그인하고 편집하기`
- 헤더: `함께하는 사람`
- 지도 범례: `{Day} 동선 · 순서대로`
- 로딩: `공유된 일정을 불러오는 중…`
- 에러: 제목 `링크를 열 수 없어요` / 본문 `이 공유 링크는 만료되었거나 비활성화되었어요. 여행을 만든 분에게 새 링크를 요청해 주세요.` / 버튼 `홈으로`·`제이로 시작하기`
- CTA: `로그인`, `무료로 시작하기`
- 워터마크: `제이로에서 만든 여행 일정 · 누구나 무료로 만들 수 있어요`

## 8. 폴더·네이밍 매핑
- 라우트: `app/share/[token]/page.tsx`, `app/share/layout.tsx`(공개 레이아웃)
- 도메인: `features/share/{components,api}`
  - `components/`: `SharePage`, `PublicTopBar`, `ReadOnlyNoticeBanner`, `ShareTripHeader`, `ShareWorkspaceBody`, `ShareErrorView`, `ShareFooterWatermark`
  - `api/`: `getSharedTrip`(쿼리), `useSharedTripQuery`
  - `types`: `SharedTripView`(공개 Pick 타입)
- **재사용(직접 구현 금지)**: `components/map`(PlanMap, 표현 전용 공유) + `features/itinerary`의 읽기 전용 뷰 컴포넌트(ItineraryPanel·DaySwitcher·PlaceList·PlaceCard, 04 설계 소유). `readOnly` prop로 소비.
- 의존 방향: `app/share` → `features/share` → (`components/map`은 표현 전용 공유로 사용; `features/itinerary` 읽기 전용 뷰는 04가 export하는 `readOnly` 컴포넌트 경계로 소비) → `components`,`lib`,`types`.

## 9. 구글맵 연동
- `components/map`의 `PlanMap`을 `readOnly`로 재사용: 동선 Polyline + 번호 마커만, 편집/줌편집/커서 없음. 좌표는 공개 스냅샷의 `lat/lng`.

## 10. 개발 인계 · 미결
- **공유 범위 = 플랜(일정)만**(MVP). 일정표/장소/예산은 공개 미포함.
- **토큰 만료/폐기 기본값**·재발급은 10(공유 오버레이)·데이터 계약 share_link와 통합 — 만료 기본 정책 미확정.
- **OG/공유 미리보기 메타**(제목·기간) 노출 범위 미확정.
- **데모 여행**(01 "둘러보기" 도착) 고정 토큰/시드 준비 방법 미확정.
- 04 재사용 컴포넌트의 `readOnly` prop 계약은 `workspace_frontend.md`와 합치 필요(공동 의존).
