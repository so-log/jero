import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * jero 버튼 — 디자인 시스템.dc.html v1.0 버튼 토큰 반영.
 * variant: primary / secondary / ghost / destructive / soft / link
 * size: md(44) / sm(38) / lg(50) / icon(44) / icon-sm(38)
 * shape: default(rounded-md) / pill
 * 색·radius·그림자는 @theme 토큰만 사용 (CLAUDE.md §7.1).
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-bold whitespace-nowrap outline-none transition-colors select-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover",
        secondary:
          "border border-line-strong bg-background text-body hover:bg-secondary",
        ghost:
          "bg-secondary text-subtle hover:bg-[color-mix(in_srgb,var(--secondary),#000_4%)]",
        destructive:
          "bg-destructive text-white hover:bg-[color-mix(in_srgb,var(--destructive),#000_8%)]",
        soft: "bg-primary-tint text-primary-hover hover:bg-[color-mix(in_srgb,var(--primary-tint),#000_4%)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        md: "h-11 px-5 text-sm",
        sm: "h-[38px] px-4 text-[13px]",
        lg: "h-[50px] px-5 text-[15px]",
        icon: "size-11",
        "icon-sm": "size-[38px]",
      },
      shape: {
        default: "rounded-md",
        pill: "rounded-pill",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      shape: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  shape,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
