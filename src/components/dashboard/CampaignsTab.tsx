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
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
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
            {/* Banner with Logo - Clean Overlay */}
            {campaign.banner_url && (
              <div className="relative w-full h-40 overflow-hidden bg-muted">
                <img
                  src={campaign.banner_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20" />

                {/* Status Badge */}
                {campaign.submission_status && (
                  <div className="absolute top-4 right-4">
                    <Badge 
                      className={`backdrop-blur-sm font-medium ${
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

            <CardContent className="p-6 pt-10">
              {/* Brand Name with Logo */}
              <div className="flex items-center gap-2 mb-3">
                {campaign.brand_logo_url && (
                  <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0">
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

              {/* Title & Description */}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2 line-clamp-1">
                  {campaign.title}
                </h3>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {campaign.description}
                  </p>
                )}
              </div>

              {/* Stats Grid */}
              <div className="space-y-4 mb-5">
                {/* Budget Progress */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget</span>
                    <div className="text-right">
                      <span className="text-sm font-bold">${budgetUsed.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground"> / ${campaign.budget.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-foreground rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${budgetPercentage}%` }}
                    />
                  </div>
                </div>

                {/* RPM Rate */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">RPM Rate</span>
                  <span className="text-base font-bold">
                    ${campaign.rpm_rate.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Start Date Footer */}
              {campaign.start_date && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Started {new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>;
}