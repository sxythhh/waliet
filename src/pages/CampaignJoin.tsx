import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowUp, Plus } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo.png";
import youtubeLogo from "@/assets/youtube-logo.png";
import emptyAccountsImage from "@/assets/empty-accounts.png";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { OptimizedImage } from "@/components/OptimizedImage";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  budget_used?: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  guidelines: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  allowed_platforms: string[];
  slug: string;
  application_questions: string[];
  requires_application?: boolean;
  preview_url?: string | null;
  is_infinite_budget?: boolean;
  brand_id?: string;
  brands?: {
    logo_url: string;
    slug: string;
  };
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number;
  is_verified: boolean;
  account_link: string | null;
}

export default function CampaignJoin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    fetchCampaign();
  }, [slug]);

  useEffect(() => {
    if (campaign) {
      loadSocialAccounts();
    }
  }, [campaign]);

  const loadSocialAccounts = async () => {
    if (!campaign) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to join campaigns");
      navigate("/auth");
      return;
    }

    // Get all user's social accounts that match the campaign's platforms
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .in("platform", campaign.allowed_platforms.map(p => p.toLowerCase()));

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

  const fetchCampaign = async () => {
    if (!slug) return;
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          brands (
            logo_url,
            slug
          )
        `)
        .eq("slug", slug)
        .in("status", ["active", "ended"])
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Campaign not found");
        return;
      }

      // Add brand logo
      const parsedData = {
        ...data,
        brand_logo_url: data.brands?.logo_url || data.brand_logo_url,
        application_questions: Array.isArray(data.application_questions) ? data.application_questions : []
      };
      setCampaign(parsedData as Campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSubmit = async () => {
    if (!campaign || selectedAccounts.length === 0) {
      toast.error("Please select at least one social account");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to join campaigns");
      navigate("/auth");
      return;
    }

    // Validate application questions only if campaign requires application
    const questions = campaign.application_questions || [];
    
    if (campaign.requires_application !== false && questions.length > 0) {
      const unansweredQuestions = questions.filter(
        (q, idx) => {
          const answer = answers[idx];
          return !answer || answer.trim().length === 0;
        }
      );
      if (unansweredQuestions.length > 0) {
        toast.error("Please answer all application questions");
        return;
      }
    }

    setSubmitting(true);

    try {
      // Determine submission status based on campaign type
      const submissionStatus = campaign.requires_application === false ? "approved" : "pending";
      
      // Check for existing submissions first (excluding withdrawn)
      const { data: existingData } = await supabase
        .from("campaign_submissions")
        .select("platform")
        .eq("campaign_id", campaign.id)
        .eq("creator_id", user.id)
        .neq("status", "withdrawn");

      const existingPlatforms = new Set(existingData?.map(s => s.platform) || []);

      // Track if any submissions were actually created
      let submissionsCreated = 0;
      const submittedAccountsData: Array<{ platform: string; username: string; account_link: string }> = [];

      // Process each selected account
      for (const accountId of selectedAccounts) {
        const account = socialAccounts.find(a => a.id === accountId);
        if (!account) continue;
        
        // Skip if already submitted for this platform
        if (existingPlatforms.has(account.platform)) {
          continue;
        }

        // Format application answers
        const formattedAnswers = campaign.application_questions?.map((question, index) => ({
          question,
          answer: answers[index] || ""
        })) || [];

        const contentUrl = account.account_link || `pending-${Date.now()}-${accountId}`;

        // Check if there's a withdrawn submission we can reuse
        const { data: withdrawnSubmission } = await supabase
          .from("campaign_submissions")
          .select("id")
          .eq("campaign_id", campaign.id)
          .eq("creator_id", user.id)
          .eq("content_url", contentUrl)
          .eq("status", "withdrawn")
          .maybeSingle();

        if (withdrawnSubmission) {
          // Update the withdrawn submission
          const { error: updateError } = await supabase
            .from("campaign_submissions")
            .update({
              status: submissionStatus,
              application_answers: formattedAnswers,
              content_url: contentUrl,
              submitted_at: new Date().toISOString(),
            })
            .eq("id", withdrawnSubmission.id);

          if (updateError) throw updateError;
        } else {
          // Create new submission
          const { error: submissionError } = await supabase
            .from("campaign_submissions")
            .insert({
              campaign_id: campaign.id,
              creator_id: user.id,
              platform: account.platform,
              content_url: contentUrl,
              status: submissionStatus,
              application_answers: formattedAnswers,
            });

          if (submissionError) throw submissionError;
        }

        // Link the social account to the campaign
        const { data: existingLink } = await supabase
          .from("social_account_campaigns")
          .select("id")
          .eq("social_account_id", accountId)
          .eq("campaign_id", campaign.id)
          .maybeSingle();

        if (!existingLink) {
          const { error: linkError } = await supabase
            .from("social_account_campaigns")
            .insert({
              social_account_id: accountId,
              campaign_id: campaign.id,
            });

          if (linkError) throw linkError;
        }

        submissionsCreated++;
        submittedAccountsData.push({
          platform: account.platform,
          username: account.username,
          account_link: account.account_link || contentUrl
        });
      }

      // Send Discord notification if submissions were created
      if (submissionsCreated > 0) {
        try {
          console.log('Preparing to send Discord notification...');
          
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, email')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
          }

          // Get brand slug
          const { data: brandData, error: brandError } = await supabase
            .from('brands')
            .select('slug')
            .eq('id', campaign.brand_id)
            .single();

          if (brandError) {
            console.error('Brand fetch error:', brandError);
          }

          const brandSlug = brandData?.slug || '';
          console.log('Brand slug:', brandSlug);

          const formattedAnswers = campaign.application_questions?.map((question, index) => ({
            question,
            answer: answers[index] || ""
          })) || [];

          console.log('Invoking edge function with data:', {
            username: profile?.username,
            campaign_name: campaign.title,
            brand_slug: brandSlug,
            accounts_count: submittedAccountsData.length
          });

          const { data: functionData, error: functionError } = await supabase.functions.invoke('notify-campaign-application', {
            body: {
              username: profile?.username || 'Unknown',
              email: profile?.email || 'Unknown',
              campaign_name: campaign.title,
              campaign_slug: campaign.slug,
              brand_name: campaign.brand_name,
              brand_slug: brandSlug,
              brand_logo_url: campaign.brand_logo_url || '',
              social_accounts: submittedAccountsData,
              application_answers: formattedAnswers,
              submitted_at: new Date().toISOString()
            }
          });

          if (functionError) {
            console.error('Edge function error:', functionError);
          } else {
            console.log('Discord notification sent successfully:', functionData);
          }
        } catch (webhookError) {
          console.error('Failed to send Discord notification:', webhookError);
          // Don't fail the submission if webhook fails
        }
      }

      // Show appropriate message based on what happened
      if (submissionsCreated === 0) {
        toast.info("You've already applied to this campaign with the selected account(s)");
        return;
      }

      const accountText = submissionsCreated === 1 ? "account is" : "accounts are";
      const successMessage = campaign.requires_application === false 
        ? `Successfully joined the campaign! ${submissionsCreated} ${accountText} now connected.`
        : `Application submitted successfully! ${submissionsCreated} ${accountText} now connected to this campaign.`;
      
      toast.success(successMessage);
      navigate("/dashboard?tab=campaigns");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAccount = () => {
    setShowAddAccountDialog(true);
  };

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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4">Campaign not found</div>
          <Button onClick={() => navigate("/dashboard?tab=discover")}>
            Browse Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const budgetRemaining = campaign.budget - (campaign.budget_used || 0);
  const budgetPercentage = campaign.budget > 0 ? ((campaign.budget_used || 0) / campaign.budget) * 100 : 0;
  const questions = campaign.application_questions || [];

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-background">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard?tab=discover")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Campaign Banner */}
          {campaign.banner_url && (
            <div className="relative w-full h-48 rounded-2xl overflow-hidden">
              <OptimizedImage
                src={campaign.banner_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Brand Info */}
          <div className="flex items-start gap-3">
            {campaign.brand_logo_url && (
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-border">
                <img
                  src={campaign.brand_logo_url}
                  alt={campaign.brand_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{campaign.title}</h1>
              <p className="text-muted-foreground">{campaign.brand_name}</p>
            </div>
          </div>

          {/* Description */}
          {campaign.description && (
            <div>
              <p className="text-muted-foreground">{campaign.description}</p>
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

          {/* Campaign Preview Button */}
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
              {campaign.allowed_platforms.map((platform) => {
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
                  onClick={handleAddAccount} 
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
                          <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
                <Button 
                  onClick={handleAddAccount} 
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Account
                </Button>
              </div>
            )}
          </div>

          {/* Application Questions */}
          {campaign.requires_application !== false && questions.length > 0 && (
            <div className="space-y-4">
              <Label>Application Questions *</Label>
              {questions.map((question, index) => (
                <div key={index} className="space-y-2">
                  <Label className="text-sm font-normal">
                    {index + 1}. {question}
                  </Label>
                  <Textarea
                    value={answers[index] || ""}
                    onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                    placeholder="Type your answer here..."
                    className="min-h-[100px] resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedAccounts.length === 0}
            className="w-full h-12"
            size="lg"
          >
            {submitting ? "Submitting..." : `Submit Application${selectedAccounts.length > 1 ? 's' : ''} (${selectedAccounts.length})`}
          </Button>
        </div>
      </div>

      <AddSocialAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onSuccess={() => {
          loadSocialAccounts();
          setShowAddAccountDialog(false);
        }}
      />
    </div>
  );
}