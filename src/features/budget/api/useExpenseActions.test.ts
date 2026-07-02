import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import type { ExpenseForm } from "../lib/expenseSchema";
import { useUpsertExpense } from "./useExpenseActions";

/** 10→07 무효화 키 일치 — 저장 성공 시 ['budget', tripId] 무효화(닫으면 07 갱신). */
const valid: ExpenseForm = {
  title: "테스트",
  amount: 10000,
  currency: "KRW",
  category: "food",
  payerId: "m1",
  split: ["m1"],
  day: 1,
};

describe("useUpsertExpense", () => {
  it("성공 시 ['budget', tripId] 를 무효화한다", async () => {
    const { result, client } = renderHookWithClient(() => useUpsertExpense("trip_1"));
    const spy = vi.spyOn(client, "invalidateQueries");
    await act(async () => {
      await result.current.mutateAsync(valid);
    });
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: ["budget", "trip_1"] }),
    );
  });
});
