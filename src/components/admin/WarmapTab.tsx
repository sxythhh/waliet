import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { toast } from "sonner";

interface WarmapEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
}

export function WarmapTab() {
  const [events, setEvents] = useState<WarmapEvent[]>([]);
  const [currentStartDate, setCurrentStartDate] = useState(startOfDay(new Date()));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState({ title: "", description: "" });

  useEffect(() => {
    fetchEvents();
  }, [currentStartDate]);

  const fetchEvents = async () => {
    const endDate = addDays(currentStartDate, 4);
    const { data, error } = await supabase
      .from("warmap_events")
      .select("*")
      .gte("event_date", format(currentStartDate, "yyyy-MM-dd"))
      .lt("event_date", format(endDate, "yyyy-MM-dd"))
      .order("event_date", { ascending: true });

    if (error) {
      toast.error("Failed to fetch events");
      return;
    }
    setEvents(data || []);
  };

  const handlePrevious = () => {
    setCurrentStartDate((prev) => addDays(prev, -4));
  };

  const handleNext = () => {
    setCurrentStartDate((prev) => addDays(prev, 4));
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newEvent.title) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase.from("warmap_events").insert({
      title: newEvent.title,
      description: newEvent.description || null,
      event_date: format(selectedDate, "yyyy-MM-dd"),
    });

    if (error) {
      toast.error("Failed to add event");
      return;
    }

    toast.success("Event added successfully");
    setIsDialogOpen(false);
    setNewEvent({ title: "", description: "" });
    setSelectedDate(null);
    fetchEvents();
  };

  const handleDeleteEvent = async (id: string) => {
    const { error } = await supabase.from("warmap_events").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete event");
      return;
    }

    toast.success("Event deleted");
    fetchEvents();
  };

  const renderDay = (dayOffset: number) => {
    const date = addDays(currentStartDate, dayOffset);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayEvents = events.filter((e) => e.event_date === dateStr);

    return (
      <Card key={dayOffset} className="p-4 min-h-[200px]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="font-semibold">{format(date, "EEE")}</div>
            <div className="text-sm text-muted-foreground">{format(date, "MMM d")}</div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(date)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Event - {format(date, "MMM d, yyyy")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
                <Button onClick={handleAddEvent} className="w-full">
                  Add Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {dayEvents.map((event) => (
            <div
              key={event.id}
              className="p-2 bg-primary/10 rounded-md group relative"
            >
              <div className="font-medium text-sm">{event.title}</div>
              {event.description && (
                <div className="text-xs text-muted-foreground">{event.description}</div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                onClick={() => handleDeleteEvent(event.id)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button className="bg-gray-800 hover:bg-gray-700 border-0" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-lg font-semibold">
          {format(currentStartDate, "MMM d")} - {format(addDays(currentStartDate, 3), "MMM d, yyyy")}
        </div>
        <Button className="bg-gray-800 hover:bg-gray-700 border-0" onClick={handleNext}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((offset) => renderDay(offset))}
      </div>
    </div>
  );
}
