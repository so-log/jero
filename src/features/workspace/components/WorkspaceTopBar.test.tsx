import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TripDto } from "@/features/itinerary/types";

import { WorkspaceTopBar } from "./WorkspaceTopBar";

// ViewSegment(중앙 뷰 토글)가 next/navigation 을 쓰므로 라우터를 목킹한다(단위 렌더 목적).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/trips/trip_1",
  useSearchParams: () => new URLSearchParams("view=plan"),
}));

/**
 * 04 권한 분기(상단 바) — viewer 는 "보기 전용"/"공유받은 플랜" 배지가 보이고 공유 UI가 없다(수용 기준 §11 · §8.2).
 * 권한 강제는 서버/RLS — 여기 canEdit 은 UI 노출 분기일 뿐.
 */
const baseTrip: Omit<TripDto, "my_role"> = {
  id: "trip_1",
  title: "도쿄, 우리끼리 4일",
  start_date: "2026-04-18",
  end_date: "2026-04-21",
  cover_icon: "plane",
};

describe("WorkspaceTopBar 권한 분기", () => {
  it("viewer: '보기 전용'·'공유받은 플랜' 배지 노출, 공유 버튼 없음", () => {
    render(
      <WorkspaceTopBar
        trip={{ ...baseTrip, my_role: "viewer" }}
        members={[]}
        canEdit={false}
      />,
    );
    expect(screen.getByText("보기 전용")).toBeInTheDocument();
    expect(screen.getByText("공유받은 플랜")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "공유" })).toBeNull();
  });

  it("owner: 공유 버튼 노출, '보기 전용' 배지 없음", () => {
    render(
      <WorkspaceTopBar
        trip={{ ...baseTrip, my_role: "owner" }}
        members={[]}
        canEdit
      />,
    );
    expect(screen.getByRole("button", { name: "공유" })).toBeInTheDocument();
    expect(screen.queryByText("보기 전용")).toBeNull();
  });
});
