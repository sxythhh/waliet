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
import { Calendar, ArrowRight, TrendingUp, Briefcase } from "lucide-react";
import { JoinCampaignSheet } from "@/components/JoinCampaignSheet";
import { format } from "date-fns";
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
      } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url, created_at").eq("id", user.id).maybeSingle();
      if (currentUserProfile?.username) {
        navigate(`/@${currentUserProfile.username}`, {
          replace: true
        });
        return;
      }
    }
    const {
      data: profileData
    } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url, created_at").eq("username", username).maybeSingle();
    if (!profileData) {
      if (!user) {
        navigate("/");
        return;
      }
      const {
        data: currentUserProfile
      } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url, created_at").eq("id", user.id).maybeSingle();
      if (currentUserProfile?.username) {
        navigate(`/@${currentUserProfile.username}`, {
          replace: true
        });
        return;
      }
      setLoading(false);
      return;
    }
    setProfile(profileData);

    // Fetch social accounts
    const {
      data: socialData
    } = await supabase.from("social_accounts").select("id, platform, username, is_verified, account_link").eq("user_id", profileData.id);
    if (socialData) {
      setSocialAccounts(socialData);
    }

    // Fetch campaign participations with stats
    const {
      data: submissions
    } = await supabase.from("campaign_submissions").select(`
        id,
        campaign_id,
        status,
        submitted_at,
        campaigns (
          id,
          title,
          brand_name,
          brand_logo_url,
          banner_url,
          rpm_rate,
          status,
          brands (
            logo_url,
            is_verified
          )
        )
      `).eq("creator_id", profileData.id).eq("status", "approved").order("submitted_at", {
      ascending: false
    });
    if (submissions) {
      // Fetch video stats for each campaign
      const participationsWithStats = await Promise.all((submissions as any[]).map(async sub => {
        const {
          data: videos
        } = await supabase.from("campaign_videos").select("id, estimated_payout").eq("campaign_id", sub.campaign_id).eq("creator_id", profileData.id);
        const totalEarnings = videos?.reduce((acc, v) => acc + (v.estimated_payout || 0), 0) || 0;
        return {
          id: sub.id,
          campaign_id: sub.campaign_id,
          status: sub.status,
          joined_at: sub.submitted_at,
          campaign: sub.campaigns as any,
          total_views: 0,
          // Views not tracked in this table
          total_earnings: totalEarnings,
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
    if (boostApps) {
      const boostsWithStats = await Promise.all(boostApps.map(async app => {
        const {
          data: submissions
        } = await supabase.from("boost_video_submissions").select("id, payout_amount, status").eq("bounty_campaign_id", app.bounty_campaign_id).eq("user_id", profileData.id);
        const approvedSubmissions = submissions?.filter(s => s.status === "approved") || [];
        const totalEarned = approvedSubmissions.reduce((acc, s) => acc + (s.payout_amount || 0), 0);
        return {
          id: app.id,
          bounty_campaign_id: app.bounty_campaign_id,
          status: app.status,
          applied_at: app.applied_at,
          boost: app.bounty_campaigns as any,
          videos_submitted: submissions?.length || 0,
          total_earned: totalEarned
        };
      }));
      setBoostParticipations(boostsWithStats);
    }

    // Calculate total stats
    const totalViews = campaignParticipations.reduce((acc, p) => acc + (p.total_views || 0), 0);
    const campaignEarnings = campaignParticipations.reduce((acc, p) => acc + (p.total_earnings || 0), 0);
    const boostEarnings = boostParticipations.reduce((acc, p) => acc + (p.total_earned || 0), 0);
    setStats({
      totalCampaigns: submissions?.length || 0,
      totalBoosts: boostApps?.length || 0,
      totalViews,
      totalEarnings: campaignEarnings + boostEarnings
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
    } = await supabase.from("campaigns").select(`*, brands (logo_url)`).eq("id", campaignId).single();
    if (data) {
      const campaignData = {
        ...data,
        brand_logo_url: data.brand_logo_url || (data.brands as any)?.logo_url,
        platforms: data.allowed_platforms || [],
        application_questions: Array.isArray(data.application_questions) ? data.application_questions as string[] : []
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
  return <div className="h-[100dvh] bg-background overflow-y-auto" style={{
    paddingBottom: showBanner ? '100px' : '24px'
  }}>
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

              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-6">
                Contact
              </Button>
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

      {/* Stats Overview - Cleaner design without icons */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card/50 border border-border/50 rounded-2xl p-5">
            <p className="text-3xl font-bold font-['Inter'] tracking-[-0.5px]">{stats.totalCampaigns}</p>
            <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px] mt-1">Campaigns</p>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-2xl p-5">
            <p className="text-3xl font-bold font-['Inter'] tracking-[-0.5px]">{stats.totalBoosts}</p>
            <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px] mt-1">Boosts</p>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-2xl p-5">
            <p className="text-3xl font-bold font-['Inter'] tracking-[-0.5px]">
              {stats.totalViews >= 1000000 ? `${(stats.totalViews / 1000000).toFixed(1)}M` : stats.totalViews >= 1000 ? `${(stats.totalViews / 1000).toFixed(1)}K` : stats.totalViews}
            </p>
            <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px] mt-1">Total Views</p>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-2xl p-5">
            <p className="text-3xl font-bold font-['Inter'] tracking-[-0.5px] text-emerald-500">
              ${stats.totalEarnings.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px] mt-1">Earned</p>
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
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="mt-6 space-y-4">
            {campaignParticipations.length === 0 ? <div className="text-center py-16 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-['Inter'] tracking-[-0.5px]">No campaign history yet</p>
              </div> : <div className="grid gap-4">
                {campaignParticipations.map(participation => {
              const campaign = participation.campaign;
              const logoUrl = campaign?.brands?.logo_url || campaign?.brand_logo_url;
              const isVerified = campaign?.brands?.is_verified;
              return <div key={participation.id} onClick={() => handleCampaignClick(participation.campaign_id)} className="bg-card/50 border border-border/50 rounded-2xl p-4 hover:bg-card/80 transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        {/* Brand Logo */}
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />}
                        </div>
                        
                        {/* Campaign Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                              {campaign?.brand_name}
                            </span>
                            {isVerified && <VerifiedBadge size="sm" />}
                          </div>
                          <h3 className="font-semibold font-['Inter'] tracking-[-0.5px] line-clamp-1 group-hover:text-primary transition-colors">
                            {campaign?.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                            <span>{participation.videos_count} videos</span>
                            <span className="text-foreground/30">•</span>
                            <span>{participation.total_views?.toLocaleString() || 0} views</span>
                          </div>
                        </div>
                        
                        {/* Earnings */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-emerald-500 font-['Inter'] tracking-[-0.5px]">
                            ${participation.total_earnings?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">earned</p>
                        </div>
                      </div>
                    </div>;
            })}
              </div>}
          </TabsContent>

          {/* Boosts Tab */}
          <TabsContent value="boosts" className="mt-6 space-y-4">
            {boostParticipations.length === 0 ? <div className="text-center py-16 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
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
                          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />}
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
        </Tabs>
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-12">
        <div className="text-center pt-8 border-t border-border">
          <img src={wordmarkLogo} alt="Virality" className="h-8 mx-auto opacity-40" />
        </div>
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