# 09 계정 설정 — 프론트엔드 설계 (account_frontend.md)

> 데이터 계약(`데이터모델_계약.md`)의 `profile` 테이블을 단일 출처로, 09 기획의 프로필·기본설정·계정관리 3섹션을 구현하는 설계. 코드 미작성, 설계만.

## 1. 개요
- **라우트**: `/settings` — **보호 라우트**(미인증 → `/`(01) 리다이렉트, 서버 세션 검증 §8.2).
- **구성**: 단일 페이지 + 좌측 섹션 nav. 3섹션 = **프로필 / 기본 설정 / 계정 관리**. 하단 고정 **저장 바**.
- **본인 계정만** 조회·수정. 이메일은 읽기 전용.
- 저장 모델: **명시적 저장**(dirty → "변경사항 저장", "되돌리기"=reset). 저장 상태 4종(idle/saving/saved/error).

## 2. 컴포넌트 트리
```
app/(app)/(main)/settings/page.tsx    // [F2] (main) 그룹 — AppHeader 공유, 보호 라우트, profile prefetch
└─ features/account/components/
   ├─ SettingsLayout                   // 상단 바(목록·타이틀·현재 사용자) + 본문 그리드
   │  ├─ SettingsNav                   // 좌측 섹션 nav(프로필/기본설정/계정관리) + 버전·마지막 로그인
   │  └─ SettingsContent
   │     ├─ ProfileSection             // 아바타(색 피커+업로드/삭제) · 이름 · 이메일(읽기전용)
   │     │  ├─ AvatarEditor            // 미리보기 + AvatarColorPicker(5색) + 업로드/삭제
   │     │  ├─ NameField               // RHF 필드
   │     │  └─ EmailField              // readOnly + "인증됨" 배지 + lock
   │     ├─ PreferenceSection          // 기본 통화 세그먼트 + 알림 토글 4종
   │     │  ├─ CurrencySegment         // KRW/JPY/USD/EUR
   │     │  └─ NotificationRow ×4       // trip/comment/settle/marketing
   │     └─ DangerZone                 // 로그아웃 행 · 계정 삭제 행
   ├─ SaveBar                          // 저장 상태 안내 + 되돌리기 + 변경사항 저장
   └─ ConfirmDialog (components/ui)     // 파괴적 확인(취소/삭제) — 공유 컴포넌트(account 전용 아님)
```
- 공통 컨트롤은 `components/ui`에서: `Toggle`/`Switch`, `SegmentedControl`, `Input`, `ConfirmDialog`(공유 삭제 확인), `Button`, `Avatar`.
- 의존 방향 준수: `app → features/account → (components/ui, lib, types)`.

## 3. 상태 경계
| 종류 | 보관 | 비고 |
|---|---|---|
| 서버상태 | **TanStack Query** | `profile` 조회(`useProfileQuery`), 저장(`useUpdateProfile`) |
| 폼 dirty 값 | **React Hook Form** | `useForm` 1개로 프로필+환경설정 통합. `formState.isDirty`로 저장 버튼 활성 |
| 저장 상태 | 뮤테이션 status 파생 | `idle`(미변경/유휴) / `saving`(isPending) / `saved`(isSuccess 일시) / `error`(isError) — `SaveBar`가 표시 |
| 현재 섹션 | 로컬(`useState`) 또는 URL `?section=` | 단일 페이지 스크롤/탭. 라우트 분리 여부는 §9 미결 |
| 삭제 모달 열림 | 로컬(`useState`) | |
- **명시적 저장**: 변경은 RHF 폼에만 쌓이고, "변경사항 저장" 클릭 시에만 뮤테이션. "되돌리기"=`reset(서버값)`. Zustand 불필요(폼 로컬 상태로 충분).
- 저장 성공 시 쿼리 무효화 → 상단 바 사용자 정보·`saved` 상태 갱신. 저장 전 페이지 이탈 시 dirty 경고는 §9.

## 4. 쿼리·뮤테이션 매핑 (`features/account/api`)
| 훅 | 종류 | 대상(데이터 계약) | 비고 |
|---|---|---|---|
| `useProfileQuery` | query | `profile`(본인) | 초기값. RHF `reset` 입력 |
| `useUpdateProfile` | mutation | `profile` update(name, avatar_color, avatar_url, default_currency, notif_*) | 단일 저장. 성공 시 profile 무효화 |
| `useUploadAvatar` | mutation | Supabase Storage → `profile.avatar_url` | 사진 업로드(미결 §9) |
| `useLogout` | mutation | Supabase Auth signOut | 세션 종료 → `/`(01) |
| `useDeleteAccount` | mutation | 서버 RPC(계정·데이터 삭제) | 확인 모달 후. cascade 정책 §9 |
- 응답 타입은 생성 타입 `Database['public']['Tables']['profile']['Row']`에서 파생(중복 정의 금지). 폼 스키마는 그 부분집합.
- 컴포넌트 직접 fetch 금지 — 위 훅 경유(§7.1).

## 5. 인터랙션 시나리오
1. 진입 → `useProfileQuery` 로드 → RHF `reset(profile)`. nav 기본 = 프로필.
2. 섹션 이동 → `SettingsContent`가 해당 섹션 표시(현재 강조).
3. 이름/아바타색/통화/알림 토글 변경 → RHF dirty → `SaveBar` "변경사항을 저장해야 적용돼요" + 저장 버튼 활성.
4. 아바타 사진 업로드/삭제 → `useUploadAvatar`(미결 시 색상만) → `avatar_url` 반영.
5. "변경사항 저장" → `saving`(스피너) → 성공 `saved`("모든 변경사항이 저장되었어요") / 실패 `error`("저장에 실패했어요. 다시 시도해 주세요.").
6. "되돌리기" → `reset(서버값)` → dirty 해제.
7. "로그아웃" → `useLogout` → `/`(01).
8. "계정 삭제" → `components/ui/ConfirmDialog`(variant: destructive) 오픈 → "삭제할게요" → `useDeleteAccount` → 완료 시 `/`(01). "취소"=닫기.
- 검증: 이름 비어있음 등 Zod 인라인 에러(클라 UX) + 서버 재검증(§8.3).

## 6. 권한 분기
- 본인 계정만 접근·수정. 보호 라우트 → 미인증은 01로 리다이렉트(서버 세션 검증, §8.2). 타인 `profile` 접근 불가(RLS).
- **이메일**: 읽기 전용(인증된 로그인 이메일, "인증됨" 표시). 변경 가능 여부 §9.
- 계정 삭제는 **본인 재확인 + 서버 인증/소유 검증**. 파괴적 작업이므로 확인 모달 필수.
- owner/editor/viewer 역할 분기는 이 화면에 없음(계정 = 사용자 단위, 여행 멤버십 무관).

## 7. UI 카피 인벤토리
- 섹션: "프로필" / "다른 멤버에게 보이는 정보예요." · "기본 설정" / "통화와 알림을 원하는 대로 맞춰보세요." · "계정 관리"
- 프로필: "프로필 사진" · "업로드" · "삭제" · 이름 hint "멤버 목록과 커서에 표시돼요" · 이메일 hint "로그인에 사용하는 이메일이에요" · 배지 "인증됨"
- 기본 통화: "기본 통화" / "예산·지출에 기본으로 쓰여요" · 세그먼트 "원 ₩ / 엔 ¥ / 달러 $ / 유로 €"
- 알림: "여행 업데이트" / "멤버가 일정을 바꾸면 알려드려요" · "댓글 · 멘션" / "나를 언급하거나 댓글을 남기면" · "정산 알림" / "정산이 추가되거나 변경될 때" · "소식 · 마케팅" / "새 기능과 여행 팁을 받아볼게요"
- 계정 관리: "로그아웃" / "이 기기에서 로그아웃해요" · "계정 삭제" / "모든 여행과 데이터가 영구 삭제돼요"
- 저장 바: "변경사항은 저장을 눌러야 적용돼요" / "변경사항을 저장하는 중…" / "모든 변경사항이 저장되었어요" / "저장에 실패했어요. 다시 시도해 주세요." · "되돌리기" · "변경사항 저장"
- 삭제 모달: "정말 계정을 삭제할까요?" / "계정을 삭제하면 내가 만든 모든 여행과 저장한 장소, 지출 기록이 영구적으로 사라져요. 이 작업은 되돌릴 수 없어요." · "취소" / "삭제할게요"

## 8. 폴더·네이밍 매핑
```
features/account/
  components/   SettingsLayout, SettingsNav, ProfileSection, AvatarEditor,
                AvatarColorPicker, NameField, EmailField, PreferenceSection,
                CurrencySegment, NotificationRow, DangerZone, SaveBar
                (계정 삭제 확인은 components/ui/ConfirmDialog 재사용 — account 전용 모달 없음)
  api/          useProfileQuery, useUpdateProfile, useUploadAvatar, useLogout, useDeleteAccount
  schema/       profileSchema (RHF+Zod: name, avatar_color, default_currency, notif_*)
app/(app)/(main)/settings/page.tsx    # [F2] AppHeader 공유 그룹
```
- 색·간격은 `@theme` 토큰만. `avatar_color`는 `lib/constants`의 멤버 색 팔레트(5색)에서 선택 — **04~08 커서/아바타와 단일 소스**.

## 9. 개발 인계 · 미결
- **알림**: 토글은 `profile.notif_*`에 **저장만**. 실제 푸시/이메일 발송은 MVP 제외(후속). (02 "알림 제외" ↔ 09 토글 UI 충돌은 "저장만"으로 정리됨)
- **아바타 사진 업로드**: MVP에 색상만 vs 이미지 업로드(Storage) 포함 — 미확정. 미포함 시 `AvatarEditor`는 색 피커만 노출.
- **통화**: `default_currency`(설정 4종)는 표시·선택용. 지출 환산은 **`FX_RATES`(base=KRW) 고정환율 스냅샷**으로 확정(데이터 계약 §7). 잔여: 09 4종 중 실제 지원 통화 목록 범위.
- **계정 삭제 cascade**: 본인이 owner인 공유 여행(다른 멤버 존재) 처리 — 소유권 이전 vs 여행 삭제 정책 서버 확정.
- **이메일 변경/비밀번호 변경** 지원 여부, "인증됨" 배지 의미(OAuth/확인 메일).
- **섹션 라우팅**: 단일 페이지 스크롤/탭 vs `/settings/{profile|preferences|account}` 분리.
- **dirty 이탈 경고**: 미저장 변경 상태에서 라우트 이동 시 확인 다이얼로그 노출 여부.
