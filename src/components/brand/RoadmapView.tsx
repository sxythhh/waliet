import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Lock, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RoadmapPhase {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface RoadmapTask {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_locked: boolean;
  is_section_header: boolean;
  link_url: string | null;
}

interface TaskCompletion {
  task_id: string;
  completed_at: string;
}

export function RoadmapView({ brandId }: { brandId: string }) {
  const [phase, setPhase] = useState<RoadmapPhase | null>(null);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoadmapData();
  }, [brandId]);

  const fetchRoadmapData = async () => {
    try {
      // Fetch active phase
      const { data: phaseData, error: phaseError } = await supabase
        .from("roadmap_phases")
        .select("*")
        .eq("brand_id", brandId)
        .eq("is_active", true)
        .order("order_index", { ascending: true })
        .maybeSingle();

      if (phaseError) throw phaseError;

      if (phaseData) {
        setPhase(phaseData);

        // Fetch tasks for this phase
        const { data: tasksData, error: tasksError } = await supabase
          .from("roadmap_tasks")
          .select("*")
          .eq("phase_id", phaseData.id)
          .order("order_index", { ascending: true });

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);

        // Fetch completions
        const { data: completionsData, error: completionsError } = await supabase
          .from("roadmap_task_completions")
          .select("task_id, completed_at")
          .eq("brand_id", brandId);

        if (completionsError) throw completionsError;
        setCompletions(completionsData || []);
      }
    } catch (error) {
      console.error("Error fetching roadmap:", error);
      toast.error("Failed to load roadmap");
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        // Uncomplete task
        const { error } = await supabase
          .from("roadmap_task_completions")
          .delete()
          .eq("task_id", taskId)
          .eq("brand_id", brandId);

        if (error) throw error;
        setCompletions(prev => prev.filter(c => c.task_id !== taskId));
      } else {
        // Complete task
        const { error } = await supabase
          .from("roadmap_task_completions")
          .insert({
            task_id: taskId,
            brand_id: brandId,
          });

        if (error) throw error;
        setCompletions(prev => [...prev, { task_id: taskId, completed_at: new Date().toISOString() }]);
      }
    } catch (error) {
      console.error("Error toggling task:", error);
      toast.error("Failed to update task");
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/60">No active roadmap phase available</p>
      </div>
    );
  }

  const completableTasks = tasks.filter(t => !t.is_section_header && !t.is_locked);
  const completedCount = completions.filter(c => 
    completableTasks.some(t => t.id === c.task_id)
  ).length;
  const progressPercentage = completableTasks.length > 0 
    ? (completedCount / completableTasks.length) * 100 
    : 0;

  // Group tasks by section
  const groupedTasks: { section: RoadmapTask | null; tasks: RoadmapTask[] }[] = [];
  let currentSection: RoadmapTask | null = null;
  let currentTasks: RoadmapTask[] = [];

  tasks.forEach(task => {
    if (task.is_section_header) {
      if (currentSection || currentTasks.length > 0) {
        groupedTasks.push({ section: currentSection, tasks: currentTasks });
      }
      currentSection = task;
      currentTasks = [];
    } else {
      currentTasks.push(task);
    }
  });

  // Push the last group
  if (currentSection || currentTasks.length > 0) {
    groupedTasks.push({ section: currentSection, tasks: currentTasks });
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Phase Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 bg-white/10 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-[#5865F2]" />
          </div>
          <h1 className="text-3xl font-bold text-white font-chakra-petch tracking-tight">
            {phase.title}
          </h1>
        </div>

        {phase.description && (
          <p className="text-white/60 mb-6">{phase.description}</p>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-sm text-white/60">
            {completedCount}/{completableTasks.length} complete · {Math.round(progressPercentage)}%
          </p>
        </div>
      </div>

      {/* Task Groups */}
      <div className="space-y-8">
        {groupedTasks.map((group, idx) => (
          <div key={idx}>
            {group.section && (
              <h2 className="text-xl font-semibold text-white mb-4 font-chakra-petch tracking-tight">
                {group.section.title}
              </h2>
            )}

            <div className="space-y-3">
              {group.tasks.map(task => {
                const isCompleted = completions.some(c => c.task_id === task.id);

                return (
                  <Card
                    key={task.id}
                    className={`border-none transition-all ${
                      task.is_locked
                        ? 'bg-[#202020]/50 opacity-60'
                        : isCompleted
                        ? 'bg-[#5865F2]/20 border border-[#5865F2]/30'
                        : 'bg-[#202020] hover:bg-[#252525]'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {task.is_locked ? (
                          <div className="flex-shrink-0 mt-1">
                            <Lock className="h-5 w-5 text-white/40" />
                          </div>
                        ) : (
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => toggleTaskCompletion(task.id, isCompleted)}
                            className="mt-1 border-white/20 data-[state=checked]:bg-[#5865F2] data-[state=checked]:border-[#5865F2]"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${
                              task.is_locked ? 'text-white/40' : 'text-white'
                            }`}>
                              {task.title}
                            </p>
                            {task.link_url && !task.is_locked && (
                              <a
                                href={task.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#5865F2] hover:text-[#5865F2]/80"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          {task.description && (
                            <p className={`text-sm mt-1 ${
                              task.is_locked ? 'text-white/30' : 'text-white/60'
                            }`}>
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
