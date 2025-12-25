import { useState, useEffect, useMemo } from "react";
import { Search, Download, Upload, Filter, MoreHorizontal, ExternalLink, Plus, X, Check, AlertCircle } from "lucide-react";
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

interface Campaign {
  id: string;
  title: string;
}

interface CreatorDatabaseTabProps {
  brandId: string;
}

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

export function CreatorDatabaseTab({ brandId }: CreatorDatabaseTabProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const PLATFORM_LOGOS = useMemo(() => getPlatformLogos(isDark), [isDark]);
  
  const [creators, setCreators] = useState<Creator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>("all");
  const [selectedCreators, setSelectedCreators] = useState<Set<string>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    fetchCreators();
    fetchCampaigns();
  }, [brandId]);

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
            <h2 className="text-xl font-semibold font-instrument tracking-tight">Creator Database</h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              {creators.length} creators across all campaigns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
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
      </div>

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
    </div>
  );
}
