import { test, expect, type Page } from "@playwright/test";

import {
  adminClient,
  bootstrap,
  hasBackend,
  teardown,
  type RtData,
  type RtUser,
} from "./realtime/support";

/**
 * 핵심 해피패스 통합 e2e(실 Supabase) — 개별 spec 으로 검증된 기능의 관통 플로우.
 *  1) 로그인 → 여행 생성 마법사 → 워크스페이스 진입
 *  2) 장소 추가 → 일정 배정 → 예산 지출 (한 여행에서 관통)
 * 부트스트랩 계정(A) 사용. 마법사로 만든 여행 포함, A 소유 여행 전부 티어다운.
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

test.describe("핵심 해피패스 통합", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`flows-${RUN}`);
  });
  test.afterAll(async () => {
    // A 소유 여행(부트스트랩 T0 + 마법사 생성분) 전부 삭제 후 계정 정리.
    const admin = adminClient();
    const { data: owned } = await admin
      .from("trip_member")
      .select("trip_id")
      .eq("user_id", data.a.id)
      .eq("role", "owner");
    for (const row of owned ?? []) {
      await admin.from("trip").delete().eq("id", row.trip_id as string);
    }
    await teardown(data);
  });

  test("로그인 → 여행 생성 마법사(4단계) → 워크스페이스", async ({ page }) => {
    test.setTimeout(60000);
    await login(page, data.a);
    await page.goto("/trips/new");
    await expect(page.getByText("새 여행 만들기")).toBeVisible({ timeout: 20000 });

    // step1(정보) — 제목 입력(프리필 제거됨, 필수 검증) → 다음
    await expect(page.getByText("단계 1 / 4")).toBeVisible();
    await page.getByPlaceholder("예: 도쿄, 우리끼리 4일").fill("플로우 마법사 여행");
    await page.getByRole("button", { name: "다음", exact: true }).click();

    // step2(도시·일정, 다중 도시 Phase 2): 시작일 + 도시명(박수는 기본 1박) → 다음
    await expect(page.getByText("단계 2 / 4")).toBeVisible();
    await page.getByLabel("시작일").fill("2026-08-10");
    await page.getByPlaceholder("도시 이름 (예: 오사카)").fill("도쿄");
    await page.getByRole("button", { name: "다음", exact: true }).click();

    // step3(멤버, 프리필) → 다음
    await expect(page.getByText("단계 3 / 4")).toBeVisible();
    await page.getByRole("button", { name: "다음", exact: true }).click();

    // step4(시작 방식) → 여행 만들기 → 워크스페이스(UUID)
    await expect(page.getByText("단계 4 / 4")).toBeVisible();
    await page.getByRole("button", { name: "여행 만들기" }).click();
    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}\?view=plan/, { timeout: 25000 });
  });

  test("장소 추가 → 일정 배정 → 예산 지출 (관통)", async ({ page }) => {
    test.setTimeout(60000);
    await login(page, data.a);

    // 06 장소 뷰에서 장소 추가(수동 입력, 지도 불필요).
    await page.goto(`/trips/${data.tripId}?view=places`);
    await page.getByRole("button", { name: "장소 추가", exact: true }).click();
    await expect(page.getByRole("heading", { name: "장소 상세" })).toBeVisible({ timeout: 20000 });
    await page.getByPlaceholder("장소 이름").fill("플로우 장소");
    await page.getByRole("button", { name: "일정에 추가" }).click(); // 저장(저장 목록 편입)
    await expect(page.getByText("플로우 장소")).toBeVisible({ timeout: 20000 });

    // 저장 장소 카드에서 Day 배정(AddToScheduleMenu). 실모드에선 배정 시 저장 목록에서 빠진다.
    await page.getByRole("button", { name: "일정에 추가", exact: true }).click();
    const menu = page.getByText("어느 날짜에 추가할까요?").locator("..");
    await menu.getByRole("button", { name: /8\.1/ }).click(); // 첫날(8.1)에 배정
    // 배정 확정(서버 반영 후 저장 목록에서 제거)까지 대기.
    await expect(page.getByText("플로우 장소")).toHaveCount(0, { timeout: 20000 });

    // 04 플랜 뷰(첫날)에 배정된 장소가 보인다.
    await page.goto(`/trips/${data.tripId}?view=plan`);
    await expect(page.getByText("플로우 장소")).toBeVisible({ timeout: 20000 });

    // 07 예산에서 지출 추가 → 합계 반영.
    await page.goto(`/trips/${data.tripId}?view=budget`);
    await page.getByRole("button", { name: /지출 추가/ }).first().click();
    await expect(page.getByRole("heading", { name: "지출 추가" })).toBeVisible({ timeout: 20000 });
    await page.getByPlaceholder("0").fill("42000");
    await page.getByPlaceholder("예: 긴자 식스 쇼핑").fill("플로우 지출");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("₩42,000").first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("플로우 지출")).toBeVisible();
  });
});
