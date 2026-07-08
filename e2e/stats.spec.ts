import { test, expect, type Page } from "@playwright/test";

import { bootstrap, hasBackend, teardown, type RtData, type RtUser } from "./realtime/support";

/**
 * 여행 통계(2차 E) 실연동 — ?view=stats 진입 → 요약 카드·차트 렌더. 부트스트랩 여행에 일정 장소 3개 존재.
 * viewer 포함 전 멤버 열람(읽기). 지도 불필요(차트만) — Maps 키 없이 렌더된다.
 */
const RUN = Date.now().toString(36);
let data: RtData;

async function login(page: Page, user: RtUser): Promise<void> {
  await page.goto("/");
  await page.getByPlaceholder("you@email.com").fill(user.email);
  await page.getByPlaceholder("비밀번호").fill(user.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/trips(\?|$)/, { timeout: 20000 });
}

test.describe("여행 통계(2차 E)", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`stats-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test("세그먼트 '통계' → 요약 카드·차트 렌더", async ({ page }) => {
    test.setTimeout(60000);
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=plan`);

    // 뷰 세그먼트에서 '통계' 클릭.
    await page.getByRole("tab", { name: "통계" }).click();
    await expect(page).toHaveURL(/view=stats/, { timeout: 20000 });

    // 요약 카드 + 차트 렌더.
    await expect(page.getByText("총 이동거리")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("여행 일수")).toBeVisible();
    await expect(page.getByText("일자별 이동거리")).toBeVisible();
    await expect(page.getByText("카테고리별 장소")).toBeVisible();
  });
});
