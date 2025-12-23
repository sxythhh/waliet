import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { Check, ArrowUp, Plus, Lightbulb, MessageSquare, ThumbsUp, ThumbsDown, Hash, Mic, ExternalLink, ArrowLeft } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import emptyAccountsImage from "@/assets/empty-accounts.png";

interface Blueprint {
  id: string;
  title: string;
  content: string | null;
  hooks: any[] | null;
  talking_points: any[] | null;
  dos_and_donts: any | null;
  call_to_action: string | null;
  hashtags: string[] | null;
  brand_voice: string | null;
  content_guidelines: string | null;
  example_videos: any[] | null;
  assets: any[] | null;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  campaign_type: string | null;
  category: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  budget: number;
  budget_used: number | null;
  rpm_rate: number;
  status: string | null;
  start_date: string | null;
  banner_url: string | null;
  allowed_platforms: string[] | null;
  slug: string;
  guidelines: string | null;
  application_questions: any;
  requires_application: boolean;
  preview_url: string | null;
  is_infinite_budget: boolean | null;
  blueprint_id: string | null;
  brands?: {
    logo_url: string;
    is_verified?: boolean;
    name?: string;
  };
}

export default function CampaignApply() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);

  useEffect(() => {
    fetchCampaignData();
  }, [slug]);

  const fetchCampaignData = async () => {
    if (!slug) return;
    
    setLoading(true);
    try {
      const { data: campaignData, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          brands (
            name,
            logo_url,
            is_verified
          )
        `)
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!campaignData) {
        toast.error("Campaign not found");
        navigate("/dashboard");
        return;
      }

      const transformedCampaign: Campaign = {
        ...campaignData,
        brand_name: (campaignData.brands as any)?.name || campaignData.brand_name,
        brand_logo_url: (campaignData.brands as any)?.logo_url || campaignData.brand_logo_url,
        brands: campaignData.brands as any,
      };

      setCampaign(transformedCampaign);

      // Load blueprint if available
      if (campaignData.blueprint_id) {
        const { data: blueprintData } = await supabase
          .from("blueprints")
          .select("*")
          .eq("id", campaignData.blueprint_id)
          .single();
        
        if (blueprintData) {
          setBlueprint(blueprintData as Blueprint);
        }
      }

      // Check auth and load accounts
      await checkAuthAndLoadAccounts(campaignData);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const checkAuthAndLoadAccounts = async (campaignData: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    
    if (!session) return;
    
    setLoadingAccounts(true);
    const platforms = campaignData.allowed_platforms || [];
    
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", session.user.id)
      .in("platform", platforms.map((p: string) => p.toLowerCase()));

    // Get active submissions to filter out
    const { data: activeSubmissions } = await supabase
      .from("campaign_submissions")
      .select("platform")
      .eq("campaign_id", campaignData.id)
      .eq("creator_id", session.user.id)
      .neq("status", "withdrawn");

    const activePlatforms = new Set(activeSubmissions?.map(s => s.platform) || []);
    const availableAccounts = accounts?.filter(acc => !activePlatforms.has(acc.platform)) || [];
    
    setSocialAccounts(availableAccounts);
    setLoadingAccounts(false);
  };

  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isLightMode ? tiktokLogoBlack : tiktokLogo;
      case "instagram":
        return isLightMode ? instagramLogoBlack : instagramLogo;
      case "youtube":
        return isLightMode ? youtubeLogoBlack : youtubeLogo;
      default:
        return null;
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId) 
        : [...prev, accountId]
    );
  };

  const parseTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4f89ff] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleSubmit = async () => {
    if (!campaign || selectedAccounts.length === 0) {
      toast.error("Please select at least one social account");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to join campaigns");
      return;
    }

    const questions = Array.isArray(campaign.application_questions) ? campaign.application_questions : [];
    if (campaign.requires_application !== false && questions.length > 0) {
      const unansweredQuestions = questions.filter((_, idx) => {
        const answer = answers[idx];
        return !answer || answer.trim().length === 0;
      });
      if (unansweredQuestions.length > 0) {
        toast.error("Please answer all application questions");
        return;
      }
    }

    setSubmitting(true);
    try {
      const submissionStatus = campaign.requires_application === false ? "approved" : "pending";

      // Delete any withdrawn submissions
      await supabase
        .from("campaign_submissions")
        .delete()
        .eq("campaign_id", campaign.id)
        .eq("creator_id", user.id)
        .eq("status", "withdrawn");

      const { data: existingData } = await supabase
        .from("campaign_submissions")
        .select("platform")
        .eq("campaign_id", campaign.id)
        .eq("creator_id", user.id)
        .neq("status", "withdrawn");

      const existingPlatforms = new Set(existingData?.map(s => s.platform) || []);
      let submissionsCreated = 0;
      const submittedAccountsData: Array<{ platform: string; username: string; account_link: string }> = [];

      for (const accountId of selectedAccounts) {
        const account = socialAccounts.find(a => a.id === accountId);
        if (existingPlatforms.has(account.platform)) continue;

        const formattedAnswers = campaign.application_questions?.map((question: string, index: number) => ({
          question,
          answer: answers[index] || ""
        })) || [];

        const contentUrl = account.account_link || `pending-${Date.now()}-${accountId}`;

        const { error: submissionError } = await supabase
          .from("campaign_submissions")
          .insert({
            campaign_id: campaign.id,
            creator_id: user.id,
            platform: account.platform,
            content_url: contentUrl,
            status: submissionStatus,
            application_answers: formattedAnswers
          });

        if (submissionError) throw submissionError;

        // Link social account to campaign
        const { data: existingLink } = await supabase
          .from("social_account_campaigns")
          .select("id, status")
          .eq("social_account_id", accountId)
          .eq("campaign_id", campaign.id)
          .maybeSingle();

        if (!existingLink) {
          await supabase.from("social_account_campaigns").insert({
            social_account_id: accountId,
            campaign_id: campaign.id,
            user_id: user.id,
            status: 'active'
          });
        } else if (existingLink.status !== 'active') {
          await supabase
            .from("social_account_campaigns")
            .update({ status: 'active', disconnected_at: null })
            .eq("id", existingLink.id);
        }

        submissionsCreated++;
        submittedAccountsData.push({
          platform: account.platform,
          username: account.username,
          account_link: account.account_link || contentUrl
        });
      }

      // Track accounts if auto-approved
      if (!campaign.requires_application && submissionsCreated > 0) {
        await supabase.functions.invoke('track-campaign-user', {
          body: { campaignId: campaign.id, userId: user.id }
        });
      }

      // Send notification
      if (submissionsCreated > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('id', user.id)
          .single();

        const { data: brandData } = await supabase
          .from('brands')
          .select('slug')
          .eq('name', campaign.brand_name)
          .single();

        const formattedAnswers = campaign.application_questions?.map((question: string, index: number) => ({
          question,
          answer: answers[index] || ""
        })) || [];

        await supabase.functions.invoke('notify-campaign-application', {
          body: {
            username: profile?.username || 'Unknown',
            email: profile?.email || 'Unknown',
            campaign_name: campaign.title,
            campaign_slug: campaign.slug,
            brand_name: campaign.brand_name,
            brand_slug: brandData?.slug || '',
            brand_logo_url: campaign.brand_logo_url || '',
            social_accounts: submittedAccountsData,
            application_answers: formattedAnswers,
            submitted_at: new Date().toISOString()
          }
        });
      }

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
      console.error("Submission failed:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="h-[600px] rounded-2xl" />
            <Skeleton className="h-[600px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Campaign not found</h1>
          <p className="text-muted-foreground mb-4">This campaign doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const budgetRemaining = campaign.budget - (campaign.budget_used || 0);
  const questions = Array.isArray(campaign.application_questions) ? campaign.application_questions : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Side - Campaign Details */}
          <div className="space-y-6">
            {/* Banner */}
            {campaign.banner_url && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
                <OptimizedImage
                  src={campaign.banner_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Brand Info */}
            <div className="flex items-start gap-4">
              {campaign.brand_logo_url && (
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-border">
                  <img
                    src={campaign.brand_logo_url}
                    alt={campaign.brand_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-foreground font-medium">{campaign.brand_name}</span>
                  {campaign.brands?.is_verified && <VerifiedBadge size="sm" />}
                </div>
                <h1 className="text-3xl font-bold">{campaign.title}</h1>
                {(campaign.campaign_type || campaign.category) && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {campaign.campaign_type && (
                      <span className="px-3 py-1.5 text-xs font-medium bg-[#2060df]/15 text-[#4f89ff] rounded-full">
                        {campaign.campaign_type.charAt(0).toUpperCase() + campaign.campaign_type.slice(1)}
                      </span>
                    )}
                    {campaign.category && (
                      <span className="px-3 py-1.5 text-xs font-medium bg-muted/50 text-muted-foreground rounded-full">
                        {campaign.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Budget & RPM - only show if not infinite */}
            {!campaign.is_infinite_budget && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Budget Remaining</p>
                  <p className="text-xl font-bold">${budgetRemaining.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">RPM Rate</p>
                  <p className="text-xl font-bold">${campaign.rpm_rate}</p>
                </div>
              </div>
            )}

            {/* Description */}
            {campaign.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">About</h3>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {parseTextWithLinks(campaign.description)}
                </p>
              </div>
            )}

            {/* Blueprint Content */}
            {blueprint?.content && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Content Brief
                </h3>
                <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-muted/30 border border-border/50">
                  {blueprint.content}
                </div>
              </div>
            )}

            {/* Hooks */}
            {blueprint?.hooks && blueprint.hooks.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Hook Ideas
                </h3>
                <div className="space-y-2">
                  {blueprint.hooks.map((hook: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-muted/30 border border-border/50 text-sm">
                      {typeof hook === 'string' ? hook : hook.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Talking Points */}
            {blueprint?.talking_points && blueprint.talking_points.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Talking Points
                </h3>
                <div className="space-y-2">
                  {blueprint.talking_points.map((point: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-muted/30 border border-border/50 text-sm flex items-start gap-2">
                      <span className="text-[#4f89ff] font-medium">•</span>
                      {typeof point === 'string' ? point : point.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Do's and Don'ts */}
            {blueprint?.dos_and_donts && (
              <div className="grid grid-cols-2 gap-4">
                {blueprint.dos_and_donts.dos?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-green-500 flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4" />
                      Do's
                    </h3>
                    <div className="space-y-2">
                      {blueprint.dos_and_donts.dos.map((item: string, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {blueprint.dos_and_donts.donts?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-red-500 flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4" />
                      Don'ts
                    </h3>
                    <div className="space-y-2">
                      {blueprint.dos_and_donts.donts.map((item: string, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hashtags */}
            {blueprint?.hashtags && blueprint.hashtags.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Hashtags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {blueprint.hashtags.map((tag: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 text-xs font-medium bg-[#2060df]/15 text-[#4f89ff] rounded-full">
                      #{tag.replace('#', '')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Application Form */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-lg">
              <h2 className="text-xl font-bold mb-6">Apply to Campaign</h2>

              {!isLoggedIn ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Sign in to apply to this campaign</p>
                  <Button onClick={() => navigate(`/auth?redirect=/campaign/${slug}/apply`)}>
                    Sign In
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Account Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Select Social Accounts <span className="text-destructive">*</span>
                    </Label>
                    
                    {loadingAccounts ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : socialAccounts.length === 0 ? (
                      <div className="text-center py-6 bg-muted/30 rounded-xl border border-dashed border-border">
                        <img src={emptyAccountsImage} alt="No accounts" className="w-16 h-16 mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground mb-3">No matching accounts found</p>
                        <Button size="sm" variant="outline" onClick={() => setShowAddAccountDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Account
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {socialAccounts.map((account) => {
                          const isSelected = selectedAccounts.includes(account.id);
                          const platformIcon = getPlatformIcon(account.platform);
                          
                          return (
                            <button
                              key={account.id}
                              onClick={() => toggleAccountSelection(account.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? "border-[#4f89ff] bg-[#4f89ff]/10"
                                  : "border-border hover:border-[#4f89ff]/50"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? "border-[#4f89ff] bg-[#4f89ff]" : "border-muted-foreground"
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              {platformIcon && (
                                <img src={platformIcon} alt={account.platform} className="w-5 h-5 object-contain" />
                              )}
                              <span className="font-medium text-sm">{account.username}</span>
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setShowAddAccountDialog(true)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-[#4f89ff]/50 transition-all text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="text-sm">Add another account</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Application Questions */}
                  {questions.length > 0 && campaign.requires_application !== false && (
                    <div className="space-y-4">
                      {questions.map((question: string, idx: number) => (
                        <div key={idx} className="space-y-2">
                          <Label className="text-sm font-medium">
                            {question} <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            value={answers[idx] || ""}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                            placeholder="Your answer..."
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
                    className="w-full h-12 text-base font-medium"
                  >
                    {submitting ? "Submitting..." : campaign.requires_application === false ? "Join Campaign" : "Submit Application"}
                    <ArrowUp className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddSocialAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onSuccess={() => {
          setShowAddAccountDialog(false);
          if (campaign) {
            checkAuthAndLoadAccounts(campaign);
          }
        }}
      />
    </div>
  );
}
