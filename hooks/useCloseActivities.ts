import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CloseActivity {
  id: string;
  brand_id: string;
  close_activity_id: string;
  close_lead_id: string;
  activity_type: "call" | "email" | "sms" | "note" | "meeting" | "task_completed";
  direction: "inbound" | "outbound" | null;
  user_name: string | null;
  subject: string | null;
  body: string | null;
  duration_seconds: number | null;
  activity_at: string;
  custom_fields: Record<string, unknown>;
  synced_at: string | null;
  created_at: string;
}

export interface LogActivityInput {
  brand_id: string;
  activity_type: "call" | "email" | "note" | "meeting";
  note: string;
  subject?: string;
  direction?: "inbound" | "outbound";
  duration_seconds?: number;
}

// Fetch activities for a brand
export function useCloseActivities(brandId: string | undefined, options?: {
  limit?: number;
  activityType?: string;
}) {
  return useQuery({
    queryKey: ["close-activities", brandId, options],
    queryFn: async (): Promise<CloseActivity[]> => {
      if (!brandId) return [];

      let query = supabase
        .from("close_activities")
        .select("*")
        .eq("brand_id", brandId)
        .order("activity_at", { ascending: false });

      if (options?.activityType) {
        query = query.eq("activity_type", options.activityType);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as CloseActivity[];
    },
    enabled: !!brandId,
    staleTime: 30 * 1000,
  });
}

// Log a new activity
export function useLogActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: LogActivityInput) => {
      const { data, error } = await supabase.functions.invoke("close-crud", {
        body: {
          action: "log_activity",
          ...input,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["close-activities", variables.brand_id] });

      const typeLabels: Record<string, string> = {
        call: "Call logged",
        email: "Email logged",
        note: "Note added",
        meeting: "Meeting logged",
      };

      toast({
        title: typeLabels[variables.activity_type] || "Activity logged",
        description: "Activity has been recorded in Close CRM.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to log activity",
        description: error.message,
      });
    },
  });
}

// Sync activities from Close
export function useSyncActivitiesFromClose() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (brandId: string) => {
      const { data, error } = await supabase.functions.invoke("close-sync", {
        body: { action: "fetch_activities", brand_id: brandId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, brandId) => {
      queryClient.invalidateQueries({ queryKey: ["close-activities", brandId] });
      toast({
        title: "Activities synced",
        description: `${data.count || 0} activities synced from Close CRM.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to sync activities",
        description: error.message,
      });
    },
  });
}

// Get activity icon and color based on type
export function getActivityTypeInfo(type: CloseActivity["activity_type"]) {
  const info: Record<string, { icon: string; color: string; label: string }> = {
    call: { icon: "Phone", color: "text-green-500", label: "Call" },
    email: { icon: "Mail", color: "text-blue-500", label: "Email" },
    sms: { icon: "MessageSquare", color: "text-purple-500", label: "SMS" },
    note: { icon: "StickyNote", color: "text-yellow-500", label: "Note" },
    meeting: { icon: "Calendar", color: "text-orange-500", label: "Meeting" },
    task_completed: { icon: "CheckCircle2", color: "text-emerald-500", label: "Task" },
  };

  return info[type] || { icon: "Circle", color: "text-gray-500", label: type };
}

// Format duration in human-readable format
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// Group activities by date
export function groupActivitiesByDate(activities: CloseActivity[]) {
  const groups: Record<string, CloseActivity[]> = {};

  for (const activity of activities) {
    const date = new Date(activity.activity_at).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
  }

  return groups;
}
