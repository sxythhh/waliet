import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | null;
}

const ASSIGNEES = ["matt", "ivelin", "alex"];
const STATUS_MAP = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export function WorkTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");

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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    const assignedTo = activeFilter === "all" ? null : activeFilter;

    const { error } = await supabase.from("work_tasks").insert({
      title: newTaskTitle.trim(),
      description: null,
      assigned_to: assignedTo,
      priority: null,
      status: "todo",
    });

    if (error) {
      toast.error("Failed to add task");
      return;
    }

    toast.success("Task added");
    setNewTaskTitle("");
    fetchTasks();
  };

  const handleUpdateStatus = async (taskId: string, newStatus: Task["status"]) => {
    const { error } = await supabase
      .from("work_tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      return;
    }

    fetchTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from("work_tasks").delete().eq("id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      return;
    }

    toast.success("Task deleted");
    fetchTasks();
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === "all") return true;
    return task.assigned_to === activeFilter;
  });

  const renderTaskCard = (task: Task) => (
    <Card key={task.id} className="p-4 group relative">
      <div className="space-y-2">
        <div className="font-medium">{task.title}</div>
        {task.description && (
          <div className="text-sm text-muted-foreground">{task.description}</div>
        )}
        <div className="flex items-center gap-2 text-xs">
          {task.assigned_to && (
            <span className="px-2 py-1 bg-primary/10 rounded">@{task.assigned_to}</span>
          )}
          {task.priority && (
            <span
              className={`px-2 py-1 rounded ${
                task.priority === "high"
                  ? "bg-destructive/10 text-destructive"
                  : task.priority === "medium"
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-muted"
              }`}
            >
              {task.priority}
            </span>
          )}
        </div>
        <Select value={task.status} onValueChange={(value) => handleUpdateStatus(task.id, value as Task["status"])}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
        onClick={() => handleDeleteTask(task.id)}
      >
        ×
      </Button>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            onClick={() => setActiveFilter("all")}
          >
            All
          </Button>
          {ASSIGNEES.map((assignee) => (
            <Button
              key={assignee}
              variant={activeFilter === assignee ? "default" : "outline"}
              onClick={() => setActiveFilter(assignee)}
            >
              {assignee}
            </Button>
          ))}
        </div>
        <form onSubmit={handleAddTask} className="relative">
          <Input
            placeholder="Add a new task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task) => renderTaskCard(task))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No tasks found. Add your first task to get started!
        </div>
      )}
    </div>
  );
}
