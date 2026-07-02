import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import type { IconName } from "@/lib/constants/icons";

/**
 * 빈 상태 안내 — 아이콘 메달리언 + 제목 + 설명 + (선택) CTA.
 * 내 여행 목록·플랜 뷰 등 전역 공통 (디자인 시스템 톤).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        className,
      )}
    >
      <div className="mb-1.5 flex size-[84px] items-center justify-center rounded-[26px] bg-primary-tint text-primary shadow-[0_8px_22px_-8px_rgba(91,141,239,0.45)]">
        <Icon name={icon} size={40} strokeWidth={1.9} />
      </div>
      <div className="text-[19px] font-extrabold tracking-tight text-ink">
        {title}
      </div>
      {description && (
        <div className="max-w-[330px] text-sm leading-relaxed text-faint">
          {description}
        </div>
      )}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}
