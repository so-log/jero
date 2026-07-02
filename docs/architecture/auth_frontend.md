# auth — 프론트엔드 설계 (01 로그인 / 랜딩 + 비밀번호 재설정)

> 데이터 계약(`데이터모델_계약.md`)의 `profile` + Supabase Auth 위에서, 비로그인 진입·인증·세션 확립을 담당하는 화면 설계. 기획 `01_로그인_랜딩.md` 기준. **GATE 2 대상.**

## 1. 개요
- **대상 화면**: 01 로그인 / 랜딩, 비밀번호 재설정(신규 시안 없이 기존 인증 패널 재사용)
- **라우트**:
  - `/` · `/login` — 좌측 랜딩 + 우측 인증 패널(로그인/회원가입 모드). 로그인 상태면 `/trips` 리다이렉트
  - `/reset-password` — 재설정 메일 링크 진입 → 새 비밀번호 설정(인증 패널 컴포넌트의 mini 변형)
- **목적**: 신규/기존 사용자를 인증해 워크스페이스(`/trips`)로 진입시키고, 비로그인자에게 가치를 전달한다.

## 2. 컴포넌트 트리
```
app/(auth)/layout.tsx                  // 공개 레이아웃(인증 불필요), 로그인 시 /trips 리다이렉트 가드
├─ app/(auth)/page.tsx  (= /)  ──┐     // ※ 둘 다 (auth) 그룹 안 — 공개 레이아웃·리다이렉트 가드 적용
├─ app/(auth)/login/page.tsx     ┘     // 동일 화면 진입점(루트/login 공유)
│   └─ features/auth/components/AuthScreen
│        ├─ AuthLandingPanel           // 좌측: 로고·가치 배지·헤드라인·기능 하이라이트 3종 (정적)
│        └─ AuthPanel                  // 우측: 모드(login/signup) 컨테이너
│             ├─ SocialAuthButton      // "Google로 계속하기"
│             ├─ AuthDivider           // "또는 이메일로"
│             ├─ AuthForm              // RHF + zodResolver(authSchema)
│             │    ├─ ui/Input (name?·email·password[보기토글])
│             │    ├─ ui/FormMessage   // 필드 인라인 에러
│             │    └─ ui/Button (제출)
│             ├─ AuthModeToggle        // 로그인 ↔ 회원가입
│             ├─ ForgotPasswordLink    // 로그인 모드만 → /reset-password 요청
│             ├─ GuestPreviewLink      // "공유 링크로 둘러보기" → 데모(08)
│             └─ AuthLoadingOverlay    // 처리 중 스피너 + 문구
└─ app/reset-password/page.tsx
     └─ features/auth/components/ResetPasswordScreen
          ├─ (요청 단계) ResetRequestForm   // 이메일 입력 → 재설정 메일 발송
          └─ (설정 단계) ResetPasswordForm  // 새 비밀번호 입력 (AuthPanel 토큰·필드 재사용)
```
- 공통 입력/버튼/오버레이는 `components/ui`(shadcn). 색·간격은 `@theme` 토큰만(하드코딩 금지).
- 좌측 랜딩은 정적 — 서버컴포넌트 가능. 우측 패널·폼은 클라이언트 컴포넌트.

## 3. 상태 경계
- **서버상태(TanStack Query)**: 인증 동작은 조회가 아니라 **뮤테이션** 중심. 세션/현재 사용자는 Supabase Auth 세션에서 파생(아래).
- **클라/UI 상태(로컬 `useState`/RHF)**: 폼 입력값, 모드(login/signup), 비밀번호 보기 토글, 제출 로딩, 인라인 에러. **Zustand 불필요**(화면 국소 상태).
- **세션**: Supabase Auth. **HttpOnly·Secure·SameSite 쿠키**로 서버가 발급/검증(클라가 토큰 직접 보관 금지). Next 미들웨어/서버에서 세션 확인 → 보호 라우트·리다이렉트 판정.
- **현재 사용자**: 서버 컴포넌트/미들웨어에서 세션 → `profile` 조회. 클라에서 필요 시 `useSessionQuery`(읽기 전용 파생)로 노출하되, 인증 분기의 신뢰 경계는 항상 서버.

## 4. 쿼리·뮤테이션 매핑 (`features/auth/api`)
| 훅 | 종류 | 동작 | 데이터 계약 |
|---|---|---|---|
| `useSignInWithPassword` | mutation | 이메일·비번 로그인 → 세션 확립 | Supabase Auth → `profile`(id·email) |
| `useSignUp` | mutation | 가입(name·email·비번) → `profile` 생성 | `profile`(name·email·avatar_color 기본) |
| `useSignInWithGoogle` | mutation | OAuth 시작(소셜) → 콜백 → 세션 | Supabase OAuth |
| `useRequestPasswordReset` | mutation | 재설정 메일 발송(이메일) | Supabase Auth(메일) |
| `useUpdatePassword` | mutation | 새 비밀번호 설정(재설정 토큰 컨텍스트) | Supabase Auth |
| `useSignOut` | mutation | 로그아웃(세션 종료) | — |
| `useSession` | query(파생) | 현재 세션/사용자 노출(읽기) | `profile` |
- 컴포넌트 직접 fetch 금지 — 위 훅 경유. 성공 시 세션 쿼리 무효화 + 라우팅.
- `profile` 신규 필드 발명 금지: 가입 시 `name`/`email` 채우고 `avatar_color`는 기본 팔레트에서 부여(상세는 미결 §9), `default_currency='KRW'`·`notif_*` 기본은 계약 기본값.

## 5. 인터랙션 시나리오
1. **모드 토글**(로그인 ↔ 회원가입): 필드 전환(가입=`name` 추가)·문구 변경·**기존 에러 초기화**·RHF reset.
2. **Zod 검증(클라, UX용)**: 제출 시 `authSchema` — 이메일 정규식, 비밀번호 길이 ≥ 6. 실패 → 필드별 `FormMessage` 인라인 에러 + 제출 차단. **신뢰 경계는 서버**(서버 재검증).
3. **로딩 오버레이**: 제출 → `AuthLoadingOverlay`(로그인 "로그인하는 중…" / 가입 "계정을 만드는 중…"), 중복 제출 차단(버튼 disable).
4. **서버 실패(일반화)**: 자격 불일치·중복 이메일 등 → **계정 존재 여부를 드러내지 않는 일반화 메시지**(§8.5). 패널 상단 또는 폼 영역에 표시.
5. **성공 리다이렉트**: 로그인/가입/소셜 성공 → 세션 확립 → `/trips`(서버에서 리다이렉트).
6. **비밀번호 재설정 플로우**(신규 시안 없음):
   - 로그인 모드 "비밀번호를 잊으셨나요?" → 이메일 입력(`ResetRequestForm`) → `useRequestPasswordReset` → "메일을 확인해 주세요" 안내(일반화).
   - 메일 링크 → `/reset-password` → `ResetPasswordForm`(AuthPanel 필드·토큰 재사용) → `useUpdatePassword` → 성공 시 로그인/`/trips`.
7. **둘러보기**: "공유 링크로 둘러보기" → **데모 여행**(08 뷰어, 읽기 전용). 01 §확정과 연결.
8. **이미 로그인됨**: `/`·`/login` 접근 시 폼 미표시, `/trips` 리다이렉트(서버 판정).

## 6. 권한 분기
- 이 화면은 **인증 이전** — owner/editor/viewer 역할 분기 없음. 분기 축 = **인증 상태**(비로그인=폼 / 로그인됨=리다이렉트).
- **보호 라우트 가드는 서버**(미들웨어/서버 컴포넌트 세션 검증, 데이터 계약 §RLS). 클라 라우팅만으로 접근 제어하지 않음.
- "둘러보기" 비로그인 열람자는 토큰 스코프 **읽기 전용 뷰어**로만 동작(08). 권한은 서버 강제.

## 7. UI 카피 인벤토리 (시안 문구)
- 가치 배지: "함께 만드는 여행" / 헤드라인: "친구들과 함께 짜는 여행 계획, 한 곳에서."
- 기능 하이라이트: 실시간 협업 / 순서·동선 정리 / 예산·더치페이
- 모드 타이틀: 로그인 "다시 오신 걸 환영해요" ↔ 회원가입 "제이로 계정 만들기"
- 버튼: "Google로 계속하기" / 구분선 "또는 이메일로" / 제출 "로그인" · "가입하고 시작하기"
- 링크: "비밀번호를 잊으셨나요?" / "공유 링크로 둘러보기"
- 검증 에러: "올바른 이메일 주소를 입력해 주세요" / "비밀번호는 6자 이상이어야 해요"
- 로딩: "로그인하는 중…" / "계정을 만드는 중…"

## 8. 폴더·네이밍 매핑
```
src/
├─ app/
│  ├─ (auth)/layout.tsx                 // 공개 레이아웃 + 로그인 시 리다이렉트
│  ├─ (auth)/page.tsx, (auth)/login/page.tsx   // (auth) 그룹 안, 라우팅만·AuthScreen 렌더
│  └─ (auth)/reset-password/page.tsx
├─ features/auth/
│  ├─ components/  AuthScreen, AuthLandingPanel, AuthPanel, AuthForm,
│  │               SocialAuthButton, AuthModeToggle, ForgotPasswordLink,
│  │               GuestPreviewLink, AuthLoadingOverlay,
│  │               ResetPasswordScreen, ResetRequestForm, ResetPasswordForm
│  ├─ api/         useSignInWithPassword, useSignUp, useSignInWithGoogle,
│  │               useRequestPasswordReset, useUpdatePassword, useSignOut, useSession
│  └─ schema/      authSchema (login·signup·resetRequest·resetPassword 변형)
└─ components/ui/  Input, Button, FormMessage, Spinner/Overlay (shadcn)
```
- 의존 방향: `app → features/auth → (components/ui, lib, types)`. 타 도메인 직접참조 금지.
- 타입: 데이터 계약 생성 타입(`Database['public']['Tables']['profile']`) 파생. 응답 타입 중복 정의 금지.

## 9. 개발 인계 · 미결
**확정(계약 반영):**
- 인증 백엔드 = **Supabase Auth**(소셜 Google + 이메일·비번, HttpOnly 쿠키 세션, RLS 연동).
- 비밀번호 재설정 = **MVP 포함**, 신규 시안 없이 AuthPanel 컴포넌트·`@theme` 토큰 재사용.
- 이메일 인증(가입 시 verification) = **MVP 제외**. 둘러보기 = 데모 여행(08).

**미결(구현/후속에서 확정):**
- `avatar_color` 가입 시 자동 부여 규칙(팔레트 순환 vs 랜덤) — 데이터 계약 `profile.avatar_color` 기준.
- 재설정 메일 링크의 Supabase redirect URL·세션 핸드오프 상세(`/reset-password` 토큰 처리).
- rate limit(가입·로그인·재설정 발송) 적용 위치(§8.7) — 서버/Supabase 정책.
- "둘러보기" 도착 데모 여행/토큰 준비(08 share_link 시드)와의 연결.
