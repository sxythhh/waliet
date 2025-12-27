import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSkeletonProps {
  variant?: "home" | "profile";
}

export function DashboardSkeleton({ variant = "home" }: DashboardSkeletonProps) {
  if (variant === "profile") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto px-6 pt-8 pb-8">
        {/* Profile Header Skeleton */}
        <div className="rounded-lg bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-7 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="relative">
              <Skeleton className="w-24 h-24 rounded-full" />
              <Skeleton className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full" />
            </div>
            {/* Form Fields */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-20 w-full rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Social Accounts Skeleton */}
        <div className="rounded-lg bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="space-y-1">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
          <div className="grid gap-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default "home" variant
  return (
    <div className="space-y-8 px-6 pt-8 pb-6">
      {/* Welcome Section Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Actions Section Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns Grid Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg overflow-hidden">
              <Skeleton className="h-32 w-full rounded-none" />
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-muted/70 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
