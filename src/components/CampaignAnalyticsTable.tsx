import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, TrendingUp, Eye, Heart, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, User, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  user_id: string | null;
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
}

interface CampaignAnalyticsTableProps {
  campaignId: string;
}

type SortField = 'total_videos' | 'total_views' | 'average_video_views' | 'total_likes' | 'total_comments' | 'average_engagement_rate' | 'outperforming_video_rate';
type SortDirection = 'asc' | 'desc';

export function CampaignAnalyticsTable({ campaignId }: CampaignAnalyticsTableProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('total_views');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
      
      // Manually fetch user profiles for accounts with user_id
      const analyticsWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          if (item.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", item.user_id)
              .single();
            
            return { ...item, profiles: profile };
          }
          return { ...item, profiles: null };
        })
      );
      
      setAnalytics(analyticsWithProfiles);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccountId) return;
    
    try {
      const { error } = await supabase
        .from('campaign_account_analytics')
        .delete()
        .eq('id', deleteAccountId);
      
      if (error) throw error;
      
      toast.success('Account analytics deleted');
      setDeleteDialogOpen(false);
      setDeleteAccountId(null);
      fetchAnalytics();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account analytics');
    }
  };

  const filteredAnalytics = analytics.filter(item => {
    const matchesSearch = item.account_username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === "all" || item.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  }).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    return (aValue > bValue ? 1 : -1) * modifier;
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
    <>
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-[#202020] border-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm text-white/60 font-normal flex items-center gap-2">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate">Total Accounts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-white">{analytics.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm text-white/60 font-normal flex items-center gap-2">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate">Total Views</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-white">{totalViews.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm text-white/60 font-normal flex items-center gap-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate">Total Videos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-white">{totalVideos.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm text-white/60 font-normal flex items-center gap-2">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate">Avg Engagement</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-white">{avgEngagement.toFixed(2)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card className="bg-[#202020] border-transparent">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle className="text-white text-base sm:text-lg">Account Analytics</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-[#191919] border-white/10 text-white text-sm"
                  />
                </div>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-full sm:w-36 bg-[#191919] border-white/10 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-white/10">
                    <SelectItem value="all" className="text-white text-sm">All Platforms</SelectItem>
                    {platforms.map(platform => (
                      <SelectItem key={platform} value={platform} className="text-white capitalize text-sm">
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">{/* Removed padding */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60 font-medium text-xs sm:text-sm sticky left-0 bg-[#202020] z-10">Account</TableHead>
                    <TableHead className="text-white/60 font-medium text-xs sm:text-sm">User</TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap"
                      onClick={() => handleSort('total_videos')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className="hidden sm:inline">Videos</span>
                        <span className="sm:hidden">Vids</span>
                        {sortField === 'total_videos' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap"
                      onClick={() => handleSort('total_views')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Views
                        {sortField === 'total_views' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap hidden lg:table-cell"
                      onClick={() => handleSort('average_video_views')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Avg Views
                        {sortField === 'average_video_views' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap hidden md:table-cell"
                      onClick={() => handleSort('total_likes')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Likes
                        {sortField === 'total_likes' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap hidden xl:table-cell"
                      onClick={() => handleSort('total_comments')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Comments
                        {sortField === 'total_comments' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap"
                      onClick={() => handleSort('average_engagement_rate')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className="hidden sm:inline">Engagement</span>
                        <span className="sm:hidden">Eng</span>
                        {sortField === 'average_engagement_rate' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap hidden md:table-cell"
                      onClick={() => handleSort('outperforming_video_rate')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Outperform
                        {sortField === 'outperforming_video_rate' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-white/60 font-medium text-xs sm:text-sm w-10"></TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredAnalytics.map((item) => {
                  const platformIcon = getPlatformIcon(item.platform);
                  const username = item.account_username.startsWith('@') 
                    ? item.account_username.slice(1) 
                    : item.account_username;
                  
                  return (
                    <TableRow key={item.id} className="border-white/5 hover:bg-transparent">{/* Explicitly disable hover */}
                      <TableCell className="py-3 sm:py-4 sticky left-0 bg-[#202020] z-10">{/* Sticky for mobile */}
                        <div className="flex items-center gap-2 sm:gap-3">{/* Reduced gap on mobile */}
                          {platformIcon && (
                            <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1 sm:p-1.5">
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
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(item.account_link!, '_blank', 'noopener,noreferrer');
                              }}
                              className="text-white hover:text-primary hover:underline transition-all font-medium cursor-pointer text-sm sm:text-base truncate max-w-[150px] sm:max-w-none"
                            >
                              {username}
                            </a>
                          ) : (
                            <span className="text-white font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{username}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 sm:py-4">
                        {item.user_id && item.profiles ? (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                              <AvatarImage src={item.profiles.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-[10px] sm:text-xs">
                                {item.profiles.username?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white/80 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">@{item.profiles.username}</span>
                          </div>
                        ) : (
                          <span className="text-white/30 text-xs sm:text-sm flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="hidden sm:inline">Not linked</span>
                            <span className="sm:hidden">—</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-xs sm:text-sm">
                        {item.total_videos.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white text-right font-semibold text-xs sm:text-sm">
                        {item.total_views.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-xs sm:text-sm hidden lg:table-cell">
                        {Math.round(item.average_video_views).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-xs sm:text-sm hidden md:table-cell">
                        {item.total_likes.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-xs sm:text-sm hidden xl:table-cell">
                        {item.total_comments.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold text-xs sm:text-sm ${
                          item.average_engagement_rate > 5 
                            ? "text-emerald-400" 
                            : item.average_engagement_rate > 3
                            ? "text-white"
                            : "text-white/60"
                        }`}>
                          {item.average_engagement_rate.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {item.outperforming_video_rate > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-semibold">
                            {item.outperforming_video_rate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-white/30 text-xs sm:text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteAccountId(item.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent className="bg-[#202020] border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account Analytics</AlertDialogTitle>
          <AlertDialogDescription className="text-white/60">
            Are you sure you want to delete this account's analytics data? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/10">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
