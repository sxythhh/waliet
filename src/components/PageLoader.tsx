import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function DashboardLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="relative h-1 w-24 overflow-hidden rounded-full bg-muted/50">
        <div className="absolute inset-y-0 rounded-full bg-primary animate-loading-bar" />
      </div>
    </div>
  );
}

export function ContentLoader() {
  return (
    <div className="w-full p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-2xl" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
