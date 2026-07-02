import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { ROLE, type Role } from "@/lib/constants/roles";

/**
 * 권한 배지 (소유자/편집자/뷰어) — 디자인 시스템.dc.html v1.0.
 * frosted: 카드 커버 위 프로스트 화이트 칩(02 여행 카드).
 * 색은 데이터 구동(lib/constants/roles) → inline style.
 */
export function RoleBadge({
  role,
  frosted = false,
  className,
}: {
  role: Role;
  frosted?: boolean;
  className?: string;
}) {
  const r = ROLE[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill pr-2.5 pl-2 text-[11.5px] font-bold",
        frosted ? "h-[26px] shadow-card backdrop-blur-sm" : "h-6",
        className,
      )}
      style={
        frosted
          ? { background: "rgba(255,255,255,0.92)", color: r.fg }
          : { background: r.bg, color: r.fg }
      }
    >
      <Icon name={r.icon} size={13} strokeWidth={2.1} />
      {r.label}
    </span>
  );
}
