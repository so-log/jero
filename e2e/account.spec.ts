import { test, expect, type Page } from "@playwright/test";

import {
  adminClient,
  anonClient,
  bootstrap,
  createSoloOwner,
  hasBackend,
  teardown,
  type RtData,
  type RtUser,
} from "./realtime/support";

/**
 * 계정(09) 실연동 검증 — 프로필 조회·저장(서버 라우트) + 계정 삭제(소유권 승계/단독 삭제).
 * 데이터는 service_role 로 부트스트랩 후 종료 시 삭제(삭제 테스트로 이미 지워진 계정은 무시).
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

interface MemberRow {
  user_id: string;
  role: string;
}

test.describe("계정(09) 실연동", () => {
  test.skip(!hasBackend, ".env.local 키 필요");

  test.beforeAll(async () => {
    data = await bootstrap(RUN);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test("프로필 표시 + 이름·색 저장 → 유지 + 워크스페이스 아바타 반영", async ({
    page,
  }) => {
    await login(page, data.a);
    await page.goto("/settings");

    // 실표시: 이름(Ada)·이메일.
    await expect(page.getByPlaceholder("이름")).toHaveValue("Ada", { timeout: 20000 });
    await expect(page.getByText(data.a.email).first()).toBeVisible();

    // 이름·아바타색 수정 → 저장.
    await page.getByPlaceholder("이름").fill("Zoe");
    await page.getByRole("button", { name: "아바타 색 #B07CF0" }).click();
    await page.getByRole("button", { name: "변경사항 저장" }).click();
    await expect(page.getByText("모든 변경사항이 저장되었어요")).toBeVisible({
      timeout: 20000,
    });

    // 서버 실반영 확인(profile 행).
    const admin = adminClient();
    const { data: prof } = await admin
      .from("profile")
      .select("name, avatar_color")
      .eq("id", data.a.id)
      .single();
    expect(prof?.name).toBe("Zoe");
    expect(prof?.avatar_color).toBe("#B07CF0");

    // 새로고침 유지.
    await page.reload();
    await expect(page.getByPlaceholder("이름")).toHaveValue("Zoe", { timeout: 20000 });

    // 워크스페이스 아바타 반영(멤버 이니셜 = 이름 첫 글자 → "Z", 본인 presence).
    await page.goto(`/trips/${data.tripId}?view=plan`);
    await expect(page.locator("header").getByText("Z", { exact: true })).toBeVisible({
      timeout: 20000,
    });
  });

  test("계정 삭제(위임): A 삭제 → 여행 생존 + B owner 승계 + A 제거", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await login(page, data.a);
    await page.goto("/settings");
    await page.getByRole("button", { name: "계정 삭제" }).click();
    await page.getByRole("button", { name: "삭제할게요" }).click();
    await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 20000 });

    const admin = adminClient();
    // 여행 생존.
    const { data: trip } = await admin
      .from("trip")
      .select("id")
      .eq("id", data.tripId)
      .maybeSingle();
    expect(trip).toBeTruthy();
    // 멤버: A 제거, B 가 owner 승계.
    const { data: members } = await admin
      .from("trip_member")
      .select("user_id, role")
      .eq("trip_id", data.tripId)
      .returns<MemberRow[]>();
    expect(members?.some((m) => m.user_id === data.a.id)).toBe(false);
    expect(members?.find((m) => m.user_id === data.b.id)?.role).toBe("owner");
    // A 계정 삭제됨(로그인 불가).
    const { error: signInErr } = await anonClient().auth.signInWithPassword({
      email: data.a.email,
      password: data.a.password,
    });
    expect(signInErr).toBeTruthy();
  });

  test("계정 삭제(단독 소유): 여행+계정 cascade 삭제", async ({ page }) => {
    test.setTimeout(60000);
    const { user: solo, tripId } = await createSoloOwner(RUN);

    await login(page, solo);
    await page.goto("/settings");
    await page.getByRole("button", { name: "계정 삭제" }).click();
    await page.getByRole("button", { name: "삭제할게요" }).click();
    await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 20000 });

    const admin = adminClient();
    const { data: trip } = await admin
      .from("trip")
      .select("id")
      .eq("id", tripId)
      .maybeSingle();
    expect(trip).toBeNull(); // 여행 cascade 삭제
    const { error: signInErr } = await anonClient().auth.signInWithPassword({
      email: solo.email,
      password: solo.password,
    });
    expect(signInErr).toBeTruthy(); // 계정 삭제
  });
});
