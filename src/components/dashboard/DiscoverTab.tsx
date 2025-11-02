import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, DollarSign, Video, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JoinCampaignSheet } from "@/components/JoinCampaignSheet";
import { ApplyToBountySheet } from "@/components/ApplyToBountySheet";
import { OptimizedImage } from "@/components/OptimizedImage";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import emptyCampaignsImage from "@/assets/empty-campaigns.png";
import { Skeleton } from "@/components/ui/skeleton";
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
  platforms: string[];
  slug: string;
  preview_url: string | null;
  guidelines: string | null;
  application_questions: string[];
  is_infinite_budget?: boolean;
  is_featured?: boolean;
  brands?: {
    logo_url: string;
  };
}
interface BountyCampaign {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  status: string;
  created_at: string;
  brand_id: string;
  brands?: {
    name: string;
    logo_url: string;
  };
}
export function DiscoverTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [bounties, setBounties] = useState<BountyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("popular");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedBounty, setSelectedBounty] = useState<BountyCampaign | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bountySheetOpen, setBountySheetOpen] = useState(false);
  const navigate = useNavigate();
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
    let joinedCampaignIds: string[] = [];
    let appliedBountyIds: string[] = [];
    if (user) {
      // Get campaigns user has already joined or has pending applications for
      const {
        data: submissions
      } = await supabase.from("campaign_submissions").select("campaign_id").eq("creator_id", user.id).in("status", ["approved", "pending"]);
      joinedCampaignIds = submissions?.map(s => s.campaign_id) || [];

      // Get bounties user has already applied to
      const {
        data: bountyApps
      } = await supabase.from("bounty_applications").select("bounty_campaign_id").eq("user_id", user.id).in("status", ["pending", "accepted"]);
      appliedBountyIds = bountyApps?.map(b => b.bounty_campaign_id) || [];
    }

    // Fetch campaigns
    const {
      data,
      error
    } = await supabase.from("campaigns").select(`
        *,
        brands (
          logo_url
        )
      `).in("status", ["active", "ended"]).order("created_at", {
      ascending: false
    });
    if (!error && data) {
      const availableCampaigns = data.filter(campaign => !joinedCampaignIds.includes(campaign.id));
      const campaignsWithBrandLogo = availableCampaigns.map(campaign => ({
        ...campaign,
        brand_logo_url: campaign.brand_logo_url || (campaign.brands as any)?.logo_url,
        platforms: campaign.allowed_platforms || [],
        application_questions: Array.isArray(campaign.application_questions) ? campaign.application_questions as string[] : []
      }));
      setCampaigns(campaignsWithBrandLogo);
    }

    // Fetch bounties
    const {
      data: bountiesData,
      error: bountiesError
    } = await supabase.from("bounty_campaigns").select(`
        *,
        brands (
          name,
          logo_url
        )
      `).in("status", ["active", "ended"]).order("created_at", {
      ascending: false
    });
    if (!bountiesError && bountiesData) {
      const availableBounties = bountiesData.filter(bounty => !appliedBountyIds.includes(bounty.id));
      setBounties(availableBounties as BountyCampaign[]);
    }
    setLoading(false);
  };
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) || campaign.brand_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = !selectedPlatform || campaign.platforms && campaign.platforms.some(p => p.toLowerCase() === selectedPlatform.toLowerCase());
    return matchesSearch && matchesPlatform;
  });

  // Separate active and ended campaigns
  const activeCampaigns = filteredCampaigns.filter(c => c.status !== "ended");
  const endedCampaigns = filteredCampaigns.filter(c => c.status === "ended");

  // Sort active campaigns - featured campaigns always appear first
  const sortedActiveCampaigns = [...activeCampaigns].sort((a, b) => {
    // Featured campaigns always come first
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;

    // Then apply the selected sorting
    if (sortBy === "budget") {
      const budgetRemainingA = a.budget - (a.budget_used || 0);
      const budgetRemainingB = b.budget - (b.budget_used || 0);
      return budgetRemainingB - budgetRemainingA;
    }
    if (sortBy === "rpm") {
      return b.rpm_rate - a.rpm_rate;
    }
    if (sortBy === "popular") {
      return (b.budget_used || 0) - (a.budget_used || 0);
    }
    return 0;
  });

  // Sort ended campaigns using the same logic
  const sortedEndedCampaigns = [...endedCampaigns].sort((a, b) => {
    if (sortBy === "budget") {
      const budgetRemainingA = a.budget - (a.budget_used || 0);
      const budgetRemainingB = b.budget - (b.budget_used || 0);
      return budgetRemainingB - budgetRemainingA;
    }
    if (sortBy === "rpm") {
      return b.rpm_rate - a.rpm_rate;
    }
    if (sortBy === "popular") {
      return (b.budget_used || 0) - (a.budget_used || 0);
    }
    return 0;
  });

  // Combine: active campaigns first, ended campaigns last
  const sortedCampaigns = [...sortedActiveCampaigns, ...sortedEndedCampaigns];
  const platforms = ["TikTok", "Instagram", "YouTube"];
  return <div className="space-y-6">
      {/* Iframe Section - No padding, hidden on mobile */}
      <div className="hidden md:block w-full h-[300px] rounded-lg overflow-hidden border border-border">
        <iframe src="https://www.virality.cc/discover" className="w-full h-full border-0" title="Discover Campaigns" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      </div>

      {/* Content with padding */}
      <div className="px-6 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px] h-11 border-transparent bg-[#0F0F0F]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="budget">Budget Remaining</SelectItem>
              <SelectItem value="rpm">Highest RPM</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant={selectedPlatform === null ? "default" : "outline"} onClick={() => setSelectedPlatform(null)} className={`h-11 px-4 border-0 ${selectedPlatform === null ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#0F0F0F] hover:bg-[#0F0F0F]/80'}`}>
              All
            </Button>
            <Button variant={selectedPlatform === "TikTok" ? "default" : "outline"} onClick={() => setSelectedPlatform(selectedPlatform === "TikTok" ? null : "TikTok")} className={`h-11 w-11 p-0 border-0 ${selectedPlatform === "TikTok" ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#0F0F0F] hover:bg-[#0F0F0F]/80'}`} title="TikTok">
              <img src={tiktokLogo} alt="TikTok" className="w-5 h-5" />
            </Button>
            <Button variant={selectedPlatform === "Instagram" ? "default" : "outline"} onClick={() => setSelectedPlatform(selectedPlatform === "Instagram" ? null : "Instagram")} className={`h-11 w-11 p-0 border-0 ${selectedPlatform === "Instagram" ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#0F0F0F] hover:bg-[#0F0F0F]/80'}`} title="Instagram">
              <img src={instagramLogo} alt="Instagram" className="w-5 h-5" />
            </Button>
            <Button variant={selectedPlatform === "YouTube" ? "default" : "outline"} onClick={() => setSelectedPlatform(selectedPlatform === "YouTube" ? null : "YouTube")} className={`h-11 w-11 p-0 border-0 ${selectedPlatform === "YouTube" ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#0F0F0F] hover:bg-[#0F0F0F]/80'}`} title="YouTube">
              <img src={youtubeLogo} alt="YouTube" className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Campaigns and Bounties Grid */}
        {loading ? <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full mx-auto">
            <Skeleton className="h-[350px] rounded-lg" />
            <Skeleton className="h-[350px] rounded-lg" />
            <Skeleton className="h-[350px] rounded-lg" />
            <Skeleton className="h-[350px] rounded-lg" />
            <Skeleton className="h-[350px] rounded-lg" />
            <Skeleton className="h-[350px] rounded-lg" />
          </div> : sortedCampaigns.length === 0 && bounties.length === 0 ? <div className="text-center py-12 flex flex-col items-center gap-4">
            <img src={emptyCampaignsImage} alt="No campaigns" className="w-64 h-64 object-contain opacity-80" />
            <p className="text-slate-50 font-medium">No campaigns or bounties found</p>
          </div> : <div className="space-y-8">
            {sortedCampaigns.length > 0 && <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full mx-auto">
            {sortedCampaigns.map(campaign => {
              const budgetUsed = campaign.budget_used || 0;
              const budgetPercentage = campaign.budget > 0 ? budgetUsed / campaign.budget * 100 : 0;
              const handleCampaignClick = () => {
                if (campaign.status !== "ended") {
                  setSelectedCampaign(campaign);
                  setSheetOpen(true);
                }
              };
              const isEnded = campaign.status === "ended";
              return <Card key={campaign.id} className={`group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border relative ${isEnded ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`} onClick={handleCampaignClick}>
                  {/* Gradient overlay for ended campaigns */}
                  {isEnded && <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />}
                  {/* Banner Image */}
                  {campaign.banner_url && <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                      <OptimizedImage src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                      {isEnded && <div className="absolute top-2 right-2 z-20">
                          <span className="text-red-500 text-xs font-medium px-2 py-1 bg-[#1a1a1a] rounded">
                            Ended
                          </span>
                        </div>}
                      {!isEnded && campaign.is_featured && <div className="absolute top-2 right-2 z-20">
                          <span className="text-primary text-xs font-medium px-2 py-1 bg-[#1a1a1a]/90 backdrop-blur-sm rounded border">
                            Featured
                          </span>
                        </div>}
                    </div>}

                  {/* Content Section */}
                  <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
                    {/* Brand Logo + Title */}
                    <div className="flex items-start gap-2.5">
                      {campaign.brand_logo_url && <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border">
                          <OptimizedImage src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-full h-full object-cover" />
                        </div>}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-0.5">
                          {campaign.title}
                        </h3>
                        <p className="text-xs text-muted-foreground font-semibold">{campaign.brand_name}</p>
                      </div>
                    </div>

                    {/* Budget Section */}
                    <div className="rounded-lg p-2.5 space-y-1.5 bg-[#0d0d0d]">
                      {campaign.is_infinite_budget ? <>
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1.5 font-chakra tracking-tight">
                              <span className="text-base font-bold">
                                ∞ Unlimited Budget
                              </span>
                            </div>
                          </div>

                          {/* Animated Infinite Progress Bar */}
                          <div className="relative h-1.5 rounded-full overflow-hidden" style={{
                        background: 'linear-gradient(45deg, hsl(217, 91%, 60%) 25%, hsl(217, 91%, 45%) 25%, hsl(217, 91%, 45%) 50%, hsl(217, 91%, 60%) 50%, hsl(217, 91%, 60%) 75%, hsl(217, 91%, 45%) 75%, hsl(217, 91%, 45%))',
                        backgroundSize: '20px 20px',
                        animation: 'slide 1s linear infinite'
                      }} />

                          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span>No budget limit</span>
                          </div>
                        </> : <>
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1.5 font-chakra tracking-tight">
                              <span className="text-base font-bold tabular-nums">
                                ${budgetUsed.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground font-semibold">
                                / ${campaign.budget.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="relative h-1.5 rounded-full overflow-hidden bg-[#1b1b1b]">
                            <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{
                          width: `${budgetPercentage}%`
                        }} />
                          </div>

                          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span className="font-semibold">{budgetPercentage.toFixed(0)}% used</span>
                          </div>
                        </>}
                    </div>
                  </CardContent>
                </Card>;
            })}
                </div>
              </div>}

            {bounties.length > 0 && <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Bounties</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {bounties.map(bounty => {
              const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;
              const isFull = spotsRemaining <= 0;
              const isEnded = bounty.status === "ended";
              return <Card key={bounty.id} className={`group bg-card border transition-all duration-300 animate-fade-in flex flex-col overflow-hidden relative ${isEnded ? "opacity-60" : "cursor-pointer"}`} onClick={() => {
                if (!isEnded) {
                  setSelectedBounty(bounty);
                  setBountySheetOpen(true);
                }
              }}>
                        {isEnded && <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />}
                        
                        {bounty.banner_url && <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                            <OptimizedImage src={bounty.banner_url} alt={bounty.title} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                            {isEnded && <div className="absolute top-2 right-2 z-20">
                                <span className="text-red-500 text-xs font-medium px-2 py-1 bg-[#1a1a1a] rounded">
                                  Ended
                                </span>
                              </div>}
                          </div>}
                        
                        <CardContent className="p-4 flex-1 flex flex-col gap-3">
                          <div className="flex items-start gap-2.5">
                            {bounty.brands?.logo_url && <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border">
                                <OptimizedImage src={bounty.brands.logo_url} alt={bounty.brands.name || ''} className="w-full h-full object-cover" />
                              </div>}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-0.5">
                                {bounty.title}
                              </h3>
                              <p className="text-xs text-muted-foreground font-semibold">{bounty.brands?.name}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Monthly Retainer</span>
                              <span className="font-semibold">${bounty.monthly_retainer.toLocaleString()}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Videos/Month</span>
                              <span className="font-semibold">{bounty.videos_per_month}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Positions</span>
                              <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-green-500'}`}>
                                {bounty.accepted_creators_count} / {bounty.max_accepted_creators}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>;
            })}
                </div>
              </div>}
          </div>}
      </div>

      <JoinCampaignSheet campaign={selectedCampaign} open={sheetOpen} onOpenChange={setSheetOpen} />
      
      <ApplyToBountySheet open={bountySheetOpen} onOpenChange={setBountySheetOpen} bounty={selectedBounty} onSuccess={() => {
      setBountySheetOpen(false);
      fetchCampaigns();
    }} />
    </div>;
}