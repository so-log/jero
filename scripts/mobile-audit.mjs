// mobile-audit.mjs — 모바일 반응형 감사(가로 넘침 자동 검출)
//
// 눈대중 대신 프로그램으로 "뷰포트를 넘는 요소"를 찾는다. 화면마다 스크린샷을 남기고,
// 넘치는 요소를 리프 우선으로 추려 리포트한다. 하나라도 있으면 exit 1 — 게이트로 쓸 수 있다.
//
// 실행: 저장소 루트에서 (dev 서버가 떠 있어야 한다)
//   yarn dev                       # 다른 터미널
//   yarn audit:mobile              # (= node scripts/mobile-audit.mjs)
//
// 요구:
//   - Playwright chromium 설치됨(yarn playwright install chromium)
//   - 데모 계정 시딩됨(scripts/seed-demo.mjs) — demo@jero.travel
//
// 결과:
//   e2e/__screenshots__/mobile/<화면>.png   (gitignore 됨)
//   e2e/__screenshots__/mobile/report.json
//
// 옵션 env:
//   JERO_URL(기본 http://localhost:3000) · DEMO_EMAIL · DEMO_PW
//   SHARE_TOKEN(공유 뷰 강제 지정) · HEADLESS=0(창 띄우기) · VIEWPORT_W(기본 390)

import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

// ── env 로드 (.env.local 간단 파서 — seed-demo.mjs 와 동일 규약) ──
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* .env.local 없으면 환경변수만 사용 */
  }
}
loadEnv();

const BASE = (process.env.JERO_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.DEMO_EMAIL || "demo@jero.travel";
const PW = process.env.DEMO_PW || "JeroDemo2026!";
const HEADLESS = process.env.HEADLESS !== "0";
const VW = Number(process.env.VIEWPORT_W || 390);
const VH = 844;
const OUT = "e2e/__screenshots__/mobile";

mkdirSync(OUT, { recursive: true });

/**
 * 페이지 안에서 가로로 넘치는 요소를 수집한다.
 *
 * 노이즈 줄이기:
 *  - **스크롤 가능 조상 제외** — 조상 중 하나라도 computed overflow-x/y 가 auto|scroll 이면
 *    (=사용자가 실제로 가로 스크롤할 수 있는 컨테이너 안) 그 안의 넘침은 의도된 것(가로 스크롤
 *    카드·칩 줄 등)이라 제외. **`hidden` 은 여기 포함하지 않는다** — 구글맵 내부 뷰포트 pane 처럼
 *    라이브러리가 자체 클리핑 용도로 흔히 쓰는 값이라, 포함하면 지도 컨테이너가 찌그러져
 *    보이지 않게 된 실제 레이아웃 버그까지 통째로 숨어버린다(검증 중 실제로 재현됨 — 공유 뷰
 *    반응형 버그가 `overflow:hidden` 뒤에서 오탐 없이 통과해버렸다).
 *  - **리프 우선** — 자식이 넘치면 부모는 버린다(같은 문제를 조상까지 N번 보고하지 않게).
 *  - 크기 0(display:none 등)·`<html>`/`<body>` 제외.
 *  - 완전히 화면 밖(left >= vw)인 것은 `offscreen` 으로 표시 — 닫힌 오프캔버스 드로어처럼
 *    의도적으로 밀어둔 요소가 대부분이라 진짜 넘침과 섞이면 안 된다.
 */
async function collectOverflow(page, vw) {
  return page.evaluate((viewportWidth) => {
    const TOL = 1; // 반올림 오차 여유
    const CLIP = new Set(["auto", "scroll"]);

    function hasClippingAncestor(el) {
      let node = el.parentElement;
      while (node && node !== document.documentElement) {
        const cs = getComputedStyle(node);
        if (CLIP.has(cs.overflowX) || CLIP.has(cs.overflowY)) return true;
        node = node.parentElement;
      }
      return false;
    }

    const all = Array.from(document.querySelectorAll("*"));
    const overflowing = new Set();
    const rects = new Map();

    for (const el of all) {
      if (el === document.documentElement || el === document.body) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) continue;
      if (rect.right > viewportWidth + TOL && !hasClippingAncestor(el)) {
        overflowing.add(el);
        rects.set(el, rect);
      }
    }

    // 리프 우선: 넘치는 자손이 하나라도 있으면 그 조상은 보고하지 않는다.
    const leaves = [...overflowing].filter((el) => {
      for (const other of overflowing) {
        if (other !== el && el.contains(other)) return false;
      }
      return true;
    });

    return leaves
      .map((el) => {
        const rect = rects.get(el);
        const cls =
          typeof el.className === "string"
            ? el.className
            : (el.getAttribute("class") ?? "");
        return {
          tag: el.tagName.toLowerCase(),
          class: cls.trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          overflow: Math.round(rect.right - viewportWidth),
          offscreen: rect.left >= viewportWidth,
          text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30),
        };
      })
      .sort((a, b) => b.overflow - a.overflow);
  }, vw);
}

/** 페이지 자체가 가로 스크롤되는지(넘침이 실제 스크롤로 이어졌는지). */
async function pageScroll(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrolls: document.documentElement.scrollWidth > window.innerWidth,
  }));
}

const results = [];

/** 화면 하나를 감사한다: 스크린샷 + 넘침 수집. */
async function audit(page, name, { settle = 1200 } = {}) {
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${OUT}/${name}.png` });

  const [elements, scroll] = await Promise.all([
    collectOverflow(page, VW),
    pageScroll(page),
  ]);
  const real = elements.filter((e) => !e.offscreen);
  const offscreen = elements.filter((e) => e.offscreen);

  results.push({ name, url: page.url(), scroll, elements: real, offscreen });

  const mark = real.length === 0 && !scroll.scrolls ? "OK  " : "NG  ";
  console.log(
    `${mark}${name.padEnd(22)} 넘침 ${String(real.length).padStart(2)}건` +
      (scroll.scrolls ? `  · 페이지 가로 스크롤(${scroll.scrollWidth}px)` : "") +
      (offscreen.length ? `  · 화면 밖 ${offscreen.length}건(무시)` : ""),
  );
  for (const el of real.slice(0, 8)) {
    console.log(
      `      +${String(el.overflow).padStart(4)}px  <${el.tag}> ${el.class || "(class 없음)"}` +
        (el.text ? `  "${el.text}"` : ""),
    );
  }
}

const browser = await chromium.launch({ headless: HEADLESS });
const context = await browser.newContext({
  viewport: { width: VW, height: VH },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "ko-KR",
});
const page = await context.newPage();
page.setDefaultTimeout(30000);

try {
  // ── 로그인 ────────────────────────────────────────────────
  // ★ 하이드레이션 전에 제출하면 네이티브 GET(?email=…)으로 새어나간다 —
  //   capture-screenshots.mjs 와 같은 대기·재시도 규약을 쓴다.
  console.log(`→ 로그인 (${BASE})…`);
  const submit = async () => {
    await page.getByPlaceholder("you@email.com").fill(EMAIL);
    await page.getByPlaceholder("비밀번호").fill(PW);
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForTimeout(1500);
  };
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.getByPlaceholder("you@email.com").waitFor({ state: "visible" });
  await page.waitForTimeout(3000);
  await submit();
  if (/[?&]email=/.test(page.url())) {
    console.log("  (하이드레이션 전 제출 감지 — 재시도)");
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await page.waitForTimeout(6000);
    await submit();
  }
  await page.waitForURL("**/trips", { timeout: 30000 });

  // ── 1. 여행 목록 ──────────────────────────────────────────
  await audit(page, "01-trips");

  // ── 여행 열기(데모 여행 id 확보) ─────────────────────────
  await page.getByText("도쿄 가을 여행").first().click();
  await page.waitForURL(/\/trips\/[^/?]+/, { timeout: 30000 });
  const tripId = new URL(page.url()).pathname.split("/")[2];
  console.log(`  trip: ${tripId}`);

  // ── 2~6. 워크스페이스 5뷰 ────────────────────────────────
  const VIEWS = [
    { key: "plan", name: "02-plan", settle: 4000 }, // 지도 타일
    { key: "calendar", name: "03-calendar", settle: 1500 },
    { key: "places", name: "04-places", settle: 2500 }, // 지도 포함
    { key: "budget", name: "05-budget", settle: 2500 }, // 차트
    { key: "stats", name: "06-stats", settle: 2500 }, // 차트
  ];
  for (const v of VIEWS) {
    await page.goto(`${BASE}/trips/${tripId}?view=${v.key}`, {
      waitUntil: "domcontentloaded",
    });
    await audit(page, v.name, { settle: v.settle });
  }

  // ── 7. 모바일 메뉴 드로어(WorkspaceMobileBar) ────────────
  await page.goto(`${BASE}/trips/${tripId}?view=plan`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2500);
  const menu = page.getByRole("button", { name: "메뉴 열기" });
  if (await menu.isVisible().catch(() => false)) {
    await menu.click();
    await audit(page, "07-menu-drawer", { settle: 900 });
    await page.keyboard.press("Escape").catch(() => {});
  } else {
    console.log("SKIP  07-menu-drawer          (메뉴 버튼 없음)");
  }

  // ── 8. AI 어시스턴트 바텀시트 ─────────────────────────────
  await page.goto(`${BASE}/trips/${tripId}?view=plan`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2500);
  const fab = page.getByRole("button", { name: "AI 여행 어시스턴트 열기" });
  if (await fab.isVisible().catch(() => false)) {
    await fab.click();
    await audit(page, "08-assistant-sheet", { settle: 1200 });
  } else {
    console.log("SKIP  08-assistant-sheet      (LLM 키 없음 — FAB 미노출)");
  }

  // ── 9. 설정 ───────────────────────────────────────────────
  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await audit(page, "09-settings", { settle: 1500 });

  // ── 10. 공유 링크(읽기 전용) ─────────────────────────────
  // 토큰은 env 우선, 없으면 데모 여행의 share_link 를 service_role 로 조회한다.
  let token = process.env.SHARE_TOKEN || "";
  if (!token && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const { data } = await db
        .from("share_link")
        .select("token")
        .eq("trip_id", tripId)
        .limit(1);
      token = data?.[0]?.token ?? "";
    } catch {
      /* 조회 실패 시 공유 뷰만 건너뛴다 */
    }
  }
  if (token) {
    await page.goto(`${BASE}/share/${token}`, { waitUntil: "domcontentloaded" });
    await audit(page, "10-share", { settle: 3000 });
  } else {
    console.log("SKIP  10-share                (공유 토큰 없음 — SHARE_TOKEN 지정 가능)");
  }

  // ── 리포트 ────────────────────────────────────────────────
  const totalOverflow = results.reduce((n, r) => n + r.elements.length, 0);
  const scrollingScreens = results.filter((r) => r.scroll.scrolls).map((r) => r.name);

  const report = {
    viewport: { width: VW, height: VH },
    base: BASE,
    screens: results.length,
    totalOverflow,
    scrollingScreens,
    results,
  };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2), "utf8");

  console.log("\n──────── 요약 ────────");
  console.log(`화면 ${results.length}개 · 넘침 요소 ${totalOverflow}건`);
  if (scrollingScreens.length) {
    console.log(`페이지 가로 스크롤: ${scrollingScreens.join(", ")}`);
  }
  console.log(`리포트: ${OUT}/report.json · 스크린샷: ${OUT}/*.png`);

  if (totalOverflow > 0 || scrollingScreens.length > 0) {
    console.log("\n❌ 모바일 넘침이 있습니다.");
    process.exitCode = 1;
  } else {
    console.log("\n✅ 넘침 없음.");
  }
} catch (e) {
  console.error("❌ 실패:", e.message);
  console.error(
    "힌트: dev 서버(yarn dev) 기동, 데모 계정 시딩(seed-demo.mjs), 브라우저 설치(yarn playwright install chromium) 확인.",
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
