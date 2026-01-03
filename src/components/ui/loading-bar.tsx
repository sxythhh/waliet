import { cn } from "@/lib/utils";

interface LoadingBarProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingBar({ className, size = "md" }: LoadingBarProps) {
  const heights = {
    sm: "h-0.5",
    md: "h-1",
    lg: "h-1.5",
  };

  const widths = {
    sm: "w-16",
    md: "w-24",
    lg: "w-32",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-muted/50",
        heights[size],
        widths[size],
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 rounded-full bg-blue-500",
          "animate-loading-bar"
        )}
      />
    </div>
  );
}

interface LoadingStateProps {
  className?: string;
  text?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({ className, text, size = "md" }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <LoadingBar size={size} />
      {text && (
        <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.3px] animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = "Loading..." }: PageLoadingProps) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <LoadingState text={text} size="md" />
    </div>
  );
}

interface InlineLoadingProps {
  className?: string;
}

export function InlineLoading({ className }: InlineLoadingProps) {
  return <LoadingBar size="sm" className={className} />;
}
