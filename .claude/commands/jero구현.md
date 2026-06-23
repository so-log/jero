jero 프론트엔드 구현 단계를 시작합니다.

1. `.claude/agents/jero-frontend-dev.md` 하네스를 로드하고 모든 규칙을 숙지하세요.
2. 전제조건을 확인하세요: `docs/planning/` + `docs/architecture/` 존재, **GATE 2 "설계 승인"** 완료, `git status` 클린.
   - 미충족이면 중단하고 `/jero기획설계` 를 안내하세요.
3. 설계문서 기준으로 `src/` 를 구현하세요. 공통 컴포넌트·타입·스토어 먼저, 이후 화면.
4. 의존 방향(`app→features→ui/lib/types`)·데이터 통신 경로(TanStack Query)·상태 경계(Zustand)·Tailwind v4 토큰 규칙을 지키세요.
5. 구현 중 수시로 `yarn typecheck`, 완료 시 `yarn lint`. 핵심 로직엔 Vitest 테스트를 함께 작성하세요.
6. `docs/`·설정 파일은 변경하지 마세요. 잘못된 방향이면 즉시 중단·보고하세요.

요청: $ARGUMENTS
