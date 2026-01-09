import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("rounded-md skeleton-shimmer", className)}
      style={style}
      {...props}
    />
  );
}

export { Skeleton };
