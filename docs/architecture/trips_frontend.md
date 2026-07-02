# 프론트엔드 설계 ② — 여행 목록 · 여행 생성 (trips)

> 대상: **02 내 여행 목록**(`/trips`) · **03 여행 생성 마법사**(`/trips/new`).
> 데이터는 `데이터모델_계약.md` 단일 출처를 따른다(새 필드 발명 금지). 응답 타입은 Supabase 생성 타입에서 파생한다.

## 1. 개요
| 화면 | 라우트 | 목적 |
|---|---|---|
| 02 내 여행 목록 | `/trips` | 내가 멤버인 여행을 예정/지난으로 묶어 보여주고 생성·진입 허브 |
| 03 여행 생성 | `/trips/new` | 4단계 마법사로 여행 골격 입력 → Trip 생성 → 워크스페이스 진입 |

- 둘 다 **로그인 보호 라우트**. 비로그인 접근 시 `/`(01)로 리다이렉트(서버 세션 검증).
- 02는 전역 헤더(로그인 후 공통 레이아웃)를 쓰고, 03은 마법사 전용 프레임(헤더+스테퍼+푸터).

## 2. 컴포넌트 트리

### 공통 레이아웃 — 목록형 전용 (`app/(app)/(main)/layout.tsx`)
```
(app)/(main)/layout.tsx                  # AppHeader 공유 — 목록형 페이지(/trips, /trips/new, /settings)만
└─ AppHeader (components/ui 조합)        # 로고→/trips, 검색, 알림(비활성·후속), 사용자 메뉴→/settings·로그아웃
```
> **[F2] AppHeader는 `(main)` 라우트 그룹에만.** 워크스페이스(`/trips/[id]`)는 `(main)` 밖에 두어 **AppHeader를 상속하지 않고** 자체 `WorkspaceTopBar`만 쓴다(`workspace_frontend.md` §2). Next 레이아웃 누적으로 인한 헤더 중첩 방지.
> 알림 버튼은 시안 유지하되 **설정 저장만 / 발송 후속** 결정에 따라 동작 비활성(미확인 점 없음).
> **[F1] AppHeader 검색**은 `/trips`에서 목록을 `search_text`(계약 §5)로 클라 필터(제목+장소). 다른 라우트에선 비포커스 시 동작 없음.

### 02 내 여행 목록 (`app/(app)/(main)/trips/page.tsx`)
```
trips/page.tsx
└─ features/trip
   ├─ TripsHeader            # "내 여행" + 요약(N개·예정N·지난N), "새 여행 만들기"(빈상태 숨김)
   ├─ TripFilterBar          # 세그먼트(예정/지난/전체) + 정렬 드롭다운  (목록 있을 때만)
   ├─ TripList               # 그룹 헤더 + 3열 그리드
   │  └─ TripCard            # 커버(색+아이콘) · 역할배지 · D-day · 제목 · 기간/N박N일 · 멤버아바타(+N) · 장소수
   ├─ TripListSkeleton       # loading
   └─ TripsEmpty             # empty: 일러스트 + "첫 여행 만들기" CTA
```

### 03 여행 생성 (`app/(app)/(main)/trips/new/page.tsx`)
```
trips/new/page.tsx
└─ features/trip
   └─ CreateTripWizard                 # 프레임: 헤더(닫기X) · Stepper(4) · 본문 · 에러배너 · 생성 오버레이 · 푸터(이전/다음↔만들기)
      ├─ WizardStepper                  # 4단계 진행 표시(완료 체크/현재 강조)
      ├─ StepTripInfo (Step1)           # 라이브 프리뷰 + 제목·아이콘(6)·커버색(5)·나라·지역
      ├─ StepDates (Step2)              # 월 캘린더 범위 선택 + N박N일 배지
      ├─ StepMembers (Step3, 선택)      # 이메일 초대 추가 + 역할 토글 + 초대 링크 복사
      └─ StepStartMode (Step4)          # 빈 여행 / 템플릿 복제(정적 시드 3종 라디오)
```
- 공통 입력·스테퍼·선택카드·캘린더는 `components/ui`(shadcn) 기반, 도메인 조립만 `features/trip`.

## 3. 상태 경계
| 상태 | 분류 | 위치 |
|---|---|---|
| 여행 목록 데이터 | 서버상태 | TanStack Query `useTripsQuery` |
| 여행 생성 | 서버상태(뮤테이션) | `useCreateTrip` |
| 02 필터(예정/지난/전체)·정렬 | UI 상태 | **URL `searchParams`**(`?seg=`, `?sort=`) — 새로고침·공유·복원 |
| 02 카드 선택/hover | UI 상태 | 로컬(불필요 시 없음) |
| 03 현재 step·폼 값·검증표시 | UI 상태 | **마법사 로컬 상태**(RHF) — 전역 불필요. 제출 전까지 클라 보관 |
- 컴포넌트 직접 fetch 금지 — 모든 통신은 `features/trip/api`의 쿼리·뮤테이션 경유(CLAUDE.md §7.1).

## 4. 쿼리·뮤테이션 매핑

### `useTripsQuery()` → 02
- 응답: `데이터모델_계약.md` §5 "02 내 여행 목록" fixture 형태(배열).
  - `my_role`(trip_member 조인), `member_avatars`(profile 조인, 최대 4 + +N), `place_count`
  - **파생값 `nights`/`days`/`dday`/`past`**: 가능하면 서버 응답 포함, 아니면 `lib`의 순수 셀렉터로 계산. **`dday`/`past`는 여행 현지 기준 날짜**(타임존 주의, 계약 §7·§9).
- 세그먼트/정렬은 **클라 필터·정렬**(목록 로드 후). **검색(제목+장소)은 응답의 `search_text` 필드로 클라 필터**(계약 §5) — `place_count`만으로는 장소명 검색 불가하므로 서버가 검색 텍스트를 빌드.

### `useCreateTrip()` → 03
- 입력 `createTripInput`(계약 §4.2 기준): `title, cover_icon, cover_color, country?, region?, start_date, end_date, start_mode, template_id?` + 초대 `[{email, role}]`(**role 기본 `editor`**, editor/viewer만 — 계약 invitation §4.9·[C]).
- 생성자는 **서버가 owner로 `trip_member` 추가**(클라 role/소유 신뢰 금지).
- 결과 `trip.id` → `/trips/[id]`(플랜 뷰) 이동.
- 템플릿 모드: `start_mode='template'` + `template_id` → 서버가 정적 시드 → `trip`+`place` 복제(계약 §4.10).

## 5. 인터랙션 시나리오

### 02 내 여행 목록
1. 세그먼트(예정/지난/전체) 선택 → 표시 그룹 즉시 전환 + `?seg=` 동기화
2. 정렬 변경(최근 출발순 등) → 카드 재정렬
3. 카드 클릭 → `/trips/[id]?view=plan`
4. "새 여행 만들기"/빈상태 "첫 여행 만들기" → `/trips/new`
5. 빈/로딩/에러: empty(생성버튼·필터 숨김 + 전용 CTA) / 스켈레톤 / 재시도 안내. 빈 그룹은 렌더 안 함

### 03 여행 생성
1. "다음" → 현재 step **부분 검증**(`createTripSchema` partial) 통과 시 진행, 실패 시 에러 배너+인라인
   - Step1: 제목 필수 / Step2: 기간 필수(종료<시작이면 시작 재설정, N박N일 계산) / Step4: 템플릿 모드 시 템플릿 선택 필수 / Step3: 검증 없음(선택)
2. "이전" → 입력 유지·에러 초기화
3. Step1 아이콘/커버/제목/지역 변경 → 라이브 프리뷰 즉시 반영
4. Step3 이메일 추가/제거·역할 토글(**기본 편집(editor)** / 뷰어)·**초대 링크 복사**(MVP는 링크 복사 중심, 실메일 발송 후속)
5. Step4 빈 여행/템플릿(정적 시드 3종) 선택
6. 마지막 "여행 만들기" → 전체 검증 → `useCreateTrip` → 생성 오버레이 → 성공 시 `/trips/[id]`
7. 닫기(X) → `/trips`(입력 폐기 — dirty 시 `components/ui/ConfirmDialog`로 폐기 확인[D], 노출 여부는 미결)

## 6. 권한 분기
- 생성자 = **owner**(서버 강제). 03 멤버 초대 role은 editor/viewer만.
- 02 카드의 **역할 배지(owner/editor/viewer)** 는 `my_role` 표시용 — 실제 편집 권한은 워크스페이스/서버에서 강제(계약 §6).
- 두 화면 모두 보호 라우트: 비로그인 → `/` 리다이렉트(서버 세션). 타인 여행은 RLS로 목록에 미포함.

## 7. UI 카피 인벤토리
- 02: "내 여행" · "N개의 여행 · 예정 N · 지난 N" · "새 여행 만들기" · "예정/지난/전체" · "최근 출발 순" · 빈상태 "아직 떠날 여행이 없어요" / "첫 여행 만들기" · 그룹 "예정된 여행"
- 03: "새 여행 만들기" · 스텝 "여행 정보/여행 기간/멤버 초대/시작 방식" · "N박 N일" · "이전/다음/여행 만들기" · "빈 여행으로 시작/템플릿 복제로 시작"
- 검증: "여행 제목을 입력해 주세요" / "시작일과 종료일을 선택해 주세요" / "복제할 템플릿을 선택해 주세요"
> 카피는 `lib`의 메시지 상수로 모아 하드코딩 분산 방지.

## 8. 폴더·네이밍 매핑
```
src/
├─ app/(app)/
│  ├─ (main)/layout.tsx          # [F2] AppHeader — 목록형 전용 그룹
│  │  ├─ trips/page.tsx          # 02
│  │  ├─ trips/new/page.tsx      # 03
│  │  └─ settings/page.tsx       # 09 (AppHeader 공유)
│  └─ trips/[id]/                # 워크스페이스 — (main) 밖, AppHeader 미상속(자체 WorkspaceTopBar)
├─ features/trip/
│  ├─ components/                # TripList, TripCard, TripFilterBar, TripsHeader, TripsEmpty,
│  │                             # CreateTripWizard, WizardStepper, StepTripInfo/Dates/Members/StartMode
│  ├─ api/                       # useTripsQuery, useCreateTrip (TanStack Query)
│  └─ schema/                    # createTripSchema (Zod, 단계별 partial + 최종 전체)
├─ components/ui/                # shadcn: 입력·버튼·세그먼트·드롭다운·캘린더·선택카드·아바타
├─ lib/                          # 날짜 셀렉터(nights/dday/past), 메시지 상수, 카테고리/색 토큰 매핑
└─ types/                        # 데이터 계약 생성 타입 파생(중복 정의 금지)
```
- 역할 배지·멤버 아바타 묶음은 04 등과 공유 → `components/ui` 또는 `features/member`로 승격(중복 금지).

## 9. 개발 인계 · 미결
**기준 자료**: `데이터모델_계약.md`(trip/trip_member/template/enum), 기획 02·03, 시안 `내 여행 목록.dc.html`·`새 여행 만들기.dc.html`.

**확정 반영**
- 커버 = **색+아이콘 고정**(이미지 업로드 없음) — `trip.cover_color`/`cover_icon`만
- 검색 = 제목 + 장소(클라 필터)
- 템플릿 = 정적 시드 3종 복제(관리 UI 없음, `start_mode='template'`)
- 초대 = 링크 복사 중심(실메일 발송 후속)

**미결(프론트/구현 시)**
- 캘린더 임의 연·월 이동 + 과거 날짜 허용 정책(시안은 단일 월) — 타임존 기준 적용
- 닫기 시 변경 폐기 확인 모달 노출 여부
- 나라/지역: 자유 텍스트 vs Google Places 자동완성(구글맵 설계와 함께)
- `dday`/파생값 서버 포함 vs 클라 셀렉터 — 타임존 일관성 확인 후 확정
