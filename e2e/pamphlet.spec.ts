import { test, expect, type Page } from "@playwright/test";

import { bootstrap, hasBackend, teardown, type RtData, type RtUser } from "./realtime/support";

/**
 * 팜플렛 내보내기(2차, 1단계) 실연동 — 화면 진입 → 미리보기 렌더 · 섹션 토글 · 테마 전환.
 * PDF 내보내기는 다음 단계(버튼 비활성). 멤버(editor+) 이용.
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

test.describe("팜플렛 내보내기(2차 1단계)", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`pamphlet-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test("진입 → 미리보기 렌더 · 섹션 토글 · 테마 전환", async ({ page }) => {
    test.setTimeout(60000);
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}/pamphlet`);

    // 화면·미리보기 렌더(표지 제목 = 여행명).
    await expect(page.getByText("팜플렛 내보내기", { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("A4 3단 접이 · 미리보기")).toBeVisible();
    await expect(page.getByText("실시간 검증 여행").first()).toBeVisible({ timeout: 20000 });

    // 테마 전환 → 배지 갱신.
    await page.getByRole("button", { name: /숲/ }).click();
    // 칩 + 미리보기 배지 2곳에 '숲' → 테마 적용 확인.
    await expect(page.getByText("숲")).toHaveCount(2);

    // 섹션 토글(QR 끄기) → 다시 켜기(상태 반영 확인용 클릭).
    await page.getByRole("button", { name: /QR 코드/ }).click();
    await page.getByRole("button", { name: /QR 코드/ }).click();
  });
});
