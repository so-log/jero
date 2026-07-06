"use client";

import { useFormContext } from "react-hook-form";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import type { CreateTripInput } from "../../lib/tripSchema";

/**
 * Step2 — 여행 기간. 범위 선택 캘린더(시안: 2026년 4월 고정 · 임의 월 이동은 §13 후속) + N박N일.
 * start_date/end_date 는 ISO 문자열로 보관.
 */
const MONTH = "2026-04";
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function dayToISO(day: number): string {
  return `${MONTH}-${String(day).padStart(2, "0")}`;
}
function isoToDay(iso: string): number | null {
  if (!iso || !iso.startsWith(MONTH)) return null;
  return Number(iso.slice(-2));
}

// 2026-04-01 = 수요일 → 앞 3칸(3/29~31), 4월 1~30, 뒤 2칸(5/1~2). 5주 그리드.
const CELLS: { n: number; inMonth: boolean }[] = [
  ...[29, 30, 31].map((n) => ({ n, inMonth: false })),
  ...Array.from({ length: 30 }, (_, i) => ({ n: i + 1, inMonth: true })),
  ...[1, 2].map((n) => ({ n, inMonth: false })),
];

function DateField({
  label,
  day,
  active,
  invalid,
}: {
  label: string;
  day: number | null;
  active: boolean;
  invalid: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label className="text-[12.5px] font-bold text-body">{label}</label>
      <div
        className={cn(
          "flex h-[46px] items-center gap-2 rounded-md border-[1.5px] px-3.5",
          invalid
            ? "border-danger"
            : active
              ? "border-primary bg-primary-wash"
              : "border-line-strong bg-background",
        )}
      >
        <Icon
          name="calendar"
          size={16}
          className={active ? "text-primary" : "text-faint"}
        />
        <span
          className={cn(
            "text-sm",
            day ? "font-semibold text-body" : "font-medium text-faint",
          )}
        >
          {day ? `2026.4.${day}` : "날짜 선택"}
        </span>
      </div>
    </div>
  );
}

export function Step2Dates() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateTripInput>();

  const startISO = watch("start_date");
  const endISO = watch("end_date");
  const startDay = isoToDay(startISO);
  const endDay = isoToDay(endISO);
  const dateError = errors.start_date?.message ?? errors.end_date?.message;

  const pick = (day: number) => {
    const opts = { shouldValidate: true } as const;
    if (startDay == null || endDay != null) {
      setValue("start_date", dayToISO(day), opts);
      setValue("end_date", "", opts);
    } else if (day >= startDay) {
      setValue("end_date", dayToISO(day), opts);
    } else {
      setValue("start_date", dayToISO(day), opts);
      setValue("end_date", "", opts);
    }
  };

  const nights = startDay != null && endDay != null ? endDay - startDay : null;
  const invalid = !!dateError;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex gap-3.5">
        <DateField label="시작일" day={startDay} active={endDay == null} invalid={invalid} />
        <DateField label="종료일" day={endDay} active={false} invalid={invalid} />
      </div>
      {invalid && (
        <span className="-mt-2 text-[11.5px] font-semibold text-danger">
          {dateError}
        </span>
      )}

      <div className="rounded-panel border border-line p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[15px] font-extrabold text-ink">2026년 4월</span>
          {nights != null && (
            <span className="rounded-pill bg-primary-tint px-2.5 py-1 text-[12.5px] font-bold text-primary-hover">
              {nights}박 {nights + 1}일
            </span>
          )}
        </div>
        <div className="mb-1.5 grid grid-cols-7">
          {DOW.map((d, i) => (
            <div
              key={d}
              className={cn(
                "py-0.5 text-center text-[11.5px] font-bold",
                i === 0 ? "text-danger" : i === 6 ? "text-primary" : "text-faint",
              )}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {CELLS.map((cell, i) => {
            const inRange =
              cell.inMonth &&
              startDay != null &&
              endDay != null &&
              cell.n >= startDay &&
              cell.n <= endDay;
            const isStart = cell.inMonth && cell.n === startDay;
            const isEnd = cell.inMonth && cell.n === endDay;
            const edge = isStart || isEnd;
            return (
              <button
                key={i}
                type="button"
                disabled={!cell.inMonth}
                onClick={() => cell.inMonth && pick(cell.n)}
                className={cn(
                  "flex h-[38px] items-center justify-center",
                  inRange && !edge && "bg-primary-tint",
                  isStart && isEnd && "rounded-md",
                  isStart && !isEnd && "rounded-l-md",
                  isEnd && !isStart && "rounded-r-md",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-[13.5px]",
                    edge
                      ? "bg-primary font-extrabold text-white"
                      : cell.inMonth
                        ? "font-semibold text-body"
                        : "font-semibold text-mute",
                  )}
                >
                  {cell.n}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
