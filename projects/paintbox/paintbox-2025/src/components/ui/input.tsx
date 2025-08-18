import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius)] border border-[--border] bg-[color-mix(in_oklab,var(--color-bg),white_3%)] px-3 py-2 text-sm placeholder:text-[--color-muted] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
