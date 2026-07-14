"use client";

import { Icon } from "@/components/ui/icon";
import {
  CATEGORY,
  CATEGORY_KEYS,
  type CategoryKey,
} from "@/lib/constants/category";
import { cn } from "@/lib/utils";

/**
 * 카테고리 필터 바 — 모든 종류 + 8칸. 넓은 폭=칩, 좁은 폭=드롭다운(가로 스크롤 제거, U3). 선택 상태·동작 동일.
 * 플랜은 Day 기준이라 폴더 필터가 불필요 → 죽은 "전체 폴더" 버튼 제거(U5). 폴더 필터는 장소 탭 FolderSidebar 담당.
 * 색은 lib/constants/category 단일 출처.
 */
interface CategoryBarProps {
  active: CategoryKey | "all";
  onSelect: (category: CategoryKey | "all") => void;
}

export function CategoryBar({ active, onSelect }: CategoryBarProps) {
  return (
    <div className="flex items-center pb-0.5">
      {/* 넓은 폭: 칩(가로 스크롤 폴백) */}
      <div className="-mr-1 hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pr-1 sm:flex">
        <button
          type="button"
          aria-pressed={active === "all"}
          onClick={() => onSelect("all")}
          className={cn(
            "inline-flex h-8 flex-none items-center rounded-pill border px-3 text-[12.5px] font-semibold transition-colors",
            active === "all"
              ? "border-primary bg-primary text-white"
              : "border-line-strong bg-background text-subtle hover:bg-secondary",
          )}
        >
          모든 종류
        </button>

        {CATEGORY_KEYS.map((key) => {
          const c = CATEGORY[key];
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(key)}
              className="inline-flex h-8 flex-none items-center gap-1.5 rounded-pill border pr-3 pl-2.5 text-[12.5px] font-semibold transition-colors"
              style={
                on
                  ? { background: c.fg, borderColor: c.fg, color: "#fff" }
                  : {
                      background: "#fff",
                      borderColor: "var(--color-line-strong)",
                      color: "var(--color-subtle)",
                    }
              }
            >
              <Icon name={c.icon} size={14} strokeWidth={2} />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* 좁은 폭: 드롭다운(가로 스크롤 제거) */}
      <div className="relative min-w-0 flex-1 sm:hidden">
        <select
          aria-label="카테고리 필터"
          value={active}
          onChange={(e) =>
            onSelect(e.target.value as CategoryKey | "all")
          }
          className="h-8 w-full appearance-none rounded-pill border border-line-strong bg-background pr-8 pl-3 text-[12.5px] font-semibold text-subtle outline-none focus:border-primary"
        >
          <option value="all">모든 종류</option>
          {CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>
              {CATEGORY[key].label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={14}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-faint"
        />
      </div>
    </div>
  );
}
