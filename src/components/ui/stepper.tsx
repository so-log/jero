import { cn } from "@/lib/utils";
import { Icon } from "./icon";

/**
 * 다단계 입력 스테퍼 — 새 여행 만들기.dc.html v1.0.
 * 완료(체크)/현재(채움 + 그림자)/예정(연회색) 상태.
 */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number; // 1-based
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between", className)}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="contents">
            {i > 0 && (
              <div
                className={cn(
                  "mx-1 mt-4 h-0.5 flex-1 rounded-pill transition-colors",
                  n <= current ? "bg-primary" : "bg-line-strong",
                )}
              />
            )}
            <div className="flex flex-none flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-[13.5px] font-extrabold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-primary"
                    : done
                      ? "bg-primary-tint text-primary-hover"
                      : "border border-line bg-secondary text-faint",
                )}
              >
                {done ? <Icon name="check" size={16} strokeWidth={2.6} /> : n}
              </div>
              <span
                className={cn(
                  "hidden whitespace-nowrap text-xs font-semibold sm:block",
                  active ? "text-ink" : done ? "text-subtle" : "text-mute",
                )}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
