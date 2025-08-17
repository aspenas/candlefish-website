"use client";

import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

export const ToastProvider = RadixToast.Provider;
export const ToastViewport = RadixToast.Viewport;

export function Toast({ className, ...props }: RadixToast.ToastProps) {
  return (
    <RadixToast.Root
      className={cn(
        "glass border-[--border] rounded-[var(--radius)] px-4 py-3 text-sm",
        className
      )}
      {...props}
    />
  );
}

export const ToastTitle = RadixToast.Title;
export const ToastDescription = RadixToast.Description;
export const ToastAction = RadixToast.Action;
