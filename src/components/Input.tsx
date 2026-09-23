"use client";

import React, { useId } from "react";
import { cn, cva, type VariantProps } from "@/lib/utils";

export const inputVariants = cva(
  "w-full px-3 py-2 text-sm rounded-[var(--radius-md)] outline-none bg-[var(--card)] text-[var(--text-primary)] border transition-all duration-200 placeholder:text-[var(--text-muted)]",
  {
    variants: {
      state: {
        default:
          "border-[var(--border)] focus:border-[var(--color-primary-600)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary-600)_25%,transparent)]",
        error:
          "border-[var(--color-error)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-error)_30%,transparent)]",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      type = "text",
      id,
      state,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const computedState = state || (error ? "error" : "default");

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          id={inputId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(inputVariants({ state: computedState }), className)}
          {...props}
        />
        {error && (
          <span
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-[var(--color-error)] font-medium mbs-0.5"
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
