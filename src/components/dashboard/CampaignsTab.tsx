import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Infinity, Instagram, Video, Youtube, Share2 } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
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
  submission_status?: string;
  connected_accounts?: Array<{
    id: string;
    platform: string;
    username: string;
  }>;
}
export function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchCampaigns();
  }, []);
  const fetchCampaigns = async () => {
    setLoading(true);

    // Get current user
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get campaign IDs and their submission status
    const {
      data: submissions,
      error: submissionsError
    } = await supabase.from("campaign_submissions").select("campaign_id, status").eq("creator_id", user.id);
    if (submissionsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch your campaigns"
      });
      setLoading(false);
      return;
    }
    const campaignIds = submissions?.map(s => s.campaign_id) || [];
    const submissionStatusMap = new Map(submissions?.map(s => [s.campaign_id, s.status]) || []);
    if (campaignIds.length === 0) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    // Fetch campaigns user has joined with brand logos
    const {
      data,
      error
    } = await supabase
      .from("campaigns")
      .select(`
        *,
        brands (
          logo_url
        )
      `)
      .in("id", campaignIds)
      .order("created_at", {
        ascending: false
      });
    
    // Fetch user's social accounts connected to these campaigns
    const {
      data: socialAccounts
    } = await supabase
      .from("social_accounts")
      .select("id, platform, username, campaign_id")
      .eq("user_id", user.id)
      .in("campaign_id", campaignIds);
    
    // Group social accounts by campaign_id
    const accountsByCampaign = new Map<string, Array<{id: string, platform: string, username: string}>>();
    socialAccounts?.forEach(account => {
      if (account.campaign_id) {
        if (!accountsByCampaign.has(account.campaign_id)) {
          accountsByCampaign.set(account.campaign_id, []);
        }
        accountsByCampaign.get(account.campaign_id)?.push({
          id: account.id,
          platform: account.platform,
          username: account.username
        });
      }
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaigns"
      });
    } else {
      // Add submission status and brand logo to each campaign
      const campaignsWithStatus = (data || []).map(campaign => ({
        ...campaign,
        brand_logo_url: campaign.brand_logo_url || (campaign.brands as any)?.logo_url,
        submission_status: submissionStatusMap.get(campaign.id),
        connected_accounts: accountsByCampaign.get(campaign.id) || []
      }));
      setCampaigns(campaignsWithStatus);
    }
    setLoading(false);
  };
  if (loading) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>;
  }
  if (campaigns.length === 0) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground">You haven't joined any campaigns yet</p>
      </div>;
  }
  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl">
      {campaigns.map(campaign => {
        const budgetUsed = campaign.budget_used || 0;
        const budgetPercentage = campaign.budget > 0 ? (budgetUsed / campaign.budget) * 100 : 0;
        
        return (
          <Card 
            key={campaign.id} 
            className="group bg-card transition-all duration-300 animate-fade-in flex flex-col cursor-pointer"
            onClick={() => navigate(`/campaign/${campaign.id}`)}
          >
            {/* Banner Image - Top Section */}
            {campaign.banner_url && (
              <div className="relative w-full h-48 flex-shrink-0 overflow-hidden bg-muted rounded-t-lg">
                <img
                  src={campaign.banner_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* Status Badge */}
                {campaign.submission_status && (
                  <div className="absolute top-4 right-4">
                    <Badge 
                      className={`backdrop-blur-sm font-medium text-xs ${
                        campaign.submission_status === 'pending' 
                          ? 'bg-yellow-500/90 text-white border-0' 
                          : campaign.submission_status === 'approved' 
                          ? 'bg-green-500/90 text-white border-0' 
                          : 'bg-red-500/90 text-white border-0'
                      }`}
                    >
                      {campaign.submission_status.charAt(0).toUpperCase() + campaign.submission_status.slice(1)}
                    </Badge>
                  </div>
                )}

                {/* Brand Logo - Overlapping */}
                {campaign.brand_logo_url && (
                  <div className="absolute bottom-0 left-6 transform translate-y-1/2 z-10">
                    <div className="w-16 h-16 rounded-xl overflow-hidden ring-4 ring-card shadow-lg">
                      <img 
                        src={campaign.brand_logo_url} 
                        alt={campaign.brand_name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content Section */}
            <CardContent className="p-6 pt-10 flex-1 flex flex-col gap-5">
              {/* Header: Brand Name + RPM */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {campaign.brand_name}
                </span>
                
                {/* RPM Rate Badge */}
                <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-bold text-primary">{campaign.rpm_rate.toFixed(2)}</span>
                  <span className="text-xs text-primary/70">RPM</span>
                </div>
              </div>
              
              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold line-clamp-2 leading-tight">
                  {campaign.title}
                </h3>
                
                {campaign.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {campaign.description}
                  </p>
                )}
              </div>

              {/* Budget Section */}
              <div className="relative bg-neutral-900/50 rounded-xl p-4">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Campaign Budget</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">${budgetUsed.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground font-medium">of ${campaign.budget.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{budgetPercentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="relative h-2 bg-neutral-950 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>
              </div>

              {/* Connected Accounts & Footer */}
              <div className="mt-auto space-y-3">
                {campaign.connected_accounts && campaign.connected_accounts.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Connected Accounts</span>
                    <div className="flex flex-wrap gap-2">
                      {campaign.connected_accounts.map(account => (
                        <div 
                          key={account.id} 
                          className="flex items-center gap-2 bg-neutral-900/50 rounded-lg px-3 py-2"
                        >
                          <div className="w-4 h-4">
                            {account.platform.toLowerCase() === 'tiktok' && (
                              <img src={tiktokLogo} alt="TikTok" className="w-full h-full" />
                            )}
                            {account.platform.toLowerCase() === 'instagram' && (
                              <img src={instagramLogo} alt="Instagram" className="w-full h-full" />
                            )}
                            {account.platform.toLowerCase() === 'youtube' && (
                              <img src={youtubeLogo} alt="YouTube" className="w-full h-full" />
                            )}
                          </div>
                          <span className="text-sm font-semibold">@{account.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {campaign.start_date && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-medium">Started {new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>;
}