import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithClient } from "@/test/utils";

import { useAssistantStore } from "../store/assistantStore";
import { AssistantLauncher } from "./AssistantLauncher";

/**
 * 노출 게이팅 (기획 §2, 계약 C9 #5). **회귀 0 의 핵심** —
 * 플래그 off·범위 밖 뷰에서는 어시스턴트가 DOM 에 아예 없어야 한다.
 */

const status = vi.hoisted(() => ({ enabled: true }));

vi.mock("../api/useAssistantStatus", () => ({
  useAssistantStatus: () => ({ data: status.enabled }),
}));

const TRIP = "11111111-1111-4111-8111-111111111111";

function renderLauncher(view: string, canEdit = true) {
  return renderWithClient(
    <AssistantLauncher
      tripId={TRIP}
      tripTitle="도쿄, 우리끼리 4일"
      canEdit={canEdit}
      view={view}
    />,
  );
}

const fab = () => screen.queryByRole("button", { name: "AI 여행 어시스턴트 열기" });

/** 인덱싱 트리거가 실제 네트워크를 때리지 않도록 스텁 — 호출 여부 자체가 검증 대상이다. */
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  useAssistantStore.getState().reset();
  useAssistantStore.getState().closePanel();
  status.enabled = true;
  fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ indexed: 0, hasMore: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const indexCalls = () =>
  fetchMock.mock.calls.filter(([url]) => url === "/api/assistant/index");

describe("AssistantLauncher — 노출 조건", () => {
  it("플랜 뷰에서 FAB 이 뜬다", () => {
    renderLauncher("plan");
    expect(fab()).toBeVisible();
  });

  it("장소 뷰에서도 뜬다", () => {
    renderLauncher("places");
    expect(fab()).toBeVisible();
  });

  it.each(["calendar", "budget", "stats"])(
    "★ %s 뷰에서는 아무것도 렌더하지 않는다(1차 범위 밖)",
    (view) => {
      const { container } = renderLauncher(view);
      expect(fab()).toBeNull();
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("★ 플래그 off 면 플랜 뷰에서도 렌더하지 않는다(키 없음 → 회귀 0)", () => {
    status.enabled = false;
    const { container } = renderLauncher("plan");
    expect(fab()).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("viewer 에게도 FAB 은 보인다(대화는 가능 — 기획 §7.1)", () => {
    renderLauncher("plan", false);
    expect(fab()).toBeVisible();
  });
});

describe("AssistantLauncher — 열기/닫기", () => {
  it("FAB 을 누르면 패널이 열리고 FAB 은 사라진다", async () => {
    const user = userEvent.setup();
    renderLauncher("plan");

    await user.click(fab() as HTMLElement);

    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "AI 여행 어시스턴트" })).toBeVisible(),
    );
    expect(fab()).toBeNull();
  });
});
describe("AssistantLauncher — RAG 인덱싱 트리거 (설계 §3.3)", () => {
  it("활성이면 진입 시 인덱싱을 건다", async () => {
    renderLauncher("plan");
    await waitFor(() => expect(indexCalls()).toHaveLength(1));
    expect(JSON.parse(String((indexCalls()[0] as [string, RequestInit])[1].body))).toEqual({
      tripId: TRIP,
    });
  });

  it("범위 밖 뷰(캘린더)에서도 인덱싱은 걸어둔다 — 나중에 열었을 때 근거가 준비돼 있다", async () => {
    renderLauncher("calendar");
    await waitFor(() => expect(indexCalls()).toHaveLength(1));
  });

  it("★ 플래그 off 면 인덱싱 요청도 보내지 않는다(회귀 0)", async () => {
    status.enabled = false;
    renderLauncher("plan");

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(indexCalls()).toHaveLength(0);
  });
});
