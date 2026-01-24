import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Send,
  Briefcase,
  Zap,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface BulkPitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  selectedCreators: Array<{
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  onSuccess?: () => void;
}

interface OpportunityOption {
  id: string;
  type: "campaign" | "boost";
  title: string;
  description: string | null;
  rate: number;
  rateLabel: string;
}

type SendStatus = "idle" | "sending" | "complete";

interface SendResult {
  creatorId: string;
  success: boolean;
  error?: string;
}

export function BulkPitchDialog({
  open,
  onOpenChange,
  brandId,
  selectedCreators,
  onSuccess,
}: BulkPitchDialogProps) {
  const [opportunities, setOpportunities] = useState<OpportunityOption[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityOption | null>(null);
  const [message, setMessage] = useState("");
  const [proposedRate, setProposedRate] = useState<string>("");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SendResult[]>([]);

  useEffect(() => {
    if (open && brandId) {
      fetchOpportunities();
    }
  }, [open, brandId]);

  const fetchOpportunities = async () => {
    setLoadingOpportunities(true);
    try {
      const [campaignsRes, boostsRes] = await Promise.all([
        supabase
          .from("campaigns")
          .select("id, title, description, rpm_rate")
          .eq("brand_id", brandId)
          .eq("status", "active"),
        supabase
          .from("bounty_campaigns")
          .select("id, title, description, monthly_retainer, videos_per_month")
          .eq("brand_id", brandId)
          .eq("status", "active"),
      ]);

      const campaigns: OpportunityOption[] = (campaignsRes.data || []).map((c) => ({
        id: c.id,
        type: "campaign" as const,
        title: c.title,
        description: c.description,
        rate: c.rpm_rate,
        rateLabel: `$${c.rpm_rate}/1K views`,
      }));

      const boosts: OpportunityOption[] = (boostsRes.data || []).map((b) => ({
        id: b.id,
        type: "boost" as const,
        title: b.title,
        description: b.description,
        rate: b.monthly_retainer,
        rateLabel: `$${b.monthly_retainer}/mo · ${b.videos_per_month} videos`,
      }));

      setOpportunities([...campaigns, ...boosts]);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const handleSend = async () => {
    if (!selectedOpportunity || message.trim().length < 20) return;

    setSendStatus("sending");
    setProgress(0);
    setResults([]);

    const sendResults: SendResult[] = [];
    const batchSize = 5;
    const total = selectedCreators.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = selectedCreators.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (creator) => {
          try {
            const pitchData = {
              type: "brand_to_creator" as const,
              creator_id: creator.id,
              brand_id: brandId,
              campaign_id: selectedOpportunity.type === "campaign" ? selectedOpportunity.id : null,
              boost_id: selectedOpportunity.type === "boost" ? selectedOpportunity.id : null,
              subject: `Invitation to join ${selectedOpportunity.title}`,
              message,
              proposed_rate: proposedRate ? parseFloat(proposedRate) : null,
              status: "pending",
              expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            };

            const { error } = await supabase.from("pitches").insert(pitchData as any);

            if (error) {
              // Check for duplicate
              if (error.code === "23505") {
                sendResults.push({
                  creatorId: creator.id,
                  success: false,
                  error: "Already invited",
                });
              } else {
                throw error;
              }
            } else {
              sendResults.push({ creatorId: creator.id, success: true });
            }
          } catch (error: any) {
            sendResults.push({
              creatorId: creator.id,
              success: false,
              error: error.message || "Failed",
            });
          }
        })
      );

      // Update progress
      const completed = Math.min(i + batchSize, total);
      setProgress((completed / total) * 100);
      setResults([...sendResults]);
    }

    setSendStatus("complete");

    const successCount = sendResults.filter((r) => r.success).length;
    const failCount = sendResults.filter((r) => !r.success).length;

    if (successCount > 0) {
      toast.success(`Invitations sent!`, {
        description: `${successCount} creator${successCount > 1 ? "s" : ""} invited${
          failCount > 0 ? `, ${failCount} failed` : ""
        }`,
      });
    } else {
      toast.error("Failed to send invitations");
    }
  };

  const handleClose = () => {
    if (sendStatus === "sending") return;
    resetForm();
    onOpenChange(false);
    if (sendStatus === "complete") {
      onSuccess?.();
    }
  };

  const resetForm = () => {
    setSelectedOpportunity(null);
    setMessage("");
    setProposedRate("");
    setSendStatus("idle");
    setProgress(0);
    setResults([]);
  };

  const canSubmit = selectedOpportunity && message.trim().length >= 20 && sendStatus === "idle";
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-instrument tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite {selectedCreators.length} Creators
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            Send campaign invitations to selected creators.
          </DialogDescription>
        </DialogHeader>

        {sendStatus === "complete" ? (
          // Results View
          <div className="py-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg font-inter tracking-[-0.3px] mb-1">
                Invitations Sent
              </h3>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                {successCount} sent successfully
                {failCount > 0 && `, ${failCount} failed`}
              </p>
            </div>

            {failCount > 0 && (
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-xs text-destructive font-inter tracking-[-0.3px] font-medium mb-2">
                  Failed invitations:
                </p>
                <ScrollArea className="max-h-24">
                  {results
                    .filter((r) => !r.success)
                    .map((r) => {
                      const creator = selectedCreators.find((c) => c.id === r.creatorId);
                      return (
                        <p key={r.creatorId} className="text-xs text-muted-foreground">
                          @{creator?.username}: {r.error}
                        </p>
                      );
                    })}
                </ScrollArea>
              </div>
            )}

            <Button onClick={handleClose} className="w-full mt-4 font-inter tracking-[-0.3px]">
              Done
            </Button>
          </div>
        ) : sendStatus === "sending" ? (
          // Sending Progress View
          <div className="py-8">
            <div className="text-center mb-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg font-inter tracking-[-0.3px] mb-1">
                Sending Invitations...
              </h3>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                {Math.round(progress)}% complete
              </p>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          // Form View
          <div className="space-y-4 py-2">
            {/* Selected Creators Preview */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {selectedCreators.slice(0, 5).map((creator) => (
                  <Avatar key={creator.id} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={creator.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(creator.full_name || creator.username)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {selectedCreators.length > 5 && (
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                  +{selectedCreators.length - 5} more
                </span>
              )}
            </div>

            {/* Opportunity Selection */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.3px] text-sm">
                Select Campaign <span className="text-destructive">*</span>
              </Label>
              {loadingOpportunities ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : opportunities.length === 0 ? (
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-inter tracking-[-0.3px]">
                    No active campaigns or boosts found. Create one first.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-32">
                  <div className="space-y-2 pr-3">
                    {opportunities.map((opp) => (
                      <button
                        key={opp.id}
                        onClick={() => setSelectedOpportunity(opp)}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left transition-all",
                          selectedOpportunity?.id === opp.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 bg-background"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {opp.type === "campaign" ? (
                            <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          <span className="font-medium text-sm font-inter tracking-[-0.3px] truncate">
                            {opp.title}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {opp.rateLabel}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.3px] text-sm">
                Message <span className="text-destructive">*</span>
                <span className="text-muted-foreground ml-1">(min 20 chars)</span>
              </Label>
              <Textarea
                placeholder="Tell creators about this opportunity and why you'd like to work with them..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="font-inter tracking-[-0.3px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/20 characters
              </p>
            </div>

            {/* Proposed Rate */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.3px] text-sm">
                Custom Rate (optional)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Leave empty to use campaign rate"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  className="pl-9 font-inter tracking-[-0.3px]"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}

        {sendStatus === "idle" && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              className="font-inter tracking-[-0.3px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!canSubmit}
              className="gap-2 font-inter tracking-[-0.3px]"
            >
              <Send className="h-4 w-4" />
              Send {selectedCreators.length} Invitation{selectedCreators.length > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
