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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Megaphone, Video, Clock, Plus, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, parseISO } from "date-fns";
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [brandId, currentMonth]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const calendarEvents: CalendarEvent[] = [];

      // Fetch scheduled broadcasts
      const { data: broadcasts } = await supabase
        .from("brand_broadcasts")
        .select("id, title, scheduled_at, sent_at, status")
        .eq("brand_id", brandId);

      broadcasts?.forEach((broadcast) => {
        const date = broadcast.scheduled_at || broadcast.sent_at;
        if (date) {
          const eventDate = parseISO(date);
          if (eventDate >= monthStart && eventDate <= monthEnd) {
            calendarEvents.push({
              id: broadcast.id,
              title: broadcast.title,
              date: eventDate,
              type: "broadcast",
              status: broadcast.status || undefined,
              metadata: { sent_at: broadcast.sent_at }
            });
          }
        }
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

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 font-inter tracking-[-0.3px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.5px]">Content Calendar</h2>
          <p className="text-sm text-muted-foreground">
            View and manage scheduled broadcasts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 rounded-2xl border border-border/50 bg-background overflow-hidden shadow-sm">
          {/* Month Navigation */}
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <h3 className="text-lg font-semibold tracking-[-0.3px]">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-muted"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-medium rounded-full"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-muted"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[90px] p-2 rounded-xl cursor-pointer transition-all duration-200",
                      !isCurrentMonth && "opacity-40",
                      isSelected && "bg-primary/10 ring-2 ring-primary/30",
                      !isSelected && "hover:bg-muted/50",
                      today && !isSelected && "bg-primary/5"
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="flex flex-col h-full">
                      <span
                        className={cn(
                          "text-sm font-medium mb-1.5 w-7 h-7 flex items-center justify-center rounded-full",
                          today && "bg-primary text-primary-foreground",
                          !today && !isCurrentMonth && "text-muted-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "text-[10px] px-2 py-1 rounded-md text-white truncate flex items-center gap-1.5 shadow-sm",
                              getEventColor(event.type, event.status)
                            )}
                          >
                            {getEventIcon(event.type)}
                            <span className="truncate font-medium">{event.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground font-medium px-2">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar - Selected Date Events */}
        <div className="rounded-2xl border border-border/50 bg-background overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
            <h3 className="font-semibold text-base">
              {selectedDate ? format(selectedDate, "EEE, MMM d") : "Select a date"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-4">
              {selectedDateEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Calendar className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No events
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Select a date to view events
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-border/60 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg text-white shadow-sm",
                          getEventColor(event.type, event.status)
                        )}>
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                            {event.type.replace("_", " ")}
                          </p>
                          {event.status && (
                            <Badge variant="outline" className="mt-2 text-[10px] rounded-full">
                              {event.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
