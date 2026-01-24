import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Send,
  Briefcase,
  Zap,
  DollarSign,
  User,
} from "lucide-react";

interface BrandPitchToCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
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

export function BrandPitchToCreatorDialog({
  open,
  onOpenChange,
  brandId,
  creatorId,
  creatorName,
  creatorUsername,
  creatorAvatarUrl,
  onSuccess,
}: BrandPitchToCreatorDialogProps) {
  const queryClient = useQueryClient();

  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityOption | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [proposedRate, setProposedRate] = useState<string>("");

  // Fetch brand's active campaigns and boosts
  const { data: opportunities, isLoading: loadingOpportunities } = useQuery({
    queryKey: ["brand-opportunities-for-pitch", brandId],
    queryFn: async () => {
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

      return [...campaigns, ...boosts];
    },
    enabled: open,
  });

  const submitPitch = useMutation({
    mutationFn: async () => {
      const pitchData = {
        type: "brand_to_creator" as const,
        creator_id: creatorId,
        brand_id: brandId,
        campaign_id: selectedOpportunity?.type === "campaign" ? selectedOpportunity.id : null,
        boost_id: selectedOpportunity?.type === "boost" ? selectedOpportunity.id : null,
        subject: subject || `Invitation to join ${selectedOpportunity?.title || "our brand"}`,
        message,
        proposed_rate: proposedRate ? parseFloat(proposedRate) : null,
        status: "pending",
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      };

      const { error } = await supabase.from("pitches").insert(pitchData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pitch sent!", {
        description: `Your invitation to ${creatorName} has been sent.`,
      });
      queryClient.invalidateQueries({ queryKey: ["brand-pitches"] });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to send pitch", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setSelectedOpportunity(null);
    setSubject("");
    setMessage("");
    setProposedRate("");
  };

  const canSubmit = selectedOpportunity && message.trim().length >= 20;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Invite Creator
          </DialogTitle>
          <DialogDescription>
            Send an invitation to this creator to join one of your campaigns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Creator Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={creatorAvatarUrl || ""} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {creatorName?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{creatorName}</p>
              <p className="text-sm text-muted-foreground">@{creatorUsername}</p>
            </div>
          </div>

          {/* Opportunity Selection */}
          <div className="space-y-2">
            <Label>Select campaign or boost *</Label>
            {loadingOpportunities ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : opportunities && opportunities.length > 0 ? (
              <ScrollArea className="h-[160px]">
                <div className="space-y-2 pr-4">
                  {opportunities.map((opp) => (
                    <button
                      key={`${opp.type}-${opp.id}`}
                      type="button"
                      onClick={() => setSelectedOpportunity(opp)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        selectedOpportunity?.id === opp.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-border/80 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {opp.type === "campaign" ? (
                              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">{opp.title}</span>
                          </div>
                          {opp.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {opp.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {opp.rateLabel}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                No active campaigns or boosts. Create one first.
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="pitch-subject">Subject (optional)</Label>
            <Input
              id="pitch-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Invitation to join ${selectedOpportunity?.title || "our campaign"}`}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="pitch-message">Message *</Label>
            <Textarea
              id="pitch-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain why you'd like to work with this creator, what makes your opportunity special, and any specific requirements or expectations..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500 characters (minimum 20)
            </p>
          </div>

          {/* Proposed Rate */}
          <div className="space-y-2">
            <Label htmlFor="proposed-rate">Custom rate offer (optional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="proposed-rate"
                type="number"
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
                placeholder="Offer a custom rate for this creator"
                className="pl-9"
                min={0}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to use the standard campaign rate
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitPitch.mutate()}
              disabled={!canSubmit || submitPitch.isPending}
              className="flex-1"
            >
              {submitPitch.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
