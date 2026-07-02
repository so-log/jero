import { defineConfig, devices } from "@playwright/test";

// 주요 사용자 플로우 e2e. `yarn dev` 서버를 자동 기동해서 테스트한다.
export default defineConfig({
  testDir: "./e2e",
  // dev 서버(Turbopack)와 다중 chromium 동시 구동이 이 머신에서 V8 OOM(code 134)을 낸다.
  // 단일 워커 직렬 실행으로 묶고, 첫 컴파일 지연 대비 타임아웃을 늘린다.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
