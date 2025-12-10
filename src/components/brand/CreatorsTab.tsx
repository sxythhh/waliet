import { useState, useEffect } from "react";
import { Search, Users, X, Mail, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import tiktokLogo from "@/assets/tiktok-logo-black.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import xLogo from "@/assets/x-logo.png";

interface Creator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  campaigns: { id: string; title: string }[];
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
  }[];
  total_views: number;
  total_earnings: number;
}

interface CreatorsTabProps {
  brandId: string;
}

const PLATFORM_LOGOS: Record<string, string> = {
  tiktok: tiktokLogo,
  instagram: instagramLogo,
  youtube: youtubeLogo,
  x: xLogo,
};

export function CreatorsTab({ brandId }: CreatorsTabProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  useEffect(() => {
    fetchCreators();
  }, [brandId]);

  const fetchCreators = async () => {
    setLoading(true);

    // Get all campaigns for this brand
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, title")
      .eq("brand_id", brandId);

    if (!campaigns || campaigns.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    const campaignIds = campaigns.map((c) => c.id);
    const campaignMap = new Map(campaigns.map((c) => [c.id, c.title]));

    // Get all social account campaign connections
    const { data: connections } = await supabase
      .from("social_account_campaigns")
      .select(`
        campaign_id,
        user_id,
        social_accounts!inner (
          platform,
          username,
          account_link
        )
      `)
      .in("campaign_id", campaignIds)
      .eq("status", "active");

    if (!connections || connections.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(connections.map((c) => c.user_id))];

    // Get user profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, email, total_earnings")
      .in("id", userIds);

    // Get analytics data for these users in brand campaigns
    const { data: analytics } = await supabase
      .from("campaign_account_analytics")
      .select("user_id, total_views, paid_views")
      .in("campaign_id", campaignIds)
      .in("user_id", userIds);

    // Aggregate data by user
    const creatorMap = new Map<string, Creator>();

    for (const conn of connections) {
      const userId = conn.user_id;
      const profile = profiles?.find((p) => p.id === userId);
      
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
        });
      }

      const creator = creatorMap.get(userId)!;

      // Add campaign if not already added
      const campaignTitle = campaignMap.get(conn.campaign_id);
      if (campaignTitle && !creator.campaigns.find((c) => c.id === conn.campaign_id)) {
        creator.campaigns.push({ id: conn.campaign_id, title: campaignTitle });
      }

      // Add social account if not already added
      const socialAccount = conn.social_accounts as any;
      if (socialAccount && !creator.social_accounts.find(
        (s) => s.platform === socialAccount.platform && s.username === socialAccount.username
      )) {
        creator.social_accounts.push({
          platform: socialAccount.platform,
          username: socialAccount.username,
          account_link: socialAccount.account_link,
        });
      }
    }

    // Add analytics data
    if (analytics) {
      for (const analytic of analytics) {
        const creator = creatorMap.get(analytic.user_id);
        if (creator) {
          creator.total_views += analytic.total_views || 0;
        }
      }
    }

    // Get earnings from wallet transactions for this brand's campaigns
    const { data: transactions } = await supabase
      .from("wallet_transactions")
      .select("user_id, amount, metadata")
      .eq("type", "earning")
      .in("user_id", userIds);

    if (transactions) {
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

    setCreators(Array.from(creatorMap.values()));
    setLoading(false);
  };

  const filteredCreators = creators.filter((creator) => {
    const query = searchQuery.toLowerCase();
    return (
      creator.username.toLowerCase().includes(query) ||
      creator.full_name?.toLowerCase().includes(query) ||
      creator.email?.toLowerCase().includes(query) ||
      creator.social_accounts.some((s) => s.username.toLowerCase().includes(query))
    );
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Creators</h2>
          <p className="text-sm text-muted-foreground">
            {creators.length} creator{creators.length !== 1 ? "s" : ""} joined your campaigns
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {creators.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No creators yet</h3>
          <p className="text-muted-foreground">
            Creators will appear here once they join your campaigns.
          </p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-xl overflow-hidden bg-card/50 border border-[#e0e0e0] dark:border-[#111111] max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-[#e0e0e0] dark:border-[#111111]">
                  <th className="text-left py-4 px-5 text-xs font-geist tracking-[-0.5px] font-medium text-black dark:text-white">Creator</th>
                  <th className="text-left py-4 px-5 text-xs font-geist tracking-[-0.5px] font-medium text-black dark:text-white">Accounts</th>
                  <th className="text-right py-4 px-5 text-xs font-geist tracking-[-0.5px] font-medium text-black dark:text-white">Views</th>
                  <th className="text-right py-4 px-5 text-xs font-geist tracking-[-0.5px] font-medium text-black dark:text-white">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map((creator) => (
                  <tr
                    key={creator.id}
                    className="hover:bg-[#F4F4F4] dark:hover:bg-[#0a0a0a] transition-colors cursor-pointer"
                    onClick={() => setSelectedCreator(creator)}
                  >
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
                        {creator.social_accounts.slice(0, 3).map((account, idx) => (
                          <Button
                            key={idx}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground rounded-full bg-muted/50 hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (account.account_link) {
                                window.open(account.account_link, "_blank");
                              }
                            }}
                          >
                            <img
                              src={PLATFORM_LOGOS[account.platform.toLowerCase()]}
                              alt={account.platform}
                              className="h-3.5 w-3.5 object-contain"
                            />
                            <span className="text-xs max-w-[80px] truncate">@{account.username}</span>
                          </Button>
                        ))}
                        {creator.social_accounts.length > 3 && (
                          <span className="text-xs text-muted-foreground px-2">
                            +{creator.social_accounts.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <span className="font-semibold tabular-nums text-sm">
                        {formatNumber(creator.total_views)}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <span className="font-semibold tabular-nums text-sm text-green-500">
                        ${creator.total_earnings.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCreators.length === 0 && searchQuery && (
              <div className="p-8 text-center text-muted-foreground">
                No creators found matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden space-y-3">
            {filteredCreators.map((creator) => (
              <div
                key={creator.id}
                className="rounded-xl bg-card/50 p-4 space-y-4 cursor-pointer hover:bg-[#0a0a0a] transition-colors"
                onClick={() => setSelectedCreator(creator)}
              >
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
                  {creator.social_accounts.slice(0, 4).map((account, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground rounded-full bg-muted/50 hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (account.account_link) {
                          window.open(account.account_link, "_blank");
                        }
                      }}
                    >
                      <img
                        src={PLATFORM_LOGOS[account.platform.toLowerCase()]}
                        alt={account.platform}
                        className="h-3.5 w-3.5 object-contain"
                      />
                      <span className="text-xs">@{account.username}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            {filteredCreators.length === 0 && searchQuery && (
              <div className="p-8 text-center text-muted-foreground rounded-xl bg-card/50">
                No creators found matching "{searchQuery}"
              </div>
            )}
          </div>
        </>
      )}

      {/* Creator Detail Dialog */}
      <Dialog open={!!selectedCreator} onOpenChange={(open) => !open && setSelectedCreator(null)}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-[#0a0a0a] border-border">
          {selectedCreator && (
            <>
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
                    {selectedCreator.email && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{selectedCreator.email}</span>
                      </div>
                    )}
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
                    {selectedCreator.social_accounts.map((account, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl bg-muted dark:bg-[#141414] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={PLATFORM_LOGOS[account.platform.toLowerCase()]}
                            alt={account.platform}
                            className="h-5 w-5 object-contain"
                          />
                          <div>
                            <p className="text-sm font-medium">@{account.username}</p>
                            <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                          </div>
                        </div>
                        {account.account_link && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => window.open(account.account_link!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campaigns */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Joined Campaigns</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCreator.campaigns.map((campaign) => (
                      <span
                        key={campaign.id}
                        className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium"
                      >
                        {campaign.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
