import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MemberDto } from "@/features/itinerary";

import type { ExpenseDto } from "../types";
import { ExpenseTable } from "./ExpenseTable";

const members: MemberDto[] = [
  { id: "m1", name: "지현", initial: "지", color: "#3B7DF0", role: "owner", online: false },
  { id: "m2", name: "민준", initial: "민", color: "#FF8A65", role: "editor", online: false },
];

const expenses: ExpenseDto[] = [
  {
    id: "e1",
    spent_on: "2026-04-18",
    name: "긴자 쇼핑",
    category: "shopping",
    payer_id: "m1",
    split: ["m1", "m2"],
    amount: 30000,
    currency: "KRW",
  },
];

describe("ExpenseTable 편집 진입점", () => {
  it("onEditExpense 제공 시 행 클릭으로 편집(id 전달)", () => {
    const onEditExpense = vi.fn();
    render(
      <ExpenseTable
        expenses={expenses}
        members={members}
        canEdit
        onAddExpense={vi.fn()}
        onEditExpense={onEditExpense}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "긴자 쇼핑 편집" }));
    expect(onEditExpense).toHaveBeenCalledWith("e1");
  });

  it("onEditExpense 미제공 시 행이 편집 버튼이 아니다(읽기 전용)", () => {
    render(
      <ExpenseTable
        expenses={expenses}
        members={members}
        canEdit={false}
        onAddExpense={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "긴자 쇼핑 편집" })).toBeNull();
  });
});
