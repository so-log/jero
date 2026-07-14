import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CategoryBar } from "./CategoryBar";

describe("CategoryBar (필터 정리 U2·U3)", () => {
  it("카테고리 '전체' → '모든 종류' 라벨 + 폴더 축 버튼이 공존한다", () => {
    render(<CategoryBar active="all" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "모든 종류" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /전체 폴더/ })).toBeInTheDocument();
  });

  it("드롭다운(카테고리 필터) 변경 시 onSelect 를 호출한다(U3)", () => {
    const onSelect = vi.fn();
    render(<CategoryBar active="all" onSelect={onSelect} />);
    const select = screen.getByRole("combobox", { name: "카테고리 필터" });
    expect(select).toHaveValue("all");
    fireEvent.change(select, { target: { value: "museum" } });
    expect(onSelect).toHaveBeenCalledWith("museum");
  });

  it("칩 클릭도 동일하게 onSelect 를 호출한다(선택 동작 무변경)", () => {
    const onSelect = vi.fn();
    render(<CategoryBar active="all" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /식당/ }));
    expect(onSelect).toHaveBeenCalledWith("food");
  });
});
