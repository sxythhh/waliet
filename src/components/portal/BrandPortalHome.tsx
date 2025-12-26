import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Eye, DollarSign, Video, ArrowRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
}

interface BrandPortalHomeProps {
  brand: Brand;
  userId: string;
}

interface Stats {
  totalEarnings: number;
  totalViews: number;
  totalVideos: number;
  pendingPayouts: number;
}

interface RecentActivity {
  id: string;
  type: "video" | "payout";
  title: string;
  amount?: number;
  views?: number;
  date: string;
}

export function BrandPortalHome({ brand, userId }: BrandPortalHomeProps) {
  const [, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const accentColor = brand.brand_color || "#2061de";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch campaigns for this brand
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("brand_id", brand.id);

      const campaignIds = campaigns?.map(c => c.id) || [];

      // Fetch bounty campaigns for this brand
      const { data: boostCampaigns } = await supabase
        .from("bounty_campaigns")
        .select("id")
        .eq("brand_id", brand.id);

      const boostIds = boostCampaigns?.map(c => c.id) || [];

      // Fetch video stats from campaigns
      let totalViews = 0;
      let totalVideos = 0;

      if (campaignIds.length > 0) {
        const { data: videos } = await supabase
          .from("campaign_videos")
          .select("video_views")
          .eq("creator_id", userId)
          .in("campaign_id", campaignIds);

        if (videos) {
          totalVideos += videos.length;
          totalViews += videos.reduce((sum, v) => sum + (v.video_views || 0), 0);
        }
      }

      if (boostIds.length > 0) {
        const { data: boostVideos } = await supabase
          .from("boost_video_submissions")
          .select("id")
          .eq("user_id", userId)
          .in("bounty_campaign_id", boostIds);

        if (boostVideos) {
          totalVideos += boostVideos.length;
        }
      }

      // Fetch earnings for this brand from brand_wallet_transactions
      const { data: walletTransactions } = await supabase
        .from("brand_wallet_transactions")
        .select("amount, status, created_at, description")
        .eq("brand_id", brand.id);

      const totalEarnings = (walletTransactions || [])
        .filter(t => t.status === "completed")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const pendingPayouts = (walletTransactions || [])
        .filter(t => t.status === "pending")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      setStats({
        totalEarnings,
        totalViews,
        totalVideos,
        pendingPayouts,
      });

      // Create recent activity from transactions
      const activity: RecentActivity[] = (walletTransactions || [])
        .slice(0, 5)
        .map(t => ({
          id: t.created_at || crypto.randomUUID(),
          type: "payout" as const,
          title: t.description || "Payment",
          amount: t.amount || 0,
          date: t.created_at || new Date().toISOString(),
        }));

      setRecentActivity(activity);
      setLoading(false);
    };

    fetchData();
  }, [brand.id, userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback 
              className="text-lg font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {profile?.username?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {profile?.username || "Creator"}!
            </h1>
            <p className="text-gray-500">
              Here's your performance summary with {brand.name}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${stats?.totalEarnings?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <DollarSign className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Views</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.totalViews?.toLocaleString() || "0"}
                </p>
              </div>
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <Eye className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Videos Submitted</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.totalVideos || 0}
                </p>
              </div>
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <Video className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pending Payouts</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${stats?.pendingPayouts?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <TrendingUp className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => setSearchParams({ tab: "campaigns" })}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Briefcase className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Campaigns</p>
                  <p className="text-sm text-gray-500">Browse available campaigns</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>

            <button
              onClick={() => setSearchParams({ tab: "earnings" })}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Wallet className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Earnings</p>
                  <p className="text-sm text-gray-500">Check your payment history</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>

            <button
              onClick={() => setSearchParams({ tab: "submissions" })}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Video className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">My Submissions</p>
                  <p className="text-sm text-gray-500">Track your video submissions</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${accentColor}15` }}
                      >
                        {activity.type === "payout" ? (
                          <DollarSign className="h-4 w-4" style={{ color: accentColor }} />
                        ) : (
                          <Video className="h-4 w-4" style={{ color: accentColor }} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(activity.date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    {activity.amount && (
                      <Badge 
                        variant="outline" 
                        className="border-0 font-medium"
                        style={{ 
                          backgroundColor: `${accentColor}15`,
                          color: accentColor 
                        }}
                      >
                        +${activity.amount.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Import missing icons
import { Briefcase, Wallet } from "lucide-react";
