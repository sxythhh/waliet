import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ExternalLink,
  MoreHorizontal,
  X,
  MessageSquare,
  Video,
  ArrowRight,
  GripVertical,
  Filter,
  CalendarDays,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { MarkAsPostedDialog } from "./MarkAsPostedDialog";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface BoostVideoReviewQueueProps {
  boostId: string;
  brandId: string;
  userRole: "owner" | "admin" | "poster" | "member";
  searchQuery?: string;
}

interface VideoSubmission {
  id: string;
  gdrive_url: string | null;
  gdrive_file_id: string | null;
  gdrive_thumbnail_url: string | null;
  gdrive_file_name: string | null;
  caption: string | null;
  feedback: string | null;
  account_manager_notes: string | null;
  submission_notes: string | null;
  duration_seconds: number | null;
  status: string;
  status_tiktok: string | null;
  status_instagram: string | null;
  status_youtube: string | null;
  posted_url_tiktok: string | null;
  posted_url_instagram: string | null;
  posted_url_youtube: string | null;
  caption_edited_at: string | null;
  caption_edited_by: string | null;
  scheduled_post_date: string | null;
  scheduled_post_time: string | null;
  created_at: string;
  creator_id: string;
  revision_number: number;
  creator?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

type KanbanColumn = "pending" | "approved" | "ready_to_post" | "posted";

const COLUMNS: { id: KanbanColumn; label: string; headerBg: string; dotColor: string }[] = [
  { id: "pending", label: "Pending", headerBg: "bg-amber-500/10", dotColor: "bg-amber-500" },
  { id: "approved", label: "Approved", headerBg: "bg-blue-500/10", dotColor: "bg-blue-500" },
  { id: "ready_to_post", label: "Ready to Post", headerBg: "bg-violet-500/10", dotColor: "bg-violet-500" },
  { id: "posted", label: "Posted", headerBg: "bg-emerald-500/10", dotColor: "bg-emerald-500" },
];

const PLATFORM_CONFIG = {
  tiktok: { icon: "logos:tiktok-icon", label: "TT" },
  instagram: { icon: "skill-icons:instagram", label: "IG" },
  youtube: { icon: "logos:youtube-icon", label: "YT" },
};

const STATUS_CONFIG = {
  pending: { color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
  approved: { color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
  ready_to_post: { color: "bg-violet-500", textColor: "text-violet-600 dark:text-violet-400" },
  posted: { color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
  rejected: { color: "bg-red-500", textColor: "text-red-600 dark:text-red-400" },
} as const;

// Helper to clean caption - removes garbage lines like "0", single chars, just numbers
const cleanCaption = (text: string | null | undefined): string | null => {
  if (!text) return null;

  // Split on any line break character (handles \n, \r\n, \r, and Unicode line separators)
  const lines = text.split(/[\r\n\u2028\u2029]+/).map(line => line.trim()).filter(line => {
    if (line.length < 2) return false; // Single char or empty
    if (/^\d+$/.test(line)) return false; // Just numbers
    return true;
  });

  const cleaned = lines.join(' ').trim();
  if (cleaned.length < 3) return null;
  // Final check: if result is just digits/whitespace, return null
  if (/^\d+$/.test(cleaned)) return null;
  return cleaned;
};

// Droppable column content wrapper
function DroppableColumn({
  column,
  children,
}: {
  column: { id: KanbanColumn; label: string; headerBg: string; dotColor: string };
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 space-y-2 overflow-y-auto min-h-[200px] pr-0.5 rounded-lg transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset"
      )}
    >
      {children}
    </div>
  );
}

// Draggable card component
interface DraggableCardProps {
  submission: VideoSubmission;
  columnId: KanbanColumn;
  updating: string | null;
  canApprove: boolean;
  canPost: boolean;
  onMoveToColumn: (id: string, column: KanbanColumn) => void;
  onReject: (id: string) => void;
  onOpenFeedback: (submission: VideoSubmission) => void;
  onOpenDrawer: (submission: VideoSubmission) => void;
  getPlatformIndicators: (submission: VideoSubmission) => { platform: keyof typeof PLATFORM_CONFIG; status: string }[];
  getNextColumn: (current: KanbanColumn) => KanbanColumn | null;
}

function DraggableCard({
  submission,
  columnId,
  updating,
  canApprove,
  canPost,
  onMoveToColumn,
  onReject,
  onOpenFeedback,
  onOpenDrawer,
  getPlatformIndicators,
  getNextColumn,
}: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: submission.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const nextColumn = getNextColumn(columnId);
  const canMoveNext = nextColumn && (
    (nextColumn === "approved" && canApprove) ||
    (nextColumn === "ready_to_post" && canPost) ||
    (nextColumn === "posted" && canPost)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onOpenDrawer(submission)}
      className={cn(
        "group rounded-lg border border-border/40 bg-card hover:border-border/60 transition-all cursor-pointer overflow-hidden",
        updating === submission.id && "opacity-50 pointer-events-none",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30"
      )}
    >
      {/* Video Thumbnail - Use iframe preview for better quality */}
      {submission.gdrive_file_id ? (
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          <iframe
            src={`https://drive.google.com/file/d/${submission.gdrive_file_id}/preview`}
            className="w-full h-full border-0 pointer-events-none"
            allow="autoplay"
          />
          {submission.duration_seconds && (
            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded font-inter tabular-nums z-10">
              {Math.floor(submission.duration_seconds / 60)}:{(submission.duration_seconds % 60).toString().padStart(2, "0")}
            </span>
          )}
          {submission.gdrive_url && (
            <a
              href={submission.gdrive_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-1.5 right-1.5 p-1 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded transition-colors opacity-0 group-hover:opacity-100 z-10"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ) : submission.gdrive_url ? (
        <div className="relative aspect-video w-full bg-muted/50 flex items-center justify-center">
          <Video className="w-8 h-8 text-muted-foreground/40" />
          {submission.duration_seconds && (
            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded font-inter tabular-nums">
              {Math.floor(submission.duration_seconds / 60)}:{(submission.duration_seconds % 60).toString().padStart(2, "0")}
            </span>
          )}
          <a
            href={submission.gdrive_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-1.5 right-1.5 p-1 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded transition-colors opacity-0 group-hover:opacity-100"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : null}
      <div className="p-3">
        {/* Card Header with Drag Handle */}
        <div className="flex items-start gap-2 mb-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 p-0.5 -ml-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors touch-none"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <Avatar className="h-7 w-7 rounded-md border border-border/30 shrink-0">
            <AvatarImage src={submission.creator?.avatar_url || undefined} />
            <AvatarFallback className="rounded-md bg-muted text-[10px] font-medium">
              {submission.creator?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-xs font-inter tracking-[-0.2px] text-foreground truncate leading-tight">
              {submission.creator?.full_name || submission.creator?.username || "Unknown"}
            </p>
            <p className="text-[10px] text-muted-foreground font-inter leading-tight mt-0.5">
              {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
                className="h-5 w-5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mt-0.5 -mr-1"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
              {submission.gdrive_url && (
                <DropdownMenuItem asChild>
                  <a
                    href={submission.gdrive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Drive
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onOpenFeedback(submission)}
                className="gap-2 text-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {submission.feedback ? "Edit Feedback" : "Add Feedback"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {COLUMNS.filter(c => c.id !== columnId).map((targetColumn) => {
                const canMove =
                  (targetColumn.id === "pending" && canApprove) ||
                  (targetColumn.id === "approved" && canApprove) ||
                  (targetColumn.id === "ready_to_post" && canPost) ||
                  (targetColumn.id === "posted" && canPost);

                if (!canMove) return null;

                return (
                  <DropdownMenuItem
                    key={targetColumn.id}
                    onClick={() => onMoveToColumn(submission.id, targetColumn.id)}
                    className="gap-2 text-xs"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Move to {targetColumn.label}
                  </DropdownMenuItem>
                );
              })}
              {canApprove && columnId === "pending" && (
                <DropdownMenuItem
                  onClick={() => onReject(submission.id)}
                  className="gap-2 text-xs text-red-600 focus:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Caption Preview */}
        {cleanCaption(submission.caption) && (
          <p className="text-[11px] text-foreground/80 font-inter leading-relaxed line-clamp-2 mb-2">
            {cleanCaption(submission.caption)}
          </p>
        )}

        {/* Revision + Feedback Row */}
        <div className="flex items-center gap-2 mb-2">
          {(submission.revision_number ?? 0) > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-medium font-inter">
              Rev {submission.revision_number}
            </span>
          )}
          {submission.feedback && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <MessageSquare className="w-2.5 h-2.5" />
              <span className="text-[9px] font-inter">Feedback</span>
            </span>
          )}
        </div>

        {/* Footer: Platforms with Status Badges + Duration + Quick Action */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-border/20">
          {getPlatformIndicators(submission).map(({ platform, status }) => {
            const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            return (
              <div
                key={platform}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/40"
                title={`${PLATFORM_CONFIG[platform].label}: ${status.replace(/_/g, " ")}`}
              >
                <Icon icon={PLATFORM_CONFIG[platform].icon} className="w-2.5 h-2.5" />
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusConfig.color)} />
              </div>
            );
          })}
          {/* Only show duration here if no thumbnail/video placeholder shown */}
          {submission.duration_seconds && !submission.gdrive_url && (
            <span className="text-[9px] text-muted-foreground font-inter tabular-nums ml-1">
              {Math.floor(submission.duration_seconds / 60)}:{(submission.duration_seconds % 60).toString().padStart(2, "0")}
            </span>
          )}
          {canMoveNext && nextColumn && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded ml-auto opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToColumn(submission.id, nextColumn);
              }}
            >
              <ArrowRight className="w-3 h-3 text-primary" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BoostVideoReviewQueue({
  boostId,
  brandId,
  userRole,
  searchQuery = "",
}: BoostVideoReviewQueueProps) {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<VideoSubmission | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSubmission, setDrawerSubmission] = useState<VideoSubmission | null>(null);
  const [markAsPostedOpen, setMarkAsPostedOpen] = useState(false);
  const [markAsPostedSubmission, setMarkAsPostedSubmission] = useState<VideoSubmission | null>(null);

  // Filter state
  const [platformFilter, setPlatformFilter] = useState<"all" | "tiktok" | "instagram" | "youtube">("all");
  const [editorFilter, setEditorFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const canApprove = userRole === "owner" || userRole === "admin";
  const canPost = userRole === "owner" || userRole === "admin" || userRole === "poster";

  // Get unique editors from submissions for filter dropdown
  const uniqueEditors = useMemo(() => {
    const editorMap = new Map<string, { id: string; name: string; username: string }>();
    submissions.forEach((sub) => {
      if (sub.creator && !editorMap.has(sub.creator.id)) {
        editorMap.set(sub.creator.id, {
          id: sub.creator.id,
          name: sub.creator.full_name || sub.creator.username,
          username: sub.creator.username,
        });
      }
    });
    return Array.from(editorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [submissions]);

  // Check if any filters are active
  const hasActiveFilters = platformFilter !== "all" || editorFilter !== "all" || dateRange.from || dateRange.to;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const submissionId = active.id as string;
    const targetColumn = over.id as KanbanColumn;

    // Find the current submission
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;

    // Check if dropping in a different column
    const currentColumn = submission.status as KanbanColumn;
    if (currentColumn === targetColumn) return;

    // Check permissions
    const canMoveToTarget =
      (targetColumn === "pending" && canApprove) ||
      (targetColumn === "approved" && canApprove) ||
      (targetColumn === "ready_to_post" && canPost) ||
      (targetColumn === "posted" && canPost);

    if (!canMoveToTarget) {
      toast.error("You don't have permission to move videos to this stage");
      return;
    }

    moveToColumn(submissionId, targetColumn);
  };

  const activeSubmission = activeId ? submissions.find(s => s.id === activeId) : null;

  useEffect(() => {
    fetchSubmissions();
  }, [boostId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("video_submissions")
        .select(`
          *,
          creator:profiles!video_submissions_creator_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("source_type", "boost")
        .eq("source_id", boostId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions((data as VideoSubmission[]) || []);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const moveToColumn = async (submissionId: string, newStatus: KanbanColumn) => {
    setUpdating(submissionId);
    try {
      const updates: Record<string, any> = {
        status: newStatus,
        status_tiktok: newStatus,
        status_instagram: newStatus,
        status_youtube: newStatus,
      };

      const { error } = await supabase
        .from("video_submissions")
        .update(updates)
        .eq("id", submissionId);

      if (error) throw error;

      const columnLabel = COLUMNS.find(c => c.id === newStatus)?.label || newStatus;
      toast.success("Moved to " + columnLabel);
      fetchSubmissions();
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to move video");
    } finally {
      setUpdating(null);
    }
  };

  const rejectSubmission = async (submissionId: string) => {
    setUpdating(submissionId);
    try {
      const { error } = await supabase
        .from("video_submissions")
        .update({
          status: "rejected",
          status_tiktok: "rejected",
          status_instagram: "rejected",
          status_youtube: "rejected",
        })
        .eq("id", submissionId);

      if (error) throw error;

      toast.success("Video rejected");
      fetchSubmissions();
    } catch (err) {
      console.error("Error rejecting:", err);
      toast.error("Failed to reject video");
    } finally {
      setUpdating(null);
    }
  };

  const openDrawer = (submission: VideoSubmission) => {
    setDrawerSubmission(submission);
    setDrawerOpen(true);
  };

  const openMarkAsPosted = (submission: VideoSubmission) => {
    setMarkAsPostedSubmission(submission);
    setMarkAsPostedOpen(true);
  };

  const handleMarkAsPosted = async (urls: { tiktok?: string; instagram?: string; youtube?: string }) => {
    if (!markAsPostedSubmission) return;

    setUpdating(markAsPostedSubmission.id);
    try {
      const updates: Record<string, any> = {};

      // Update status and URL for each platform that has a URL provided
      if (urls.tiktok) {
        updates.status_tiktok = "posted";
        updates.posted_url_tiktok = urls.tiktok;
      }
      if (urls.instagram) {
        updates.status_instagram = "posted";
        updates.posted_url_instagram = urls.instagram;
      }
      if (urls.youtube) {
        updates.status_youtube = "posted";
        updates.posted_url_youtube = urls.youtube;
      }

      // Check if all platforms are now posted - if so, update overall status
      const currentSubmission = markAsPostedSubmission;
      const newTikTokStatus = urls.tiktok ? "posted" : currentSubmission.status_tiktok;
      const newInstagramStatus = urls.instagram ? "posted" : currentSubmission.status_instagram;
      const newYoutubeStatus = urls.youtube ? "posted" : currentSubmission.status_youtube;

      const allPosted =
        (newTikTokStatus === "posted" || newTikTokStatus === "skipped" || !newTikTokStatus) &&
        (newInstagramStatus === "posted" || newInstagramStatus === "skipped" || !newInstagramStatus) &&
        (newYoutubeStatus === "posted" || newYoutubeStatus === "skipped" || !newYoutubeStatus);

      if (allPosted) {
        updates.status = "posted";
      }

      const { error } = await supabase
        .from("video_submissions")
        .update(updates)
        .eq("id", markAsPostedSubmission.id);

      if (error) throw error;

      toast.success("Video marked as posted");
      setMarkAsPostedOpen(false);
      setMarkAsPostedSubmission(null);
      fetchSubmissions();

      // Also update drawer if open
      if (drawerSubmission?.id === markAsPostedSubmission.id) {
        setDrawerSubmission(null);
        setDrawerOpen(false);
      }
    } catch (err) {
      console.error("Error marking as posted:", err);
      toast.error("Failed to mark as posted");
      throw err;
    } finally {
      setUpdating(null);
    }
  };

  const updateFeedback = async () => {
    if (!selectedSubmission) return;

    try {
      const { error } = await supabase
        .from("video_submissions")
        .update({ feedback: feedbackText })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      toast.success("Feedback saved");
      setFeedbackDialogOpen(false);
      setSelectedSubmission(null);
      setFeedbackText("");
      fetchSubmissions();
    } catch (err) {
      console.error("Error saving feedback:", err);
      toast.error("Failed to save feedback");
    }
  };

  const updateCaption = async () => {
    if (!selectedSubmission) return;

    // Check if any platform is already posted
    const isAnyPosted =
      selectedSubmission.status_tiktok === "posted" ||
      selectedSubmission.status_instagram === "posted" ||
      selectedSubmission.status_youtube === "posted";

    if (isAnyPosted) {
      toast.error("Cannot edit caption after video has been posted");
      return;
    }

    try {
      const { error } = await supabase
        .from("video_submissions")
        .update({
          caption: captionText,
          caption_edited_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      toast.success("Caption updated");
      setCaptionDialogOpen(false);
      setSelectedSubmission(null);
      setCaptionText("");
      fetchSubmissions();

      // Update drawer if open
      if (drawerSubmission?.id === selectedSubmission.id) {
        setDrawerSubmission({
          ...drawerSubmission,
          caption: captionText,
          caption_edited_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Error updating caption:", err);
      toast.error("Failed to update caption");
    }
  };

  // Check if caption can be edited (not posted to any platform)
  const canEditCaption = (submission: VideoSubmission) => {
    return (
      submission.status_tiktok !== "posted" &&
      submission.status_instagram !== "posted" &&
      submission.status_youtube !== "posted"
    );
  };

  // Filter submissions based on search, platform, editor, and date range
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          sub.caption?.toLowerCase().includes(query) ||
          sub.creator?.username?.toLowerCase().includes(query) ||
          sub.creator?.full_name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Platform filter
      if (platformFilter !== "all") {
        const platformStatusKey = `status_${platformFilter}` as keyof VideoSubmission;
        const platformStatus = sub[platformStatusKey] as string | null;
        // Only show submissions that have this platform active (not null/skipped)
        if (!platformStatus || platformStatus === "skipped") {
          return false;
        }
      }

      // Editor filter
      if (editorFilter !== "all") {
        if (sub.creator_id !== editorFilter) {
          return false;
        }
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const submissionDate = new Date(sub.created_at);
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(submissionDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          })) {
            return false;
          }
        } else if (dateRange.from) {
          if (submissionDate < startOfDay(dateRange.from)) {
            return false;
          }
        } else if (dateRange.to) {
          if (submissionDate > endOfDay(dateRange.to)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [submissions, searchQuery, platformFilter, editorFilter, dateRange]);

  // Group submissions by status for kanban columns
  const getSubmissionsByStatus = (status: KanbanColumn): VideoSubmission[] => {
    return filteredSubmissions.filter((sub) => {
      if (status === "ready_to_post") {
        return sub.status === "ready_to_post" ||
               (sub.status !== "pending" && sub.status !== "approved" && sub.status !== "posted" && sub.status !== "rejected" &&
                (sub.status_tiktok === "ready_to_post" || sub.status_instagram === "ready_to_post" || sub.status_youtube === "ready_to_post"));
      }
      if (status === "posted") {
        return sub.status === "posted" ||
               (sub.status !== "pending" && sub.status !== "approved" && sub.status !== "ready_to_post" && sub.status !== "rejected" &&
                (sub.status_tiktok === "posted" || sub.status_instagram === "posted" || sub.status_youtube === "posted"));
      }
      return sub.status === status;
    });
  };

  const getPlatformIndicators = (submission: VideoSubmission) => {
    const platforms: { platform: keyof typeof PLATFORM_CONFIG; status: string }[] = [];
    if (submission.status_tiktok && submission.status_tiktok !== "skipped") {
      platforms.push({ platform: "tiktok", status: submission.status_tiktok });
    }
    if (submission.status_instagram && submission.status_instagram !== "skipped") {
      platforms.push({ platform: "instagram", status: submission.status_instagram });
    }
    if (submission.status_youtube && submission.status_youtube !== "skipped") {
      platforms.push({ platform: "youtube", status: submission.status_youtube });
    }
    return platforms;
  };

  const getNextColumn = (currentStatus: KanbanColumn): KanbanColumn | null => {
    const order: KanbanColumn[] = ["pending", "approved", "ready_to_post", "posted"];
    const currentIndex = order.indexOf(currentStatus);
    if (currentIndex < order.length - 1) {
      return order[currentIndex + 1];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Clear all filters
  const clearFilters = () => {
    setPlatformFilter("all");
    setEditorFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Platform Filter */}
        <Select value={platformFilter} onValueChange={(v: "all" | "tiktok" | "instagram" | "youtube") => setPlatformFilter(v)}>
          <SelectTrigger className="w-[130px] h-8 bg-muted/30 border-border/50 text-xs font-inter">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Platforms</SelectItem>
            <SelectItem value="tiktok" className="text-xs">
              <div className="flex items-center gap-2">
                <Icon icon="logos:tiktok-icon" className="w-3 h-3" />
                TikTok
              </div>
            </SelectItem>
            <SelectItem value="instagram" className="text-xs">
              <div className="flex items-center gap-2">
                <Icon icon="skill-icons:instagram" className="w-3 h-3" />
                Instagram
              </div>
            </SelectItem>
            <SelectItem value="youtube" className="text-xs">
              <div className="flex items-center gap-2">
                <Icon icon="logos:youtube-icon" className="w-3 h-3" />
                YouTube
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Editor Filter */}
        <Select value={editorFilter} onValueChange={setEditorFilter}>
          <SelectTrigger className="w-[150px] h-8 bg-muted/30 border-border/50 text-xs font-inter">
            <SelectValue placeholder="Editor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Editors</SelectItem>
            {uniqueEditors.map((editor) => (
              <SelectItem key={editor.id} value={editor.id} className="text-xs">
                {editor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-3 text-xs font-inter gap-2 bg-muted/30 border-border/50",
                (dateRange.from || dateRange.to) && "text-primary border-primary/50"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                  </>
                ) : (
                  format(dateRange.from, "MMM d, yyyy")
                )
              ) : (
                "Date Range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
              className="rounded-md border"
            />
            {(dateRange.from || dateRange.to) && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setDateRange({ from: undefined, to: undefined })}
                >
                  Clear dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={clearFilters}
          >
            <X className="w-3 h-3" />
            Clear
          </Button>
        )}

        {/* Filter Count */}
        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground font-inter ml-auto">
            {filteredSubmissions.length} of {submissions.length} submissions
          </span>
        )}
      </div>

      {/* Kanban Board with Drag & Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="grid grid-cols-4 gap-3 min-w-[800px] h-full">
            {COLUMNS.map((column) => {
              const columnSubmissions = getSubmissionsByStatus(column.id);

              return (
                <div key={column.id} className="flex flex-col min-h-0">
                  {/* Column Header */}
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg mb-2",
                    column.headerBg
                  )}>
                    <span className={cn("w-2 h-2 rounded-full shrink-0", column.dotColor)} />
                    <span className="text-xs font-medium font-inter tracking-[-0.2px] text-foreground">
                      {column.label}
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground font-inter tabular-nums">
                      {columnSubmissions.length}
                    </span>
                  </div>

                  {/* Droppable Column Content */}
                  <DroppableColumn column={column}>
                    {columnSubmissions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-3 border border-dashed border-border/40 rounded-lg bg-muted/10 h-full min-h-[180px]">
                        <Video className="w-5 h-5 text-muted-foreground/40 mb-2" />
                        <p className="text-[11px] text-muted-foreground/60 font-inter text-center">
                          No videos
                        </p>
                      </div>
                    ) : (
                      columnSubmissions.map((submission) => (
                        <DraggableCard
                          key={submission.id}
                          submission={submission}
                          columnId={column.id}
                          updating={updating}
                          canApprove={canApprove}
                          canPost={canPost}
                          onMoveToColumn={moveToColumn}
                          onReject={rejectSubmission}
                          onOpenFeedback={(sub) => {
                            setSelectedSubmission(sub);
                            setFeedbackText(sub.feedback || "");
                            setFeedbackDialogOpen(true);
                          }}
                          onOpenDrawer={openDrawer}
                          getPlatformIndicators={getPlatformIndicators}
                          getNextColumn={getNextColumn}
                        />
                      ))
                    )}
                  </DroppableColumn>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeSubmission ? (
            <div className="rounded-lg border border-primary/50 bg-card shadow-xl opacity-90 w-[200px]">
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 rounded-md border border-border/30 shrink-0">
                    <AvatarImage src={activeSubmission.creator?.avatar_url || undefined} />
                    <AvatarFallback className="rounded-md bg-muted text-[9px] font-medium">
                      {activeSubmission.creator?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-xs font-inter tracking-[-0.2px] text-foreground truncate">
                    {activeSubmission.creator?.full_name || activeSubmission.creator?.username || "Unknown"}
                  </p>
                </div>
                {activeSubmission.caption && (
                  <p className="text-[10px] text-foreground/70 font-inter line-clamp-1 mt-2">
                    {activeSubmission.caption}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-geist tracking-[-0.5px]">
              {selectedSubmission?.feedback ? "Edit Feedback" : "Add Feedback"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Enter feedback for the creator..."
              rows={4}
              className="font-inter text-sm resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setFeedbackDialogOpen(false)}
              className="font-inter"
            >
              Cancel
            </Button>
            <Button
              onClick={updateFeedback}
              className="font-inter"
            >
              Save Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Caption Edit Dialog */}
      <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-geist tracking-[-0.5px]">
              {selectedSubmission?.caption ? "Edit Caption" : "Add Caption"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Textarea
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              placeholder="Enter the caption for this video..."
              rows={6}
              className="font-inter text-sm resize-none"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{captionText.length} characters</span>
              {selectedSubmission?.caption_edited_at && (
                <span>
                  Last edited {formatDistanceToNow(new Date(selectedSubmission.caption_edited_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setCaptionDialogOpen(false)}
              className="font-inter"
            >
              Cancel
            </Button>
            <Button
              onClick={updateCaption}
              className="font-inter"
            >
              Save Caption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle className="font-geist tracking-[-0.5px]">Video Details</SheetTitle>
          </SheetHeader>

          {drawerSubmission && (
            <div className="py-4 space-y-5">
              {/* Creator Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 rounded-lg border border-border/30">
                  <AvatarImage src={drawerSubmission.creator?.avatar_url || undefined} />
                  <AvatarFallback className="rounded-lg bg-muted text-sm font-medium">
                    {drawerSubmission.creator?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm font-inter tracking-[-0.3px] text-foreground">
                    {drawerSubmission.creator?.full_name || drawerSubmission.creator?.username || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground font-inter">
                    @{drawerSubmission.creator?.username || "unknown"}
                  </p>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-semibold font-inter",
                  drawerSubmission.status === "pending" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  drawerSubmission.status === "approved" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  drawerSubmission.status === "ready_to_post" && "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                  drawerSubmission.status === "posted" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}>
                  {drawerSubmission.status === "ready_to_post" ? "Ready to Post" : drawerSubmission.status.charAt(0).toUpperCase() + drawerSubmission.status.slice(1)}
                </span>
              </div>

              {/* Submission Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide mb-1">Submitted</p>
                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">
                    {formatDistanceToNow(new Date(drawerSubmission.created_at), { addSuffix: true })}
                  </p>
                </div>
                {drawerSubmission.duration_seconds && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide mb-1">Duration</p>
                    <p className="text-sm font-medium font-inter tracking-[-0.3px]">
                      {Math.floor(drawerSubmission.duration_seconds / 60)}:{(drawerSubmission.duration_seconds % 60).toString().padStart(2, "0")}
                    </p>
                  </div>
                )}
              </div>

              {/* Platforms with Status */}
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide mb-2">Platform Status</p>
                <div className="space-y-2">
                  {getPlatformIndicators(drawerSubmission).map(({ platform, status }) => {
                    const statusLabel = status === "ready_to_post" ? "Ready to Post" : status.charAt(0).toUpperCase() + status.slice(1);
                    const postedUrlKey = `posted_url_${platform}` as keyof VideoSubmission;
                    const postedUrl = drawerSubmission[postedUrlKey] as string | null;
                    return (
                      <div
                        key={platform}
                        className="px-3 py-2 rounded-lg bg-muted/30 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon icon={PLATFORM_CONFIG[platform].icon} className="w-4 h-4" />
                            <span className="text-sm font-medium font-inter tracking-[-0.3px]">
                              {platform === "tiktok" ? "TikTok" : platform === "instagram" ? "Instagram" : "YouTube"}
                            </span>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold font-inter",
                            status === "pending" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            status === "approved" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                            status === "ready_to_post" && "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                            status === "posted" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            status === "rejected" && "bg-red-500/10 text-red-600 dark:text-red-400"
                          )}>
                            {statusLabel}
                          </span>
                        </div>
                        {postedUrl && (
                          <a
                            href={postedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-inter truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{postedUrl}</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Caption</p>
                  {canEditCaption(drawerSubmission) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                      onClick={() => {
                        setSelectedSubmission(drawerSubmission);
                        setCaptionText(drawerSubmission.caption || "");
                        setCaptionDialogOpen(true);
                      }}
                    >
                      <Icon icon="lucide:pencil" className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {cleanCaption(drawerSubmission.caption) ? (
                  <div className="space-y-1.5">
                    <p className="text-sm text-foreground font-inter leading-relaxed bg-muted/20 rounded-lg p-3">
                      {cleanCaption(drawerSubmission.caption)}
                    </p>
                    {drawerSubmission.caption_edited_at && (
                      <p className="text-[10px] text-muted-foreground font-inter">
                        Last edited {formatDistanceToNow(new Date(drawerSubmission.caption_edited_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground font-inter bg-muted/10 rounded-lg p-3 border border-dashed border-border/40">
                    No caption provided
                    {canEditCaption(drawerSubmission) && (
                      <button
                        className="ml-1 text-primary hover:underline"
                        onClick={() => {
                          setSelectedSubmission(drawerSubmission);
                          setCaptionText("");
                          setCaptionDialogOpen(true);
                        }}
                      >
                        Add one
                      </button>
                    )}
                  </div>
                )}
                {!canEditCaption(drawerSubmission) && (
                  <p className="text-[10px] text-muted-foreground/70 font-inter mt-1.5 flex items-center gap-1">
                    <Icon icon="lucide:lock" className="w-3 h-3" />
                    Caption locked (video has been posted)
                  </p>
                )}
              </div>

              {/* Submission Notes */}
              {cleanCaption(drawerSubmission.submission_notes) && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide mb-2">Creator Notes</p>
                  <p className="text-sm text-foreground font-inter leading-relaxed bg-muted/20 rounded-lg p-3">
                    {cleanCaption(drawerSubmission.submission_notes)}
                  </p>
                </div>
              )}

              {/* Feedback */}
              {drawerSubmission.feedback && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide mb-2">Feedback</p>
                  <p className="text-sm text-foreground font-inter leading-relaxed bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                    {drawerSubmission.feedback}
                  </p>
                </div>
              )}

              {/* Account Manager Notes */}
              {drawerSubmission.account_manager_notes && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide mb-2">Internal Notes</p>
                  <p className="text-sm text-foreground font-inter leading-relaxed bg-muted/20 rounded-lg p-3">
                    {drawerSubmission.account_manager_notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-border/50 space-y-2">
                {drawerSubmission.gdrive_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full justify-start gap-2 font-inter"
                  >
                    <a href={drawerSubmission.gdrive_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Open in Google Drive
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSubmission(drawerSubmission);
                    setFeedbackText(drawerSubmission.feedback || "");
                    setFeedbackDialogOpen(true);
                  }}
                  className="w-full justify-start gap-2 font-inter"
                >
                  <MessageSquare className="w-4 h-4" />
                  {drawerSubmission.feedback ? "Edit Feedback" : "Add Feedback"}
                </Button>

                {/* Mark as Posted Button - show if any platform is ready to post */}
                {canPost && getPlatformIndicators(drawerSubmission).some(
                  p => p.status === "ready_to_post" || p.status === "approved"
                ) && (
                  <Button
                    size="sm"
                    onClick={() => openMarkAsPosted(drawerSubmission)}
                    className="w-full justify-start gap-2 font-inter bg-emerald-600 hover:bg-emerald-700 border-t-emerald-500"
                  >
                    <Icon icon="lucide:check-circle-2" className="w-4 h-4" />
                    Mark as Posted
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Mark as Posted Dialog */}
      {markAsPostedSubmission && (
        <MarkAsPostedDialog
          open={markAsPostedOpen}
          onOpenChange={setMarkAsPostedOpen}
          platforms={getPlatformIndicators(markAsPostedSubmission).map(p => ({
            key: p.platform,
            status: p.status,
          }))}
          onSubmit={handleMarkAsPosted}
          submissionCaption={markAsPostedSubmission.caption}
        />
      )}
    </div>
  );
}
