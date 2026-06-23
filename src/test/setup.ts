// Vitest 전역 셋업 — jest-dom 매처 등록 + 각 테스트 후 DOM 정리.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
