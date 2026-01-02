import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Clock, Loader2, ShieldCheck, AlertTriangle, ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePendingApprovals, useCastVote, useExecuteApproval } from "@/hooks/usePayoutApprovals";
import type { PayoutApproval } from "@/types/payout-security";

export function PayoutApprovals() {
  const { data: approvals, isLoading, refetch } = usePendingApprovals();
  const [selectedApproval, setSelectedApproval] = useState<PayoutApproval | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const castVote = useCastVote();
  const executeApproval = useExecuteApproval();

  const handleApprove = async (approval: PayoutApproval) => {
    await castVote.mutateAsync({
      approvalId: approval.id,
      vote: "approve",
    });
    refetch();
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    await castVote.mutateAsync({
      approvalId: selectedApproval.id,
      vote: "reject",
      comment: rejectionReason,
    });
    setRejectDialogOpen(false);
    setRejectionReason("");
    setSelectedApproval(null);
    refetch();
  };

  const handleExecute = async (approval: PayoutApproval) => {
    if (!approval.payout_request_id) return;
    await executeApproval.mutateAsync({
      payoutRequestId: approval.payout_request_id,
      approvalId: approval.id,
    });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!approvals || approvals.length === 0) {
    return null;
  }

  return (
    <>
      <div className="border-b border-border/50 bg-card/30">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Pending Approvals</h2>
              <p className="text-xs text-muted-foreground">{approvals.length} payout(s) awaiting approval</p>
            </div>
          </div>

          <div className="grid gap-3">
            {approvals.map((approval) => {
              const approveCount = approval.vote_count?.approve_count || 0;
              const isApproved = approval.status === "approved";
              const canExecute = isApproved || approveCount >= approval.required_approvals;
              const isProcessing = castVote.isPending || executeApproval.isPending;

              return (
                <Card key={approval.id} className="p-4 bg-card/50 border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={approval.recipient?.avatar_url || ""} />
                        <AvatarFallback>{(approval.recipient?.username || "?")[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{approval.recipient?.full_name || approval.recipient?.username}</p>
                        <p className="text-xs text-muted-foreground">@{approval.recipient?.username}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-semibold">${Number(approval.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{approval.currency}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          isApproved && "bg-emerald-500/10 text-emerald-500",
                          !isApproved && "bg-amber-500/10 text-amber-500"
                        )}
                      >
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            {approveCount}/{approval.required_approvals} approvals
                          </>
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(approval.requested_at), { addSuffix: true })}
                      </span>
                    </div>

                    {approval.wallet_address && (
                      <code className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded font-mono truncate max-w-[150px]">
                        {approval.wallet_address.slice(0, 8)}...{approval.wallet_address.slice(-6)}
                      </code>
                    )}
                  </div>

                  {/* Votes */}
                  {approval.votes && approval.votes.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Votes:</span>
                      <div className="flex -space-x-1">
                        {approval.votes.map((vote) => (
                          <Avatar key={vote.id} className="h-6 w-6 ring-2 ring-background">
                            <AvatarImage src={vote.admin?.avatar_url || ""} />
                            <AvatarFallback className="text-[10px]">{(vote.admin?.username || "?")[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    {canExecute ? (
                      <Button
                        size="sm"
                        onClick={() => handleExecute(approval)}
                        disabled={isProcessing}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {executeApproval.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Execute Payout
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(approval)}
                        disabled={isProcessing}
                        className="flex-1"
                      >
                        {castVote.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedApproval(approval);
                        setRejectDialogOpen(true);
                      }}
                      disabled={isProcessing}
                      className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Reject Payout
            </DialogTitle>
            <DialogDescription>
              This will reject the payout request and notify the user.
            </DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedApproval.recipient?.avatar_url || ""} />
                    <AvatarFallback>{(selectedApproval.recipient?.username || "?")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{selectedApproval.recipient?.full_name || selectedApproval.recipient?.username}</p>
                    <p className="text-lg font-bold">${Number(selectedApproval.amount).toFixed(2)} USDC</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this payout is being rejected..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectDialogOpen(false);
                    setRejectionReason("");
                    setSelectedApproval(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={!rejectionReason || castVote.isPending}
                  className="flex-1 bg-rose-600 hover:bg-rose-700"
                >
                  {castVote.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Reject Payout
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
