import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrainingModule {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  quiz: any[] | null;
  order_index: number;
  required: boolean;
}

interface UseTrainingCompletionResult {
  loading: boolean;
  modules: TrainingModule[];
  completedModuleIds: Set<string>;
  requiredModulesComplete: boolean;
  allModulesComplete: boolean;
  progress: number; // 0-100
  refetch: () => Promise<void>;
}

export function useTrainingCompletion(
  blueprintId: string | undefined
): UseTrainingCompletionResult {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [completedModuleIds, setCompletedModuleIds] = useState<Set<string>>(
    new Set()
  );

  const fetchData = async () => {
    if (!blueprintId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch blueprint training modules
      const { data: blueprint, error: blueprintError } = await supabase
        .from("blueprints")
        .select("training_modules")
        .eq("id", blueprintId)
        .single();

      if (blueprintError || !blueprint?.training_modules) {
        setModules([]);
        setLoading(false);
        return;
      }

      const trainingModules = blueprint.training_modules as unknown as TrainingModule[];
      setModules(trainingModules);

      // Fetch user's completions
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setLoading(false);
        return;
      }

      const { data: completions, error: completionsError } = await supabase
        .from("blueprint_training_completions")
        .select("module_id")
        .eq("user_id", user.user.id)
        .eq("blueprint_id", blueprintId);

      if (!completionsError && completions) {
        setCompletedModuleIds(new Set(completions.map((c) => c.module_id)));
      }
    } catch (error) {
      console.error("Error fetching training data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [blueprintId]);

  const requiredModules = modules.filter((m) => m.required);
  const requiredComplete = requiredModules.every((m) =>
    completedModuleIds.has(m.id)
  );
  const allComplete = modules.every((m) => completedModuleIds.has(m.id));

  const progress =
    requiredModules.length > 0
      ? (requiredModules.filter((m) => completedModuleIds.has(m.id)).length /
          requiredModules.length) *
        100
      : 100;

  return {
    loading,
    modules,
    completedModuleIds,
    requiredModulesComplete: requiredComplete || requiredModules.length === 0,
    allModulesComplete: allComplete || modules.length === 0,
    progress,
    refetch: fetchData,
  };
}
