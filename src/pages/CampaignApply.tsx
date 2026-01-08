import { useState, useEffect, useCallback } from "react";
import PublicNavbar from "@/components/PublicNavbar";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { RequireContactDialog } from "@/components/RequireContactDialog";
import { ApplyToBountySheet } from "@/components/ApplyToBountySheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AuthDialog from "@/components/AuthDialog";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, ArrowUp, Plus, ArrowLeft, X, PauseCircle, UserPlus, LogIn, Bookmark, Copy, ChevronRight, Calendar, Briefcase, Film, Tag, Sparkles, DollarSign, TrendingUp, Users, Clock, Video, Wallet, Target, Zap, Globe } from "lucide-react";
import { ExampleVideosCarousel } from "@/components/ExampleVideosCarousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import { SEOHead } from "@/components/SEOHead";
import { generateCampaignSchema, getCanonicalUrl, truncateDescription } from "@/lib/seo";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import emptyAccountsImage from "@/assets/empty-accounts.png";
import { ApplicationQuestionsRenderer, validateApplicationAnswers } from "@/components/ApplicationQuestionsRenderer";
import { ApplicationAnswer, parseApplicationQuestions } from "@/types/applicationQuestions";

// Type definitions for database query results
interface BrandData {
  name: string;
  logo_url: string;
  is_verified?: boolean;
  slug?: string;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  account_link?: string;
  follower_count?: number;
  user_id: string;
}

interface HookItem {
  text?: string;
  content?: string;
}

interface TalkingPointItem {
  text?: string;
  content?: string;
}

interface DosAndDonts {
  dos?: string[];
  donts?: string[];
}

interface ExampleVideo {
  url: string;
  title?: string;
  thumbnail?: string;
}

interface BlueprintAsset {
  url: string;
  name?: string;
  type?: string;
}

interface Blueprint {
  id: string;
  title: string;
  content: string | null;
  hooks: (string | HookItem)[] | null;
  talking_points: (string | TalkingPointItem)[] | null;
  dos_and_donts: DosAndDonts | null;
  call_to_action: string | null;
  hashtags: string[] | null;
  brand_voice: string | null;
  content_guidelines: string | null;
  example_videos: ExampleVideo[] | null;
  assets: BlueprintAsset[] | null;
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
  created_at: string | null;
  banner_url: string | null;
  allowed_platforms: string[] | null;
  slug: string;
  guidelines: string | null;
  application_questions: unknown;
  requires_application: boolean;
  preview_url: string | null;
  is_infinite_budget: boolean | null;
  blueprint_id: string | null;
  brands?: {
    logo_url: string;
    is_verified?: boolean;
    name?: string;
    slug?: string;
  };
}
interface BountyCampaign {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  banner_url: string | null;
  status: string;
  blueprint_id: string | null;
  slug: string | null;
  blueprint_embed_url: string | null;
  position_type: string | null;
  availability_requirement: string | null;
  work_location: string | null;
  experience_level: string | null;
  content_type: string | null;
  categories: string[] | null;
  skills: string[] | null;
  brands?: {
    name: string;
    logo_url: string;
    is_verified?: boolean;
    slug?: string;
  };
}
export default function CampaignApply() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const {
    resolvedTheme
  } = useTheme();
  const {
    user
  } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [boostCampaign, setBoostCampaign] = useState<BountyCampaign | null>(null);
  const [boostBrand, setBoostBrand] = useState<{
    name: string;
    logo_url: string | null;
    description: string | null;
    is_verified?: boolean;
  } | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, ApplicationAnswer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasDiscord, setHasDiscord] = useState(false);
  const [isBoost, setIsBoost] = useState(false);
  const [showApplySheet, setShowApplySheet] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showMobileApplySheet, setShowMobileApplySheet] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCampaignMember, setIsCampaignMember] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [availableToConnect, setAvailableToConnect] = useState<SocialAccount[]>([]);
  
  const hasContactInfo = hasPhone || hasDiscord;

  // Fetch bookmark status when campaign/boost loads
  const fetchBookmarkStatus = useCallback(async () => {
    if (!user) return;

    if (campaign) {
      const { data } = await supabase
        .from("campaign_bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("campaign_id", campaign.id)
        .maybeSingle();
      setIsBookmarked(!!data);
    } else if (boostCampaign) {
      const { data } = await supabase
        .from("bounty_bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("bounty_campaign_id", boostCampaign.id)
        .maybeSingle();
      setIsBookmarked(!!data);
    }
  }, [user, campaign, boostCampaign]);

  useEffect(() => {
    fetchBookmarkStatus();
  }, [fetchBookmarkStatus]);

  const toggleBookmark = async () => {
    if (!user) {
      toast.error("Please sign in to bookmark");
      return;
    }

    if (campaign) {
      if (isBookmarked) {
        const { error } = await supabase
          .from("campaign_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("campaign_id", campaign.id);
        if (!error) {
          setIsBookmarked(false);
          toast.success("Bookmark removed");
        }
      } else {
        const { error } = await supabase
          .from("campaign_bookmarks")
          .insert({ user_id: user.id, campaign_id: campaign.id });
        if (!error) {
          setIsBookmarked(true);
          toast.success("Campaign bookmarked");
        }
      }
    } else if (boostCampaign) {
      if (isBookmarked) {
        const { error } = await supabase
          .from("bounty_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("bounty_campaign_id", boostCampaign.id);
        if (!error) {
          setIsBookmarked(false);
          toast.success("Bookmark removed");
        }
      } else {
        const { error } = await supabase
          .from("bounty_bookmarks")
          .insert({ user_id: user.id, bounty_campaign_id: boostCampaign.id });
        if (!error) {
          setIsBookmarked(true);
          toast.success("Boost bookmarked");
        }
      }
    }
  };

  const checkAuthAndLoadAccounts = useCallback(async (campaignData: Campaign) => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    if (!session) return;
    setLoadingAccounts(true);
    
    // Check for phone/discord contact info
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone_number, discord_id")
      .eq("id", session.user.id)
      .single();
    
    setHasPhone(!!profile?.phone_number);
    setHasDiscord(!!profile?.discord_id);
    
    const platforms = campaignData.allowed_platforms || [];
    const {
      data: accounts
    } = await supabase.from("social_accounts").select("*").eq("user_id", session.user.id).in("platform", platforms.map((p: string) => p.toLowerCase()));
    const {
      data: activeSubmissions
    } = await supabase.from("campaign_submissions").select("platform, social_accounts(id, platform, username, follower_count)").eq("campaign_id", campaignData.id).eq("creator_id", session.user.id).neq("status", "withdrawn");

    // Check if user is already a campaign member
    const isMember = (activeSubmissions?.length ?? 0) > 0;
    setIsCampaignMember(isMember);

    const activePlatforms = new Set(activeSubmissions?.map(s => s.platform) || []);
    const availableAccounts = accounts?.filter(acc => !activePlatforms.has(acc.platform)) || [];
    setSocialAccounts(availableAccounts as SocialAccount[]);

    // For members, also track which accounts are connected and which can still be connected
    if (isMember) {
      const connected = accounts?.filter(acc => activePlatforms.has(acc.platform)) || [];
      setConnectedAccounts(connected as SocialAccount[]);
      // Available to connect = accounts for allowed platforms that aren't already connected
      const allUserAccounts = await supabase.from("social_accounts").select("*").eq("user_id", session.user.id);
      const canConnect = (allUserAccounts.data || []).filter(acc =>
        platforms.map((p: string) => p.toLowerCase()).includes(acc.platform.toLowerCase()) &&
        !activePlatforms.has(acc.platform)
      );
      setAvailableToConnect(canConnect as SocialAccount[]);
    }

    setLoadingAccounts(false);
  }, []);

  const fetchCampaignData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const {
        data: campaignData,
        error
      } = await supabase.from("campaigns").select(`*, brands (name, logo_url, is_verified, slug)`).eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (campaignData) {
        setIsBoost(false);
        const brands = campaignData.brands as BrandData | null;
        const transformedCampaign: Campaign = {
          ...campaignData,
          brand_name: brands?.name || campaignData.brand_name,
          brand_logo_url: brands?.logo_url || campaignData.brand_logo_url,
          brands: brands ?? undefined
        };
        setCampaign(transformedCampaign);
        if (campaignData.blueprint_id) {
          const {
            data: blueprintData
          } = await supabase.from("blueprints").select("*").eq("id", campaignData.blueprint_id).single();
          if (blueprintData) setBlueprint(blueprintData as Blueprint);
        }
        await checkAuthAndLoadAccounts(transformedCampaign);
      } else {
        const {
          data: boostData,
          error: boostError
        } = await supabase.from("bounty_campaigns").select(`*, brands (name, logo_url, is_verified, slug)`).eq("slug", slug).maybeSingle();
        if (boostError) throw boostError;
        if (!boostData) {
          toast.error("Campaign not found");
          navigate("/dashboard");
          return;
        }
        setIsBoost(true);
        setBoostCampaign(boostData as unknown as BountyCampaign);
        const boostBrands = boostData.brands as BrandData | null;
        if (boostBrands) setBoostBrand(boostBrands);
        if (boostData.blueprint_id) {
          const {
            data: blueprintData
          } = await supabase.from("blueprints").select("*").eq("id", boostData.blueprint_id).single();
          if (blueprintData) setBlueprint(blueprintData as Blueprint);
        }
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);

        // Check if user is already a boost member
        if (session && boostData) {
          const { data: boostApplication } = await supabase
            .from("bounty_applications")
            .select("id")
            .eq("bounty_campaign_id", boostData.id)
            .eq("user_id", session.user.id)
            .neq("status", "rejected")
            .maybeSingle();
          setIsCampaignMember(!!boostApplication);
        }
      }
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [slug, navigate, checkAuthAndLoadAccounts]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

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
    setSelectedAccounts(prev => prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]);
  };
  const parseTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={e => e.stopPropagation()}>
            {part}
          </a>;
      }
      return part;
    });
  };
  const handleSubmit = async () => {
    if (!campaign || selectedAccounts.length === 0) {
      toast.error("Please select at least one social account");
      return;
    }
    
    // Check for contact info requirement
    if (!hasContactInfo) {
      setShowContactDialog(true);
      return;
    }
    
    if (campaign.status === "ended") {
      toast.error("This campaign has ended and is no longer accepting applications");
      return;
    }
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to join campaigns");
      return;
    }
    const parsedQuestions = parseApplicationQuestions(campaign.application_questions);
    if (campaign.requires_application !== false && parsedQuestions.length > 0) {
      const validation = validateApplicationAnswers(campaign.application_questions, answers);
      if (!validation.valid) {
        toast.error(`Please answer required questions: ${validation.missingRequired.join(', ')}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const submissionStatus = campaign.requires_application === false ? "approved" : "pending";
      await supabase.from("campaign_submissions").delete().eq("campaign_id", campaign.id).eq("creator_id", user.id).eq("status", "withdrawn");
      const {
        data: existingData
      } = await supabase.from("campaign_submissions").select("platform").eq("campaign_id", campaign.id).eq("creator_id", user.id).neq("status", "withdrawn");
      const existingPlatforms = new Set(existingData?.map(s => s.platform) || []);
      let submissionsCreated = 0;
      const submittedAccountsData: Array<{
        platform: string;
        username: string;
        account_link: string;
      }> = [];
      for (const accountId of selectedAccounts) {
        const account = socialAccounts.find(a => a.id === accountId);
        if (existingPlatforms.has(account.platform)) continue;
        // Store answers in new format
        const answersToStore = Object.keys(answers).length > 0 ? answers : null;
        const contentUrl = account.account_link || `pending-${Date.now()}-${accountId}`;
        const {
          error: submissionError
        } = await supabase.from("campaign_submissions").insert({
          campaign_id: campaign.id,
          creator_id: user.id,
          platform: account.platform,
          content_url: contentUrl,
          status: submissionStatus,
          application_answers: answersToStore as Record<string, ApplicationAnswer> | null
        });
        if (submissionError) throw submissionError;
        const {
          data: existingLink
        } = await supabase.from("social_account_campaigns").select("id, status").eq("social_account_id", accountId).eq("campaign_id", campaign.id).maybeSingle();
        if (!existingLink) {
          const { error: linkError } = await supabase.from("social_account_campaigns").insert({
            social_account_id: accountId,
            campaign_id: campaign.id,
            user_id: user.id,
            status: 'active'
          });
          if (linkError) throw linkError;
        } else if (existingLink.status !== 'active') {
          const { error: updateError } = await supabase.from("social_account_campaigns").update({
            status: 'active',
            disconnected_at: null
          }).eq("id", existingLink.id);
          if (updateError) throw updateError;
        }
        submissionsCreated++;
        submittedAccountsData.push({
          platform: account.platform,
          username: account.username,
          account_link: account.account_link || contentUrl
        });
      }
      if (!campaign.requires_application && submissionsCreated > 0) {
        await supabase.functions.invoke('track-campaign-user', {
          body: {
            campaignId: campaign.id,
            userId: user.id
          }
        });
      }
      if (submissionsCreated > 0) {
        const {
          data: profile
        } = await supabase.from('profiles').select('username, email').eq('id', user.id).single();
        const {
          data: brandData
        } = await supabase.from('brands').select('slug').eq('name', campaign.brand_name).single();
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
      const successMessage = campaign.requires_application === false ? `Successfully joined the campaign! ${submissionsCreated} ${accountText} now connected.` : `Application submitted successfully! ${submissionsCreated} ${accountText} now connected to this campaign.`;
      toast.success(successMessage);
      navigate("/dashboard?tab=campaigns");
    } catch (error: unknown) {
      console.error("Submission failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit application";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="flex-1 flex pt-14 overflow-hidden">
          {/* Main content skeleton */}
          <div className="flex-1 overflow-y-auto">
            {/* Banner skeleton */}
            <div className="h-48 md:h-64 bg-[#e5e5e5] dark:bg-[#0c0c0c] animate-pulse" />
            
            {/* Header section */}
            <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-16 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end gap-4 mb-8">
                <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-[#e0e0e0] dark:bg-[#111111]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-7 w-40 bg-[#e0e0e0] dark:bg-[#111111]" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24 bg-[#e0e0e0] dark:bg-[#111111]" />
                    <Skeleton className="h-5 w-16 rounded-full bg-[#e0e0e0] dark:bg-[#111111]" />
                  </div>
                </div>
              </div>
              
              {/* Stats cards skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-[#f0f0f0] dark:bg-[#0c0c0c] rounded-xl p-4">
                    <Skeleton className="h-3 w-16 mb-2 bg-[#e0e0e0] dark:bg-[#151515]" />
                    <Skeleton className="h-6 w-12 bg-[#e0e0e0] dark:bg-[#151515]" />
                  </div>)}
              </div>
              
              {/* About section skeleton */}
              <div className="mb-8">
                <Skeleton className="h-5 w-20 mb-4 bg-[#e0e0e0] dark:bg-[#111111]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-[#e5e5e5] dark:bg-[#0c0c0c]" />
                  <Skeleton className="h-4 w-full bg-[#e5e5e5] dark:bg-[#0c0c0c]" />
                  <Skeleton className="h-4 w-3/4 bg-[#e5e5e5] dark:bg-[#0c0c0c]" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar skeleton */}
          <div className="hidden lg:block w-80 border-l border-[#e0e0e0] dark:border-white/5 p-6 bg-[#f5f5f5] dark:bg-[#080808]">
            <div className="bg-[#ebebeb] dark:bg-[#0c0c0c] rounded-2xl p-5">
              <Skeleton className="h-5 w-32 mb-2 bg-[#e0e0e0] dark:bg-[#151515]" />
              <Skeleton className="h-4 w-48 mb-6 bg-[#e0e0e0] dark:bg-[#111111]" />
              <Skeleton className="h-10 w-full rounded-lg bg-[#e0e0e0] dark:bg-[#151515]" />
            </div>
          </div>
        </div>
      </div>;
  }
  if (!campaign && !boostCampaign) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Campaign not found</h1>
          <p className="text-muted-foreground mb-4">This campaign doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>;
  }

  // Get unified data
  const title = isBoost ? boostCampaign?.title : campaign?.title;
  const brandName = isBoost ? boostBrand?.name : campaign?.brand_name;
  const brandLogo = isBoost ? boostBrand?.logo_url : campaign?.brand_logo_url;
  const brandVerified = isBoost ? boostBrand?.is_verified : campaign?.brands?.is_verified;
  const brandSlug = isBoost ? boostCampaign?.brands?.slug : campaign?.brands?.slug;
  const bannerUrl = isBoost ? boostCampaign?.banner_url : campaign?.banner_url;
  const description = isBoost ? boostCampaign?.description : campaign?.description;
  const status = isBoost ? boostCampaign?.status : campaign?.status;
  const createdAt = isBoost ? boostCampaign?.created_at : campaign?.created_at;

  // SEO data
  const seoTitle = title ? `${title} - ${brandName} | Creator Opportunity` : 'Campaign';
  const seoDescription = description
    ? truncateDescription(`${title} by ${brandName}. ${description}`)
    : `Join ${title} campaign by ${brandName}. Apply now to earn as a content creator.`;
  const seoImage = bannerUrl || brandLogo || undefined;
  const campaignSchema = title && brandName && createdAt ? generateCampaignSchema({
    title,
    description: seoDescription,
    brandName,
    brandLogo: brandLogo || undefined,
    datePosted: createdAt,
    url: `/c/${slug}`,
  }) : null;

  // Handle boost with embed URL
  if (isBoost && boostCampaign?.blueprint_embed_url) {
    const isFull = boostCampaign.accepted_creators_count >= boostCampaign.max_accepted_creators;
    const availableSpots = boostCampaign.max_accepted_creators - boostCampaign.accepted_creators_count;
    const handleApplyClick = () => {
      if (!user) {
        sessionStorage.setItem('applyReturnUrl', window.location.pathname);
        navigate("/auth");
        return;
      }
      setShowApplySheet(true);
    };
    return <div className="relative h-screen w-screen overflow-hidden">
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          canonical={getCanonicalUrl(`/c/${slug}`)}
          ogImage={seoImage}
          ogType="website"
          keywords={['boost campaign', 'creator program', 'content creator', brandName || '', title || ''].filter(Boolean)}
          structuredData={campaignSchema || undefined}
        />
        <iframe src={boostCampaign.blueprint_embed_url.startsWith('http') ? boostCampaign.blueprint_embed_url : `https://${boostCampaign.blueprint_embed_url}`} className="absolute inset-0 w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Campaign Blueprint" />

        {!isFull && showFloatingMenu && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-background/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-5 max-w-sm w-[90vw]">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12 border-2 border-border">
                  <AvatarImage src={boostBrand?.logo_url || undefined} />
                  <AvatarFallback>{brandName?.charAt(0) || 'B'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{brandName}</h3>
                  <p className="text-xs text-muted-foreground">{availableSpots} spots left</p>
                </div>
                <Button size="sm" variant="ghost" className="sm:hidden" onClick={() => setShowFloatingMenu(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={handleApplyClick}>
                {user ? "Apply Now" : "Sign In to Apply"}
              </Button>
            </div>
          </div>}

        {!isFull && !showFloatingMenu && <button onClick={() => setShowFloatingMenu(true)} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 sm:hidden bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg font-medium">
            Apply Now
          </button>}

        <ApplyToBountySheet open={showApplySheet} onOpenChange={setShowApplySheet} bounty={{
        ...boostCampaign,
        brands: boostBrand ? {
          name: boostBrand.name,
          logo_url: boostBrand.logo_url || '',
          is_verified: false
        } : undefined
      }} onSuccess={() => {
        setShowApplySheet(false);
        fetchCampaignData();
      }} />
      </div>;
  }

  // Build stats array with icons
  const stats: {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    description?: string;
  }[] = [];
  if (isBoost && boostCampaign) {
    stats.push({
      label: "Monthly Pay",
      value: `$${boostCampaign.monthly_retainer.toLocaleString()}`,
      icon: <DollarSign className="h-4 w-4" />,
      color: "text-emerald-500",
      description: "Guaranteed monthly"
    });
    stats.push({
      label: "Videos",
      value: `${boostCampaign.videos_per_month}/mo`,
      icon: <Video className="h-4 w-4" />,
      color: "text-purple-500",
      description: "Content required"
    });
    const spotsLeft = boostCampaign.max_accepted_creators - boostCampaign.accepted_creators_count;
    stats.push({
      label: "Spots Left",
      value: `${spotsLeft}`,
      icon: <Users className="h-4 w-4" />,
      color: spotsLeft <= 3 ? "text-amber-500" : "text-blue-500",
      description: spotsLeft <= 3 ? "Almost full!" : `of ${boostCampaign.max_accepted_creators} spots`
    });
    if (boostCampaign.end_date) {
      stats.push({
        label: "Deadline",
        value: format(new Date(boostCampaign.end_date), 'MMM d'),
        icon: <Clock className="h-4 w-4" />,
        color: "text-orange-500",
        description: "Apply before"
      });
    }
  } else if (campaign) {
    if (!campaign.is_infinite_budget) {
      const remaining = campaign.budget - (campaign.budget_used || 0);
      const percentUsed = campaign.budget > 0 ? Math.round(((campaign.budget_used || 0) / campaign.budget) * 100) : 0;
      stats.push({
        label: "Budget Left",
        value: `$${remaining.toLocaleString()}`,
        icon: <Wallet className="h-4 w-4" />,
        color: remaining < 1000 ? "text-amber-500" : "text-emerald-500",
        description: `${percentUsed}% claimed`
      });
    }
    stats.push({
      label: "RPM Rate",
      value: `$${campaign.rpm_rate}`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-blue-500",
      description: "Per 1K views"
    });
    if (campaign.category) {
      stats.push({
        label: "Category",
        value: campaign.category,
        icon: <Target className="h-4 w-4" />,
        color: "text-purple-500"
      });
    }
    if (campaign.campaign_type) {
      stats.push({
        label: "Type",
        value: campaign.campaign_type === 'ugc' ? 'UGC' : campaign.campaign_type.charAt(0).toUpperCase() + campaign.campaign_type.slice(1),
        icon: <Zap className="h-4 w-4" />,
        color: "text-cyan-500"
      });
    }
  }
  const handleApplyClick = () => {
    if (isEnded) {
      toast.error("This boost has ended and is no longer accepting applications");
      return;
    }
    if (!user) {
      sessionStorage.setItem('applyReturnUrl', window.location.pathname);
      navigate("/auth");
      return;
    }
    if (isBoost) {
      setShowApplySheet(true);
    } else {
      setShowMobileApplySheet(true);
    }
  };
  const questions = parseApplicationQuestions(campaign?.application_questions);
  const isFull = isBoost && boostCampaign ? boostCampaign.accepted_creators_count >= boostCampaign.max_accepted_creators : false;
  const isEnded = status === "ended";
  return <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonical={getCanonicalUrl(`/c/${slug}`)}
        ogImage={seoImage}
        ogType="website"
        keywords={[
          'creator campaign',
          'content creator opportunity',
          'influencer marketing',
          brandName || '',
          title || '',
          campaign?.category || '',
        ].filter(Boolean)}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Discover', url: '/discover' },
          ...(brandSlug ? [{ name: brandName || 'Brand', url: `/b/${brandSlug}` }] : []),
          { name: title || 'Campaign', url: `/c/${slug}` },
        ]}
        structuredData={campaignSchema || undefined}
      />
      <PublicNavbar />
      
      <div className="flex-1 flex pt-14 overflow-hidden">
        {/* Left Column - Scrollable Content */}
        <div className="flex-1 overflow-y-auto lg:pr-[380px]">
          {/* Hero Banner */}
          <div className="relative">
            {bannerUrl && <div className="h-56 md:h-72 w-full overflow-hidden">
                <OptimizedImage src={bannerUrl} alt={title || ''} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              </div>}
            
            {/* Breadcrumb Navigation */}
            <div className="absolute top-4 left-4 z-10">
              <nav className="flex items-center gap-1.5 text-xs font-medium text-white/80 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 font-['Inter'] tracking-[-0.5px]">
                <Link to="/discover" className="hover:text-white transition-colors">
                  Marketplace
                </Link>
                <ChevronRight className="h-3 w-3 opacity-60" />
                {brandSlug ? (
                  <Link to={`/b/${brandSlug}`} className="hover:text-white transition-colors flex items-center gap-1.5">
                    {brandLogo && (
                      <img src={brandLogo} alt={brandName || "Brand"} className="h-4 w-4 rounded object-cover" />
                    )}
                    {brandName}
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5">
                    {brandLogo && (
                      <img src={brandLogo} alt={brandName || "Brand"} className="h-4 w-4 rounded object-cover" />
                    )}
                    {brandName}
                  </span>
                )}
                <ChevronRight className="h-3 w-3 opacity-60" />
                <span className="text-white truncate max-w-[150px]">{title}</span>
              </nav>
            </div>
          </div>

          <div className="max-w-3xl mx-auto px-4 pb-32 lg:pb-8">
            {/* Brand & Title */}
            <div className="relative -mt-16 mb-8">
              <div className="flex items-start gap-2 md:gap-4">
                <Avatar className="h-14 w-14 md:h-24 md:w-24 border-4 border-background shadow-xl ring-1 ring-border/50">
                  <AvatarImage src={brandLogo || undefined} className="object-cover" />
                  <AvatarFallback className="text-lg md:text-2xl font-bold bg-muted">{brandName?.charAt(0) || 'B'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 pb-1 md:pb-2">
                  <div className="flex items-center gap-2">
                    {brandSlug ? <Link to={`/b/${brandSlug}`} className="text-xs md:text-sm font-medium text-foreground font-['Inter'] tracking-[-0.5px] hover:underline">
                        {brandName}
                      </Link> : <span className="text-xs md:text-sm font-medium text-foreground font-['Inter'] tracking-[-0.5px]">{brandName}</span>}
                    {brandVerified && <VerifiedBadge size="sm" />}
                  </div>
                  {(campaign?.created_at || boostCampaign?.created_at) && (
                    <p className="text-[10px] md:text-xs text-muted-foreground font-['Inter'] tracking-[-0.3px]">
                      Posted on {format(new Date(campaign?.created_at || boostCampaign?.created_at || ''), 'MMM d, yyyy')}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <h1 className="text-base md:text-3xl font-bold tracking-tight">{title}</h1>
                    {isEnded ? <span className="hidden md:flex items-center gap-0.5 text-white text-[10px] font-medium px-1.5 py-0.5 font-['Inter'] tracking-[-0.5px] shrink-0" style={{
                    backgroundColor: '#b60b0b',
                    borderTop: '1px solid #ed3030',
                    borderRadius: '20px'
                  }}>
                        <PauseCircle className="h-2.5 w-2.5" fill="white" stroke="#b60b0b" />
                        Ended
                      </span> : status === 'active' ? <span className="hidden md:flex items-center gap-0.5 text-white text-[10px] font-medium px-1.5 py-0.5 font-['Inter'] tracking-[-0.5px] shrink-0" style={{
                    backgroundColor: '#1f6d36',
                    borderTop: '1px solid #3c8544',
                    borderRadius: '20px'
                  }}>
                        <img alt="" className="h-2.5 w-2.5" src="/lovable-uploads/33335174-79b4-4e03-8347-5e90e25a7659.png" />
                        Active
                      </span> : <span className="hidden md:flex items-center gap-0.5 text-white text-[10px] font-medium px-1.5 py-0.5 font-['Inter'] tracking-[-0.5px] shrink-0" style={{
                    backgroundColor: '#6b7280',
                    borderRadius: '20px'
                  }}>
                        {status}
                      </span>}
                    
                    {/* Copy & Bookmark buttons */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Link copied to clipboard");
                        }}
                        className="p-1.5 rounded-md transition-all bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground border border-border/50"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={toggleBookmark}
                        className={`p-1.5 rounded-md transition-all border border-border/50 ${isBookmarked ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"}`}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            {stats.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {stats.map((stat, i) => <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center ${stat.color}`}>
                        {stat.icon}
                      </div>
                      <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">{stat.label}</p>
                    </div>
                    <p className="text-xl font-bold font-['Inter'] tracking-[-0.5px]">{stat.value}</p>
                    {stat.description && (
                      <p className="text-[10px] text-muted-foreground font-['Inter'] tracking-[-0.3px] mt-0.5">{stat.description}</p>
                    )}
                  </div>)}
              </div>}

            {/* Platform & Requirements Section */}
            {!isBoost && campaign?.allowed_platforms && campaign.allowed_platforms.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-8 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">Platforms:</span>
                </div>
                <div className="flex items-center gap-2">
                  {campaign.allowed_platforms.map((platform) => {
                    const icon = getPlatformIcon(platform);
                    return (
                      <div key={platform} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border">
                        {icon && <img src={icon} alt={platform} className="w-4 h-4 object-contain" />}
                        <span className="text-xs font-medium font-['Inter'] tracking-[-0.5px] capitalize">{platform}</span>
                      </div>
                    );
                  })}
                </div>
                {campaign.requires_application !== false && (
                  <>
                    <div className="w-px h-4 bg-border hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Application required</span>
                    </div>
                  </>
                )}
                {campaign.requires_application === false && (
                  <>
                    <div className="w-px h-4 bg-border hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Instant join</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile Apply Card - hidden since we have sticky bottom CTA */}

            {/* Content Section */}
            <div className="space-y-8">
            {/* Description */}
            {description && <div>
                <h2 className="text-lg font-semibold mb-3">About</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap font-['Inter'] tracking-[-0.5px]">
                  {parseTextWithLinks(description)}
                </p>
              </div>}

            {/* Blueprint Content */}
            {blueprint?.content_guidelines && <div>
                <h2 className="text-lg font-semibold mb-3">Content Guidelines</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap font-['Inter'] tracking-[-0.5px]">{blueprint.content_guidelines}</p>
              </div>}

            {blueprint?.content && <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-xl prose-h1:mb-3 prose-h2:text-lg prose-h2:mb-2 prose-h3:text-base prose-h3:mb-2 prose-p:text-[13px] prose-p:leading-relaxed prose-li:text-[13px]" style={{ '--tw-prose-body': 'hsl(220 9% 40%)', '--tw-prose-invert-body': 'hsl(220 9% 60%)' } as React.CSSProperties} dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(blueprint.content)
              }} />}

            {blueprint?.hooks && blueprint.hooks.length > 0 && <div>
                <h2 className="text-lg font-semibold mb-3">Hook Ideas</h2>
                <div className="space-y-2">
                  {blueprint.hooks.map((hook: string | HookItem, i: number) => <div key={i} className="p-3 rounded-xl bg-muted/50 border border-border text-sm font-['Inter'] tracking-[-0.5px]">
                      {typeof hook === 'string' ? hook : hook.text || hook.content}
                    </div>)}
                </div>
              </div>}

            {blueprint?.talking_points && blueprint.talking_points.length > 0 && <div>
                <h2 className="text-lg font-semibold mb-3">Talking Points</h2>
                <ul className="space-y-2">
                  {blueprint.talking_points.map((point: string | TalkingPointItem, i: number) => <li key={i} className="flex items-start gap-2 text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                      <span className="text-primary mt-1">•</span>
                      <span>{typeof point === 'string' ? point : point.text || point.content}</span>
                    </li>)}
                </ul>
              </div>}

            {blueprint?.dos_and_donts && <div className="grid md:grid-cols-2 gap-4">
                {blueprint.dos_and_donts.dos?.length > 0 && <div>
                    <h2 className="text-lg font-semibold mb-3 text-green-500">Do's</h2>
                    <ul className="space-y-2">
                      {blueprint.dos_and_donts.dos.map((item: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-green-500/10 border border-green-500/20 font-['Inter'] tracking-[-0.5px]">
                          <span className="text-green-500">✓</span>
                          <span>{item}</span>
                        </li>)}
                    </ul>
                  </div>}
                {blueprint.dos_and_donts.donts?.length > 0 && <div>
                    <h2 className="text-lg font-semibold mb-3 text-red-500">Don'ts</h2>
                    <ul className="space-y-2">
                      {blueprint.dos_and_donts.donts.map((item: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-red-500/10 border border-red-500/20 font-['Inter'] tracking-[-0.5px]">
                          <span className="text-red-500">✗</span>
                          <span>{item}</span>
                        </li>)}
                    </ul>
                  </div>}
              </div>}

            {blueprint?.call_to_action && <div>
                <h2 className="text-lg font-semibold mb-3">Call to Action</h2>
                <p className="text-muted-foreground font-['Inter'] tracking-[-0.5px]">{blueprint.call_to_action}</p>
              </div>}

            {blueprint?.hashtags && blueprint.hashtags.length > 0 && <div>
                <h2 className="text-lg font-semibold mb-3">Hashtags</h2>
                <div className="flex flex-wrap gap-2">
                  {blueprint.hashtags.map((tag, i) => <Badge key={i} variant="secondary" className="font-['Inter'] tracking-[-0.5px]">#{tag.replace('#', '')}</Badge>)}
                </div>
              </div>}

            {blueprint?.brand_voice && <div>
                <h2 className="text-lg font-semibold mb-3">Brand Voice</h2>
                <p className="text-muted-foreground font-['Inter'] tracking-[-0.5px]">{blueprint.brand_voice}</p>
              </div>}

            {/* Example Videos Carousel */}
            {blueprint?.example_videos && blueprint.example_videos.length > 0 && (
              <ExampleVideosCarousel videos={blueprint.example_videos} />
            )}
            </div>
          </div>
        </div>

        {/* Right Column - Fixed Sidebar (Desktop Only) */}
        {isCampaignMember ? (
        <div className="hidden lg:flex fixed top-14 right-0 w-[380px] h-[calc(100vh-56px)] border-l border-border bg-background">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Member Status Header */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold font-['Inter'] tracking-[-0.5px] text-emerald-600 dark:text-emerald-400">You're a Member</h3>
                  <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Connected to this campaign</p>
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium font-['Inter'] tracking-[-0.5px] text-muted-foreground">Connected Accounts</h4>
                <div className="space-y-2">
                  {connectedAccounts.map(account => {
                    const platformIcon = getPlatformIcon(account.platform);
                    return (
                      <div key={account.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                        {platformIcon && <img src={platformIcon} alt={account.platform} className="w-5 h-5 object-contain" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px] truncate">{account.username}</p>
                          {account.follower_count && (
                            <p className="text-xs text-muted-foreground">{account.follower_count.toLocaleString()} followers</p>
                          )}
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Available to Connect */}
              {(availableToConnect.length > 0 || campaign?.allowed_platforms) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium font-['Inter'] tracking-[-0.5px] text-muted-foreground">Add More Accounts</h4>
                  </div>
                  {availableToConnect.length > 0 ? (
                    <div className="space-y-2">
                      {availableToConnect.map(account => {
                        const platformIcon = getPlatformIcon(account.platform);
                        const isSelected = selectedAccounts.includes(account.id);
                        return (
                          <button
                            key={account.id}
                            onClick={() => toggleAccountSelection(account.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50 bg-card"}`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/50"}`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            {platformIcon && <img src={platformIcon} alt={account.platform} className="w-5 h-5 object-contain" />}
                            <span className="text-sm font-medium font-['Inter'] tracking-[-0.5px] truncate">{account.username}</span>
                          </button>
                        );
                      })}
                      {selectedAccounts.length > 0 && (
                        <Button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="w-full mt-3 font-['Inter'] tracking-[-0.5px]"
                          style={{ backgroundColor: '#2061de', borderTop: '1px solid #4b85f7' }}
                        >
                          {submitting ? "Connecting..." : `Connect ${selectedAccounts.length} Account${selectedAccounts.length > 1 ? 's' : ''}`}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 px-4 rounded-xl bg-muted/20 border border-dashed border-border">
                      <p className="text-sm text-muted-foreground mb-3 font-['Inter'] tracking-[-0.5px]">
                        Connect another {campaign?.allowed_platforms?.join(' or ')} account
                      </p>
                      <Button size="sm" variant="outline" onClick={() => setShowAddAccountDialog(true)} className="font-['Inter'] tracking-[-0.5px]">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-4 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start font-['Inter'] tracking-[-0.5px]"
                  onClick={() => navigate('/dashboard?tab=campaigns')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  View in Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
        ) : (
        <div className="hidden lg:flex fixed top-14 right-0 w-[380px] h-[calc(100vh-56px)] border-l border-border bg-background">
          <div className="flex-1 overflow-y-auto p-6" id="desktop-apply">
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-semibold font-['Inter'] tracking-[-0.5px]">{isBoost ? 'Apply to Boost' : 'Apply to Campaign'}</h2>
                <p className="text-sm text-muted-foreground mt-1 font-['Inter'] tracking-[-0.5px]">
                  {isBoost ? 'Join this creator program' : 'Connect your accounts to get started'}
                </p>
              </div>

              {/* Boost Details */}
              {isBoost && boostCampaign && (boostCampaign.position_type || boostCampaign.availability_requirement || boostCampaign.work_location || boostCampaign.start_date || boostCampaign.experience_level || boostCampaign.content_type || boostCampaign.categories?.length || boostCampaign.skills?.length) && (
                <div className="space-y-4 p-4 rounded-xl bg-muted/30">
                  {/* Start Date */}
                  {boostCampaign.start_date && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Starts</p>
                        <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">{format(new Date(boostCampaign.start_date), 'MMMM d, yyyy')}</p>
                      </div>
                    </div>
                  )}

                  {/* Experience Level */}
                  {boostCampaign.experience_level && boostCampaign.experience_level !== 'any' && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Experience</p>
                        <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px] capitalize">{boostCampaign.experience_level}</p>
                      </div>
                    </div>
                  )}

                  {/* Content Type */}
                  {boostCampaign.content_type && boostCampaign.content_type !== 'both' && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Film className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Content Type</p>
                        <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                          {boostCampaign.content_type === 'short_form' ? 'Short Form' :
                           boostCampaign.content_type === 'long_form' ? 'Long Form' :
                           'Any Format'}
                        </p>
                      </div>
                    </div>
                  )}

                  {boostCampaign.position_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Role</span>
                      <span className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">{boostCampaign.position_type}</span>
                    </div>
                  )}
                  {boostCampaign.availability_requirement && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Availability</span>
                      <span className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                        {boostCampaign.availability_requirement === 'part_time' ? 'Part-time' :
                         boostCampaign.availability_requirement === 'full_time' ? 'Full-time' :
                         boostCampaign.availability_requirement === 'projects_gigs' ? 'Projects & Gigs' :
                         boostCampaign.availability_requirement}
                      </span>
                    </div>
                  )}
                  {boostCampaign.work_location && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Location</span>
                      <span className="text-sm font-medium font-['Inter'] tracking-[-0.5px] capitalize">{boostCampaign.work_location}</span>
                    </div>
                  )}

                  {/* Categories */}
                  {boostCampaign.categories && boostCampaign.categories.length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Categories</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {boostCampaign.categories.map((cat, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-['Inter'] tracking-[-0.5px]">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {boostCampaign.skills && boostCampaign.skills.length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Skills Needed</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {boostCampaign.skills.map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-['Inter'] tracking-[-0.5px]">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isLoggedIn ? <>
                <div className="text-center py-10 px-8 rounded-2xl bg-[#f5f5f5] dark:bg-[#0e0e0e]">
                  <h3 className="text-lg font-semibold font-['Inter'] tracking-[-0.5px] mb-2">Join to Apply</h3>
                  <p className="text-muted-foreground text-sm font-['Inter'] tracking-[-0.5px] mb-8 max-w-[260px] mx-auto leading-relaxed">
                    Create an account or sign in to apply for this {isBoost ? 'boost' : 'campaign'}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <Button onClick={() => setShowAuthDialog(true)} className="w-full font-['Inter'] tracking-[-0.5px] font-medium" size="lg">
                      Create Account
                    </Button>

                  </div>
                </div>
                <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
              </> : isBoost ? <div className="space-y-4">
                  <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">Ready to join this boost program?</p>
                  <Button 
                    className="w-full font-['Inter'] tracking-[-0.5px]" 
                    size="lg" 
                    onClick={handleApplyClick} 
                    disabled={isFull || isEnded}
                    style={{ backgroundColor: '#2061de', borderTop: '1px solid #4b85f7' }}
                  >
                    {isEnded ? 'Boost Ended' : isFull ? 'No Spots Available' : 'Start Application'}
                  </Button>
                </div> : <div className="space-y-6">
                  {/* Account Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                      Select Social Accounts <span className="text-destructive">*</span>
                    </Label>
                    
                    {loadingAccounts ? <div className="space-y-2">
                        <Skeleton className="h-14 w-full rounded-lg" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                      </div> : socialAccounts.length === 0 ? <div className="text-center py-8 px-4 rounded-xl bg-muted/20 border border-dashed border-border">
                        <img src={emptyAccountsImage} alt="No accounts" className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-muted-foreground mb-4 font-['Inter'] tracking-[-0.5px]">No matching accounts found</p>
                        <Button size="sm" variant="outline" onClick={() => setShowAddAccountDialog(true)} className="font-['Inter'] tracking-[-0.5px]">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Account
                        </Button>
                      </div> : <div className="space-y-2">
                        {socialAccounts.map(account => {
                    const isSelected = selectedAccounts.includes(account.id);
                    const platformIcon = getPlatformIcon(account.platform);
                    return <button key={account.id} onClick={() => toggleAccountSelection(account.id)} className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50 bg-card"}`}>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/50"}`}>
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              {platformIcon && <img src={platformIcon} alt={account.platform} className="w-5 h-5 object-contain flex-shrink-0" />}
                              <span className="font-medium text-sm font-['Inter'] tracking-[-0.5px] truncate">{account.username}</span>
                            </button>;
                  })}
                        <button onClick={() => setShowAddAccountDialog(true)} className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-transparent hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                          <Plus className="h-4 w-4" />
                          <span className="text-sm font-['Inter'] tracking-[-0.5px]">Add another account</span>
                        </button>
                      </div>}
                  </div>

                  {/* Application Questions */}
                  {questions.length > 0 && campaign?.requires_application !== false && (
                    <div className="space-y-4">
                      <div className="h-px bg-border" />
                      <ApplicationQuestionsRenderer
                        questions={campaign?.application_questions}
                        answers={answers}
                        onChange={setAnswers}
                        campaignId={campaign?.id}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button 
                      onClick={handleSubmit} 
                      disabled={isEnded || submitting || selectedAccounts.length === 0} 
                      className="w-full font-['Inter'] tracking-[-0.5px]" 
                      size="lg"
                      style={{ backgroundColor: '#2061de', borderTop: '1px solid #4b85f7' }}
                    >
                      {isEnded ? "Campaign Ended" : submitting ? "Submitting..." : campaign?.requires_application === false ? "Join Campaign" : "Submit Application"}
                    </Button>
                    {selectedAccounts.length === 0 && socialAccounts.length > 0 && !isEnded && <p className="text-xs text-muted-foreground text-center mt-3 font-['Inter'] tracking-[-0.5px]">
                        Select at least one account to continue
                      </p>}
                  </div>
                </div>}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Fixed bottom CTA for mobile */}
      {!isCampaignMember && !isFull && !isEnded && <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background/90 backdrop-blur-xl border-t border-border lg:hidden">
          <Button 
            className="w-full font-['Inter'] tracking-[-0.5px]" 
            size="lg" 
            onClick={handleApplyClick}
            style={{ backgroundColor: '#2061de', borderTop: '1px solid #4b85f7' }}
          >
            {user ? "Start Application" : "Sign In to Apply"}
          </Button>
        </div>}

      <AddSocialAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} onSuccess={() => {
      setShowAddAccountDialog(false);
      if (campaign) checkAuthAndLoadAccounts(campaign);
    }} />

      <RequireContactDialog 
        open={showContactDialog} 
        onOpenChange={setShowContactDialog} 
        onSuccess={() => {
          if (campaign) checkAuthAndLoadAccounts(campaign);
        }}
        hasPhone={hasPhone}
        hasDiscord={hasDiscord}
      />

      {isBoost && boostCampaign && <ApplyToBountySheet open={showApplySheet} onOpenChange={setShowApplySheet} bounty={{
      ...boostCampaign,
      brands: boostBrand ? {
        name: boostBrand.name,
        logo_url: boostBrand.logo_url || '',
        is_verified: false
      } : undefined
    }} onSuccess={() => {
      setShowApplySheet(false);
      fetchCampaignData();
    }} />}

      {/* Mobile Apply Sheet for Regular Campaigns */}
      {!isBoost && campaign && (
        <Sheet open={showMobileApplySheet} onOpenChange={setShowMobileApplySheet}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl pt-6">
            <SheetHeader className="pb-4">
              <SheetTitle className="font-['Inter'] tracking-[-0.5px]">Apply to Campaign</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100%-60px)] space-y-6 pb-8">
              {/* Account Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                  Select Social Accounts <span className="text-destructive">*</span>
                </Label>
                
                {loadingAccounts ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                  </div>
                ) : socialAccounts.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-xl bg-muted/20 border border-dashed border-border">
                    <img src={emptyAccountsImage} alt="No accounts" className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-muted-foreground mb-4 font-['Inter'] tracking-[-0.5px]">No matching accounts found</p>
                    <Button size="sm" variant="outline" onClick={() => setShowAddAccountDialog(true)} className="font-['Inter'] tracking-[-0.5px]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {socialAccounts.map(account => {
                      const isSelected = selectedAccounts.includes(account.id);
                      const platformIcon = getPlatformIcon(account.platform);
                      return (
                        <button
                          key={account.id}
                          onClick={() => toggleAccountSelection(account.id)}
                          className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50 bg-card"}`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/50"}`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          {platformIcon && <img src={platformIcon} alt={account.platform} className="w-5 h-5 object-contain flex-shrink-0" />}
                          <span className="font-medium text-sm font-['Inter'] tracking-[-0.5px] truncate">{account.username}</span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setShowAddAccountDialog(true)}
                      className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-transparent hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm font-['Inter'] tracking-[-0.5px]">Add another account</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Application Questions */}
              {questions.length > 0 && campaign?.requires_application !== false && (
                <div className="space-y-4">
                  <div className="h-px bg-border" />
                  <ApplicationQuestionsRenderer
                    questions={campaign?.application_questions}
                    answers={answers}
                    onChange={setAnswers}
                    campaignId={campaign?.id}
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <Button 
                  onClick={() => {
                    handleSubmit();
                    setShowMobileApplySheet(false);
                  }} 
                  disabled={isEnded || submitting || selectedAccounts.length === 0} 
                  className="w-full font-['Inter'] tracking-[-0.5px]" 
                  size="lg"
                  style={{ backgroundColor: '#2061de', borderTop: '1px solid #4b85f7' }}
                >
                  {isEnded ? "Campaign Ended" : submitting ? "Submitting..." : campaign?.requires_application === false ? "Join Campaign" : "Submit Application"}
                </Button>
                {selectedAccounts.length === 0 && socialAccounts.length > 0 && !isEnded && (
                  <p className="text-xs text-muted-foreground text-center mt-3 font-['Inter'] tracking-[-0.5px]">
                    Select at least one account to continue
                  </p>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>;
}