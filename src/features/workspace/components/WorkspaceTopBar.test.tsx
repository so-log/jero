import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TripDto } from "@/features/itinerary/types";
import { renderWithClient } from "@/test/utils";

import { WorkspaceTopBar } from "./WorkspaceTopBar";

// ViewSegment(중앙 뷰 토글)가 next/navigation 을 쓰므로 라우터를 목킹한다(단위 렌더 목적).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/trips/trip_1",
  useSearchParams: () => new URLSearchParams("view=plan"),
}));

/**
 * 04 권한 분기(상단 바) — viewer 는 "보기 전용"/"공유받은 플랜" 배지가 보이고 공유 UI가 없다(수용 기준 §11 · §8.2).
 * 날짜 수정 진입(B3)은 owner 전용 — owner 만 날짜가 클릭 가능한 버튼. 권한 강제는 서버/RLS.
 */
const baseTrip: Omit<TripDto, "my_role"> = {
  id: "trip_1",
  title: "도쿄, 우리끼리 4일",
  start_date: "2026-04-18",
  end_date: "2026-04-21",
  cover_icon: "plane",
};

describe("WorkspaceTopBar 권한 분기", () => {
  it("viewer: '보기 전용'·'공유받은 플랜' 배지 노출, 공유·날짜수정 진입 없음", () => {
    renderWithClient(
      <WorkspaceTopBar
        trip={{ ...baseTrip, my_role: "viewer" }}
        members={[]}
        canEdit={false}
      />,
    );
    expect(screen.getByText("보기 전용")).toBeInTheDocument();
    expect(screen.getByText("공유받은 플랜")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "공유" })).toBeNull();
    expect(screen.queryByRole("button", { name: "여행 날짜 수정" })).toBeNull();
  });

  it("editor: 공유는 되지만 날짜 수정 진입은 불가(owner 전용)", () => {
    renderWithClient(
      <WorkspaceTopBar
        trip={{ ...baseTrip, my_role: "editor" }}
        members={[]}
        canEdit
      />,
    );
    expect(screen.getByRole("button", { name: "공유" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "여행 날짜 수정" })).toBeNull();
  });

  it("owner: 공유 버튼 + 날짜 수정 진입 버튼 노출, '보기 전용' 배지 없음", () => {
    renderWithClient(
      <WorkspaceTopBar
        trip={{ ...baseTrip, my_role: "owner" }}
        members={[]}
        canEdit
      />,
    );
    expect(screen.getByRole("button", { name: "공유" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "여행 날짜 수정" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("보기 전용")).toBeNull();
  });
});
