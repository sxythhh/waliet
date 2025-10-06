import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CircleCheck, ChevronRight, Circle, Plus } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | null;
}

const ASSIGNEES = ["ivelin", "matt", "alex"];

export function WorkTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({
    all: "",
    ivelin: "",
    matt: "",
    alex: "",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("work_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch tasks");
      return;
    }
    setTasks((data as Task[]) || []);
  };

  const handleAddTask = async (assignee: string | null) => {
    const key = assignee || "all";
    const title = newTaskInputs[key];
    
    if (!title?.trim()) {
      return;
    }

    const { error } = await supabase.from("work_tasks").insert({
      title: title.trim(),
      description: null,
      assigned_to: assignee,
      priority: null,
      status: "todo",
    });

    if (error) {
      toast.error("Failed to add task");
      return;
    }

    setNewTaskInputs({ ...newTaskInputs, [key]: "" });
    fetchTasks();
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    
    const { error } = await supabase
      .from("work_tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    if (error) {
      toast.error("Failed to update task");
      return;
    }

    fetchTasks();
  };

  const renderTaskColumn = (title: string, assignee: string | null) => {
    const key = assignee || "all";
    const columnTasks = assignee === null 
      ? tasks 
      : tasks.filter((task) => task.assigned_to === assignee);
    
    const activeTasks = columnTasks.filter((task) => task.status !== "done");
    const completedTasks = columnTasks.filter((task) => task.status === "done");

    return (
      <Card key={key} className="p-4 space-y-3 w-[350px] flex-shrink-0">
        <h3 className="font-semibold text-lg">{title}</h3>
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTask(assignee);
          }}
          className="relative"
        >
          <Input
            placeholder="Add a task..."
            value={newTaskInputs[key]}
            onChange={(e) => setNewTaskInputs({ ...newTaskInputs, [key]: e.target.value })}
            className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary focus:border-2"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div className="space-y-2">
          {activeTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => handleToggleStatus(task)}
              className="flex items-start gap-2 w-full text-left group hover:bg-accent/50 p-2 rounded-md transition-colors"
            >
              <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 transition-all duration-300 hover:scale-110" />
              <span className="text-sm">{task.title}</span>
            </button>
          ))}
        </div>

        {completedTasks.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
              <span>Completed ({completedTasks.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {completedTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleToggleStatus(task)}
                  className="flex items-start gap-2 w-full text-left group hover:bg-accent/50 p-2 rounded-md transition-colors"
                >
                  <CircleCheck className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-scale-in transition-all duration-300 hover:scale-110" />
                  <span className="text-sm line-through text-muted-foreground">{task.title}</span>
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4 w-full">
        {renderTaskColumn("All Tasks", null)}
        {ASSIGNEES.map((assignee) => 
          renderTaskColumn(assignee.charAt(0).toUpperCase() + assignee.slice(1), assignee)
        )}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No tasks found. Add your first task to get started!
        </div>
      )}
    </div>
  );
}
