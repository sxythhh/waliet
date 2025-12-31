import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield, AlertTriangle, Clock, CheckCircle2, XCircle,
  ExternalLink, RefreshCw, Play, FileVideo, Link2,
  TrendingUp, Users, History, Ban
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FraudReviewItem {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  auto_approval_status: string;
  created_at: string;
  creator: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  flags: Array<{
    id: string;
    flag_type: string;
    flag_reason: string | null;
    status: string;
  }>;
  evidence: Array<{
    id: string;
    evidence_type: string;
    evidence_data: any;
    created_at: string;
  }>;
}

const REJECTION_REASONS = [
  { value: "insufficient_evidence", label: "Insufficient evidence" },
  { value: "evidence_mismatch", label: "Evidence doesn't match claimed metrics" },
  { value: "view_pattern_confirmed", label: "Suspicious view pattern confirmed" },
  { value: "bot_activity", label: "Bot activity detected" },
  { value: "non_responsive", label: "Creator non-responsive" },
  { value: "other", label: "Other" },
];

export function FraudReviewQueue() {
  const [reviewItems, setReviewItems] = useState<FraudReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FraudReviewItem | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");

  useEffect(() => {
    fetchReviewItems();
  }, []);

  const fetchReviewItems = async () => {
    setLoading(true);
    try {
      // Fetch payout requests pending fraud review
      const { data: payoutRequests, error } = await supabase
        .from("submission_payout_requests")
        .select(`
          id,
          user_id,
          total_amount,
          status,
          auto_approval_status,
          created_at
        `)
        .eq("auto_approval_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with creator, flags, and evidence data
      const enrichedItems: FraudReviewItem[] = [];

      for (const request of payoutRequests || []) {
        // Get creator profile
        const { data: creator } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, created_at")
          .eq("id", request.user_id)
          .single();

        // Get fraud flags for this user
        const { data: flags } = await supabase
          .from("fraud_flags")
          .select("id, flag_type, flag_reason, status")
          .eq("user_id", request.user_id)
          .eq("status", "pending");

        // Get evidence
        const { data: evidence } = await supabase
          .from("fraud_evidence")
          .select("id, evidence_type, evidence_data, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        enrichedItems.push({
          ...request,
          creator: creator || {
            id: request.user_id,
            username: "Unknown",
            full_name: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
          },
          flags: flags || [],
          evidence: evidence || [],
        });
      }

      setReviewItems(enrichedItems);
    } catch (error) {
      console.error("Error fetching review items:", error);
      toast.error("Failed to load fraud review queue");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    setProcessing(selectedItem.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update payout request to approved
      const { error: updateError } = await supabase
        .from("submission_payout_requests")
        .update({
          auto_approval_status: "approved",
        })
        .eq("id", selectedItem.id);

      if (updateError) throw updateError;

      // Dismiss all pending fraud flags
      await supabase
        .from("fraud_flags")
        .update({
          status: "dismissed",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("user_id", selectedItem.user_id)
        .eq("status", "pending");

      toast.success("Payout approved - proceeding to clearing period");
      setApproveDialogOpen(false);
      setSelectedItem(null);
      fetchReviewItems();
    } catch (error) {
      console.error("Error approving payout:", error);
      toast.error("Failed to approve payout");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !rejectionReason) return;
    setProcessing(selectedItem.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update payout request to rejected
      const { error: updateError } = await supabase
        .from("submission_payout_requests")
        .update({
          status: "cancelled",
          auto_approval_status: "failed",
        })
        .eq("id", selectedItem.id);

      if (updateError) throw updateError;

      // Confirm fraud flags
      await supabase
        .from("fraud_flags")
        .update({
          status: "confirmed",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("user_id", selectedItem.user_id)
        .eq("status", "pending");

      toast.success("Payout rejected");
      setRejectDialogOpen(false);
      setSelectedItem(null);
      setRejectionReason("");
      setRejectionNotes("");
      fetchReviewItems();
    } catch (error) {
      console.error("Error rejecting payout:", error);
      toast.error("Failed to reject payout");
    } finally {
      setProcessing(null);
    }
  };

  const getFlagIcon = (flagType: string) => {
    switch (flagType) {
      case "engagement":
        return <TrendingUp className="h-4 w-4" />;
      case "velocity":
        return <TrendingUp className="h-4 w-4" />;
      case "new_creator":
        return <Users className="h-4 w-4" />;
      case "previous_fraud":
        return <History className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getFlagLabel = (flagType: string) => {
    switch (flagType) {
      case "engagement":
        return "Low Engagement";
      case "velocity":
        return "View Spike";
      case "new_creator":
        return "New Creator";
      case "previous_fraud":
        return "Previous Fraud";
      default:
        return flagType;
    }
  };

  const getAccountAge = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${Math.floor(days / 365)}y`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (reviewItems.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-lg font-medium text-muted-foreground">No pending fraud reviews</p>
          <p className="text-sm text-muted-foreground mt-1">
            Payouts flagged for fraud review will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium tracking-[-0.5px]">
            {reviewItems.length} payout{reviewItems.length !== 1 ? "s" : ""} pending fraud review
          </h3>
          <p className="text-xs text-muted-foreground tracking-[-0.5px]">
            Review evidence and approve or reject flagged payouts
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchReviewItems}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Review Items */}
      <div className="grid gap-4">
        {reviewItems.map((item) => (
          <div
            key={item.id}
            className="bg-card/50 rounded-xl p-5 border border-amber-500/20"
          >
            {/* Top Row: Creator Info */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-border/40">
                  <AvatarImage src={item.creator.avatar_url || undefined} />
                  <AvatarFallback className="text-sm bg-muted/40">
                    {item.creator.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm tracking-[-0.5px]">
                      {item.creator.full_name || item.creator.username}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                    @{item.creator.username}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Age: {getAccountAge(item.creator.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold tracking-[-0.5px]">${item.total_amount.toFixed(2)}</p>
                <Badge variant="outline" className="mt-1">
                  Pending Review
                </Badge>
              </div>
            </div>

            {/* Fraud Flags */}
            {item.flags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {item.flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/10 text-amber-600 text-xs"
                  >
                    {getFlagIcon(flag.flag_type)}
                    <span className="font-medium">{getFlagLabel(flag.flag_type)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-border/30">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => {
                  setSelectedItem(item);
                  setRejectDialogOpen(true);
                }}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5 text-xs bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setSelectedItem(item);
                  setApproveDialogOpen(true);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payout</DialogTitle>
            <DialogDescription>
              This will approve the payout request for ${selectedItem?.total_amount.toFixed(2)} and dismiss all pending fraud flags.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing === selectedItem?.id}>
              Approve Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout</DialogTitle>
            <DialogDescription>
              This will reject the payout request and confirm fraud flags.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rejectionReason === "other" && (
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Provide details..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason || processing === selectedItem?.id}
            >
              Reject Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
