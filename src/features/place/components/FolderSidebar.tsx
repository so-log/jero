"use client";

import { Icon } from "@/components/ui/icon";
import type { FolderDto, PlaceDto } from "@/features/itinerary";
import { cn } from "@/lib/utils";

import { folderCount } from "../lib/selectors";
import { ALL_FOLDER } from "../types";

/**
 * 폴더 사이드바(236px) — 전체 장소 + 사용자 폴더(아이콘·이름·개수) + 폴더 추가. 시안 buildFolders.
 */
interface FolderSidebarProps {
  folders: FolderDto[];
  saved: PlaceDto[];
  folderId: string;
  canEdit: boolean;
  onSelect: (folderId: string) => void;
}

const ALL: FolderDto = {
  id: ALL_FOLDER,
  name: "전체 장소",
  icon: "layers",
  color: "#5A606B",
};

export function FolderSidebar({
  folders,
  saved,
  folderId,
  canEdit,
  onSelect,
}: FolderSidebarProps) {
  const items = [ALL, ...folders];
  return (
    <aside className="flex w-[236px] flex-none flex-col border-r border-line bg-surface">
      <div className="flex flex-none items-center justify-between px-4 pt-4 pb-2.5">
        <span className="text-[13px] font-bold tracking-wide text-faint">
          폴더
        </span>
        {canEdit && (
          <button
            type="button"
            aria-label="폴더 추가"
            className="flex size-7 items-center justify-center rounded-md border border-line-strong bg-background text-faint hover:bg-secondary hover:text-primary-hover"
          >
            <Icon name="plus" size={16} strokeWidth={2.3} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-col gap-0.5">
          {items.map((f) => {
            const on = f.id === folderId;
            const count = folderCount(saved, f.id);
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(f.id)}
                className={cn(
                  "flex h-[42px] items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors",
                  on ? "bg-primary-tint" : "hover:bg-secondary",
                )}
              >
                <span
                  className={cn(
                    "flex size-[26px] flex-none items-center justify-center rounded-lg",
                    on && "bg-background",
                  )}
                >
                  <Icon
                    name={f.icon}
                    size={16}
                    strokeWidth={2}
                    color={on ? "var(--color-primary-hover)" : f.color}
                  />
                </span>
                <span
                  className={cn(
                    "flex-1 text-[13.5px]",
                    on ? "font-bold text-ink" : "font-semibold text-body",
                  )}
                >
                  {f.name}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    on ? "text-primary-hover" : "text-mute",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {canEdit && (
        <div className="flex-none border-t border-line p-3">
          <button
            type="button"
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line-strong bg-background text-[13px] font-bold text-faint hover:border-primary hover:bg-primary-wash hover:text-primary-hover"
          >
            <Icon name="folder-plus" size={16} strokeWidth={2.2} />
            폴더 추가
          </button>
        </div>
      )}
    </aside>
  );
}
