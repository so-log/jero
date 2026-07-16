"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { citySchedule } from "../../lib/citySchedule";
import type { CreateTripInput } from "../../lib/tripSchema";

/**
 * Step2 — 도시·일정(다중 도시 Phase 2, 시안 "다중 도시.dc.html" §A).
 * 시작일 + 도시명·박수(추가/삭제·드래그 순서). 각 도시 날짜는 citySchedule 로 자동 계산(순수),
 * 종료일은 박수 합으로 파생. 도시 1개면 기존 단일 도시 여행과 동일. 검증(최소 1·박수)은 tripSchema.
 */
const ISO_LEN = 10;

const fmtRange = (startISO: string, endISO: string): string => {
  const [, m1, d1] = startISO.split("-");
  const [, m2, d2] = endISO.split("-");
  return `${Number(m1)}.${Number(d1)}–${Number(m2)}.${Number(d2)}`;
};

/** 시작일 + 총 박수 → 종료일(ISO). 마지막 날 = 시작 + 총 박수. */
const deriveEnd = (startISO: string, totalNights: number): string => {
  const [y, m, d] = startISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  return new Date(base.getTime() + totalNights * 86_400_000)
    .toISOString()
    .slice(0, ISO_LEN);
};

export function Step2Cities() {
  const {
    control,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateTripInput>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "cities" });

  const startISO = watch("start_date") ?? "";
  const cities = watch("cities") ?? [];
  const totalNights = cities.reduce((a, c) => a + (c.nights || 0), 0);

  // 종료일은 박수 합으로 파생(단일 출처) — 시작·박수 바뀔 때만.
  useEffect(() => {
    if (startISO.length === ISO_LEN) {
      setValue("end_date", deriveEnd(startISO, totalNights), {
        shouldValidate: true,
      });
    }
  }, [startISO, totalNights, setValue]);

  // 날짜 범위 배지용(시작일 있을 때만).
  const schedule =
    startISO.length === ISO_LEN
      ? citySchedule(
          cities.map((c, i) => ({
            id: String(i),
            name: c.name,
            country: c.country ?? null,
            lat: null,
            lng: null,
            nights: c.nights || 0,
            seq: i,
          })),
          startISO,
        )
      : [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.id === active.id);
    const to = fields.findIndex((f) => f.id === over.id);
    if (from !== -1 && to !== -1) move(from, to);
  };

  const setNights = (i: number, n: number) =>
    setValue(`cities.${i}.nights`, Math.max(0, n), { shouldValidate: true });

  const citiesError = errors.cities?.message ?? errors.start_date?.message;

  return (
    <div className="flex flex-col gap-4">
      {/* 시작일 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-bold text-body">시작일</label>
        <Input
          type="date"
          aria-label="시작일"
          value={startISO}
          onChange={(e) => setValue("start_date", e.target.value, { shouldValidate: true })}
          invalid={!!errors.start_date}
          leftIcon="calendar"
        />
      </div>

      {/* 도시 목록(드래그 순서) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-bold text-body">도시</label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {fields.map((field, i) => (
                <CityRow
                  key={field.id}
                  id={field.id}
                  index={i}
                  nameError={errors.cities?.[i]?.name?.message}
                  nights={cities[i]?.nights ?? 0}
                  range={schedule[i] ? fmtRange(schedule[i].startDate, schedule[i].endDate) : ""}
                  canRemove={fields.length > 1}
                  register={register(`cities.${i}.name`)}
                  onDec={() => setNights(i, (cities[i]?.nights ?? 0) - 1)}
                  onInc={() => setNights(i, (cities[i]?.nights ?? 0) + 1)}
                  onRemove={() => remove(i)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      {/* 도시 추가 */}
      <button
        type="button"
        onClick={() => append({ name: "", country: "", nights: 1 })}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-primary/40 bg-primary-wash text-[14px] font-bold text-primary-hover hover:bg-primary-tint"
      >
        <Icon name="plus" size={18} strokeWidth={2.2} />
        도시 추가
      </button>

      {/* 총계 */}
      <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary-wash px-4 py-3">
        <Icon name="calendar" size={18} strokeWidth={2} className="text-primary-hover" />
        <span className="text-[14px] font-bold text-ink">
          {cities.length}개 도시 · 총 {totalNights}박 {totalNights + 1}일
        </span>
      </div>

      {citiesError && (
        <span className="text-[12px] font-semibold text-danger">{citiesError}</span>
      )}
    </div>
  );
}

interface CityRowProps {
  id: string;
  index: number;
  nameError?: string;
  nights: number;
  range: string;
  canRemove: boolean;
  register: ReturnType<ReturnType<typeof useFormContext<CreateTripInput>>["register"]>;
  onDec: () => void;
  onInc: () => void;
  onRemove: () => void;
}

function CityRow({
  id,
  index,
  nameError,
  nights,
  range,
  canRemove,
  register,
  onDec,
  onInc,
  onRemove,
}: CityRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-line bg-background p-2.5"
    >
      <button
        type="button"
        aria-label="순서 변경"
        className="flex size-8 flex-none cursor-grab touch-none items-center justify-center text-mute"
        {...attributes}
        {...listeners}
      >
        <Icon name="grip-vertical" size={17} strokeWidth={2} />
      </button>
      <span className="flex size-6 flex-none items-center justify-center rounded-md bg-secondary text-[13px] font-bold text-subtle">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Input
          {...register}
          placeholder="도시 이름 (예: 오사카)"
          invalid={!!nameError}
          className="h-9"
        />
        {range && (
          <span className="pl-0.5 text-[11.5px] font-semibold text-primary-hover">
            {range} · {nights}박
          </span>
        )}
      </div>
      {/* 박수 스테퍼 */}
      <div className="flex flex-none items-center gap-1 rounded-lg bg-secondary p-1">
        <button
          type="button"
          aria-label="박수 감소"
          onClick={onDec}
          disabled={nights <= 0}
          className="flex size-8 items-center justify-center rounded-md bg-background text-subtle shadow-card disabled:opacity-40"
        >
          <Icon name="minus" size={15} strokeWidth={2.4} />
        </button>
        <div className="flex min-w-9 flex-col items-center leading-none">
          <span className="text-[15px] font-extrabold text-ink">{nights}</span>
          <span className="mt-0.5 text-[9.5px] font-semibold text-faint">박</span>
        </div>
        <button
          type="button"
          aria-label="박수 증가"
          onClick={onInc}
          className="flex size-8 items-center justify-center rounded-md bg-background text-primary-hover shadow-card"
        >
          <Icon name="plus" size={15} strokeWidth={2.4} />
        </button>
      </div>
      <button
        type="button"
        aria-label={`${index + 1}번째 도시 삭제`}
        onClick={onRemove}
        disabled={!canRemove}
        className="flex size-9 flex-none items-center justify-center rounded-md text-mute hover:bg-danger-tint hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-mute"
      >
        <Icon name="trash" size={16} strokeWidth={2} />
      </button>
    </li>
  );
}
