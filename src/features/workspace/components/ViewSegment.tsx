"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * 워크스페이스 뷰 세그먼트(플랜/일정표/장소/예산) — 설계 §2. 시안 플랜 뷰 중앙 토글.
 * `?view=` 쿼리만 바꿔 본문 교체(셸·데이터 유지). 현재 뷰 강조.
 */
type ViewKey = "plan" | "calendar" | "places" | "budget";

const VIEWS: { value: ViewKey; label: string; icon: IconName }[] = [
  { value: "plan", label: "플랜", icon: "route" },
  { value: "calendar", label: "일정표", icon: "calendar" },
  { value: "places", label: "장소", icon: "map-pin" },
  { value: "budget", label: "예산", icon: "wallet" },
];

export function ViewSegment() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("view") as ViewKey) ?? "plan";

  const go = (view: ViewKey) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      role="tablist"
      aria-label="뷰 전환"
      className="flex items-center gap-0.5 rounded-md bg-secondary p-1"
    >
      {VIEWS.map((v) => {
        const active = v.value === current;
        return (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => go(v.value)}
            className={cn(
              "inline-flex h-[34px] items-center gap-1.5 rounded-xs px-3.5 text-[13.5px] transition-colors",
              active
                ? "bg-background font-bold text-primary-strong shadow-card"
                : "font-semibold text-faint hover:bg-white/60 hover:text-subtle",
            )}
          >
            <Icon name={v.icon} size={16} strokeWidth={2} />
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
