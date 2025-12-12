import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { JoinPrivateCampaignDialog } from "@/components/JoinPrivateCampaignDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Video, Users, Search, SlidersHorizontal, Bookmark, PauseCircle } from "lucide-react";
import checkCircleIcon from "@/assets/check-circle-filled.svg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { JoinCampaignSheet } from "@/components/JoinCampaignSheet";
import { ApplyToBountySheet } from "@/components/ApplyToBountySheet";
import { OptimizedImage } from "@/components/OptimizedImage";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import emptyCampaignsImage from "@/assets/empty-campaigns.png";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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
  created_at: string;
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
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [frequency, setFrequency] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hideInfiniteBudget, setHideInfiniteBudget] = useState(false);
  const [hideLowBudget, setHideLowBudget] = useState(false);
  const [hideEnded, setHideEnded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedBounty, setSelectedBounty] = useState<BountyCampaign | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bountySheetOpen, setBountySheetOpen] = useState(false);
  const [joinPrivateDialogOpen, setJoinPrivateDialogOpen] = useState(false);
  const [bookmarkedCampaignIds, setBookmarkedCampaignIds] = useState<string[]>([]);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Auto-open private campaign dialog if joinPrivate param is present
  useEffect(() => {
    if (searchParams.get("joinPrivate") === "true") {
      setJoinPrivateDialogOpen(true);
      // Remove the param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("joinPrivate");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Auto-open join sheet if campaignSlug param is present
  useEffect(() => {
    const campaignSlug = searchParams.get("campaignSlug");
    if (campaignSlug && !loading) {
      const campaign = campaigns.find(c => c.slug === campaignSlug);
      if (campaign) {
        setSelectedCampaign(campaign);
        setSheetOpen(true);
        // Remove the param from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("campaignSlug");
        setSearchParams(newParams, { replace: true });
      } else {
        // Campaign not found in public campaigns (might be private), fetch it directly
        fetchCampaignBySlug(campaignSlug);
      }
    }
  }, [searchParams, campaigns, loading]);

  const fetchCampaignBySlug = async (slug: string) => {
    const { data, error } = await supabase
      .from("campaigns")
      .select(`*, brands (logo_url)`)
      .eq("slug", slug)
      .in("status", ["active", "ended"])
      .maybeSingle();
    
    if (!error && data) {
      const campaignData: Campaign = {
        ...data,
        brand_logo_url: data.brand_logo_url || (data.brands as any)?.logo_url,
        platforms: data.allowed_platforms || [],
        application_questions: Array.isArray(data.application_questions) ? data.application_questions as string[] : []
      };
      setSelectedCampaign(campaignData);
      setSheetOpen(true);
      // Remove the param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("campaignSlug");
      setSearchParams(newParams, { replace: true });
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase
      .from("campaign_bookmarks")
      .select("campaign_id")
      .eq("user_id", user.id);
    
    if (!error && data) {
      setBookmarkedCampaignIds(data.map(b => b.campaign_id));
    }
  };

  const toggleBookmark = async (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to bookmark campaigns");
      return;
    }
    
    const isBookmarked = bookmarkedCampaignIds.includes(campaignId);
    
    if (isBookmarked) {
      const { error } = await supabase
        .from("campaign_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("campaign_id", campaignId);
      
      if (!error) {
        setBookmarkedCampaignIds(prev => prev.filter(id => id !== campaignId));
        toast.success("Bookmark removed");
      }
    } else {
      const { error } = await supabase
        .from("campaign_bookmarks")
        .insert({ user_id: user.id, campaign_id: campaignId });
      
      if (!error) {
        setBookmarkedCampaignIds(prev => [...prev, campaignId]);
        toast.success("Campaign bookmarked");
      }
    }
  };

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
      `).in("status", ["active", "ended"]).eq("is_private", false).order("created_at", {
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
    const matchesPlatform = !selectedPlatform || campaign.platforms && campaign.platforms.some(p => p.toLowerCase() === selectedPlatform.toLowerCase());
    const matchesSearch = !searchQuery || campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) || campaign.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) || campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || statusFilter === "active" && campaign.status !== "ended" || statusFilter === "ended" && campaign.status === "ended";
    const matchesInfiniteBudget = !hideInfiniteBudget || !campaign.is_infinite_budget;
    const matchesLowBudget = !hideLowBudget || campaign.budget >= 1000;
    const matchesEnded = !hideEnded || campaign.status !== "ended";
    const matchesBookmarked = !showBookmarkedOnly || bookmarkedCampaignIds.includes(campaign.id);
    return matchesPlatform && matchesSearch && matchesStatus && matchesInfiniteBudget && matchesLowBudget && matchesEnded && matchesBookmarked;
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
    if (sortBy === "newest") {
      return new Date(b.start_date || b.created_at).getTime() - new Date(a.start_date || a.created_at).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.start_date || a.created_at).getTime() - new Date(b.start_date || b.created_at).getTime();
    }
    if (sortBy === "budget-high") {
      const budgetRemainingA = a.budget - (a.budget_used || 0);
      const budgetRemainingB = b.budget - (b.budget_used || 0);
      return budgetRemainingB - budgetRemainingA;
    }
    if (sortBy === "budget-low") {
      const budgetRemainingA = a.budget - (a.budget_used || 0);
      const budgetRemainingB = b.budget - (b.budget_used || 0);
      return budgetRemainingA - budgetRemainingB;
    }
    if (sortBy === "rpm-high") {
      return b.rpm_rate - a.rpm_rate;
    }
    if (sortBy === "rpm-low") {
      return a.rpm_rate - b.rpm_rate;
    }
    if (sortBy === "popular") {
      return (b.budget_used || 0) - (a.budget_used || 0);
    }
    return 0;
  });

  // Sort ended campaigns using the same logic
  const sortedEndedCampaigns = [...endedCampaigns].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.start_date || b.created_at).getTime() - new Date(a.start_date || a.created_at).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.start_date || a.created_at).getTime() - new Date(b.start_date || b.created_at).getTime();
    }
    if (sortBy === "budget-high") {
      const budgetRemainingA = a.budget - (a.budget_used || 0);
      const budgetRemainingB = b.budget - (b.budget_used || 0);
      return budgetRemainingB - budgetRemainingA;
    }
    if (sortBy === "budget-low") {
      const budgetRemainingA = a.budget - (a.budget_used || 0);
      const budgetRemainingB = b.budget - (b.budget_used || 0);
      return budgetRemainingA - budgetRemainingB;
    }
    if (sortBy === "rpm-high") {
      return b.rpm_rate - a.rpm_rate;
    }
    if (sortBy === "rpm-low") {
      return a.rpm_rate - b.rpm_rate;
    }
    if (sortBy === "popular") {
      return (b.budget_used || 0) - (a.budget_used || 0);
    }
    return 0;
  });

  // Combine: active campaigns first, ended campaigns last
  const sortedCampaigns = [...sortedActiveCampaigns, ...sortedEndedCampaigns];
  const platforms = ["TikTok", "Instagram", "YouTube"];
  const totalActiveCampaigns = activeCampaigns.length;
  const totalBounties = bounties.filter(b => b.status !== "ended").length;
  return <div className="md:h-full md:flex md:flex-col">
        {/* Sticky Header and Filters */}
        <div className="md:sticky md:top-0 z-20 bg-background px-6 pt-8 pb-4 space-y-6">
          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Discover Opportunities</h1>
            <p className="text-muted-foreground">Find campaigns and bounties that match your content style</p>
          </div>

        {/* Quick Stats */}
        

        {/* Filters */}
        <div className="space-y-3 font-['Inter'] tracking-[-0.5px]">
          {/* Search and Filters Row */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input placeholder="Search campaigns..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-muted/30 border-0 rounded-lg text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-muted-foreground/20" />
            </div>

            {/* Platform Pills */}
            <div className="flex items-center gap-1.5">
              {[{
            value: "all",
            label: "All"
          }, {
            value: "tiktok",
            label: "TikTok"
          }, {
            value: "instagram",
            label: "Instagram"
          }, {
            value: "youtube",
            label: "YouTube"
          }].map(platform => <button key={platform.value} onClick={() => setSelectedPlatform(platform.value === "all" ? null : platform.value)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${selectedPlatform === null && platform.value === "all" || selectedPlatform === platform.value ? "bg-foreground text-background" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
                  {platform.label}
                </button>)}
            </div>

            {/* Bookmarked Toggle */}
            <button onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${showBookmarkedOnly ? "bg-foreground text-background" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
              <Bookmark className={`h-3.5 w-3.5 ${showBookmarkedOnly ? "fill-current" : ""}`} />
              Saved
            </button>

            {/* Filter Toggle */}
            <button onClick={() => setFiltersOpen(!filtersOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filtersOpen ? "bg-foreground text-background" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>

          {/* Expanded Filters */}
          {filtersOpen && <div className="flex flex-wrap gap-2 items-center pt-1">
              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-auto h-8 px-3 border-0 bg-muted/30 rounded-md text-xs gap-1.5 focus:ring-0">
                  <span className="text-muted-foreground/70">Sort:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="budget-high">Budget ↓</SelectItem>
                  <SelectItem value="budget-low">Budget ↑</SelectItem>
                  <SelectItem value="rpm-high">RPM ↓</SelectItem>
                  <SelectItem value="rpm-low">RPM ↑</SelectItem>
                </SelectContent>
              </Select>

              {/* Frequency */}
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="w-auto h-8 px-3 border-0 bg-muted/30 rounded-md text-xs gap-1.5 focus:ring-0">
                  <span className="text-muted-foreground/70">Frequency:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>

              {/* Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-auto h-8 px-3 border-0 bg-muted/30 rounded-md text-xs gap-1.5 focus:ring-0">
                  <span className="text-muted-foreground/70">Status:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>}
        </div>
        </div>

        {/* Scrollable Campaigns Section */}
        <div className="md:flex-1 md:overflow-auto px-6 pb-6">
        {/* Campaigns and Bounties Grid */}
        {loading ? <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full mx-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg border overflow-hidden">
                {/* Banner skeleton */}
                <Skeleton className="h-32 w-full rounded-none" />
                {/* Content */}
                <div className="p-3 space-y-3">
                  {/* Brand logo + title */}
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-8 h-8 rounded-md" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  {/* Platform badges */}
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  {/* Description lines */}
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                  {/* Budget bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-muted/70 rounded-full animate-pulse" />
                    </div>
                  </div>
                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div> : sortedCampaigns.length === 0 && bounties.length === 0 ? <div className="text-center py-12 flex flex-col items-center gap-4">
            <img src={emptyCampaignsImage} alt="No campaigns" className="w-64 h-64 object-contain opacity-80" />
            <p className="text-foreground font-medium">No campaigns or bounties found</p>
          </div> : <div className="space-y-4">
            {/* Combined Grid - Campaigns and Bounties interleaved */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full mx-auto">
              {/* Combine campaigns and bounties into a single sorted array */}
              {(() => {
                // Create unified list with type markers
                const allItems: Array<{type: 'campaign', data: Campaign, isEnded: boolean, createdAt: string} | {type: 'bounty', data: BountyCampaign, isEnded: boolean, createdAt: string}> = [
                  ...sortedCampaigns.map(c => ({
                    type: 'campaign' as const,
                    data: c,
                    isEnded: c.status === 'ended',
                    createdAt: c.start_date || c.created_at
                  })),
                  ...bounties.map(b => ({
                    type: 'bounty' as const,
                    data: b,
                    isEnded: b.status === 'ended',
                    createdAt: b.created_at
                  }))
                ];
                
                // Sort: active items first (by date), then ended items
                const sortedItems = allItems.sort((a, b) => {
                  // Ended items go last
                  if (a.isEnded && !b.isEnded) return 1;
                  if (!a.isEnded && b.isEnded) return -1;
                  // Within same status, sort by date (newest first)
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
                
                return sortedItems.map(item => {
                  if (item.type === 'campaign') {
                    const campaign = item.data;
                    const budgetUsed = campaign.budget_used || 0;
                    const budgetPercentage = campaign.budget > 0 ? budgetUsed / campaign.budget * 100 : 0;
                    const handleCampaignClick = () => {
                      if (campaign.status !== "ended") {
                        setSelectedCampaign(campaign);
                        setSheetOpen(true);
                      }
                    };
                    const isEnded = campaign.status === "ended";
                    const isBookmarked = bookmarkedCampaignIds.includes(campaign.id);
                    
                    return <Card key={`campaign-${campaign.id}`} className={`group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border relative dark:hover:bg-[#0f0f0f] ${isEnded ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`} onClick={handleCampaignClick}>
                      {isEnded && <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />}
                      
                      <button
                        onClick={(e) => toggleBookmark(campaign.id, e)}
                        className={`absolute top-2 right-2 z-[5] p-1.5 rounded-md transition-all ${isBookmarked ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"}`}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                      </button>
                      
                      {campaign.banner_url && <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                        <OptimizedImage src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                      </div>}

                      <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
                        <div className="flex items-center gap-2.5">
                          {campaign.brand_logo_url && <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border">
                            <OptimizedImage src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-full h-full object-cover" />
                          </div>}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <h3 className="text-sm font-semibold line-clamp-1 leading-snug group-hover:underline font-['Inter'] tracking-[-0.5px]">
                              {campaign.title}
                            </h3>
                            {isEnded ? <span className="flex items-center gap-0.5 text-white text-[10px] font-medium px-1.5 py-0.5 font-['Inter'] tracking-[-0.5px] shrink-0" style={{
                              backgroundColor: '#b60b0b',
                              borderTop: '1px solid #ed3030',
                              borderRadius: '20px'
                            }}>
                              <PauseCircle className="h-2.5 w-2.5" fill="white" stroke="#b60b0b" />
                              Ended
                            </span> : <span className="flex items-center gap-0.5 text-white text-[10px] font-medium px-1.5 py-0.5 font-['Inter'] tracking-[-0.5px] shrink-0" style={{
                              backgroundColor: '#1f6d36',
                              borderTop: '1px solid #3c8544',
                              borderRadius: '20px'
                            }}>
                              <img src={checkCircleIcon} alt="" className="h-2.5 w-2.5" />
                              Active
                            </span>}
                          </div>
                        </div>

                        <div className="rounded-lg p-2.5 space-y-1.5 bg-[#080808]/0">
                          {campaign.is_infinite_budget ? <>
                            <div className="flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5 font-['Inter'] tracking-[-0.5px]">
                                <span className="text-base font-bold">∞ Unlimited Budget</span>
                              </div>
                            </div>
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
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-base font-bold tabular-nums" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                                  ${Math.ceil(budgetUsed).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                                  / ${Math.ceil(campaign.budget).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>
                            <div className="relative h-1.5 rounded-full overflow-hidden bg-muted">
                              <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{ width: `${budgetPercentage}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                              <span className="font-semibold">{budgetPercentage.toFixed(0)}% used</span>
                            </div>
                          </>}
                        </div>
                      </CardContent>
                    </Card>;
                  } else {
                    const bounty = item.data;
                    const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;
                    const isFull = spotsRemaining <= 0;
                    const isEnded = bounty.status === "ended";
                    
                    return <Card 
                      key={`bounty-${bounty.id}`}
                      className={`group bg-card border transition-all duration-300 animate-fade-in flex flex-col overflow-hidden relative dark:hover:bg-[#0f0f0f] ${isEnded ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`} 
                      onClick={() => {
                        if (!isEnded) {
                          setSelectedBounty(bounty);
                          setBountySheetOpen(true);
                        }
                      }}
                    >
                      {isEnded && <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />}
                      
                      <CardContent className="p-4 flex-1 flex flex-col gap-3">
                        {/* Title with Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-semibold line-clamp-2 leading-snug group-hover:underline font-['Inter'] tracking-[-0.5px] flex-1">
                            {bounty.title}
                          </h3>
                          {isEnded ? (
                            <span className="flex items-center gap-0.5 text-white text-[10px] font-medium px-1.5 py-0.5 font-['Inter'] tracking-[-0.5px] shrink-0" style={{
                              backgroundColor: '#b60b0b',
                              borderTop: '1px solid #ed3030',
                              borderRadius: '20px'
                            }}>
                              Ended
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-white text-[10px] font-medium px-1.5 py-0.5 font-['Inter'] tracking-[-0.5px] shrink-0" style={{
                              backgroundColor: '#1f6d36',
                              borderTop: '1px solid #3c8544',
                              borderRadius: '20px'
                            }}>
                              Active
                            </span>
                          )}
                        </div>
                        
                        {/* Clean Metadata Grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Retainer</p>
                            <p className="text-sm font-semibold text-foreground font-['Inter'] tracking-[-0.5px]">
                              ${bounty.monthly_retainer.toLocaleString()}/mo
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Videos</p>
                            <p className="text-sm font-semibold text-foreground font-['Inter'] tracking-[-0.5px]">
                              {bounty.videos_per_month}/month
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Positions</p>
                            <p className={`text-sm font-semibold font-['Inter'] tracking-[-0.5px] ${isFull ? 'text-red-500' : 'text-foreground'}`}>
                              {spotsRemaining > 0 ? `${spotsRemaining} left` : 'Full'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Spacer */}
                        <div className="flex-1" />
                        
                        {/* Brand Footer */}
                        <div className="flex items-center gap-2.5 pt-2">
                          {bounty.brands?.logo_url ? (
                            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                              <OptimizedImage src={bounty.brands.logo_url} alt={bounty.brands.name || ''} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {bounty.brands?.name?.charAt(0) || 'B'}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground font-medium font-['Inter'] tracking-[-0.5px]">
                            {bounty.brands?.name || 'Unknown Brand'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>;
                  }
                });
              })()}
            </div>
          </div>}
        </div>

      <JoinCampaignSheet campaign={selectedCampaign} open={sheetOpen} onOpenChange={setSheetOpen} />
      
      <ApplyToBountySheet open={bountySheetOpen} onOpenChange={setBountySheetOpen} bounty={selectedBounty} onSuccess={() => {
      setBountySheetOpen(false);
      fetchCampaigns();
    }} />
      
      <JoinPrivateCampaignDialog open={joinPrivateDialogOpen} onOpenChange={setJoinPrivateDialogOpen} />
    </div>;
}