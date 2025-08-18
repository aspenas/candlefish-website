"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;

export function SheetContent({ className, side = "right", ...props }: Dialog.DialogContentProps & { side?: "left" | "right" | "top" | "bottom" }) {
  const sideClasses = {
    right: "inset-y-0 right-0 w-[380px] border-l",
    left: "inset-y-0 left-0 w-[380px] border-r",
    top: "inset-x-0 top-0 h-[50vh] border-b",
    bottom: "inset-x-0 bottom-0 h-[50vh] border-t",
  }[side];

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/40" />
      <Dialog.Content
        className={cn(
          "fixed bg-[var(--color-bg-elevated)] text-[--color-foreground] border-[--border] glass",
          sideClasses,
          className
        )}
        {...props}
      />
    </Dialog.Portal>
  );
}
