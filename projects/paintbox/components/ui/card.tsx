import React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "eggshell-card p-6",
      "bg-surface-primary border border-border-secondary rounded-lg",
      "shadow-eggshell-md hover:shadow-eggshell-lg",
      "transition-all duration-300 hover:transform hover:-translate-y-1",
      "backdrop-blur-sm",
      className
    )}
    {...props}
  />
));

Card.displayName = "Card";
