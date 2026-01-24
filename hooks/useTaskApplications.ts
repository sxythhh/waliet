import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type TaskApplication = Database["public"]["Tables"]["task_applications"]["Row"];
export type TaskApplicationInsert = Database["public"]["Tables"]["task_applications"]["Insert"];
export type TaskApplicationUpdate = Database["public"]["Tables"]["task_applications"]["Update"];

export type TaskApplicationWithTask = TaskApplication & {
  tasks: {
    id: string;
    title: string;
    description: string | null;
    reward_amount: number | null;
    status: string | null;
    deadline: string | null;
    businesses: {
      id: string;
      name: string;
      logo_url: string | null;
      is_verified: boolean | null;
    } | null;
  } | null;
};

export type TaskApplicationWithUser = TaskApplication & {
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    trust_score: number | null;
  } | null;
};

/**
 * Fetch current user's task applications
 */
export function useMyTaskApplications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-task-applications", user?.id],
    queryFn: async (): Promise<TaskApplicationWithTask[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("task_applications")
        .select(`
          *,
          tasks (
            id,
            title,
            description,
            reward_amount,
            status,
            deadline,
            businesses (
              id,
              name,
              logo_url,
              is_verified
            )
          )
        `)
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return (data as TaskApplicationWithTask[]) || [];
    },
    enabled: !!user?.id,
  });
}

/**
 * Check if user has already applied to a task
 */
export function useHasAppliedToTask(taskId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["task-application-check", taskId, user?.id],
    queryFn: async (): Promise<TaskApplication | null> => {
      if (!user?.id || !taskId) return null;

      const { data, error } = await supabase
        .from("task_applications")
        .select("*")
        .eq("task_id", taskId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!taskId,
  });
}

/**
 * Fetch applications for a specific task (for business owners)
 */
export function useTaskApplications(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-applications", taskId],
    queryFn: async (): Promise<TaskApplicationWithUser[]> => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from("task_applications")
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url,
            trust_score
          )
        `)
        .eq("task_id", taskId)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return (data as TaskApplicationWithUser[]) || [];
    },
    enabled: !!taskId,
  });
}

/**
 * Apply to a task
 */
export function useApplyToTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (application: Omit<TaskApplicationInsert, "user_id">) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("task_applications")
        .insert({
          ...application,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-task-applications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["task-applications", data.task_id] });
      queryClient.invalidateQueries({ queryKey: ["task-application-check", data.task_id, user?.id] });
    },
  });
}

/**
 * Update application status (for business owners)
 */
export function useUpdateTaskApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskApplicationUpdate }) => {
      const { data, error } = await supabase
        .from("task_applications")
        .update({
          ...updates,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task-applications", data.task_id] });
      queryClient.invalidateQueries({ queryKey: ["my-task-applications"] });
    },
  });
}

/**
 * Withdraw application
 */
export function useWithdrawApplication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await supabase
        .from("task_applications")
        .update({ status: "withdrawn" })
        .eq("id", applicationId)
        .eq("user_id", user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-task-applications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["task-applications", data.task_id] });
    },
  });
}
