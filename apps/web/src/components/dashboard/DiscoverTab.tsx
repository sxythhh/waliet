import { useEffect, useState, useMemo, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { JoinPrivateCampaignDialog } from "@/components/JoinPrivateCampaignDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Video, Users, Search, SlidersHorizontal, Bookmark, PauseCircle, Calendar, ChevronLeft, ChevronRight, Sparkles, Plus, Maximize2, Rocket } from "lucide-react";
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
import { PageLoading } from "@/components/ui/loading-bar";
import { toast } from "sonner";
import { SearchOverlay } from "./SearchOverlay";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { CreateCampaignTypeDialog } from "@/components/brand/CreateCampaignTypeDialog";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { useAuth } from "@/contexts/AuthContext";
import { CampaignCard } from "./CampaignCard";
import { RecentActivity } from "./RecentActivity";
import { BoostDiscoverCard } from "./BoostDiscoverCard";
import { BrandCard } from "./BrandCard";
interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  brand_logo_url: string;
  brand_is_verified?: boolean;
  brand_slug?: string;
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
    slug?: string;
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
  tags?: string[] | null;
  content_distribution?: string | null;
  brands?: {
    name: string;
    logo_url: string;
    is_verified?: boolean;
    slug?: string;
  };
}
interface DiscoverTabProps {
  navigateOnClick?: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  searchOverlayOpen?: boolean;
  setSearchOverlayOpen?: (open: boolean) => void;
}

// Type for brand data from Supabase join queries
interface BrandJoinData {
  id?: string;
  name?: string;
  logo_url: string | null;
  is_verified?: boolean;
  slug?: string;
  subscription_plan?: string | null;
}

// Type for campaign/bounty status filter
interface CampaignStatusItem {
  id: string;
  status: string;
  is_private?: boolean;
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
  const [brands, setBrands] = useState<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    brand_color: string | null;
    description: string | null;
    campaign_count: number;
    boost_count: number;
    website_url: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
  }[]>([]);
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
  const [joinedCampaignIds, setJoinedCampaignIds] = useState<string[]>([]);
  const [joinedBoostIds, setJoinedBoostIds] = useState<string[]>([]);
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
    subscriptionPlan: string | null;
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
      } = await supabase.from("brand_members").select("brand_id, brands(id, slug, subscription_plan)").eq("user_id", user.id).limit(1).maybeSingle();
      if (!error && data?.brands) {
        const brandData = data.brands as BrandJoinData;
        setUserBrand({
          id: brandData.id ?? '',
          slug: brandData.slug ?? '',
          subscriptionPlan: brandData.subscription_plan ?? null
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

  const fetchCampaignBySlug = useCallback(async (slug: string) => {
    const {
      data,
      error
    } = await supabase.from("campaigns").select(`*, brands (logo_url)`).eq("slug", slug).in("status", ["active", "ended"]).maybeSingle();
    if (!error && data) {
      const brandData = data.brands as BrandJoinData | null;
      const campaignData: Campaign = {
        ...data,
        brand_logo_url: data.brand_logo_url || brandData?.logo_url || '',
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
  }, [searchParams, campaigns, loading, setSearchParams, fetchCampaignBySlug]);
  const fetchBookmarks = useCallback(async () => {
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
  }, []);
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
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);

    // Get current user to check joined status
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Fetch joined campaigns and boosts for the user
    if (currentUser) {
      const [campaignSubmissions, boostParticipants] = await Promise.all([
        supabase.from("campaign_submissions").select("campaign_id").eq("creator_id", currentUser.id),
        supabase.from("boost_participants").select("boost_id").eq("user_id", currentUser.id)
      ]);

      setJoinedCampaignIds(campaignSubmissions.data?.map(s => s.campaign_id) || []);
      setJoinedBoostIds(boostParticipants.data?.map(p => p.boost_id) || []);
    }

    // Fetch campaigns (show all, including ones user has joined)
    const {
      data,
      error
    } = await supabase.from("campaigns").select(`
        *,
        brands (
          logo_url,
          is_verified,
          slug
        )
      `).in("status", ["active", "ended"]).eq("is_private", false).order("created_at", {
      ascending: false
    });
    if (!error && data) {
      const campaignsWithBrandLogo = data.map(campaign => {
        const brandData = campaign.brands as BrandJoinData | null;
        return {
          ...campaign,
          brand_logo_url: brandData?.logo_url || campaign.brand_logo_url,
          brand_is_verified: brandData?.is_verified || false,
          brand_slug: brandData?.slug,
          platforms: campaign.allowed_platforms || [],
          application_questions: Array.isArray(campaign.application_questions) ? campaign.application_questions as string[] : []
        };
      });
      setCampaigns(campaignsWithBrandLogo);
    }

    // Fetch bounties (show all, including ones user has applied to)
    const {
      data: bountiesData,
      error: bountiesError
    } = await supabase.from("bounty_campaigns").select(`
        *,
        brands (
          name,
          logo_url,
          is_verified,
          slug
        )
      `).in("status", ["active", "ended"]).eq("is_private", false).order("created_at", {
      ascending: false
    });
    if (!bountiesError && bountiesData) {
      setBounties(bountiesData as BountyCampaign[]);
    }

    // Fetch all active brands with their campaigns
    const { data: brandsData } = await supabase
      .from("brands")
      .select(`
        id,
        name,
        slug,
        logo_url,
        is_verified,
        brand_color,
        description,
        website_url,
        instagram_handle,
        tiktok_handle,
        campaigns(id, status, is_private),
        bounty_campaigns(id, status, is_private)
      `)
      .eq("is_active", true)
      .limit(50);

    if (brandsData) {
      // Process brands - include any brand that has had campaigns or boosts
      const processedBrands = brandsData.map(brand => {
        const activeCampaigns = (brand.campaigns || []).filter((c: CampaignStatusItem) => c.status === "active" && !c.is_private);
        const activeBoosts = (brand.bounty_campaigns || []).filter((b: CampaignStatusItem) => b.status === "active" && !b.is_private);
        const allCampaigns = (brand.campaigns || []).filter((c: CampaignStatusItem) => !c.is_private);
        const allBoosts = (brand.bounty_campaigns || []).filter((b: CampaignStatusItem) => !b.is_private);
        return {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          logo_url: brand.logo_url,
          is_verified: brand.is_verified,
          brand_color: brand.brand_color,
          description: brand.description,
          website_url: brand.website_url,
          instagram_handle: brand.instagram_handle,
          tiktok_handle: brand.tiktok_handle,
          campaign_count: activeCampaigns.length,
          boost_count: activeBoosts.length,
          has_opportunities: allCampaigns.length > 0 || allBoosts.length > 0,
        };
      }).filter(b => b.has_opportunities)
        .sort((a, b) => {
          // Prioritize brands with active opportunities
          const aActive = a.campaign_count + a.boost_count;
          const bActive = b.campaign_count + b.boost_count;
          if (aActive > 0 && bActive === 0) return -1;
          if (bActive > 0 && aActive === 0) return 1;
          return bActive - aActive;
        })
        .slice(0, 12);

      setBrands(processedBrands);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchBookmarks();
  }, [fetchCampaigns, fetchBookmarks]);

  // Debounce search query for performance (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Memoize filtered campaigns to prevent re-filtering on every render
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesPlatform = !selectedPlatform || campaign.platforms && campaign.platforms.some(p => p.toLowerCase() === selectedPlatform.toLowerCase());
      const matchesSearch = !debouncedSearchQuery || campaign.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || campaign.brand_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || campaign.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || statusFilter === "active" && campaign.status !== "ended" || statusFilter === "ended" && campaign.status === "ended";
      const matchesInfiniteBudget = !hideInfiniteBudget || !campaign.is_infinite_budget;
      const matchesLowBudget = !hideLowBudget || campaign.budget >= 1000;
      const matchesEnded = !hideEnded || campaign.status !== "ended";
      const matchesBookmarked = !showBookmarkedOnly || bookmarkedCampaignIds.includes(campaign.id);
      return matchesPlatform && matchesSearch && matchesStatus && matchesInfiniteBudget && matchesLowBudget && matchesEnded && matchesBookmarked;
    });
  }, [campaigns, selectedPlatform, debouncedSearchQuery, statusFilter, hideInfiniteBudget, hideLowBudget, hideEnded, showBookmarkedOnly, bookmarkedCampaignIds]);

  // Separate active and ended campaigns
  const activeCampaigns = useMemo(() => filteredCampaigns.filter(c => c.status !== "ended"), [filteredCampaigns]);
  const endedCampaigns = useMemo(() => filteredCampaigns.filter(c => c.status === "ended"), [filteredCampaigns]);

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

  if (loading) {
    return <PageLoading />;
  }

  return <div className="md:flex md:flex-col">
        {/* Header and Filters */}
        <div className="px-6 pt-4 pb-4 space-y-6">
          {/* Featured Programs Carousel - Hidden */}

        {/* Quick Stats */}
        

        {/* Filters */}
        <div className="space-y-3 font-inter tracking-[-0.5px]">
          {/* Search and Filters Row */}
          <div className="flex flex-row gap-2 items-center justify-between">
            {/* Search Input - Click to open overlay (only show if not using external search) */}
            {!externalSetSearchOverlayOpen && <button onClick={() => setSearchOverlayOpen(true)} className="relative flex-1 sm:flex-none sm:w-72 text-left group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <div className="pl-9 h-9 bg-muted/40 border border-border dark:border-transparent rounded-lg text-sm text-muted-foreground flex items-center transition-all group-hover:bg-muted/60">
                  {searchQuery || 'Search..'}
                </div>
              </button>}

            {/* Launch Opportunity Button - Hidden on /discover page */}
            {!navigateOnClick && (
              <Button
                onClick={() => {
                  if (userBrand) {
                    setCreateCampaignDialogOpen(true);
                  } else {
                    setCreateBrandDialogOpen(true);
                  }
                }}
                className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium tracking-[-0.3px]"
              >
                <span className="hidden sm:inline">Launch Opportunity</span>
                <span className="sm:hidden">Launch</span>
              </Button>
            )}
          </div>
        </div>
        </div>

        {/* Scrollable Campaigns Section */}
        <div className="md:flex-1 md:overflow-auto px-6 pb-6">
        {/* Campaigns and Bounties Grid */}
        {sortedCampaigns.length === 0 && bounties.length === 0 && !loading ? <div className="text-center py-12 flex flex-col items-center gap-4">
            <img src={emptyCampaignsImage} alt="No campaigns" className="w-64 h-64 object-contain opacity-80" />
            <p className="text-foreground font-medium">No campaigns or bounties found</p>
          </div> : <div className="space-y-8">
            {/* Boosts Section - Grid (Moved above Campaigns) */}
            {typeFilter !== 'campaigns' && (() => {
              const filteredBounties = bounties
                .filter(b => !showBookmarkedOnly || bookmarkedBountyIds.includes(b.id))
                .filter(b => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  const matchesTags = b.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
                  return b.title.toLowerCase().includes(query) || 
                    b.description?.toLowerCase().includes(query) || 
                    b.brands?.name?.toLowerCase().includes(query) ||
                    matchesTags;
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
                  <h2 className="text-lg font-semibold tracking-[-0.3px] font-geist">
                    Boosts
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBounties.map(bounty => {
                      const isEnded = bounty.status === "ended";
                      const isBookmarked = bookmarkedBountyIds.includes(bounty.id);
                      const isJoinedBoost = joinedBoostIds.includes(bounty.id);
                      return (
                        <BoostDiscoverCard
                          key={bounty.id}
                          id={bounty.id}
                          title={bounty.title}
                          description={bounty.description}
                          brand_name={bounty.brands?.name || 'Unknown'}
                          brand_logo_url={bounty.brands?.logo_url || null}
                          brand_is_verified={bounty.brands?.is_verified}
                          brand_slug={bounty.brands?.slug}
                          monthly_retainer={bounty.monthly_retainer}
                          videos_per_month={bounty.videos_per_month}
                          max_accepted_creators={bounty.max_accepted_creators}
                          accepted_creators_count={bounty.accepted_creators_count}
                          isEnded={isEnded}
                          isBookmarked={isBookmarked}
                          slug={bounty.slug}
                          created_at={bounty.created_at}
                          tags={bounty.tags}
                          content_distribution={bounty.content_distribution}
                          onClick={() => {
                            // If already joined, navigate to boost details
                            if (isJoinedBoost) {
                              navigate(`/dashboard/boost/${bounty.id}`);
                              return;
                            }
                            if (!isEnded) {
                              if (navigateOnClick && bounty.slug) {
                                navigate(`/join/${bounty.slug}`);
                              } else {
                                setSelectedBounty(bounty);
                                setBountySheetOpen(true);
                              }
                            }
                          }}
                          onBookmarkClick={e => toggleBountyBookmark(bounty.id, e)}
                          onFullscreenClick={e => {
                            e.stopPropagation();
                            navigate(`/join/${bounty.slug}`);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Campaigns Section - Horizontal Scroll */}
            {typeFilter !== 'boosts' && sortedCampaigns.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-[-0.3px] font-geist">
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
                  className="flex gap-3 overflow-x-auto pt-2 pb-2 scrollbar-hide -mx-6 px-6"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {sortedCampaigns.map(campaign => {
                    const isJoined = joinedCampaignIds.includes(campaign.id);
                    const handleCampaignClick = () => {
                      // If already joined, navigate to campaign details
                      if (isJoined) {
                        navigate(`/dashboard/campaign/${campaign.id}`);
                        return;
                      }
                      if (navigateOnClick) {
                        navigate(`/join/${campaign.slug}`);
                      } else {
                        setSelectedCampaign(campaign);
                        setSheetOpen(true);
                      }
                    };
                    const isEnded = campaign.status === "ended";
                    const isBookmarked = bookmarkedCampaignIds.includes(campaign.id);
                    return (
                      <div key={campaign.id} className="flex-shrink-0 w-[280px] sm:w-[320px]">
                        <CampaignCard
                          id={campaign.id}
                          title={campaign.title}
                          brand_name={campaign.brand_name}
                          brand_logo_url={campaign.brand_logo_url}
                          brand_is_verified={campaign.brand_is_verified}
                          brand_slug={campaign.brand_slug}
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
                            navigate(`/join/${campaign.slug}`);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Brands Section */}
            {typeFilter === 'all' && brands.length > 0 && !searchQuery && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-[-0.3px] font-geist">
                    Brands
                  </h2>
                  <div className="flex items-center border border-border/50 rounded-full overflow-hidden bg-muted/30">
                    <button
                      onClick={() => {
                        const container = document.getElementById('brands-scroll');
                        if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                      }}
                      className="p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <div className="w-px h-5 bg-border/50" />
                    <button
                      onClick={() => {
                        const container = document.getElementById('brands-scroll');
                        if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                      }}
                      className="p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div
                  id="brands-scroll"
                  className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {brands.map(brand => (
                    <div key={brand.id} className="flex-shrink-0 w-[220px]">
                      <BrandCard
                        id={brand.id}
                        name={brand.name}
                        slug={brand.slug}
                        logo_url={brand.logo_url}
                        is_verified={brand.is_verified}
                        brand_color={brand.brand_color}
                        description={brand.description}
                        website_url={brand.website_url}
                        instagram_handle={brand.instagram_handle}
                        tiktok_handle={brand.tiktok_handle}
                        campaign_count={brand.campaign_count}
                        boost_count={brand.boost_count}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity - Only show when logged in */}
            {user && <RecentActivity />}
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
      
      <SearchOverlay isOpen={searchOverlayOpen} onClose={() => setSearchOverlayOpen(false)} searchQuery={searchQuery} onSearchChange={setSearchQuery} onTypeFilter={setTypeFilter} onNicheFilter={setNicheFilter} onBrowseFilter={setBrowseFilter} onPlatformFilter={setSelectedPlatform} onSortFilter={setSortBy} onStatusFilter={setStatusFilter} onSavedFilter={setShowBookmarkedOnly} activeTypeFilter={typeFilter} activeNicheFilter={nicheFilter} activeBrowseFilter={browseFilter} activePlatformFilter={selectedPlatform} activeSortFilter={sortBy} activeStatusFilter={statusFilter} activeSavedFilter={showBookmarkedOnly} />
      
      {/* Create Campaign Dialog */}
      <CreateCampaignTypeDialog open={createCampaignDialogOpen} onOpenChange={setCreateCampaignDialogOpen} brandId={userBrand?.id} subscriptionPlan={userBrand?.subscriptionPlan} onSelectClipping={blueprintId => {
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