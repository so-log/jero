import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithClient } from "@/test/utils";

import { useAssistantStore } from "../store/assistantStore";
import { AssistantPanel } from "./AssistantPanel";

/**
 * 패널 렌더 통합 (기획 §3·§7.1, 시안 대조).
 * 데이터(스트림 응답) → 화면 검증을 우선한다(QA 우선순위 ①).
 */

const TRIP = "11111111-1111-4111-8111-111111111111";

/** 카드 프레임을 스트림 끝에 덧붙인다(서버 와이어 포맷과 동일). */
function withCards(text: string, cards: unknown[]) {
  return text + "" + JSON.stringify({ cards }) + "";
}

/** 코스 프레임 — 카드와 같은 프레임 구분자를 쓴다(Phase 4 와이어 포맷). */
function withCourse(text: string, course: unknown) {
  return withCards(text, []).replace(
    JSON.stringify({ cards: [] }),
    JSON.stringify({ course }),
  );
}

function coursePlace(name: string, id: string, day: number, order: number) {
  return {
    name,
    category: "cafe",
    lat: 35.6,
    lng: 139.7,
    googlePlaceId: id,
    address: `${name} 주소`,
    day,
    order,
    reason: `${name} 이유`,
  };
}

const COURSE = {
  summary: "도보 위주 2일 코스",
  places: [
    coursePlace("첫째날 A", "p1", 1, 1),
    coursePlace("첫째날 B", "p2", 1, 2),
    coursePlace("둘째날 C", "p3", 2, 1),
  ],
};

const CARD = {
  name: "블루보틀 아오야마",
  address: "도쿄도 미나토구 미나미아오야마",
  lat: 35.6672,
  lng: 139.7118,
  googlePlaceId: "ChIJ_blue",
  category: "cafe",
};

function streamResponse(chunks: string[], headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    }),
    { status: 200, headers },
  );
}

function renderPanel(canEdit = true, onClose = vi.fn()) {
  return {
    onClose,
    ...renderWithClient(
      <AssistantPanel
        tripId={TRIP}
        tripTitle="도쿄, 우리끼리 4일"
        canEdit={canEdit}
        onClose={onClose}
      />,
    ),
  };
}

beforeEach(() => {
  useAssistantStore.getState().reset();
  // reset() 은 사용량을 지우지 않는다(서버 카운터는 대화와 무관) — 테스트만 명시적으로 비운다.
  useAssistantStore.setState({ usage: null });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(streamResponse(["시부야 카페 두 곳이에요."]))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AssistantPanel — 기본 렌더", () => {
  it("다이얼로그 역할과 제목이 있다(접근성)", () => {
    renderPanel();
    const dialog = screen.getByRole("dialog", { name: "AI 여행 어시스턴트" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "여행 어시스턴트" })).toBeVisible();
  });

  it("빈 상태 안내를 보여준다", () => {
    renderPanel();
    expect(screen.getByText("무엇이든 물어보세요")).toBeVisible();
  });

  it("입력창 placeholder 가 시안과 같다", () => {
    renderPanel();
    expect(
      screen.getByPlaceholderText("여행에 대해 무엇이든 물어보세요"),
    ).toBeVisible();
  });
});

describe("AssistantPanel — 대화", () => {
  it("질문을 보내면 사용자 말풍선과 스트리밍 답변이 렌더된다", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(
      screen.getByPlaceholderText("여행에 대해 무엇이든 물어보세요"),
      "시부야 카페 알려줘",
    );
    await user.click(screen.getByRole("button", { name: "전송" }));

    expect(await screen.findByText("시부야 카페 알려줘")).toBeVisible();
    expect(await screen.findByText("시부야 카페 두 곳이에요.")).toBeVisible();
  });

  it("빠른 질문 칩을 누르면 바로 전송된다", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    // 칩 라벨과 같은 문구라 대화 영역으로 범위를 좁혀 확인한다.
    const log = screen.getByRole("log", { name: "대화 내용" });
    expect(await within(log).findByText("카페 추천")).toBeVisible();
    expect(await within(log).findByText("시부야 카페 두 곳이에요.")).toBeVisible();
  });

  it("근거 칩을 '참고' 라벨과 함께 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          streamResponse(["답변"], {
            "x-assistant-evidence": encodeURIComponent(
              JSON.stringify([{ label: "저장한 장소 12곳", icon: "bookmark" }]),
            ),
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /근처 맛집/ }));

    expect(await screen.findByText("참고")).toBeVisible();
    expect(await screen.findByText("저장한 장소 12곳")).toBeVisible();
  });

  it("사용량 초과 시 안내 문구를 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "rate_limited" }), {
            status: 429,
            headers: { "content-type": "application/json" },
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    expect(
      await screen.findByText("오늘 사용량을 다 썼어요. 내일 다시 이용할 수 있어요."),
    ).toBeVisible();
  });

  it("닫기 버튼이 onClose 를 부른다", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.click(screen.getByRole("button", { name: "어시스턴트 닫기" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("Esc 로 닫힌다", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe("AssistantPanel — 권한 (기획 §7.1)", () => {
  it("★ viewer 는 '뷰어' 배지와 '대화만 가능해요' 를 본다", () => {
    renderPanel(false);
    expect(screen.getByText("뷰어")).toBeVisible();
    expect(screen.getByText("대화만 가능해요")).toBeVisible();
  });

  it("★ viewer 의 빠른 질문은 조회형 2개만(실행형 제외)", () => {
    renderPanel(false);
    expect(screen.getByRole("button", { name: /카페 추천/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /근처 맛집/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /코스 짜줘/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /동선 최적화/ })).toBeNull();
  });

  it("editor 는 실행형 칩까지 4개 노출", () => {
    renderPanel(true);
    expect(screen.getByRole("button", { name: /2일 코스 짜줘/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /동선 최적화/ })).toBeVisible();
    expect(screen.getByText("도쿄, 우리끼리 4일 · 편집 가능")).toBeVisible();
  });
});

describe("AssistantPanel — 추천 카드 (Phase 3 grounding)", () => {
  it("카드 프레임이 오면 실존 장소 카드를 렌더한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(streamResponse([withCards("두 곳 찾았어요.", [CARD])])),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    const log = screen.getByRole("log", { name: "대화 내용" });
    expect(await within(log).findByText("블루보틀 아오야마")).toBeVisible();
    expect(within(log).getByText("도쿄도 미나토구 미나미아오야마")).toBeVisible();
    // 카테고리 pill
    expect(within(log).getByText("카페")).toBeVisible();
    // 답변 본문도 함께 남는다
    expect(within(log).getByText("두 곳 찾았어요.")).toBeVisible();
  });

  it("★ 카드 프레임이 없으면 본문에 상호명이 있어도 카드가 없다(환각 차단)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(streamResponse(["'가상의 카페 ABC' 어때요?"])),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    const log = screen.getByRole("log", { name: "대화 내용" });
    expect(await within(log).findByText(/가상의 카페 ABC/)).toBeVisible();
    // 카드에만 있는 액션 버튼이 없다 = 카드가 렌더되지 않았다.
    expect(screen.queryByRole("button", { name: "저장" })).toBeNull();
    expect(screen.queryByRole("button", { name: /일정에/ })).toBeNull();
  });

  it("editor 는 카드에 저장·일정에 버튼이 보인다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(streamResponse([withCards("추천", [CARD])]))),
    );
    const user = userEvent.setup();
    renderPanel(true);

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    expect(await screen.findByRole("button", { name: "저장" })).toBeVisible();
    expect(screen.getByRole("button", { name: /일정에/ })).toBeVisible();
  });

  it("★ viewer 는 카드는 보되 액션 버튼이 없다(기획 §7.1)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(streamResponse([withCards("추천", [CARD])]))),
    );
    const user = userEvent.setup();
    renderPanel(false);

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    expect(await screen.findByText("블루보틀 아오야마")).toBeVisible();
    expect(screen.queryByRole("button", { name: "저장" })).toBeNull();
    expect(screen.queryByRole("button", { name: /일정에/ })).toBeNull();
  });

  it("카드가 여러 청크에 걸쳐 와도 렌더된다", async () => {
    const whole = withCards("추천이에요", [CARD]);
    const cut = Math.floor(whole.length / 2);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(streamResponse([whole.slice(0, cut), whole.slice(cut)])),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    expect(await screen.findByText("블루보틀 아오야마")).toBeVisible();
  });
});

describe("AssistantPanel — 코스 제안 (Phase 4)", () => {
  it("코스 프레임이 오면 Day 타임라인으로 렌더한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(streamResponse([withCourse("이런 코스 어때요?", COURSE)])),
      ),
    );
    const user = userEvent.setup();
    renderPanel(true);

    await user.click(screen.getByRole("button", { name: /2일 코스 짜줘/ }));

    const log = screen.getByRole("log", { name: "대화 내용" });
    expect(await within(log).findByText("2일 코스 제안")).toBeVisible();
    expect(within(log).getByText("도보 위주 2일 코스")).toBeVisible();
    expect(within(log).getByText("Day 1")).toBeVisible();
    expect(within(log).getByText("Day 2")).toBeVisible();
    expect(within(log).getByText("첫째날 A")).toBeVisible();
    expect(within(log).getByText("둘째날 C")).toBeVisible();
    // 왜 골랐는지 한 줄 이유도 함께.
    expect(within(log).getByText("첫째날 A 이유")).toBeVisible();
    expect(within(log).getByText("3곳")).toBeVisible();
  });

  it("editor 는 '코스 적용' 버튼을 본다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(streamResponse([withCourse("코스", COURSE)]))),
    );
    const user = userEvent.setup();
    renderPanel(true);

    await user.click(screen.getByRole("button", { name: /2일 코스 짜줘/ }));

    expect(await screen.findByRole("button", { name: "코스 적용" })).toBeVisible();
  });

  it("★ viewer 는 실행 버튼 대신 읽기 전용 안내를 본다(기획 §7.1)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(streamResponse([withCourse("코스", COURSE)]))),
    );
    const user = userEvent.setup();
    renderPanel(false);

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    // 코스 내용은 보인다.
    expect(await screen.findByText("첫째날 A")).toBeVisible();
    expect(
      screen.getByText("읽기 전용 — 코스를 적용하려면 편집 권한이 필요해요"),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "코스 적용" })).toBeNull();
  });

  it("★ 좌표 없는 항목이 섞이면 코스 블록을 렌더하지 않는다(Zod 재검증)", async () => {
    const noCoords = { ...coursePlace("좌표 없음", "px", 1, 1), lat: undefined };
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          streamResponse([
            withCourse("코스예요", { summary: "s", places: [noCoords] }),
          ]),
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel(true);

    await user.click(screen.getByRole("button", { name: /2일 코스 짜줘/ }));

    // 텍스트 답변은 남고 코스 블록만 빠진다(설계 §7 폴백).
    expect(await screen.findByText("코스예요")).toBeVisible();
    expect(screen.queryByRole("button", { name: "코스 적용" })).toBeNull();
    expect(screen.queryByText("좌표 없음")).toBeNull();
  });

  it("'코스 적용' 은 확인 다이얼로그를 먼저 띄운다(설계 §5.2-1)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(streamResponse([withCourse("코스", COURSE)]))),
    );
    const user = userEvent.setup();
    renderPanel(true);

    await user.click(screen.getByRole("button", { name: /2일 코스 짜줘/ }));
    await user.click(await screen.findByRole("button", { name: "코스 적용" }));

    expect(
      await screen.findByRole("alertdialog", { name: "코스를 일정에 적용할까요?" }),
    ).toBeVisible();
    expect(screen.getByText(/장소 3곳이 여행에 추가되고/)).toBeVisible();
  });
});

describe("AssistantPanel — 사용량 가드레일 (Phase 5)", () => {
  const composer = () =>
    screen.getByPlaceholderText(/무엇이든 물어보세요|내일 다시 이용할 수 있어요/);

  it("성공 응답의 잔여 헤더를 캡션으로 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          streamResponse(["답변"], {
            "x-assistant-remaining": "12",
            "x-assistant-limit": "30",
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    expect(await screen.findByText("오늘 12회 남음")).toBeVisible();
  });

  it("잔여 헤더가 없으면 아무것도 표시하지 않는다(0으로 넘겨짚지 않는다)", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));
    await screen.findByText("시부야 카페 두 곳이에요.");

    expect(screen.queryByText(/회 남음/)).toBeNull();
    expect(screen.queryByText(/다 썼어요/)).toBeNull();
    expect(composer()).toBeEnabled();
  });

  it("★ 429 면 N/N·리셋 시각을 안내하고 입력을 막는다(기획 §6)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ error: "rate_limited", remaining: 0, limit: 30 }),
            { status: 429, headers: { "content-type": "application/json" } },
          ),
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    // 말풍선은 짧게, 입력창 배너가 정확한 N/N·리셋 시각을 안내한다(중복 금지).
    expect(
      await screen.findByText("오늘 사용량을 다 썼어요. 내일 다시 이용할 수 있어요."),
    ).toBeVisible();
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("오늘 사용량을 다 썼어요(30/30)");
    expect(banner).toHaveTextContent("다시 채워져요");

    // 입력·전송·빠른 질문이 전부 잠긴다 — 더 눌러봐야 429 다.
    expect(composer()).toBeDisabled();
    expect(screen.getByRole("button", { name: "전송" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /카페 추천/ })).toBeDisabled();
  });

  it("★ 잔여가 0이 되면 다음 질문 전에 미리 막는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          streamResponse(["마지막 답변"], {
            "x-assistant-remaining": "0",
            "x-assistant-limit": "30",
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));
    await screen.findByText("마지막 답변");

    expect(composer()).toBeDisabled();
  });

  it("★ 서버 에러는 일반화된 문구만 보여준다(provider 원문 미노출)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "chat_failed" }), {
            status: 502,
            headers: { "content-type": "application/json" },
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    expect(
      await screen.findByText("지금은 답할 수 없어요. 잠시 후 다시 시도해주세요."),
    ).toBeVisible();
  });

  it("모르는 에러 코드도 일반 문구로 떨어진다(새 코드가 새지 않는다)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ error: "some_new_internal_code_v2" }),
            { status: 500, headers: { "content-type": "application/json" } },
          ),
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /카페 추천/ }));

    expect(
      await screen.findByText("지금은 답할 수 없어요. 잠시 후 다시 시도해주세요."),
    ).toBeVisible();
    expect(screen.queryByText(/some_new_internal_code_v2/)).toBeNull();
  });
});
