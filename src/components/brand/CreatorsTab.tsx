import { useState, useEffect } from "react";
import { Search, ExternalLink, Users, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Creator</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Accounts</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Campaigns</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Views</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map((creator) => (
                  <tr
                    key={creator.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    {/* Creator Info */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
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
                    </td>

                    {/* Social Accounts */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {creator.social_accounts.slice(0, 3).map((account, idx) => (
                          <Button
                            key={idx}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              if (account.account_link) {
                                window.open(account.account_link, "_blank");
                              }
                            }}
                          >
                            <img
                              src={PLATFORM_LOGOS[account.platform.toLowerCase()]}
                              alt={account.platform}
                              className="h-4 w-4 object-contain"
                            />
                            <span className="text-xs">@{account.username}</span>
                            {account.account_link && (
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            )}
                          </Button>
                        ))}
                        {creator.social_accounts.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{creator.social_accounts.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Campaigns */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {creator.campaigns.slice(0, 2).map((campaign) => (
                          <Badge
                            key={campaign.id}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {campaign.title}
                          </Badge>
                        ))}
                        {creator.campaigns.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{creator.campaigns.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Views */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium tabular-nums">
                          {formatNumber(creator.total_views)}
                        </span>
                      </div>
                    </td>

                    {/* Earnings */}
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold tabular-nums text-green-500">
                        ${creator.total_earnings.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCreators.length === 0 && searchQuery && (
            <div className="p-8 text-center text-muted-foreground">
              No creators found matching "{searchQuery}"
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
