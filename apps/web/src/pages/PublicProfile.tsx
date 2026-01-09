import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Calendar, ArrowRight, Briefcase, Star, Shield, Users, Quote, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { DashboardHistorySection } from "@/components/dashboard/DashboardHistorySection";
import { DashboardReviewsSection } from "@/components/dashboard/DashboardReviewsSection";
import { JoinCampaignSheet } from "@/components/JoinCampaignSheet";
import { format } from "date-fns";
import { SEOHead } from "@/components/SEOHead";
import { PageLoading } from "@/components/ui/loading-bar";
import { generateProfileSchema, getCanonicalUrl, truncateDescription } from "@/lib/seo";
import { PortfolioDisplay as LegacyPortfolioDisplay } from "@/components/profile/PortfolioDisplay";
import { PortfolioDisplay } from "@/components/portfolio/display/PortfolioDisplay";
import { usePortfolio } from "@/hooks/usePortfolio";
import type { CreatorPortfolio } from "@/types/portfolio";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import xLogo from "@/assets/x-logo.png";
import wordmarkLogo from "@/assets/wordmark-logo.png";
interface PortfolioItem {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  thumbnail_url?: string;
  type?: string;
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  trust_score: number | null;
  audience_quality_score: number | null;
  resume_url: string | null;
  portfolio_items: PortfolioItem[] | null;
  country: string | null;
  city: string | null;
}
interface Testimonial {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
  brand: {
    id: string;
    name: string;
    logo_url: string | null;
    is_verified: boolean;
  } | null;
}
interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  is_verified: boolean;
  account_link: string | null;
}
interface CampaignParticipation {
  id: string;
  campaign_id: string;
  status: string;
  joined_at: string;
  campaign: {
    id: string;
    title: string;
    slug: string;
    brand_name: string;
    brand_logo_url: string | null;
    banner_url: string | null;
    rpm_rate: number;
    status: string;
    budget: number;
    budget_used: number | null;
    is_infinite_budget: boolean | null;
    brands?: {
      logo_url: string;
      is_verified?: boolean;
    } | null;
  };
  total_views?: number;
  total_earnings?: number;
  videos_count?: number;
}
interface BoostParticipation {
  id: string;
  bounty_campaign_id: string;
  status: string;
  applied_at: string;
  boost: {
    id: string;
    title: string;
    slug: string;
    monthly_retainer: number;
    videos_per_month: number;
    brands?: {
      name: string;
      logo_url: string;
      is_verified?: boolean;
    } | null;
  };
  videos_submitted?: number;
  total_earned?: number;
}

interface CachedCampaignVideo {
  views: number | null;
}

interface CampaignSubmissionData {
  id: string;
  campaign_id: string;
  status: string;
  submitted_at: string;
  views: number | null;
  earnings: number | null;
  campaigns: CampaignParticipation["campaign"] | null;
}

interface SelectedCampaign {
  id: string;
  title: string;
  description: string;
  campaign_type?: string | null;
  category?: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  budget: number;
  budget_used?: number | null;
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
  is_infinite_budget?: boolean | null;
  blueprint_id?: string | null;
  brands?: {
    logo_url: string;
    is_verified?: boolean;
  } | null;
  require_audience_insights?: boolean;
  min_insights_score?: number;
}
export default function PublicProfile() {
  const {
    username: rawUsername
  } = useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const username = rawUsername?.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [campaignParticipations, setCampaignParticipations] = useState<CampaignParticipation[]>([]);
  const [boostParticipations, setBoostParticipations] = useState<BoostParticipation[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [creatorPortfolio, setCreatorPortfolio] = useState<CreatorPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<SelectedCampaign | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalBoosts: 0,
    totalViews: 0,
    totalEarnings: 0
  });
  const fetchProfile = useCallback(async () => {
    if (!username) {
      if (!user) {
        navigate("/");
        return;
      }
      const {
        data: currentUserProfile
      } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url, created_at, trust_score, audience_quality_score, country, city").eq("id", user.id).maybeSingle();
      if (currentUserProfile?.username) {
        navigate(`/@${currentUserProfile.username}`, {
          replace: true
        });
        return;
      }
    }
    const {
      data: profileData
    } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url, created_at, trust_score, audience_quality_score, country, city").eq("username", username).maybeSingle();
    if (!profileData) {
      if (!user) {
        navigate("/");
        return;
      }
      const {
        data: currentUserProfile
      } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url, created_at, trust_score, audience_quality_score, country, city").eq("id", user.id).maybeSingle();
      if (currentUserProfile?.username) {
        navigate(`/@${currentUserProfile.username}`, {
          replace: true
        });
        return;
      }
      setLoading(false);
      return;
    }
    setProfile(profileData as unknown as Profile);

    // Fetch testimonials
    const {
      data: testimonialData
    } = await supabase.from("creator_testimonials").select(`
        id,
        content,
        rating,
        created_at,
        brands:brand_id (
          id,
          name,
          logo_url,
          is_verified
        )
      `).eq("creator_id", profileData.id).order("created_at", {
      ascending: false
    });
    if (testimonialData) {
      setTestimonials(testimonialData.map(t => ({
        id: t.id,
        content: t.content,
        rating: t.rating,
        created_at: t.created_at,
        brand: t.brands as Testimonial["brand"]
      })));
    }

    // Fetch creator portfolio
    const { data: portfolioData } = await supabase
      .from("creator_portfolios")
      .select("*")
      .eq("user_id", profileData.id)
      .eq("is_public", true)
      .maybeSingle();
    if (portfolioData) {
      setCreatorPortfolio(portfolioData as unknown as CreatorPortfolio);
    }

    // Fetch social accounts (exclude hidden ones from public profile)
    const {
      data: socialData
    } = await supabase.from("social_accounts").select("id, platform, username, is_verified, account_link").eq("user_id", profileData.id).eq("hidden_from_public", false);
    const platformUsernames = (socialData || []).map(a => a.username).filter(Boolean) as string[];
    if (socialData) {
      setSocialAccounts(socialData);
    }

    // Fetch wallet totals (source of truth for earnings)
    const {
      data: wallet
    } = await supabase.from("wallets").select("total_earned").eq("user_id", profileData.id).maybeSingle();
    const walletTotalEarned = Number(wallet?.total_earned) || 0;

    // Fetch campaign participations with stats
    const {
      data: submissions
    } = await supabase.from("campaign_submissions").select(`
        id,
        campaign_id,
        status,
        submitted_at,
        views,
        earnings,
        campaigns (
          id,
          title,
          slug,
          brand_name,
          brand_logo_url,
          banner_url,
          rpm_rate,
          status,
          budget,
          budget_used,
          is_infinite_budget,
          brands (
            logo_url,
            is_verified
          )
        )
      `).eq("creator_id", profileData.id).eq("status", "approved").order("submitted_at", {
      ascending: false
    });
    console.debug("[PublicProfile] approved submissions", {
      username: profileData.username,
      count: submissions?.length ?? 0,
      sample: submissions?.[0]
    });
    let participationsWithStats: CampaignParticipation[] = [];
    if (submissions) {
      // Deduplicate by campaign_id - group submissions by campaign
      const typedSubmissions = submissions as CampaignSubmissionData[];
      const uniqueCampaignIds = [...new Set(typedSubmissions.map(s => s.campaign_id))];
      const submissionsByCampaign = uniqueCampaignIds.map(campaignId => {
        const campaignSubmissions = typedSubmissions.filter(s => s.campaign_id === campaignId);
        // Use the most recent submission for metadata
        return campaignSubmissions[0];
      });

      participationsWithStats = await Promise.all(submissionsByCampaign.map(async sub => {
        // videos_count comes from video_submissions; view totals come from cached campaign videos (platform usernames)
        const [{
          data: videos
        }, {
          data: cachedVideos
        }] = await Promise.all([supabase.from("video_submissions").select("id").eq("source_type", "campaign").eq("source_id", sub.campaign_id).eq("creator_id", profileData.id), platformUsernames.length ? supabase.from("cached_campaign_videos").select("views").eq("campaign_id", sub.campaign_id).in("username", platformUsernames) : Promise.resolve({
          data: [] as CachedCampaignVideo[]
        })]);
        const totalViews = (cachedVideos || []).reduce((acc: number, v: CachedCampaignVideo) => acc + (v.views || 0), 0);
        return {
          id: sub.id,
          campaign_id: sub.campaign_id,
          status: sub.status,
          joined_at: sub.submitted_at,
          campaign: sub.campaigns as CampaignParticipation["campaign"],
          total_views: totalViews,
          total_earnings: sub.earnings || 0,
          videos_count: videos?.length || 0
        };
      }));
      setCampaignParticipations(participationsWithStats);
    }

    // Fetch boost participations
    const {
      data: boostApps
    } = await supabase.from("bounty_applications").select(`
        id,
        bounty_campaign_id,
        status,
        applied_at,
        bounty_campaigns (
          id,
          title,
          slug,
          monthly_retainer,
          videos_per_month,
          brands (
            name,
            logo_url,
            is_verified
          )
        )
      `).eq("user_id", profileData.id).eq("status", "accepted").order("applied_at", {
      ascending: false
    });
    let boostsWithStats: BoostParticipation[] = [];
    if (boostApps) {
      boostsWithStats = await Promise.all(boostApps.map(async app => {
        const {
          data: videoSubmissions
        } = await supabase.from("video_submissions").select("id, payout_amount, status").eq("source_type", "boost").eq("source_id", app.bounty_campaign_id).eq("creator_id", profileData.id);
        const approvedSubmissions = videoSubmissions?.filter(s => s.status === "approved") || [];
        const totalEarned = approvedSubmissions.reduce((acc, s) => acc + (s.payout_amount || 0), 0);
        return {
          id: app.id,
          bounty_campaign_id: app.bounty_campaign_id,
          status: app.status,
          applied_at: app.applied_at,
          boost: app.bounty_campaigns as BoostParticipation["boost"],
          videos_submitted: videoSubmissions?.length || 0,
          total_earned: totalEarned
        };
      }));
      setBoostParticipations(boostsWithStats);
    }

    // Calculate total stats using the freshly fetched data (not stale state)
    const totalViews = participationsWithStats.reduce((acc, p) => acc + (p.total_views || 0), 0);
    setStats({
      totalCampaigns: submissions?.length || 0,
      totalBoosts: boostApps?.length || 0,
      totalViews,
      // Wallet total is the only reliable source of total earnings right now
      totalEarnings: walletTotalEarned
    });
    setLoading(false);
  }, [username, user, navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-5 w-5";
    switch (platform) {
      case "instagram":
        return <img src={instagramLogo} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={youtubeLogo} alt="YouTube" className={iconClass} />;
      case "tiktok":
        return <img src={tiktokLogo} alt="TikTok" className={iconClass} />;
      case "x":
        return <img src={xLogo} alt="X" className={iconClass} />;
      default:
        return null;
    }
  };
  const handleCampaignClick = async (campaignId: string) => {
    const {
      data
    } = await supabase.from("campaigns").select(`*, brands (logo_url, is_verified)`).eq("id", campaignId).single();
    if (data) {
      const brandData = data.brands as { logo_url: string; is_verified?: boolean } | null;
      const campaignData: SelectedCampaign = {
        id: data.id,
        title: data.title,
        description: data.description || "",
        campaign_type: data.campaign_type,
        category: data.category,
        brand_name: data.brand_name,
        brand_logo_url: data.brand_logo_url || brandData?.logo_url || null,
        budget: data.budget,
        budget_used: data.budget_used,
        rpm_rate: data.rpm_rate,
        status: data.status,
        start_date: data.start_date,
        banner_url: data.banner_url,
        platforms: data.allowed_platforms || [],
        slug: data.slug,
        guidelines: data.guidelines,
        application_questions: Array.isArray(data.application_questions) ? data.application_questions as string[] : [],
        requires_application: data.requires_application,
        preview_url: data.preview_url,
        is_infinite_budget: data.is_infinite_budget,
        blueprint_id: data.blueprint_id,
        brands: brandData,
        require_audience_insights: data.require_audience_insights,
        min_insights_score: data.min_insights_score
      };
      setSelectedCampaign(campaignData);
      setSheetOpen(true);
    }
  };
  if (loading) {
    return <PageLoading />;
  }
  if (!profile) {
    return null;
  }
  const showBanner = !user;

  // SEO data
  const displayName = profile.full_name || profile.username;
  const seoTitle = `${displayName} (@${profile.username}) | Creator Profile`;
  const seoDescription = profile.bio
    ? truncateDescription(`${displayName} - ${profile.bio}`)
    : `View ${displayName}'s creator profile on Virality. ${stats.totalCampaigns} campaigns, ${stats.totalViews.toLocaleString()} total views.`;
  const profileSchema = generateProfileSchema({
    name: displayName,
    username: profile.username,
    description: profile.bio || undefined,
    image: profile.avatar_url || undefined,
    url: `/@${profile.username}`,
  });

  return <div className="h-[100dvh] bg-background overflow-y-auto" style={{
    paddingBottom: showBanner ? '100px' : '24px'
  }}>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonical={getCanonicalUrl(`/@${profile.username}`)}
        ogImage={profile.avatar_url || undefined}
        ogType="profile"
        keywords={['content creator', 'influencer', displayName, profile.username, 'creator profile'].filter(Boolean)}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Creators', url: '/discover' },
          { name: displayName, url: `/@${profile.username}` },
        ]}
        structuredData={profileSchema}
      />
      {/* Header Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-xl ring-2 ring-border">
              <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {profile.full_name?.[0] || profile.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold font-inter tracking-[-0.5px]">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-muted-foreground font-inter tracking-[-0.5px]">
                  @{profile.username}
                </p>
              </div>

              
            </div>

            {/* Bio */}
            {profile.bio && <p className="mt-4 text-foreground/80 font-inter tracking-[-0.3px] leading-relaxed max-w-xl">
                {profile.bio}
              </p>}

            {/* Connected Accounts - below bio */}
            {socialAccounts.length > 0 && <div className="flex flex-wrap items-center gap-3 mt-4">
                {socialAccounts.map(account => <button key={account.id} onClick={() => account.account_link && window.open(account.account_link, '_blank')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border hover:bg-muted transition-colors">
                    {getPlatformIcon(account.platform)}
                    <span className="text-sm font-inter tracking-[-0.5px] text-foreground">
                      {account.username}
                    </span>
                  </button>)}
              </div>}

            {/* Trust Score Badge */}
            {profile.trust_score !== null && (
              <div className="flex items-center gap-2 mt-4">
                <TrustScoreBadge
                  score={profile.trust_score}
                  size="md"
                  showLabel
                />
              </div>
            )}

            {/* Location & Join Date */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-muted-foreground">
              {(profile.city || profile.country) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-inter tracking-[-0.5px]">
                    {[profile.city, profile.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-inter tracking-[-0.5px]">
                  Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section - Hidden for now */}
      {/* <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            <TabsTrigger value="portfolio" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-inter tracking-[-0.5px] font-medium">
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-inter tracking-[-0.5px] font-medium">
              History
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-inter tracking-[-0.5px] font-medium">
              Reviews {testimonials.length > 0 && `(${testimonials.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-6">
            {creatorPortfolio ? (
              <PortfolioDisplay portfolio={creatorPortfolio} />
            ) : (profile.portfolio_items?.length > 0 || profile.resume_url) ? (
              <LegacyPortfolioDisplay
                portfolioItems={profile.portfolio_items || []}
                resumeUrl={profile.resume_url}
              />
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-inter tracking-[-0.5px]">No portfolio yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <DashboardHistorySection
              items={[
                ...campaignParticipations.map((p) => ({
                  id: p.campaign?.slug || p.campaign_id,
                  type: "campaign" as const,
                  title: p.campaign?.title || "Campaign",
                  brandName: p.campaign?.brand_name || "",
                  brandLogoUrl: p.campaign?.brands?.logo_url || p.campaign?.brand_logo_url || null,
                  brandIsVerified: p.campaign?.brands?.is_verified,
                  joinedAt: p.joined_at,
                  earnings: p.total_earnings,
                })),
                ...boostParticipations.map((p) => ({
                  id: p.boost?.slug || p.bounty_campaign_id,
                  type: "boost" as const,
                  title: p.boost?.title || "Boost",
                  brandName: p.boost?.brands?.name || "",
                  brandLogoUrl: p.boost?.brands?.logo_url || null,
                  brandIsVerified: p.boost?.brands?.is_verified,
                  joinedAt: p.applied_at,
                  earnings: p.total_earned,
                })),
              ]}
              onItemClick={(slug) => navigate(`/c/${slug}`)}
            />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <DashboardReviewsSection testimonials={testimonials} />
          </TabsContent>
        </Tabs>
      </div> */}

      {/* Footer */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-12">
        
      </div>

      {/* Campaign Sheet */}
      <JoinCampaignSheet campaign={selectedCampaign} open={sheetOpen} onOpenChange={setSheetOpen} />

      {/* Banner for Logged Out Users */}
      {showBanner && <div onClick={() => navigate("/")} className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] py-5 px-6 cursor-pointer hover:opacity-90 transition-opacity z-50">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
            <span className="text-white font-inter font-bold text-lg tracking-[-0.5px]">
              Go Viral, Get Paid
            </span>
            <ArrowRight className="h-5 w-5 text-white" />
          </div>
        </div>}
    </div>;
}