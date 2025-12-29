import { useState, useEffect } from "react";
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
import { ApplyToBountySheet } from "@/components/ApplyToBountySheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AuthDialog from "@/components/AuthDialog";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, ArrowUp, Plus, ArrowLeft, X, PauseCircle, UserPlus, LogIn, Bookmark, Copy, ChevronRight } from "lucide-react";
import { ExampleVideosCarousel } from "@/components/ExampleVideosCarousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import DOMPurify from "dompurify";
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
  created_at: string | null;
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
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{
    [key: string]: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [isBoost, setIsBoost] = useState(false);
  const [showApplySheet, setShowApplySheet] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showMobileApplySheet, setShowMobileApplySheet] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCampaignMember, setIsCampaignMember] = useState(false);
  useEffect(() => {
    fetchCampaignData();
  }, [slug]);

  // Fetch bookmark status when campaign/boost loads
  useEffect(() => {
    const fetchBookmarkStatus = async () => {
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
    };
    fetchBookmarkStatus();
  }, [user, campaign, boostCampaign]);

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
  const fetchCampaignData = async () => {
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
        const transformedCampaign: Campaign = {
          ...campaignData,
          brand_name: (campaignData.brands as any)?.name || campaignData.brand_name,
          brand_logo_url: (campaignData.brands as any)?.logo_url || campaignData.brand_logo_url,
          brands: campaignData.brands as any
        };
        setCampaign(transformedCampaign);
        if (campaignData.blueprint_id) {
          const {
            data: blueprintData
          } = await supabase.from("blueprints").select("*").eq("id", campaignData.blueprint_id).single();
          if (blueprintData) setBlueprint(blueprintData as Blueprint);
        }
        await checkAuthAndLoadAccounts(campaignData);
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
        setBoostCampaign(boostData as BountyCampaign);
        if (boostData.brands) setBoostBrand(boostData.brands as any);
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
  };
  const checkAuthAndLoadAccounts = async (campaignData: any) => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    if (!session) return;
    setLoadingAccounts(true);
    const platforms = campaignData.allowed_platforms || [];
    const {
      data: accounts
    } = await supabase.from("social_accounts").select("*").eq("user_id", session.user.id).in("platform", platforms.map((p: string) => p.toLowerCase()));
    const {
      data: activeSubmissions
    } = await supabase.from("campaign_submissions").select("platform").eq("campaign_id", campaignData.id).eq("creator_id", session.user.id).neq("status", "withdrawn");
    
    // Check if user is already a campaign member
    setIsCampaignMember((activeSubmissions?.length ?? 0) > 0);
    
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
    const questions = Array.isArray(campaign.application_questions) ? campaign.application_questions : [];
    if (campaign.requires_application !== false && questions.length > 0) {
      const unansweredQuestions = questions.filter((_, idx) => !answers[idx]?.trim());
      if (unansweredQuestions.length > 0) {
        toast.error("Please answer all application questions");
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
        const formattedAnswers = campaign.application_questions?.map((question: string, index: number) => ({
          question,
          answer: answers[index] || ""
        })) || [];
        const contentUrl = account.account_link || `pending-${Date.now()}-${accountId}`;
        const {
          error: submissionError
        } = await supabase.from("campaign_submissions").insert({
          campaign_id: campaign.id,
          creator_id: user.id,
          platform: account.platform,
          content_url: contentUrl,
          status: submissionStatus,
          application_answers: formattedAnswers
        });
        if (submissionError) throw submissionError;
        const {
          data: existingLink
        } = await supabase.from("social_account_campaigns").select("id, status").eq("social_account_id", accountId).eq("campaign_id", campaign.id).maybeSingle();
        if (!existingLink) {
          await supabase.from("social_account_campaigns").insert({
            social_account_id: accountId,
            campaign_id: campaign.id,
            user_id: user.id,
            status: 'active'
          });
        } else if (existingLink.status !== 'active') {
          await supabase.from("social_account_campaigns").update({
            status: 'active',
            disconnected_at: null
          }).eq("id", existingLink.id);
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
    } catch (error: any) {
      console.error("Submission failed:", error);
      toast.error(error.message || "Failed to submit application");
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

  // Build stats array
  const stats: {
    label: string;
    value: string;
  }[] = [];
  if (isBoost && boostCampaign) {
    stats.push({
      label: "Monthly",
      value: `$${boostCampaign.monthly_retainer}`
    });
    stats.push({
      label: "Videos/mo",
      value: `${boostCampaign.videos_per_month}`
    });
    const spotsLeft = boostCampaign.max_accepted_creators - boostCampaign.accepted_creators_count;
    stats.push({
      label: "Spots Left",
      value: `${spotsLeft}`
    });
    if (boostCampaign.end_date) {
      stats.push({
        label: "Ends",
        value: format(new Date(boostCampaign.end_date), 'MMM d')
      });
    }
  } else if (campaign && !campaign.is_infinite_budget) {
    const remaining = campaign.budget - (campaign.budget_used || 0);
    stats.push({
      label: "Budget Left",
      value: `$${remaining.toLocaleString()}`
    });
    stats.push({
      label: "RPM Rate",
      value: `$${campaign.rpm_rate}`
    });
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
  const questions = campaign ? Array.isArray(campaign.application_questions) ? campaign.application_questions : [] : [];
  const isFull = isBoost && boostCampaign ? boostCampaign.accepted_creators_count >= boostCampaign.max_accepted_creators : false;
  const isEnded = status === "ended";
  return <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <PublicNavbar />
      
      <div className="flex-1 flex pt-14 overflow-hidden">
        {/* Left Column - Scrollable Content */}
        <div className="flex-1 overflow-y-auto lg:pr-[380px]">
          {/* Hero Banner */}
          <div className="relative">
            {bannerUrl ? <div className="h-56 md:h-72 w-full overflow-hidden">
                <OptimizedImage src={bannerUrl} alt={title || ''} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              </div> : <div className="h-40 md:h-56 w-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />}
            
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
                      <img src={brandLogo} alt="" className="h-4 w-4 rounded object-cover" />
                    )}
                    {brandName}
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5">
                    {brandLogo && (
                      <img src={brandLogo} alt="" className="h-4 w-4 rounded object-cover" />
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
            {stats.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {stats.map((stat, i) => <div key={i} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">{stat.label}</p>
                    <p className="text-xl font-bold font-['Inter'] tracking-[-0.5px]">{stat.value}</p>
                  </div>)}
              </div>}

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
                  {blueprint.hooks.map((hook: any, i: number) => <div key={i} className="p-3 rounded-xl bg-muted/50 border border-border text-sm font-['Inter'] tracking-[-0.5px]">
                      {typeof hook === 'string' ? hook : hook.text || hook.content}
                    </div>)}
                </div>
              </div>}

            {blueprint?.talking_points && blueprint.talking_points.length > 0 && <div>
                <h2 className="text-lg font-semibold mb-3">Talking Points</h2>
                <ul className="space-y-2">
                  {blueprint.talking_points.map((point: any, i: number) => <li key={i} className="flex items-start gap-2 text-muted-foreground font-['Inter'] tracking-[-0.5px]">
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

        {/* Right Column - Fixed Application Sidebar (Desktop Only) */}
        {!isCampaignMember && (
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
              {isBoost && boostCampaign && (boostCampaign.position_type || boostCampaign.availability_requirement || boostCampaign.work_location) && (
                <div className="space-y-3 p-4 rounded-xl bg-muted/30">
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
                </div>
              )}

              {!isLoggedIn ? <>
                <div className="text-center py-10 px-8 rounded-2xl bg-[#0e0e0e]">
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
                        <button onClick={() => setShowAddAccountDialog(true)} className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-transparent hover:bg-[#0e0e0e] transition-colors text-muted-foreground hover:text-foreground">
                          <Plus className="h-4 w-4" />
                          <span className="text-sm font-['Inter'] tracking-[-0.5px]">Add another account</span>
                        </button>
                      </div>}
                  </div>

                  {/* Application Questions */}
                  {questions.length > 0 && campaign?.requires_application !== false && <div className="space-y-4">
                      <div className="h-px bg-border" />
                      {questions.map((question: string, idx: number) => <div key={idx} className="space-y-2">
                          <Label className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                            {question} <span className="text-destructive">*</span>
                          </Label>
                          <Textarea value={answers[idx] || ""} onChange={e => setAnswers(prev => ({
                    ...prev,
                    [idx]: e.target.value
                  }))} placeholder="Your answer..." className="min-h-[100px] resize-none font-['Inter'] tracking-[-0.5px]" />
                        </div>)}
                    </div>}

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
      {!isCampaignMember && !isFull && !isEnded && <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-border lg:hidden">
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
                  {questions.map((question: string, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <Label className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                        {question} <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        value={answers[idx] || ""}
                        onChange={e => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                        placeholder="Your answer..."
                        className="min-h-[100px] resize-none font-['Inter'] tracking-[-0.5px]"
                      />
                    </div>
                  ))}
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