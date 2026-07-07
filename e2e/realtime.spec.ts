import type { SupabaseClient } from "@supabase/supabase-js";

import { test, expect, type Page } from "./realtime/fixtures";
import {
  bootstrap,
  hasBackend,
  signedInClient,
  teardown,
  type RtData,
  type RtUser,
} from "./realtime/support";

/**
 * 실시간 협업(계약 B4) 실검증 — 2계정 동시 접속(Playwright 2 컨텍스트).
 *  (1) A 쓰기(장소 추가·순서변경) → B 화면 자동 반영(postgres_changes → invalidate)  ✅
 *  (4) 비멤버 C 는 그 trip 채널 구독 거부(realtime.messages RLS)                      ✅
 *  (2) presence("접속 중") 아바타 → **broadcast heartbeat** 로 구현(네이티브 realtime presence sync 가
 *      이 프로젝트에서 미전달이라 broadcast 로 우회). A·B 상호 접속 표시 + 이탈 시 제거를 검증.
 *  (3) 낙관적↔실시간 reconciliation: 순서변경 동기화(서버측 결과)까지 자동 검증. 드래그 클라이언트의
 *      "무깜빡임"은 dnd-kit 드래그 자동화 불안정 + 훅 in-flight 가드 로직으로 갈음(수동 2브라우저 확인 권장).
 * 데이터는 service_role 로 부트스트랩(사용자 승인) 후 종료 시 전량 삭제.
 */

const RUN_ID = Date.now().toString(36);

let data: RtData;

test.describe("실시간 협업(B4)", () => {
  test.skip(
    !hasBackend,
    ".env.local 에 Supabase URL/anon/service_role 키가 있어야 실행됩니다.",
  );

  test.beforeAll(async () => {
    data = await bootstrap(RUN_ID);
  });

  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  async function login(page: Page, user: RtUser): Promise<void> {
    await page.goto("/");
    await page.getByPlaceholder("you@email.com").fill(user.email);
    await page.getByPlaceholder("비밀번호").fill(user.password);
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/trips(\?|$)/, { timeout: 20000 });
  }

  /** Supabase(REST) 4xx/5xx + supabase/realtime 관련 콘솔 에러만 수집(무관 도메인 제외). */
  function trackErrors(page: Page, host: string): string[] {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (t.includes(host) || /realtime|supabase/i.test(t)) errors.push(`console: ${t}`);
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("response", (r) => {
      if (r.status() >= 400 && r.url().includes(host)) {
        errors.push(`${r.status()} ${r.url()}`);
      }
    });
    return errors;
  }

  test("(1)(3) A 쓰기(추가·순서변경) → B 화면 자동 반영", async ({
    browser,
    supabaseHost,
  }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    const errA = trackErrors(pageA, supabaseHost);
    const errB = trackErrors(pageB, supabaseHost);

    try {
      await login(pageA, data.a);
      await login(pageB, data.b);

      const url = `/trips/${data.tripId}?view=plan`;
      await pageA.goto(url);
      await pageB.goto(url);

      // 시드 장소가 양쪽에 렌더(워크스페이스 + 실시간 채널 구독 확립).
      await expect(pageA.getByText("가장소 카페")).toBeVisible({ timeout: 20000 });
      await expect(pageB.getByText("가장소 카페")).toBeVisible({ timeout: 20000 });

      // (1) A(editor/owner)가 장소 추가 → B·A 화면 자동 반영(postgres_changes → invalidate).
      const { client: aClient } = await signedInClient(data.a);
      const { error: insErr } = await aClient.from("place").insert({
        trip_id: data.tripId,
        name: "실시간추가장소",
        category: "museum",
        scheduled_date: data.date,
        order_in_day: 4,
        saved_by: data.a.id,
        scheduled_by: data.a.id,
      });
      expect(insErr).toBeNull();
      await expect(pageB.getByText("실시간추가장소")).toBeVisible({ timeout: 20000 });
      await expect(pageA.getByText("실시간추가장소")).toBeVisible({ timeout: 20000 });

      // (3) A 가 순서변경(다장소 상점 → 1번) → B·A 리스트 순번 반영.
      const [p1, p2, p3] = data.places;
      const { data: added } = await aClient
        .from("place")
        .select("id")
        .eq("trip_id", data.tripId)
        .eq("name", "실시간추가장소")
        .limit(1);
      const p4Id = added?.[0]?.id as string;
      const { error: reErr } = await aClient.rpc("reorder_places", {
        p_trip_id: data.tripId,
        p_date: data.date,
        p_ids: [p3.id, p1.id, p2.id, p4Id],
      });
      expect(reErr).toBeNull();

      // 다장소 상점 카드가 순번 배지 "1" 을 갖는다(양쪽 반영).
      await expect(
        pageB.getByRole("button").filter({ hasText: "다장소 상점" }),
      ).toContainText("1", { timeout: 20000 });
      await expect(
        pageA.getByRole("button").filter({ hasText: "다장소 상점" }),
      ).toContainText("1", { timeout: 20000 });

      await aClient.auth.signOut();

      // 콘솔·Supabase 4xx/5xx 0건.
      expect(errA, `A 페이지 오류: ${errA.join(" | ")}`).toEqual([]);
      expect(errB, `B 페이지 오류: ${errB.join(" | ")}`).toEqual([]);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  // (2) presence(broadcast heartbeat) — 상호 접속 표시 + 이탈 시 제거.
  test("(2) A·B 상단바에 서로 presence 아바타 표시 + 이탈 시 사라짐", async ({
    browser,
  }) => {
    test.setTimeout(100_000); // 이탈은 bye(best-effort) 실패 시 TTL(30s)로 정리 — 여유 대기.
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    try {
      await login(pageA, data.a);
      await login(pageB, data.b);
      const url = `/trips/${data.tripId}?view=plan`;
      await pageA.goto(url);
      await pageB.goto(url);

      const headerA = pageA.locator("header");
      const headerB = pageB.locator("header");

      // 상호 접속: A 헤더에 B("B"), B 헤더에 A("A") 아바타(자기 자신도 포함).
      await expect(headerA.getByText("B", { exact: true })).toBeVisible({ timeout: 20000 });
      await expect(headerA.getByText("A", { exact: true })).toBeVisible({ timeout: 20000 });
      await expect(headerB.getByText("A", { exact: true })).toBeVisible({ timeout: 20000 });
      await expect(headerB.getByText("B", { exact: true })).toBeVisible({ timeout: 20000 });

      // B 가 워크스페이스 이탈 → 훅 unmount(bye best-effort) → 미수신 시 heartbeat 끊겨 TTL(30s)로 만료.
      await pageB.goto("/trips");
      await expect(pageB).toHaveURL(/\/trips(\?|$)/, { timeout: 20000 });
      await expect(headerA.getByText("B", { exact: true })).toHaveCount(0, { timeout: 45000 });
      // A 자신은 계속 접속 표시.
      await expect(headerA.getByText("A", { exact: true })).toBeVisible();
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("(4) 비멤버 C 는 trip 채널 구독 거부 (realtime RLS)", async () => {
    // 양성 대조: 멤버 A 는 구독 성공.
    const { client: aClient } = await signedInClient(data.a);
    const aStatus = await subscribeStatus(aClient, data.tripId);
    await aClient.auth.signOut();
    expect(aStatus, "멤버 A 는 구독 성공해야 함").toBe("SUBSCRIBED");

    // 음성: 비멤버 C 는 거부(CHANNEL_ERROR 등, SUBSCRIBED 아님).
    const { client: cClient } = await signedInClient(data.c);
    const cStatus = await subscribeStatus(cClient, data.tripId);
    await cClient.auth.signOut();
    expect(cStatus, "비멤버 C 는 구독 거부돼야 함").not.toBe("SUBSCRIBED");
  });
});

/** private 채널 subscribe 결과 상태를 1회 관측(타임아웃 시 NO_STATUS). */
async function subscribeStatus(
  client: SupabaseClient,
  tripId: string,
): Promise<string> {
  return new Promise<string>((resolve) => {
    const channel = client.channel(`trip:${tripId}`, {
      config: { private: true },
    });
    let done = false;
    const finish = (status: string) => {
      if (done) return;
      done = true;
      void client.removeChannel(channel);
      resolve(status);
    };
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") finish("SUBSCRIBED");
      else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        finish(status);
      }
    });
    setTimeout(() => finish("NO_STATUS"), 12000);
  });
}
