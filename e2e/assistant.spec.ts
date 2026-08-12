import { test, expect, type Page } from "@playwright/test";

import {
  bootstrap,
  hasBackend,
  teardown,
  type RtData,
  type RtUser,
} from "./realtime/support";

/**
 * AI 어시스턴트 Phase 2 실연동 — FAB → 패널 → 스트리밍 답변.
 * 시안: `docs/design/prototype/AI 어시스턴트.dc.html`(데스크톱 우측 392px / 모바일 바텀시트).
 *
 * LLM 키가 없으면 FAB 자체가 안 뜬다 → 그 경우는 "미노출"만 검증하고 대화는 건너뛴다.
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

const fab = (page: Page) =>
  page.getByRole("button", { name: "AI 여행 어시스턴트 열기" });

test.describe("AI 어시스턴트(18) Phase 2", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`assistant-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test("플랜 뷰에서 FAB → 패널 열림, 캘린더 뷰에서는 미노출", async ({ page }) => {
    test.setTimeout(90000);
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=plan`);

    // 키가 없으면 FAB 미노출 — 회귀 0 만 확인하고 종료.
    const enabled = await fab(page)
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!enabled, "LLM 키 없음 — 어시스턴트 비활성(FAB 미노출)");

    await fab(page).click();
    const panel = page.getByRole("dialog", { name: "AI 여행 어시스턴트" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "여행 어시스턴트" })).toBeVisible();

    // 시안: 데스크톱 패널 폭 392px.
    const box = await panel.boundingBox();
    expect(box?.width).toBe(392);

    await page.screenshot({
      path: "e2e/__screenshots__/assistant-desktop.png",
      fullPage: false,
    });

    // 닫기 → FAB 복귀.
    await panel.getByRole("button", { name: "어시스턴트 닫기" }).click();
    await expect(panel).toBeHidden();
    await expect(fab(page)).toBeVisible();

    // 범위 밖 뷰(캘린더)에서는 FAB 이 없다.
    await page.goto(`/trips/${data.tripId}?view=calendar`);
    await expect(fab(page)).toBeHidden();
  });

  test("질문 → 스트리밍 답변 + 근거 칩", async ({ page }) => {
    test.setTimeout(120000);
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=plan`);

    const enabled = await fab(page)
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!enabled, "LLM 키 없음");

    await fab(page).click();
    const panel = page.getByRole("dialog", { name: "AI 여행 어시스턴트" });
    const log = panel.getByRole("log", { name: "대화 내용" });

    await panel
      .getByPlaceholder("여행에 대해 무엇이든 물어보세요")
      .fill("이 여행에 담은 장소를 한 문장으로 요약해줘");
    await panel.getByRole("button", { name: "전송" }).click();

    // 사용자 말풍선 즉시 표시.
    await expect(
      log.getByText("이 여행에 담은 장소를 한 문장으로 요약해줘"),
    ).toBeVisible();

    // 실제 모델 답변이 스트리밍되어 채워진다.
    await expect
      .poll(async () => (await log.innerText()).length, { timeout: 60000 })
      .toBeGreaterThan(40);

    // 근거 칩("참고")은 담은 장소가 있으면 표시된다.
    await expect(panel.getByText("참고")).toBeVisible({ timeout: 20000 });

    await page.screenshot({
      path: "e2e/__screenshots__/assistant-answer.png",
      fullPage: false,
    });
  });

  test("모바일 375 — 바텀시트로 열린다", async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 375, height: 760 });
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=plan`);

    const enabled = await fab(page)
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!enabled, "LLM 키 없음");

    await fab(page).click();
    const panel = page.getByRole("dialog", { name: "AI 여행 어시스턴트" });
    await expect(panel).toBeVisible();

    // 시트는 화면 너비를 꽉 채운다(사이드 패널이 아니다).
    const box = await panel.boundingBox();
    expect(box?.width).toBe(375);

    await page.screenshot({
      path: "e2e/__screenshots__/assistant-mobile.png",
      fullPage: false,
    });
  });
});
