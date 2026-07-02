"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { MemberDto } from "@/features/itinerary";
import { formatKRW } from "@/lib/currency";

import type { Settlement } from "../lib/budget";

/**
 * 정산 요약 — "N건으로 정산" + 송금 행(보낸 사람 → 받는 사람 + 금액) + 정산 완료(편집). 시안 settlement.
 * Settlement[]는 셀렉터(computeSettlements) 결과만 받는다.
 */
interface SettlementSummaryProps {
  settlements: Settlement[];
  members: MemberDto[];
  canEdit: boolean;
  onMarkSettled: () => void;
}

export function SettlementSummary({
  settlements,
  members,
  canEdit,
  onMarkSettled,
}: SettlementSummaryProps) {
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-3.5 rounded-panel border border-line bg-background p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-ink">정산 요약</div>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-success-tint px-2.5 py-1 text-[11.5px] font-bold text-success">
          <Icon name="check" size={13} strokeWidth={2.4} />
          {settlements.length}건으로 정산
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {settlements.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Party member={memberById.get(s.from)} />
              <Icon
                name="arrow-right"
                size={18}
                strokeWidth={2.2}
                className="flex-none text-mute"
              />
              <Party member={memberById.get(s.to)} />
            </div>
            <span className="flex-none text-[14.5px] font-extrabold tracking-tight text-ink">
              {formatKRW(s.amountBase)}
            </span>
          </div>
        ))}
      </div>
      {canEdit && (
        <Button
          variant="secondary"
          onClick={onMarkSettled}
          className="h-10 w-full"
        >
          정산 완료로 표시
        </Button>
      )}
    </div>
  );
}

function Party({ member }: { member?: MemberDto }) {
  if (!member) return null;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        className="flex size-[26px] flex-none items-center justify-center rounded-full border-2 bg-background text-[11px] font-bold"
        style={{ borderColor: member.color, color: member.color }}
      >
        {member.initial}
      </span>
      <span className="truncate text-[13px] font-bold text-body">
        {member.name}
      </span>
    </div>
  );
}
