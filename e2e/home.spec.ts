import { test, expect } from "@playwright/test";

// 스모크 e2e — 홈이 정상 렌더되는지. 실제 플로우 테스트는 구현 단계에서 추가.
test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});
