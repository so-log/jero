import { test as base, expect, type Page } from "@playwright/test";

import { SUPABASE_URL } from "./support";

/**
 * 실시간 스펙용 Playwright 확장 — Supabase 호스트를 fixture 로 주입(에러 필터링에 사용).
 */
export const test = base.extend<{ supabaseHost: string }>({
  supabaseHost: async ({}, provide) => {
    await provide(SUPABASE_URL ? new URL(SUPABASE_URL).host : "");
  },
});

export { expect };
export type { Page };
