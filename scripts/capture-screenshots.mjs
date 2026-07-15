// capture-screenshots.mjs — README용 스크린샷 자동 캡처
//
// 실행: 저장소 루트에서
//   node scripts/capture-screenshots.mjs
//
// 요구:
//   - Playwright 브라우저 설치됨(이미 e2e용으로 설치: yarn playwright install chromium)
//   - 데모 계정 시딩됨(scripts/seed-demo.mjs) — demo@jero.travel
//   - 인터넷(라이브 앱 접속)
//
// 결과: docs/screenshots/plan-hero.png · budget.png · calendar.png (README가 자동 렌더)
// 옵션 env: JERO_URL, DEMO_EMAIL, DEMO_PW, HEADLESS=1(기본 창 표시 — 지도 렌더 안정)

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = (process.env.JERO_URL || "https://jero-travel.vercel.app").replace(/\/$/, "");
const EMAIL = process.env.DEMO_EMAIL || "demo@jero.travel";
const PW = process.env.DEMO_PW || "JeroDemo2026!";
const OUT = "docs/screenshots";
const HEADLESS = process.env.HEADLESS === "1"; // 기본 headed — 지도/폰트 렌더가 더 안정적

const SHOTS = [
  { view: "plan", file: "plan-hero.png", wait: 4500 }, // 지도 타일 로드 여유
  { view: "budget", file: "budget.png", wait: 2500 },
  { view: "calendar", file: "calendar.png", wait: 2000 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: HEADLESS });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 820 },
  deviceScaleFactor: 2, // 레티나 선명도
});
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

try {
  console.log("→ 로그인…");
  const submit = async () => {
    await page.getByPlaceholder("you@email.com").fill(EMAIL);
    await page.getByPlaceholder("비밀번호").fill(PW);
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForTimeout(1500);
  };
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.getByPlaceholder("you@email.com").waitFor({ state: "visible" });
  await page.waitForTimeout(3000); // React 하이드레이션 대기 — 안 기다리면 네이티브 GET(?email=…)로 샘
  await submit();
  // 미하이드레이션으로 네이티브 submit(?email=) 됐으면 1회 재시도(더 길게 대기)
  if (/[?&]email=/.test(page.url())) {
    console.log("  (하이드레이션 전 제출 감지 — 재시도)");
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await page.waitForTimeout(6000);
    await submit();
  }
  await page.waitForURL("**/trips", { timeout: 30000 });
  console.log("  로그인 완료");

  console.log("→ 여행 열기…");
  await page.getByText("도쿄 가을 여행").first().click();
  await page.waitForURL(/\/trips\/[^/?]+/, { timeout: 30000 });
  const tripId = new URL(page.url()).pathname.split("/")[2];
  console.log("  trip:", tripId);

  for (const s of SHOTS) {
    console.log(`→ ${s.view} 캡처…`);
    await page.goto(`${BASE}/trips/${tripId}?view=${s.view}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(s.wait); // 지도/차트 렌더 대기
    await page.screenshot({ path: `${OUT}/${s.file}` });
    console.log(`  저장: ${OUT}/${s.file}`);
  }

  console.log("\n✅ 캡처 완료 — docs/screenshots/ 확인 후 커밋하면 README에 렌더됩니다.");
} catch (e) {
  console.error("❌ 실패:", e.message);
  console.error("힌트: 데모 계정 시딩(seed-demo.mjs) 여부, 인터넷, 브라우저 설치(yarn playwright install chromium) 확인.");
  process.exitCode = 1;
} finally {
  await browser.close();
}
