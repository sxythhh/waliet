import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { OptimizedImage } from "@/components/OptimizedImage";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  budget: number;
  budget_used: number | null;
  status: string | null;
  is_infinite_budget: boolean | null;
}

interface CampaignBudgetAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedCampaign?: Campaign | null;
}

export function CampaignBudgetAdjustmentDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedCampaign,
}: CampaignBudgetAdjustmentDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease" | "set">("increase");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && preselectedCampaign) {
      setSelectedCampaign(preselectedCampaign);
    }
  }, [open, preselectedCampaign]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setSearchTerm("");
      setCampaigns([]);
      if (!preselectedCampaign) {
        setSelectedCampaign(null);
      }
      setAdjustmentType("increase");
      setAmount("");
      setReason("");
    }
  }, [open, preselectedCampaign]);

  const searchCampaigns = async (term: string) => {
    if (term.length < 2) {
      setCampaigns([]);
      return;
    }

    setSearching(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, title, brand_name, brand_logo_url, budget, budget_used, status, is_infinite_budget")
      .or(`title.ilike.%${term}%,brand_name.ilike.%${term}%`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setCampaigns(data);
    }
    setSearching(false);
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchTerm) {
        searchCampaigns(searchTerm);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSubmit = async () => {
    if (!selectedCampaign || !reason.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select a campaign and provide a reason for the adjustment.",
      });
      return;
    }

    const adjustmentAmount = parseFloat(amount);
    if (isNaN(adjustmentAmount) || adjustmentAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid positive amount.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const requestBody: any = {
        campaign_id: selectedCampaign.id,
        reason: reason.trim(),
        adjustment_type: adjustmentType,
      };

      if (adjustmentType === "set") {
        requestBody.new_budget_used = adjustmentAmount;
      } else {
        requestBody.adjustment_amount = adjustmentAmount;
      }

      const { data, error } = await supabase.functions.invoke("adjust-campaign-budget", {
        body: requestBody,
      });

      if (error) throw error;

      toast({
        title: "Budget adjusted successfully",
        description: `${selectedCampaign.title}: $${data.adjustment.budget_before.toFixed(2)} → $${data.adjustment.budget_after.toFixed(2)}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error adjusting budget:", error);
      toast({
        variant: "destructive",
        title: "Failed to adjust budget",
        description: error.message || "An error occurred while adjusting the budget.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentBudgetUsed = selectedCampaign?.budget_used ?? 0;
  const totalBudget = selectedCampaign?.budget ?? 0;
  const budgetPercentage = totalBudget > 0 ? Math.min((currentBudgetUsed / totalBudget) * 100, 100) : 0;

  const getPreviewAmount = () => {
    const amt = parseFloat(amount) || 0;
    if (adjustmentType === "set") return amt;
    if (adjustmentType === "increase") return currentBudgetUsed + amt;
    return Math.max(0, currentBudgetUsed - amt);
  };

  const previewAmount = getPreviewAmount();
  const previewPercentage = totalBudget > 0 ? Math.min((previewAmount / totalBudget) * 100, 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            Adjust Campaign Budget
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.5px]">
            Manually adjust the used budget for a campaign. All adjustments are logged in the transaction history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Campaign Search/Selection */}
          {!selectedCampaign ? (
            <div className="space-y-3">
              <Label className="font-inter tracking-[-0.5px]">Search Campaign</Label>
              <div className="relative">
                <Input
                  placeholder="Search by campaign or brand name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="font-inter tracking-[-0.5px]"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {campaigns.length > 0 && (
                <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setCampaigns([]);
                        setSearchTerm("");
                      }}
                      className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      {campaign.brand_logo_url ? (
                        <OptimizedImage
                          src={campaign.brand_logo_url}
                          alt={campaign.brand_name}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">{campaign.brand_name?.[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate font-inter tracking-[-0.5px]">{campaign.title}</p>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">{campaign.brand_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium font-inter tracking-[-0.5px]">
                          ${(campaign.budget_used ?? 0).toLocaleString()} / ${campaign.budget.toLocaleString()}
                        </p>
                        <Badge variant="secondary" className="text-[10px] capitalize">{campaign.status}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected Campaign Display */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedCampaign.brand_logo_url ? (
                      <OptimizedImage
                        src={selectedCampaign.brand_logo_url}
                        alt={selectedCampaign.brand_name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">{selectedCampaign.brand_name?.[0]}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold font-inter tracking-[-0.5px]">{selectedCampaign.title}</p>
                      <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">{selectedCampaign.brand_name}</p>
                    </div>
                  </div>
                  {!preselectedCampaign && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCampaign(null)} className="font-inter tracking-[-0.5px]">
                      Change
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-inter tracking-[-0.5px]">Current Budget Used</span>
                    <span className="font-semibold font-inter tracking-[-0.5px]">
                      ${currentBudgetUsed.toLocaleString()} / ${totalBudget.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={budgetPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right font-inter tracking-[-0.5px]">
                    {budgetPercentage.toFixed(1)}% used
                  </p>
                </div>
              </div>

              {/* Adjustment Type */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Adjustment Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setAdjustmentType("increase")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all font-inter tracking-[-0.5px]",
                      adjustmentType === "increase"
                        ? "bg-foreground text-background"
                        : "bg-muted/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="text-sm font-medium">Increase</span>
                  </button>
                  <button
                    onClick={() => setAdjustmentType("decrease")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all font-inter tracking-[-0.5px]",
                      adjustmentType === "decrease"
                        ? "bg-foreground text-background"
                        : "bg-muted/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="text-sm font-medium">Decrease</span>
                  </button>
                  <button
                    onClick={() => setAdjustmentType("set")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all font-inter tracking-[-0.5px]",
                      adjustmentType === "set"
                        ? "bg-foreground text-background"
                        : "bg-muted/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="text-sm font-medium">Set To</span>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">
                  {adjustmentType === "set" ? "New Budget Used Amount" : "Adjustment Amount"}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-inter">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7 font-inter tracking-[-0.5px]"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium font-inter tracking-[-0.5px]">Preview</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-inter tracking-[-0.5px]">New Budget Used</span>
                    <span className="font-semibold font-inter tracking-[-0.5px]">
                      ${previewAmount.toLocaleString()} / ${totalBudget.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={previewPercentage}
                    className={cn("h-2", previewPercentage > 100 && "[&>div]:bg-destructive")}
                  />
                  <p className="text-xs text-muted-foreground text-right font-inter tracking-[-0.5px]">
                    {previewPercentage.toFixed(1)}% {previewPercentage > 100 && "(over budget)"}
                  </p>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Reason for Adjustment *</Label>
                <Textarea
                  placeholder="Explain why this adjustment is being made..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="font-inter tracking-[-0.5px]"
                />
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  This will be logged in the transaction history for audit purposes.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 font-inter tracking-[-0.5px]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCampaign || !amount || !reason.trim() || submitting}
            className="flex-1 font-inter tracking-[-0.5px]"
          >
            {submitting ? "Adjusting..." : "Apply Adjustment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
