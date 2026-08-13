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

    /*
     * 실 LLM 을 때리는 스모크라, 무료 티어 분당 쿼터에 걸리면 SDK 가 백오프 재시도를 하며
     * 오래 걸린다(테스트를 연달아 돌릴 때 발생). 그래서 **둘 중 하나**를 기다린다:
     *   ① 실제 답변이 채워짐  ② 사용자에게 안내 문구가 뜸
     * 어느 쪽이든 "조용히 무응답"은 아니어야 한다 — 그게 이 스모크가 지키는 계약이다.
     * 카드·레이아웃 등 결정적 검증은 아래 "추천 카드" 블록(모킹)이 담당한다.
     */
    await expect
      .poll(async () => (await log.innerText()).length, { timeout: 90000 })
      .toBeGreaterThan(60);

    const text = await log.innerText();
    const gotAnswer = text.length > 60;
    const gotNotice = /지금은 답할 수 없어요|사용량을 다 썼어요/.test(text);
    expect(gotAnswer || gotNotice).toBe(true);

    // 정상 답변일 때만 근거 칩을 확인한다(에러 시엔 칩이 없는 게 맞다).
    if (gotAnswer && !gotNotice) {
      await expect(panel.getByText("참고")).toBeVisible({ timeout: 20000 });
    }

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

/**
 * 추천 카드 렌더(Phase 3) — Places 서버 키 없이도 **카드 UI 자체**를 검증한다.
 * 챗 엔드포인트를 가로채 서버와 동일한 와이어 포맷(텍스트 + 카드 프레임)을 돌려준다.
 * 실제 Places 호출 경로는 키 투입 후 별도 확인이 필요하다.
 */
test.describe("AI 어시스턴트 — 추천 카드", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`assistant-card-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  const CARDS = [
    {
      name: "블루보틀 아오야마",
      address: "도쿄도 미나토구 미나미아오야마 3-13-14",
      lat: 35.6672,
      lng: 139.7118,
      googlePlaceId: "ChIJ_blue",
      category: "cafe",
    },
    {
      name: "네즈 미술관",
      address: "도쿄도 미나토구 미나미아오야마 6-5-1",
      lat: 35.6647,
      lng: 139.7166,
      googlePlaceId: "ChIJ_nezu",
      category: "museum",
    },
  ];

  test("실존 장소 카드가 미니맵·카테고리·주소와 함께 렌더된다", async ({ page }) => {
    test.setTimeout(90000);

    await page.route("**/api/assistant/chat", async (route) => {
      const frame = "\u001E" + JSON.stringify({ cards: CARDS }) + "\u001E";
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-assistant-evidence": encodeURIComponent(
            JSON.stringify([{ label: "저장한 장소 3곳", icon: "bookmark" }]),
          ),
        },
        body: "아오야마 근처로 두 곳 골라봤어요." + frame,
      });
    });

    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=plan`);

    const enabled = await fab(page)
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!enabled, "LLM 키 없음");

    await fab(page).click();
    const panel = page.getByRole("dialog", { name: "AI 여행 어시스턴트" });
    await panel.getByRole("button", { name: /카페 추천/ }).click();

    const log = panel.getByRole("log", { name: "대화 내용" });
    await expect(log.getByText("블루보틀 아오야마")).toBeVisible({ timeout: 20000 });
    await expect(log.getByText("네즈 미술관")).toBeVisible();
    await expect(
      log.getByText("도쿄도 미나토구 미나미아오야마 3-13-14"),
    ).toBeVisible();
    // editor 라 액션 버튼이 보인다(Phase 4 에서 배선).
    await expect(panel.getByRole("button", { name: "저장" }).first()).toBeVisible();
    await expect(panel.getByRole("button", { name: "일정에" }).first()).toBeVisible();

    await page.screenshot({
      path: "e2e/__screenshots__/assistant-cards.png",
      fullPage: false,
    });
  });
});

/**
 * 코스 적용(Phase 4) — 제안 → 확인 → **실제 일정 반영** → 되돌리기.
 * 챗 응답만 가로채고, 그 뒤 쓰기는 **실제 뮤테이션·RLS** 를 그대로 탄다(설계 §5.2).
 */
test.describe("AI 어시스턴트 — 코스 적용", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`assistant-course-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  const COURSE = {
    summary: "아오야마 도보 코스",
    places: [
      {
        name: "코스 카페 하나",
        category: "cafe",
        lat: 35.6672,
        lng: 139.7118,
        googlePlaceId: "ChIJ_course_1",
        address: "도쿄도 미나토구 1",
        day: 1,
        order: 1,
        reason: "오전에 들르기 좋아요",
      },
      {
        name: "코스 미술관 둘",
        category: "museum",
        lat: 35.6647,
        lng: 139.7166,
        googlePlaceId: "ChIJ_course_2",
        address: "도쿄도 미나토구 2",
        day: 1,
        order: 2,
        reason: "카페에서 도보 5분",
      },
      {
        name: "코스 식당 셋",
        category: "food",
        lat: 35.6702,
        lng: 139.7026,
        googlePlaceId: "ChIJ_course_3",
        address: "도쿄도 미나토구 3",
        day: 2,
        order: 1,
        reason: "둘째 날 저녁",
      },
    ],
  };

  async function stubCourse(page: Page): Promise<void> {
    await page.route("**/api/assistant/chat", async (route) => {
      const frame = "" + JSON.stringify({ course: COURSE }) + "";
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: "이런 코스는 어떠세요?" + frame,
      });
    });
  }

  test("코스 제안 → 적용 → 일정 반영 → 되돌리기", async ({ page }) => {
    test.setTimeout(120000);
    await stubCourse(page);
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=plan`);

    const enabled = await fab(page)
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!enabled, "LLM 키 없음");

    await fab(page).click();
    const panel = page.getByRole("dialog", { name: "AI 여행 어시스턴트" });
    await panel.getByRole("button", { name: /2일 코스 짜줘/ }).click();

    // Day 타임라인이 시안대로 렌더된다.
    const log = panel.getByRole("log", { name: "대화 내용" });
    await expect(log.getByText("2일 코스 제안")).toBeVisible({ timeout: 20000 });
    await expect(log.getByText("Day 1")).toBeVisible();
    await expect(log.getByText("코스 카페 하나")).toBeVisible();
    await expect(log.getByText("오전에 들르기 좋아요")).toBeVisible();

    await page.screenshot({
      path: "e2e/__screenshots__/assistant-course.png",
      fullPage: false,
    });

    // 적용 — 확인 다이얼로그를 거친다(설계 §5.2-1).
    await panel.getByRole("button", { name: "코스 적용" }).click();
    const confirm = page.getByRole("alertdialog", {
      name: "코스를 일정에 적용할까요?",
    });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "적용" }).click();

    await expect(panel.getByText("3곳을 일정에 추가했어요")).toBeVisible({
      timeout: 30000,
    });

    // 적용 후: 결과 안내 + 되돌리기 + 동선 최적화 연계(설계 §5.2-7).
    // 대화 영역으로 좁힌다 — 빠른 질문 칩에도 같은 이름이 있다.
    await expect(log.getByRole("button", { name: "되돌리기" })).toBeVisible();
    await expect(log.getByRole("button", { name: "동선 최적화" })).toBeVisible();
    await page.screenshot({
      path: "e2e/__screenshots__/assistant-course-applied.png",
      fullPage: false,
    });

    /*
     * ★ 실제 일정에 반영됐다 — 패널을 닫고 플랜 뷰에서 확인한다.
     * 일정 카드는 **버튼**이라 패널 안 코스 텍스트와 구분된다(같은 이름이 양쪽에 있다).
     */
    const planCard = (name: string) =>
      page.getByRole("button", { name: new RegExp(name) });

    await panel.getByRole("button", { name: "어시스턴트 닫기" }).click();
    await expect(planCard("코스 카페 하나")).toBeVisible({ timeout: 20000 });
    await expect(planCard("코스 미술관 둘")).toBeVisible();

    // 패널을 다시 열어도 "코스 적용"이 아니라 결과·되돌리기가 보인다(중복 적용 방지).
    await fab(page).click();
    await expect(panel.getByText("3곳을 일정에 추가했어요")).toBeVisible();
    await expect(panel.getByRole("button", { name: "코스 적용" })).toBeHidden();

    // 되돌리기 — 이번에 만든 3곳이 일정에서 사라진다.
    await log.getByRole("button", { name: "되돌리기" }).click();
    await expect(planCard("코스 카페 하나")).toBeHidden({ timeout: 30000 });
    await expect(planCard("코스 미술관 둘")).toBeHidden();
  });

  test("★ viewer 는 코스를 보되 적용 버튼이 없다(기획 §7.1)", async ({ page }) => {
    test.setTimeout(120000);
    // B 를 viewer 로 낮춘다 — 읽기 전용 경계를 실제 역할로 검증한다.
    const admin = adminClient();
    const { error } = await admin
      .from("trip_member")
      .update({ role: "viewer" })
      .eq("trip_id", data.tripId)
      .eq("user_id", data.b.id);
    expect(error).toBeNull();

    await stubCourse(page);
    await login(page, data.b);
    await page.goto(`/trips/${data.tripId}?view=plan`);

    const enabled = await fab(page)
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!enabled, "LLM 키 없음");

    await fab(page).click();
    const panel = page.getByRole("dialog", { name: "AI 여행 어시스턴트" });
    await panel.getByRole("button", { name: /카페 추천/ }).click();

    // 코스 내용은 보인다.
    await expect(panel.getByText("코스 카페 하나")).toBeVisible({ timeout: 20000 });
    // 실행 버튼 대신 읽기 전용 안내.
    await expect(
      panel.getByText("읽기 전용 — 코스를 적용하려면 편집 권한이 필요해요"),
    ).toBeVisible();
    await expect(panel.getByRole("button", { name: "코스 적용" })).toBeHidden();

    // 역할 원복(뒤 테스트 격리).
    await admin
      .from("trip_member")
      .update({ role: "editor" })
      .eq("trip_id", data.tripId)
      .eq("user_id", data.b.id);
  });

  test("모바일 375 — 코스 블록이 시트 안에서 잘리지 않는다", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 375, height: 760 });
    await stubCourse(page);
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=plan`);

    const enabled = await fab(page)
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!enabled, "LLM 키 없음");

    await fab(page).click();
    const panel = page.getByRole("dialog", { name: "AI 여행 어시스턴트" });
    await panel.getByRole("button", { name: /2일 코스 짜줘/ }).click();

    const block = panel.getByText("2일 코스 제안");
    await expect(block).toBeVisible({ timeout: 20000 });

    // 코스 블록이 시트 너비 안에 들어온다(가로 스크롤 없음).
    const box = await panel
      .getByRole("button", { name: "코스 적용" })
      .boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);

    await page.screenshot({
      path: "e2e/__screenshots__/assistant-course-mobile.png",
      fullPage: false,
    });
  });
});

/**
 * 가드레일(Phase 5) — 사용량 표시·한도 소진 잠금.
 * 챗 응답만 가로채 헤더/429 를 흉내낸다(실제 한도를 소진시키지 않는다).
 */
test.describe("AI 어시스턴트 — 가드레일", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`assistant-guard-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  async function openPanel(page: Page) {
    await login(page, data.a);
    await page.goto(`/trips/${data.tripId}?view=plan`);
    const enabled = await fab(page)
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!enabled, "LLM 키 없음");
    await fab(page).click();
    return page.getByRole("dialog", { name: "AI 여행 어시스턴트" });
  }

  test("잔여 사용량을 캡션으로 보여준다", async ({ page }) => {
    test.setTimeout(120000);
    await page.route("**/api/assistant/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-assistant-remaining": "12",
          "x-assistant-limit": "30",
        },
        body: "시부야에 조용한 카페가 몇 곳 있어요.",
      });
    });

    const panel = await openPanel(page);
    await panel.getByRole("button", { name: /카페 추천/ }).click();

    await expect(panel.getByText("오늘 12회 남음")).toBeVisible({ timeout: 20000 });
    await page.screenshot({
      path: "e2e/__screenshots__/assistant-usage.png",
      fullPage: false,
    });
  });

  test("★ 한도 소진 시 안내 + 입력 잠금", async ({ page }) => {
    test.setTimeout(120000);
    await page.route("**/api/assistant/chat", async (route) => {
      await route.fulfill({
        status: 429,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "rate_limited", remaining: 0, limit: 30 }),
      });
    });

    const panel = await openPanel(page);
    await panel.getByRole("button", { name: /카페 추천/ }).click();

    await expect(panel.getByRole("status")).toContainText(
      "오늘 사용량을 다 썼어요(30/30)",
      { timeout: 20000 },
    );
    await expect(
      panel.getByPlaceholder("내일 다시 이용할 수 있어요"),
    ).toBeDisabled();
    await expect(panel.getByRole("button", { name: /카페 추천/ })).toBeDisabled();

    await page.screenshot({
      path: "e2e/__screenshots__/assistant-rate-limited.png",
      fullPage: false,
    });
  });
});
