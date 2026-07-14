"use client";

import { useFormContext } from "react-hook-form";

import type { CreateTripInput } from "../../lib/tripSchema";
import { RangeCalendar } from "../RangeCalendar";

/**
 * Step2 — 여행 기간. 공용 RangeCalendar(임의 월 이동·범위 선택·타이핑 입력)를 RHF 에 바인딩.
 * start_date/end_date 는 ISO('YYYY-MM-DD') 로 보관. 검증(시작≤종료·필수)은 tripSchema 가 강제.
 */
export function Step2Dates() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateTripInput>();

  const startISO = watch("start_date") ?? "";
  const endISO = watch("end_date") ?? "";
  const dateError = errors.start_date?.message ?? errors.end_date?.message;

  const opts = { shouldValidate: true } as const;

  return (
    <RangeCalendar
      start={startISO}
      end={endISO}
      onChange={(start, end) => {
        setValue("start_date", start, opts);
        setValue("end_date", end, opts);
      }}
      invalid={!!dateError}
      errorMessage={dateError}
    />
  );
}
