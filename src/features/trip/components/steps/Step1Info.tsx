"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";

import { Combobox } from "@/components/ui/combobox";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { COVER } from "@/lib/constants/covers";
import { citiesForCountry, COUNTRIES } from "@/lib/constants/regions";
import { cn } from "@/lib/utils";

import { TRIP_COVERS, TRIP_ICONS, type CreateTripInput } from "../../lib/tripSchema";

/** Step1 — 여행 정보 + 라이브 프리뷰(제목·아이콘·커버·나라·지역 즉시 반영). 시안 step1. */
export function Step1Info() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<CreateTripInput>();
  const values = useWatch<CreateTripInput>({ control });

  const cover = (values.cover ?? "blue") as keyof typeof COVER;
  const icon = values.icon ?? "building";

  return (
    <div className="flex flex-col gap-5">
      {/* 라이브 프리뷰 */}
      <div
        className="relative h-[108px] overflow-hidden rounded-panel"
        style={{ background: COVER[cover].gradient }}
      >
        <span className="absolute bottom-3.5 left-4 flex size-11 items-center justify-center rounded-lg bg-white/90 text-subtle shadow-[0_4px_12px_-2px_color-mix(in_srgb,var(--color-ink)_20%,transparent)] backdrop-blur">
          <Icon name={icon} size={22} strokeWidth={2} />
        </span>
        <div className="absolute right-4 bottom-3.5 flex flex-col items-end gap-0.5 text-right">
          <span className="max-w-[360px] truncate text-lg font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.18)]">
            {values.title?.trim() || "여행 제목"}
          </span>
          <span className="text-[12.5px] font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)]">
            {(values.country || "나라") + " · " + (values.region || "지역")}
          </span>
        </div>
      </div>

      {/* 제목 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-bold text-body">
          여행 제목 <span className="text-danger">*</span>
        </label>
        <Input
          {...register("title")}
          placeholder="예: 도쿄, 우리끼리 4일"
          invalid={!!errors.title}
        />
        {errors.title && (
          <span className="text-[11.5px] font-semibold text-danger">
            {errors.title.message}
          </span>
        )}
      </div>

      {/* 나라 / 지역 (콤보박스 — 제안 선택 + 자유 입력) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-bold text-body">나라</label>
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Combobox
                aria-label="나라"
                value={field.value ?? ""}
                onValueChange={field.onChange}
                items={COUNTRIES}
                leftIcon="globe"
                placeholder="나라 선택 또는 입력"
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-bold text-body">지역 / 도시</label>
          <Controller
            control={control}
            name="region"
            render={({ field }) => (
              <Combobox
                aria-label="지역 / 도시"
                value={field.value ?? ""}
                onValueChange={field.onChange}
                items={citiesForCountry(values.country)}
                leftIcon="map-pin"
                placeholder="도시 선택 또는 입력"
              />
            )}
          />
        </div>
      </div>

      {/* 대표 아이콘 / 커버 색 (꾸미기) */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <label className="text-[12.5px] font-bold text-body">대표 아이콘</label>
              <div className="flex gap-2">
                {TRIP_ICONS.map((name) => {
                  const on = field.value === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => field.onChange(name)}
                      className={cn(
                        "flex size-10 flex-none items-center justify-center rounded-md border-[1.5px] transition-colors",
                        on
                          ? "border-primary bg-primary-wash text-primary-hover"
                          : "border-line-strong bg-background text-subtle hover:bg-secondary",
                      )}
                    >
                      <Icon name={name} size={18} strokeWidth={2} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        />
        <Controller
          control={control}
          name="cover"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <label className="text-[12.5px] font-bold text-body">커버 색</label>
              <div className="flex gap-2">
                {TRIP_COVERS.map((key) => {
                  const on = field.value === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={key}
                      aria-pressed={on}
                      onClick={() => field.onChange(key)}
                      className={cn(
                        "size-10 flex-none rounded-md ring-2 ring-offset-2 transition-all",
                        on ? "ring-primary" : "ring-transparent",
                      )}
                      style={{ background: COVER[key].gradient }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
