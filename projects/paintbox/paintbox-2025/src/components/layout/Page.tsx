import { cn } from "@/lib/utils";

export function Page({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mx-auto max-w-6xl px-6 md:px-8", className)} {...props} />
  );
}
