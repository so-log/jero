import { afterEach, describe, expect, it, vi } from "vitest";

import { throttle } from "./throttle";

describe("throttle", () => {
  afterEach(() => vi.useRealTimers());

  it("연속 호출을 창당 선행 1회로 제한하고, 마지막 인자를 후행으로 보낸다", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const t = throttle((n: number) => fn(n), 100);

    t(1);
    t(2);
    t(3);
    // 선행: 첫 호출(1)만 즉시.
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(1);

    // 후행: 창 경과 후 마지막 인자(3) 1회.
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
  });

  it("창이 지나면 다시 선행 호출을 허용한다", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const t = throttle(() => fn(), 100);
    t();
    vi.advanceTimersByTime(150);
    t();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
