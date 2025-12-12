import { useState, useEffect } from "react";
import { Search, Users, X, Mail, ExternalLink, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import xLogo from "@/assets/x-logo.png";
interface Creator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  campaigns: {
    id: string;
    title: string;
  }[];
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
  }[];
  total_views: number;
  total_earnings: number;
  date_joined: string | null;
}
interface CreatorsTabProps {
  brandId: string;
}
const PLATFORM_LOGOS: Record<string, string> = {
  tiktok: tiktokLogo,
  instagram: instagramLogo,
  youtube: youtubeLogo,
  x: xLogo
};
export function CreatorsTab({
  brandId
}: CreatorsTabProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  useEffect(() => {
    fetchCreators();
  }, [brandId]);
  const fetchCreators = async () => {
    if (!brandId) {
      setCreators([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);

    // Get all campaigns for this brand
    const {
      data: campaigns,
      error: campaignsError
    } = await supabase.from("campaigns").select("id, title").eq("brand_id", brandId);
    
    console.log("CreatorsTab - brandId:", brandId, "campaigns:", campaigns, "error:", campaignsError);
    
    if (!campaigns || campaigns.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }
    const campaignIds = campaigns.map(c => c.id);
    const campaignMap = new Map(campaigns.map(c => [c.id, c.title]));

    // Get all social account campaign connections
    const {
      data: connections,
      error: connectionsError
    } = await supabase.from("social_account_campaigns").select(`
        campaign_id,
        user_id,
        connected_at,
        social_accounts!inner (
          platform,
          username,
          account_link
        )
      `).in("campaign_id", campaignIds).eq("status", "active");
    
    console.log("CreatorsTab - campaignIds:", campaignIds, "connections:", connections?.length, "error:", connectionsError);
    
    if (!connections || connections.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(connections.map(c => c.user_id))];

    // Fetch profiles in batches to avoid Supabase 1000-row limit
    const BATCH_SIZE = 500;
    const profiles: any[] = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchIds = userIds.slice(i, i + BATCH_SIZE);
      const { data: batchProfiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, email, total_earnings")
        .in("id", batchIds);
      if (batchProfiles) {
        profiles.push(...batchProfiles);
      }
    }

    // Fetch analytics in batches
    const analytics: any[] = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchIds = userIds.slice(i, i + BATCH_SIZE);
      const { data: batchAnalytics } = await supabase
        .from("campaign_account_analytics")
        .select("user_id, total_views, paid_views")
        .in("campaign_id", campaignIds)
        .in("user_id", batchIds);
      if (batchAnalytics) {
        analytics.push(...batchAnalytics);
      }
    }

    // Aggregate data by user
    const creatorMap = new Map<string, Creator>();
    for (const conn of connections) {
      const userId = conn.user_id;
      const profile = profiles?.find(p => p.id === userId);
      if (!profile) continue;
      if (!creatorMap.has(userId)) {
        creatorMap.set(userId, {
          id: userId,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          email: profile.email,
          campaigns: [],
          social_accounts: [],
          total_views: 0,
          total_earnings: 0,
          date_joined: conn.connected_at
        });
      } else {
        // Update date_joined to the earliest connection date
        const creator = creatorMap.get(userId)!;
        if (conn.connected_at && (!creator.date_joined || conn.connected_at < creator.date_joined)) {
          creator.date_joined = conn.connected_at;
        }
      }
      const creator = creatorMap.get(userId)!;

      // Add campaign if not already added
      const campaignTitle = campaignMap.get(conn.campaign_id);
      if (campaignTitle && !creator.campaigns.find(c => c.id === conn.campaign_id)) {
        creator.campaigns.push({
          id: conn.campaign_id,
          title: campaignTitle
        });
      }

      // Add social account if not already added
      const socialAccount = conn.social_accounts as any;
      if (socialAccount && !creator.social_accounts.find(s => s.platform === socialAccount.platform && s.username === socialAccount.username)) {
        creator.social_accounts.push({
          platform: socialAccount.platform,
          username: socialAccount.username,
          account_link: socialAccount.account_link
        });
      }
    }

    if (analytics && analytics.length > 0) {
      for (const analytic of analytics) {
        const creator = creatorMap.get(analytic.user_id);
        if (creator) {
          creator.total_views += analytic.total_views || 0;
        }
      }
    }

    // Fetch wallet transactions in batches
    const transactions: any[] = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchIds = userIds.slice(i, i + BATCH_SIZE);
      const { data: batchTx } = await supabase
        .from("wallet_transactions")
        .select("user_id, amount, metadata")
        .eq("type", "earning")
        .in("user_id", batchIds);
      if (batchTx) {
        transactions.push(...batchTx);
      }
    }
    
    if (transactions.length > 0) {
      for (const tx of transactions) {
        const campaignId = (tx.metadata as any)?.campaign_id;
        if (campaignId && campaignIds.includes(campaignId)) {
          const creator = creatorMap.get(tx.user_id);
          if (creator) {
            creator.total_earnings += Number(tx.amount) || 0;
          }
        }
      }
    }
    
    console.log("CreatorsTab - total creators found:", creatorMap.size);
    setCreators(Array.from(creatorMap.values()));
    setLoading(false);
  };
  const filteredCreators = creators.filter(creator => {
    const query = searchQuery.toLowerCase();
    return creator.username.toLowerCase().includes(query) || creator.full_name?.toLowerCase().includes(query) || creator.email?.toLowerCase().includes(query) || creator.social_accounts.some(s => s.username.toLowerCase().includes(query));
  });
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const exportToCSV = () => {
    const rows: string[][] = [];
    
    // Header
    rows.push(["Creator Name", "Username", "Email", "Platform", "Account Username", "Account URL", "Date Joined", "Total Earnings"]);
    
    // Data rows - one row per social account
    for (const creator of creators) {
      if (creator.social_accounts.length === 0) {
        // Creator with no accounts
        rows.push([
          creator.full_name || "",
          creator.username,
          creator.email || "",
          "",
          "",
          "",
          creator.date_joined ? new Date(creator.date_joined).toLocaleDateString() : "",
          creator.total_earnings.toFixed(2)
        ]);
      } else {
        // One row per social account
        for (const account of creator.social_accounts) {
          rows.push([
            creator.full_name || "",
            creator.username,
            creator.email || "",
            account.platform,
            account.username,
            account.account_link || "",
            creator.date_joined ? new Date(creator.date_joined).toLocaleDateString() : "",
            creator.total_earnings.toFixed(2)
          ]);
        }
      }
    }
    
    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    
    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `creators-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        {/* Table Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <div className="p-6 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Creators</h2>
          <p className="text-sm text-muted-foreground">
            {creators.length} creator{creators.length !== 1 ? "s" : ""} joined your campaigns
          </p>
        </div>
        
        {creators.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 gap-2 text-xs font-inter tracking-[-0.5px]"
            onClick={exportToCSV}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      {creators.length === 0 ? <Card className="p-12 flex flex-col items-center justify-center text-center flex-1 border-0 bg-transparent shadow-none">
          <h3 className="text-lg font-medium mb-2">No creators yet</h3>
          <p className="text-muted-foreground">
            Creators will appear here once they join your campaigns.
          </p>
        </Card> : <>
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-xl overflow-hidden bg-card/50 border border-[#e0e0e0] dark:border-[#111111] flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-[#e0e0e0] dark:border-[#111111]">
                  <th className="text-left py-4 px-5 text-xs font-geist tracking-[-0.5px] font-medium text-black dark:text-white">Creator</th>
                  <th className="text-left py-4 px-5 text-xs font-geist tracking-[-0.5px] font-medium text-black dark:text-white">Accounts</th>
                  <th className="text-right py-4 px-5 text-xs font-geist tracking-[-0.5px] font-medium text-black dark:text-white">Date Joined</th>
                  <th className="text-right py-4 px-5 text-xs font-geist tracking-[-0.5px] font-medium text-black dark:text-white">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map(creator => <tr key={creator.id} className="hover:bg-[#F4F4F4] dark:hover:bg-[#0a0a0a] transition-colors cursor-pointer" onClick={() => setSelectedCreator(creator)}>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-background">
                          <AvatarImage src={creator.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {creator.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{creator.full_name || creator.username}</p>
                          <p className="text-xs text-muted-foreground">@{creator.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {creator.social_accounts.slice(0, 3).map((account, idx) => <Button key={idx} variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-foreground rounded-full bg-muted/50 hover:bg-muted" onClick={e => {
                    e.stopPropagation();
                    if (account.account_link) {
                      window.open(account.account_link, "_blank");
                    }
                  }}>
                            <img src={PLATFORM_LOGOS[account.platform.toLowerCase()]} alt={account.platform} className="h-3.5 w-3.5 object-contain" />
                            <span className="text-xs font-medium tracking-[-0.5px] max-w-[80px] truncate">@{account.username}</span>
                          </Button>)}
                        {creator.social_accounts.length > 3 && <span className="text-xs text-muted-foreground px-2 tracking-[-0.5px]">
                            +{creator.social_accounts.length - 3}
                          </span>}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <span className="text-sm text-muted-foreground tracking-[-0.5px]">
                        {creator.date_joined ? new Date(creator.date_joined).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : '-'}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <span className="font-semibold tabular-nums text-sm text-green-500 tracking-[-0.5px]">
                        ${creator.total_earnings.toFixed(2)}
                      </span>
                    </td>
                  </tr>)}
              </tbody>
            </table>

            {filteredCreators.length === 0 && searchQuery && <div className="p-8 text-center text-muted-foreground">
                No creators found matching "{searchQuery}"
              </div>}
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden space-y-3">
            {filteredCreators.map(creator => <div key={creator.id} className="rounded-xl bg-card/50 p-4 space-y-4 cursor-pointer hover:bg-[#0a0a0a] transition-colors" onClick={() => setSelectedCreator(creator)}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-background">
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {creator.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{creator.full_name || creator.username}</p>
                      <p className="text-sm text-muted-foreground">@{creator.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-500">${creator.total_earnings.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(creator.total_views)} views</p>
                  </div>
                </div>

                {/* Social Accounts */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {creator.social_accounts.slice(0, 4).map((account, idx) => <Button key={idx} variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-foreground rounded-full bg-muted/50 hover:bg-muted" onClick={e => {
              e.stopPropagation();
              if (account.account_link) {
                window.open(account.account_link, "_blank");
              }
            }}>
                      <img src={PLATFORM_LOGOS[account.platform.toLowerCase()]} alt={account.platform} className="h-3.5 w-3.5 object-contain" />
                      <span className="text-xs font-medium tracking-[-0.5px]">@{account.username}</span>
                    </Button>)}
                </div>
              </div>)}

            {filteredCreators.length === 0 && searchQuery && <div className="p-8 text-center text-muted-foreground rounded-xl bg-card/50">
                No creators found matching "{searchQuery}"
              </div>}
          </div>
        </>}

      {/* Creator Detail Dialog */}
      <Dialog open={!!selectedCreator} onOpenChange={open => !open && setSelectedCreator(null)}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-[#0a0a0a] border-border">
          {selectedCreator && <>
              <DialogHeader>
                <DialogTitle className="sr-only">Creator Details</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-2 ring-background">
                    <AvatarImage src={selectedCreator.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {selectedCreator.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedCreator.full_name || selectedCreator.username}</h3>
                    <p className="text-sm text-muted-foreground">@{selectedCreator.username}</p>
                    {selectedCreator.email && <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{selectedCreator.email}</span>
                      </div>}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted dark:bg-[#141414] p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Views</p>
                    <p className="text-xl font-bold tabular-nums">{formatNumber(selectedCreator.total_views)}</p>
                  </div>
                  <div className="rounded-xl bg-muted dark:bg-[#141414] p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Earnings</p>
                    <p className="text-xl font-bold tabular-nums text-green-500">${selectedCreator.total_earnings.toFixed(2)}</p>
                  </div>
                </div>

                {/* Social Accounts */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Connected Accounts</h4>
                  <div className="space-y-2">
                    {selectedCreator.social_accounts.map((account, idx) => <div key={idx} className="flex items-center justify-between rounded-xl bg-muted dark:bg-[#141414] p-3">
                        <div className="flex items-center gap-3">
                          <img src={PLATFORM_LOGOS[account.platform.toLowerCase()]} alt={account.platform} className="h-5 w-5 object-contain" />
                          <div>
                            <p className="text-sm font-medium">@{account.username}</p>
                            <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                          </div>
                        </div>
                        {account.account_link && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => window.open(account.account_link!, "_blank")}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>}
                      </div>)}
                  </div>
                </div>

                {/* Campaigns */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Joined Campaigns</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCreator.campaigns.map(campaign => <span key={campaign.id} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                        {campaign.title}
                      </span>)}
                  </div>
                </div>
              </div>
            </>}
        </DialogContent>
      </Dialog>
    </div>;
}