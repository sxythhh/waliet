import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Megaphone, FileText, Video, Clock, Plus, CalendarDays, Check, X, MoreHorizontal, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, parseISO, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ContentCalendarProps {
  brandId: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "broadcast" | "slot" | "video_due";
  status?: string;
  metadata?: Record<string, any>;
}

interface ContentSlot {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  platform: string | null;
  status: string;
  proposed_by: string;
  creator?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Creator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X (Twitter)" },
];

const SLOT_STATUS_COLORS: Record<string, string> = {
  proposed: "bg-amber-500",
  confirmed: "bg-blue-500",
  completed: "bg-green-500",
  missed: "bg-red-500",
  rescheduled: "bg-purple-500",
  cancelled: "bg-muted",
};

export function ContentCalendar({ brandId }: ContentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);

  // Form state for proposing new slot
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [slotTitle, setSlotTitle] = useState("");
  const [slotDescription, setSlotDescription] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("12:00");
  const [slotPlatform, setSlotPlatform] = useState("");

  useEffect(() => {
    fetchEvents();
    fetchCreators();
  }, [brandId, currentMonth]);

  const fetchCreators = async () => {
    const { data } = await supabase
      .from("campaign_participants")
      .select(`
        user_id,
        profiles:user_id(id, username, full_name, avatar_url)
      `)
      .eq("brand_id", brandId)
      .eq("status", "accepted");

    const uniqueCreators = new Map();
    data?.forEach((p: any) => {
      if (p.profiles && !uniqueCreators.has(p.profiles.id)) {
        uniqueCreators.set(p.profiles.id, p.profiles);
      }
    });
    setCreators(Array.from(uniqueCreators.values()));
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const calendarEvents: CalendarEvent[] = [];

      // Fetch scheduled broadcasts
      const { data: broadcasts } = await supabase
        .from("brand_broadcasts")
        .select("id, title, scheduled_for, sent_at, status")
        .eq("brand_id", brandId)
        .or(`scheduled_for.gte.${monthStart.toISOString()},sent_at.gte.${monthStart.toISOString()}`)
        .or(`scheduled_for.lte.${monthEnd.toISOString()},sent_at.lte.${monthEnd.toISOString()}`);

      broadcasts?.forEach((broadcast) => {
        const date = broadcast.scheduled_for || broadcast.sent_at;
        if (date) {
          calendarEvents.push({
            id: broadcast.id,
            title: broadcast.title,
            date: parseISO(date),
            type: "broadcast",
            status: broadcast.status,
            metadata: { sent_at: broadcast.sent_at }
          });
        }
      });

      // Fetch content slots
      const { data: slotsData } = await supabase
        .from("content_slots")
        .select(`
          *,
          creator:creator_id(username, full_name, avatar_url)
        `)
        .eq("brand_id", brandId)
        .gte("scheduled_date", monthStart.toISOString().split("T")[0])
        .lte("scheduled_date", monthEnd.toISOString().split("T")[0])
        .order("scheduled_date");

      setSlots((slotsData || []) as ContentSlot[]);

      slotsData?.forEach((slot: any) => {
        calendarEvents.push({
          id: slot.id,
          title: slot.title,
          date: parseISO(slot.scheduled_date),
          type: "slot",
          status: slot.status,
          metadata: {
            creator: slot.creator?.full_name || slot.creator?.username,
            platform: slot.platform,
            proposed_by: slot.proposed_by,
            description: slot.description,
          }
        });
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const getEventColor = (type: CalendarEvent["type"], status?: string) => {
    if (type === "slot" && status) {
      return SLOT_STATUS_COLORS[status] || "bg-muted";
    }
    switch (type) {
      case "broadcast":
        return "bg-blue-500";
      case "video_due":
        return "bg-amber-500";
      default:
        return "bg-muted";
    }
  };

  const getEventIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "broadcast":
        return <Megaphone className="h-3 w-3" />;
      case "slot":
        return <Video className="h-3 w-3" />;
      case "video_due":
        return <Clock className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  const handleProposeSlot = async () => {
    if (!selectedCreatorId || !slotTitle || !slotDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("content_slots")
        .insert({
          brand_id: brandId,
          creator_id: selectedCreatorId,
          title: slotTitle,
          description: slotDescription || null,
          scheduled_date: slotDate,
          scheduled_time: slotTime || null,
          platform: slotPlatform || null,
          status: "proposed",
          proposed_by: "brand",
        });

      if (error) throw error;

      toast.success("Content slot proposed");
      setProposeDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      console.error("Error proposing slot:", error);
      toast.error(error.message || "Failed to propose slot");
    }
  };

  const handleSlotAction = async (slotId: string, action: "confirm" | "complete" | "miss" | "cancel") => {
    const statusMap = {
      confirm: "confirmed",
      complete: "completed",
      miss: "missed",
      cancel: "cancelled",
    };

    try {
      const updates: any = { status: statusMap[action] };
      if (action === "confirm") {
        updates.confirmed_at = new Date().toISOString();
      } else if (action === "complete") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("content_slots")
        .update(updates)
        .eq("id", slotId);

      if (error) throw error;

      toast.success(`Slot ${statusMap[action]}`);
      fetchEvents();
    } catch (error) {
      console.error("Error updating slot:", error);
      toast.error("Failed to update slot");
    }
  };

  const resetForm = () => {
    setSelectedCreatorId("");
    setSlotTitle("");
    setSlotDescription("");
    setSlotDate("");
    setSlotTime("12:00");
    setSlotPlatform("");
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const pendingSlots = slots.filter(s => s.status === "proposed").length;
  const confirmedSlots = slots.filter(s => s.status === "confirmed").length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.5px]">Content Calendar</h2>
            <p className="text-sm text-muted-foreground">
              Schedule and track content with creators
            </p>
          </div>
        </div>
        <Button onClick={() => setProposeDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Propose Slot
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Pending Approval</div>
          <p className="text-xl font-bold text-amber-500">{pendingSlots}</p>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Confirmed</div>
          <p className="text-xl font-bold text-blue-500">{confirmedSlots}</p>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Completed This Month</div>
          <p className="text-xl font-bold text-green-500">
            {slots.filter(s => s.status === "completed").length}
          </p>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Missed</div>
          <p className="text-xl font-bold text-red-500">
            {slots.filter(s => s.status === "missed").length}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {calendarDays.map((day, index) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[80px] p-1.5 bg-background cursor-pointer transition-colors hover:bg-muted/30",
                      !isCurrentMonth && "bg-muted/20",
                      isSelected && "ring-2 ring-primary ring-inset",
                      isToday(day) && "bg-primary/5"
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="flex flex-col h-full">
                      <span
                        className={cn(
                          "text-xs font-medium mb-1",
                          !isCurrentMonth && "text-muted-foreground",
                          isToday(day) && "text-primary font-semibold"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="flex-1 space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded text-white truncate flex items-center gap-1",
                              getEventColor(event.type, event.status)
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                          >
                            {getEventIcon(event.type)}
                            <span className="truncate">{event.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar - Selected Date Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
            </CardTitle>
            <CardDescription>
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {selectedDateEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No events scheduled
                  </p>
                  {selectedDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSlotDate(format(selectedDate, "yyyy-MM-dd"));
                        setProposeDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add slot
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              "p-1.5 rounded text-white",
                              getEventColor(event.type, event.status)
                            )}
                          >
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            {event.metadata?.creator && (
                              <p className="text-xs text-muted-foreground">
                                {event.metadata.creator}
                              </p>
                            )}
                            {event.status && (
                              <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                                {event.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {event.type === "slot" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {event.status === "proposed" && (
                                <DropdownMenuItem onClick={() => handleSlotAction(event.id, "confirm")}>
                                  <Check className="h-4 w-4 mr-2 text-green-500" />
                                  Confirm
                                </DropdownMenuItem>
                              )}
                              {event.status === "confirmed" && (
                                <DropdownMenuItem onClick={() => handleSlotAction(event.id, "complete")}>
                                  <Check className="h-4 w-4 mr-2 text-green-500" />
                                  Mark Completed
                                </DropdownMenuItem>
                              )}
                              {(event.status === "proposed" || event.status === "confirmed") && (
                                <DropdownMenuItem onClick={() => handleSlotAction(event.id, "miss")}>
                                  <X className="h-4 w-4 mr-2 text-red-500" />
                                  Mark Missed
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleSlotAction(event.id, "cancel")}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Proposed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Missed</span>
        </div>
      </div>

      {/* Propose Slot Dialog */}
      <Dialog open={proposeDialogOpen} onOpenChange={setProposeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Propose Content Slot</DialogTitle>
            <DialogDescription>
              Propose a content posting date to a creator
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Creator</Label>
              <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select creator" />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={creator.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {creator.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {creator.full_name || creator.username}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g., Product Review Video"
                value={slotTitle}
                onChange={(e) => setSlotTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time (Optional)</Label>
                <Input
                  type="time"
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={slotPlatform} onValueChange={setSlotPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Any specific requirements or notes..."
                value={slotDescription}
                onChange={(e) => setSlotDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProposeSlot}>
              Propose Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getEventIcon(selectedEvent.type)}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-white",
                    getEventColor(selectedEvent.type, selectedEvent.status)
                  )}
                >
                  {selectedEvent.type === "slot" ? selectedEvent.status : selectedEvent.type}
                </Badge>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">
                  {format(selectedEvent.date, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              {selectedEvent.metadata && (
                <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
                  {Object.entries(selectedEvent.metadata).map(([key, value]) =>
                    value && (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
