import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAssistantStore } from "../store/assistantStore";
import { useAssistantChat } from "./useAssistantChat";

/**
 * 스트리밍 훅 (설계 §2). 핵심: 델타 누적 · 근거 칩 · 에러 문구 일반화 · 중지 시 부분 답변 유지.
 */

const TRIP = "11111111-1111-4111-8111-111111111111";

/** 청크를 순서대로 흘려보내는 텍스트 스트림 응답. */
function streamResponse(chunks: string[], headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers });
}

function errorResponse(code: string, status: number) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  useAssistantStore.getState().reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useAssistantChat — 전송·스트리밍", () => {
  it("사용자 메시지를 즉시 추가하고 델타를 이어붙인다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(streamResponse(["안녕", "하세요"]))),
    );
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("카페 알려줘");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages[0]).toMatchObject({
      role: "user",
      content: "카페 알려줘",
    });
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "안녕하세요",
    });
    expect(result.current.streaming).toBe(false);
  });

  it("서버로 tripId 와 대화 히스토리를 보낸다", async () => {
    const spy = vi.fn(() => Promise.resolve(streamResponse(["ok"])));
    vi.stubGlobal("fetch", spy);
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("첫 질문");
    });

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/assistant/chat");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.tripId).toBe(TRIP);
    expect(body.messages).toEqual([{ role: "user", content: "첫 질문" }]);
  });

  it("근거 칩을 헤더에서 읽어 노출한다", async () => {
    const chips = [{ label: "저장한 장소 12곳", icon: "bookmark" }];
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          streamResponse(["ok"], {
            "x-assistant-evidence": encodeURIComponent(JSON.stringify(chips)),
          }),
        ),
      ),
    );
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("q");
    });

    await waitFor(() => expect(result.current.evidence).toEqual(chips));
  });

  it("깨진 근거 헤더는 무시하고 답변은 정상 표시한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          streamResponse(["답변"], { "x-assistant-evidence": "%%%broken%%%" }),
        ),
      ),
    );
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("q");
    });

    expect(result.current.evidence).toEqual([]);
    await waitFor(() =>
      expect(result.current.messages[1]?.content).toBe("답변"),
    );
  });

  it("빈 입력은 전송하지 않는다", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("   ");
    });

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it("최근 8턴만 전송한다(비용·지연 상한)", async () => {
    const spy = vi.fn(() => Promise.resolve(streamResponse(["ok"])));
    vi.stubGlobal("fetch", spy);
    // 기존 대화 10건을 미리 채워둔다.
    for (let i = 0; i < 10; i += 1) {
      useAssistantStore.getState().appendMessage({
        id: `m${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `msg${i}`,
      });
    }
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("새 질문");
    });

    const body = JSON.parse(
      String((spy.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    ) as { messages: unknown[] };
    expect(body.messages).toHaveLength(8);
  });
});

describe("useAssistantChat — 에러 (§8.5 일반화)", () => {
  it("429 는 사용량 안내 문구", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorResponse("rate_limited", 429))),
    );
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("q");
    });

    await waitFor(() =>
      expect(result.current.error).toBe(
        "오늘 사용량을 다 썼어요. 내일 다시 이용할 수 있어요.",
      ),
    );
    expect(result.current.streaming).toBe(false);
  });

  it("403 은 권한 안내 문구", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorResponse("forbidden", 403))),
    );
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("q");
    });

    await waitFor(() =>
      expect(result.current.error).toBe("이 여행에 접근할 권한이 없어요."),
    );
  });

  it("알 수 없는 오류는 일반 문구로 감싼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorResponse("chat_failed", 502))),
    );
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("q");
    });

    await waitFor(() =>
      expect(result.current.error).toBe(
        "지금은 답할 수 없어요. 잠시 후 다시 시도해주세요.",
      ),
    );
  });

  it("★ 내용 없이 끝난 스트림은 실패로 처리한다(모델 오류는 200 이후 터진다)", async () => {
    // streamText 오류는 헤더가 나간 뒤 스트림 도중 발생 → 200 인데 본문이 비어서 끝난다.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(streamResponse([]))),
    );
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("q");
    });

    await waitFor(() =>
      expect(result.current.error).toBe(
        "지금은 답할 수 없어요. 잠시 후 다시 시도해주세요.",
      ),
    );
    // 빈 말풍선을 남기지 않는다(무응답처럼 보이는 것 방지).
    expect(result.current.messages.filter((m) => m.role === "assistant")).toHaveLength(
      0,
    );
    expect(result.current.streaming).toBe(false);
  });

  it("네트워크 예외도 일반 문구로 처리하고 크래시하지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const { result } = renderHook(() => useAssistantChat(TRIP));

    await act(async () => {
      await result.current.send("q");
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).not.toContain("offline");
  });
});
