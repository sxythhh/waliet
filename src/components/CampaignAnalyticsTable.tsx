import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, TrendingUp, Eye, Heart, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, User, Trash2, Filter, DollarSign, AlertTriangle, Clock, CheckCircle, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";

interface DemographicSubmission {
  id: string;
  status: string;
  submitted_at: string;
  tier1_percentage: number;
  score: number | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
}

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
  paid_views: number;
  last_payment_amount: number;
  last_payment_date: string | null;
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
  social_account?: SocialAccount | null;
  demographic_submission?: DemographicSubmission | null;
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
  const [showLinkedOnly, setShowLinkedOnly] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AnalyticsData | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [campaignRPM, setCampaignRPM] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchAnalytics();
    fetchCampaignRPM();
  }, [campaignId]);

  const fetchCampaignRPM = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("rpm_rate")
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      setCampaignRPM(data?.rpm_rate || 0);
    } catch (error) {
      console.error("Error fetching campaign RPM:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_account_analytics")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("total_views", { ascending: false });

      if (error) throw error;
      
      // Manually fetch user profiles and demographic submissions for accounts with user_id
      const analyticsWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          if (item.user_id) {
            // Fetch profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", item.user_id)
              .single();
            
            // Fetch social account for this platform (check campaign-specific first, then any)
            let { data: socialAccount } = await supabase
              .from("social_accounts")
              .select("id, platform, username")
              .eq("user_id", item.user_id)
              .eq("platform", item.platform)
              .eq("campaign_id", campaignId)
              .maybeSingle();
            
            // If no campaign-specific account found, try to find any social account for this user/platform
            if (!socialAccount) {
              const { data: generalAccount } = await supabase
                .from("social_accounts")
                .select("id, platform, username")
                .eq("user_id", item.user_id)
                .eq("platform", item.platform)
                .ilike("username", item.account_username.replace('@', ''))
                .maybeSingle();
              
              socialAccount = generalAccount;
            }
            
            let demographicSubmission = null;
            if (socialAccount) {
              // Fetch most recent demographic submission for this social account
              const { data: submission } = await supabase
                .from("demographic_submissions")
                .select("id, status, submitted_at, tier1_percentage, score")
                .eq("social_account_id", socialAccount.id)
                .order("submitted_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              
              demographicSubmission = submission;
            }
            
            return { 
              ...item, 
              profiles: profile,
              social_account: socialAccount,
              demographic_submission: demographicSubmission
            };
          }
          return { ...item, profiles: null, social_account: null, demographic_submission: null };
        })
      );
      
      setAnalytics(analyticsWithProfiles);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDemographicStatus = (item: AnalyticsData): 'none' | 'pending' | 'approved' | 'outdated' => {
    if (!item.demographic_submission) return 'none';
    
    const submission = item.demographic_submission;
    const submittedDate = new Date(submission.submitted_at);
    const daysSinceSubmission = Math.floor((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If older than 7 days, needs resubmission
    if (daysSinceSubmission > 7) return 'outdated';
    
    // If pending review
    if (submission.status === 'pending') return 'pending';
    
    // If approved and within 7 days
    if (submission.status === 'approved') return 'approved';
    
    return 'none';
  };

  const getDemographicIcon = (status: 'none' | 'pending' | 'approved' | 'outdated') => {
    switch (status) {
      case 'none':
        return <AlertTriangle className="h-3 w-3 text-red-400" />;
      case 'outdated':
        return <AlertTriangle className="h-3 w-3 text-red-400" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-400" />;
      case 'approved':
        return <CheckCircle className="h-3 w-3 text-blue-400" />;
    }
  };

  const getDemographicTooltip = (status: 'none' | 'pending' | 'approved' | 'outdated', submission?: DemographicSubmission | null) => {
    switch (status) {
      case 'none':
        return 'No demographics submitted';
      case 'outdated':
        return 'Demographics outdated (>7 days) - resubmission required';
      case 'pending':
        return 'Demographics pending admin review';
      case 'approved':
        return submission ? `Demographics approved - ${submission.tier1_percentage}% Tier 1` : 'Demographics approved';
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

  const calculatePayout = (user: AnalyticsData) => {
    const views = user.total_views;
    const rpm = campaignRPM;
    
    // Get demographic percentage
    let demographicMultiplier = 0.4; // Default if no submission
    if (user.demographic_submission?.status === 'approved' && user.demographic_submission.tier1_percentage) {
      demographicMultiplier = user.demographic_submission.tier1_percentage / 100;
    }
    
    // Calculate: (views / 1000) * RPM * demographic%
    const payout = (views / 1000) * rpm * demographicMultiplier;
    
    return {
      payout: payout,
      views: views,
      rpm: rpm,
      demographicMultiplier: demographicMultiplier,
      demographicPercentage: demographicMultiplier * 100
    };
  };

  const handlePayUser = async () => {
    if (!selectedUser?.user_id) {
      toast.error("No user selected");
      return;
    }

    // Use custom amount if provided, otherwise use calculated payout
    const amount = paymentAmount 
      ? parseFloat(paymentAmount) 
      : calculatePayout(selectedUser).payout;

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      // Create wallet transaction
      const { error: transactionError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: selectedUser.user_id,
          amount: amount,
          type: "earning",
          description: `Payment for ${selectedUser.platform} account @${selectedUser.account_username}`,
          status: "completed",
          metadata: {
            campaign_id: campaignId,
            analytics_id: selectedUser.id,
            views_paid: selectedUser.total_views
          }
        });

      if (transactionError) throw transactionError;

      // Update analytics record with payment info
      const { error: analyticsError } = await supabase
        .from("campaign_account_analytics")
        .update({
          paid_views: selectedUser.total_views,
          last_payment_amount: amount,
          last_payment_date: new Date().toISOString()
        })
        .eq("id", selectedUser.id);

      if (analyticsError) throw analyticsError;

      toast.success(`Payment of $${amount.toFixed(2)} sent successfully`);
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedUser(null);
      
      // Refresh analytics to show updated payment status
      fetchAnalytics();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    }
  };

  const filteredAnalytics = analytics.filter(item => {
    const matchesSearch = item.account_username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === "all" || item.platform === platformFilter;
    const matchesLinkedFilter = !showLinkedOnly || item.user_id !== null;
    return matchesSearch && matchesPlatform && matchesLinkedFilter;
  }).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    return (aValue > bValue ? 1 : -1) * modifier;
  });

  const totalPages = Math.ceil(filteredAnalytics.length / itemsPerPage);
  const paginatedAnalytics = filteredAnalytics.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Card className="bg-[#202020] border-transparent">
            <CardHeader className="pb-1 pt-2 px-3">
              <CardTitle className="text-xs text-white/60 font-normal flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3" />
                <span className="truncate">Accounts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2">
              <div className="text-lg font-bold text-white">{analytics.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-transparent">
            <CardHeader className="pb-1 pt-2 px-3">
              <CardTitle className="text-xs text-white/60 font-normal flex items-center gap-1.5">
                <Eye className="h-3 w-3" />
                <span className="truncate">Views</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2">
              <div className="text-lg font-bold text-white">{totalViews.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-transparent">
            <CardHeader className="pb-1 pt-2 px-3">
              <CardTitle className="text-xs text-white/60 font-normal flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                <span className="truncate">Videos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2">
              <div className="text-lg font-bold text-white">{totalVideos.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-transparent">
            <CardHeader className="pb-1 pt-2 px-3">
              <CardTitle className="text-xs text-white/60 font-normal flex items-center gap-1.5">
                <Heart className="h-3 w-3" />
                <span className="truncate">Avg Eng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2">
              <div className="text-lg font-bold text-white">{avgEngagement.toFixed(2)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card className="bg-[#202020] border-transparent">
          <CardHeader className="px-3 py-3">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <CardTitle className="text-white text-sm">Account Analytics</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-40">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-white/40" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 h-8 bg-[#191919] border-white/10 text-white text-xs"
                  />
                </div>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-full sm:w-28 h-8 bg-[#191919] border-white/10 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-white/10">
                    <SelectItem value="all" className="text-white text-sm">All</SelectItem>
                    {platforms.map(platform => (
                      <SelectItem key={platform} value={platform} className="text-white capitalize text-sm">
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={showLinkedOnly ? "default" : "outline"}
                  onClick={() => setShowLinkedOnly(!showLinkedOnly)}
                  size="sm"
                  className={`h-8 text-sm ${showLinkedOnly ? "bg-primary" : "bg-[#191919] border-white/10 text-white hover:bg-white/10"}`}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Linked
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60 font-medium text-sm sticky left-0 bg-[#202020] z-10 py-3">Account</TableHead>
                    <TableHead className="text-white/60 font-medium text-sm py-3">User</TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-sm whitespace-nowrap py-3"
                      onClick={() => handleSort('total_videos')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Vids
                        {sortField === 'total_videos' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-sm whitespace-nowrap py-3"
                      onClick={() => handleSort('total_views')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Views
                        {sortField === 'total_views' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-sm whitespace-nowrap hidden lg:table-cell py-3"
                      onClick={() => handleSort('average_video_views')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Avg
                        {sortField === 'average_video_views' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-sm whitespace-nowrap hidden md:table-cell py-3"
                      onClick={() => handleSort('total_likes')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Likes
                        {sortField === 'total_likes' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-sm whitespace-nowrap hidden xl:table-cell py-3"
                      onClick={() => handleSort('total_comments')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Comm
                        {sortField === 'total_comments' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-sm whitespace-nowrap py-3"
                      onClick={() => handleSort('average_engagement_rate')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Eng
                        {sortField === 'average_engagement_rate' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-sm whitespace-nowrap hidden md:table-cell py-3"
                      onClick={() => handleSort('outperforming_video_rate')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Out
                        {sortField === 'outperforming_video_rate' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-white/60 font-medium text-sm w-8 py-3"></TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {paginatedAnalytics.map((item) => {
                  const platformIcon = getPlatformIcon(item.platform);
                  const username = item.account_username.startsWith('@') 
                    ? item.account_username.slice(1) 
                    : item.account_username;
                  
                  return (
                    <TableRow key={item.id} className="border-white/5 hover:bg-transparent">
                      <TableCell className="py-3 sticky left-0 bg-[#202020] z-10">
                        <div className="flex items-center gap-2">
                          {platformIcon && (
                            <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-0.5">
                              <img 
                                src={platformIcon} 
                                alt={item.platform}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            {item.account_link ? (
                              <a
                                href={item.account_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  window.open(item.account_link!, '_blank', 'noopener,noreferrer');
                                }}
                                className="text-white hover:underline transition-all font-medium cursor-pointer text-sm truncate max-w-[150px]"
                              >
                                {username}
                              </a>
                            ) : (
                              <span className="text-white font-medium text-sm truncate max-w-[150px]">{username}</span>
                            )}
                            
                            {/* Demographic Status Icon */}
                            {item.user_id && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex-shrink-0">
                                      {getDemographicIcon(getDemographicStatus(item))}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-[#2a2a2a] border-white/10 text-white">
                                    <p className="text-sm">{getDemographicTooltip(getDemographicStatus(item), item.demographic_submission)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell 
                        className="py-3 bg-[#202020] cursor-pointer transition-colors"
                        onClick={() => {
                          if (item.user_id && item.profiles) {
                            setSelectedUser(item);
                            setPaymentDialogOpen(true);
                          }
                        }}
                      >
                        {item.user_id && item.profiles ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={item.profiles.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                                {item.profiles.username?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white/80 text-sm truncate max-w-[90px] hover:underline">{item.profiles.username}</span>
                            {item.paid_views >= item.total_views && item.paid_views > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex-shrink-0">
                                      <Check className="h-3 w-3 text-green-400" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-[#2a2a2a] border-white/10 text-white">
                                    <p className="text-sm">Paid ${item.last_payment_amount.toFixed(2)} on {new Date(item.last_payment_date!).toLocaleDateString()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/30 text-sm flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">—</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-sm bg-[#202020] py-3">
                        {item.total_videos.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white text-right font-semibold text-sm bg-[#202020] py-3">
                        {item.total_views.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-sm hidden lg:table-cell bg-[#202020] py-3">
                        {Math.round(item.average_video_views).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-sm hidden md:table-cell bg-[#202020] py-3">
                        {item.total_likes.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-right font-mono text-sm hidden xl:table-cell bg-[#202020] py-3">
                        {item.total_comments.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right bg-[#202020] py-3">
                        <span className={`font-semibold text-sm ${
                          item.average_engagement_rate > 5 
                            ? "text-emerald-400" 
                            : item.average_engagement_rate > 3
                            ? "text-white"
                            : "text-white/60"
                        }`}>
                          {item.average_engagement_rate.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell bg-[#202020] py-3">
                        {item.outperforming_video_rate > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
                            {item.outperforming_video_rate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-white/30 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 bg-[#202020]">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteAccountId(item.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <span className="px-4 text-white/40">...</span>
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
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

    {/* Payment Dialog */}
    <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
      <DialogContent className="bg-[#202020] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Pay User
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Send payment to user for their campaign performance
          </DialogDescription>
        </DialogHeader>
        
        {selectedUser && (
          <div className="space-y-4 py-4">
            {/* User Info Card */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg">
                    {selectedUser.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-white text-lg">@{selectedUser.profiles?.username}</div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const platformIcon = getPlatformIcon(selectedUser.platform);
                      return platformIcon && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
                          <img src={platformIcon} alt={selectedUser.platform} className="w-3 h-3" />
                          <span className="text-xs text-white/80 capitalize">{selectedUser.platform}</span>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10">
                      <span className="text-xs text-white/60">@{selectedUser.account_username}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demographic Status */}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60 font-medium">Demographics Status</span>
                  <div className="flex items-center gap-2">
                    {getDemographicIcon(getDemographicStatus(selectedUser))}
                    <span className="text-xs text-white/80">
                      {(() => {
                        const status = getDemographicStatus(selectedUser);
                        const submission = selectedUser.demographic_submission;
                        
                        switch (status) {
                          case 'none':
                            return 'No submission';
                          case 'outdated':
                            return submission ? `Outdated (${Math.floor((Date.now() - new Date(submission.submitted_at).getTime()) / (1000 * 60 * 60 * 24))} days ago)` : 'Outdated';
                          case 'pending':
                            return 'Pending review';
                          case 'approved':
                            return submission ? `${submission.tier1_percentage}% Tier 1` : 'Approved';
                        }
                      })()}
                    </span>
                  </div>
                </div>
                
                {selectedUser.demographic_submission && (
                  <div className="mt-2 text-xs text-white/40">
                    Last submitted: {new Date(selectedUser.demographic_submission.submitted_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    {selectedUser.demographic_submission.score !== null && (
                      <span className="ml-2">• Score: {selectedUser.demographic_submission.score}/100</span>
                    )}
                  </div>
                )}
                
                {!selectedUser.demographic_submission && (
                  <div className="mt-2 text-xs text-red-400/80">
                    ⚠️ User has never submitted demographics
                  </div>
                )}
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Total Views</div>
                <div className="text-lg font-semibold text-white">
                  {selectedUser.total_views.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Videos</div>
                <div className="text-lg font-semibold text-white">
                  {selectedUser.total_videos.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Payment Status */}
            {selectedUser.paid_views > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Last Payment</span>
                </div>
                <div className="text-xs text-white/60 space-y-1">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="text-white font-semibold">${selectedUser.last_payment_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Views Paid:</span>
                    <span className="text-white">{selectedUser.paid_views.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="text-white">{new Date(selectedUser.last_payment_date!).toLocaleDateString()}</span>
                  </div>
                  {selectedUser.total_views > selectedUser.paid_views && (
                    <div className="flex justify-between pt-2 border-t border-green-500/20">
                      <span className="text-yellow-400">New Unpaid Views:</span>
                      <span className="text-yellow-400 font-semibold">
                        {(selectedUser.total_views - selectedUser.paid_views).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payout Calculation */}
            <div className="space-y-3">
              <div className="p-2">
                <div className="text-sm font-medium text-white mb-2">Calculated Payout</div>
                
                {(() => {
                  const calc = calculatePayout(selectedUser);
                  return (
                    <>
                      <div className="space-y-2 text-xs text-white/60 mb-3">
                        <div className="flex justify-between">
                          <span>Views:</span>
                          <span className="text-white font-mono">{calc.views.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>RPM Rate:</span>
                          <span className="text-white font-mono">${calc.rpm.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Demographic %:</span>
                          <span className={`font-mono ${calc.demographicMultiplier === 0.4 ? 'text-yellow-400' : 'text-white'}`}>
                            {calc.demographicPercentage.toFixed(0)}% 
                            {calc.demographicMultiplier === 0.4 && ' (default)'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-2xl font-bold text-white text-center py-2">
                        ${calc.payout.toFixed(2)}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Manual Override */}
              <div className="space-y-2">
                <Label htmlFor="payment-amount" className="text-white text-sm">
                  Custom Amount (Optional)
                </Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Leave empty to use calculated amount"
                  className="bg-[#191919] border-white/10 text-white"
                />
                <p className="text-xs text-white/40">
                  Override the calculated amount if needed
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setPaymentDialogOpen(false);
              setPaymentAmount("");
              setSelectedUser(null);
            }}
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
          >
            Cancel
          </Button>
              <Button
                onClick={() => {
                  handlePayUser();
                }}
                className="bg-primary hover:bg-primary/90"
                disabled={selectedUser && selectedUser.paid_views >= selectedUser.total_views}
              >
                {selectedUser && selectedUser.paid_views >= selectedUser.total_views 
                  ? "Already Paid" 
                  : "Send Payment"}
              </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
