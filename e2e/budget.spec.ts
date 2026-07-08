import { test, expect, type Page } from "@playwright/test";

import {
  bootstrap,
  hasBackend,
  teardown,
  type RtData,
  type RtUser,
} from "./realtime/support";

/**
 * 지출 편집(07) 실연동 — 생성 → 편집(금액·분담) → 합계·정산 갱신 실렌더.
 * service_role 부트스트랩(A owner + B member) 후 종료 시 삭제.
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

test.describe("지출 편집(07)", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(RUN);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test("생성 → 편집(금액·분담) → 합계·정산 갱신", async ({ page }) => {
    test.setTimeout(60000);
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=budget`);

    // 지출 없음 → 추가 진입.
    await page.getByRole("button", { name: /지출 추가하기/ }).click();
    await expect(page.getByRole("heading", { name: "지출 추가" })).toBeVisible({ timeout: 20000 });
    await page.getByPlaceholder("0").fill("50000");
    await page.getByPlaceholder("예: 긴자 식스 쇼핑").fill("택시비");
    await page.getByRole("button", { name: "저장" }).click();

    // 생성 반영: 총지출 ₩50,000 + 정산 1건(A 결제, A·B 분담).
    await expect(page.getByText("₩50,000").first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/1건으로 정산/)).toBeVisible();

    // 행 클릭 → 편집(금액 80,000).
    await page.getByRole("button", { name: "택시비 편집" }).click();
    await expect(page.getByRole("heading", { name: "지출 편집" })).toBeVisible({ timeout: 20000 });
    await page.getByPlaceholder("0").fill("80000");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("₩80,000").first()).toBeVisible({ timeout: 20000 });

    // 다시 편집 → 분담에서 B 제외 → 정산 0건(합계 재계산 반영).
    await page.getByRole("button", { name: "택시비 편집" }).click();
    await expect(page.getByRole("heading", { name: "지출 편집" })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: new RegExp(data.b.name) }).nth(1).click(); // 분담의 B 토글 off
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText(/0건으로 정산/)).toBeVisible({ timeout: 20000 });
  });
});
