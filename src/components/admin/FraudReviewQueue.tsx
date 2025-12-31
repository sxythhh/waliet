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
  evidence_deadline: string | null;
  fraud_check_result: any;
  created_at: string;
  creator: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    trust_score: number | null;
    fraud_flag_count: number;
    fraud_flag_permanent: boolean;
    created_at: string;
  };
  flags: Array<{
    id: string;
    flag_type: string;
    flag_reason: string;
    detected_value: number | null;
    threshold_value: number | null;
    status: string;
  }>;
  evidence: Array<{
    id: string;
    evidence_type: string;
    file_path: string | null;
    external_url: string | null;
    uploaded_at: string;
    review_status: string | null;
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
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");

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
          evidence_deadline,
          fraud_check_result,
          created_at
        `)
        .in("auto_approval_status", ["pending_evidence", "pending_review"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with creator, flags, and evidence data
      const enrichedItems: FraudReviewItem[] = [];

      for (const request of payoutRequests || []) {
        // Get creator profile
        const { data: creator } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, trust_score, fraud_flag_count, fraud_flag_permanent, created_at")
          .eq("id", request.user_id)
          .single();

        // Get fraud flags
        const { data: flags } = await supabase
          .from("fraud_flags")
          .select("id, flag_type, flag_reason, detected_value, threshold_value, status")
          .eq("payout_request_id", request.id)
          .eq("status", "pending");

        // Get evidence
        const { data: evidence } = await supabase
          .from("fraud_evidence")
          .select("id, evidence_type, file_path, external_url, uploaded_at, review_status")
          .eq("payout_request_id", request.id)
          .order("uploaded_at", { ascending: false });

        enrichedItems.push({
          ...request,
          creator: creator || {
            id: request.user_id,
            username: "Unknown",
            full_name: null,
            avatar_url: null,
            trust_score: null,
            fraud_flag_count: 0,
            fraud_flag_permanent: false,
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
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
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
          resolution_notes: "Approved after evidence review",
        })
        .eq("payout_request_id", selectedItem.id)
        .eq("status", "pending");

      // Update evidence review status
      if (selectedItem.evidence.length > 0) {
        await supabase
          .from("fraud_evidence")
          .update({
            review_status: "approved",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("payout_request_id", selectedItem.id);
      }

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
          rejection_reason: rejectionReason === "other" ? rejectionNotes : rejectionReason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
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
          resolution_notes: rejectionReason === "other" ? rejectionNotes : rejectionReason,
        })
        .eq("payout_request_id", selectedItem.id)
        .eq("status", "pending");

      // Unlock ledger entries back to pending
      await supabase
        .from("payment_ledger")
        .update({
          status: "pending",
          payout_request_id: null,
          locked_at: null,
          clearing_ends_at: null,
        })
        .eq("payout_request_id", selectedItem.id);

      // Apply fraud penalty if confirmed
      try {
        await supabase.functions.invoke("apply-fraud-penalty", {
          body: {
            creatorId: selectedItem.creator.id,
            fraudAmount: selectedItem.total_amount,
            fraudType: selectedItem.flags[0]?.flag_type || "manual",
            fraudFlagId: selectedItem.flags[0]?.id,
          },
        });
      } catch (e) {
        console.error("Failed to apply fraud penalty:", e);
      }

      toast.success("Payout rejected - fraud penalty applied");
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

  const getEvidenceUrl = (evidence: FraudReviewItem["evidence"][0]) => {
    if (evidence.external_url) return evidence.external_url;
    if (evidence.file_path) {
      const { data } = supabase.storage
        .from("fraud-evidence")
        .getPublicUrl(evidence.file_path);
      return data.publicUrl;
    }
    return null;
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
        {reviewItems.map((item) => {
          const hasEvidence = item.evidence.length > 0;
          const isExpired = item.evidence_deadline && new Date(item.evidence_deadline) < new Date();
          const hoursRemaining = item.evidence_deadline
            ? Math.max(0, Math.floor((new Date(item.evidence_deadline).getTime() - Date.now()) / (1000 * 60 * 60)))
            : 0;

          return (
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
                      {item.creator.fraud_flag_permanent && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          <Ban className="h-2.5 w-2.5 mr-0.5" />
                          Fraud History
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                      @{item.creator.username}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Trust: {item.creator.trust_score || 0}</span>
                      <span>Age: {getAccountAge(item.creator.created_at)}</span>
                      {item.creator.fraud_flag_count > 0 && (
                        <span className="text-amber-500">
                          {item.creator.fraud_flag_count} prior flag{item.creator.fraud_flag_count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold tracking-[-0.5px]">${item.total_amount.toFixed(2)}</p>
                  <Badge
                    variant={hasEvidence ? "secondary" : isExpired ? "destructive" : "outline"}
                    className="mt-1"
                  >
                    {hasEvidence ? "Evidence Submitted" : isExpired ? "Deadline Passed" : `${hoursRemaining}h remaining`}
                  </Badge>
                </div>
              </div>

              {/* Fraud Flags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {item.flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/10 text-amber-600 text-xs"
                  >
                    {getFlagIcon(flag.flag_type)}
                    <span className="font-medium">{getFlagLabel(flag.flag_type)}</span>
                    {flag.detected_value !== null && (
                      <span className="text-amber-500/70">
                        ({flag.detected_value < 0.01 ? `${(flag.detected_value * 100).toFixed(3)}%` : flag.detected_value.toFixed(1)}x)
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Evidence Section */}
              <div className="border-t border-border/30 pt-4 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 tracking-[-0.5px]">Evidence</p>
                {item.evidence.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>No evidence submitted yet</span>
                    {item.evidence_deadline && (
                      <span className="text-xs">
                        (Deadline: {format(new Date(item.evidence_deadline), "PPp")})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {item.evidence.map((ev) => {
                      const url = getEvidenceUrl(ev);
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            {ev.evidence_type === "screen_recording" ? (
                              <FileVideo className="h-5 w-5 text-primary" />
                            ) : (
                              <Link2 className="h-5 w-5 text-primary" />
                            )}
                            <div>
                              <p className="text-sm font-medium tracking-[-0.5px]">
                                {ev.evidence_type === "screen_recording" ? "Screen Recording" : "External Link"}
                              </p>
                              <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                                Uploaded {formatDistanceToNow(new Date(ev.uploaded_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (ev.evidence_type === "screen_recording") {
                                  setSelectedVideoUrl(url);
                                  setVideoDialogOpen(true);
                                } else {
                                  window.open(url, "_blank");
                                }
                              }}
                              className="gap-1.5 text-xs"
                            >
                              {ev.evidence_type === "screen_recording" ? (
                                <>
                                  <Play className="h-3.5 w-3.5" />
                                  Watch
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Open
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedItem(item);
                    setApproveDialogOpen(true);
                  }}
                  disabled={processing === item.id || (!hasEvidence && !isExpired)}
                  className="gap-1.5 h-9 text-xs tracking-[-0.5px] bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve Payout
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setSelectedItem(item);
                    setRejectDialogOpen(true);
                  }}
                  disabled={processing === item.id}
                  className="gap-1.5 h-9 text-xs tracking-[-0.5px]"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject & Penalize
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              Approve Payout
            </DialogTitle>
            <DialogDescription>
              This will approve the ${selectedItem?.total_amount.toFixed(2)} payout and proceed to the clearing period.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-sm font-medium text-emerald-500 tracking-[-0.5px]">
                The fraud flags will be dismissed and the payout will continue normally.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing !== null}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? "Processing..." : "Approve Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Reject Payout
            </DialogTitle>
            <DialogDescription>
              This will reject the payout and apply a trust penalty to the creator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-medium text-destructive tracking-[-0.5px]">
                Warning: This will flag the creator's account permanently
              </p>
              <p className="text-xs text-muted-foreground mt-1 tracking-[-0.5px]">
                The creator's trust score will be reduced based on the fraud amount.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm tracking-[-0.5px]">Rejection Reason</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
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
                <Label className="text-sm tracking-[-0.5px]">Additional Notes</Label>
                <Textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Explain the rejection reason..."
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setRejectionNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing !== null || !rejectionReason || (rejectionReason === "other" && !rejectionNotes)}
            >
              {processing ? "Processing..." : "Reject & Penalize"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Evidence Recording</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {selectedVideoUrl && (
              <video
                src={selectedVideoUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
