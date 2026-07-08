import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberDto } from "@/features/itinerary";
import { renderWithClient } from "@/test/utils";

import { ShareOverlay } from "./ShareOverlay";

const members: MemberDto[] = [
  { id: "u1", name: "지현", initial: "지", color: "#3B7DF0", role: "owner", online: false },
];

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText } });
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("ShareOverlay 링크 복사", () => {
  it("'복사' 클릭 → 공유 링크를 클립보드에 복사하고 '복사됨' 피드백", async () => {
    renderWithClient(
      <ShareOverlay
        open
        onClose={() => {}}
        tripId="trip_1"
        members={members}
        myRole="owner"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /복사/ }));

    // 복사됨 피드백(비동기: 링크 발급 → 클립보드).
    expect(await screen.findByText("복사됨")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("/share/");
  });
});
