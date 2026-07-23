"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { usePlacesAutocomplete } from "@/components/map";
import { Button } from "@/components/ui/button";
import { CategoryChips } from "@/components/ui/category-chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import type { CityView, FolderDto, PlaceDto } from "@/features/itinerary";
import { cityColor } from "@/lib/constants/cityColors";
import { cn } from "@/lib/utils";
import type { PlacePrefill } from "@/store/overlayStore";

import { useDeletePlace, useUpsertPlace } from "../api/useUpsertPlace";
import { placeSchema, type PlaceForm } from "../lib/placeSchema";
import { MemoField } from "./MemoField";

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
  /** 지도 클릭 등록 프리필(좌표·주소) — 신규 추가 시 사용. */
  prefill?: PlacePrefill;
  /** 도시 뷰모델(다중 도시 Phase 4). 2개 이상이면 "도시" 배정 필드 노출. 단일 도시면 [](필드 숨김, 회귀 0). */
  cities?: CityView[];
}

export function PlaceDetailOverlay({
  open,
  onClose,
  tripId,
  folders,
  place,
  prefill,
  cities = [],
}: PlaceDetailOverlayProps) {
  const multiCity = cities.length > 1;
  const upsert = useUpsertPlace(tripId);
  const remove = useDeletePlace(tripId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const addressRef = useRef<HTMLInputElement | null>(null);

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<PlaceForm>({
    resolver: zodResolver(placeSchema),
    defaultValues: {
      name: place?.name ?? prefill?.name ?? "",
      address: place?.area ?? prefill?.address ?? "",
      category: place?.category ?? "cafe",
      folderId: place?.folder_id ?? null,
      memo: place?.memo ?? "",
      lat: place?.lat ?? prefill?.lat ?? null,
      lng: place?.lng ?? prefill?.lng ?? null,
      googlePlaceId: place?.google_place_id ?? prefill?.googlePlaceId ?? null,
      // 다중 도시 Phase 4 — 편집: 기존 배정 유지 / 신규: 현재 보고 있는 도시(prefill.cityId) 기본값.
      cityId: place?.city_id ?? prefill?.cityId ?? null,
    },
  });

  // "위치·주소" 필드에 Places Autocomplete 부착 — 선택 시 이름·주소·좌표·place_id 채움(§04 §13).
  const addressField = register("address");
  usePlacesAutocomplete(addressRef, (sel) => {
    setValue("address", sel.address, { shouldValidate: false });
    if (sel.name) setValue("name", sel.name, { shouldValidate: true });
    setValue("lat", sel.lat);
    setValue("lng", sel.lng);
    setValue("googlePlaceId", sel.placeId);
  });

  const onSubmit = handleSubmit(async (values) => {
    await upsert.mutateAsync({
      ...values,
      id: place?.id,
      // 신규 추가 + Day 맥락(B6)일 때만 그 날짜에 배정. 편집은 배정 변경 안 함.
      scheduledDate: place ? undefined : (prefill?.scheduledDate ?? null),
    });
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
        <Input
          name={addressField.name}
          onChange={addressField.onChange}
          onBlur={addressField.onBlur}
          ref={(el) => {
            addressField.ref(el);
            addressRef.current = el;
          }}
          leftIcon="search"
          placeholder="장소 검색(예: 센소지) 또는 주소 입력"
        />
        <span className="text-[11.5px] font-medium text-faint">
          검색 결과를 선택하면 지도에 표시돼요. 직접 입력해도 저장돼요(지도 마커는 없음).
        </span>
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

      {multiCity && (
        <Field label="도시">
          <Controller
            control={control}
            name="cityId"
            render={({ field }) => (
              <div className="flex flex-wrap gap-1.5">
                {cities.map((c) => {
                  const on = field.value === c.id;
                  const color = cityColor(c.seq);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => field.onChange(c.id)}
                      style={
                        on
                          ? { borderColor: color.color, background: color.tint }
                          : undefined
                      }
                      className={cn(
                        "inline-flex h-[34px] items-center gap-1.5 rounded-pill border-[1.5px] px-3 text-[12.5px] font-semibold transition-colors",
                        on
                          ? ""
                          : "border-line-strong bg-background text-subtle hover:bg-secondary",
                      )}
                    >
                      <span
                        className="size-2 flex-none rounded-full"
                        style={{ background: color.color }}
                      />
                      <span style={on ? { color: color.color } : undefined}>
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          />
        </Field>
      )}

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
        {/* 2차 F: 기존 장소는 인라인 자동저장(placeId), 신규는 폼값만 동기화(제출 시 저장). */}
        <MemoField
          tripId={tripId}
          placeId={place?.id}
          initial={place?.memo ?? ""}
          canEdit
          onChange={(v) => setValue("memo", v)}
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
