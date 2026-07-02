"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { CategoryChips } from "@/components/ui/category-chip";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import type { Day, MemberDto } from "@/features/itinerary";
import { FX_RATES } from "@/lib/constants/fx";
import { cn } from "@/lib/utils";

import { useUpsertExpense } from "../api/useExpenseActions";
import {
  EXPENSE_CATEGORIES,
  expenseSchema,
  type ExpenseForm,
} from "../lib/expenseSchema";

/**
 * ③ 지출 추가 · 중앙 모달(480px). expenseSchema 폼(금액>0·분담≥1) + 1인당 실시간 계산 + 환산 안내.
 * 저장은 useUpsertExpense 스텁 — ['budget'] 무효화로 07 동기화. 컴포넌트 직접 fetch 금지(§7.1).
 */
const CURRENCY_ITEMS = [
  { value: "KRW", label: "KRW" },
  { value: "JPY", label: "JPY" },
];

const SYMBOL: Record<string, string> = { KRW: "₩", JPY: "¥" };

export function ExpenseOverlay({
  open,
  onClose,
  tripId,
  members,
  days,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  members: MemberDto[];
  days: Day[];
}) {
  const upsert = useUpsertExpense(tripId);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      amount: 0,
      currency: "KRW",
      category: "shopping",
      payerId: members[0]?.id ?? "",
      split: members.map((m) => m.id),
      day: 1,
    },
  });

  const amount = useWatch({ control, name: "amount" });
  const currency = useWatch({ control, name: "currency" });
  const split = useWatch({ control, name: "split" });
  const sym = SYMBOL[currency] ?? "₩";
  const perPerson = split.length > 0 ? Math.round(amount / split.length) : 0;

  const onSubmit = handleSubmit(async (values) => {
    await upsert.mutateAsync(values);
    onClose();
  });

  const bannerErr =
    errors.amount || errors.split ? "입력값을 확인해 주세요." : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={480}
      icon="wallet"
      iconTone="success"
      title="지출 추가"
      subtitle="도쿄, 우리끼리 4일"
      banner={bannerErr}
      loading={upsert.isPending}
      loadingText="지출을 저장하는 중…"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="h-11 flex-none">
            취소
          </Button>
          <Button variant="primary" onClick={onSubmit} className="h-11 flex-1">
            저장
          </Button>
        </>
      }
    >
      {/* 금액 + 통화 */}
      <Field label="금액" required error={errors.amount?.message}>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2.5">
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <div className="relative flex flex-1 items-center">
                  <span
                    className={cn(
                      "absolute left-4 text-[22px] font-extrabold",
                      errors.amount ? "text-danger" : "text-ink",
                    )}
                  >
                    {sym}
                  </span>
                  <input
                    inputMode="numeric"
                    value={field.value ? field.value.toLocaleString("ko-KR") : ""}
                    onChange={(e) =>
                      field.onChange(
                        Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                      )
                    }
                    placeholder="0"
                    className={cn(
                      "h-[58px] w-full rounded-lg border-[1.5px] bg-background pr-4 pl-10 text-[22px] font-extrabold tracking-tight text-ink outline-none",
                      errors.amount
                        ? "border-danger"
                        : "border-line-strong focus:border-primary focus:shadow-focus",
                    )}
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <SegmentedTabs
                  items={CURRENCY_ITEMS}
                  value={field.value}
                  onValueChange={field.onChange}
                  className="h-[58px] flex-none"
                  aria-label="통화"
                />
              )}
            />
          </div>
          {currency !== "KRW" && (
            <span className="pl-0.5 text-[11.5px] font-medium text-faint">
              기본 통화(₩)로 환산 저장 · 1 {currency} ≈ {FX_RATES[currency]}원
            </span>
          )}
        </div>
      </Field>

      <Field label="항목명">
        <input
          {...register("title")}
          placeholder="예: 긴자 식스 쇼핑"
          className="h-[46px] w-full rounded-md border-[1.5px] border-line-strong bg-background px-3.5 text-sm font-medium text-ink outline-none focus:border-primary focus:shadow-focus"
        />
      </Field>

      <Field label="카테고리">
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategoryChips
              value={field.value}
              onChange={field.onChange}
              keys={[...EXPENSE_CATEGORIES]}
            />
          )}
        />
      </Field>

      <Field label="결제자">
        <Controller
          control={control}
          name="payerId"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = field.value === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => field.onChange(m.id)}
                    className={cn(
                      "flex h-[42px] items-center gap-1.5 rounded-pill border-[1.5px] pr-3.5 pl-1.5 text-[13px] font-semibold transition-colors",
                      on ? "bg-background text-ink" : "border-line-strong bg-background text-subtle",
                    )}
                    style={on ? { borderColor: m.color } : undefined}
                  >
                    <Avatar member={m} />
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>

      <Field label="분담 인원" error={errors.split?.message}>
        <Controller
          control={control}
          name="split"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = field.value.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        field.onChange(
                          on
                            ? field.value.filter((id) => id !== m.id)
                            : [...field.value, m.id],
                        )
                      }
                      className={cn(
                        "flex h-[42px] items-center gap-2 rounded-md border-[1.5px] pr-3.5 pl-2 text-[13px] font-semibold transition-colors",
                        on
                          ? "border-primary bg-primary-wash text-ink"
                          : "border-line-strong bg-background text-subtle",
                      )}
                    >
                      <span className="relative">
                        <Avatar member={m} />
                        {on && (
                          <span className="absolute -right-1 -bottom-1 flex size-[15px] items-center justify-center rounded-full border-[1.5px] border-white bg-primary">
                            <Icon name="check" size={9} strokeWidth={3.2} color="#fff" />
                          </span>
                        )}
                      </span>
                      {m.name}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-semibold text-faint">
                {split.length > 0
                  ? `1인당 ${sym}${perPerson.toLocaleString("ko-KR")} · ${split.length}명`
                  : " "}
              </span>
            </div>
          )}
        />
      </Field>

      <Field label="날짜">
        <Controller
          control={control}
          name="day"
          render={({ field }) => (
            <div className="flex gap-2">
              {days.map((d) => {
                const n = d.index + 1;
                const on = field.value === n;
                const [, m, dd] = d.date.split("-").map(Number);
                return (
                  <button
                    key={d.index}
                    type="button"
                    aria-pressed={on}
                    onClick={() => field.onChange(n)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-0.5 rounded-md border-[1.5px] py-2 transition-colors",
                      on ? "border-primary bg-primary-tint" : "border-line-strong bg-background",
                    )}
                  >
                    <span className={cn("text-[11px] font-bold", on ? "text-primary-hover" : "text-faint")}>
                      DAY {n}
                    </span>
                    <span className={cn("text-[13px] font-bold", on ? "text-ink" : "text-subtle")}>
                      {m}.{dd}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>
    </Dialog>
  );
}

function Avatar({ member }: { member: MemberDto }) {
  return (
    <span
      className="flex size-7 flex-none items-center justify-center rounded-full border-2 bg-background text-[11px] font-bold"
      style={{ borderColor: member.color, color: member.color }}
    >
      {member.initial}
    </span>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-bold text-body">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error && <span className="text-[11.5px] font-semibold text-danger">{error}</span>}
    </div>
  );
}
