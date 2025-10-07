import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Edit2, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

interface Phase {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
}

interface Task {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_locked: boolean;
  is_section_header: boolean;
  link_url: string | null;
}

interface ManageRoadmapDialogProps {
  brandId: string;
  brandName: string;
}

export function ManageRoadmapDialog({ brandId, brandName }: ManageRoadmapDialogProps) {
  const [open, setOpen] = useState(false);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, brandId]);

  const fetchData = async () => {
    try {
      // Fetch phases
      const { data: phasesData, error: phasesError } = await supabase
        .from("roadmap_phases")
        .select("*")
        .eq("brand_id", brandId)
        .order("order_index", { ascending: true });

      if (phasesError) throw phasesError;
      setPhases(phasesData || []);

      // Fetch all tasks
      if (phasesData && phasesData.length > 0) {
        const phaseIds = phasesData.map(p => p.id);
        const { data: tasksData, error: tasksError } = await supabase
          .from("roadmap_tasks")
          .select("*")
          .in("phase_id", phaseIds)
          .order("order_index", { ascending: true });

        if (tasksError) throw tasksError;

        const tasksByPhase: Record<string, Task[]> = {};
        tasksData?.forEach(task => {
          if (!tasksByPhase[task.phase_id]) {
            tasksByPhase[task.phase_id] = [];
          }
          tasksByPhase[task.phase_id].push(task);
        });
        setTasks(tasksByPhase);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load roadmap data");
    }
  };

  const addPhase = async () => {
    try {
      const { error } = await supabase.from("roadmap_phases").insert({
        brand_id: brandId,
        title: "New Phase",
        order_index: phases.length,
      });

      if (error) throw error;
      await fetchData();
      toast.success("Phase added");
    } catch (error) {
      console.error("Error adding phase:", error);
      toast.error("Failed to add phase");
    }
  };

  const updatePhase = async (phaseId: string, updates: Partial<Phase>) => {
    try {
      const { error } = await supabase
        .from("roadmap_phases")
        .update(updates)
        .eq("id", phaseId);

      if (error) throw error;
      await fetchData();
      setEditingPhase(null);
      toast.success("Phase updated");
    } catch (error) {
      console.error("Error updating phase:", error);
      toast.error("Failed to update phase");
    }
  };

  const deletePhase = async (phaseId: string) => {
    if (!confirm("Delete this phase and all its tasks?")) return;

    try {
      const { error } = await supabase
        .from("roadmap_phases")
        .delete()
        .eq("id", phaseId);

      if (error) throw error;
      await fetchData();
      toast.success("Phase deleted");
    } catch (error) {
      console.error("Error deleting phase:", error);
      toast.error("Failed to delete phase");
    }
  };

  const addTask = async (phaseId: string, isSectionHeader = false) => {
    try {
      const phaseTasks = tasks[phaseId] || [];
      const { error } = await supabase.from("roadmap_tasks").insert({
        phase_id: phaseId,
        title: isSectionHeader ? "New Section" : "New Task",
        order_index: phaseTasks.length,
        is_section_header: isSectionHeader,
      });

      if (error) throw error;
      await fetchData();
      toast.success(isSectionHeader ? "Section added" : "Task added");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from("roadmap_tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;
      await fetchData();
      setEditingTask(null);
      toast.success("Task updated");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("roadmap_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
      await fetchData();
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#5865F2] hover:bg-[#4752C4]">
          Manage Roadmap
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#202020] text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-chakra-petch tracking-tight">
            Manage Roadmap - {brandName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <Button onClick={addPhase} className="w-full bg-white/10 hover:bg-white/20">
            <Plus className="h-4 w-4 mr-2" />
            Add Phase
          </Button>

          <Accordion type="multiple" className="space-y-4">
            {phases.map(phase => (
              <AccordionItem key={phase.id} value={phase.id} className="border border-white/10 rounded-lg bg-[#252525]">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-white/40" />
                      {editingPhase === phase.id ? (
                        <Input
                          defaultValue={phase.title}
                          onBlur={(e) => updatePhase(phase.id, { title: e.target.value })}
                          className="bg-white/5 border-white/10"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="font-semibold">{phase.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={phase.is_active}
                        onCheckedChange={(checked) => 
                          updatePhase(phase.id, { is_active: checked as boolean })
                        }
                      />
                      <span className="text-sm text-white/60">Active</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPhase(phase.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePhase(phase.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 mt-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addTask(phase.id, true)}
                        variant="outline"
                        size="sm"
                        className="bg-white/5 border-white/10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                      <Button
                        onClick={() => addTask(phase.id, false)}
                        variant="outline"
                        size="sm"
                        className="bg-white/5 border-white/10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {tasks[phase.id]?.map(task => (
                        <Card key={task.id} className="bg-[#202020] border-white/10">
                          <CardContent className="p-3">
                            {editingTask === task.id ? (
                              <div className="space-y-2">
                                <Input
                                  defaultValue={task.title}
                                  placeholder="Title"
                                  className="bg-white/5 border-white/10"
                                  onBlur={(e) => updateTask(task.id, { title: e.target.value })}
                                />
                                <Textarea
                                  defaultValue={task.description || ""}
                                  placeholder="Description"
                                  className="bg-white/5 border-white/10"
                                  onBlur={(e) => updateTask(task.id, { description: e.target.value })}
                                />
                                <Input
                                  defaultValue={task.link_url || ""}
                                  placeholder="Link URL (optional)"
                                  className="bg-white/5 border-white/10"
                                  onBlur={(e) => updateTask(task.id, { link_url: e.target.value })}
                                />
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-2">
                                    <Checkbox
                                      checked={task.is_locked}
                                      onCheckedChange={(checked) => 
                                        updateTask(task.id, { is_locked: checked as boolean })
                                      }
                                    />
                                    <span className="text-sm">Locked</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <Checkbox
                                      checked={task.is_section_header}
                                      onCheckedChange={(checked) => 
                                        updateTask(task.id, { is_section_header: checked as boolean })
                                      }
                                    />
                                    <span className="text-sm">Section Header</span>
                                  </label>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => setEditingTask(null)}
                                  className="bg-[#5865F2] hover:bg-[#4752C4]"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Done
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className={`font-medium ${task.is_section_header ? 'text-lg' : ''}`}>
                                    {task.title}
                                    {task.is_locked && " 🔒"}
                                  </p>
                                  {task.description && (
                                    <p className="text-sm text-white/60 mt-1">{task.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingTask(task.id)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteTask(task.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
