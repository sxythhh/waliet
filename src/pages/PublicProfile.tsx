import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Calendar, ArrowRight, Briefcase, Star, Shield, Users, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { JoinCampaignSheet } from "@/components/JoinCampaignSheet";
import { format } from "date-fns";
import { SEOHead } from "@/components/SEOHead";
import { generateProfileSchema, getCanonicalUrl, truncateDescription } from "@/lib/seo";
import { PortfolioDisplay } from "@/components/profile/PortfolioDisplay";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import xLogo from "@/assets/x-logo.png";
import wordmarkLogo from "@/assets/wordmark-logo.png";
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
  portfolio_items: any[] | null;
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
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalBoosts: 0,
    totalViews: 0,
    totalEarnings: 0
  });
    useEffect(() => {
    fetchProfile();
  }, [username, user]);
  const fetchProfile = async () => {
    if (!username) {
      if (!user) {
        navigate("/");
        return;
      }
      const {
        data: currentUserProfile
      } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url, created_at, trust_score, audience_quality_score").eq("id", user.id).maybeSingle();
      if (currentUserProfile?.username) {
        navigate(`/@${currentUserProfile.username}`, {
          replace: true
        });
        return;
      }
    }
    const {
      data: profileData
    } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url, created_at, trust_score, audience_quality_score").eq("username", username).maybeSingle();
    if (!profileData) {
      if (!user) {
        navigate("/");
        return;
      }
      const {
        data: currentUserProfile
      } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url, created_at, trust_score, audience_quality_score").eq("id", user.id).maybeSingle();
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
        brand: t.brands as any
      })));
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
    let participationsWithStats: any[] = [];
    if (submissions) {
      // Deduplicate by campaign_id - group submissions by campaign
      const uniqueCampaignIds = [...new Set((submissions as any[]).map(s => s.campaign_id))];
      const submissionsByCampaign = uniqueCampaignIds.map(campaignId => {
        const campaignSubmissions = (submissions as any[]).filter(s => s.campaign_id === campaignId);
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
          data: [] as any[]
        } as any)]);
        const totalViews = (cachedVideos || []).reduce((acc: number, v: any) => acc + (v.views || 0), 0);
        return {
          id: sub.id,
          campaign_id: sub.campaign_id,
          status: sub.status,
          joined_at: sub.submitted_at,
          campaign: sub.campaigns as any,
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
    let boostsWithStats: any[] = [];
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
          boost: app.bounty_campaigns as any,
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
  };
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
      const campaignData = {
        ...data,
        brand_logo_url: data.brand_logo_url || (data.brands as any)?.logo_url,
        platforms: data.allowed_platforms || [],
        application_questions: Array.isArray(data.application_questions) ? data.application_questions as string[] : [],
        brands: data.brands
      };
      setSelectedCampaign(campaignData);
      setSheetOpen(true);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="mt-12 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>;
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
                <h1 className="text-2xl sm:text-3xl font-bold font-['Inter'] tracking-[-0.5px]">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                  @{profile.username}
                </p>
              </div>

              
            </div>

            {/* Bio */}
            {profile.bio && <p className="mt-4 text-foreground/80 font-['Inter'] tracking-[-0.3px] leading-relaxed max-w-xl">
                {profile.bio}
              </p>}

            {/* Connected Accounts - below bio */}
            {socialAccounts.length > 0 && <div className="flex flex-wrap items-center gap-3 mt-4">
                {socialAccounts.map(account => <button key={account.id} onClick={() => account.account_link && window.open(account.account_link, '_blank')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border hover:bg-muted transition-colors">
                    {getPlatformIcon(account.platform)}
                    <span className="text-sm font-['Inter'] tracking-[-0.5px] text-foreground">
                      {account.username}
                    </span>
                  </button>)}
              </div>}

            {/* Trust Score & Audience Quality Badges */}
            {profile.trust_score !== null || profile.audience_quality_score !== null}

            {/* Join Date */}
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="font-['Inter'] tracking-[-0.5px]">
                Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            <TabsTrigger value="campaigns" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-['Inter'] tracking-[-0.5px] font-medium">
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="boosts" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-['Inter'] tracking-[-0.5px] font-medium">
              Boosts
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-['Inter'] tracking-[-0.5px] font-medium">
              Reviews {testimonials.length > 0 && `(${testimonials.length})`}
            </TabsTrigger>
            {(profile.portfolio_items?.length > 0 || profile.resume_url) && (
              <TabsTrigger value="portfolio" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-['Inter'] tracking-[-0.5px] font-medium">
                Portfolio
              </TabsTrigger>
            )}
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="mt-6 space-y-4">
            {campaignParticipations.length === 0 ? <div className="text-center py-16 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-['Inter'] tracking-[-0.5px]">No campaign history yet</p>
              </div> : <div className="space-y-3">
                <div className="flex items-center justify-end">
                  <div className="flex items-center border border-border/50 rounded-full overflow-hidden bg-muted/30">
                    <button onClick={() => {
                  const container = document.getElementById('profile-campaigns-scroll');
                  if (container) container.scrollBy({
                    left: -300,
                    behavior: 'smooth'
                  });
                }} className="p-2.5 hover:bg-muted/50 transition-colors">
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <div className="w-px h-5 bg-border/50" />
                    <button onClick={() => {
                  const container = document.getElementById('profile-campaigns-scroll');
                  if (container) container.scrollBy({
                    left: 300,
                    behavior: 'smooth'
                  });
                }} className="p-2.5 hover:bg-muted/50 transition-colors">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div id="profile-campaigns-scroll" className="flex gap-3 overflow-x-auto pt-2 pb-2 scrollbar-hide" style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
                  {campaignParticipations.map(participation => {
                const campaign = participation.campaign;
                const logoUrl = campaign?.brands?.logo_url || campaign?.brand_logo_url;
                const isVerified = campaign?.brands?.is_verified;
                return <div key={participation.id} className="flex-shrink-0 w-[160px]">
                        <CampaignCard id={campaign?.id || participation.campaign_id} title={campaign?.title || 'Campaign'} brand_name={campaign?.brand_name || ''} brand_logo_url={logoUrl || null} brand_is_verified={isVerified} banner_url={campaign?.banner_url || null} budget={campaign?.budget || 0} budget_used={campaign?.budget_used || 0} is_infinite_budget={campaign?.is_infinite_budget || false} onClick={() => handleCampaignClick(participation.campaign_id)} showBookmark={false} showFullscreen={false} />
                      </div>;
              })}
                </div>
              </div>}
          </TabsContent>

          {/* Boosts Tab */}
          <TabsContent value="boosts" className="mt-6 space-y-4">
            {boostParticipations.length === 0 ? <div className="text-center py-16 text-muted-foreground">
                
                <p className="font-['Inter'] tracking-[-0.5px]">No boost history yet</p>
              </div> : <div className="grid gap-3">
                {boostParticipations.map(participation => {
              const boost = participation.boost;
              const logoUrl = boost?.brands?.logo_url;
              const isVerified = boost?.brands?.is_verified;
              return <div key={participation.id} className="bg-card/50 border border-border/50 rounded-2xl p-4 hover:bg-card/80 transition-all group">
                      <div className="flex items-center gap-4">
                        {/* Brand Logo */}
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {logoUrl ? <img src={logoUrl} alt={boost?.brands?.name || "Brand"} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />}
                        </div>
                        
                        {/* Boost Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                              {boost?.brands?.name}
                            </span>
                            {isVerified && <VerifiedBadge size="sm" />}
                          </div>
                          <h3 className="font-semibold font-['Inter'] tracking-[-0.5px] line-clamp-1">
                            {boost?.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                            <span>${boost?.monthly_retainer}/mo</span>
                            <span className="text-foreground/30">•</span>
                            <span>{participation.videos_submitted} videos</span>
                          </div>
                        </div>
                        
                        {/* Earnings */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-emerald-500 font-['Inter'] tracking-[-0.5px]">
                            ${participation.total_earned?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">earned</p>
                        </div>
                      </div>
                    </div>;
            })}
              </div>}
          </TabsContent>

          {/* Testimonials Tab */}
          <TabsContent value="testimonials" className="mt-6 space-y-4">
            {testimonials.length === 0 ? <div className="text-center py-16 text-muted-foreground">
                <Quote className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-['Inter'] tracking-[-0.5px]">No reviews yet</p>
              </div> : <div className="grid gap-4">
                {testimonials.map(testimonial => <div key={testimonial.id} className="bg-card/50 border border-border/50 rounded-2xl p-5">
                    {/* Rating Stars */}
                    {testimonial.rating && <div className="flex items-center gap-0.5 mb-3">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < testimonial.rating! ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />)}
                      </div>}
                    
                    {/* Quote */}
                    <p className="text-foreground font-['Inter'] tracking-[-0.3px] leading-relaxed mb-4">
                      "{testimonial.content}"
                    </p>
                    
                    {/* Brand Attribution */}
                    {testimonial.brand && <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {testimonial.brand.logo_url ? <img src={testimonial.brand.logo_url} alt={testimonial.brand.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                            {testimonial.brand.name}
                          </span>
                          {testimonial.brand.is_verified && <VerifiedBadge size="sm" />}
                        </div>
                        <span className="text-xs text-muted-foreground ml-auto font-['Inter'] tracking-[-0.5px]">
                          {format(new Date(testimonial.created_at), 'MMM yyyy')}
                        </span>
                      </div>}
                  </div>)}
              </div>}
          </TabsContent>

          {/* Portfolio Tab */}
          {(profile.portfolio_items?.length > 0 || profile.resume_url) && (
            <TabsContent value="portfolio" className="mt-6">
              <PortfolioDisplay
                portfolioItems={profile.portfolio_items || []}
                resumeUrl={profile.resume_url}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-12">
        
      </div>

      {/* Campaign Sheet */}
      <JoinCampaignSheet campaign={selectedCampaign} open={sheetOpen} onOpenChange={setSheetOpen} />

      {/* Banner for Logged Out Users */}
      {showBanner && <div onClick={() => navigate("/")} className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] py-5 px-6 cursor-pointer hover:opacity-90 transition-opacity z-50">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
            <span className="text-white font-['Inter'] font-bold text-lg tracking-[-0.5px]">
              Go Viral, Get Paid
            </span>
            <ArrowRight className="h-5 w-5 text-white" />
          </div>
        </div>}
    </div>;
}