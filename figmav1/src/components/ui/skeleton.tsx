import { cn } from "../../utils/cn"; // Assuming utils is at src/utils/cn.ts

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-700", className)}
      {...props}
    />
  );
}

export { Skeleton };