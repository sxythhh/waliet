import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PayoutApproval, PayoutApprovalVote, PayoutAuditLog } from "@/types/payout-security";

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["payout-approvals", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_approvals")
        .select(`
          *,
          requester:requested_by (id, username, avatar_url),
          recipient:user_id (id, username, full_name, avatar_url)
        `)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch votes for each approval
      const approvalIds = data?.map(a => a.id) || [];
      if (approvalIds.length > 0) {
        const { data: votes } = await supabase
          .from("payout_approval_votes")
          .select(`
            *,
            admin:admin_id (id, username, avatar_url)
          `)
          .in("approval_id", approvalIds);

        // Attach votes to approvals
        return data?.map(approval => ({
          ...approval,
          votes: votes?.filter(v => v.approval_id === approval.id) || [],
          vote_count: {
            approve_count: votes?.filter(v => v.approval_id === approval.id && v.vote === "approve").length || 0,
            reject_count: votes?.filter(v => v.approval_id === approval.id && v.vote === "reject").length || 0,
          }
        })) as PayoutApproval[];
      }

      return data as PayoutApproval[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useApprovalAuditLog(approvalId?: string) {
  return useQuery({
    queryKey: ["payout-audit-log", approvalId],
    queryFn: async () => {
      let query = supabase
        .from("payout_audit_log")
        .select(`
          *,
          actor:actor_id (id, username, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (approvalId) {
        query = query.eq("approval_id", approvalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PayoutAuditLog[];
    },
    enabled: !!approvalId || true,
  });
}

export function useRequestApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payoutRequestId: string) => {
      const { data, error } = await supabase.functions.invoke("request-crypto-payout", {
        body: { payout_request_id: payoutRequestId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payout-approvals"] });
      toast({
        title: "Approval requested",
        description: `Requires ${data.required_approvals} approval(s). ${data.can_execute ? "Ready to execute." : "Waiting for more approvals."}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to request approval",
        description: error.message,
      });
    },
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ approvalId, vote, comment }: { approvalId: string; vote: "approve" | "reject"; comment?: string }) => {
      const { data, error } = await supabase.functions.invoke("approve-payout", {
        body: { approval_id: approvalId, vote, comment },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payout-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["payout-audit-log"] });

      if (data.approval_status === "rejected") {
        toast({
          title: "Payout rejected",
          description: "The payout has been rejected.",
        });
      } else if (data.can_execute) {
        toast({
          title: "Approval complete",
          description: "The payout is ready to execute.",
        });
      } else {
        toast({
          title: "Vote recorded",
          description: `${data.vote_counts.approve}/${data.required_approvals} approvals received.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to cast vote",
        description: error.message,
      });
    },
  });
}

export function useExecuteApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ payoutRequestId, approvalId }: { payoutRequestId: string; approvalId: string }) => {
      const { data, error } = await supabase.functions.invoke("process-crypto-payout", {
        body: { payoutRequestId, approvalId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payout-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["payout-audit-log"] });
      toast({
        title: "Payout executed",
        description: `Transaction confirmed: ${data.signature?.slice(0, 8)}...`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to execute payout",
        description: error.message,
      });
    },
  });
}
