import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Infinity, Instagram, Video, Youtube, Share2, Plus } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import { Button } from "@/components/ui/button";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
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
  const [dialogOpen, setDialogOpen] = useState(false);
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
    } = await supabase.from("campaigns").select(`
        *,
        brands (
          logo_url
        )
      `).in("id", campaignIds).order("created_at", {
      ascending: false
    });

    // Fetch user's social accounts connected to these campaigns
    const {
      data: socialAccounts
    } = await supabase.from("social_accounts").select("id, platform, username, campaign_id").eq("user_id", user.id).in("campaign_id", campaignIds);

    // Group social accounts by campaign_id
    const accountsByCampaign = new Map<string, Array<{
      id: string;
      platform: string;
      username: string;
    }>>();
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
  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-7xl">
      {campaigns.map(campaign => {
      const budgetUsed = campaign.budget_used || 0;
      const budgetPercentage = campaign.budget > 0 ? budgetUsed / campaign.budget * 100 : 0;
      const isPending = campaign.submission_status === 'pending';
      return <Card key={campaign.id} className={`group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border hover:border-primary/50 ${isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => !isPending && navigate(`/campaign/${campaign.id}`)}>
            {/* Banner Image - Top Section */}
            {campaign.banner_url && <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                <img src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>}

            {/* Content Section */}
            <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
              {/* Brand Logo + Title */}
              <div className="flex items-start gap-2.5">
                {campaign.brand_logo_url && <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border">
                    <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-full h-full object-cover" />
                  </div>}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-0.5">
                    {campaign.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{campaign.brand_name}</p>
                </div>
              </div>

              {/* Budget Section - Redesigned */}
              <div className="rounded-lg p-2.5 space-y-1.5 bg-[#0d0d0d]">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5 font-chakra tracking-tight">
                    <span className="text-base font-bold tabular-nums">${budgetUsed.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ ${campaign.budget.toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="relative h-1.5 rounded-full overflow-hidden bg-[#1b1b1b]">
                  <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{
                width: `${budgetPercentage}%`
              }} />
                </div>
                
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                  <span>{budgetPercentage.toFixed(0)}% used</span>
                </div>
              </div>

              {/* Connected Accounts */}
              {campaign.connected_accounts && campaign.connected_accounts.length > 0 && <div className="pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.connected_accounts.map(account => <div key={account.id} className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
                        <div className="w-3 h-3">
                          {account.platform.toLowerCase() === 'tiktok' && <img src={tiktokLogo} alt="TikTok" className="w-full h-full" />}
                          {account.platform.toLowerCase() === 'instagram' && <img src={instagramLogo} alt="Instagram" className="w-full h-full" />}
                          {account.platform.toLowerCase() === 'youtube' && <img src={youtubeLogo} alt="YouTube" className="w-full h-full" />}
                        </div>
                        <span className="text-[11px] font-semibold">@{account.username}</span>
                      </div>)}
                  </div>
                </div>}

              {/* Application Status */}
              {isPending ? <div className="mt-auto pt-2">
                  <div className="bg-muted/30 rounded-md px-2.5 py-1.5 flex items-center justify-center">
                    <span className="text-[11px] font-instrument tracking-tight text-muted-foreground font-medium">
                      Pending Review
                    </span>
                  </div>
                </div> : <div className="mt-auto pt-2">
                  <Button variant="ghost" size="sm" className="w-full h-8 text-[11px] font-instrument tracking-tight hover:bg-muted/50" onClick={e => {
              e.stopPropagation();
              setDialogOpen(true);
            }}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Link Account
                  </Button>
                </div>}
            </CardContent>
          </Card>;
    })}
    
    <AddSocialAccountDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchCampaigns} />
    
    </div>;
}