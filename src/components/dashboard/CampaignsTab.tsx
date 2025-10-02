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
        const budgetUsed = campaign.budget_used || 0;
        const budgetPercentage = campaign.budget > 0 ? (budgetUsed / campaign.budget) * 100 : 0;
        
        return (
          <Card 
            key={campaign.id} 
            className={`bg-gradient-card border-0 transition-all duration-300 overflow-hidden animate-fade-in ${
              campaign.submission_status === 'approved' 
                ? 'cursor-pointer hover:scale-[1.02]' 
                : 'cursor-not-allowed opacity-50 grayscale'
            }`} 
            onClick={() => {
              if (campaign.submission_status === 'approved') {
                navigate(`/campaign/${campaign.id}`);
              }
            }}
          >
            {/* Banner with Logo */}
            {campaign.banner_url && (
              <div className="w-full h-32 overflow-hidden relative">
                <img
                  src={campaign.banner_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
                {campaign.brand_logo_url && (
                  <div className="absolute bottom-3 left-3">
                    <img 
                      src={campaign.brand_logo_url} 
                      alt={campaign.brand_name} 
                      className="w-12 h-12 rounded-lg object-cover border-2 border-background" 
                    />
                  </div>
                )}
              </div>
            )}

            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">
                    {campaign.title}
                  </h3>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {campaign.description}
                    </p>
                  )}
                </div>
                {campaign.submission_status && (
                  <Badge 
                    className={`ml-2 ${
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

              {/* Animated Progress Bar */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget Usage</span>
                  <span className="font-medium">
                    ${budgetUsed.toLocaleString()} / ${campaign.budget.toLocaleString()}
                  </span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
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

              {/* RPM Display */}
              <div className="flex items-center justify-between text-sm pt-4 border-t border-border/50">
                <span className="text-muted-foreground">RPM Rate</span>
                <span className="font-semibold text-success">
                  ${campaign.rpm_rate.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>;
}