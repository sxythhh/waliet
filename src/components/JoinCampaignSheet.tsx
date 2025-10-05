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
import { Check, ArrowUp, Plus } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import emptyAccountsImage from "@/assets/empty-accounts.png";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";

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
  preview_url?: string | null;
  is_infinite_budget?: boolean;
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
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
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

    // Reset answers when loading accounts for a new campaign
    setAnswers({});

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

    // Get active (non-withdrawn) submissions to filter out platforms
    const { data: activeSubmissions } = await supabase
      .from("campaign_submissions")
      .select("platform")
      .eq("campaign_id", campaign.id)
      .eq("creator_id", user.id)
      .neq("status", "withdrawn");

    const activePlatforms = new Set(activeSubmissions?.map(s => s.platform) || []);
    
    // Filter out accounts with active submissions for this campaign
    const availableAccounts = accounts?.filter(acc => !activePlatforms.has(acc.platform)) || [];
    
    setSocialAccounts(availableAccounts);
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSubmit = async () => {
    console.log('=== SUBMIT STARTED ===');
    console.log('Campaign:', campaign);
    console.log('Selected Accounts:', selectedAccounts);
    console.log('Answers:', answers);
    
    if (!campaign || selectedAccounts.length === 0) {
      console.log('Validation failed: No campaign or accounts');
      toast.error("Please select at least one social account");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('Validation failed: No user');
      toast.error("Please sign in to join campaigns");
      return;
    }

    // Validate application questions only if campaign requires application
    const questions = Array.isArray(campaign.application_questions) ? campaign.application_questions : [];
    console.log('Application questions:', questions);
    console.log('Requires application:', campaign.requires_application);
    
    if (campaign.requires_application !== false && questions.length > 0) {
      const unansweredQuestions = questions.filter(
        (q, idx) => {
          const answer = answers[idx];
          return !answer || answer.trim().length === 0;
        }
      );
      console.log('Unanswered questions:', unansweredQuestions);
      if (unansweredQuestions.length > 0) {
        console.log('Validation failed: Unanswered questions');
        toast.error("Please answer all application questions");
        return;
      }
    }

    console.log('All validations passed, starting submission...');
    setSubmitting(true);

    try {
      // Determine submission status based on campaign type
      const submissionStatus = campaign.requires_application === false ? "approved" : "pending";
      console.log('Submission status:', submissionStatus);
      
      // Check for existing submissions first
      const { data: existingData } = await supabase
        .from("campaign_submissions")
        .select("platform")
        .eq("campaign_id", campaign.id)
        .eq("creator_id", user.id);

      console.log('Existing submissions:', existingData);
      const existingPlatforms = new Set(existingData?.map(s => s.platform) || []);

      // Track if any submissions were actually created
      let submissionsCreated = 0;

      // Process each selected account
      for (const accountId of selectedAccounts) {
        const account = socialAccounts.find(a => a.id === accountId);
        console.log('Processing account:', account);
        
        // Skip if already submitted for this platform
        if (existingPlatforms.has(account.platform)) {
          console.log('Skipping - already submitted for platform:', account.platform);
          continue;
        }

        // Create the campaign submission with unique content_url
        const submissionData = {
          campaign_id: campaign.id,
          creator_id: user.id,
          platform: account.platform,
          content_url: account.account_link || `pending-${Date.now()}-${accountId}`,
          status: submissionStatus,
        };
        console.log('Inserting submission:', submissionData);
        
        const { data: submissionResult, error: submissionError } = await supabase
          .from("campaign_submissions")
          .insert(submissionData)
          .select();

        console.log('Submission result:', submissionResult);
        if (submissionError) {
          console.error('Submission error:', submissionError);
          throw submissionError;
        }

        // Link the social account to the campaign
        const linkData = {
          social_account_id: accountId,
          campaign_id: campaign.id,
        };
        console.log('Linking account:', linkData);
        
        const { data: linkResult, error: linkError } = await supabase
          .from("social_account_campaigns")
          .insert(linkData)
          .select();

        console.log('Link result:', linkResult);
        if (linkError) {
          console.error('Link error:', linkError);
          throw linkError;
        }

        submissionsCreated++;
      }

      console.log('=== SUBMISSION COMPLETE ===');
      console.log('Submissions created:', submissionsCreated);

      // Show appropriate message based on what happened
      if (submissionsCreated === 0) {
        toast.info("You've already applied to this campaign with the selected account(s)");
        onOpenChange(false);
        return;
      }

      const accountText = submissionsCreated === 1 ? "account is" : "accounts are";
      const successMessage = campaign.requires_application === false 
        ? `Successfully joined the campaign! ${submissionsCreated} ${accountText} now connected.`
        : `Application submitted successfully! ${submissionsCreated} ${accountText} now connected to this campaign.`;
      
      toast.success(successMessage);
      onOpenChange(false);
      navigate("/dashboard?tab=campaigns");
    } catch (error: any) {
      console.error('=== SUBMISSION FAILED ===');
      console.error('Error details:', error);
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
          {!campaign.is_infinite_budget && (
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
          )}

          {/* Campaign Preview Button - only show if preview_url exists */}
          {campaign.preview_url && (
            <Button
              variant="outline"
              className="w-full h-12 bg-muted border-0 hover:bg-muted/60 transition-colors"
              onClick={() => window.open(campaign.preview_url!, '_blank')}
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              <span className="font-medium">View Campaign Details</span>
            </Button>
          )}

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
              <Label>Select Social Accounts *</Label>
              {socialAccounts.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedAccounts.length > 0 && `${selectedAccounts.length} selected • `}
                  Can select multiple
                </p>
              )}
            </div>
            {socialAccounts.length === 0 ? (
              <div className="p-6 rounded-lg bg-muted/50 text-center space-y-3">
                <img src={emptyAccountsImage} alt="No accounts" className="w-20 h-20 mx-auto opacity-80 object-cover" />
                <p className="text-sm font-medium text-foreground">No available accounts</p>
                <Button 
                  onClick={() => setShowAddAccountDialog(true)} 
                  size="sm"
                  className="border-0"
                  style={{ backgroundColor: '#1F1F1F' }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                {socialAccounts.map((account) => {
                  const platformIcon = getPlatformIcon(account.platform);
                  const isSelected = selectedAccounts.includes(account.id);
                  
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => toggleAccountSelection(account.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-border hover:border-muted-foreground/50 bg-card"
                      }`}
                    >
                      {platformIcon && (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "bg-blue-500" : "bg-muted"
                        }`}>
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
          {campaign.requires_application !== false && Array.isArray(campaign.application_questions) && campaign.application_questions.map((question, index) => (
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
                className="min-h-[60px] border-2 border-transparent focus-visible:border-[#2663EB] focus-visible:shadow-none transition-none"
              />
            </div>
          ))}

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1 bg-muted border-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting || selectedAccounts.length === 0}
            >
              {submitting 
                ? (campaign.requires_application === false ? "Joining..." : "Submitting...") 
                : (campaign.requires_application === false ? "Join Campaign" : "Submit Application")
              }
            </Button>
          </div>
        </div>
      </SheetContent>

      <AddSocialAccountDialog 
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onSuccess={loadSocialAccounts}
      />
    </Sheet>
  );
}
