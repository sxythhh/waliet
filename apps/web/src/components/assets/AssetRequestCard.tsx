import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  MessageSquare,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useUpdateAssetRequest, useDeleteAssetRequest } from "@/hooks/assets/useAssetRequests";
import type { AssetRequestWithRequester, AssetRequestStatus, AssetRequestPriority } from "@/types/assets";

interface AssetRequestCardProps {
  request: AssetRequestWithRequester;
  brandId: string;
  onFulfill?: (requestId: string) => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  AssetRequestStatus,
  { icon: typeof Clock; label: string; color: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-yellow-500 bg-yellow-500/10",
  },
  in_progress: {
    icon: AlertCircle,
    label: "In Progress",
    color: "text-blue-500 bg-blue-500/10",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    color: "text-green-500 bg-green-500/10",
  },
  declined: {
    icon: XCircle,
    label: "Declined",
    color: "text-red-500 bg-red-500/10",
  },
};

const PRIORITY_COLORS: Record<AssetRequestPriority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
};

export function AssetRequestCard({
  request,
  brandId,
  onFulfill,
  className,
}: AssetRequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [responseNote, setResponseNote] = useState(request.response_note || "");
  const [isResponding, setIsResponding] = useState(false);

  const updateMutation = useUpdateAssetRequest();
  const deleteMutation = useDeleteAssetRequest();

  const statusConfig = STATUS_CONFIG[request.status];
  const StatusIcon = statusConfig.icon;
  const requester = request.requester;

  const createdAt = new Date(request.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const handleStatusChange = async (newStatus: AssetRequestStatus) => {
    try {
      await updateMutation.mutateAsync({
        requestId: request.id,
        brandId,
        input: {
          status: newStatus,
          response_note: responseNote || undefined,
        },
      });
      toast.success(`Request marked as ${newStatus.replace("_", " ")}`);
      setIsResponding(false);
    } catch (error) {
      toast.error("Failed to update request");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({
        requestId: request.id,
        brandId,
      });
      toast.success("Request deleted");
    } catch (error) {
      toast.error("Failed to delete request");
    }
  };

  const isTerminal = request.status === "completed" || request.status === "declined";
  const isLoading = updateMutation.isPending || deleteMutation.isPending;

  return (
    <Card variant="bordered" className={cn("p-4", className)}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={requester?.avatar_url || undefined} />
          <AvatarFallback>
            {requester?.username?.charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-foreground">{request.title}</h4>
              <p className="text-sm text-muted-foreground">
                {requester?.username || requester?.full_name || "Unknown"} • {createdAt}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Priority badge */}
              <Badge
                variant="secondary"
                className={cn("text-xs capitalize", PRIORITY_COLORS[request.priority])}
              >
                {request.priority}
              </Badge>

              {/* Status badge */}
              <Badge
                variant="secondary"
                className={cn("gap-1 text-xs", statusConfig.color)}
              >
                <StatusIcon size={12} />
                {statusConfig.label}
              </Badge>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" disabled={isLoading}>
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isTerminal && (
                    <>
                      <DropdownMenuItem onClick={() => setIsResponding(!isResponding)}>
                        <MessageSquare size={14} className="mr-2" />
                        {isResponding ? "Cancel Response" : "Add Response"}
                      </DropdownMenuItem>
                      {onFulfill && (
                        <DropdownMenuItem onClick={() => onFulfill(request.id)}>
                          <LinkIcon size={14} className="mr-2" />
                          Upload & Fulfill
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {request.status === "pending" && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange("in_progress")}
                        >
                          <AlertCircle size={14} className="mr-2" />
                          Mark In Progress
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleStatusChange("completed")}
                        className="text-green-600"
                      >
                        <CheckCircle2 size={14} className="mr-2" />
                        Mark Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange("declined")}
                        className="text-destructive"
                      >
                        <XCircle size={14} className="mr-2" />
                        Decline
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    Delete Request
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Description */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {request.description}
            </p>
            {request.description.length > 150 && (
              <CollapsibleTrigger asChild>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                  {isExpanded ? "Show less" : "Show more"}
                </Button>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent>
              <p className="mt-2 text-sm text-muted-foreground">
                {request.description}
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Asset type if specified */}
          {request.asset_type && (
            <p className="mt-2 text-xs text-muted-foreground">
              Type requested: <span className="capitalize">{request.asset_type}</span>
            </p>
          )}

          {/* Response note */}
          {request.response_note && !isResponding && (
            <div className="mt-3 rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">Response:</p>
              <p className="mt-1 text-sm">{request.response_note}</p>
            </div>
          )}

          {/* Response input */}
          {isResponding && !isTerminal && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Add a response note (optional)..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsResponding(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("completed")}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete with Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton loading state
 */
export function AssetRequestCardSkeleton() {
  return (
    <Card variant="bordered" className="p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          <div className="h-12 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    </Card>
  );
}
