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
 * 폴더 관리(2차 B) 실연동 — 추가(UI) → 개수 갱신 → 삭제(UI) → 소속 장소 미분류(ON DELETE SET NULL).
 * 장소 시드·미분류 검증은 service_role(admin)로(오버레이 폴더픽커 모호성 회피). 낙관/롤백은 유닛 커버.
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

test.describe("폴더 관리(2차 B)", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`folder-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test("폴더 추가 → 개수 갱신 → 삭제 → 장소 미분류", async ({ page }) => {
    test.setTimeout(60000);
    const admin = adminClient();
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=places`);

    // 폴더 추가(인라인 입력).
    await page.getByRole("button", { name: "폴더 추가" }).first().click();
    await page.getByPlaceholder("새 폴더 이름").fill("카페투어");
    await page.getByPlaceholder("새 폴더 이름").press("Enter");
    // 데스크톱 사이드바 폴더 버튼으로 특정(모바일 폴더 드롭다운 <option> 과 텍스트 중복 회피).
    await expect(
      page.getByRole("button", { name: /카페투어/ }).first(),
    ).toBeVisible({ timeout: 20000 });

    // 실제 폴더가 DB 에 커밋될 때까지 폴링(낙관적 temp 가 아니라 서버 반영 확인).
    let folderId = "";
    await expect
      .poll(
        async () => {
          const { data: folder } = await admin
            .from("folder")
            .select("id")
            .eq("trip_id", data.tripId)
            .eq("name", "카페투어")
            .maybeSingle();
          folderId = (folder?.id as string) ?? "";
          return folderId;
        },
        { timeout: 15000 },
      )
      .toBeTruthy();
    const { data: placeRow } = await admin
      .from("place")
      .insert({
        trip_id: data.tripId,
        name: "폴더장소",
        category: "cafe",
        folder_id: folderId,
        saved_by: data.a.id,
      })
      .select("id")
      .single();
    const placeId = placeRow?.id as string;

    // 새로고침 → 폴더 개수 1 반영.
    await page.goto(`/trips/${data.tripId}?view=places`);
    await expect(
      page.getByRole("button", { name: /카페투어/ }).first(),
    ).toContainText("1", { timeout: 20000 });

    // 폴더 삭제(더보기 → 삭제 → 확인).
    await page.getByRole("button", { name: "카페투어 폴더 관리" }).click();
    await page.getByRole("button", { name: "삭제" }).click();
    await page.getByRole("button", { name: "삭제할게요" }).click();
    await expect(page.getByText("카페투어")).toHaveCount(0, { timeout: 20000 });

    // 장소는 남고 folder_id=null(미분류) — 서버 ON DELETE SET NULL(삭제 커밋까지 폴링).
    await expect
      .poll(
        async () => {
          const { data: after } = await admin
            .from("place")
            .select("folder_id")
            .eq("id", placeId)
            .maybeSingle();
          return after ? after.folder_id : "missing";
        },
        { timeout: 15000 },
      )
      .toBeNull();
  });
});
