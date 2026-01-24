import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TaskSubmission {
  id: string;
  task_application_id: string;
  task_id: string;
  user_id: string;
  submission_text: string | null;
  submission_url: string | null;
  attachments: unknown[];
  status: string;
  feedback: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  amount_earned: number;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Verification fields
  screenshot_url: string | null;
  screenshot_hash: string | null;
  device_fingerprint: string | null;
  device_fingerprint_data: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  completion_time_seconds: number | null;
  verification_status: string;
  verification_score: number | null;
  verification_flags: string[];
  verification_notes: string | null;
  verification_type: string | null;
  verified_at: string | null;
  verified_by: string | null;
}

export interface TaskSubmissionInsert {
  task_application_id: string;
  task_id: string;
  user_id: string;
  submission_text?: string;
  submission_url?: string;
  attachments?: unknown[];
  screenshot_url?: string;
  screenshot_hash?: string;
  device_fingerprint?: string;
  device_fingerprint_data?: Record<string, unknown>;
  started_at?: string;
  completed_at?: string;
  completion_time_seconds?: number;
}

export interface UserTrustScore {
  user_id: string;
  trust_score: number;
  total_submissions: number;
  approved_submissions: number;
  rejected_submissions: number;
  flagged_submissions: number;
  approval_rate: number;
  is_trusted: boolean;
  is_suspicious: boolean;
}

/**
 * Get submission for a specific task application
 */
export function useTaskSubmission(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["task-submission", applicationId],
    queryFn: async (): Promise<TaskSubmission | null> => {
      if (!applicationId) return null;

      const { data, error } = await supabase
        .from("task_submissions")
        .select("*")
        .eq("task_application_id", applicationId)
        .maybeSingle();

      if (error) throw error;
      return data as TaskSubmission | null;
    },
    enabled: !!applicationId,
  });
}

/**
 * Get all submissions for a user
 */
export function useMySubmissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-submissions", user?.id],
    queryFn: async (): Promise<TaskSubmission[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("task_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as TaskSubmission[]) || [];
    },
    enabled: !!user?.id,
  });
}

/**
 * Get submissions for a task (business owner view)
 */
export function useTaskSubmissions(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-submissions", taskId],
    queryFn: async (): Promise<TaskSubmission[]> => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from("task_submissions")
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as TaskSubmission[]) || [];
    },
    enabled: !!taskId,
  });
}

/**
 * Get user's trust score
 */
export function useUserTrustScore(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-trust-score", userId],
    queryFn: async (): Promise<UserTrustScore | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_trust_scores")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as UserTrustScore | null;
    },
    enabled: !!userId,
  });
}

/**
 * Create a new task submission
 */
export function useCreateSubmission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submission: Omit<TaskSubmissionInsert, "user_id">) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("task_submissions")
        .insert({
          ...submission,
          user_id: user.id,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task-submission", data.task_application_id] });
      queryClient.invalidateQueries({ queryKey: ["my-submissions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["task-submissions", data.task_id] });
      queryClient.invalidateQueries({ queryKey: ["my-task-applications", user?.id] });
    },
  });
}

/**
 * Update submission verification status (for business owners)
 */
export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      status,
      notes,
      reviewerId,
    }: {
      submissionId: string;
      status: "approved" | "rejected";
      notes?: string;
      reviewerId: string;
    }) => {
      const { data, error } = await supabase
        .from("task_submissions")
        .update({
          verification_status: status,
          verification_notes: notes,
          verified_at: new Date().toISOString(),
          verified_by: reviewerId,
          // Also update the legacy status field
          status: status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerId,
          feedback: notes,
        })
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task-submission", data.task_application_id] });
      queryClient.invalidateQueries({ queryKey: ["task-submissions", data.task_id] });
      queryClient.invalidateQueries({ queryKey: ["verification-queue"] });
    },
  });
}

/**
 * Generate SHA-256 hash for a file
 */
export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Upload screenshot to Supabase storage
 */
export async function uploadScreenshot(
  file: File,
  userId: string,
  taskId: string
): Promise<{ url: string; hash: string }> {
  // Generate hash
  const hash = await generateFileHash(file);

  // Create unique filename
  const ext = file.name.split(".").pop() || "png";
  const filename = `${userId}/${taskId}/${Date.now()}-${hash.slice(0, 8)}.${ext}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from("submissions")
    .upload(filename, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("submissions")
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    hash,
  };
}
