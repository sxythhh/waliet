import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowUp, Plus, Check, ExternalLink, Lightbulb, ListChecks, ThumbsUp, ThumbsDown, HelpCircle, ChevronDown, ChevronUp, Play, Eye, Heart, Share2, DollarSign, Video } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import emptyAccountsImage from "@/assets/empty-accounts.png";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { OptimizedImage } from "@/components/OptimizedImage";

interface Blueprint {
  id: string;
  title: string;
  content: string | null;
  hooks: { text: string }[] | null;
  talking_points: { text: string; checked?: boolean }[] | null;
  dos_and_donts: { dos: string[]; donts: string[] } | null;
  call_to_action: string | null;
  faqs: { question: string; answer: string }[] | null;
  hashtags: string[] | null;
  brand_voice: string | null;
  content_guidelines: string | null;
  example_videos: { url: string; title?: string }[] | null;
  assets: { name: string; url: string }[] | null;
}

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
  blueprint_id?: string | null;
  brands?: {
    name: string;
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
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());
  const [isApprovedMember, setIsApprovedMember] = useState(false);
  const [topVideos, setTopVideos] = useState<any[]>([]);

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
      loadBlueprint();
      checkMembershipAndLoadVideos();
    }
  }, [campaign]);

  const checkMembershipAndLoadVideos = async () => {
    if (!campaign || !user) return;

    try {
      // Check if user has any approved submissions for this campaign
      const { data: approvedSubmissions, error: subError } = await supabase
        .from("campaign_submissions")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("creator_id", user.id)
        .eq("status", "approved")
        .limit(1);

      if (subError) throw subError;

      const isMember = approvedSubmissions && approvedSubmissions.length > 0;
      setIsApprovedMember(isMember);

      if (isMember) {
        // Fetch top performing videos for this campaign
        const { data: videos, error: videosError } = await supabase
          .from("video_submissions")
          .select("id, video_url, video_title, video_thumbnail_url, platform, views, likes, shares, comments, payout_amount, submitted_at, video_author_username")
          .eq("source_type", "campaign")
          .eq("source_id", campaign.id)
          .eq("creator_id", user.id)
          .order("views", { ascending: false })
          .limit(10);

        if (videosError) throw videosError;
        setTopVideos(videos || []);
      }
    } catch (error) {
      console.error("Error checking membership:", error);
    }
  };

  const loadBlueprint = async () => {
    if (!campaign?.blueprint_id) {
      setBlueprint(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("blueprints")
        .select("*")
        .eq("id", campaign.blueprint_id)
        .single();

      if (error) throw error;
      setBlueprint(data as Blueprint);
    } catch (error) {
      console.error("Error loading blueprint:", error);
      setBlueprint(null);
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaqs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

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
          blueprint_id,
          brands (
            name,
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

      // Use brand data from join
      const parsedData = {
        ...data,
        brand_name: data.brands?.name || data.brand_name,
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

        // Link the social account to the campaign (check if active link exists first)
        const { data: existingLink } = await supabase
          .from("social_account_campaigns")
          .select("id, status")
          .eq("social_account_id", accountId)
          .eq("campaign_id", campaign.id)
          .maybeSingle();

        if (!existingLink) {
          // Create new link
          const { error: linkError } = await supabase
            .from("social_account_campaigns")
            .insert({
              social_account_id: accountId,
              campaign_id: campaign.id,
              user_id: user.id,
              status: 'active'
            });

          if (linkError) throw linkError;
        } else if (existingLink.status !== 'active') {
          // Reactivate disconnected link
          const { error: updateError } = await supabase
            .from("social_account_campaigns")
            .update({ status: 'active', disconnected_at: null })
            .eq("id", existingLink.id);

          if (updateError) throw updateError;
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-xl text-foreground">Campaign not found</p>
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
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard?tab=discover")}
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Campaign Header */}
        <section className="space-y-6">
          {/* Banner */}
          {campaign.banner_url && (
            <div className="aspect-[2.5/1] w-full rounded-xl overflow-hidden bg-muted">
              <OptimizedImage
                src={campaign.banner_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Brand & Title */}
          <div className="flex items-start gap-4">
            {campaign.brand_logo_url ? (
              <img
                src={campaign.brand_logo_url}
                alt={campaign.brand_name}
                className="w-14 h-14 rounded-xl object-cover ring-1 ring-border"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                <span className="text-xl font-bold text-muted-foreground">
                  {campaign.brand_name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-foreground leading-tight">
                {campaign.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {campaign.brand_name}
              </p>
            </div>
          </div>

          {/* Description */}
          {campaign.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {campaign.description}
            </p>
          )}
        </section>

        {/* Blueprint Content */}
        {blueprint && (
          <section className="space-y-6">
            {/* Hooks Section */}
            {blueprint.hooks && blueprint.hooks.length > 0 && (
              <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="text-base font-semibold">Suggested Hooks</h3>
                </div>
                <div className="space-y-2.5">
                  {blueprint.hooks.map((hook, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                      <span className="text-amber-500 font-medium text-sm mt-0.5">{idx + 1}.</span>
                      <span className="text-sm text-foreground/90 leading-relaxed">
                        {typeof hook === 'string' ? hook : hook.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Talking Points / Requirements Section */}
            {blueprint.talking_points && blueprint.talking_points.length > 0 && (
              <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <ListChecks className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="text-base font-semibold">Requirements</h3>
                </div>
                <div className="space-y-2">
                  {blueprint.talking_points.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 mt-0.5 rounded-md bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-blue-500" />
                      </div>
                      <span className="text-sm text-foreground/90 leading-relaxed">
                        {typeof point === 'string' ? point : point.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Do's & Don'ts Section */}
            {blueprint.dos_and_donts && (blueprint.dos_and_donts.dos?.length > 0 || blueprint.dos_and_donts.donts?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Do's */}
                {blueprint.dos_and_donts.dos && blueprint.dos_and_donts.dos.length > 0 && (
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <ThumbsUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h3 className="text-base font-semibold">Do's</h3>
                    </div>
                    <div className="space-y-2">
                      {blueprint.dos_and_donts.dos.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-500 mt-1">•</span>
                          <span className="text-sm text-foreground/90">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Don'ts */}
                {blueprint.dos_and_donts.donts && blueprint.dos_and_donts.donts.length > 0 && (
                  <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <ThumbsDown className="w-4 h-4 text-red-500" />
                      </div>
                      <h3 className="text-base font-semibold">Don'ts</h3>
                    </div>
                    <div className="space-y-2">
                      {blueprint.dos_and_donts.donts.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span className="text-sm text-foreground/90">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FAQs Section */}
            {blueprint.faqs && blueprint.faqs.length > 0 && (
              <div className="rounded-xl border p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-purple-500" />
                  </div>
                  <h3 className="text-base font-semibold">Frequently Asked Questions</h3>
                </div>
                <div className="space-y-2">
                  {blueprint.faqs.map((faq, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq(idx)}
                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm font-medium pr-4">{faq.question}</span>
                        {expandedFaqs.has(idx) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                      {expandedFaqs.has(idx) && (
                        <div className="px-3.5 pb-3.5 pt-0">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Call to Action */}
            {blueprint.call_to_action && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-5">
                <p className="text-sm font-medium text-center">
                  <span className="text-muted-foreground">Call to Action: </span>
                  <span className="text-foreground">{blueprint.call_to_action}</span>
                </p>
              </div>
            )}
          </section>
        )}

        {/* Stats Card */}
        {!campaign.is_infinite_budget && (
          <section className="bg-card border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Budget</span>
              <span className="text-sm font-medium tabular-nums">
                ${(campaign.budget_used || 0).toLocaleString()} / ${campaign.budget.toLocaleString()}
              </span>
            </div>
            
            <div className="h-1.5 rounded-full overflow-hidden bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">RPM Rate</p>
                <p className="text-lg font-semibold tabular-nums">${campaign.rpm_rate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Remaining</p>
                <p className="text-lg font-semibold tabular-nums">${budgetRemaining.toLocaleString()}</p>
              </div>
            </div>
          </section>
        )}

        {/* Preview Link */}
        {campaign.preview_url && (
          <Button
            variant="outline"
            className="w-full justify-between h-11"
            onClick={() => window.open(campaign.preview_url!, '_blank')}
          >
            <span>View Campaign Details</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}

        {/* Platforms */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Allowed Platforms</h2>
          <div className="flex gap-2 flex-wrap">
            {campaign.allowed_platforms.map((platform) => {
              const platformIcon = getPlatformIcon(platform);
              return (
                <div
                  key={platform}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border"
                >
                  {platformIcon && (
                    <img src={platformIcon} alt={platform} className="w-4 h-4" />
                  )}
                  <span className="text-sm capitalize">{platform}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t" />

        {/* Show Top Performing Videos for Approved Members */}
        {isApprovedMember ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Your Top Videos</h2>
                <p className="text-sm text-muted-foreground">Your best performing content in this campaign</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard?tab=campaigns")}
              >
                View All
              </Button>
            </div>

            {topVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 rounded-xl border border-dashed bg-muted/30 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Video className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">No videos submitted yet</p>
                  <p className="text-xs text-muted-foreground">Submit your first video to start earning</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {topVideos.map((video, idx) => (
                  <div
                    key={video.id}
                    className="flex gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => video.video_url && window.open(video.video_url, '_blank')}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {video.video_thumbnail_url ? (
                        <img
                          src={video.video_thumbnail_url}
                          alt={video.video_title || "Video thumbnail"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      {idx < 3 && (
                        <div className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-500 text-white' :
                          idx === 1 ? 'bg-slate-400 text-white' :
                          'bg-amber-700 text-white'
                        }`}>
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {video.video_title || video.video_author_username || "Untitled Video"}
                      </p>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{(video.views || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" />
                          <span>{(video.likes || 0).toLocaleString()}</span>
                        </div>
                        {video.shares > 0 && (
                          <div className="flex items-center gap-1">
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{video.shares.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      {video.payout_amount > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 text-emerald-500 text-xs font-medium">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>${video.payout_amount.toFixed(2)} earned</span>
                        </div>
                      )}
                    </div>

                    {/* Platform Icon */}
                    <div className="flex-shrink-0">
                      {getPlatformIcon(video.platform) && (
                        <img
                          src={getPlatformIcon(video.platform)!}
                          alt={video.platform}
                          className="w-5 h-5 opacity-60"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Stats */}
            {topVideos.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <p className="text-xs text-muted-foreground mb-1">Total Views</p>
                  <p className="text-lg font-semibold">
                    {topVideos.reduce((sum, v) => sum + (v.views || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    ${topVideos.reduce((sum, v) => sum + (v.payout_amount || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Account Selection */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">Select Accounts</h2>
                {socialAccounts.length > 0 && selectedAccounts.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedAccounts.length} selected
                  </span>
                )}
              </div>

              {socialAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-6 rounded-xl border border-dashed bg-muted/30 space-y-4">
                  <img
                    src={emptyAccountsImage}
                    alt="No accounts"
                    className="w-16 h-16 opacity-60"
                  />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">No accounts available</p>
                    <p className="text-xs text-muted-foreground">Add a social account to apply</p>
                  </div>
                  <Button onClick={handleAddAccount} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {socialAccounts.map((account) => {
                    const platformIcon = getPlatformIcon(account.platform);
                    const isSelected = selectedAccounts.includes(account.id);

                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleAccountSelection(account.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                          {platformIcon && (
                            <img src={platformIcon} alt={account.platform} className="w-10 h-10" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{account.username}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}

                  <Button
                    onClick={handleAddAccount}
                    variant="ghost"
                    className="w-full h-11 border border-dashed text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Account
                  </Button>
                </div>
              )}
            </section>

            {/* Application Questions */}
            {campaign.requires_application !== false && questions.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-foreground">Application Questions</h2>
                <div className="space-y-5">
                  {questions.map((question, index) => (
                    <div key={index} className="space-y-2">
                      <Label className="text-sm text-muted-foreground font-normal">
                        {index + 1}. {question}
                      </Label>
                      <Textarea
                        value={answers[index] || ""}
                        onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                        placeholder="Type your answer..."
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Submit */}
            <section className="pt-2 pb-8">
              <Button
                onClick={handleSubmit}
                disabled={submitting || selectedAccounts.length === 0}
                className="w-full h-12"
                size="lg"
              >
                {submitting
                  ? "Submitting..."
                  : selectedAccounts.length === 0
                    ? "Select an account to continue"
                    : `Submit Application${selectedAccounts.length > 1 ? 's' : ''}`
                }
              </Button>
            </section>
          </>
        )}
      </main>

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
