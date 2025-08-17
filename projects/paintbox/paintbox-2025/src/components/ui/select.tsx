"use client";

import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

export function Select({ children, ...props }: RadixSelect.SelectProps) {
  return <RadixSelect.Root {...props}>{children}</RadixSelect.Root>;
}

export function SelectTrigger({ className, ...props }: RadixSelect.SelectTriggerProps) {
  return (
    <RadixSelect.Trigger
      className={cn(
        "inline-flex h-10 w-full items-center justify-between rounded-[var(--radius)] border border-[--border] bg-[color-mix(in_oklab,var(--color-bg),white_3%)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className
      )}
      {...props}
    />
  );
}

export function SelectContent({ className, ...props }: RadixSelect.SelectContentProps) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-[var(--radius)] border border-[--border] bg-[var(--color-bg-elevated)] text-[--color-foreground] shadow-[var(--shadow-2)]",
          className
        )}
        {...props}
      />
    </RadixSelect.Portal>
  );
}

export const SelectItem = React.forwardRef<HTMLDivElement, RadixSelect.SelectItemProps>(
  ({ className, ...props }, ref) => (
    <RadixSelect.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none focus:bg-[color-mix(in_oklab,var(--color-bg),white_6%)]",
        className
      )}
      {...props}
    />
  )
);
SelectItem.displayName = "SelectItem";
