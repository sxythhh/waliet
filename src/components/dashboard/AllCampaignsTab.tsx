import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Search, SlidersHorizontal } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";

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
  allowed_platforms: string[];
}

type SortOption = 'newest' | 'budget-high' | 'budget-low' | 'rpm-high' | 'rpm-low';

export function AllCampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [joinedCampaignIds, setJoinedCampaignIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    filterAndSortCampaigns();
  }, [campaigns, searchQuery, platformFilter, sortBy, joinedCampaignIds]);

  const fetchCampaigns = async () => {
    setLoading(true);
    
    try {
      // Get current user's approved submissions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: submissions } = await supabase
          .from("campaign_submissions")
          .select("campaign_id")
          .eq("creator_id", user.id)
          .eq("status", "approved");
        
        if (submissions) {
          setJoinedCampaignIds(submissions.map(s => s.campaign_id));
        }
      }

      // Only show public campaigns (not private)
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          brands (
            logo_url
          )
        `)
        .eq("status", "active")
        .eq("is_private", false)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch campaigns"
        });
      } else {
        const campaignsWithLogos = (data || []).map(campaign => ({
          ...campaign,
          brand_logo_url: campaign.brand_logo_url || (campaign.brands as any)?.logo_url
        }));
        setCampaigns(campaignsWithLogos);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
    
    setLoading(false);
  };

  const filterAndSortCampaigns = () => {
    let filtered = [...campaigns];

    // Filter out joined campaigns
    filtered = filtered.filter(campaign => !joinedCampaignIds.includes(campaign.id));

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(campaign =>
        campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply platform filter
    if (platformFilter) {
      filtered = filtered.filter(campaign =>
        campaign.allowed_platforms?.includes(platformFilter)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'budget-high':
          return b.budget - a.budget;
        case 'budget-low':
          return a.budget - b.budget;
        case 'rpm-high':
          return b.rpm_rate - a.rpm_rate;
        case 'rpm-low':
          return a.rpm_rate - b.rpm_rate;
        case 'newest':
        default:
          return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
      }
    });

    setFilteredCampaigns(filtered);
  };

  const getPlatformIcon = (platform: string) => {
    const isLightMode = theme === "light";
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return <img src={isLightMode ? tiktokLogoBlack : tiktokLogo} alt="TikTok" className="w-4 h-4" />;
      case 'instagram':
        return <img src={isLightMode ? instagramLogoBlack : instagramLogo} alt="Instagram" className="w-4 h-4" />;
      case 'youtube':
        return <img src={isLightMode ? youtubeLogoBlack : youtubeLogo} alt="YouTube" className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border border-border focus-visible:shadow-none focus-visible:bg-background focus-visible:border-border transition-none"
          />
        </div>

        {/* Platform Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Platform {platformFilter && `(${platformFilter})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filter by Platform</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPlatformFilter(null)}>
              All Platforms
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPlatformFilter('tiktok')} className="gap-2">
              <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />
              TikTok
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPlatformFilter('instagram')} className="gap-2">
              <img src={instagramLogo} alt="Instagram" className="w-4 h-4" />
              Instagram
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPlatformFilter('youtube')} className="gap-2">
              <img src={youtubeLogo} alt="YouTube" className="w-4 h-4" />
              YouTube
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortBy('newest')}>
              Newest First
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('budget-high')}>
              Budget (High to Low)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('budget-low')}>
              Budget (Low to High)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('rpm-high')}>
              RPM (High to Low)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('rpm-low')}>
              RPM (Low to High)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredCampaigns.length} of {campaigns.length} campaigns
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No campaigns found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCampaigns.map(campaign => {
            const budgetUsed = campaign.budget_used || 0;
            const budgetPercentage = campaign.budget > 0 ? (budgetUsed / campaign.budget) * 100 : 0;

            return (
              <Card
                key={campaign.id}
                className="group bg-card border-2 transition-all duration-300 overflow-hidden animate-fade-in cursor-pointer hover:border-primary/50"
                onClick={() => {
                  // If preview_url exists, go to preview page, otherwise go to join page
                  if ((campaign as any).preview_url) {
                    navigate(`/campaign/preview/${campaign.id}`);
                  } else {
                    navigate(`/campaign/join/${campaign.id}`);
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Banner Image */}
                  {campaign.banner_url && (
                    <div className="relative w-full sm:w-48 h-32 sm:h-auto flex-shrink-0 overflow-hidden bg-muted">
                      <img
                        src={campaign.banner_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                  )}

                  {/* Content */}
                  <CardContent className="p-4 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        {campaign.brand_logo_url && (
                          <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
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

                      <h3 className="text-base font-bold line-clamp-1 mb-1">
                        {campaign.title}
                      </h3>

                      {campaign.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {campaign.description}
                        </p>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* Budget */}
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                          Budget
                        </span>
                        <div className="text-xs">
                          <span className="font-bold">${budgetUsed.toLocaleString()}</span>
                          <span className="text-muted-foreground"> / ${campaign.budget.toLocaleString()}</span>
                        </div>
                        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className="absolute inset-y-0 left-0 bg-foreground rounded-full transition-all duration-700"
                            style={{ width: `${budgetPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* RPM Rate */}
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                          RPM Rate
                        </span>
                        <span className="text-sm font-bold">${campaign.rpm_rate.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-2 border-t flex items-center justify-between">
                      {/* Platforms */}
                      {campaign.allowed_platforms && campaign.allowed_platforms.length > 0 && (
                        <div className="flex gap-1.5">
                          {campaign.allowed_platforms.map((platform) => (
                            <div key={platform} className="w-4 h-4">
                              {getPlatformIcon(platform)}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Start Date */}
                      {campaign.start_date && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(campaign.start_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
