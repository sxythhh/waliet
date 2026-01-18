import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ModuleCompletion {
  id: string;
  user_id: string;
  module_id: string;
  completed_at: string;
}

interface TrainingProgressResult {
  completedModuleIds: string[];
  isModuleCompleted: (moduleId: string) => boolean;
  progress: number; // 0-100
  completedCount: number;
  totalCount: number;
  isLoading: boolean;
  markComplete: (moduleId: string) => Promise<void>;
  markIncomplete: (moduleId: string) => Promise<void>;
  isMarking: boolean;
}

export function useTrainingProgress(
  campaignId: string | null,
  totalModules: number
): TrainingProgressResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch completed modules
  const { data: completions, isLoading } = useQuery({
    queryKey: ['training-completions', campaignId, user?.id],
    queryFn: async (): Promise<ModuleCompletion[]> => {
      if (!user?.id || !campaignId) return [];

      try {
        const { data, error } = await (supabase as any)
          .from('blueprint_module_completions')
          .select('*')
          .eq('user_id', user.id)
          .eq('campaign_id', campaignId);

        if (error) {
          // Table might not exist yet, return empty
          console.warn('Error fetching completions:', error.message);
          return [];
        }

        return (data || []).map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          module_id: c.module_id,
          completed_at: c.completed_at || new Date().toISOString(),
        }));
      } catch {
        return [];
      }
    },
    enabled: !!user?.id && !!campaignId,
  });

  const completedModuleIds = (completions || []).map((c) => c.module_id);

  // Check if a module is completed
  const isModuleCompleted = (moduleId: string): boolean => {
    return completedModuleIds.includes(moduleId);
  };

  // Calculate progress
  const completedCount = completedModuleIds.length;
  const progress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  // Mark module as complete
  const markCompleteMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!user?.id || !campaignId) throw new Error('Not authenticated');

      // Check if already completed
      if (completedModuleIds.includes(moduleId)) {
        return; // Already completed
      }

      try {
        const { error } = await (supabase as any)
          .from('blueprint_module_completions')
          .insert({
            user_id: user.id,
            campaign_id: campaignId,
            module_id: moduleId,
            completed_at: new Date().toISOString(),
          });

        if (error) throw error;
      } catch (err: any) {
        console.warn('Error marking module complete:', err.message);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['training-completions', campaignId, user?.id],
      });
    },
  });

  // Mark module as incomplete (remove completion)
  const markIncompleteMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!user?.id || !campaignId) throw new Error('Not authenticated');

      try {
        const { error } = await (supabase as any)
          .from('blueprint_module_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('campaign_id', campaignId)
          .eq('module_id', moduleId);

        if (error) throw error;
      } catch (err: any) {
        console.warn('Error marking module incomplete:', err.message);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['training-completions', campaignId, user?.id],
      });
    },
  });

  return {
    completedModuleIds,
    isModuleCompleted,
    progress,
    completedCount,
    totalCount: totalModules,
    isLoading,
    markComplete: markCompleteMutation.mutateAsync,
    markIncomplete: markIncompleteMutation.mutateAsync,
    isMarking: markCompleteMutation.isPending || markIncompleteMutation.isPending,
  };
}
