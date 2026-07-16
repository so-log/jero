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
 * 템플릿 복제로 시작(2차 C) 실연동 — 마법사에서 템플릿 선택 → 생성 → 워크스페이스에 폴더·장소·일정 복제 렌더.
 * 0005(trip_template 시드 + create_trip RPC 확장)가 적용돼야 동작 — 미적용 시 graceful skip.
 * A 소유 여행(마법사 생성분) 전부 티어다운.
 */
const RUN = Date.now().toString(36);
let data: RtData;
let templatesReady = false;

async function login(page: Page, user: RtUser): Promise<void> {
  await page.goto("/");
  await page.getByPlaceholder("you@email.com").fill(user.email);
  await page.getByPlaceholder("비밀번호").fill(user.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/trips(\?|$)/, { timeout: 20000 });
}

test.describe("템플릿 복제(2차 C)", () => {
  test.skip(!hasBackend, ".env.local 키 필요");

  test.beforeAll(async () => {
    data = await bootstrap(`tpl-${RUN}`);
    const { data: tpl } = await adminClient()
      .from("trip_template")
      .select("id")
      .eq("id", "tpl-tokyo")
      .maybeSingle();
    templatesReady = !!tpl;
  });
  test.afterAll(async () => {
    if (!data) return;
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

  test("도쿄 템플릿 선택 → 생성 → 폴더·장소·일정 복제", async ({ page }) => {
    test.skip(!templatesReady, "0005(템플릿 시드) 미적용 — 적용 후 재실행");
    test.setTimeout(60000);
    await login(page, data.a);
    await page.goto("/trips/new");
    await expect(page.getByText("새 여행 만들기")).toBeVisible({ timeout: 20000 });

    // step1(제목 입력) → step2(도시·일정: 시작일 + 도시 3박 = 도쿄 템플릿 4일) → step3
    await page.getByPlaceholder("예: 도쿄, 우리끼리 4일").fill("도쿄 템플릿 여행");
    await page.getByRole("button", { name: "다음", exact: true }).click();
    await page.getByLabel("시작일").fill("2026-08-10");
    await page.getByPlaceholder("도시 이름 (예: 오사카)").fill("도쿄");
    await page.getByRole("button", { name: "박수 증가" }).click(); // 1→2
    await page.getByRole("button", { name: "박수 증가" }).click(); // 2→3
    await page.getByRole("button", { name: "다음", exact: true }).click();
    await page.getByRole("button", { name: "다음", exact: true }).click();

    // step4: 템플릿 모드 → 도쿄 템플릿 선택 → 생성
    await page.getByRole("button", { name: /템플릿 복제로 시작/ }).click();
    await page.getByRole("button", { name: /도쿄 클래식 4일/ }).click();
    await page.getByRole("button", { name: "여행 만들기" }).click();
    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}\?view=plan/, { timeout: 25000 });

    // 플랜 뷰 Day1 에 복제된 일정 장소(센소지) 렌더.
    await expect(page.getByText("센소지")).toBeVisible({ timeout: 20000 });

    // 장소 뷰에 복제된 폴더(명소) 렌더 — 데스크톱 사이드바 폴더 버튼으로 특정
    // (모바일 폴더 드롭다운 <option> 과 텍스트 중복 회피).
    const url = new URL(page.url());
    await page.goto(`${url.pathname}?view=places`);
    await expect(
      page.getByRole("button", { name: /명소/ }).first(),
    ).toBeVisible({ timeout: 20000 });
  });

  test("빈 여행 경로 회귀 없음(템플릿 미선택)", async ({ page }) => {
    test.setTimeout(60000);
    await login(page, data.a);
    await page.goto("/trips/new");
    await expect(page.getByText("새 여행 만들기")).toBeVisible({ timeout: 20000 });
    // step1 제목 입력 → step2(도시·일정: 시작일 + 도시명)
    await page.getByPlaceholder("예: 도쿄, 우리끼리 4일").fill("빈 여행 테스트");
    await page.getByRole("button", { name: "다음", exact: true }).click();
    await page.getByLabel("시작일").fill("2026-08-11");
    await page.getByPlaceholder("도시 이름 (예: 오사카)").fill("제주");
    await page.getByRole("button", { name: "다음", exact: true }).click();
    await page.getByRole("button", { name: "다음", exact: true }).click();
    // step4 기본 '빈 여행' → 바로 생성
    await page.getByRole("button", { name: "여행 만들기" }).click();
    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}\?view=plan/, { timeout: 25000 });
    // 빈 여행: 일정 없음 안내.
    await expect(page.getByText("아직 등록된 장소가 없어요")).toBeVisible({ timeout: 20000 });
  });
});
