# 시스템 페이지 — 프론트엔드 설계 (system_frontend.md)

> 대상: **11 시스템 페이지** (404 / 에러(500) / 403 / 점검). 기획 `docs/planning/11_시스템_페이지.md`, 계약 `docs/architecture/데이터모델_계약.md` 기준. 단일 `SystemPage` 레이아웃에 상태 설정만 주입한다.

## 1. 개요
- **라우트 아님 — 전역 폴백.** 단일 URL이 없고, Next.js App Router 특수 파일과 점검 플래그로 트리거된다.
- **4상태**: `404`(없는 URL·삭제된 여행) / `error`(렌더 예외·서버 오류) / `403`(인증 비멤버) / `maint`(점검).
- 화면은 모두 동일 레이아웃(최소 상단 바 + 중앙 일러스트 블록). 상태별로 **톤·코드칩·제목·설명·액션·헬퍼만** 다르다.

## 2. 컴포넌트 트리
```
app/not-found.tsx ─────────┐
app/error.tsx (client) ────┤
app/global-error.tsx ──────┼─→ <SystemPage state="..." reset? errorId? />
(워크스페이스 403 분기) ────┘
middleware (점검) ─────────→ /maintenance → <SystemPage state="maint" />

components/system/
  SystemPage.tsx          // 레이아웃 셸: 상단바(로고) + 앰비언트 배경 + 중앙 블록
    ├─ SystemIllustration  // 톤 원형 + 라인 아이콘 + 액센트 배지 (state별 cfg)
    ├─ SystemCodeChip      // 코드 칩
    ├─ SystemActions       // primary/secondary 버튼 (cfg.actions)
    └─ SystemHelper        // 오류코드·예상완료 등 (선택)
```
- `SystemPage`는 `components/system/`에 둔다(특정 도메인 feature 아님, app 특수 파일들이 공유). 도메인 로직 없음 → `features/` 불필요.
- 단일 컴포넌트 + 상태 설정 주입. **상태별로 화면을 따로 만들지 않는다**(중복 구현 금지).

## 3. Next.js 매핑 (App Router · Next 16)
| 상태 | 트리거 | 파일/위치 |
|---|---|---|
| 404 | `notFound()` 호출, 매칭 안 되는 경로, 삭제된 여행 | `app/not-found.tsx` → `<SystemPage state="404" />` |
| error(500) | 렌더/데이터 예외 (세그먼트 경계) | `app/error.tsx` (`'use client'`, `{error, reset}`) → `<SystemPage state="error" reset={reset} errorId={error.digest} />` |
| error(루트) | 루트 레이아웃 자체 예외 | `app/global-error.tsx` (`<html><body>` 포함) → `<SystemPage state="error" reset />` |
| 403 | 인증됐으나 비멤버 여행 접근 | 여행 라우트 가드에서 분기 (§6) |
| maint | 점검 플래그 on | `middleware.ts`가 전 경로를 `/maintenance`로 rewrite → `<SystemPage state="maint" />` |

- `error.tsx`는 **클라이언트 컴포넌트 필수**(`'use client'`), `reset()`으로 재렌더 시도. `SystemPage` 본체는 서버/클라 공용으로 두되, `reset` 핸들러를 받는 액션만 클라에서 주입.
- Next 16 특수 파일 규약(파일명·props·`global-error`의 `<html>/<body>` 요구)이 학습데이터와 다를 수 있으므로, 구현 전 `node_modules/next/dist/docs/` 관련 가이드 확인(CLAUDE.md §2).

## 4. 상태 (단일 상수 주입)
- 4상태는 **토글이 아니라 트리거로 결정**(시안의 상태 스위처는 미리보기용). 런타임에 한 화면이 상태를 바꾸지 않는다.
- 상태 설정을 `lib/constants/system.ts` 단일 상수로:
```ts
// 형태 (값은 시안 기준) — 색은 직접 hex 금지, @theme 토큰 키로 매핑
type SystemStateConfig = {
  code: string;            // 코드 칩 라벨
  toneToken: string;       // 상태 톤 토큰 (blue/amber/purple/green) — @theme
  bigIcon: LucideName; badgeIcon: LucideName;
  title: string; desc: string;
  actions: { label: string; icon: LucideName; kind: 'primary' | 'secondary'; to: ActionTarget }[];
  helper?: 'errorId' | 'maintEta';   // 동적 헬퍼 종류
}
const SYSTEM_STATES: Record<'404'|'error'|'403'|'maint', SystemStateConfig> = { ... }
```
- 동적 값(오류 추적 ID, 점검 예상 완료 시각)만 props로 주입, 나머지는 상수.

## 5. 인터랙션 (액션 버튼 → 목적지)
| 상태 | 버튼 | 동작 |
|---|---|---|
| 404 | 내 여행 목록으로 (primary) | `router.push('/trips')` |
| 404 | 이전으로 (secondary) | `router.back()` (history) |
| error | 다시 시도 (primary) | **`reset()`** (error boundary 재렌더) |
| error | 홈으로 (secondary) | `/trips` |
| 403 | 홈으로 (primary) | `/trips` |
| 403 | 초대 요청 (secondary) | 소유자 접근 요청 (메커니즘 §9 미결 — MVP는 보류/비활성 가능) |
| maint | 상태 페이지 보기 (primary) | 상태/공지 페이지 (목적지 §9 미결) |
| 공통 | 로고 클릭 | 홈 |
- `reset`은 `error.tsx`에서만 유효 → `SystemActions`는 `to: 'reset'`일 때 주입된 `reset` 콜백 호출.
- 전환 애니메이션(fade)·일러스트 float은 시안 토큰 계승(모션은 `@keyframes` 재사용).

## 6. 권한 · 보안
- **403** = 인증된 사용자가 **멤버가 아닌 여행** 접근. 멤버십 판정은 **서버/RLS**(계약 §6) — 클라 라우팅만으로 막지 않는다.
- **401**(비로그인 보호 라우트) = 시스템 페이지가 아니라 **로그인(01) 리다이렉트**.
- 서버는 상황에 맞는 **HTTP 상태코드**(404/500/403) 응답.
- **에러 일반화**: 사용자에겐 일반 문구 + **추적 ID**(`error.digest`)만. 스택·내부 메시지·민감정보 노출 금지(계약 보안, §8.5 정신). 상세는 서버 로깅.
- **403 vs 404 정책**(미결, §9): 기본은 인증 사용자에게 403 노출(존재 인지). 단 비공개성이 중요한 리소스는 404(존재 은폐)로 처리 — 구현 시 라우트별 확정.

## 7. UI 카피 인벤토리 (시안 고정)
| 상태 | 코드칩 | 제목 | 설명 | 헬퍼 |
|---|---|---|---|---|
| 404 | `404 · NOT FOUND` | 길을 잃은 것 같아요 | 주소가 바뀌었거나 삭제된 여행일 수 있어요. | — |
| error | `500 · ERROR` | 잠시 문제가 생겼어요 | 일시적인 오류예요. 잠시 후 다시 시도해 주세요. | 오류 코드 · {digest} |
| 403 | `403 · FORBIDDEN` | 접근 권한이 없어요 | 초대된 멤버만 볼 수 있는 여행이에요. | — |
| maint | `점검 중 · MAINTENANCE` | 잠시 점검 중이에요 | 더 나은 제이로를 위해 업데이트하고 있어요. | 예상 완료 · {eta} |
| 액션 | 404: 내 여행 목록으로 / 이전으로 · error: 다시 시도 / 홈으로 · 403: 홈으로 / 초대 요청 · maint: 상태 페이지 보기 |

## 8. 폴더 · 네이밍 매핑
```
app/
  not-found.tsx          // <SystemPage state="404" />
  error.tsx              // 'use client' — <SystemPage state="error" reset errorId />
  global-error.tsx       // 루트 경계 (<html><body> 포함)
components/system/
  SystemPage.tsx
  SystemIllustration.tsx
  SystemActions.tsx
lib/constants/system.ts  // SYSTEM_STATES 상수 (코드·문구·아이콘·톤 토큰·액션)
middleware.ts            // 점검 플래그 시 /maintenance rewrite
app/maintenance/page.tsx // <SystemPage state="maint" />
```
- 네이밍: 컴포넌트 `PascalCase`, 상수 `SCREAMING_SNAKE` 또는 `SYSTEM_STATES`, 타입 `SystemStateConfig`. (CLAUDE.md §3.2)
- 톤 색·간격·radius는 `@theme` 토큰만(하드코딩 금지). 상태 톤(블루·앰버·퍼플·그린)도 토큰화해 `SYSTEM_STATES`는 hex가 아닌 토큰 키 참조.

## 9. 개발 인계 · 미결
- **403 vs 404 정책**: 라우트별 존재 노출/은폐 결정 (보안 vs UX). 기본 403, 민감 리소스 404.
- **"초대 요청" 메커니즘**: 소유자에게 접근 요청 발송 흐름 — 알림 발송이 MVP 후속이므로(계약 §0) MVP에선 보류/비활성 처리 후보.
- **점검 모드 트리거**: 환경 변수 vs 원격 토글, rewrite 범위.
- **상태/공지 페이지**: "상태 페이지 보기" 목적지(내부 페이지 vs 외부 status) — MVP 포함 여부.
- **오류 추적 ID**: `error.digest` 활용, 에러 모니터링 도구 도입 여부.
- **점검 예상 시각**: 표시 데이터 출처(점검 설정).
- 의존방향: `app`(특수파일) → `components/system` → `lib`. 도메인 feature 의존 없음. 데이터 fetch 없음(정적 + 주입 props).
