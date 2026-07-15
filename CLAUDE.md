# CLAUDE.md — 제이로(jero) 프로젝트 가이드

이 파일은 이 저장소에서 작업하는 Claude(및 협업자)를 위한 기준 문서다.
프로젝트의 목적·스택·구조·작업 방식을 담는다.

---

## 1. 프로젝트 개요

- **이름**: 제이로 (jero) — `J(MBTI 계획형) + 路(길·동선)`, 발음은 "제일로(최고로)".
- **무엇**: 친구들과 함께 여행 일정을 짜고, 장소 순서·동선·예산을 관리하는 **협업 여행 플래너 (웹)**.
- **핵심 차별점**: 위치 저장에 그치지 않고 **순서·동선·예산·역할**까지 여러 명이 함께 관리한다.
- **포트폴리오 목표**: 데이터 밀집 어드민 UI 역량(테이블·필터·차트·워크플로우·권한)을 최신 스택 위에서 소비자 협업 제품으로 보여준다.

자세한 내용은 `docs/spec/기능명세서.md` 참고.

---

## 2. 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | **Next.js 16** (App Router, Turbopack) |
| 런타임 | React 19 |
| 언어 | TypeScript (strict) |
| 스타일 | **Tailwind CSS v4** (CSS-first, `globals.css` 의 `@theme`) + shadcn/ui |
| 클라이언트 상태 | Zustand |
| 서버 상태 | TanStack Query |
| 테이블/가상화 | TanStack Table / Virtual |
| 폼 | React Hook Form + Zod |
| 차트 | Recharts |
| 지도 | **Google Maps** (@react-google-maps/api) — 해외 여행 포함 |
| 린트/포맷 | ESLint 9 (flat config) + Prettier |
| 테스트 | **Vitest + Testing Library**(단위·통합) / **Playwright**(e2e) |
| 패키지 매니저 | **yarn** (1.x) |
| 배포 | Vercel |

> 실시간 협업·인증·DB 백엔드는 설계 단계에서 확정(후보: Supabase).
> **주의 — Next 16 / Tailwind 4 는 학습데이터와 다를 수 있다.** API·규약·파일 구조가 바뀌었으니 코드 작성 전 `node_modules/next/dist/docs/` 관련 가이드를 확인한다(루트 `AGENTS.md` 참조). Tailwind 4 는 `tailwind.config.js` 가 없고 `src/app/globals.css` 의 `@theme` 로 토큰을 정의한다.

### 2.1 공통 커맨드

```bash
yarn install            # 의존성 설치
yarn dev                # 개발 서버 (http://localhost:3000)
yarn build              # 프로덕션 빌드
yarn start              # 빌드 결과 실행

yarn lint               # ESLint
yarn typecheck          # tsc --noEmit (타입체크)
yarn format             # Prettier 포맷 적용
yarn format:check       # 포맷 위반만 검사 (CI용)

yarn test               # Vitest 단위·통합 (1회 실행)
yarn test:watch         # Vitest watch
yarn test:e2e           # Playwright e2e (dev 서버 자동 기동)

yarn check              # typecheck + lint + test 한 번에 (커밋/PR 전 게이트)
```

> shadcn 컴포넌트 추가: `npx shadcn@latest add <component>` → `src/components/ui/` 에 생성.
> Playwright 브라우저: 최초 1회 `yarn playwright install chromium` (이미 설치됨).

---

## 3. 폴더 구조 (목표)

```
jero/
├─ CLAUDE.md                # 이 문서
├─ README.md
├─ docs/
│  ├─ spec/                 # 기능명세서, 화면구조 와이어프레임 (확정 스펙)
│  ├─ planning/             # 페이지별 기획문서 (화면 단위)
│  ├─ design/prototype/     # 클로드 디자인 산출물(HTML 시안) — 참고용
│  └─ architecture/         # 설계문서 (데이터 모델·상태관리·API·폴더 규칙)
└─ src/
   ├─ app/                  # 라우트 (login, trips, trips/[id], share/[token], settings)
   ├─ components/ui/        # shadcn 공통 컴포넌트
   ├─ features/             # 도메인 단위 (trip, place, itinerary, budget, member)
   ├─ lib/                  # google maps, query client, utils
   ├─ store/                # zustand 스토어
   └─ types/                # 공통 타입
```

### 3.1 폴더 규칙

- **`app/`** — 라우팅 전용. 페이지(`page.tsx`)·레이아웃(`layout.tsx`)·로딩/에러(`loading.tsx`, `error.tsx`)만. 비즈니스 로직은 `features/`로 위임한다.
- **`features/<도메인>/`** — 도메인 단위로 응집. 내부 구조 통일:
  ```
  features/trip/
  ├─ components/     # 이 도메인 전용 컴포넌트
  ├─ hooks/          # useXxx (도메인 로직 훅)
  ├─ api/            # 서버 통신 (TanStack Query 쿼리/뮤테이션)
  ├─ store/          # 이 도메인 zustand 슬라이스 (필요 시)
  ├─ types.ts        # 도메인 타입
  └─ index.ts        # 공개 export (배럴)
  ```
- **`components/ui/`** — shadcn 및 도메인 독립 공통 컴포넌트만. 특정 도메인 의존 금지.
- **`lib/`** — 순수 유틸·클라이언트 설정(googleMaps, queryClient, utils). 부수효과 최소화.
- **`store/`** — 전역 zustand 스토어. 도메인 한정 상태는 `features/<도메인>/store/`에.
- **의존 방향**: `app` → `features` → (`components/ui`, `lib`, `types`). 역참조·도메인 간 직접참조 금지(공유가 필요하면 `lib`/`components/ui`로 승격). 가져오기는 `@/` 별칭 사용.

### 3.2 네이밍 규칙

| 대상 | 규칙 | 예 |
|---|---|---|
| 컴포넌트 파일 | PascalCase.tsx | `PlaceCard.tsx` |
| 훅 파일 | camelCase, `use` 접두 | `useItinerary.ts` |
| 유틸/일반 모듈 | camelCase | `formatDate.ts` |
| zustand 스토어 | `xxxStore.ts` | `tripStore.ts` |
| 타입/인터페이스 | PascalCase | `ItineraryItem` |
| 상수 | UPPER_SNAKE_CASE | `MAX_MEMBERS` |
| 라우트 세그먼트 | 소문자/kebab-case | `trips/[id]`, `share/[token]` |
| Zod 스키마 | `xxxSchema` | `expenseSchema` |

> 한 파일당 기본 한 컴포넌트. 배럴(`index.ts`)로 도메인 외부 노출 범위를 통제한다.

---

## 4. 작업 워크플로우 (단계별 진행)

이 프로젝트는 아래 4단계 순서로 진행한다. **각 단계 끝에는 게이트가 있다 — 사용자가 "승인"하기 전에는 다음 단계로 넘어가지 않는다.** (CVE 자산 도메인 파이프라인의 GATE 를 솔로 규모에 맞게 경량화한 것.)

1. **기획문서** (`docs/planning/`)
   - 기능명세서를 기반으로, **페이지(화면) 단위로 쪼개어** 작성한다.
   - 각 문서: 화면 목적 / 사용자·진입경로 / 구성 요소 / 데이터·상태 / 인터랙션 / 권한 / 라우팅 연결.
   - **GATE 1**: 기획 검토 → "기획 승인"
2. **설계문서** (`docs/architecture/`)
   - 데이터 모델, 상태관리 전략, API/백엔드(계약) 방식, 폴더·네이밍 규칙, 구글맵 연동 설계.
   - **GATE 2**: 설계 검토 → "설계 승인"
3. **코드 구현** (`src/`)
   - 설계문서 기준으로 화면·기능 구현. 공통 컴포넌트·디자인 시스템 먼저, 이후 페이지.
   - 구현 중 지속적으로 `yarn typecheck` 로 회귀를 막는다.
4. **검증 및 테스트**
   - `yarn check`(typecheck+lint+`vitest`) + 핵심 플로우 `yarn test:e2e`(Playwright) + `yarn build` 확인.
   - 테스트 우선순위: **데이터 응답 → 화면 렌더링** 검증(컴포넌트 통합 테스트)을 reducer/유틸 단위 테스트보다 먼저.

> 1~2단계는 기획·설계 산출물이 핵심이므로 코드를 작성하지 않는다(잘못된 방향이면 즉시 중단·보고).
> 디자인 시안(`docs/design/prototype/`)은 구현 시 시각 기준으로 참고한다. 그대로 복붙하지 않고 스펙·설계를 따른다.

> **단계별 진행은 전용 에이전트/커맨드로도 가능** — `/jero기획설계`, `/jero구현`, `/jero검증` (아래 §10 참조). 소규모 수정은 커맨드 없이 직접 진행해도 된다.

---

## 5. 문서 지도

| 문서 | 위치 | 역할 |
|---|---|---|
| 기능명세서 | `docs/spec/기능명세서.md` | 무엇을 만드는가 (기능·범위·데이터·권한) |
| 화면구조 와이어프레임 | `docs/spec/화면구조_와이어프레임.md` | 어떤 화면에 무엇이 들어가는가 |
| 페이지별 기획문서 | `docs/planning/*.md` | 화면 단위 상세 기획 |
| 설계문서 | `docs/architecture/*.md` | 어떻게 구현하는가 |
| 디자인 시안 | `docs/design/prototype/` | 시각 참고 (HTML) |

---

## 6. 디자인 원칙 (구현 시 준수)

- **톤**: 밝고 가벼우면서 깔끔한 느낌. iOS 캘린더처럼 정돈됨. 둥근 모서리, 부드러운 그림자, 넉넉한 여백, 파스텔 포인트 컬러. 상업용 SaaS 수준 완성도.
- **이모지 사용 금지.** 아이콘은 라이선스 허용 무료 세트(Lucide 등) **하나**를 일관되게 사용.
- 카테고리(식당/카페/기념품/쇼핑/박물관/숙소/기타)는 서로 구분되는 아이콘.
- 정보 밀도 높은 영역(지도·일정·대시보드)도 가독성 우선.
- 데스크톱 1280px 우선 + 반응형(태블릿/모바일).

---

## 7. 컨벤션

- **커밋**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`).
- **브랜치 (필수)**: **`main`에 직접 커밋·push 절대 금지.** 모든 작업은 `feat|fix|test|docs/<주제>` 브랜치에서 → 브랜치 push → PR(`gh pr create`). `main` 머지는 사용자가 한다(셀프 리뷰·squash).
- **코드**: TypeScript strict, ESLint/Prettier 준수. 컴포넌트는 `features/` 도메인별로, 공통은 `components/ui`.
- **언어**: 코드·커밋은 영어, 문서·주석은 한국어 가능.

### 7.1 가드레일 (작업 시 준수)

- **브랜치 필수 (main 직행 금지)**: `main`에서 직접 작업·커밋·push 하지 않는다. 새 작업은 반드시 `feat|fix|test|docs/<주제>` 브랜치를 파고(`git checkout main && git pull && git checkout -b <브랜치>`), 커밋·push는 그 브랜치에만(`git push -u origin <브랜치>`). PR로 올리고 머지는 사용자가 한다. **커밋 전 현재 브랜치가 main이 아닌지 확인.**
- **요청 범위 고수**: 요청에 없는 리팩토링·포맷팅-only 변경·import 정리·변수명 일괄 변경을 임의로 하지 않는다.
- **기존 시그니처 보호**: 이미 쓰이는 공용 함수·훅·컴포넌트의 props/리턴 타입을 깨지 않는다(특히 `lib/`, `components/ui`). 확장은 additive 로.
- **타입 안전성**: `any`·비검증 `unknown` 금지. 구체 타입을 정의한다.
- **API 호출 경로**: 컴포넌트에서 직접 fetch/axios 금지. 데이터 통신은 `features/<도메인>/api/`(TanStack Query 쿼리·뮤테이션) 경유.
- **스타일 일관성**: Tailwind v4 + shadcn 토큰 사용. 색·간격을 하드코딩하지 말고 `@theme` 토큰/유틸을 쓴다. 새 스타일 방식(별도 CSS-in-JS 등) 임의 도입 금지.
- **잘못된 방향 감지 시**: 즉시 중단하고 사용자에게 보고한다.

### 7.2 계약서(contract) 단일 출처

- 프론트·백엔드(또는 BaaS)가 공유하는 **데이터 계약은 한 곳에서만 정의**하고 양쪽이 그것을 참조한다.
- **Supabase 채택 시**: DB 스키마 + 생성된 타입(`supabase gen types typescript`)이 계약서다. 응답 타입을 클라이언트에서 손으로 다시 정의하지 않는다.
- 화면별 응답 예시는 설계문서(`docs/architecture/`)에 적고, 그 예시를 테스트 fixture 로 재사용한다.

---

## 8. 보안 규칙

> 협업·인증·공유·외부 API(구글맵)를 다루므로 보안은 기능과 동급으로 취급한다.
> **UI에서 감추는 것은 보안이 아니다 — 권한은 항상 서버에서 강제한다.**

### 8.1 시크릿 / 환경변수
- 시크릿·키는 **절대 커밋 금지**. `.env*`는 `.gitignore`에, 예시는 `.env.example`로만 공유.
- `NEXT_PUBLIC_` 접두는 **클라이언트에 노출돼도 되는 값에만** 사용. 서버 키/시크릿에는 절대 붙이지 않는다.
- Google Maps API 키: HTTP referrer(도메인) 제한 + 사용 API 범위 제한을 콘솔에서 건다. 키 노출을 전제로 방어한다.

### 8.2 인증 / 인가 (authorization)
- 모든 보호 라우트·뮤테이션은 **서버에서 세션을 검증**한다. 클라이언트가 보낸 역할/소유 여부를 신뢰하지 않는다.
- 모든 데이터 접근은 **요청자가 해당 Trip의 멤버인지 + 역할(owner/editor/viewer)** 을 서버에서 확인한 뒤 수행.
- Supabase 채택 시 **RLS(Row Level Security)** 로 행 단위 접근을 DB에서 강제(애플리케이션 체크와 이중화).
- 공유 링크 토큰: **읽기 전용 권한으로 스코프**, 추측 불가능한 토큰(충분한 엔트로피), **만료·폐기(재발급)** 가능하게 설계.

### 8.3 입력 검증 / 출력 처리
- **Zod로 클라이언트와 서버 양쪽 검증**(클라 검증은 UX, 신뢰 경계는 서버). 서버는 들어온 모든 입력을 재검증.
- 사용자 입력(메모·일기·장소명 등) 렌더링 시 **XSS 방지**: `dangerouslySetInnerHTML` 지양, 불가피하면 sanitize.
- 파일/이미지(영수증·사진, phase 2/앱): 타입·크기 검증, 신뢰 못 할 원본 직접 노출 금지, 서명된 URL 사용.

### 8.4 전송 / 세션 / 헤더
- HTTPS 전용. 인증 쿠키는 `HttpOnly` + `Secure` + `SameSite`.
- 상태 변경 요청은 GET 금지(부수효과 없는 GET 원칙), CSRF 방어(SameSite/토큰).
- 보안 헤더 적용: CSP, `X-Content-Type-Options`, `Referrer-Policy`, frame 보호 등(next.config/헤더).

### 8.5 데이터 노출 / 로깅
- API 응답은 **요청자가 볼 권한이 있는 필드만** 반환(다른 멤버의 이메일 등 과다 노출 금지).
- 로그·에러 메시지에 **시크릿·토큰·PII 출력 금지**. 클라이언트 에러는 일반화된 메시지로.

### 8.6 의존성 / 공급망
- 의존성 최소화, 정기 `yarn audit` 및 업데이트. 락파일(`yarn.lock`) 커밋.
- 신뢰할 수 없는 서드파티 스크립트 임의 추가 금지.

### 8.7 남용 방지 (운영)
- 초대·공유 링크 발급, 인증 시도 등에 rate limit 고려.
- 멤버 제거/권한 변경 등 민감 동작은 소유자만, 서버에서 재확인.

---

## 9. 현재 진행 상태

- [x] 기능명세서 / 와이어프레임 확정 (`docs/spec/`)
- [x] 디자인 시안 생성 (클로드 디자인) → `docs/design/prototype/`에 보관
- [x] 프로젝트 스캐폴드 + 기본 셋팅 (Next 16 / Tailwind 4 / ESLint·Prettier / Vitest·Playwright / shadcn) — `yarn check` · `yarn build` green
- [ ] **기획문서 작성 (진행 중)** — 페이지별
- [ ] 설계문서
- [ ] 코드 구현
- [ ] 검증 및 테스트

---

## 10. 에이전트 / 트리거 커맨드

단계별 진행을 도와주는 **경량 에이전트 3종** (`.claude/agents/`). 각 단계 끝에서 사용자 "승인" 게이트를 거친다. 소규모 수정은 커맨드 없이 직접 진행해도 된다.

| 단계 | 에이전트 | 커맨드 | 산출물 |
|---|---|---|---|
| 기획+설계 | `jero-planning-design` | `/jero기획설계` | `docs/planning/*.md`, `docs/architecture/*.md` |
| 구현 | `jero-frontend-dev` | `/jero구현` | `src/**` (features 단위 컴포넌트·훅·스토어) |
| 검증 | `jero-qa-test` | `/jero검증` | Vitest/Playwright 테스트 + `yarn check`·`build` 결과 |

> CVE/PMS 의 14개 풀 파이프라인을 솔로 포트폴리오 규모에 맞게 3종으로 압축한 것. GATE·zone 격리 같은 다중 에이전트용 machinery 는 의도적으로 생략했다.
