import { cn } from "@/lib/utils/index"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("lm-shimmer rounded-lg bg-[var(--skeleton,#0000000d)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
