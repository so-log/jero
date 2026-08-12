// Vitest 전역 셋업 — jest-dom 매처 등록 + 각 테스트 후 DOM 정리.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom 미구현 API 보정 — 실제 브라우저엔 있는 것들이라 no-op 스텁이면 충분하다.
// (scrollIntoView: 채팅 자동 스크롤 등에서 사용)
// ★ 이 setup 은 `@vitest-environment node` 파일에서도 실행되므로 DOM 전역 존재를 먼저 확인한다.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
