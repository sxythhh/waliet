import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, ExternalLink } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { toast } from "sonner";

interface WarmapEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  assigned_to: string[];
  link: string | null;
}

const TEAM_MEMBERS = ["matt", "ivelin", "alex"];

export function WarmapTab() {
  const [events, setEvents] = useState<WarmapEvent[]>([]);
  const [currentStartDate, setCurrentStartDate] = useState(startOfDay(new Date()));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<WarmapEvent | null>(null);
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    description: "", 
    assigned_to: [] as string[], 
    link: "" 
  });
  const [draggedEvent, setDraggedEvent] = useState<WarmapEvent | null>(null);

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

    if (editingEvent) {
      const { error } = await supabase
        .from("warmap_events")
        .update({
          title: newEvent.title,
          description: newEvent.description || null,
          assigned_to: newEvent.assigned_to,
          link: newEvent.link || null,
        })
        .eq("id", editingEvent.id);

      if (error) {
        toast.error("Failed to update event");
        return;
      }
      toast.success("Event updated successfully");
    } else {
      const { error } = await supabase.from("warmap_events").insert({
        title: newEvent.title,
        description: newEvent.description || null,
        event_date: format(selectedDate, "yyyy-MM-dd"),
        assigned_to: newEvent.assigned_to,
        link: newEvent.link || null,
      });

      if (error) {
        toast.error("Failed to add event");
        return;
      }
      toast.success("Event added successfully");
    }

    setIsDialogOpen(false);
    setNewEvent({ title: "", description: "", assigned_to: [], link: "" });
    setSelectedDate(null);
    setEditingEvent(null);
    fetchEvents();
  };

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("warmap_events").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete event");
      return;
    }

    toast.success("Event deleted");
    fetchEvents();
  };

  const handleEditEvent = (event: WarmapEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || "",
      assigned_to: event.assigned_to || [],
      link: event.link || "",
    });
    setSelectedDate(new Date(event.event_date));
    setIsDialogOpen(true);
  };

  const handleDragStart = (event: WarmapEvent) => {
    setDraggedEvent(event);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetDate: Date) => {
    if (!draggedEvent) return;

    const { error } = await supabase
      .from("warmap_events")
      .update({ event_date: format(targetDate, "yyyy-MM-dd") })
      .eq("id", draggedEvent.id);

    if (error) {
      toast.error("Failed to move event");
      return;
    }

    toast.success("Event moved successfully");
    setDraggedEvent(null);
    fetchEvents();
  };

  const toggleAssignee = (member: string) => {
    setNewEvent((prev) => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(member)
        ? prev.assigned_to.filter((m) => m !== member)
        : [...prev.assigned_to, member],
    }));
  };

  const renderDay = (dayOffset: number) => {
    const date = addDays(currentStartDate, dayOffset);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayEvents = events.filter((e) => e.event_date === dateStr);

    return (
      <Card
        key={dayOffset}
        className="p-4 min-h-[200px]"
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(date)}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="font-semibold">{format(date, "EEE")}</div>
            <div className="text-sm text-muted-foreground">{format(date, "MMM d")}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDate(date);
              setEditingEvent(null);
              setNewEvent({ title: "", description: "", assigned_to: [], link: "" });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {dayEvents.map((event) => (
            <div
              key={event.id}
              className="p-2 bg-primary/10 rounded-md group relative cursor-move hover:bg-primary/15 transition-colors"
              draggable
              onDragStart={() => handleDragStart(event)}
              onClick={() => handleEditEvent(event)}
            >
              <div className="font-medium text-sm pr-6">{event.title}</div>
              {event.description && (
                <div className="text-xs text-muted-foreground">{event.description}</div>
              )}
              {event.assigned_to && event.assigned_to.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {event.assigned_to.map((member) => (
                    <span
                      key={member}
                      className="text-xs px-1.5 py-0.5 bg-background rounded"
                    >
                      @{member}
                    </span>
                  ))}
                </div>
              )}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {event.link && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(event.link!, "_blank");
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => handleDeleteEvent(event.id, e)}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button className="bg-[#0C0C0C] hover:bg-[#1A1A1A] border-0" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-lg font-semibold">
          {format(currentStartDate, "MMM d")} - {format(addDays(currentStartDate, 3), "MMM d, yyyy")}
        </div>
        <Button className="bg-[#0C0C0C] hover:bg-[#1A1A1A] border-0" onClick={handleNext}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((offset) => renderDay(offset))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Add Event"}
              {selectedDate && ` - ${format(selectedDate, "MMM d, yyyy")}`}
            </DialogTitle>
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
            <Input
              placeholder="Link (optional)"
              value={newEvent.link}
              onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })}
            />
            <div className="space-y-2">
              <Label>Assign to:</Label>
              <div className="flex flex-col gap-2">
                {TEAM_MEMBERS.map((member) => (
                  <div key={member} className="flex items-center space-x-2">
                    <Checkbox
                      id={member}
                      checked={newEvent.assigned_to.includes(member)}
                      onCheckedChange={() => toggleAssignee(member)}
                    />
                    <label
                      htmlFor={member}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                    >
                      {member}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleAddEvent} className="w-full">
              {editingEvent ? "Update Event" : "Add Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
