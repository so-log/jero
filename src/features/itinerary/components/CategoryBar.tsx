"use client";

import { Icon } from "@/components/ui/icon";
import {
  CATEGORY,
  CATEGORY_KEYS,
  type CategoryKey,
} from "@/lib/constants/category";
import { cn } from "@/lib/utils";

/**
 * 카테고리 필터 바 — "전체 폴더" + 전체 + 8 카테고리 칩. 시안 catBar.
 * 선택 시 칩이 카테고리 색으로 채워진다(색은 lib/constants/category 단일 출처).
 */
interface CategoryBarProps {
  active: CategoryKey | "all";
  onSelect: (category: CategoryKey | "all") => void;
}

export function CategoryBar({ active, onSelect }: CategoryBarProps) {
  return (
    <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
      <button
        type="button"
        className="inline-flex h-8 flex-none items-center gap-1.5 rounded-pill border border-line-strong bg-background pr-2.5 pl-3 text-[12.5px] font-semibold text-subtle"
      >
        <Icon name="layers" size={14} strokeWidth={2} />
        전체 폴더
        <Icon name="chevron-down" size={14} strokeWidth={2} />
      </button>

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
        전체
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
                : { background: "#fff", borderColor: "var(--color-line-strong)", color: "var(--color-subtle)" }
            }
          >
            <Icon name={c.icon} size={14} strokeWidth={2} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
