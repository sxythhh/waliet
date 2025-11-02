import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, ArrowRight } from "lucide-react";
import { JoinCampaignSheet } from "@/components/JoinCampaignSheet";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo.png";
import youtubeLogo from "@/assets/youtube-logo.png";
import wordmarkLogo from "@/assets/wordmark-logo.png";
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}
interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  is_verified: boolean;
  account_link: string | null;
  connected_campaigns?: Array<{
    connection_id: string;
    campaign: {
      id: string;
      title: string;
      brand_name: string;
      brand_logo_url: string | null;
      brands?: {
        logo_url: string;
      } | null;
    };
  }>;
  demographic_submissions?: Array<{
    status: string;
  }>;
}
export default function PublicProfile() {
  const {
    username
  } = useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [campaignCache, setCampaignCache] = useState<Record<string, any>>({});
  useEffect(() => {
    fetchProfile();
  }, [username, user]);
  const fetchProfile = async () => {
    // Handle empty username
    if (!username) {
      if (!user) {
        navigate("/");
        return;
      }
      // Fetch current user's profile
      const {
        data: currentUserProfile
      } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url").eq("id", user.id).maybeSingle();
      if (currentUserProfile?.username) {
        navigate(`/${currentUserProfile.username}`, {
          replace: true
        });
        return;
      }
    }
    const {
      data: profileData
    } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url").eq("username", username).maybeSingle();
    if (!profileData) {
      // Profile not found
      if (!user) {
        navigate("/");
        return;
      }
      // Fetch current user's profile instead
      const {
        data: currentUserProfile
      } = await supabase.from("profiles").select("id, username, full_name, bio, avatar_url").eq("id", user.id).maybeSingle();
      if (currentUserProfile?.username) {
        navigate(`/${currentUserProfile.username}`, {
          replace: true
        });
        return;
      }
      setLoading(false);
      return;
    }
    if (profileData) {
      setProfile(profileData);

      // Fetch social accounts with their connected campaigns and demographic status
      const {
        data: socialData
      } = await supabase.from("social_accounts").select(`
          id,
          platform,
          username,
          is_verified,
          account_link
        `).eq("user_id", profileData.id);
      if (socialData) {
        // Fetch connected campaigns for each social account
        const campaignsToFetch = new Set<string>();
        const accountsWithCampaigns = await Promise.all(socialData.map(async account => {
          const {
            data: campaignConnections
          } = await supabase.from("social_account_campaigns").select(`
                id,
                campaigns (
                  id,
                  title,
                  brand_name,
                  brand_logo_url,
                  brands (
                    logo_url
                  )
                )
              `).eq("social_account_id", account.id);

          // Track campaign IDs to pre-fetch
          campaignConnections?.forEach(conn => {
            if (conn.campaigns) {
              campaignsToFetch.add((conn.campaigns as any).id);
            }
          });
          const {
            data: demographics
          } = await supabase.from("demographic_submissions").select("status").eq("social_account_id", account.id).order("submitted_at", {
            ascending: false
          }).limit(1);
          return {
            ...account,
            connected_campaigns: campaignConnections?.map(conn => ({
              connection_id: conn.id,
              campaign: conn.campaigns as any
            })) || [],
            demographic_submissions: demographics || []
          };
        }));

        // Pre-fetch full campaign data for instant loading
        if (campaignsToFetch.size > 0) {
          const {
            data: fullCampaigns
          } = await supabase.from("campaigns").select(`
              *,
              brands (
                logo_url
              )
            `).in("id", Array.from(campaignsToFetch));
          if (fullCampaigns) {
            const cache: Record<string, any> = {};
            fullCampaigns.forEach(campaign => {
              cache[campaign.id] = {
                ...campaign,
                brand_logo_url: campaign.brand_logo_url || (campaign.brands as any)?.logo_url,
                platforms: campaign.allowed_platforms || [],
                application_questions: Array.isArray(campaign.application_questions) ? campaign.application_questions as string[] : []
              };
            });
            setCampaignCache(cache);
          }
        }
        setSocialAccounts(accountsWithCampaigns);
      }
    }
    setLoading(false);
  };
  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-4 w-4";
    switch (platform) {
      case "instagram":
        return <img src={instagramLogo} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={youtubeLogo} alt="YouTube" className={iconClass} />;
      case "tiktok":
        return <img src={tiktokLogo} alt="TikTok" className={iconClass} />;
      default:
        return null;
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <div className="bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col items-center text-center space-y-6">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Card className="bg-card border-0">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  if (!profile) {
    return null;
  }
  const handleCampaignClick = async (campaignId: string) => {
    // Check if campaign is already cached
    if (campaignCache[campaignId]) {
      setSelectedCampaign(campaignCache[campaignId]);
      setSheetOpen(true);
      return;
    }

    // Fallback: fetch if not cached
    const {
      data
    } = await supabase.from("campaigns").select(`
        *,
        brands (
          logo_url
        )
      `).eq("id", campaignId).single();
    if (data) {
      const campaignData = {
        ...data,
        brand_logo_url: data.brand_logo_url || (data.brands as any)?.logo_url,
        platforms: data.allowed_platforms || [],
        application_questions: Array.isArray(data.application_questions) ? data.application_questions as string[] : []
      };
      setSelectedCampaign(campaignData);
      setCampaignCache(prev => ({
        ...prev,
        [campaignId]: campaignData
      }));
      setSheetOpen(true);
    }
  };
  const showBanner = !user && profile.id !== user?.id;

  return <div className="min-h-screen bg-background pb-20">
      {/* Header with Large Avatar */}
      <div className="bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Large Avatar without Glow Effect */}
            <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {profile.full_name?.[0] || profile.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name and Username */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{profile.full_name || profile.username}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="text-sm text-foreground/80 max-w-2xl mt-3 font-medium">{profile.bio}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 space-y-6 sm:px-[23px] py-0">
        {/* Connected Accounts */}
        <Card className="bg-card border-0">
          <CardContent className="p-6 py-[13px]">
            <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
            
            {socialAccounts.length === 0 ? <p className="text-center py-8 text-muted-foreground">No accounts connected</p> : <div className="space-y-3">
                {socialAccounts.map(account => {
              const connectedCampaigns = account.connected_campaigns || [];
              const latestDemographicSubmission = account.demographic_submissions?.[0];
              const demographicStatus = latestDemographicSubmission?.status;
              return <div key={account.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border bg-[#131313]">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 w-full">
                        <div onClick={() => account.account_link && window.open(account.account_link, '_blank')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[#1a1a1a] hover:bg-[#222] transition-colors cursor-pointer border border-transparent w-fit">
                          {getPlatformIcon(account.platform)}
                          <span className="font-medium">{account.username}</span>
                        </div>

                        {connectedCampaigns.length > 0 && <Link2 className="hidden sm:block h-3.5 w-3.5 text-white/40 flex-shrink-0" />}

                        {connectedCampaigns.length > 0 && <div className="flex flex-wrap gap-2">
                            {connectedCampaigns.map(connection => {
                      const logoUrl = connection.campaign.brands?.logo_url || connection.campaign.brand_logo_url;
                      return <div key={connection.connection_id} onClick={() => handleCampaignClick(connection.campaign.id)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-white/10 hover:border-white/20 transition-colors cursor-pointer hover:bg-[#222]">
                                  {logoUrl && <img src={logoUrl} alt={connection.campaign.brand_name} className="h-4 w-4 object-contain" />}
                                  <span className="text-xs font-medium">{connection.campaign.title}</span>
                                </div>;
                    })}
                          </div>}
                      </div>
                    </div>;
            })}
              </div>}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-8 pb-4 py-[5px]">
          <img src={wordmarkLogo} alt="Virality" className="h-10 mx-auto opacity-50" />
        </div>
      </div>

      {/* Campaign Sheet */}
      <JoinCampaignSheet campaign={selectedCampaign} open={sheetOpen} onOpenChange={setSheetOpen} />

      {/* Banner for Logged Out Users */}
      {showBanner && (
        <div 
          onClick={() => navigate("/")}
          className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] py-6 px-6 cursor-pointer hover:opacity-90 transition-opacity z-50 rounded-t-[32px]"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
            <span className="text-white font-instrument font-extrabold text-2xl tracking-tighter">
              Go Viral, Get Paid
            </span>
            <ArrowRight className="h-6 w-6 text-white" />
          </div>
        </div>
      )}
    </div>;
}