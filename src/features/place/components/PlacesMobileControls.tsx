"use client";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import { ALL_FOLDER } from "../types";

/**
 * 모바일 장소 컨트롤(반응형 3-D) — 폴더 드롭다운(사이드바 대체) + [리스트 | 지도] 세그먼트. md+ 에선 숨김.
 * 데스크톱은 3분할(FolderSidebar+리스트+지도)이라 이 컨트롤 불필요. 세그먼트 탭타깃 44px.
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
}

export function PlacesMobileControls({
  folders,
  folderId,
  onSelectFolder,
  mode,
  onModeChange,
}: PlacesMobileControlsProps) {
  return (
    <div className="flex flex-none items-center gap-2 border-b border-line bg-background px-4 py-3 md:hidden">
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
  );
}
