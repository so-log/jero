"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { CategoryChips } from "@/components/ui/category-chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import type { FolderDto, PlaceDto } from "@/features/itinerary";
import { cn } from "@/lib/utils";

import { useDeletePlace, useUpsertPlace } from "../api/useUpsertPlace";
import { placeSchema, type PlaceForm } from "../lib/placeSchema";

/**
 * ① 장소 상세 · 우측 패널(432px). placeSchema 폼 + "일정에 추가" + 삭제(ConfirmDialog 재사용).
 * 저장은 useUpsertPlace 스텁 — ['places'] 무효화로 04~06 동기화. 컴포넌트 직접 fetch 금지(§7.1).
 */
interface PlaceDetailOverlayProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  folders: FolderDto[];
  place?: PlaceDto;
}

export function PlaceDetailOverlay({
  open,
  onClose,
  tripId,
  folders,
  place,
}: PlaceDetailOverlayProps) {
  const upsert = useUpsertPlace(tripId);
  const remove = useDeletePlace(tripId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlaceForm>({
    resolver: zodResolver(placeSchema),
    defaultValues: {
      name: place?.name ?? "",
      address: place?.area ?? "",
      category: place?.category ?? "cafe",
      folderId: place?.folder_id ?? null,
      memo: place?.memo ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await upsert.mutateAsync({ ...values, id: place?.id });
    onClose();
  });

  const onDelete = async () => {
    if (place) await remove.mutateAsync(place.id);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      variant="panel"
      width={432}
      icon="map-pin"
      title="장소 상세"
      subtitle="저장한 장소 편집"
      banner={errors.name ? "입력값을 확인해 주세요." : null}
      loading={upsert.isPending || remove.isPending}
      footer={
        <div className="flex w-full items-center gap-2.5">
          <Button
            variant="secondary"
            size="icon"
            aria-label="장소 삭제"
            onClick={() => setConfirmOpen(true)}
            className="size-11 flex-none border-danger/30 text-danger hover:bg-danger-tint"
          >
            <Icon name="trash" size={18} strokeWidth={2} />
          </Button>
          <Button variant="primary" onClick={onSubmit} className="h-11 flex-1 gap-1.5">
            <Icon name="calendar" size={17} strokeWidth={2} />
            일정에 추가
          </Button>
        </div>
      }
    >
      {/* 미니 지도 스트립(장식) */}
      <div className="relative h-[104px] flex-none overflow-hidden rounded-lg bg-canvas">
        <svg className="absolute inset-0 size-full" viewBox="0 0 400 104" preserveAspectRatio="none" aria-hidden>
          <rect width={400} height={104} fill="var(--color-canvas)" />
          <path d="M0 70 C 120 56 240 84 400 64 L400 104 L0 104Z" fill="#D9E8F2" />
          <g stroke="#fff" strokeWidth={7} fill="none">
            <path d="M0 44 H400" />
            <path d="M210 0 V104" />
          </g>
        </svg>
        <span className="absolute top-[46%] left-1/2 size-[30px] -translate-x-1/2 -translate-y-full rounded-[50%_50%_50%_3px] border-[1.5px] border-line-strong bg-white shadow-card" />
      </div>

      <Field label="장소명" required error={errors.name?.message}>
        <Input {...register("name")} placeholder="장소 이름" invalid={!!errors.name} />
      </Field>

      <Field label="위치 · 주소">
        <Input {...register("address")} placeholder="주소 입력" />
      </Field>

      <Field label="카테고리">
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategoryChips value={field.value} onChange={field.onChange} />
          )}
        />
      </Field>

      <Field label="저장 폴더">
        <Controller
          control={control}
          name="folderId"
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5">
              {folders.map((f) => {
                const on = field.value === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => field.onChange(on ? null : f.id)}
                    className={cn(
                      "h-[34px] rounded-pill border-[1.5px] px-3 text-[12.5px] font-semibold transition-colors",
                      on
                        ? "border-primary bg-primary-tint text-primary-hover"
                        : "border-line-strong bg-background text-subtle hover:bg-secondary",
                    )}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>

      <Field label="메모">
        <textarea
          {...register("memo")}
          rows={3}
          placeholder="함께 보면 좋은 메모를 남겨보세요"
          className="w-full resize-none rounded-md border-[1.5px] border-line-strong bg-background px-3.5 py-2.5 text-sm font-medium leading-relaxed text-ink outline-none focus:border-primary focus:shadow-focus"
        />
      </Field>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        variant="destructive"
        title="이 장소를 삭제할까요?"
        description="저장한 장소와 일정 배정이 함께 사라져요. 이 작업은 되돌릴 수 없어요."
        confirmLabel="삭제할게요"
        onConfirm={onDelete}
      />
    </Dialog>
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
