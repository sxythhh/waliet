import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Share2 } from "lucide-react";
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
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get campaign IDs and their submission status
    const { data: submissions, error: submissionsError } = await supabase
      .from("campaign_submissions")
      .select("campaign_id, status")
      .eq("creator_id", user.id);

    if (submissionsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch your campaigns",
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
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .in("id", campaignIds)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaigns",
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
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You haven't joined any campaigns yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {campaigns.map((campaign) => {
        // Calculate budget progress (mock for now - would come from backend)
        const usedBudget = campaign.budget * 0.35; // Example: 35% used
        const budgetPercentage = (usedBudget / campaign.budget) * 100;

        return (
          <Card 
            key={campaign.id}
            className={`border-0 overflow-hidden transition-all duration-300 ${
              campaign.submission_status === 'approved' 
                ? 'cursor-pointer hover:scale-[1.02]' 
                : 'cursor-not-allowed opacity-60'
            }`}
            onClick={() => {
              if (campaign.submission_status === 'approved') {
                navigate(`/campaign/${campaign.id}`);
              }
            }}
          >
            {/* Banner Section */}
            <div className="relative h-32 sm:h-40 bg-gradient-to-br from-purple-900/60 to-indigo-900/60 overflow-hidden">
              {campaign.banner_url && (
                <img
                  src={campaign.banner_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Brand Logo Overlay */}
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                {campaign.brand_logo_url && (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-background/90 backdrop-blur-sm shadow-lg">
                    <img 
                      src={campaign.brand_logo_url}
                      alt={campaign.brand_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Status Badge */}
              {campaign.submission_status && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <Badge 
                    className={`font-medium text-xs px-2 py-1 ${
                      campaign.submission_status === 'pending' 
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' 
                        : campaign.submission_status === 'approved'
                        ? 'bg-green-500/20 text-green-300 border-green-500/40'
                        : 'bg-red-500/20 text-red-300 border-red-500/40'
                    }`}
                    variant="outline"
                  >
                    {campaign.submission_status.charAt(0).toUpperCase() + campaign.submission_status.slice(1)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Content Section */}
            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Title and Brand */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1 line-clamp-2">
                  {campaign.title}
                </h3>
                <p className="text-sm text-muted-foreground">{campaign.brand_name}</p>
              </div>

              {/* RPM Display */}
              <div className="flex items-baseline gap-2 py-2">
                <span className="text-3xl sm:text-4xl font-bold text-foreground">
                  ${campaign.rpm_rate.toFixed(0)}
                </span>
                <span className="text-base sm:text-lg text-muted-foreground">/1m views</span>
              </div>

              {/* Budget Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Budget Usage</span>
                  <span className="text-foreground font-medium">
                    ${(usedBudget / 1000).toFixed(1)}K / ${(campaign.budget / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${budgetPercentage}%` }}
                  >
                    <div 
                      className="absolute inset-0 opacity-40"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.2) 10px, rgba(255,255,255,.2) 20px)',
                        animation: 'slide 1.5s linear infinite',
                        backgroundSize: '40px 40px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {/* Start Date */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="text-xs">Start</span>
                  </div>
                  <div className="text-xs sm:text-sm text-foreground font-medium">
                    {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBA'}
                  </div>
                </div>

                {/* Platforms */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="text-xs">Platforms</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <img src={instagramLogo} alt="Instagram" className="w-4 h-4 sm:w-5 sm:h-5" />
                    <img src={tiktokLogo} alt="TikTok" className="w-4 h-4 sm:w-5 sm:h-5" />
                    <img src={youtubeLogo} alt="YouTube" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                {/* RPM */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="text-xs">RPM</span>
                  </div>
                  <div className="text-xs sm:text-sm text-foreground font-medium">
                    ${campaign.rpm_rate.toFixed(1)}/1K
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
