import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface CloseStatusBadgeProps {
  statusLabel: string | null;
  statusId: string | null;
  showFromClose?: boolean;
  className?: string;
}

// Color mapping for common Close status labels
const STATUS_COLORS: Record<string, string> = {
  // Default Close statuses
  "Potential": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "Bad Fit": "bg-red-500/20 text-red-400 border-red-500/30",
  "Qualified": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Customer": "bg-green-500/20 text-green-400 border-green-500/30",
  // Common custom statuses
  "New Lead": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Contacted": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Demo Scheduled": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Proposal Sent": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Negotiation": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Won": "bg-green-500/20 text-green-400 border-green-500/30",
  "Lost": "bg-red-500/20 text-red-400 border-red-500/30",
  "Churned": "bg-red-500/20 text-red-400 border-red-500/30",
  // Default
  "default": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function CloseStatusBadge({
  statusLabel,
  statusId,
  showFromClose = false,
  className,
}: CloseStatusBadgeProps) {
  if (!statusLabel && !statusId) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-gray-500/10 text-gray-500 border-gray-500/20",
          className
        )}
      >
        Unlinked
      </Badge>
    );
  }

  const colorClass = STATUS_COLORS[statusLabel || ""] || STATUS_COLORS["default"];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Badge variant="outline" className={cn(colorClass, "border")}>
        {statusLabel || "Unknown"}
      </Badge>
      {showFromClose && (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Close
        </Badge>
      )}
    </div>
  );
}

// Simple badge for inline use (no "From Close" indicator)
export function CloseStatusDot({
  statusLabel,
  className,
}: {
  statusLabel: string | null;
  className?: string;
}) {
  if (!statusLabel) return null;

  const colorClass = STATUS_COLORS[statusLabel] || STATUS_COLORS["default"];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm",
        className
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          colorClass.replace("bg-", "").replace("/20", "").split(" ")[0]
        )}
        style={{
          backgroundColor: getStatusColor(statusLabel),
        }}
      />
      {statusLabel}
    </span>
  );
}

// Get raw color for status (used for dynamic styling)
export function getStatusColor(statusLabel: string | null): string {
  const colors: Record<string, string> = {
    "Potential": "#6b7280",
    "Bad Fit": "#ef4444",
    "Qualified": "#3b82f6",
    "Customer": "#22c55e",
    "New Lead": "#a855f7",
    "Contacted": "#3b82f6",
    "Demo Scheduled": "#eab308",
    "Proposal Sent": "#f97316",
    "Negotiation": "#f97316",
    "Won": "#22c55e",
    "Lost": "#ef4444",
    "Churned": "#ef4444",
  };

  return colors[statusLabel || ""] || "#6b7280";
}

// From Close indicator badge
export function FromCloseBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs font-normal",
        className
      )}
    >
      <ExternalLink className="h-3 w-3 mr-1" />
      From Close
    </Badge>
  );
}
