import { test, expect, type Page } from "@playwright/test";

import { adminClient, bootstrap, hasBackend, teardown, type RtData, type RtUser } from "./realtime/support";

/**
 * 팜플렛(2차) e2e — 1단계 화면 + 2단계 인쇄 라우트/진입/ QR.
 * PDF 는 window.print() 폴백(설계 §5, Node 버전 제약으로 서버 puppeteer 대신). 멤버 게이트·QR 대상(/share) 검증.
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

test.describe("팜플렛(2차)", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`pamphlet-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test("설정 화면: 진입·미리보기·테마 전환 + 진입 버튼(더보기)", async ({ page }) => {
    test.setTimeout(60000);
    await login(page, data.a);
    // 워크스페이스 더보기 → 팜플렛 만들기 진입.
    await page.goto(`/trips/${data.tripId}?view=plan`);
    await page.getByRole("button", { name: "더보기" }).click();
    await page.getByRole("link", { name: "팜플렛 만들기" }).click();
    await expect(page).toHaveURL(new RegExp(`/trips/${data.tripId}/pamphlet$`), { timeout: 20000 });

    await expect(page.getByText("A4 3단 접이 · 미리보기")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("실시간 검증 여행").first()).toBeVisible();
    await page.getByRole("button", { name: /숲/ }).click();
    await expect(page.getByText("숲")).toHaveCount(2);
    await expect(page.getByRole("button", { name: /PDF 내보내기/ })).toBeEnabled();
  });

  test("인쇄 라우트: 멤버 렌더", async ({ page }) => {
    test.setTimeout(60000);
    await page.addInitScript(() => {
      window.print = () => {};
    });
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}/pamphlet/print?theme=forest&sections=cover,schedule,qr`);
    // 표지(여행명) + 인쇄 툴바 렌더.
    await expect(page.getByText("실시간 검증 여행").first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: "인쇄 · PDF로 저장" })).toBeVisible();
  });

  test("인쇄 라우트: 비멤버 차단(리다이렉트)", async ({ page }) => {
    test.setTimeout(60000);
    await login(page, data.c); // C 는 비멤버
    await page.goto(`/trips/${data.tripId}/pamphlet/print?theme=beach&sections=cover`);
    // 비멤버 → /trips 로 리다이렉트, 인쇄 툴바 미노출.
    await expect(page).toHaveURL(/\/trips(\?|$)/, { timeout: 20000 });
    await expect(page.getByRole("button", { name: "인쇄 · PDF로 저장" })).toHaveCount(0);
  });

  test("QR 대상: /share/[token] 열림(읽기 전용 공유)", async ({ page }) => {
    test.setTimeout(60000);
    // QR 이 인코딩하는 공유 링크(발급) → 익명으로 열림.
    const admin = adminClient();
    const token = `pamqr${RUN}`;
    await admin.from("share_link").insert({
      trip_id: data.tripId,
      token,
      role: "viewer",
      created_by: data.a.id,
    });
    await page.goto(`/share/${token}`);
    await expect(page.getByText("실시간 검증 여행").first()).toBeVisible({ timeout: 20000 });
  });
});
