import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// 컴포넌트/훅 단위·통합 테스트 (jsdom). e2e 는 playwright 가 담당하므로 제외한다.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    css: false,
  },
  resolve: {
    // tsconfig 의 "@/*" → src 별칭과 일치시킨다.
    alias: { "@": path.resolve(dirname, "./src") },
  },
});
