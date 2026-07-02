import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import type { IconName } from "@/lib/constants/icons";

/**
 * jero 입력 필드 — 디자인 시스템.dc.html v1.0.
 * 상태: 기본 / 포커스(primary 보더 + 포커스 링) / 오류(danger 보더 + danger-tint 배경).
 */
const inputVariants = cva(
  "w-full rounded-md border-[1.5px] bg-background font-medium text-ink outline-none transition-colors placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      inputSize: {
        md: "h-12 text-sm",
        sm: "h-[46px] text-sm",
      },
      invalid: {
        false: "border-line-strong focus:border-primary focus:shadow-focus",
        true: "border-danger bg-danger-tint focus:border-danger",
      },
    },
    defaultVariants: { inputSize: "md", invalid: false },
  },
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  /** 왼쪽 아이콘 */
  leftIcon?: IconName;
  /** 오른쪽 부가요소 (예: 비밀번호 보기 토글) */
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { className, inputSize, invalid, leftIcon, endAdornment, ...props },
    ref,
  ) {
    const padding = cn(
      leftIcon ? "pl-[38px]" : "pl-3.5",
      endAdornment ? "pr-[38px]" : "pr-3.5",
    );

    const input = (
      <input
        ref={ref}
        data-slot="input"
        aria-invalid={invalid ?? undefined}
        className={cn(inputVariants({ inputSize, invalid }), padding, className)}
        {...props}
      />
    );

    if (!leftIcon && !endAdornment) return input;

    return (
      <div className="relative flex items-center">
        {leftIcon && (
          <span
            className={cn(
              "pointer-events-none absolute left-3.5 flex",
              invalid ? "text-danger" : "text-faint",
            )}
          >
            <Icon name={leftIcon} size={16} />
          </span>
        )}
        {input}
        {endAdornment && (
          <span className="absolute right-3.5 flex text-mute">
            {endAdornment}
          </span>
        )}
      </div>
    );
  },
);
