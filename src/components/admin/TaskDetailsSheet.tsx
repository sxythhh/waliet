import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | null;
  order_index: number;
}

interface TaskDetailsSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function TaskDetailsSheet({ task, open, onOpenChange, onUpdate }: TaskDetailsSheetProps) {
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setDescription(task.description || "");
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("work_tasks")
      .update({ description })
      .eq("id", task.id);

    if (error) {
      toast.error("Failed to save task details");
      setIsSaving(false);
      return;
    }

    toast.success("Task details saved");
    setIsSaving(false);
    onUpdate();
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

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
