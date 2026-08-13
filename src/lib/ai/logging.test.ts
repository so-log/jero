/**
 * @vitest-environment node
 *
 * 로깅 필드 회귀 (설계 §6.5, CLAUDE.md §8.5).
 *
 * 이 테스트가 지키는 계약은 하나다: **로그에 나가도 되는 것만 나간다.**
 * 남기는 것 — trip_id 해시·모델명·토큰 수·지연·에러 코드.
 * 남기지 않는 것 — API 키·프롬프트 전문·사용자 메시지·PII.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { hashTripId, logAssistant, LOG_PREFIX } from "./logging";

const TRIP = "11111111-1111-4111-8111-111111111111";

function capture(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const spy = vi
    .spyOn(console, "info")
    .mockImplementation((line: unknown) => void lines.push(String(line)));
  return { lines, restore: () => spy.mockRestore() };
}

/** 로그 한 줄에서 JSON 부분만 꺼낸다. */
function parsed(line: string): Record<string, unknown> {
  return JSON.parse(line.slice(LOG_PREFIX.length + 1)) as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hashTripId", () => {
  it("원문 uuid 를 담지 않는다(단방향 해시)", () => {
    const hash = hashTripId(TRIP);
    expect(hash).not.toContain(TRIP);
    expect(TRIP).not.toContain(hash);
    expect(hash).toHaveLength(12);
  });

  it("같은 여행은 같은 해시(로그끼리 묶어 볼 수 있다)", () => {
    expect(hashTripId(TRIP)).toBe(hashTripId(TRIP));
    expect(hashTripId(TRIP)).not.toBe(hashTripId("22222222-2222-4222-8222-222222222222"));
  });
});

describe("logAssistant — 허용 필드", () => {
  it("허용된 필드는 그대로 남는다", () => {
    const { lines, restore } = capture();
    logAssistant({
      event: "chat_completed",
      tripHash: hashTripId(TRIP),
      model: "gemini-flash-latest",
      latencyMs: 1234,
      tokens: 900,
      remaining: 28,
    });
    restore();

    expect(lines).toHaveLength(1);
    expect(parsed(lines[0])).toEqual({
      event: "chat_completed",
      tripHash: hashTripId(TRIP),
      model: "gemini-flash-latest",
      latencyMs: 1234,
      tokens: 900,
      remaining: 28,
    });
  });

  it("값이 없는 필드는 아예 빼고 남긴다", () => {
    const { lines, restore } = capture();
    logAssistant({ event: "chat_blocked", code: "forbidden", status: 403 });
    restore();

    expect(parsed(lines[0])).toEqual({
      event: "chat_blocked",
      code: "forbidden",
      status: 403,
    });
  });

  it("★ 화이트리스트 밖 필드는 캐스팅으로 밀어 넣어도 버려진다", () => {
    const { lines, restore } = capture();
    // 미래의 호출부가 실수로(또는 as 캐스팅으로) 민감한 값을 끼워 넣는 상황.
    logAssistant({
      event: "chat_failed",
      code: "chat_failed",
      apiKey: "AIzaSyTOP_SECRET_KEY",
      prompt: "너는 여행 어시스턴트다 ... <<<TRIP_DATA",
      userMessage: "시부야 카페 알려줘",
      email: "someone@example.com",
      tripId: TRIP,
    } as Parameters<typeof logAssistant>[0]);
    restore();

    const line = lines[0];
    expect(parsed(line)).toEqual({ event: "chat_failed", code: "chat_failed" });
    // 라인 전체를 훑어도 민감한 값이 없다.
    expect(line).not.toContain("AIzaSy");
    expect(line).not.toContain("TRIP_DATA");
    expect(line).not.toContain("시부야 카페 알려줘");
    expect(line).not.toContain("someone@example.com");
    expect(line).not.toContain(TRIP);
  });

  it("직렬화가 실패해도 예외를 던지지 않는다(로깅이 요청을 깨지 않는다)", () => {
    const { restore } = capture();
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(() =>
      logAssistant({
        event: "chat_completed",
        tokens: circular as unknown as number,
      }),
    ).not.toThrow();
    restore();
  });
});
