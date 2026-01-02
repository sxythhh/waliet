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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Send,
  Plus,
  X,
  Briefcase,
  Zap,
  DollarSign,
  Link as LinkIcon,
} from "lucide-react";

interface PitchToBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
}

interface OpportunityOption {
  id: string;
  type: "campaign" | "boost";
  title: string;
  description: string | null;
  rate: number;
  rateLabel: string;
}

export function PitchToBrandDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
}: PitchToBrandDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityOption | null>(null);
  const [message, setMessage] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [proposedRate, setProposedRate] = useState<string>("");

  // Fetch brand's active campaigns and boosts
  const { data: opportunities, isLoading: loadingOpportunities } = useQuery({
    queryKey: ["brand-opportunities", brandId],
    queryFn: async () => {
      const [campaignsRes, boostsRes] = await Promise.all([
        supabase
          .from("campaigns")
          .select("id, title, description, rpm_rate")
          .eq("brand_id", brandId)
          .eq("status", "active")
          .eq("is_private", false),
        supabase
          .from("bounty_campaigns")
          .select("id, title, description, monthly_retainer, videos_per_month")
          .eq("brand_id", brandId)
          .eq("status", "active")
          .eq("is_private", false),
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to submit a pitch");

      const pitchData = {
        type: "creator_to_brand" as const,
        creator_id: user.id,
        brand_id: brandId,
        campaign_id: selectedOpportunity?.type === "campaign" ? selectedOpportunity.id : null,
        boost_id: selectedOpportunity?.type === "boost" ? selectedOpportunity.id : null,
        message,
        portfolio_links: portfolioLinks.length > 0 ? portfolioLinks : null,
        proposed_rate: proposedRate ? parseFloat(proposedRate) : null,
      };

      const { error } = await supabase.from("pitches").insert(pitchData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Pitch sent!",
        description: `Your pitch to ${brandName} has been submitted. You'll be notified when they respond.`,
      });
      queryClient.invalidateQueries({ queryKey: ["my-pitches"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to send pitch",
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setSelectedOpportunity(null);
    setMessage("");
    setPortfolioLinks([]);
    setNewLink("");
    setProposedRate("");
  };

  const addLink = () => {
    if (newLink && portfolioLinks.length < 5) {
      try {
        new URL(newLink);
        setPortfolioLinks([...portfolioLinks, newLink]);
        setNewLink("");
      } catch {
        toast({
          variant: "destructive",
          title: "Invalid URL",
          description: "Please enter a valid URL",
        });
      }
    }
  };

  const removeLink = (index: number) => {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== index));
  };

  const canSubmit = selectedOpportunity && message.trim().length >= 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Pitch to {brandName}
          </DialogTitle>
          <DialogDescription>
            Send a pitch to work with this brand. They'll review your proposal and get back to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Opportunity Selection */}
          <div className="space-y-2">
            <Label>Select opportunity *</Label>
            {loadingOpportunities ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : opportunities && opportunities.length > 0 ? (
              <ScrollArea className="h-[180px]">
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
                No active opportunities available
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="pitch-message">Your pitch *</Label>
            <Textarea
              id="pitch-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself and explain why you'd be a great fit for this opportunity. Include your experience, content style, and what makes you unique..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500 characters (minimum 50)
            </p>
          </div>

          {/* Portfolio Links */}
          <div className="space-y-2">
            <Label>Portfolio links (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://your-portfolio.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addLink}
                disabled={!newLink || portfolioLinks.length >= 5}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {portfolioLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {portfolioLinks.map((link, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 gap-1"
                  >
                    <LinkIcon className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{new URL(link).hostname}</span>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Proposed Rate */}
          <div className="space-y-2">
            <Label htmlFor="proposed-rate">Proposed rate (optional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="proposed-rate"
                type="number"
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
                placeholder="Your proposed rate"
                className="pl-9"
                min={0}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to negotiate later or accept the listed rate
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
              Send Pitch
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
