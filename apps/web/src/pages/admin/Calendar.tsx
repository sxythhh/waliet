import { useState } from "react";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import {
  ToolsProvider,
  useToolsWorkspace,
  useToolsEvents,
} from "@/components/tools/contexts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GoogleCalendarConnect } from "@/components/tools/GoogleCalendarConnect";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  Add,
  CalendarMonth,
} from "@mui/icons-material";

function CalendarView() {
  const { events, isLoading, addEvent, getEventsForDate, refreshEvents } = useToolsEvents();
  const { currentWorkspace, isGoogleCalendarConnected, refreshWorkspace } = useToolsWorkspace();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", start_time: "", end_time: "" });

  const handleGoogleCalendarSuccess = () => {
    refreshWorkspace();
    refreshEvents();
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad with days from previous/next month
  const startDay = monthStart.getDay();
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.start_time) {
      toast.error("Please fill in required fields");
      return;
    }

    await addEvent({
      title: newEvent.title,
      description: newEvent.description,
      start_time: newEvent.start_time,
      end_time: newEvent.end_time || newEvent.start_time,
      all_day: false,
    });

    setNewEvent({ title: "", description: "", start_time: "", end_time: "" });
    setIsAddEventOpen(false);
    toast.success("Event created");
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft sx={{ fontSize: 18 }} />
          </Button>
          <h2 className="text-xl font-semibold font-inter tracking-[-0.5px] text-white">{format(currentDate, "MMMM yyyy")}</h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight sx={{ fontSize: 18 }} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {currentWorkspace && (
            <GoogleCalendarConnect
              workspaceId={currentWorkspace.id}
              isConnected={isGoogleCalendarConnected}
              calendarName={currentWorkspace.google_calendar_name}
              connectedAt={currentWorkspace.google_connected_at}
              onSuccess={handleGoogleCalendarSuccess}
            />
          )}
          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <Add sx={{ fontSize: 18 }} className="mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Event</DialogTitle>
              <DialogDescription>Create a new calendar event</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>Cancel</Button>
              <Button onClick={handleAddEvent}>Create Event</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-white/40 py-2 font-inter">
                    {day}
                  </div>
                ))}
                {paddedDays.map((day, index) => {
                  const dayEvents = day ? getEventsForDate(day) : [];
                  const isSelected = day && selectedDate && isSameDay(day, selectedDate);
                  const isToday = day && isSameDay(day, new Date());

                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[80px] p-1 border border-white/[0.06] rounded-lg cursor-pointer transition-colors",
                        day && isSameMonth(day, currentDate) ? "bg-white/[0.02]" : "bg-white/[0.01]",
                        isSelected && "ring-2 ring-primary",
                        isToday && "bg-primary/10",
                        day && "hover:bg-white/[0.05]"
                      )}
                      onClick={() => day && setSelectedDate(day)}
                    >
                      {day && (
                        <>
                          <div className={cn(
                            "text-sm font-medium font-inter",
                            isToday ? "text-primary" : "text-white/70"
                          )}>
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1 mt-1">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                className="text-xs bg-primary/20 rounded px-1 truncate text-white/80"
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-white/40">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Day Events */}
        <div className="lg:col-span-1">
          <Card className="h-full bg-white/[0.02] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-lg font-inter tracking-[-0.5px] text-white">
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map(event => (
                      <div key={event.id} className="p-3 bg-white/[0.03] rounded-lg">
                        <p className="font-medium text-white font-inter">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-white/50 mt-1 font-inter">{event.description}</p>
                        )}
                        <p className="text-xs text-white/40 mt-2 font-inter">
                          {format(new Date(event.start_time), "h:mm a")}
                          {event.end_time && ` - ${format(new Date(event.end_time), "h:mm a")}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/50 text-sm font-inter">No events for this day</p>
                )
              ) : (
                <p className="text-white/50 text-sm font-inter">Click a day to see events</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CalendarContent() {
  const { currentWorkspace, isLoading } = useToolsWorkspace();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <Card className="max-w-md mx-auto mt-8 bg-white/[0.02] border-white/[0.06]">
        <CardContent className="py-12 text-center">
          <CalendarMonth className="text-white/20 mx-auto mb-4" sx={{ fontSize: 48 }} />
          <p className="text-white/50 font-inter">Failed to initialize calendar. Please refresh.</p>
        </CardContent>
      </Card>
    );
  }

  return <CalendarView />;
}

export default function Calendar() {
  return (
    <AdminPermissionGuard resource="tools">
      <div className="p-6">
        <ToolsProvider>
          <CalendarContent />
        </ToolsProvider>
      </div>
    </AdminPermissionGuard>
  );
}
