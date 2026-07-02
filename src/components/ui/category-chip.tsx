import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import {
  CATEGORY,
  CATEGORY_KEYS,
  type CategoryKey,
} from "@/lib/constants/category";

/**
 * 카테고리 칩/타일 — 색·아이콘은 데이터 구동(lib/constants/category)이라
 * Tailwind 클래스로 동적 선택 불가 → 토큰값을 inline style 로 적용(문서화된 예외).
 */
export function CategoryChip({
  category,
  className,
}: {
  category: CategoryKey;
  className?: string;
}) {
  const c = CATEGORY[category];
  return (
    <span
      className={cn(
        "inline-flex h-[30px] items-center gap-1.5 rounded-pill pr-3 pl-2.5 text-[12.5px] font-bold",
        className,
      )}
      style={{ background: c.bg, color: c.fg }}
    >
      <Icon name={c.icon} size={14} strokeWidth={2.2} />
      {c.label}
    </span>
  );
}

/**
 * 선택형 카테고리 칩 행 (단일 선택) — 오버레이 ①장소(7종)·③지출(부분집합) 공용.
 * 선택 시 카테고리 색으로 채워진다(색은 lib/constants/category 단일 출처).
 */
export function CategoryChips({
  value,
  onChange,
  keys = CATEGORY_KEYS,
  className,
}: {
  value: CategoryKey;
  onChange: (category: CategoryKey) => void;
  keys?: CategoryKey[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {keys.map((key) => {
        const c = CATEGORY[key];
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-pill border-[1.5px] pr-3 pl-2.5 text-[12.5px] font-semibold transition-colors"
            style={
              on
                ? { background: c.bg, borderColor: c.fg, color: c.fg }
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
  );
}

/** 정사각형 아이콘 타일 (장소 카드·일정 카드 등) */
export function CategoryTile({
  category,
  size = 40,
  className,
}: {
  category: CategoryKey;
  size?: number;
  className?: string;
}) {
  const c = CATEGORY[category];
  return (
    <span
      className={cn("inline-flex flex-none items-center justify-center", className)}
      style={{
        background: c.bg,
        color: c.fg,
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
      }}
    >
      <Icon name={c.icon} size={Math.round(size * 0.54)} />
    </span>
  );
}
