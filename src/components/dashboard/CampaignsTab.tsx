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
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl">
      {campaigns.map(campaign => {
        const budgetUsed = campaign.budget_used || 0;
        const budgetPercentage = campaign.budget > 0 ? (budgetUsed / campaign.budget) * 100 : 0;
        
        return (
          <Card 
            key={campaign.id} 
            className={`group bg-card border-2 transition-all duration-300 overflow-hidden animate-fade-in ${
              campaign.submission_status === 'approved' 
                ? 'cursor-pointer' 
                : 'cursor-not-allowed opacity-50 grayscale'
            }`}
            onClick={() => {
              if (campaign.submission_status === 'approved') {
                navigate(`/campaign/${campaign.id}`);
              }
            }}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Banner Image - Side Panel */}
              {campaign.banner_url && (
                <div className="relative w-full sm:w-48 h-32 sm:h-auto flex-shrink-0 overflow-hidden bg-muted">
                  <img
                    src={campaign.banner_url}
                    alt={campaign.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                  
                  {/* Status Badge */}
                  {campaign.submission_status && (
                    <div className="absolute top-3 right-3">
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
                </div>
              )}

              {/* Content - Compact Layout */}
              <CardContent className="p-4 flex-1 flex flex-col">
                {/* Header: Brand + Title */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    {campaign.brand_logo_url && (
                      <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={campaign.brand_logo_url} 
                          alt={campaign.brand_name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {campaign.brand_name}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-bold line-clamp-1 mb-1">
                    {campaign.title}
                  </h3>
                  
                  {campaign.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {campaign.description}
                    </p>
                  )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Budget */}
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Budget</span>
                    <div className="text-xs">
                      <span className="font-bold">${budgetUsed.toLocaleString()}</span>
                      <span className="text-muted-foreground"> / ${campaign.budget.toLocaleString()}</span>
                    </div>
                    <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div 
                        className="absolute inset-y-0 left-0 bg-foreground rounded-full transition-all duration-700"
                        style={{ width: `${budgetPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* RPM Rate */}
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">RPM Rate</span>
                    <span className="text-sm font-bold">
                      ${campaign.rpm_rate.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Connected Accounts & Footer Row */}
                <div className="mt-auto pt-2 border-t space-y-2">
                  {campaign.connected_accounts && campaign.connected_accounts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {campaign.connected_accounts.map(account => (
                        <div 
                          key={account.id} 
                          className="flex items-center gap-1 bg-muted/50 rounded px-1.5 py-0.5"
                        >
                          <div className="w-3.5 h-3.5">
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
                          <span className="text-xs font-medium">@{account.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {campaign.start_date && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        );
      })}
    </div>;
}