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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {campaigns.map((campaign) => {
        // Calculate budget progress (mock for now - would come from backend)
        const usedBudget = campaign.budget * 0.35; // Example: 35% used
        const budgetPercentage = (usedBudget / campaign.budget) * 100;

        return (
          <Card 
            key={campaign.id}
            className={`relative border-0 transition-all duration-300 overflow-hidden group ${
              campaign.submission_status === 'approved' 
                ? 'cursor-pointer hover:scale-[1.02]' 
                : 'cursor-not-allowed opacity-50'
            }`}
            onClick={() => {
              if (campaign.submission_status === 'approved') {
                navigate(`/campaign/${campaign.id}`);
              }
            }}
          >
            {/* Background with gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-background">
              {campaign.banner_url && (
                <img
                  src={campaign.banner_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover opacity-20"
                />
              )}
            </div>

            {/* Content */}
            <div className="relative z-10 p-6 space-y-4">
              {/* Header with View Campaign button */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {campaign.brand_logo_url && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-background/80 backdrop-blur-sm flex-shrink-0 border border-white/10">
                      <img 
                        src={campaign.brand_logo_url}
                        alt={campaign.brand_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white">{campaign.brand_name}</h3>
                  </div>
                </div>
                
                {campaign.submission_status === 'approved' && (
                  <button className="px-3 py-1.5 text-sm font-medium text-white/90 hover:text-white transition-colors flex items-center gap-1.5">
                    <Share2 className="w-4 h-4" />
                    View Campaign
                  </button>
                )}
              </div>

              {/* Campaign Title */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{campaign.title}</h2>
                {campaign.submission_status && (
                  <Badge 
                    className={`font-medium text-xs px-2 py-0.5 ${
                      campaign.submission_status === 'pending' 
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                        : campaign.submission_status === 'approved'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}
                    variant="outline"
                  >
                    {campaign.submission_status.charAt(0).toUpperCase() + campaign.submission_status.slice(1)}
                  </Badge>
                )}
              </div>

              {/* RPM Rate - Large Display */}
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">
                  ${campaign.rpm_rate.toFixed(0)}
                </span>
                <span className="text-lg text-white/60">/1m views</span>
              </div>

              {/* Budget Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Budget Usage</span>
                  <span className="text-white font-medium">
                    ${usedBudget.toLocaleString()} / ${Number(campaign.budget).toLocaleString()}
                  </span>
                </div>
                <div className="relative h-2.5 bg-black/40 rounded-full overflow-hidden">
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
              <div className="grid grid-cols-3 gap-4 pt-2">
                {/* Start Date */}
                <div>
                  <div className="flex items-center gap-1.5 text-white/60 text-xs mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Start Date</span>
                  </div>
                  <div className="text-white font-medium text-sm">
                    {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBA'}
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <div className="flex items-center gap-1.5 text-white/60 text-xs mb-1">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Platforms</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <img src={instagramLogo} alt="Instagram" className="w-4 h-4 opacity-80" />
                    <img src={tiktokLogo} alt="TikTok" className="w-4 h-4 opacity-80" />
                    <img src={youtubeLogo} alt="YouTube" className="w-4 h-4 opacity-80" />
                  </div>
                </div>

                {/* RPM */}
                <div>
                  <div className="flex items-center gap-1.5 text-white/60 text-xs mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>RPM</span>
                  </div>
                  <div className="text-white font-medium text-sm">
                    ${campaign.rpm_rate.toFixed(1)}/1K
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
