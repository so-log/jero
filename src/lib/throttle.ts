/**
 * 선행 + 후행 throttle — `waitMs` 창당 최대 1회 호출하되 마지막 인자를 후행으로 보장한다.
 * 실시간 커서 송신(mousemove 폭주 → 브로드캐스트 절감)에 사용. 마지막 위치가 유실되지 않게 후행 포함.
 */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): (...args: A) => void {
  let last = Number.NEGATIVE_INFINITY; // 첫 호출은 항상 선행(now 값과 무관)
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: A | null = null;

  return (...args: A) => {
    const now = Date.now();
    const remaining = waitMs - (now - last);
    lastArgs = args;
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now;
      fn(...args);
    } else if (timer === null) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (lastArgs) fn(...lastArgs);
      }, remaining);
    }
  };
}
