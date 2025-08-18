import { cn } from "@/lib/utils";

export function Grid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-12 gap-6", className)} {...props} />
  );
}
