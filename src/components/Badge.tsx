import React from "react";
import { cn, cva, type VariantProps } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-[var(--radius-full)]",
  {
    variants: {
      variant: {
        neutral:
          "bg-[var(--muted-surface)] text-[var(--text-secondary)] border border-[var(--border)]",
        success:
          "bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)]",
        warning:
          "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]",
        error:
          "bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[color-mix(in_srgb,var(--color-error)_30%,transparent)]",
        info:
          "bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[color-mix(in_srgb,var(--color-info)_30%,transparent)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
