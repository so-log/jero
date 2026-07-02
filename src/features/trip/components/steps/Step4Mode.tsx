"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import { TRIP_TEMPLATES } from "../../lib/templates";
import type { CreateTripInput } from "../../lib/tripSchema";

/** Step4 — 시작 방식(빈 여행/템플릿 복제) + 템플릿 선택(템플릿 모드 필수). 시안 step4. */
const CHOICES: { key: "blank" | "template"; icon: IconName; title: string; desc: string }[] = [
  { key: "blank", icon: "file-plus", title: "빈 여행으로 시작", desc: "깨끗한 상태에서 장소와 일정을 직접 채워요" },
  { key: "template", icon: "layers", title: "템플릿 복제로 시작", desc: "검증된 여행을 복제해 빠르게 시작해요" },
];

export function Step4Mode() {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<CreateTripInput>();
  const mode = watch("startMode");
  const tplError = errors.templateId?.message;

  return (
    <div className="flex flex-col gap-3.5">
      <Controller
        control={control}
        name="startMode"
        render={({ field }) => (
          <div className="flex gap-3.5">
            {CHOICES.map((c) => {
              const on = field.value === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => field.onChange(c.key)}
                  className={cn(
                    "relative flex flex-1 flex-col gap-3 rounded-panel border-[1.5px] p-[18px] text-left transition-colors",
                    on ? "border-primary bg-primary-wash" : "border-line-strong bg-background hover:bg-secondary",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-md",
                        on ? "bg-primary-tint text-primary-hover" : "bg-secondary text-subtle",
                      )}
                    >
                      <Icon name={c.icon} size={22} strokeWidth={2} />
                    </span>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border-2",
                        on ? "border-primary bg-primary text-white" : "border-line-strong bg-background",
                      )}
                    >
                      {on && <Icon name="check" size={12} strokeWidth={3} />}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-extrabold text-ink">{c.title}</span>
                    <span className="text-[12.5px] font-medium leading-relaxed text-faint">
                      {c.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      />

      {mode === "template" && (
        <Controller
          control={control}
          name="templateId"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <span className="mt-1 text-[12.5px] font-bold text-body">복제할 템플릿</span>
              {TRIP_TEMPLATES.map((t) => {
                const on = field.value === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => field.onChange(t.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-panel border-[1.5px] px-3.5 py-3 text-left transition-colors",
                      on
                        ? "border-primary bg-primary-wash"
                        : tplError
                          ? "border-danger/50 bg-background"
                          : "border-line-strong bg-background hover:bg-secondary",
                    )}
                  >
                    <span className="flex size-9 flex-none items-center justify-center rounded-md bg-secondary text-subtle">
                      <Icon name={t.icon} size={18} strokeWidth={2} />
                    </span>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-body">{t.name}</div>
                      <div className="text-xs font-medium text-faint">{t.meta}</div>
                    </div>
                    <span
                      className={cn(
                        "flex size-[19px] flex-none items-center justify-center rounded-full border-2",
                        on ? "border-primary bg-primary text-white" : "border-line-strong bg-background",
                      )}
                    >
                      {on && <Icon name="check" size={11} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
              {tplError && (
                <span className="text-[11.5px] font-semibold text-danger">{tplError}</span>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
