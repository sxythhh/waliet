import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Loader2,
  Send,
  Plus,
  X,
  Briefcase,
  Zap,
  Check,
  ArrowRight,
  LinkIcon,
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
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
        rateLabel: `$${b.monthly_retainer}/mo`,
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
        description: `Your pitch to ${brandName} has been submitted.`,
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

  const PitchContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Pitch to {brandName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Send a collaboration request
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Opportunity Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Select opportunity
          </label>
          {loadingOpportunities ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : opportunities && opportunities.length > 0 ? (
            <div className="grid gap-2">
              {opportunities.map((opp) => {
                const isSelected = selectedOpportunity?.id === opp.id;
                return (
                  <button
                    key={`${opp.type}-${opp.id}`}
                    type="button"
                    onClick={() => setSelectedOpportunity(opp)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0",
                          opp.type === "campaign"
                            ? "bg-blue-100 dark:bg-blue-500/20"
                            : "bg-amber-100 dark:bg-amber-500/20"
                        )}>
                          {opp.type === "campaign" ? (
                            <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{opp.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{opp.rateLabel}</div>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
              No active opportunities available
            </div>
          )}
        </div>

        {/* Message */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Your pitch message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell them why you'd be a great fit. Include your experience, content style, and what makes you unique..."
            rows={5}
            className="resize-none bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Minimum 50 characters
            </p>
            <p className={cn(
              "text-xs",
              message.length >= 50 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            )}>
              {message.length}/500
            </p>
          </div>
        </div>

        {/* Portfolio Links */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Portfolio links <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <Input
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="https://..."
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={addLink}
              disabled={!newLink || portfolioLinks.length >= 5}
              className="rounded-xl flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {portfolioLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {portfolioLinks.map((link, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="pl-2.5 pr-1.5 py-1.5 gap-1.5 bg-muted hover:bg-muted rounded-lg"
                >
                  <LinkIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate max-w-[120px] text-xs">{new URL(link).hostname}</span>
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="ml-0.5 hover:bg-background rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Proposed Rate */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Proposed rate <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              value={proposedRate}
              onChange={(e) => setProposedRate(e.target.value)}
              placeholder="0.00"
              className="pl-8 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
              min={0}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Leave empty to negotiate later
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-background">
        <Button
          onClick={() => submitPitch.mutate()}
          disabled={!canSubmit || submitPitch.isPending}
          className="w-full h-11 rounded-xl font-medium gap-2"
        >
          {submitPitch.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send Pitch
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
          <PitchContent />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <PitchContent />
      </DrawerContent>
    </Drawer>
  );
}
