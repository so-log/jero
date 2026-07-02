"use client";

/**
 * 범례 — "일정 순서"(번호) / "저장한 장소"(다이아). 시안 플랜 뷰.dc.html legend.
 * 색은 토큰(--primary, --color-line-strong, --color-subtle).
 */
export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-3.5 rounded-md border border-line bg-white/90 px-3.5 py-2.5 text-[12px] font-semibold text-subtle shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] backdrop-blur">
      <span className="inline-flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
          1
        </span>
        일정 순서
      </span>
      <span className="h-3.5 w-px bg-line-strong" />
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-[13px] w-[13px] border-[1.5px] border-line-strong bg-white"
          style={{ borderRadius: "50% 50% 50% 2px", transform: "rotate(45deg)" }}
        />
        저장한 장소
      </span>
    </div>
  );
}
