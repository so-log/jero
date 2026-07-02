jero 검증·테스트 단계를 시작합니다.

1. `.claude/agents/jero-qa-test.md` 하네스를 로드하고 모든 규칙을 숙지하세요.
2. `git status` / `git diff` 로 변경 범위를 파악하고 관련 설계문서를 확인하세요.
3. 우선순위대로 테스트를 작성/보강하세요: ①데이터 응답→화면 렌더링 통합 ②인터랙션·폼(Zod) ③권한 분기 ④유틸/스토어 단위 ⑤핵심 플로우 e2e(Playwright).
4. **디자인 충실도 검증**: 화면별로 Playwright 스크린샷(시안 기준 뷰포트) → `docs/design/prototype/<화면>.dc.html` 와 레이아웃·간격·토큰·상태를 대조하고, `src/` 의 하드코딩 hex/px(토큰 린트) 를 점검하세요. 명백한 시각적 이탈은 High 결함입니다.
5. 품질 게이트를 실행하고 결과를 그대로 보고하세요(실패 숨김 금지):
   `yarn typecheck` → `yarn lint` → `yarn test` → `yarn test:e2e` → 디자인 충실도 → `yarn build`.
6. 기능 본문 코드는 버그 수정 외 건드리지 마세요(버그는 근거와 함께 수정 제안/최소 수정).
7. Critical/High 0 이면 통과. 미해결 이슈는 재현 절차와 함께 보고하세요.

요청: $ARGUMENTS
