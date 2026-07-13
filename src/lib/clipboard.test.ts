import { afterEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "./clipboard";

type WriteText = (text: string) => Promise<void>;

function setSecureContext(value: boolean) {
  Object.defineProperty(window, "isSecureContext", {
    value,
    configurable: true,
  });
}
function setClipboard(clip: { writeText: WriteText } | undefined) {
  Object.defineProperty(navigator, "clipboard", { value: clip, configurable: true });
}
/** jsdom 에 execCommand 가 없어(구현 제거) 명시적으로 정의한다. */
function setExecCommand(returns: boolean) {
  const fn = vi.fn(() => returns);
  Object.defineProperty(document, "execCommand", {
    value: fn,
    configurable: true,
    writable: true,
  });
  return fn;
}

describe("copyToClipboard", () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalClipboard)
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    else Reflect.deleteProperty(navigator, "clipboard");
    Reflect.deleteProperty(document, "execCommand");
  });

  it("보안 컨텍스트 + clipboard API 성공 → true (execCommand 미사용)", async () => {
    setSecureContext(true);
    const writeText = vi.fn<WriteText>().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const exec = setExecCommand(true);

    expect(await copyToClipboard("초대링크")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("초대링크");
    expect(exec).not.toHaveBeenCalled();
  });

  it("clipboard API 거부 → execCommand 폴백 성공 시 true", async () => {
    setSecureContext(true);
    setClipboard({
      writeText: vi.fn<WriteText>().mockRejectedValue(new Error("denied")),
    });
    const exec = setExecCommand(true);

    expect(await copyToClipboard("x")).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
  });

  it("비보안 컨텍스트 → clipboard API 건너뛰고 execCommand 폴백", async () => {
    setSecureContext(false);
    const writeText = vi.fn<WriteText>();
    setClipboard({ writeText });
    const exec = setExecCommand(true);

    expect(await copyToClipboard("x")).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
    expect(exec).toHaveBeenCalled();
  });

  it("모든 경로 실패 → false (에러 삼키지 않고 boolean 반환)", async () => {
    setSecureContext(false);
    setClipboard(undefined);
    setExecCommand(false);

    expect(await copyToClipboard("x")).toBe(false);
  });
});
