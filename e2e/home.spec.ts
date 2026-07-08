import { test, expect, type Page } from "@playwright/test";

import { bootstrap, hasBackend, teardown, type RtData, type RtUser } from "./realtime/support";

/**
 * 홈/인증 라우팅 e2e(실 Supabase) — 랜딩 로그인 폼 · 보호 라우트 리다이렉트 · 로그인 후 /trips 도달.
 * service_role 부트스트랩 계정으로 실인증. 종료 시 삭제.
 */
const RUN = Date.now().toString(36);
let data: RtData;

async function login(page: Page, user: RtUser): Promise<void> {
  await page.goto("/");
  await page.getByPlaceholder("you@email.com").fill(user.email);
  await page.getByPlaceholder("비밀번호").fill(user.password);
  await page.getByRole("button", { name: "로그인" }).click();
}

test.describe("홈 · 인증 라우팅", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`home-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test("랜딩: 로그인 폼이 렌더된다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder("you@email.com")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  });

  test("미인증: 보호 라우트(/trips) 접근 시 랜딩으로 리다이렉트", async ({ page }) => {
    await page.goto("/trips");
    // 미인증 → '/'(returnTo 보존). /trips 에 머무르지 않고 로그인 폼이 보인다.
    await expect(page.getByPlaceholder("you@email.com")).toBeVisible({ timeout: 20000 });
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("인증: 로그인하면 /trips 로 도달한다", async ({ page }) => {
    test.setTimeout(60000);
    await login(page, data.a);
    await expect(page).toHaveURL(/\/trips(\?|$)/, { timeout: 30000 });
    // /trips 목록 첫 렌더는 dev 콜드 컴파일이 있을 수 있어 넉넉히.
    await expect(page.getByRole("heading", { name: "내 여행" })).toBeVisible({ timeout: 40000 });
  });
});
