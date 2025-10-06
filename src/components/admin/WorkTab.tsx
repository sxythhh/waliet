import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CircleCheck, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTask } from "./SortableTask";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | null;
  order_index: number;
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
      .order("order_index", { ascending: true });

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

    // Get max order_index for this assignee
    const tasksForAssignee = tasks.filter(t => t.assigned_to === assignee);
    const maxOrder = tasksForAssignee.length > 0 
      ? Math.max(...tasksForAssignee.map(t => t.order_index)) 
      : -1;

    const { error } = await supabase.from("work_tasks").insert({
      title: title.trim(),
      description: null,
      assigned_to: assignee,
      priority: null,
      status: "todo",
      order_index: maxOrder + 1,
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

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("work_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      return;
    }

    fetchTasks();
  };

  const handleDragEnd = async (event: DragEndEvent, assignee: string | null) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const columnTasks = assignee === null 
      ? tasks.filter((task) => task.status !== "done")
      : tasks.filter((task) => task.assigned_to === assignee && task.status !== "done");

    const oldIndex = columnTasks.findIndex((task) => task.id === active.id);
    const newIndex = columnTasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);

    // Update order_index for all affected tasks
    const updates = reorderedTasks.map((task, index) => ({
      id: task.id,
      order_index: index,
    }));

    // Optimistically update UI
    setTasks(prevTasks => {
      const newTasks = [...prevTasks];
      updates.forEach(update => {
        const taskIndex = newTasks.findIndex(t => t.id === update.id);
        if (taskIndex !== -1) {
          newTasks[taskIndex] = { ...newTasks[taskIndex], order_index: update.order_index };
        }
      });
      return newTasks;
    });

    // Update database
    for (const update of updates) {
      const { error } = await supabase
        .from("work_tasks")
        .update({ order_index: update.order_index })
        .eq("id", update.id);

      if (error) {
        toast.error("Failed to reorder tasks");
        fetchTasks(); // Revert on error
        return;
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const renderTaskColumn = (title: string, assignee: string | null) => {
    const key = assignee || "all";
    const columnTasks = assignee === null 
      ? tasks 
      : tasks.filter((task) => task.assigned_to === assignee);
    
    const activeTasks = columnTasks.filter((task) => task.status !== "done");
    const completedTasks = columnTasks.filter((task) => task.status === "done");

    return (
      <Card key={key} className="p-4 space-y-3 w-[280px] flex-shrink-0">
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
            className="pr-10 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleDragEnd(event, assignee)}
        >
          <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <SortableTask key={task.id} task={task} onToggle={handleToggleStatus} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {completedTasks.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
              <span>Completed ({completedTasks.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {completedTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-2 group hover:bg-muted/20 p-2 rounded-md transition-colors">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className="flex items-start gap-2 flex-1 text-left"
                  >
                    <CircleCheck className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-scale-in transition-all duration-100 hover:scale-110" />
                    <span className="text-sm line-through text-muted-foreground">{task.title}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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
