import React from "react";
import { cn, cva, type VariantProps } from "@/lib/utils";
import { GlassCard } from "./GlassCard";

export const cardVariants = cva("p-5");

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, hoverable = false, ...props }, ref) => {
    return (
      <GlassCard
        className={cn(cardVariants(), className)}
        hoverable={hoverable}
        {...props}
      >
        {children}
      </GlassCard>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={cn("mbe-4", className)} {...props}>
    {children}
  </div>
));

CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ children, className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-bold tracking-tight text-[var(--text-primary)] font-display",
      className
    )}
    {...props}
  >
    {children}
  </h3>
));

CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ children, className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-[var(--text-secondary)] mbs-1", className)}
    {...props}
  >
    {children}
  </p>
));

CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={cn(className)} {...props}>
    {children}
  </div>
));

CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mbs-4 pbs-4 border-t border-[var(--border)] flex items-center justify-end",
      className
    )}
    {...props}
  >
    {children}
  </div>
));

CardFooter.displayName = "CardFooter";
