import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { FolderDto, PlaceDto } from "@/features/itinerary";

import { ALL_FOLDER } from "../types";
import { FolderSidebar } from "./FolderSidebar";

const folders: FolderDto[] = [
  { id: "f1", name: "맛집", icon: "bookmark", color: "#3B7DF0" },
];
const saved: PlaceDto[] = [];

function setup(props: Partial<Parameters<typeof FolderSidebar>[0]> = {}) {
  const onCreateFolder = vi.fn();
  const onRenameFolder = vi.fn();
  const onDeleteFolder = vi.fn();
  render(
    <FolderSidebar
      folders={folders}
      saved={saved}
      folderId={ALL_FOLDER}
      canEdit
      onSelect={vi.fn()}
      onCreateFolder={onCreateFolder}
      onRenameFolder={onRenameFolder}
      onDeleteFolder={onDeleteFolder}
      {...props}
    />,
  );
  return { onCreateFolder, onRenameFolder, onDeleteFolder };
}

describe("FolderSidebar 관리(2차 B)", () => {
  it("폴더 추가: 입력 후 Enter → onCreateFolder(name)", () => {
    const { onCreateFolder } = setup();
    fireEvent.click(screen.getAllByRole("button", { name: "폴더 추가" })[0]);
    const input = screen.getByPlaceholderText("새 폴더 이름");
    fireEvent.change(input, { target: { value: "카페" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCreateFolder).toHaveBeenCalledWith("카페");
  });

  it("이름 변경: 더보기 → 이름 변경 → Enter → onRenameFolder(id,name)", () => {
    const { onRenameFolder } = setup();
    fireEvent.click(screen.getByRole("button", { name: "맛집 폴더 관리" }));
    fireEvent.click(screen.getByRole("button", { name: "이름 변경" }));
    const input = screen.getByDisplayValue("맛집");
    fireEvent.change(input, { target: { value: "맛집리스트" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRenameFolder).toHaveBeenCalledWith("f1", "맛집리스트");
  });

  it("삭제: 더보기 → 삭제 → 확인 → onDeleteFolder(id)", () => {
    const { onDeleteFolder } = setup();
    fireEvent.click(screen.getByRole("button", { name: "맛집 폴더 관리" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    // ConfirmDialog 확인
    fireEvent.click(screen.getByRole("button", { name: "삭제할게요" }));
    expect(onDeleteFolder).toHaveBeenCalledWith("f1");
  });

  it("viewer(canEdit=false): 관리 UI(추가·더보기) 미노출", () => {
    setup({ canEdit: false });
    expect(screen.queryAllByRole("button", { name: "폴더 추가" })).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "맛집 폴더 관리" })).toBeNull();
  });
});
