import { expect, test } from "@playwright/test";

/**
 * 핵심 사용자 동선 e2e — 지도 키 없이 통과하는 경로만(마커·동선 실제 검증은 키 투입 후 별도).
 * dev 서버 자동 기동(playwright.config webServer). 뮤테이션은 스텁이라 라우팅·UI 흐름을 검증한다.
 */

test("이메일 로그인 → /trips → 카드 클릭 → 플랜 뷰 진입", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("you@email.com").fill("demo@trip.co");
  await page.getByPlaceholder("비밀번호").fill("secret123");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page).toHaveURL(/\/trips(\?|$)/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "내 여행" })).toBeVisible();

  // 예정 탭의 여행 카드 진입(도쿄 fixture 가 데모 워크스페이스로 열린다)
  await page.getByRole("link", { name: /제주 한 바퀴/ }).click();
  await expect(page).toHaveURL(/\/trips\/.+view=plan/);
  await expect(page.getByText("츠키지 장외시장")).toBeVisible({ timeout: 15000 });
});

test("여행 생성 마법사 4단계 → 워크스페이스 진입", async ({ page }) => {
  await page.goto("/trips/new");
  await expect(page.getByText("새 여행 만들기")).toBeVisible({ timeout: 15000 });

  // step1(여행 정보, 프리필) → step2 → step3 → step4 (기본값 유효)
  await expect(page.getByText("단계 1 / 4")).toBeVisible();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("단계 2 / 4")).toBeVisible();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("단계 3 / 4")).toBeVisible();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("단계 4 / 4")).toBeVisible();

  await page.getByRole("button", { name: "여행 만들기" }).click();
  await expect(page).toHaveURL(/\/trips\/trip_.+view=plan/, { timeout: 15000 });
});

test("워크스페이스 오버레이 열고 닫기(공유)", async ({ page }) => {
  await page.goto("/trips/trip_1?view=plan");
  await expect(page.getByText("츠키지 장외시장")).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "공유" }).click();
  await expect(page.getByText("멤버 · 공유 관리")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByText("멤버 · 공유 관리")).toHaveCount(0);
});
