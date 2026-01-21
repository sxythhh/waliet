import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type TaskWithBusiness = Task & {
  businesses: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean | null;
  } | null;
};

/**
 * Fetch all active public tasks
 */
export function useTasks(options?: { category?: string; limit?: number }) {
  return useQuery({
    queryKey: ["tasks", options],
    queryFn: async (): Promise<TaskWithBusiness[]> => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          businesses (
            id,
            name,
            slug,
            logo_url,
            is_verified
          )
        `)
        .eq("status", "active")
        .eq("is_private", false)
        .order("created_at", { ascending: false });

      if (options?.category) {
        query = query.eq("category", options.category);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as TaskWithBusiness[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single task by ID
 */
export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async (): Promise<TaskWithBusiness | null> => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          businesses (
            id,
            name,
            slug,
            logo_url,
            is_verified,
            description
          )
        `)
        .eq("id", taskId)
        .maybeSingle();

      if (error) throw error;
      return data as TaskWithBusiness | null;
    },
    enabled: !!taskId,
  });
}

/**
 * Fetch tasks by business ID
 */
export function useBusinessTasks(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-tasks", businessId],
    queryFn: async (): Promise<Task[]> => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["business-tasks", data.business_id] });
    },
  });
}

/**
 * Update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      queryClient.invalidateQueries({ queryKey: ["business-tasks", data.business_id] });
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
