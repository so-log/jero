"use client";

import { Icon } from "@/components/ui/icon";

import type { EvidenceChip } from "../types";

/**
 * "참고" 근거 칩 (기획 §3 E, 시안 sourceChips).
 * 서버가 실제로 컨텍스트에 넣은 근거만 온다 — 비어 있으면 렌더하지 않는다(있는 척하지 않는다).
 */
export function EvidenceChips({ items }: { items: EvidenceChip[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold whitespace-nowrap text-mute">참고</span>
      {items.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-background py-1 pr-2.5 pl-[7px]"
        >
          <Icon name={chip.icon} size={12} strokeWidth={2} className="text-faint" />
          <span className="text-[11.5px] font-semibold whitespace-nowrap text-subtle">
            {chip.label}
          </span>
        </span>
      ))}
    </div>
  );
}
