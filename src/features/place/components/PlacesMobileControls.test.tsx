import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ALL_FOLDER } from "../types";
import { PlacesMobileControls } from "./PlacesMobileControls";

/**
 * 반응형 3-D 장소 모바일 컨트롤 — 폴더 드롭다운 + 리스트/지도 세그먼트(순수 표현).
 */
const FOLDERS = [
  { id: "f-food", name: "맛집" },
  { id: "f-cafe", name: "카페" },
];

describe("PlacesMobileControls", () => {
  it("폴더 드롭다운(전체 + 폴더들)과 세그먼트를 렌더한다", () => {
    render(
      <PlacesMobileControls
        folders={FOLDERS}
        folderId={ALL_FOLDER}
        onSelectFolder={vi.fn()}
        mode="list"
        onModeChange={vi.fn()}
      />,
    );
    const select = screen.getByRole("combobox", { name: "폴더 선택" });
    expect(select).toHaveValue(ALL_FOLDER);
    expect(screen.getByRole("option", { name: "전체 장소" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "맛집" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "리스트" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("폴더 변경 시 onSelectFolder 호출", () => {
    const onSelectFolder = vi.fn();
    render(
      <PlacesMobileControls
        folders={FOLDERS}
        folderId={ALL_FOLDER}
        onSelectFolder={onSelectFolder}
        mode="list"
        onModeChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "폴더 선택" }), {
      target: { value: "f-cafe" },
    });
    expect(onSelectFolder).toHaveBeenCalledWith("f-cafe");
  });

  it("지도 세그먼트 클릭 시 onModeChange('map')", () => {
    const onModeChange = vi.fn();
    render(
      <PlacesMobileControls
        folders={FOLDERS}
        folderId={ALL_FOLDER}
        onSelectFolder={vi.fn()}
        mode="list"
        onModeChange={onModeChange}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "지도" }));
    expect(onModeChange).toHaveBeenCalledWith("map");
  });
});
