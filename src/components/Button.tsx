import React from "react";
import { cn, cva, type VariantProps } from "@/lib/utils";

export const buttonVariants = cva(
  `inline-flex items-center justify-center font-bold whitespace-nowrap
  transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1)
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky-blue-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
  disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] hover:scale-[1.02]
  relative overflow-hidden cursor-pointer`,
  {
    variants: {
      variant: {
        primary: `
          bg-[image:var(--gradient-primary)] text-white shadow-[0_4px_14px_rgba(14,165,233,0.3)]
          border border-transparent
          before:absolute before:top-0 before:-start-full before:w-full before:h-full
          before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
          before:transition-all before:duration-700 hover:before:start-full
        `,
        secondary: `
          bg-[var(--muted-surface)] text-[var(--text-primary)]
          hover:bg-[var(--border)] border border-[var(--border)]
        `,
        outline: `
          bg-[var(--glass-bg)] text-[var(--text-primary)] border border-[var(--glass-border)]
          hover:bg-[var(--muted-surface)] hover:border-[var(--sky-blue-500)]/40
        `,
        ghost: `
          bg-transparent text-[var(--text-secondary)] hover:bg-[var(--muted-surface)] hover:text-[var(--text-primary)] border border-transparent
        `,
        danger: `
          bg-[var(--color-error)] text-white hover:opacity-90 border border-transparent shadow-[var(--shadow-sm)]
        `,
      },
      size: {
        sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
        md: "px-4 py-2 text-sm rounded-xl gap-2",
        lg: "px-6 py-2.5 text-base rounded-2xl gap-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {/* Absolute overlay elements or static label */}
        <span className="relative z-10 flex items-center justify-center gap-inherit">
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";
