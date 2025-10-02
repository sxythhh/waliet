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

    // Fetch campaigns user has joined
    const {
      data,
      error
    } = await supabase.from("campaigns").select("*").in("id", campaignIds).order("created_at", {
      ascending: false
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaigns"
      });
    } else {
      // Add submission status to each campaign
      const campaignsWithStatus = (data || []).map(campaign => ({
        ...campaign,
        submission_status: submissionStatusMap.get(campaign.id)
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
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {campaigns.map(campaign => {
      const budgetPercentage = campaign.budget > 0 ? (campaign.budget_used || 0) / campaign.budget * 100 : 0;
      return <Card key={campaign.id} className={`bg-gradient-card border-0 transition-all duration-300 overflow-hidden ${campaign.submission_status === 'approved' ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-not-allowed opacity-50 grayscale'}`} onClick={() => {
        if (campaign.submission_status === 'approved') {
          navigate(`/campaign/${campaign.id}`);
        }
      }}>
            <div className="relative">
              {campaign.banner_url ? <div className="h-32 w-full bg-gradient-to-br from-background to-muted overflow-hidden">
                  <img src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover" />
                </div> : <div className="h-32 w-full bg-gradient-to-br from-background to-muted" />}
              
              <div className="absolute top-4 right-4">
                {campaign.submission_status && <Badge className={`font-bold text-sm px-3 py-1 ${campaign.submission_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : campaign.submission_status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`} variant="outline">
                    {campaign.submission_status.charAt(0).toUpperCase() + campaign.submission_status.slice(1)}
                  </Badge>}
              </div>

              <div className="absolute -bottom-12 left-6">
                <div className="relative">
                  <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-24 h-24 rounded-2xl object-cover border-4 border-background shadow-lg" />
                </div>
              </div>
            </div>

            <CardHeader className="space-y-3 pt-16 pb-3">
              <div>
                <CardTitle className="text-xl mb-2">{campaign.title}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    RPM Campaign
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-muted-foreground" />
                    <Video className="w-3.5 h-3.5 text-muted-foreground" />
                    <Youtube className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <CardDescription className="line-clamp-2 text-sm">
                {campaign.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget Used</span>
                  <span className="font-semibold">
                    ${campaign.budget_used || 0} / ${campaign.budget >= 1000 ? `${(campaign.budget / 1000).toFixed(1)}K` : campaign.budget}
                  </span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500" style={{
                  width: `${Math.min(budgetPercentage, 100)}%`
                }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Start Date</span>
                </div>
                <div className="text-right text-foreground font-medium text-xs">
                  {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'TBA'}
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs">Networks</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <img src={instagramLogo} alt="Instagram" className="w-4 h-4" />
                  <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />
                  <img src={youtubeLogo} alt="YouTube" className="w-4 h-4" />
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Reward</span>
                </div>
                <div className="text-right text-foreground font-medium text-xs">
                  ${campaign.rpm_rate.toFixed(2)} per 100K views
                </div>
              </div>
            </CardContent>
          </Card>;
    })}
    </div>;
}