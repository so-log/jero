import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TripDto } from "@/features/itinerary/types";
import { useOverlayStore } from "@/store/overlayStore";
import { renderWithClient } from "@/test/utils";

import { WorkspaceMobileBar } from "./WorkspaceMobileBar";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/trips/trip_1",
  useSearchParams: () => new URLSearchParams("view=plan"),
}));

/**
 * 반응형 3-A 모바일 상단 바 + 탭 드로어 — 햄버거로 드로어 열고 5개 뷰 이동·닫기, 권한 분기(§8.2 UI).
 */
const baseTrip: Omit<TripDto, "my_role"> = {
  id: "trip_1",
  title: "도쿄, 우리끼리 4일",
  start_date: "2026-04-18",
  end_date: "2026-04-21",
  cover_icon: "plane",
};

beforeEach(() => {
  pushMock.mockClear();
  useOverlayStore.setState({ active: null });
});

describe("WorkspaceMobileBar", () => {
  it("햄버거는 44px 탭타깃이고, 현재 탭·제목·공유가 3영역으로 보인다", () => {
    renderWithClient(
      <WorkspaceMobileBar trip={{ ...baseTrip, my_role: "owner" }} canEdit />,
    );
    const hamburger = screen.getByRole("button", { name: "메뉴 열기" });
    expect(hamburger.className).toContain("size-11"); // 44px
    expect(screen.getByText("도쿄, 우리끼리 4일")).toBeInTheDocument();
    expect(screen.getByText("플랜")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공유" })).toBeInTheDocument();
  });

  it("햄버거 → 드로어에 5개 뷰가 모두 나오고, 선택 시 라우팅 + 닫힘", async () => {
    renderWithClient(
      <WorkspaceMobileBar trip={{ ...baseTrip, my_role: "owner" }} canEdit />,
    );
    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));

    // 5개 뷰 모두 표시(탭 잘림 없음)
    for (const label of ["플랜", "캘린더", "장소", "예산", "통계"]) {
      expect(await screen.findByRole("button", { name: label })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "캘린더" }));
    expect(pushMock).toHaveBeenCalledWith("/trips/trip_1?view=calendar");
    // 선택 시 드로어 닫힘
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "장소" })).toBeNull(),
    );
  });

  it("드로어 푸터의 '공유 및 멤버'는 share 오버레이를 연다", async () => {
    renderWithClient(
      <WorkspaceMobileBar trip={{ ...baseTrip, my_role: "owner" }} canEdit />,
    );
    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    fireEvent.click(await screen.findByRole("button", { name: "공유 및 멤버" }));
    expect(useOverlayStore.getState().active).toBe("share");
  });

  it("viewer: 공유 버튼 대신 '보기 전용' 표시", () => {
    renderWithClient(
      <WorkspaceMobileBar
        trip={{ ...baseTrip, my_role: "viewer" }}
        canEdit={false}
      />,
    );
    expect(screen.queryByRole("button", { name: "공유" })).toBeNull();
    expect(screen.getByLabelText("보기 전용")).toBeInTheDocument();
  });
});
