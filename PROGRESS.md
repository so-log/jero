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
  presence + `postgres_changes`(place/expense/expense_split/trip_member) → 쿼리 invalidate.
  낙관적↔실시간 reconciliation(in-flight 중 invalidate 디바운스, settle 후 재동기화).
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
| (2) presence "접속 중" 아바타 | ❌ **미동작(아래 알려진 이슈)** — 스펙에 `test.fixme` |

### ⚠ 알려진 이슈 — presence 미동작 (Supabase 측)

`channel.track()`가 `ok` 를 반환하고 구독도 `SUBSCRIBED` 인데 presence `sync` 이벤트가 전혀
전달되지 않는다. **브라우저·순수 supabase-js, public·private 채널 모두** 동일(반면
postgres_changes 는 정상). 인가(RLS)·앱 코드 문제가 아니라 이 **Supabase 프로젝트의 realtime
presence/broadcast 전달** 문제로 판단. 후속에서 프로젝트 realtime 설정/버전 확인 필요.

## 남은 후속

- **presence 전달 이슈** — Supabase 프로젝트 realtime(presence/broadcast) 설정·버전 조사 → 해결 후 `test.fixme` 해제.
- **계정** — profile 수정 / 회원 탈퇴(owner 승계·cascade, service role).
- **지출 편집** — expense 편집 플로우.
- **작은 UI** — 드롭다운 방향, unassign(일정→저장 되돌리기), 공유링크 복사.
- **e2e flows 재작성** — 기존 stub 기반 `e2e/flows.spec.ts`·`home.spec.ts` 를 실연동 기준으로 갱신(현재는 깨진 상태).
