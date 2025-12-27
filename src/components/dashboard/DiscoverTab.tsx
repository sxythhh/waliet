import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { JoinPrivateCampaignDialog } from "@/components/JoinPrivateCampaignDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Video, Users, Search, SlidersHorizontal, Bookmark, PauseCircle, Calendar, ChevronLeft, ChevronRight, Sparkles, Plus, Maximize2 } from "lucide-react";
import videosIcon from "@/assets/videos-icon.svg";
import personIcon from "@/assets/person-icon.svg";
import checkCircleIcon from "@/assets/check-circle-filled.svg";
import checkCircleWhiteIcon from "@/assets/check-circle-white.svg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { JoinCampaignSheet } from "@/components/JoinCampaignSheet";
import { ApplyToBountySheet } from "@/components/ApplyToBountySheet";
import { ApplyToBoostDialog } from "@/components/ApplyToBoostDialog";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import emptyCampaignsImage from "@/assets/empty-campaigns.png";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { SearchOverlay } from "./SearchOverlay";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { CreateCampaignTypeDialog } from "@/components/brand/CreateCampaignTypeDialog";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { useAuth } from "@/contexts/AuthContext";
import { CampaignCard } from "./CampaignCard";
import { RecentActivity } from "./RecentActivity";
import { BoostDiscoverCard } from "./BoostDiscoverCard";
interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  brand_logo_url: string;
  brand_is_verified?: boolean;
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
    is_verified?: boolean;
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
  blueprint_id?: string | null;
  slug?: string | null;
  brands?: {
    name: string;
    logo_url: string;
    is_verified?: boolean;
  };
}
interface DiscoverTabProps {
  navigateOnClick?: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  searchOverlayOpen?: boolean;
  setSearchOverlayOpen?: (open: boolean) => void;
}
export function DiscoverTab({
  navigateOnClick = false,
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery,
  searchOverlayOpen: externalSearchOverlayOpen,
  setSearchOverlayOpen: externalSetSearchOverlayOpen
}: DiscoverTabProps) {
  const {
    user
  } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [bounties, setBounties] = useState<BountyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [frequency, setFrequency] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>("");
  const [hideInfiniteBudget, setHideInfiniteBudget] = useState(false);
  const [hideLowBudget, setHideLowBudget] = useState(false);
  const [hideEnded, setHideEnded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedBounty, setSelectedBounty] = useState<BountyCampaign | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bountySheetOpen, setBountySheetOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [joinPrivateDialogOpen, setJoinPrivateDialogOpen] = useState(false);
  const [bookmarkedCampaignIds, setBookmarkedCampaignIds] = useState<string[]>([]);
  const [bookmarkedBountyIds, setBookmarkedBountyIds] = useState<string[]>([]);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [internalSearchOverlayOpen, setInternalSearchOverlayOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  const setSearchQuery = externalSetSearchQuery ?? setInternalSearchQuery;
  const searchOverlayOpen = externalSearchOverlayOpen ?? internalSearchOverlayOpen;
  const setSearchOverlayOpen = externalSetSearchOverlayOpen ?? setInternalSearchOverlayOpen;
  const [typeFilter, setTypeFilter] = useState<'all' | 'campaigns' | 'boosts'>('all');
  const [nicheFilter, setNicheFilter] = useState<string | null>(null);
  const [browseFilter, setBrowseFilter] = useState<string | null>(null);
  const [userBrand, setUserBrand] = useState<{
    id: string;
    slug: string;
  } | null>(null);
  const [createCampaignDialogOpen, setCreateCampaignDialogOpen] = useState(false);
  const [createBrandDialogOpen, setCreateBrandDialogOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch user's brand membership
  useEffect(() => {
    const fetchUserBrand = async () => {
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from("brand_members").select("brand_id, brands(id, slug)").eq("user_id", user.id).limit(1).maybeSingle();
      if (!error && data?.brands) {
        setUserBrand({
          id: (data.brands as any).id,
          slug: (data.brands as any).slug
        });
      }
    };
    fetchUserBrand();
  }, [user]);

  // Auto-open private campaign dialog if joinPrivate param is present
  useEffect(() => {
    if (searchParams.get("joinPrivate") === "true") {
      setJoinPrivateDialogOpen(true);
      // Remove the param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("joinPrivate");
      setSearchParams(newParams, {
        replace: true
      });
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
        setSearchParams(newParams, {
          replace: true
        });
      } else {
        // Campaign not found in public campaigns (might be private), fetch it directly
        fetchCampaignBySlug(campaignSlug);
      }
    }
  }, [searchParams, campaigns, loading]);
  const fetchCampaignBySlug = async (slug: string) => {
    const {
      data,
      error
    } = await supabase.from("campaigns").select(`*, brands (logo_url)`).eq("slug", slug).in("status", ["active", "ended"]).maybeSingle();
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
      setSearchParams(newParams, {
        replace: true
      });
    }
  };
  useEffect(() => {
    fetchCampaigns();
    fetchBookmarks();
  }, []);
  const fetchBookmarks = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch campaign bookmarks
    const {
      data: campaignData,
      error: campaignError
    } = await supabase.from("campaign_bookmarks").select("campaign_id").eq("user_id", user.id);
    if (!campaignError && campaignData) {
      setBookmarkedCampaignIds(campaignData.map(b => b.campaign_id));
    }

    // Fetch bounty bookmarks
    const {
      data: bountyData,
      error: bountyError
    } = await supabase.from("bounty_bookmarks").select("bounty_campaign_id").eq("user_id", user.id);
    if (!bountyError && bountyData) {
      setBookmarkedBountyIds(bountyData.map(b => b.bounty_campaign_id));
    }
  };
  const toggleBookmark = async (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to bookmark campaigns");
      return;
    }
    const isBookmarked = bookmarkedCampaignIds.includes(campaignId);
    if (isBookmarked) {
      const {
        error
      } = await supabase.from("campaign_bookmarks").delete().eq("user_id", user.id).eq("campaign_id", campaignId);
      if (!error) {
        setBookmarkedCampaignIds(prev => prev.filter(id => id !== campaignId));
        toast.success("Bookmark removed");
      }
    } else {
      const {
        error
      } = await supabase.from("campaign_bookmarks").insert({
        user_id: user.id,
        campaign_id: campaignId
      });
      if (!error) {
        setBookmarkedCampaignIds(prev => [...prev, campaignId]);
        toast.success("Campaign bookmarked");
      }
    }
  };
  const toggleBountyBookmark = async (bountyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to bookmark boosts");
      return;
    }
    const isBookmarked = bookmarkedBountyIds.includes(bountyId);
    if (isBookmarked) {
      const {
        error
      } = await supabase.from("bounty_bookmarks").delete().eq("user_id", user.id).eq("bounty_campaign_id", bountyId);
      if (!error) {
        setBookmarkedBountyIds(prev => prev.filter(id => id !== bountyId));
        toast.success("Bookmark removed");
      }
    } else {
      const {
        error
      } = await supabase.from("bounty_bookmarks").insert({
        user_id: user.id,
        bounty_campaign_id: bountyId
      });
      if (!error) {
        setBookmarkedBountyIds(prev => [...prev, bountyId]);
        toast.success("Boost bookmarked");
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
          logo_url,
          is_verified
        )
      `).in("status", ["active", "ended"]).eq("is_private", false).order("created_at", {
      ascending: false
    });
    if (!error && data) {
      const availableCampaigns = data.filter(campaign => !joinedCampaignIds.includes(campaign.id));
      const campaignsWithBrandLogo = availableCampaigns.map(campaign => ({
        ...campaign,
        brand_logo_url: (campaign.brands as any)?.logo_url || campaign.brand_logo_url,
        brand_is_verified: (campaign.brands as any)?.is_verified || false,
        platforms: campaign.allowed_platforms || [],
        application_questions: Array.isArray(campaign.application_questions) ? campaign.application_questions as string[] : []
      }));
      setCampaigns(campaignsWithBrandLogo);
    }

    // Fetch bounties (only non-private ones)
    const {
      data: bountiesData,
      error: bountiesError
    } = await supabase.from("bounty_campaigns").select(`
        *,
        brands (
          name,
          logo_url,
          is_verified
        )
      `).in("status", ["active", "ended"]).eq("is_private", false).order("created_at", {
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
  return <div className="md:flex md:flex-col">
        {/* Header and Filters */}
        <div className="px-6 pt-4 pb-4 space-y-6">
          {/* Featured Programs Carousel - Hidden */}

        {/* Quick Stats */}
        

        {/* Filters */}
        <div className="space-y-3 font-['Inter'] tracking-[-0.5px]">
          {/* Search and Filters Row */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            {/* Search Input - Click to open overlay (only show if not using external search) */}
            {!externalSetSearchOverlayOpen && <button onClick={() => setSearchOverlayOpen(true)} className="relative w-full sm:w-72 text-left">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <div className="pl-9 h-9 bg-muted/30 border-0 rounded-lg text-sm text-muted-foreground/50 flex items-center">
                  {searchQuery || 'Search campaigns...'}
                </div>
              </button>}

            {/* Filter buttons row */}
            <div className="flex gap-2 items-center h-9">
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

            {/* Create Campaign Button */}
            
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
        {loading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 w-full mx-auto">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                {/* Card skeleton matching CampaignCard */}
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted/30">
                  <Skeleton className="absolute inset-0 w-full h-full" />
                  {/* Gradient overlay like CampaignCard */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
                    <Skeleton className="h-4 w-3/4 mx-auto bg-white/10" />
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-20 rounded-md bg-white/10" />
                    </div>
                  </div>
                </div>
                {/* Budget progress skeleton */}
                <div className="flex flex-col gap-1 px-0.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-2.5 w-12 bg-muted/50" />
                    <Skeleton className="h-2.5 w-10 bg-muted/50" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full bg-muted/50" />
                </div>
              </div>
            ))}
          </div> : sortedCampaigns.length === 0 && bounties.length === 0 ? <div className="text-center py-12 flex flex-col items-center gap-4">
            <img src={emptyCampaignsImage} alt="No campaigns" className="w-64 h-64 object-contain opacity-80" />
            <p className="text-foreground font-medium">No campaigns or bounties found</p>
          </div> : <div className="space-y-8">
            {/* Campaigns Section - Horizontal Scroll */}
            {typeFilter !== 'boosts' && sortedCampaigns.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-[-0.3px] font-['Geist',sans-serif]">
                    Campaigns
                  </h2>
                  <div className="flex items-center border border-border/50 rounded-full overflow-hidden bg-muted/30">
                    <button
                      onClick={() => {
                        const container = document.getElementById('campaigns-scroll');
                        if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                      }}
                      className="p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <div className="w-px h-5 bg-border/50" />
                    <button
                      onClick={() => {
                        const container = document.getElementById('campaigns-scroll');
                        if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                      }}
                      className="p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div
                  id="campaigns-scroll"
                  className="flex gap-3 overflow-x-auto pt-2 pb-2 scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {sortedCampaigns.map(campaign => {
                    const handleCampaignClick = () => {
                      if (navigateOnClick) {
                        navigate(`/c/${campaign.slug}`);
                      } else {
                        setSelectedCampaign(campaign);
                        setSheetOpen(true);
                      }
                    };
                    const isEnded = campaign.status === "ended";
                    const isBookmarked = bookmarkedCampaignIds.includes(campaign.id);
                    return (
                      <div key={campaign.id} className="flex-shrink-0 w-[160px]">
                        <CampaignCard
                          id={campaign.id}
                          title={campaign.title}
                          brand_name={campaign.brand_name}
                          brand_logo_url={campaign.brand_logo_url}
                          brand_is_verified={campaign.brand_is_verified}
                          banner_url={campaign.banner_url}
                          budget={campaign.budget}
                          budget_used={campaign.budget_used}
                          is_infinite_budget={campaign.is_infinite_budget}
                          platforms={campaign.platforms}
                          isEnded={isEnded}
                          isBookmarked={isBookmarked}
                          onClick={handleCampaignClick}
                          onBookmarkClick={e => toggleBookmark(campaign.id, e)}
                          onFullscreenClick={e => {
                            e.stopPropagation();
                            navigate(`/c/${campaign.slug}`);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Boosts Section - Grid */}
            {typeFilter !== 'campaigns' && (() => {
              const filteredBounties = bounties
                .filter(b => !showBookmarkedOnly || bookmarkedBountyIds.includes(b.id))
                .filter(b => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return b.title.toLowerCase().includes(query) || 
                    b.description?.toLowerCase().includes(query) || 
                    b.brands?.name?.toLowerCase().includes(query);
                })
                .sort((a, b) => {
                  const aEnded = a.status === 'ended';
                  const bEnded = b.status === 'ended';
                  if (aEnded && !bEnded) return 1;
                  if (!aEnded && bEnded) return -1;
                  
                  if (browseFilter === 'new') {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  }
                  if (browseFilter === 'high-paying') {
                    return b.monthly_retainer - a.monthly_retainer;
                  }
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });

              if (filteredBounties.length === 0) return null;

              return (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold tracking-[-0.3px] font-['Geist',sans-serif]">
                    Boosts
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBounties.map(bounty => {
                      const isEnded = bounty.status === "ended";
                      const isBookmarked = bookmarkedBountyIds.includes(bounty.id);
                      return (
                        <BoostDiscoverCard
                          key={bounty.id}
                          id={bounty.id}
                          title={bounty.title}
                          description={bounty.description}
                          brand_name={bounty.brands?.name || 'Unknown'}
                          brand_logo_url={bounty.brands?.logo_url || null}
                          brand_is_verified={bounty.brands?.is_verified}
                          monthly_retainer={bounty.monthly_retainer}
                          videos_per_month={bounty.videos_per_month}
                          max_accepted_creators={bounty.max_accepted_creators}
                          accepted_creators_count={bounty.accepted_creators_count}
                          isEnded={isEnded}
                          isBookmarked={isBookmarked}
                          slug={bounty.slug}
                          onClick={() => {
                            if (!isEnded) {
                              if (navigateOnClick && bounty.slug) {
                                navigate(`/c/${bounty.slug}`);
                              } else {
                                setSelectedBounty(bounty);
                                setBountySheetOpen(true);
                              }
                            }
                          }}
                          onBookmarkClick={e => toggleBountyBookmark(bounty.id, e)}
                          onFullscreenClick={e => {
                            e.stopPropagation();
                            navigate(`/c/${bounty.slug}`);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            
            {/* Recent Activity */}
            <RecentActivity />
          </div>}
        </div>

      <JoinCampaignSheet campaign={selectedCampaign} open={sheetOpen} onOpenChange={setSheetOpen} />
      
      <ApplyToBountySheet open={bountySheetOpen} onOpenChange={setBountySheetOpen} bounty={selectedBounty} onSuccess={() => {
      setBountySheetOpen(false);
      fetchCampaigns();
    }} />
      
      {/* Separate Apply Dialog triggered from card button */}
      <ApplyToBoostDialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen} bounty={selectedBounty} onSuccess={() => {
      setApplyDialogOpen(false);
      fetchCampaigns();
    }} />
      
      <JoinPrivateCampaignDialog open={joinPrivateDialogOpen} onOpenChange={setJoinPrivateDialogOpen} />
      
      <SearchOverlay isOpen={searchOverlayOpen} onClose={() => setSearchOverlayOpen(false)} searchQuery={searchQuery} onSearchChange={setSearchQuery} onTypeFilter={setTypeFilter} onNicheFilter={setNicheFilter} onBrowseFilter={setBrowseFilter} onPlatformFilter={setSelectedPlatform} activeTypeFilter={typeFilter} activeNicheFilter={nicheFilter} activeBrowseFilter={browseFilter} activePlatformFilter={selectedPlatform} />
      
      {/* Create Campaign Dialog */}
      <CreateCampaignTypeDialog open={createCampaignDialogOpen} onOpenChange={setCreateCampaignDialogOpen} brandId={userBrand?.id} onSelectClipping={blueprintId => {
      navigate(`/dashboard?workspace=${userBrand?.slug}&tab=campaigns&createCampaign=true${blueprintId ? `&blueprintId=${blueprintId}` : ''}`);
    }} onSelectManaged={blueprintId => {
      navigate(`/dashboard?workspace=${userBrand?.slug}&tab=campaigns&createCampaign=true${blueprintId ? `&blueprintId=${blueprintId}` : ''}`);
    }} onSelectBoost={() => {
      navigate(`/dashboard?workspace=${userBrand?.slug}&tab=campaigns&createBoost=true`);
    }} />
      
      {/* Create Brand Dialog */}
      <CreateBrandDialog open={createBrandDialogOpen} onOpenChange={setCreateBrandDialogOpen} hideTrigger onSuccess={() => {
      setCreateBrandDialogOpen(false);
    }} />
    </div>;
}