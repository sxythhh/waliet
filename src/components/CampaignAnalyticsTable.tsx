import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, TrendingUp, Eye, Heart, BarChart3 } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";

interface AnalyticsData {
  id: string;
  account_username: string;
  account_link: string | null;
  platform: string;
  outperforming_video_rate: number;
  total_videos: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  average_engagement_rate: number;
  average_video_views: number;
  posts_last_7_days: any;
  last_tracked: string | null;
  amount_of_videos_tracked: string | null;
}

interface CampaignAnalyticsTableProps {
  campaignId: string;
}

export function CampaignAnalyticsTable({ campaignId }: CampaignAnalyticsTableProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  useEffect(() => {
    fetchAnalytics();
  }, [campaignId]);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_account_analytics")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("total_views", { ascending: false });

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnalytics = analytics.filter(item => {
    const matchesSearch = item.account_username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === "all" || item.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const platforms = Array.from(new Set(analytics.map(a => a.platform)));

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return tiktokLogo;
      case 'instagram':
        return instagramLogo;
      case 'youtube':
        return youtubeLogo;
      default:
        return null;
    }
  };

  const totalViews = analytics.reduce((sum, a) => sum + a.total_views, 0);
  const totalVideos = analytics.reduce((sum, a) => sum + a.total_videos, 0);
  const avgEngagement = analytics.length > 0 
    ? analytics.reduce((sum, a) => sum + a.average_engagement_rate, 0) / analytics.length 
    : 0;

  if (loading) {
    return (
      <Card className="bg-[#202020] border-transparent">
        <CardContent className="p-8">
          <div className="text-center text-white/60">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (analytics.length === 0) {
    return (
      <Card className="bg-[#202020] border-transparent">
        <CardContent className="p-8">
          <div className="text-center text-white/60">
            No analytics data available. Import a CSV file to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#202020] border-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 font-normal flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#202020] border-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 font-normal flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#202020] border-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 font-normal flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalVideos.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#202020] border-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 font-normal flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Avg Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{avgEngagement.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card className="bg-[#202020] border-transparent">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="text-white">Account Analytics</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#191919] border-white/10 text-white"
                />
              </div>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-[#191919] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-white/10">
                  <SelectItem value="all" className="text-white">All Platforms</SelectItem>
                  {platforms.map(platform => (
                    <SelectItem key={platform} value={platform} className="text-white capitalize">
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60 font-medium">Account</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Videos</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Views</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Avg Views</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Likes</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Comments</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Engagement</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Outperform</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnalytics.map((item) => {
                  const platformIcon = getPlatformIcon(item.platform);
                  const username = item.account_username.startsWith('@') 
                    ? item.account_username.slice(1) 
                    : item.account_username;
                  
                  return (
                    <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          {platformIcon && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1.5">
                              <img 
                                src={platformIcon} 
                                alt={item.platform}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          {item.account_link ? (
                            <a
                              href={item.account_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white hover:text-primary transition-colors font-medium"
                            >
                              {username}
                            </a>
                          ) : (
                            <span className="text-white font-medium">{username}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-sm">
                        {item.total_videos.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white text-right font-semibold">
                        {item.total_views.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-sm">
                        {Math.round(item.average_video_views).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-sm">
                        {item.total_likes.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-sm">
                        {item.total_comments.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          item.average_engagement_rate > 5 
                            ? "text-emerald-400" 
                            : item.average_engagement_rate > 3
                            ? "text-white"
                            : "text-white/60"
                        }`}>
                          {item.average_engagement_rate.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.outperforming_video_rate > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
                            {item.outperforming_video_rate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-white/30 text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredAnalytics.length === 0 && (
            <div className="text-center py-12 text-white/40">
              No accounts match your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
