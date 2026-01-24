"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";
import { Skeleton } from "./skeleton";

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton that matches the SellerCard component shape
 */
export function SellerCardSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar skeleton */}
          <Skeleton className="h-14 w-14 rounded-full flex-shrink-0" />

          <div className="flex-1 space-y-2">
            {/* Name */}
            <Skeleton className="h-5 w-1/2" />
            {/* Tagline */}
            <Skeleton className="h-4 w-1/3" />
            {/* Rating/sessions row */}
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>

        {/* Bio skeleton */}
        <div className="space-y-2 mt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Footer skeleton */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
          <Skeleton className="h-8 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton that matches the WalletBalanceCard component shape
 */
export function WalletBalanceSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "w-full bg-card rounded-xl border border-border p-4 sm:p-5",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Avatar skeleton */}
        <div className="relative flex-shrink-0">
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        {/* Value skeleton */}
        <div className="flex items-center gap-3">
          <div className="text-right space-y-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-10 ml-auto" />
          </div>
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton that matches the SessionCard component shape
 */
export function SessionCardSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar skeleton */}
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />

          <div className="flex-1 space-y-2">
            {/* Header row */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>

            {/* Duration and time row */}
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton that matches the StatCard component shape
 */
export function StatCardSkeleton({ className }: SkeletonProps) {
  return (
    <Card variant="bordered" className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          {/* Icon circle skeleton */}
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

          <div className="flex-1 space-y-1.5">
            {/* Label */}
            <Skeleton className="h-4 w-20" />
            {/* Value */}
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of SellerCard skeletons for loading states
 */
export function SellerCardGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SellerCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * List of WalletBalance skeletons for loading states
 */
export function WalletBalanceListSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <WalletBalanceSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * List of SessionCard skeletons for loading states
 */
export function SessionCardListSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Grid of StatCard skeletons for loading states
 */
export function StatCardGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
