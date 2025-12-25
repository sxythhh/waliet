import { useState, useEffect, useMemo } from "react";
import { Search, Download, Upload, Filter, MoreHorizontal, ExternalLink, Plus, X, Check, AlertCircle, Users, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { SubscriptionGateDialog } from "@/components/brand/SubscriptionGateDialog";
import vpnKeyIcon from "@/assets/vpn-key-icon.svg";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import xLogoBlack from "@/assets/x-logo.png";
import xLogoWhite from "@/assets/x-logo-light.png";

interface Creator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  country: string | null;
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
    follower_count?: number | null;
  }[];
  total_views: number;
  total_earnings: number;
  date_joined: string | null;
  campaigns: { id: string; title: string; type: 'campaign' | 'boost' }[];
}

interface DiscoverableCreator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  content_niches: string[] | null;
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
    follower_count: number | null;
  }[];
}

interface Campaign {
  id: string;
  title: string;
}

interface CreatorDatabaseTabProps {
  brandId: string;
  onStartConversation?: (creatorId: string, creatorName: string) => void;
}

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'x'] as const;
const FOLLOWER_RANGES = [
  { value: 'any', label: 'Any followers' },
  { value: '1k', label: '1K+' },
  { value: '10k', label: '10K+' },
  { value: '50k', label: '50K+' },
  { value: '100k', label: '100K+' },
  { value: '500k', label: '500K+' },
  { value: '1m', label: '1M+' }
];
const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'India', 'Germany', 'France', 'Australia', 'Brazil', 'Pakistan', 'Indonesia'];

const getPlatformLogos = (isDark: boolean): Record<string, string> => ({
  tiktok: isDark ? tiktokLogoWhite : tiktokLogoBlack,
  instagram: isDark ? instagramLogoWhite : instagramLogoBlack,
  youtube: isDark ? youtubeLogoWhite : youtubeLogoBlack,
  x: isDark ? xLogoWhite : xLogoBlack
});

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const formatFollowerCount = (count: number | null) => {
  if (!count) return null;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const getMinFollowers = (range: string): number => {
  switch (range) {
    case '1k': return 1000;
    case '10k': return 10000;
    case '50k': return 50000;
    case '100k': return 100000;
    case '500k': return 500000;
    case '1m': return 1000000;
    default: return 0;
  }
};

export function CreatorDatabaseTab({ brandId, onStartConversation }: CreatorDatabaseTabProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const PLATFORM_LOGOS = useMemo(() => getPlatformLogos(isDark), [isDark]);
  
  // Mode toggle
  const [showFindCreators, setShowFindCreators] = useState(false);
  
  // Database state
  const [creators, setCreators] = useState<Creator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>("all");
  const [selectedCreators, setSelectedCreators] = useState<Set<string>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  // Find Creators state
  const [discoverableCreators, setDiscoverableCreators] = useState<DiscoverableCreator[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [debouncedDiscoverSearch, setDebouncedDiscoverSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [followerFilter, setFollowerFilter] = useState<string>('any');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [subscriptionGateOpen, setSubscriptionGateOpen] = useState(false);

  // Debounce discover search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDiscoverSearch(discoverSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [discoverSearch]);

  useEffect(() => {
    fetchCreators();
    fetchCampaigns();
    checkSubscription();
  }, [brandId]);

  // Fetch discoverable creators when toggled or filters change
  useEffect(() => {
    if (showFindCreators && hasActivePlan) {
      fetchDiscoverableCreators();
    }
  }, [showFindCreators, hasActivePlan, debouncedDiscoverSearch, platformFilter, followerFilter, countryFilter]);

  const checkSubscription = async () => {
    const { data } = await supabase
      .from('brands')
      .select('subscription_status')
      .eq('id', brandId)
      .single();
    setHasActivePlan(data?.subscription_status === 'active');
  };

  const fetchDiscoverableCreators = async () => {
    setDiscoverLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, city, country, content_niches")
        .eq("onboarding_completed", true);

      if (debouncedDiscoverSearch) {
        query = query.or(`username.ilike.*${debouncedDiscoverSearch}*,full_name.ilike.*${debouncedDiscoverSearch}*,bio.ilike.*${debouncedDiscoverSearch}*`);
      }

      if (countryFilter !== 'all') {
        query = query.eq('country', countryFilter);
      }

      const { data: profiles, error } = await query.limit(100);
      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        setDiscoverableCreators([]);
        setDiscoverLoading(false);
        return;
      }

      let socialQuery = supabase
        .from("social_accounts")
        .select("user_id, platform, username, account_link, follower_count")
        .in("user_id", profiles.map(p => p.id))
        .eq("is_verified", true);

      if (platformFilter !== 'all') {
        socialQuery = socialQuery.eq('platform', platformFilter);
      }

      const { data: socialAccounts } = await socialQuery;

      const creatorsWithSocial: DiscoverableCreator[] = profiles.map(profile => ({
        ...profile,
        social_accounts: (socialAccounts || [])
          .filter(sa => sa.user_id === profile.id)
          .map(sa => ({
            platform: sa.platform,
            username: sa.username,
            account_link: sa.account_link,
            follower_count: sa.follower_count
          }))
      }));

      let filtered = debouncedDiscoverSearch 
        ? creatorsWithSocial 
        : creatorsWithSocial.filter(c => c.social_accounts.length > 0);

      if (followerFilter !== 'any' && !debouncedDiscoverSearch) {
        const minFollowers = getMinFollowers(followerFilter);
        filtered = filtered.filter(c => {
          const maxFollowers = Math.max(...c.social_accounts.map(a => a.follower_count || 0), 0);
          return maxFollowers >= minFollowers;
        });
      }

      setDiscoverableCreators(filtered);
    } catch (error) {
      console.error("Error fetching discoverable creators:", error);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const hasActiveFilters = platformFilter !== 'all' || followerFilter !== 'any' || countryFilter !== 'all';
  
  const clearDiscoverFilters = () => {
    setPlatformFilter('all');
    setFollowerFilter('any');
    setCountryFilter('all');
  };

  const fetchCampaigns = async () => {
    const [campaignsResult, boostsResult] = await Promise.all([
      supabase.from('campaigns').select('id, title').eq('brand_id', brandId),
      supabase.from('bounty_campaigns').select('id, title').eq('brand_id', brandId)
    ]);

    const allCampaigns: Campaign[] = [
      ...(campaignsResult.data || []),
      ...(boostsResult.data || [])
    ];
    setCampaigns(allCampaigns);
  };

  const fetchCreators = async () => {
    setLoading(true);
    try {
      // Get all video submissions for this brand
      const { data: submissions } = await supabase
        .from('video_submissions')
        .select('creator_id, views, source_type, source_id')
        .eq('brand_id', brandId)
        .eq('status', 'approved');

      // Get all bounty applications for this brand
      const { data: applications } = await supabase
        .from('bounty_applications')
        .select('user_id, bounty_campaign_id, status')
        .in('bounty_campaign_id', campaigns.map(c => c.id));

      // Get all wallet transactions for this brand's campaigns
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('user_id, amount, metadata')
        .eq('type', 'earning');

      // Get unique creator IDs
      const creatorIds = new Set<string>();
      submissions?.forEach(s => creatorIds.add(s.creator_id));
      applications?.filter(a => a.status === 'accepted').forEach(a => creatorIds.add(a.user_id));

      if (creatorIds.size === 0) {
        setCreators([]);
        setLoading(false);
        return;
      }

      // Fetch creator profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, email, country, created_at')
        .in('id', Array.from(creatorIds));

      // Fetch social accounts
      const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select('user_id, platform, username, account_link, follower_count')
        .in('user_id', Array.from(creatorIds));

      // Build creator objects
      const creatorsMap = new Map<string, Creator>();
      
      profiles?.forEach(profile => {
        creatorsMap.set(profile.id, {
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          email: profile.email,
          country: profile.country,
          social_accounts: [],
          total_views: 0,
          total_earnings: 0,
          date_joined: profile.created_at,
          campaigns: []
        });
      });

      // Add social accounts
      socialAccounts?.forEach(account => {
        const creator = creatorsMap.get(account.user_id);
        if (creator) {
          creator.social_accounts.push({
            platform: account.platform,
            username: account.username,
            account_link: account.account_link,
            follower_count: account.follower_count
          });
        }
      });

      // Add views from submissions
      submissions?.forEach(submission => {
        const creator = creatorsMap.get(submission.creator_id);
        if (creator) {
          creator.total_views += submission.views || 0;
          const campaignId = submission.source_id;
          if (campaignId && !creator.campaigns.find(c => c.id === campaignId)) {
            const campaign = campaigns.find(c => c.id === campaignId);
            if (campaign) {
              creator.campaigns.push({ 
                id: campaign.id, 
                title: campaign.title, 
                type: submission.source_type as 'campaign' | 'boost' 
              });
            }
          }
        }
      });

      // Add earnings from transactions
      transactions?.forEach(tx => {
        const creator = creatorsMap.get(tx.user_id);
        if (creator) {
          const metadata = tx.metadata as { campaign_id?: string; boost_id?: string } | null;
          if (metadata?.campaign_id || metadata?.boost_id) {
            const campaignId = metadata.campaign_id || metadata.boost_id;
            const campaign = campaigns.find(c => c.id === campaignId);
            if (campaign) {
              creator.total_earnings += tx.amount || 0;
            }
          }
        }
      });

      setCreators(Array.from(creatorsMap.values()));
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setLoading(false);
    }
  };

  const filteredCreators = useMemo(() => {
    let filtered = creators;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.username?.toLowerCase().includes(query) ||
        c.full_name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.social_accounts.some(s => s.username.toLowerCase().includes(query))
      );
    }

    if (selectedCampaignFilter !== 'all') {
      filtered = filtered.filter(c => 
        c.campaigns.some(camp => camp.id === selectedCampaignFilter)
      );
    }

    return filtered;
  }, [creators, searchQuery, selectedCampaignFilter]);

  const handleExportCSV = () => {
    const headers = ['Username', 'Full Name', 'Email', 'Country', 'Total Views', 'Total Earnings', 'Social Accounts', 'Campaigns'];
    const rows = filteredCreators.map(c => [
      c.username,
      c.full_name || '',
      c.email || '',
      c.country || '',
      c.total_views,
      c.total_earnings.toFixed(2),
      c.social_accounts.map(s => `${s.platform}:@${s.username}`).join('; '),
      c.campaigns.map(camp => camp.title).join('; ')
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creators-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error('Please enter data to import');
      return;
    }

    setImportLoading(true);
    try {
      // Parse CSV data
      const lines = importData.trim().split('\n');
      const imported = [];

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2) {
          const [platform, username] = parts;
          if (platform && username) {
            imported.push({ platform: platform.toLowerCase(), username: username.replace('@', '') });
          }
        }
      }

      if (imported.length === 0) {
        toast.error('No valid data found. Format: platform,username');
        return;
      }

      // Here you could add logic to track these accounts or invite them
      toast.success(`Parsed ${imported.length} creators. Import functionality coming soon.`);
      setImportDialogOpen(false);
      setImportData('');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data');
    } finally {
      setImportLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCreators.size === filteredCreators.length) {
      setSelectedCreators(new Set());
    } else {
      setSelectedCreators(new Set(filteredCreators.map(c => c.id)));
    }
  };

  const toggleCreatorSelection = (id: string) => {
    const newSet = new Set(selectedCreators);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCreators(newSet);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold font-instrument tracking-tight">
              {showFindCreators ? 'Find Creators' : 'Creator Database'}
            </h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              {showFindCreators 
                ? 'Discover and reach out to creators for your campaigns'
                : `${creators.length} creators across all campaigns`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={showFindCreators ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowFindCreators(!showFindCreators)} 
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              {showFindCreators ? 'View Database' : 'Find Creators'}
            </Button>
            {!showFindCreators && (
              <>
                <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Database Filters */}
        {!showFindCreators && (
          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or social handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-border"
              />
            </div>
            <Select value={selectedCampaignFilter} onValueChange={setSelectedCampaignFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-muted/30">
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>{campaign.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Find Creators Filters */}
        {showFindCreators && hasActivePlan && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, niche, or username..." 
                  value={discoverSearch} 
                  onChange={e => setDiscoverSearch(e.target.value)} 
                  className="pl-10 h-10 bg-muted/30 border-0 font-inter tracking-[-0.5px]" 
                />
              </div>
              <Button 
                variant={showFilters ? "secondary" : "outline"} 
                size="icon" 
                className="h-10 w-10 shrink-0" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs bg-muted/30 border-0">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={followerFilter} onValueChange={setFollowerFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-xs bg-muted/30 border-0">
                    <SelectValue placeholder="Followers" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWER_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs bg-muted/30 border-0">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearDiscoverFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Find Creators View */}
      {showFindCreators ? (
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Subscription Gate */}
            {hasActivePlan === false && (
              <div className="relative">
                <div className="blur-sm pointer-events-none select-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="rounded-xl border border-border/50 bg-card/30 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-4 w-20 bg-muted rounded" />
                          <div className="flex gap-2">
                            <div className="h-5 w-5 bg-muted rounded" />
                            <div className="h-5 w-5 bg-muted rounded" />
                          </div>
                        </div>
                        <div className="flex items-start gap-3 mb-4">
                          <div className="h-12 w-12 bg-muted rounded-full" />
                          <div className="flex-1">
                            <div className="h-5 w-28 bg-muted rounded mb-1.5" />
                            <div className="h-3 w-36 bg-muted rounded" />
                          </div>
                        </div>
                        <div className="h-12 w-full bg-muted rounded mb-4" />
                        <div className="h-9 w-full bg-muted rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                  <div className="text-center p-8 max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto mb-5">
                      <img src={vpnKeyIcon} alt="Key" className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 tracking-[-0.5px]">
                      Upgrade to Access
                    </h3>
                    <p className="text-sm text-muted-foreground mb-5 font-inter tracking-[-0.5px]">
                      Subscribe to browse and message creators for your campaigns
                    </p>
                    <button 
                      onClick={() => setSubscriptionGateOpen(true)} 
                      className="mx-auto py-2 px-4 bg-[#1f60dd] border-t border-[#4b85f7] rounded-lg font-['Inter'] text-[14px] font-medium tracking-[-0.5px] text-white hover:bg-[#1a50c8] transition-colors flex items-center justify-center gap-2"
                    >
                      <img src={vpnKeyIcon} alt="" className="h-4 w-4" />
                      Upgrade Plan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {hasActivePlan && discoverLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-card/30 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <Skeleton className="h-4 w-20 rounded-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-5 w-5 rounded" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 mb-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-28 mb-1.5 rounded" />
                        <Skeleton className="h-3 w-36 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-12 w-full mb-4 rounded" />
                    <Skeleton className="h-9 w-full rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {hasActivePlan && !discoverLoading && discoverableCreators.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
                  <Users className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="font-semibold text-base mb-2">No creators found</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] font-inter tracking-[-0.5px]">
                  {discoverSearch || hasActiveFilters ? "Try adjusting your search or filters" : "No verified creators are available yet"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={clearDiscoverFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}

            {/* Creator Grid */}
            {hasActivePlan && !discoverLoading && discoverableCreators.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {discoverableCreators.map(creator => (
                  <div key={creator.id} className="rounded-xl border border-border/50 bg-card/30 hover:bg-muted/30 transition-all duration-200 overflow-hidden">
                    {/* Status & Platforms Row */}
                    <div className="px-5 pt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                        Active now
                      </span>
                      <div className="flex items-center gap-2">
                        {creator.social_accounts.slice(0, 3).map(account => (
                          <a 
                            key={`${account.platform}-${account.username}`} 
                            href={account.account_link || "#"} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="opacity-50 hover:opacity-100 transition-opacity" 
                            onClick={e => e.stopPropagation()}
                          >
                            <img src={PLATFORM_LOGOS[account.platform]} alt={account.platform} className="h-4 w-4 object-contain" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Creator Info */}
                    <div className="px-5 py-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-12 w-12 ring-1 ring-border">
                          <AvatarImage src={creator.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                            {creator.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {creator.full_name || creator.username}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate font-inter tracking-[-0.5px]">
                            {[creator.city, creator.country].filter(Boolean).join(" • ") || `@${creator.username}`}
                          </p>
                        </div>
                      </div>

                      {/* Bio */}
                      {creator.bio && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3 font-inter tracking-[-0.5px]">
                          {creator.bio}
                        </p>
                      )}

                      {/* Niches/Tags */}
                      {creator.content_niches && creator.content_niches.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {creator.content_niches.slice(0, 2).map(niche => (
                            <Badge key={niche} variant="secondary" className="text-[10px] px-2.5 py-0.5 rounded-full bg-muted/50 text-foreground font-inter tracking-[-0.5px]">
                              {niche}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Follower Count Summary */}
                      {creator.social_accounts.some(a => a.follower_count) && (
                        <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                          {creator.social_accounts.filter(a => a.follower_count).slice(0, 2).map(account => (
                            <span key={account.platform} className="flex items-center gap-1">
                              <img src={PLATFORM_LOGOS[account.platform]} alt={account.platform} className="h-3 w-3 object-contain" />
                              {formatFollowerCount(account.follower_count)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* CTA Button */}
                      <Button 
                        size="sm" 
                        className="w-full h-9 rounded-full text-xs font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90" 
                        onClick={() => {
                          if (onStartConversation) {
                            onStartConversation(creator.id, creator.full_name || creator.username);
                          }
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <>
          {/* Table */}
          <ScrollArea className="flex-1">
            <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={selectedCreators.size === filteredCreators.length && filteredCreators.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-inter tracking-[-0.5px]">Creator</TableHead>
              <TableHead className="font-inter tracking-[-0.5px]">Socials</TableHead>
              <TableHead className="font-inter tracking-[-0.5px]">Campaigns</TableHead>
              <TableHead className="font-inter tracking-[-0.5px] text-right">Views</TableHead>
              <TableHead className="font-inter tracking-[-0.5px] text-right">Earnings</TableHead>
              <TableHead className="font-inter tracking-[-0.5px]">Joined</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCreators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {searchQuery || selectedCampaignFilter !== 'all' 
                    ? 'No creators match your filters' 
                    : 'No creators in your database yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCreators.map((creator) => (
                <TableRow key={creator.id} className="hover:bg-muted/30 border-b border-border">
                  <TableCell>
                    <Checkbox 
                      checked={selectedCreators.has(creator.id)}
                      onCheckedChange={() => toggleCreatorSelection(creator.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={creator.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-xs">
                          {creator.username?.charAt(0).toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm font-inter tracking-[-0.5px]">
                          {creator.full_name || creator.username}
                        </p>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                          @{creator.username}
                        </p>
                      </div>
                      {creator.country && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {creator.country}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {creator.social_accounts.slice(0, 3).map((account, idx) => (
                        <a 
                          key={idx}
                          href={account.account_link || `https://${account.platform}.com/@${account.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity"
                          title={`@${account.username}`}
                        >
                          <img 
                            src={PLATFORM_LOGOS[account.platform] || PLATFORM_LOGOS.tiktok} 
                            alt={account.platform}
                            className="h-5 w-5"
                          />
                        </a>
                      ))}
                      {creator.social_accounts.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{creator.social_accounts.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {creator.campaigns.slice(0, 2).map((campaign) => (
                        <Badge key={campaign.id} variant="outline" className="text-[10px]">
                          {campaign.title}
                        </Badge>
                      ))}
                      {creator.campaigns.length > 2 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{creator.campaigns.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium font-inter tracking-[-0.5px]">
                    {formatNumber(creator.total_views)}
                  </TableCell>
                  <TableCell className="text-right font-medium font-inter tracking-[-0.5px]">
                    ${creator.total_earnings.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                    {creator.date_joined ? format(new Date(creator.date_joined), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Remove from Database
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Bulk Actions Bar */}
      {selectedCreators.size > 0 && (
        <div className="border-t border-border p-3 bg-muted/30 flex items-center justify-between">
          <span className="text-sm font-inter tracking-[-0.5px]">
            {selectedCreators.size} creator{selectedCreators.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCreators(new Set())}>
              Clear Selection
            </Button>
            <Button variant="outline" size="sm">
              Send Bulk Message
            </Button>
            <Button size="sm">
              Add to Campaign
            </Button>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-instrument tracking-tight">Import Creators</DialogTitle>
            <DialogDescription className="font-inter tracking-[-0.5px]">
              Import creators from a CSV file or paste data directly. Format: platform,username (one per line)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-inter tracking-[-0.5px]">Paste CSV Data</Label>
              <Textarea 
                placeholder="tiktok,@username&#10;instagram,@anotheruser&#10;youtube,@creator"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="mt-2 min-h-[150px] font-mono text-sm"
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Imported creators will be added to your database for tracking. You can then invite them to campaigns.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importLoading}>
              {importLoading ? 'Importing...' : 'Import Creators'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubscriptionGateDialog brandId={brandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />
        </>
      )}
    </div>
  );
}
