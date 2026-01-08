import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Video,
  Image,
  Film,
  Radio,
  Smartphone,
  FileText,
  Layers,
  Check,
  Clock,
  AlertCircle,
  Play,
  ExternalLink,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Deliverable,
  DeliverableStatus,
  DeliverableContentType,
  DELIVERABLE_STATUS_CONFIG,
  CONTENT_TYPE_CONFIG,
  PLATFORM_CONFIG,
  PRIORITY_CONFIG,
  calculateDaysUntilDue,
  canSubmitDeliverable,
} from "@/types/deliverables";
import { cn } from "@/lib/utils";

interface CreatorDeliverablesCardProps {
  boostId: string;
  userId: string;
  className?: string;
  compact?: boolean;
  onSubmitClick?: (deliverable: Deliverable) => void;
}

export function CreatorDeliverablesCard({
  boostId,
  userId,
  className,
  compact = false,
  onSubmitClick,
}: CreatorDeliverablesCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(
    null
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [creatorNotes, setCreatorNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchDeliverables = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("boost_deliverables")
        .select("*")
        .eq("bounty_campaign_id", boostId)
        .eq("user_id", userId)
        .in("status", ["scheduled", "in_progress", "late", "revision_requested", "submitted"])
        .order("due_date", { ascending: true })
        .limit(10);

      if (error) throw error;
      setDeliverables((data as Deliverable[]) || []);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
    } finally {
      setLoading(false);
    }
  }, [boostId, userId]);

  useEffect(() => {
    fetchDeliverables();
  }, [fetchDeliverables]);

  const updateStatus = async (id: string, status: DeliverableStatus) => {
    setUpdatingStatus(true);
    try {
      const updates: Partial<Deliverable> = { status };
      if (creatorNotes) {
        updates.creator_notes = creatorNotes;
      }

      const { error } = await supabase
        .from("boost_deliverables")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({ title: `Status updated to ${DELIVERABLE_STATUS_CONFIG[status].label}` });
      fetchDeliverables();
      setDetailDialogOpen(false);
      setCreatorNotes("");
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      toast({ title: "Error updating status", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getContentTypeIcon = (type: DeliverableContentType, size = "h-4 w-4") => {
    const iconClass = size;
    switch (type) {
      case "video":
        return <Video className={iconClass} />;
      case "short":
        return <Smartphone className={iconClass} />;
      case "reel":
        return <Film className={iconClass} />;
      case "story":
        return <FileText className={iconClass} />;
      case "post":
        return <Image className={iconClass} />;
      case "carousel":
        return <Layers className={iconClass} />;
      case "live":
        return <Radio className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  const getDaysText = (daysUntil: number) => {
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
    if (daysUntil === 0) return "Due today";
    if (daysUntil === 1) return "Due tomorrow";
    return `Due in ${daysUntil} days`;
  };

  const getDaysColor = (daysUntil: number, status: DeliverableStatus) => {
    if (status === "late" || daysUntil < 0) return "text-red-600";
    if (daysUntil <= 1) return "text-orange-600";
    if (daysUntil <= 3) return "text-yellow-600";
    return "text-muted-foreground";
  };

  // Calculate stats
  const upcoming = deliverables.filter((d) => d.status === "scheduled").length;
  const inProgress = deliverables.filter((d) => d.status === "in_progress").length;
  const needsRevision = deliverables.filter(
    (d) => d.status === "revision_requested"
  ).length;
  const late = deliverables.filter((d) => d.status === "late").length;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (deliverables.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-6 text-center">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">No upcoming deliverables</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    // Compact view - just show count and next due
    const nextDeliverable = deliverables[0];
    const daysUntil = calculateDaysUntilDue(nextDeliverable.due_date);

    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium font-inter tracking-[-0.5px]">
              {deliverables.length} Deliverables
            </p>
            <p className={cn("text-xs", getDaysColor(daysUntil, nextDeliverable.status))}>
              Next: {getDaysText(daysUntil)}
            </p>
          </div>
        </div>
        {(late > 0 || needsRevision > 0) && (
          <Badge variant="destructive" className="text-[10px]">
            {late + needsRevision} need attention
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-inter tracking-[-0.5px] flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Upcoming Deliverables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-semibold">{upcoming}</p>
            <p className="text-[10px] text-muted-foreground">Scheduled</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/10">
            <p className="text-lg font-semibold text-blue-600">{inProgress}</p>
            <p className="text-[10px] text-blue-600">In Progress</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-yellow-500/10">
            <p className="text-lg font-semibold text-yellow-600">{needsRevision}</p>
            <p className="text-[10px] text-yellow-600">Revision</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10">
            <p className="text-lg font-semibold text-red-600">{late}</p>
            <p className="text-[10px] text-red-600">Late</p>
          </div>
        </div>

        {/* Deliverables List */}
        <div className="space-y-2">
          {deliverables.slice(0, 5).map((deliverable) => {
            const daysUntil = calculateDaysUntilDue(deliverable.due_date);
            const statusConfig = DELIVERABLE_STATUS_CONFIG[deliverable.status];

            return (
              <button
                key={deliverable.id}
                onClick={() => {
                  setSelectedDeliverable(deliverable);
                  setDetailDialogOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors text-left"
              >
                {/* Content Type Icon */}
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg"
                  style={{ backgroundColor: statusConfig.bgColor }}
                >
                  <div style={{ color: statusConfig.color }}>
                    {getContentTypeIcon(deliverable.content_type)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">
                    {deliverable.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        "text-xs",
                        getDaysColor(daysUntil, deliverable.status)
                      )}
                    >
                      {getDaysText(daysUntil)}
                    </span>
                    {deliverable.platform && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {PLATFORM_CONFIG[deliverable.platform]?.label}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <Badge
                  className="text-[10px] shrink-0"
                  style={{
                    backgroundColor: statusConfig.bgColor,
                    color: statusConfig.color,
                  }}
                >
                  {statusConfig.label}
                </Badge>

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>

        {deliverables.length > 5 && (
          <p className="text-xs text-center text-muted-foreground">
            +{deliverables.length - 5} more deliverables
          </p>
        )}
      </CardContent>

      {/* Deliverable Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedDeliverable && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                    style={{
                      backgroundColor:
                        DELIVERABLE_STATUS_CONFIG[selectedDeliverable.status].bgColor,
                    }}
                  >
                    <div
                      style={{
                        color:
                          DELIVERABLE_STATUS_CONFIG[selectedDeliverable.status].color,
                      }}
                    >
                      {getContentTypeIcon(selectedDeliverable.content_type, "h-5 w-5")}
                    </div>
                  </div>
                  <div>
                    <DialogTitle>{selectedDeliverable.title}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {getDaysText(calculateDaysUntilDue(selectedDeliverable.due_date))} •{" "}
                      {new Date(selectedDeliverable.due_date).toLocaleDateString()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    style={{
                      backgroundColor:
                        DELIVERABLE_STATUS_CONFIG[selectedDeliverable.status].bgColor,
                      color:
                        DELIVERABLE_STATUS_CONFIG[selectedDeliverable.status].color,
                    }}
                  >
                    {DELIVERABLE_STATUS_CONFIG[selectedDeliverable.status].label}
                  </Badge>
                </div>

                {/* Content Type & Platform */}
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {CONTENT_TYPE_CONFIG[selectedDeliverable.content_type]?.label}
                  </Badge>
                  {selectedDeliverable.platform && (
                    <Badge variant="outline">
                      {PLATFORM_CONFIG[selectedDeliverable.platform]?.label}
                    </Badge>
                  )}
                  <Badge
                    style={{
                      backgroundColor:
                        PRIORITY_CONFIG[selectedDeliverable.priority].bgColor,
                      color: PRIORITY_CONFIG[selectedDeliverable.priority].color,
                    }}
                  >
                    {PRIORITY_CONFIG[selectedDeliverable.priority].label}
                  </Badge>
                </div>

                {/* Description */}
                {selectedDeliverable.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedDeliverable.description}</p>
                  </div>
                )}

                {/* Content Brief */}
                {selectedDeliverable.content_brief && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Content Brief</p>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedDeliverable.content_brief}
                    </p>
                  </div>
                )}

                {/* Requirements */}
                {(selectedDeliverable.required_hashtags?.length ||
                  selectedDeliverable.required_mentions?.length) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Requirements</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedDeliverable.required_hashtags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {selectedDeliverable.required_mentions?.map((mention) => (
                        <Badge key={mention} variant="outline" className="text-xs">
                          @{mention}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revision Notes */}
                {selectedDeliverable.revision_notes && (
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <p className="text-xs text-yellow-600 font-medium mb-1">
                      Revision Requested
                    </p>
                    <p className="text-sm text-yellow-800">
                      {selectedDeliverable.revision_notes}
                    </p>
                  </div>
                )}

                {/* Creator Notes Input (for in_progress) */}
                {selectedDeliverable.status === "in_progress" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Add Notes (Optional)</Label>
                    <Textarea
                      value={creatorNotes}
                      onChange={(e) => setCreatorNotes(e.target.value)}
                      placeholder="Any notes or questions for the brand..."
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* Actions based on status */}
              <DialogFooter className="gap-2">
                {selectedDeliverable.status === "scheduled" && (
                  <Button
                    onClick={() => updateStatus(selectedDeliverable.id, "in_progress")}
                    disabled={updatingStatus}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Working
                  </Button>
                )}

                {(selectedDeliverable.status === "in_progress" ||
                  selectedDeliverable.status === "late" ||
                  selectedDeliverable.status === "revision_requested") && (
                  <>
                    {onSubmitClick ? (
                      <Button
                        onClick={() => {
                          setDetailDialogOpen(false);
                          onSubmitClick(selectedDeliverable);
                        }}
                      >
                        Submit Content
                      </Button>
                    ) : (
                      <Button
                        onClick={() => updateStatus(selectedDeliverable.id, "submitted")}
                        disabled={updatingStatus}
                      >
                        Mark as Submitted
                      </Button>
                    )}
                  </>
                )}

                {selectedDeliverable.status === "submitted" && (
                  <div className="w-full text-center text-sm text-muted-foreground">
                    Waiting for brand review...
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
