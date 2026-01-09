import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Video,
  Image,
  Film,
  Radio,
  Smartphone,
  FileText,
  Layers,
  Check,
  X,
  Clock,
  AlertCircle,
  Upload,
  Edit2,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Deliverable,
  DeliverableStatus,
  DeliverableContentType,
  DeliverablePlatform,
  DeliverablePriority,
  DELIVERABLE_STATUS_CONFIG,
  CONTENT_TYPE_CONFIG,
  PLATFORM_CONFIG,
  PRIORITY_CONFIG,
  calculateDaysUntilDue,
} from "@/types/deliverables";
import { cn } from "@/lib/utils";

interface DeliverableCalendarProps {
  boostId: string;
  className?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  deliverables: Deliverable[];
}

interface CreatorProfile {
  id: string;
  user_id: string;
  profile?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export function DeliverableCalendar({ boostId, className }: DeliverableCalendarProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filterCreator, setFilterCreator] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form state for creating deliverables
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content_brief: "",
    due_date: "",
    content_type: "video" as DeliverableContentType,
    platform: "" as DeliverablePlatform | "",
    priority: "normal" as DeliverablePriority,
    user_id: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get the month's date range
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Fetch deliverables for the month
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from("boost_deliverables")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("bounty_campaign_id", boostId)
        .gte("due_date", startOfMonth.toISOString().split("T")[0])
        .lte("due_date", endOfMonth.toISOString().split("T")[0])
        .order("due_date", { ascending: true });

      if (deliverablesError) throw deliverablesError;

      interface DeliverableWithProfile extends Deliverable {
        profiles?: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          username: string | null;
        };
      }

      const mappedDeliverables = (deliverablesData || []).map((d: DeliverableWithProfile) => ({
        ...d,
        creator: d.profiles,
      }));
      setDeliverables(mappedDeliverables as Deliverable[]);

      // Fetch accepted creators for this boost
      const { data: creatorsData, error: creatorsError } = await supabase
        .from("bounty_applications")
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("bounty_campaign_id", boostId)
        .eq("status", "accepted");

      if (creatorsError) throw creatorsError;

      interface ApplicationWithProfile {
        user_id: string;
        profiles?: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          username: string | null;
        };
      }

      setCreators(
        (creatorsData || []).map((c: ApplicationWithProfile) => ({
          id: c.user_id,
          user_id: c.user_id,
          profile: c.profiles,
        }))
      );
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      toast({
        title: "Error loading calendar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [boostId, currentDate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay();

    // Add days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        deliverables: [],
      });
    }

    // Add days of current month
    const today = new Date();
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split("T")[0];

      let filtered = deliverables.filter((d) => d.due_date === dateStr);
      if (filterCreator !== "all") {
        filtered = filtered.filter((d) => d.user_id === filterCreator);
      }
      if (filterStatus !== "all") {
        filtered = filtered.filter((d) => d.status === filterStatus);
      }

      days.push({
        date,
        isCurrentMonth: true,
        isToday:
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear(),
        deliverables: filtered,
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        deliverables: [],
      });
    }

    return days;
  }, [currentDate, deliverables, filterCreator, filterStatus]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getContentTypeIcon = (type: DeliverableContentType) => {
    const iconClass = "h-3 w-3";
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

  const getStatusIcon = (status: DeliverableStatus) => {
    const iconClass = "h-3 w-3";
    switch (status) {
      case "approved":
        return <Check className={iconClass} />;
      case "submitted":
        return <Upload className={iconClass} />;
      case "late":
        return <AlertCircle className={iconClass} />;
      case "in_progress":
        return <Clock className={iconClass} />;
      case "revision_requested":
        return <Edit2 className={iconClass} />;
      default:
        return null;
    }
  };

  const createDeliverable = async () => {
    if (!formData.title || !formData.due_date || !formData.user_id) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("boost_deliverables").insert({
        bounty_campaign_id: boostId,
        user_id: formData.user_id,
        title: formData.title,
        description: formData.description || null,
        content_brief: formData.content_brief || null,
        due_date: formData.due_date,
        content_type: formData.content_type,
        platform: formData.platform || null,
        priority: formData.priority,
      });

      if (error) throw error;

      toast({ title: "Deliverable created" });
      setCreateDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        content_brief: "",
        due_date: "",
        content_type: "video",
        platform: "",
        priority: "normal",
        user_id: "",
      });
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create deliverable";
      toast({
        title: "Error creating deliverable",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const updateDeliverableStatus = async (id: string, status: DeliverableStatus) => {
    try {
      const { error } = await supabase
        .from("boost_deliverables")
        .update({
          status,
          reviewed_at: ["approved", "revision_requested"].includes(status)
            ? new Date().toISOString()
            : null,
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: `Status updated to ${DELIVERABLE_STATUS_CONFIG[status].label}` });
      fetchData();
      setDetailDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-inter tracking-[-0.5px] flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Content Calendar
          </CardTitle>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Deliverable
          </Button>
        </div>

        {/* Month Navigation & Filters */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {monthName}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterCreator} onValueChange={setFilterCreator}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="All creators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All creators</SelectItem>
                {creators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || c.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {Object.entries(DELIVERABLE_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={cn(
                "bg-background min-h-[100px] p-1",
                !day.isCurrentMonth && "bg-muted/30",
                day.isToday && "ring-2 ring-primary ring-inset"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium mb-1",
                  !day.isCurrentMonth && "text-muted-foreground",
                  day.isToday && "text-primary"
                )}
              >
                {day.date.getDate()}
              </div>

              {/* Deliverables for this day */}
              <div className="space-y-1">
                {day.deliverables.slice(0, 3).map((d) => {
                  const statusConfig = DELIVERABLE_STATUS_CONFIG[d.status];
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDeliverable(d);
                        setDetailDialogOpen(true);
                      }}
                      className={cn(
                        "w-full text-left p-1 rounded text-[10px] truncate flex items-center gap-1",
                        "hover:opacity-80 transition-opacity"
                      )}
                      style={{
                        backgroundColor: statusConfig.bgColor,
                        color: statusConfig.color,
                      }}
                    >
                      {getContentTypeIcon(d.content_type)}
                      <span className="truncate flex-1">{d.title}</span>
                      {getStatusIcon(d.status)}
                    </button>
                  );
                })}
                {day.deliverables.length > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center">
                    +{day.deliverables.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          {Object.entries(DELIVERABLE_STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: config.bgColor }}
              />
              <span className="text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Create Deliverable Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Deliverable</DialogTitle>
            <DialogDescription>
              Assign a new content deliverable to a creator
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Creator *</Label>
              <Select
                value={formData.user_id}
                onValueChange={(v) => setFormData({ ...formData, user_id: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select creator" />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={c.avatar_url} />
                          <AvatarFallback>{c.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {c.full_name || c.username}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Product Review Video"
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Due Date *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Content Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(v: DeliverableContentType) =>
                    setFormData({ ...formData, content_type: v })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v: DeliverablePlatform) =>
                    setFormData({ ...formData, platform: v })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v: DeliverablePriority) =>
                    setFormData({ ...formData, priority: v })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Content Brief</Label>
              <Textarea
                value={formData.content_brief}
                onChange={(e) =>
                  setFormData({ ...formData, content_brief: e.target.value })
                }
                placeholder="Detailed instructions for the creator..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDeliverable}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliverable Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedDeliverable && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {getContentTypeIcon(selectedDeliverable.content_type)}
                      {selectedDeliverable.title}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Due {new Date(selectedDeliverable.due_date).toLocaleDateString()}
                    </DialogDescription>
                  </div>
                  <Badge
                    style={{
                      backgroundColor:
                        DELIVERABLE_STATUS_CONFIG[selectedDeliverable.status].bgColor,
                      color: DELIVERABLE_STATUS_CONFIG[selectedDeliverable.status].color,
                    }}
                  >
                    {DELIVERABLE_STATUS_CONFIG[selectedDeliverable.status].label}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Creator */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedDeliverable.creator?.avatar_url} />
                    <AvatarFallback>
                      {selectedDeliverable.creator?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {selectedDeliverable.creator?.full_name ||
                        selectedDeliverable.creator?.username}
                    </p>
                    <p className="text-xs text-muted-foreground">Creator</p>
                  </div>
                </div>

                {/* Details */}
                {selectedDeliverable.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedDeliverable.description}</p>
                  </div>
                )}

                {selectedDeliverable.content_brief && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Content Brief</p>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedDeliverable.content_brief}
                    </p>
                  </div>
                )}

                {/* Platform & Priority */}
                <div className="flex gap-2">
                  {selectedDeliverable.platform && (
                    <Badge variant="secondary">
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
                    {PRIORITY_CONFIG[selectedDeliverable.priority].label} Priority
                  </Badge>
                </div>

                {/* Submission link */}
                {selectedDeliverable.submission_id && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">Submission</p>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={selectedDeliverable.submission?.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Submission
                      </a>
                    </Button>
                  </div>
                )}

                {/* Revision notes */}
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
              </div>

              {/* Actions */}
              {selectedDeliverable.status === "submitted" && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateDeliverableStatus(
                        selectedDeliverable.id,
                        "revision_requested"
                      )
                    }
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Request Revision
                  </Button>
                  <Button
                    onClick={() =>
                      updateDeliverableStatus(selectedDeliverable.id, "approved")
                    }
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </DialogFooter>
              )}

              {selectedDeliverable.status === "scheduled" && (
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      updateDeliverableStatus(selectedDeliverable.id, "cancelled")
                    }
                  >
                    Cancel Deliverable
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
