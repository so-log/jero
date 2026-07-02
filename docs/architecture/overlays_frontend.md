# overlays — 프론트엔드 설계 (②)

> 대상: **10 오버레이 3종** — ① 장소 상세(우측 패널) · ② 멤버·공유(중앙 모달) · ③ 지출 추가(중앙 모달).
> 데이터·타입은 `데이터모델_계약.md` 단일 출처를 따른다(place / expense / expense_split / share_link / invitation, enum: member_role·share_role·category·currency). 새 필드를 발명하지 않는다.

## 1. 개요
- **라우트 아님** — 워크스페이스(04~08) 위에 뜨는 오버레이. 별도 페이지 신설 금지.
- **표시 제어**: 워크스페이스 내 모달 상태 + **URL `?modal=place|share|expense`(+ `&id=`)** 동기화 → 딥링크·새로고침·뒤로가기 복원. 닫으면 쿼리 제거, 호출 뷰 유지.
- **진입 출처**:
  - ① 장소 상세 → 04 "장소 추가", 06 장소 카드/추가
  - ② 멤버·공유 → 04~07 "공유" 버튼
  - ③ 지출 추가 → 07 "지출 추가"(및 04~06 동선)
- **상태**: `normal / error(검증) / loading(저장·초대)`. ②는 추가로 **내 권한(owner/editor)** 분기.

## 2. 컴포넌트 트리
```
app/(app)/trips/[id]/layout.tsx            # 워크스페이스 셸(공통) — 오버레이 마운트 지점
└─ <OverlayRouter modal=?modal>            # searchParams 읽어 해당 오버레이 렌더
   ├─ components/ui/Modal (중앙 모달 셸)    # ②③ 공용
   │   ├─ Modal.Header (아이콘·제목·부제·닫기)
   │   ├─ Modal.Body  (스크롤, <ErrorBanner/>)
   │   ├─ Modal.Footer (액션)
   │   └─ Modal.LoadingOverlay
   ├─ components/ui/Sheet  (우측 패널 셸)    # ① 공용
   │   └─ (Header/Body/Footer/LoadingOverlay 동일 슬롯)
   │
   ├─ features/place/components/PlaceDetailPanel      # ① 본문 (Sheet)
   │   └─ MapStrip · NameField · AddressField · CategoryChips · FolderChips · MemoField
   ├─ features/member/components/ShareModal           # ② 본문 (Modal)
   │   └─ ShareLinkRow · InviteForm · MemberRow(+RoleMenu)
   └─ features/budget/components/ExpenseModal         # ③ 본문 (Modal)
       └─ AmountField(+CurrencySeg) · TitleField · CategoryChips · PayerRadio · SplitChecks · DayChips

components/ui (공통 폼 컨트롤 — 재사용):
  CategoryChips · AmountInput · AvatarPick(라디오/체크) · RoleBadge · MemberAvatar · ConfirmDialog
  (RoleMenu = 역할 변경·내보내기 로직 포함 → features/member 소유)
```
> **공통 셸은 components/ui 단일 구현**(shadcn Dialog=중앙 모달, Sheet=우측 패널). 3 오버레이가 동일 셸 슬롯을 채운다 — 헤더/본문/푸터/로딩/에러배너 중복 구현 금지.

## 3. 상태 경계
| 종류 | 소유 | 비고 |
|---|---|---|
| 오버레이 열림·종류·대상 id | **URL searchParams** | `?modal=&id=`. 라우터가 단일 출처 |
| 폼 입력 dirty 값 | **React Hook Form** (오버레이별 폼) | 비제어 최소화, Zod resolver |
| 역할 변경 메뉴 열림·분담 토글 등 미세 UI | 로컬 `useState` | 오버레이 수명 한정 |
| 서버 데이터(place/member/expense) | **TanStack Query** | 조회는 호출 뷰 캐시 재사용, 저장은 뮤테이션 |
| 내 권한(role) | 워크스페이스 멤버십 쿼리에서 파생 | ② owner 분기 |
- **저장 흐름**: 뮤테이션 성공 → 관련 쿼리 `invalidate`(호출 뷰 04~07 즉시 반영) → 오버레이 닫기(`?modal` 제거).
- 컴포넌트 직접 fetch 금지 — `features/*/api` 경유(§CLAUDE.md §7.1).

## 4. 쿼리 · 뮤테이션 매핑
도메인별 `features/<domain>/api`. 타입은 데이터 계약 생성타입 파생(중복 정의 금지).

**① 장소 (features/place/api)**
- `usePlaceQuery(id)` — 편집 진입 시 단건(또는 호출 뷰 캐시 select)
- `useUpsertPlace()` — 저장/수정. `placeSchema`(name 필수, category, area?, folder_id?, memo?, lat/lng?)
- `useSchedulePlace()` — **"일정에 추가" = `scheduled_date`(+`order_in_day`/`scheduled_by`) 설정** 뮤테이션 → 04·05 동기화
- `useDeletePlace()` — 삭제(확인 후)
- 무효화: `['places', tripId]`(04·06)

**② 멤버·공유 (features/member/api)**
- `useMembersQuery(tripId)` · `useShareLinkQuery(tripId)`
- `useInvite()` — `inviteSchema`(email, **role 기본 `editor`**, owner 부여 불가). 레코드 생성(메일 발송은 후속), 서버 역할 재검증
- `useChangeRole()` — `member_role` 변경(editor↔viewer)
- `useRemoveMember()` — 내보내기
- `useUpdateShareLink()` — `share_link.role`(editor/viewer) 변경·복사용 토큰
- 무효화: `['members', tripId]`, `['shareLink', tripId]`

**③ 지출 (features/budget/api)**
- `useCreateExpense()` / `useUpdateExpense()` — `expenseSchema`(amount>0, currency, category, payer_id, split≥1, spent_on). **`fx_rate`는 폼 입력 아님** — 생성 로직이 `lib/constants` `FX_RATES`(base=KRW) 스냅샷(데이터 계약 §7)
- split = `expense_split` 멤버 집합. 1인당 = `amount_base / split.length`(표시용 클라 계산, 정산은 서버)
- 무효화: `['budget', tripId]`(07 지표·차트·정산 재계산)

## 5. 인터랙션 시나리오
**① 장소 상세 (Sheet)**
1. 진입 → 기존 place 로드(편집) 또는 신규. 미니 지도 스트립에 카테고리 핀.
2. name/address/category(통합 enum)/folder/memo 편집 → dirty.
3. "일정에 추가" → `scheduled_date` 설정(Day 선택 흐름은 06과 공유) → 04·05 반영.
4. 삭제(휴지통) → 확인 → `useDeletePlace`.
5. error: name 미입력 시 인라인 에러 + 상단 배너. loading: "저장하는 중…".

**② 멤버·공유 (Modal)**
1. 공유 링크 표시 + 복사. owner면 링크 권한 세그먼트(**편집 가능/읽기 전용** = `share_role`), 아니면 배지.
2. owner: 이메일 초대(입력+초대) → `invitation` 생성(발송 후속).
3. owner: 멤버 행 역할 변경(편집자/뷰어)·내보내기. owner 본인 행은 변경 불가.
4. editor: 열람만 — "초대·권한 변경은 소유자만" 안내.
5. 완료 → 닫기.

**③ 지출 추가 (Modal)**
1. 금액 입력 + 통화 세그먼트(currency) → `amount`·`currency`. 비-KRW 시 기본통화 환산 안내 캡션(1 JPY ≈ N원).
2. 항목명, 카테고리(통합 enum 중 지출용 부분집합 노출).
3. 결제자 라디오(1명) + 분담 체크(다중) → "1인당 N원 · M명" 실시간 계산.
4. 날짜(Day 칩) → `spent_on`.
5. 저장 → `useCreateExpense` → 07 재계산. 취소 → 닫기.
6. error: amount 미입력·분담 0 → 인라인 + 배너. loading: "지출을 저장하는 중…".

## 6. 권한 매트릭스
| 동작 | owner | editor | viewer |
|---|---|---|---|
| ① 장소 편집·일정배정·삭제 | ✅ | ✅ | ❌(진입 불가) |
| ③ 지출 추가·편집 | ✅ | ✅ | ❌(진입 불가) |
| ② 공유 링크·권한·초대·역할변경·내보내기 | ✅ | ❌(열람) | ❌ |
| ② 멤버 목록 열람 | ✅ | ✅ | ✅ |
- 모든 권한·역할 변경·링크 권한 부여는 **서버/RLS 강제**(§8.2). 클라 role 신뢰 금지, 권한 상승 차단.

## 7. UI 카피 인벤토리
- ① 헤더 "장소 상세 / 저장한 장소 편집", 필드 "장소명*"·"위치 · 주소"·"카테고리"·"저장 폴더"·"메모", 메모 placeholder "함께 보면 좋은 메모를 남겨보세요", 푸터 "일정에 추가", 에러 "장소명을 입력해 주세요" / "입력값을 확인해 주세요."
- ② 헤더 "멤버 · 공유 관리", "링크로 들어온 사람의 권한"(편집 가능/읽기 전용), invite placeholder "friend@email.com"·"초대", 안내 "멤버 초대·권한 변경은 소유자만 할 수 있어요", 역할 라벨 소유자/편집자/뷰어, "내보내기", "완료", "(나)".
- ③ 헤더 "지출 추가", "금액*"·"항목명"·"카테고리"·"결제자"·"분담 인원"·"날짜", "1인당 {금액} · {N}명", 에러 "금액을 입력해 주세요" / "분담 인원을 한 명 이상 선택해 주세요", 푸터 "취소"·"저장".
- 로딩: "저장하는 중…" / "초대 메일을 보내는 중…" / "지출을 저장하는 중…".

## 8. 폴더 · 네이밍 매핑
```
components/ui/
  Modal.tsx, Sheet.tsx           # 공통 셸(헤더/본문/푸터/로딩/에러배너 슬롯)
  CategoryChips.tsx, AmountInput.tsx, AvatarPick.tsx, RoleBadge.tsx, MemberAvatar.tsx, ConfirmDialog.tsx
features/place/
  components/PlaceDetailPanel.tsx
  api/{usePlace,useUpsertPlace,useSchedulePlace,useDeletePlace}.ts
  schema/placeSchema.ts
features/member/
  components/{ShareModal,ShareLinkRow,InviteForm,MemberRow,RoleMenu}.tsx
  api/{useMembers,useShareLink,useInvite,useChangeRole,useRemoveMember,useUpdateShareLink}.ts
  schema/inviteSchema.ts
features/budget/
  components/{ExpenseModal,...}.tsx
  api/{useCreateExpense,useUpdateExpense}.ts
  schema/expenseSchema.ts
app/(app)/trips/[id]/  → OverlayRouter (searchParams 기반)
```
- 도메인 간 직접 참조 금지. 공통 셸·폼컨트롤·역할 배지는 `components/ui`로 승격(여러 도메인 공용).

## 9. 개발 인계 · 미결
- **[B] 통화 환산(확정)**: `fx_rate`는 폼 입력 아님 — 지출 생성 시 `lib/constants` `FX_RATES`(base=KRW) 스냅샷(데이터 계약 §7). 비-KRW 환산 안내 캡션. 실시간 API phase 2. (09 기본통화 4종 표시 범위만 잔여)
- **[C] 초대 역할(확정)**: `inviteSchema` `role` 기본 `editor`(드롭다운, owner 부여 불가), 초대 후 변경은 멤버 목록 역할 메뉴. 서버 재검증.
- **[D] 삭제 확인(확정)**: `components/ui/ConfirmDialog`(공유)로 장소·지출·멤버·계정 삭제 일원화.
- **카테고리 표시 집합**: 단일 `category` enum에서 ①(일정)·③(지출) 화면별 노출 부분집합만 분기 — 부분집합 정의는 `lib/constants`.
- **공유 토큰**: 편집 가능 링크의 보안 경계·만료·폐기·재발급은 share/08과 통합 설계.
- **모달 URL 동기화**: `?modal=`의 뒤로가기/새로고침 동작·포커스 트랩·ESC 닫기 접근성.
