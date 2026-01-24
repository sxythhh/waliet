import { useState } from "react";
import { MessageSquarePlus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssetRequestsByBrand, usePendingRequestCount } from "@/hooks/assets/useAssetRequests";
import { AssetRequestCard, AssetRequestCardSkeleton } from "./AssetRequestCard";
import type { AssetRequestStatus } from "@/types/assets";

interface AssetRequestsPanelProps {
  brandId: string;
  onFulfillRequest?: (requestId: string) => void;
  className?: string;
}

const STATUS_OPTIONS: Array<{ value: AssetRequestStatus | "all"; label: string }> = [
  { value: "all", label: "All Requests" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
];

export function AssetRequestsPanel({
  brandId,
  onFulfillRequest,
  className,
}: AssetRequestsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<AssetRequestStatus | "all">("all");

  const { data: requests = [], isLoading, error } = useAssetRequestsByBrand(
    brandId,
    statusFilter === "all" ? undefined : statusFilter
  );

  const { data: pendingCount = 0 } = usePendingRequestCount(brandId);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Asset Requests</h3>
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} pending request${pendingCount !== 1 ? "s" : ""}`
              : "No pending requests"}
          </p>
        </div>

        {/* Filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as AssetRequestStatus | "all")}
        >
          <SelectTrigger className="w-40">
            <Filter size={14} className="mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AssetRequestCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">Failed to load requests</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && requests.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <MessageSquarePlus className="mx-auto h-10 w-10 text-muted-foreground" />
          <h4 className="mt-4 font-medium">No requests</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusFilter === "all"
              ? "Creators haven't submitted any asset requests yet."
              : `No ${statusFilter.replace("_", " ")} requests.`}
          </p>
        </div>
      )}

      {/* Request list */}
      {!isLoading && !error && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => (
            <AssetRequestCard
              key={request.id}
              request={request}
              brandId={brandId}
              onFulfill={onFulfillRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact badge showing pending request count
 */
interface RequestCountBadgeProps {
  brandId: string;
  className?: string;
}

export function RequestCountBadge({ brandId, className }: RequestCountBadgeProps) {
  const { data: count = 0 } = usePendingRequestCount(brandId);

  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
