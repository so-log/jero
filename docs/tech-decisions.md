# 기술 선택 근거 보고서 — 제이로(jero) 스택 결정과 현업(B2B) 대비

## 문서 정보

| 항목 | 내용 |
|---|---|
| 목적 | 제이로에 채택한 프론트엔드 스택의 선택 근거를, 현업 B2B 보안 솔루션(SolidStep CVE)의 실제 스택·운영 방식과 대비하여 서술한다. |
| 범위 | 프레임워크 · 상태관리 · 스타일 · 데이터 계층 · 형상관리/배포. |
| 근거 | 양 저장소의 `package.json`, git 브랜치·태그 이력, `.gitlab-ci.yml`을 직접 확인한 사실에 기반한다. |
| 작성일 | 2026-07-08 |

---

## 1. 요약

제이로의 스택 선택은 유행이 아니라 **프로젝트 제약의 결과**다. 현업(CVE)과 제이로는 배포·협업 제약이 정반대이므로 최적 스택도 달라진다.

| 영역 | 현업 — SolidStep CVE (B2B) | 제이로 — jero (포트폴리오) | 판단 기준 |
|---|---|---|---|
| 성격 | 온프렘 납품, 고객사 버전별 배포, 팀·PL | SaaS, 실시간 협업, 단독 개발 | 안정성 vs 속도 |
| 프레임워크 | CRA(react-scripts 5), React 18 | Next.js 16(App Router), React 19 | 백엔드 협업·초기 렌더 |
| 상태관리 | Redux Toolkit + react-redux | Zustand + TanStack Query | 서버/클라 상태 분리 |
| 스타일 | styled-components + SCSS(sass) | Tailwind v4 + shadcn/ui | 토큰 단일화·유지보수 |
| 데이터 통신 | axios 수동 + Redux thunk | TanStack Query + 타입 계약 | 캐시·무효화 표준화 |
| 형상관리 | git-flow(`develop`+`feature/SSCVE-<JIRA>`) | GitHub-flow(`feature/*`→PR→`main`) | 릴리스 게이트 vs 연속 배포 |
| CI/CD | GitLab CI(사내 러너→온프렘 복사→Slack) | Vercel 자동 배포, 게이트=로컬 `yarn run check` | 폐쇄망 vs 클라우드 |

**결론 요지**: 현업은 다수 고객사에 버전으로 납품·운영하는 제약(온프렘·버전 스냅샷·팀 릴리스 게이트) 위에서 **안정성**을 우선했고, 제이로는 그 제약이 없는 자리에서 **개발 속도·개발자 경험(DX)·실시간·서버 경계 보안**을 얻기 위해 반대 방향을 택했다. 두 방식 모두 각 제약에 부합하는 합리적 선택이다.

---

## 2. 배경 — 선택은 제약의 함수다

- **현업(CVE)**: 취약점 진단·관리 솔루션을 고객사 온프렘 서버에 **버전으로 납품**한다. 인터넷이 없는 사내망, 고객사마다 다른 버전이 동시 운영되며, 롤백이 가능해야 하고, 다수 인원이 장기간 이어 개발한다. → **예측 가능성·안정성·추적성**이 최우선이다.
- **제이로**: 단일 SaaS를 클라우드(Vercel)에 배포하며 항상 최신 버전 하나만 존재한다. 실시간 협업이 제품의 핵심이고 단독 개발이다. → **개발 속도·DX·최신 역량 증명**이 최우선이다.

이하의 모든 선택은 이 제약 차이에서 도출된다.

---

## 3. 프레임워크 — CRA(SPA) → Next.js 16

### 3.1 현황

현업은 `react-scripts`(CRA) 기반 순수 SPA다. 빌드 산출물(`client/build`)을 온프렘 서버 정적 경로에 복사해 서빙하며, 백엔드는 별도 팀이 API 서버로 운영한다. 브라우저는 빈 HTML을 받은 뒤 JS 번들을 내려받아 실행해야 첫 화면이 그려진다(blank → hydrate).

### 3.2 선택과 근거

제이로는 Next.js 16(App Router)을 채택했다. 근거는 두 가지다.

첫째, **백엔드와 함께 작업하는 구조**다. 이번 프로젝트는 인증·데이터·실시간(Supabase)을 프론트가 직접 엮는다. Next의 미들웨어 라우트 가드와 서버 컴포넌트·서버 라우트를 이용해 인증을 **서버 경계에서 강제**할 수 있다. CRA에는 이 경계가 없어 보호 로직이 전부 클라이언트에 존재한다("UI에서 감추는 것은 보안이 아니다"라는 원칙과 배치된다).

둘째, **초기 렌더가 중요한 서비스**다. 공유 링크처럼 "열면 바로 내용이 보여야" 하는 화면은 서버에서 HTML을 그려 보낸다. CRA의 blank → hydrate와 달리 첫 페인트가 빠르고, 미인증 접근은 서버에서 즉시 리다이렉트된다.

```
현업(CRA):   요청 → 빈 index.html → 번들 다운로드 → 실행 → 데이터 fetch → 첫 화면
제이로(Next): 요청 → 서버가 세션 검증·데이터 반영한 HTML → 즉시 첫 화면 → hydrate
```

### 3.3 코드 대비 — 인증 가드의 위치

```ts
// 현업(CRA): 클라이언트에서만 판정. 번들이 로드된 뒤에야 동작한다.
function PrivateRoute({ children }) {
  const token = useSelector((s) => s.auth.token);
  return token ? children : <Navigate to="/login" />;
}

// 제이로(Next): 서버 미들웨어. 페이지 JS가 내려가기 전에 리다이렉트한다.
// src/middleware.ts
export async function middleware(req: NextRequest) {
  const { data } = await supabase.auth.getUser();
  if (!data.user && isProtected(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
}
```

### 3.4 트레이드오프

CRA는 빌드 산출물이 정적 파일이라 온프렘 폐쇄망에 복사만 하면 되는 단순함이 있다. Next의 서버 런타임은 그 환경에서는 오히려 부담이 될 수 있다. 제이로는 클라우드 배포이므로 이 부담이 없어 Next의 이점만 취한다.

---

## 4. 상태관리 — Redux Toolkit → Zustand + TanStack Query

### 4.1 현황

현업은 `@reduxjs/toolkit` + `react-redux`를 사용한다. 전역 스토어에 서버 응답 데이터와 UI 상태가 함께 담기고, 비동기는 `createAsyncThunk`로 pending/fulfilled/rejected 상태를 직접 관리한다. 대규모·다인원 환경에서 흐름이 단방향으로 강제되고 추적이 쉽다는 장점이 있으나, 화면 하나를 붙이는 데 slice·action·thunk·selector의 보일러플레이트가 크다.

### 4.2 선택과 근거

제이로는 **"서버 상태와 클라이언트 상태는 성격이 다르며, 각기 다른 도구가 적합하다"**는 원칙으로 두 계층을 분리했다.

- **서버 상태**(여행·장소·예산·멤버): **TanStack Query**. 캐시·재검증·로딩/에러·낙관적 업데이트·무효화가 내장되어, thunk로 직접 구현하던 비동기 상태기계를 대체한다.
- **클라이언트 상태**(활성 Day·필터·선택 ID 등 순수 UI): **Zustand**. 프로바이더·액션 타입 없이 경량 스토어로 관리한다.

### 4.3 코드 대비 — "목록 로드 + 순서 변경"

```ts
// 현업(RTK): slice + thunk + selector, 서버 상태를 전역 스토어에 수동 관리
const fetchPlaces = createAsyncThunk("places/fetch", (tripId) =>
  axios.get(`/api/trips/${tripId}/places`).then((r) => r.data),
);
const slice = createSlice({
  name: "places",
  initialState: { items: [], loading: false, error: null },
  reducers: { reorder(state, { payload }) { /* 순서 재배치 직접 구현 */ } },
  extraReducers: (b) => {
    b.addCase(fetchPlaces.pending,   (s) => { s.loading = true; });
    b.addCase(fetchPlaces.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; });
    b.addCase(fetchPlaces.rejected,  (s, a) => { s.loading = false; s.error = a.error; });
  },
});
```

```ts
// 제이로: 서버 상태는 Query 훅(로딩·에러·캐시 내장), 순서 변경은 낙관적 업데이트
export function usePlacesQuery(tripId: string) {
  return useQuery({ queryKey: ["places", tripId], queryFn: () => fetchPlaces(tripId) });
}
export function useReorderPlaces(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderOnServer,
    onMutate: async (next) => {                       // 낙관적: 리스트·지도 즉시 반영
      await qc.cancelQueries({ queryKey: ["places", tripId] });
      const prev = qc.getQueryData(["places", tripId]);
      qc.setQueryData(["places", tripId], applyReorder(prev, next));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(["places", tripId], ctx.prev), // 롤백
    onSettled: () => qc.invalidateQueries({ queryKey: ["places", tripId] }), // 재동기화
  });
}
// UI 상태는 별도 Zustand
const useWorkspaceStore = create((set) => ({
  activeDay: 1, selectedId: null,
  setActiveDay: (d) => set({ activeDay: d, selectedId: null }),
}));
```

### 4.4 효과

화면당 코드량이 감소하고(비동기마다 pending/fulfilled/rejected를 반복 구현하지 않는다), 로딩·에러·캐시가 표준화된다. 나아가 이 구조는 **실시간과 자연스럽게 결합**한다. Realtime의 `postgres_changes` 이벤트 수신 시 동일 쿼리 키를 `invalidate`하면 화면이 재동기화된다. Redux였다면 수신 이벤트를 다시 reducer로 흘려보내는 경로를 별도로 구현해야 한다.

### 4.5 트레이드오프

Redux의 강한 단방향 흐름, 미들웨어 생태계, 타임트래블 디버깅은 대규모 팀에서 여전히 강점이다. 제이로 규모(단독·도메인 응집)에서는 그 무게가 이득을 넘어서 제외한 것으로, 도구의 우열 문제가 아니다.

---

## 5. 스타일 — styled-components·SCSS → Tailwind v4

### 5.1 현황

현업은 `styled-components`(런타임 CSS-in-JS)와 `sass`를 병용한다. 컴포넌트마다 styled 정의를 만들고, 공통 값은 SCSS 변수·믹스인과 테마 객체로 공유한다.

### 5.2 선택과 근거

제이로는 Tailwind v4 + shadcn/ui를 채택했다. 유지보수·생산성 관점의 근거는 네 가지다.

1. **컨텍스트 전환 감소** — styled-components는 JSX와 별도로 `const Wrapper = styled.div` 정의를 만들고 이름을 부여해야 한다. Tailwind는 마크업 위치에서 클래스로 완결되어 파일·명명 왕복이 사라진다.
2. **디자인 토큰의 단일 출처** — Tailwind v4는 `tailwind.config.js` 없이 `globals.css`의 `@theme`에 CSS 변수로 토큰을 정의한다. 색·간격·카테고리 색을 한 곳에서 관리하고 유틸/변수로만 사용한다(하드코딩 금지). SCSS 변수·테마 객체·styled 프롭으로 분산되던 것을 통합한다.
3. **미사용 CSS 누적 방지** — 클래스는 사용처에만 존재하며 빌드 시 사용분만 남는다. 장기 운영 SCSS의 "이 클래스가 아직 쓰이는가" 문제가 구조적으로 사라진다.
4. **런타임 비용 없음** — styled-components는 런타임에 스타일을 주입하지만 Tailwind는 빌드 타임 정적 CSS이므로 런타임 오버헤드가 없다.

### 5.3 코드 대비

```tsx
// 현업: styled-components — 별도 정의 + 명명 + 런타임 주입
const Card = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.surface};
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
`;
<Card>...</Card>

// 제이로: Tailwind — 마크업 위치에서 완결, 토큰은 @theme 변수
<div className="rounded-xl bg-card p-4 shadow-sm">...</div>
```

```css
/* 제이로: 토큰 단일 출처 — src/app/globals.css */
@theme {
  --color-cat-food: oklch(0.72 0.15 40);   /* 카테고리 색을 한 곳에서 정의 */
  --color-cat-cafe: oklch(0.75 0.12 70);
  --radius-card: 0.75rem;
}
```

### 5.4 트레이드오프

복잡한 동적·상태 기반 스타일이나 강한 캡슐화가 필요한 경우 CSS-in-JS가 더 표현적이다. 제이로는 shadcn/ui와 `cva`(variant) 조합으로 이 요구의 대부분을 충족했다.

---

## 6. 데이터 계층 — axios 수동 → 계약 기반 Query

현업은 `axios`로 직접 호출하고 응답 타입을 클라이언트에서 별도 정의하며, thunk가 스토어에 반영한다.

제이로는 데이터 계약을 **한 곳에서만 정의**하고(Supabase 스키마 + 생성 타입) 프론트·백이 이를 참조한다(응답 타입 재정의 금지). 컴포넌트는 직접 fetch하지 않고 `features/<도메인>/api`의 Query/Mutation 훅만 경유한다. 이 "seam"을 스텁으로 먼저 확정한 뒤 내부만 Supabase로 교체하여, **화면 코드 변경 없이 백엔드를 연동**했다(상세는 루트 README의 트러블슈팅 절 참조).

---

## 7. 형상관리 · 배포 · CI/CD 대비

두 저장소의 실제 설정을 확인해 대비한다.

| 항목 | 현업 (CVE) | 제이로 (jero) |
|---|---|---|
| 통합 브랜치 | `develop`(리뷰 게이트) | `main`(바로 배포) |
| 작업 브랜치 | `feature/SSCVE-<JIRA>` | `feature/*` → PR → squash |
| 릴리스 | `release/2.0.x` 브랜치 + `2.0.x-N` QA 반복 + 고객사 태그 | 태그 없음, 커밋 = 릴리스 |
| 긴급 대응 | `hotfix` 분기 → 배포 → `develop` 백머지 | 해당 없음(항상 최신 하나) |
| CI/CD | GitLab CI(사내 러너 build → 온프렘 복사 → Slack) | Vercel Git 연동 자동 배포 |
| 품질 게이트 | 파이프라인 + 리뷰 | 로컬 `yarn run check`(typecheck+lint+Vitest) |
| 커밋 규약 | `[분류] (SSCVE-XXXX) [모듈] 설명`(한글, JIRA 연동) | Conventional Commits(영어) |

현업 방식이 무거운 것이 아니라, B2B 온프렘 납품에는 그 무게가 적합하다(롤백·고객사별 버전·추적성). 제이로는 그 제약이 없어 경량·연속 배포를 택했다.

---

## 8. 개발 생산성 · DX 평가

정량 수치는 실측으로 보강하는 것이 정확하므로, 여기서는 메커니즘 수준으로 기술한다.

- **화면당 보일러플레이트 감소**: slice·action·thunk·selector 조합이 Query 훅 + 경량 Zustand 스토어로 축소되어 신규 화면 추가 단계가 줄었다.
- **로딩·에러·캐시 표준화**: 비동기마다 상태기계를 수동 관리하지 않아 반복 코드와 실수 여지가 감소했다.
- **초기 페인트**: CRA의 blank → hydrate 대비 Next SSR은 서버 렌더 HTML을 먼저 전달한다(공유 링크·보호 라우트에서 체감차가 크다).
- **스타일 왕복 제거**: 마크업 위치에서 클래스로 완결되고 토큰이 단일 출처이므로 디자인 변경이 한 곳 수정으로 전파된다.
- **계약 우선 seam**: 백엔드 연동 전에 화면을 완성하고 내부만 교체하여 프론트·백 병행 개발 시 대기 시간을 줄이는 구조를 확보했다.

> 번들 크기·Lighthouse·빌드 시간 등 정량 지표를 실측해 첨부하면 설득력이 높아진다(프로덕션 빌드 기준 측정 권장).

---

## 9. 결론

제이로의 스택 선택은 "최신이기 때문"이 아니라 **현업(B2B 온프렘)의 제약이 사라진 자리에서 개발 속도·DX·실시간·서버 경계 보안을 얻기 위한 반대 방향의 합리적 결정**이다. 그 판단의 근거는 4년간 정반대 제약(고객사 버전 납품·git-flow·GitLab CI·온프렘)을 실제로 운영해 본 경험에 있다. **두 방식을 모두 경험했기에 "언제 무엇이 적합한가"를 근거를 들어 설명할 수 있다는 점**이 이 보고서의 결론이다.
