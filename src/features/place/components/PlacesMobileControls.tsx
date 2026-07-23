"use client";

import { Icon, type IconName } from "@/components/ui/icon";
import type { CityView } from "@/features/itinerary";
import { cityColor } from "@/lib/constants/cityColors";
import { cn } from "@/lib/utils";

import { ALL_CITIES, ALL_FOLDER } from "../types";

/**
 * 모바일 장소 컨트롤(반응형 3-D) — (다중 도시)도시 pill + 폴더 드롭다운(사이드바 대체) + [리스트 | 지도] 세그먼트.
 * md+ 에선 숨김(데스크톱은 3분할). 세그먼트 탭타깃 44px. 도시 축은 색 점으로 폴더와 구분(U2 IA).
 */
export type PlacesMode = "list" | "map";

const SEGMENTS: { value: PlacesMode; label: string; icon: IconName }[] = [
  { value: "list", label: "리스트", icon: "list" },
  { value: "map", label: "지도", icon: "map-pin" },
];

interface PlacesMobileControlsProps {
  folders: { id: string; name: string }[];
  folderId: string;
  onSelectFolder: (id: string) => void;
  mode: PlacesMode;
  onModeChange: (mode: PlacesMode) => void;
  /** 도시 축(2개 이상일 때만 pill 노출). 단일 도시면 [](회귀 0). */
  cities?: CityView[];
  cityId?: string;
  onSelectCity?: (cityId: string) => void;
}

export function PlacesMobileControls({
  folders,
  folderId,
  onSelectFolder,
  mode,
  onModeChange,
  cities = [],
  cityId = ALL_CITIES,
  onSelectCity,
}: PlacesMobileControlsProps) {
  const showCities = cities.length > 1 && !!onSelectCity;
  return (
    <div className="flex flex-none flex-col gap-2.5 border-b border-line bg-background px-4 py-3 md:hidden">
      {/* 도시 축 pill(다중 도시) — 가로 스크롤. "도시" 라벨로 축을 명확히. */}
      {showCities && (
        <div className="flex items-center gap-2">
          <span className="flex-none text-[11.5px] font-bold text-faint">도시</span>
          <div className="flex flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CityPill
              label="전체"
              color={null}
              active={cityId === ALL_CITIES}
              onSelect={() => onSelectCity?.(ALL_CITIES)}
            />
            {cities.map((c) => (
              <CityPill
                key={c.id}
                label={c.name}
                color={cityColor(c.seq).color}
                active={cityId === c.id}
                onSelect={() => onSelectCity?.(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
      {/* 폴더 드롭다운(사이드바 대체) */}
      <div className="relative min-w-0 flex-1">
        <select
          aria-label="폴더 선택"
          value={folderId}
          onChange={(e) => onSelectFolder(e.target.value)}
          className="h-11 w-full appearance-none rounded-md border border-line-strong bg-background pr-9 pl-3.5 text-[13.5px] font-semibold text-body outline-none focus:border-primary"
        >
          <option value={ALL_FOLDER}>전체 장소</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-faint"
        />
      </div>

      {/* 리스트 / 지도 세그먼트 */}
      <div
        role="tablist"
        aria-label="장소 보기 전환"
        className="flex flex-none gap-0.5 rounded-lg bg-secondary p-1"
      >
        {SEGMENTS.map((s) => {
          const on = mode === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={s.label}
              onClick={() => onModeChange(s.value)}
              className={cn(
                "flex size-11 items-center justify-center rounded-md transition-colors",
                on
                  ? "bg-background text-primary-strong shadow-card"
                  : "text-faint hover:text-subtle",
              )}
            >
              <Icon name={s.icon} size={18} strokeWidth={2} />
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

/** 모바일 도시 pill(색 점 = 도시 축). */
function CityPill({
  label,
  color,
  active,
  onSelect,
}: {
  label: string;
  color: string | null;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      style={active && color ? { borderColor: color, background: color } : undefined}
      className={cn(
        "inline-flex h-9 flex-none items-center gap-1.5 rounded-full border-[1.5px] px-3 transition-colors",
        active
          ? color
            ? "text-white"
            : "border-primary bg-primary text-white"
          : "border-line bg-background hover:bg-secondary",
      )}
    >
      <span
        className="size-2 flex-none rounded-full"
        style={{ background: active ? "#fff" : (color ?? "var(--color-mute)") }}
      />
      <span className="text-[13px] font-semibold whitespace-nowrap">{label}</span>
    </button>
  );
}
