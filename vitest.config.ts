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
    // 파일 병렬 실행이 jsdom + Recharts/base-ui 무거운 트리를 동시에 올리면 워커들이
    // 합쳐 힙 OOM 으로 죽는다(개별 파일은 통과). 순차 실행으로 peak 메모리를 묶는다.
    fileParallelism: false,
  },
  resolve: {
    // tsconfig 의 "@/*" → src 별칭과 일치시킨다.
    alias: { "@": path.resolve(dirname, "./src") },
  },
});
