import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

beforeEach(() => {
  useAssistantStore.getState().reset();
  useAssistantStore.getState().closePanel();
  status.enabled = true;
});

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
