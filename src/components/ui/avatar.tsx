import { cn } from "@/lib/utils";

/**
 * 멤버 아바타 — 식별 색은 데이터 구동(profile.avatar_color) → inline style.
 * variant: solid(접속/프레즌스) / outline(여행 카드 멤버).
 */
export interface AvatarProps {
  initial: string;
  color: string;
  size?: number;
  variant?: "solid" | "outline";
  className?: string;
}

export function Avatar({
  initial,
  color,
  size = 34,
  variant = "solid",
  className,
}: AvatarProps) {
  const colors =
    variant === "solid"
      ? { background: color, color: "#fff", border: "none" }
      : { background: "#fff", color, border: `2px solid ${color}` };
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full font-bold",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), ...colors }}
    >
      {initial}
    </span>
  );
}

export interface PresenceMember {
  initial: string;
  color: string;
}

/** 접속 멤버 묶음(겹친 아바타 + "+N") + 선택적 "N명 접속 중" 배지 */
export function Presence({
  members,
  max = 4,
  size = 34,
  online,
  className,
}: {
  members: PresenceMember[];
  max?: number;
  size?: number;
  online?: number;
  className?: string;
}) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className={cn("flex items-center", className)}>
      {shown.map((m, i) => (
        <span
          key={i}
          className="rounded-full"
          style={{ marginLeft: i === 0 ? 0 : -10, boxShadow: "0 0 0 2.5px #fff" }}
        >
          <Avatar initial={m.initial} color={m.color} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-canvas font-bold text-faint"
          style={{
            width: size,
            height: size,
            marginLeft: -10,
            boxShadow: "0 0 0 2.5px #fff",
            fontSize: Math.round(size * 0.36),
          }}
        >
          +{extra}
        </span>
      )}
      {typeof online === "number" && (
        <span className="ml-3 inline-flex items-center gap-1.5 rounded-pill bg-success-tint px-2.5 py-1 text-xs font-bold text-success">
          <span className="size-[7px] rounded-full bg-success" />
          {online}명 접속 중
        </span>
      )}
    </div>
  );
}
