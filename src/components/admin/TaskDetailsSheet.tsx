import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | null;
  order_index: number;
  reminder_at: string | null;
}

interface TaskDetailsSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function TaskDetailsSheet({ task, open, onOpenChange, onUpdate }: TaskDetailsSheetProps) {
  const [description, setDescription] = useState("");
  const [reminderDateTime, setReminderDateTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setDescription(task.description || "");
      if (task.reminder_at) {
        // Convert to local datetime-local format
        const date = new Date(task.reminder_at);
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setReminderDateTime(localDateTime);
      } else {
        setReminderDateTime("");
      }
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;

    setIsSaving(true);
    
    const updateData: any = { description };
    
    if (reminderDateTime) {
      // Convert local datetime to UTC
      updateData.reminder_at = new Date(reminderDateTime).toISOString();
    } else {
      updateData.reminder_at = null;
    }
    
    const { error } = await supabase
      .from("work_tasks")
      .update(updateData)
      .eq("id", task.id);

    if (error) {
      toast.error("Failed to save task details");
      setIsSaving(false);
      return;
    }

    toast.success("Task details saved");
    setIsSaving(false);
    onUpdate();
    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{task.title}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          <div>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Add task details, notes, or instructions..."
            />
          </div>
          
          <div>
            <Label htmlFor="reminder" className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4" />
              Set Reminder
            </Label>
            <Input
              id="reminder"
              type="datetime-local"
              value={reminderDateTime}
              onChange={(e) => setReminderDateTime(e.target.value)}
              className="bg-background"
            />
            {task.reminder_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Reminder set for {new Date(task.reminder_at).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="ghost" className="bg-muted/50" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
