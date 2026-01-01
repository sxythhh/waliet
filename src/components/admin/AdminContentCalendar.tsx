import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, ChevronLeft, ChevronRight, Megaphone, Video, Clock, Building2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "broadcast" | "slot" | "video_due";
  status?: string;
  brandName?: string;
  brandLogo?: string;
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

export function AdminContentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const calendarEvents: CalendarEvent[] = [];

      // Fetch all scheduled broadcasts across all brands
      const { data: broadcasts } = await supabase
        .from("brand_broadcasts")
        .select(`
          id,
          title,
          scheduled_at,
          sent_at,
          status,
          brand:brands(name, logo_url)
        `);

      broadcasts?.forEach((broadcast: any) => {
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
              brandName: broadcast.brand?.name,
              brandLogo: broadcast.brand?.logo_url,
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
      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.3px]">Content Calendar</h2>
            <p className="text-sm text-muted-foreground">
              All scheduled broadcasts across brands
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {events.length} events this month
          </Badge>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3 rounded-xl border border-border/30 bg-background overflow-hidden">
            {/* Month Navigation */}
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-muted/10">
              <h3 className="text-base font-semibold tracking-[-0.3px]">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium rounded-full"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3">
              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const today = isToday(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[80px] p-1.5 rounded-lg cursor-pointer transition-all duration-200",
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
                            "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                            today && "bg-primary text-primary-foreground",
                            !today && !isCurrentMonth && "text-muted-foreground"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded text-white truncate flex items-center gap-1",
                                getEventColor(event.type, event.status)
                              )}
                            >
                              {getEventIcon(event.type)}
                              <span className="truncate font-medium">{event.title}</span>
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[9px] text-muted-foreground font-medium px-1.5">
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
          <div className="rounded-xl border border-border/30 bg-background overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-muted/10">
              <h3 className="font-semibold text-sm">
                {selectedDate ? format(selectedDate, "EEE, MMM d") : "Select a date"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ScrollArea className="h-[350px]">
              <div className="p-3">
                {selectedDateEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                      <Calendar className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                      No events scheduled
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-2.5 rounded-lg bg-muted/20 border border-border/20 hover:border-border/40 transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            "p-1.5 rounded-md text-white",
                            getEventColor(event.type, event.status)
                          )}>
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{event.title}</p>
                            {event.brandName && (
                              <div className="flex items-center gap-1 mt-1">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {event.brandName}
                                </span>
                              </div>
                            )}
                            {event.status && (
                              <Badge variant="outline" className="mt-1.5 text-[9px] rounded-full h-4">
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
    </div>
  );
}
