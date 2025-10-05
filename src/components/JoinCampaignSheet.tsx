import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";

interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  brand_logo_url: string;
  budget: number;
  budget_used?: number;
  rpm_rate: number;
  status: string;
  start_date: string | null;
  banner_url: string | null;
  platforms: string[];
  slug: string;
  guidelines: string | null;
  application_questions: string[];
  requires_application?: boolean;
  brands?: {
    logo_url: string;
  };
}

interface JoinCampaignSheetProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinCampaignSheet({ campaign, open, onOpenChange }: JoinCampaignSheetProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "tiktok":
        return tiktokLogo;
      case "instagram":
        return instagramLogo;
      case "youtube":
        return youtubeLogo;
      default:
        return null;
    }
  };

  const loadSocialAccounts = async () => {
    if (!campaign) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to join campaigns");
      return;
    }

    // Get all user's social accounts that match the campaign's platforms
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .in("platform", campaign.platforms.map(p => p.toLowerCase()));

    // Get accounts already connected to this campaign
    const { data: connectedAccounts } = await supabase
      .from("social_account_campaigns")
      .select("social_account_id")
      .eq("campaign_id", campaign.id);

    const connectedIds = new Set(connectedAccounts?.map(c => c.social_account_id) || []);
    
    // Filter out already connected accounts
    const availableAccounts = accounts?.filter(acc => !connectedIds.has(acc.id)) || [];
    
    setSocialAccounts(availableAccounts);
  };

  const handleSubmit = async () => {
    if (!campaign || !selectedAccount) {
      toast.error("Please select a social account");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to join campaigns");
      return;
    }

    // Validate application questions only if campaign requires application
    if (campaign.requires_application !== false && campaign.application_questions?.length > 0) {
      const unansweredQuestions = campaign.application_questions.filter(
        (q, idx) => !answers[idx]?.trim()
      );
      if (unansweredQuestions.length > 0) {
        toast.error("Please answer all application questions");
        return;
      }
    }

    setSubmitting(true);

    try {
      const account = socialAccounts.find(a => a.id === selectedAccount);
      
      // Determine submission status based on campaign type
      const submissionStatus = campaign.requires_application === false ? "approved" : "pending";
      
      // Create the campaign submission
      const { error: submissionError } = await supabase
        .from("campaign_submissions")
        .insert({
          campaign_id: campaign.id,
          creator_id: user.id,
          platform: account.platform,
          content_url: account.account_link || "",
          status: submissionStatus,
        });

      if (submissionError) throw submissionError;

      // Link the social account to the campaign
      const { error: linkError } = await supabase
        .from("social_account_campaigns")
        .insert({
          social_account_id: selectedAccount,
          campaign_id: campaign.id,
        });

      if (linkError) throw linkError;

      const successMessage = campaign.requires_application === false 
        ? "Successfully joined the campaign! This account is now connected."
        : "Application submitted successfully! This account is now connected to this campaign.";
      
      toast.success(successMessage);
      onOpenChange(false);
      navigate("/dashboard?tab=campaigns");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (!campaign) return null;

  const budgetRemaining = campaign.budget - (campaign.budget_used || 0);
  const budgetPercentage = campaign.budget > 0 ? ((campaign.budget_used || 0) / campaign.budget) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-lg overflow-y-auto"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          loadSocialAccounts();
        }}
      >
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Join Campaign</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Campaign Banner */}
          {campaign.banner_url && (
            <div className="relative w-full h-40 rounded-lg overflow-hidden">
              <img
                src={campaign.banner_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Brand Info */}
          <div className="flex items-start gap-3">
            {campaign.brand_logo_url && (
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border">
                <img
                  src={campaign.brand_logo_url}
                  alt={campaign.brand_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{campaign.title}</h3>
              <p className="text-sm text-muted-foreground">{campaign.brand_name}</p>
            </div>
          </div>

          {/* Description */}
          {campaign.description && (
            <div>
              <p className="text-sm text-muted-foreground">{campaign.description}</p>
            </div>
          )}

          {/* Budget & RPM */}
          <div className="rounded-lg p-4 space-y-3 bg-muted/50">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium">Budget Progress</span>
              <span className="text-xs text-muted-foreground">
                ${(campaign.budget_used || 0).toLocaleString()} / ${campaign.budget.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-background">
              <div
                className="h-full bg-primary transition-all duration-700"
                style={{ width: `${budgetPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <div>
                <p className="text-xs text-muted-foreground">RPM Rate</p>
                <p className="text-lg font-bold">${campaign.rpm_rate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-lg font-bold">${budgetRemaining.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Campaign Preview Button */}
          <Button
            variant="outline"
            className="w-full h-12 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
            onClick={() => navigate(`/campaigns/${campaign.slug}`)}
          >
            <span className="font-medium">View Campaign Details</span>
          </Button>

          {/* Allowed Platforms */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Allowed Platforms</h4>
            <div className="flex gap-2 flex-wrap">
              {campaign.platforms.map((platform) => {
                const platformIcon = getPlatformIcon(platform);
                return (
                  <div
                    key={platform}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-muted border border-border"
                  >
                    {platformIcon && (
                      <img src={platformIcon} alt={platform} className="w-3.5 h-3.5" />
                    )}
                    <span className="text-xs font-medium text-foreground capitalize">
                      {platform}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Account Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Social Account *</Label>
              {socialAccounts.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Can be reused across campaigns
                </p>
              )}
            </div>
            {socialAccounts.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/50 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  No available accounts for this campaign's platforms, or all your accounts are already connected to this campaign.
                </p>
                <p className="text-xs text-muted-foreground">
                  Add a new social account or check your connected accounts.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {socialAccounts.map((account) => {
                  const platformIcon = getPlatformIcon(account.platform);
                  const isSelected = selectedAccount === account.id;
                  
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedAccount(account.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-border hover:border-muted-foreground/50 bg-card"
                      }`}
                    >
                      {platformIcon && (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <img src={platformIcon} alt={account.platform} className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{account.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Application Questions - only show if campaign requires application */}
          {campaign.requires_application !== false && campaign.application_questions?.map((question, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`question-${index}`}>
                {question} *
              </Label>
              <Textarea
                id={`question-${index}`}
                value={answers[index] || ""}
                onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                placeholder="Your answer..."
                rows={3}
              />
            </div>
          ))}

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting || !selectedAccount}
            >
              {submitting 
                ? (campaign.requires_application === false ? "Joining..." : "Submitting...") 
                : (campaign.requires_application === false ? "Join Campaign" : "Submit Application")
              }
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
