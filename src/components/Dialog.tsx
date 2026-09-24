"use client";

import React, { useEffect } from "react";
import { Button } from "./Button";
import { cn, cva } from "@/lib/utils";

export const dialogOverlayVariants = cva(
  "fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
);

export const dialogContentVariants = cva(
  "relative bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-lg overflow-hidden animate-in fade-in-50 duration-150 z-10"
);

export const dialogHeaderVariants = cva(
  "px-6 py-4 border-b border-[var(--border)] flex items-center justify-between"
);

export const dialogBodyVariants = cva("p-6 overflow-y-auto max-h-[70vh]");

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={cn(dialogOverlayVariants())}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(dialogContentVariants())}
      >
        <div className={cn(dialogHeaderVariants())}>
          <h2 id="dialog-title" className="text-lg font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 hover:bg-[var(--card)]"
            aria-label="Close dialog"
          >
            ✕
          </Button>
        </div>

        <div className={cn(dialogBodyVariants())}>
          {children}
        </div>
      </div>
    </div>
  );
};
