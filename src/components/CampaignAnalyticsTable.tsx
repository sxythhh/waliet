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
import { Search, TrendingUp, Eye, Heart, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, User, Trash2, Filter, DollarSign, AlertTriangle, Clock, CheckCircle, Check, Link2, Receipt, Plus, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { ShortimizeTrackAccountDialog } from "./ShortimizeTrackAccountDialog";
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
  start_date: string | null;
  end_date: string | null;
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
  social_account?: SocialAccount | null;
  demographic_submission?: DemographicSubmission | null;
}
interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  created_at: string;
  metadata: any;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}
interface CampaignAnalyticsTableProps {
  campaignId: string;
  onPaymentComplete?: () => void;
}
type SortField = 'total_views' | 'average_video_views' | 'average_engagement_rate' | 'outperforming_video_rate';
type SortDirection = 'asc' | 'desc';
export function CampaignAnalyticsTable({
  campaignId,
  onPaymentComplete
}: CampaignAnalyticsTableProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('total_views');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showLinkedOnly, setShowLinkedOnly] = useState(false);
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AnalyticsData | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [campaignRPM, setCampaignRPM] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [linkAccountDialogOpen, setLinkAccountDialogOpen] = useState(false);
  const [selectedAnalyticsAccount, setSelectedAnalyticsAccount] = useState<AnalyticsData | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [availableUsers, setAvailableUsers] = useState<Array<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    platform: string;
    account_username: string;
  }>>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [dateRanges, setDateRanges] = useState<Array<{
    start: string;
    end: string;
  }>>([]);
  const [trackAccountDialogOpen, setTrackAccountDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [revertingTransaction, setRevertingTransaction] = useState(false);
  const itemsPerPage = 20;
  useEffect(() => {
    fetchAnalytics();
    fetchCampaignRPM();
    fetchTransactions();

    // Set up real-time subscription for demographic submissions
    const demographicChannel = supabase
      .channel('demographic-submissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demographic_submissions'
        },
        (payload) => {
          console.log('Demographic submission changed:', payload);
          fetchAnalytics(); // Refresh analytics when demographics change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(demographicChannel);
    };
  }, [campaignId]);
  const fetchCampaignRPM = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("campaigns").select("rpm_rate").eq("id", campaignId).single();
      if (error) throw error;
      setCampaignRPM(data?.rpm_rate || 0);
    } catch (error) {
      console.error("Error fetching campaign RPM:", error);
    }
  };
  const fetchAnalytics = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("campaign_account_analytics").select("*").eq("campaign_id", campaignId).order("total_views", {
        ascending: false
      });
      if (error) throw error;

      // Extract unique date ranges
      const uniqueRanges = Array.from(new Set((data || []).filter(item => item.start_date && item.end_date).map(item => `${item.start_date}|${item.end_date}`))).map(range => {
        const [start, end] = range.split('|');
        return {
          start,
          end
        };
      }).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
      setDateRanges(uniqueRanges);

      // Manually fetch user profiles and demographic submissions for accounts with user_id
      const analyticsWithProfiles = await Promise.all((data || []).map(async item => {
        if (item.user_id) {
          // Fetch profile
          const {
            data: profile
          } = await supabase.from("profiles").select("username, avatar_url").eq("id", item.user_id).single();

          // Fetch social account for this platform connected to this campaign that matches the username
          let { data: socialAccount } = await supabase
            .from("social_account_campaigns")
            .select(`
              social_accounts!inner (
                id,
                platform,
                username
              )
            `)
            .eq("campaign_id", campaignId)
            .eq("social_accounts.user_id", item.user_id)
            .eq("social_accounts.platform", item.platform)
            .ilike("social_accounts.username", item.account_username)
            .maybeSingle();

          // Extract the social account from the nested structure
          const account = (socialAccount as any)?.social_accounts;
          let demographicSubmission = null;
          if (account) {
            // Fetch most recent demographic submission for this social account
            const {
              data: submission
            } = await supabase.from("demographic_submissions").select("id, status, submitted_at, tier1_percentage, score").eq("social_account_id", account.id).order("submitted_at", {
              ascending: false
            }).limit(1).maybeSingle();
            demographicSubmission = submission;
          }
          return {
            ...item,
            profiles: profile,
            social_account: account,
            demographic_submission: demographicSubmission
          };
        }
        return {
          ...item,
          profiles: null,
          social_account: null,
          demographic_submission: null
        };
      }));
      setAnalytics(analyticsWithProfiles);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchAvailableUsers = async (accountPlatform: string) => {
    try {
      // Get all users who have APPROVED submissions for this campaign
      const {
        data: approvedSubmissions,
        error: submissionsError
      } = await supabase
        .from('campaign_submissions')
        .select('creator_id')
        .eq('campaign_id', campaignId)
        .eq('status', 'approved');
      
      if (submissionsError) throw submissionsError;
      
      const approvedUserIds = approvedSubmissions?.map(s => s.creator_id) || [];
      
      if (approvedUserIds.length === 0) {
        setAvailableUsers([]);
        return;
      }
      
      // Get social accounts for approved users that are connected to this campaign
      const {
        data: campaignAccounts,
        error
      } = await supabase.from('social_account_campaigns').select(`
          social_accounts!inner (
            id,
            user_id,
            platform,
            username,
            follower_count,
            account_link
          )
        `).eq('campaign_id', campaignId)
        .in('social_accounts.user_id', approvedUserIds);
      
      if (error) throw error;
      
      // Fetch profile data for each unique user
      const uniqueUserIds = [...new Set(campaignAccounts?.map((ca: any) => ca.social_accounts.user_id))];
      const profilesPromises = uniqueUserIds.map(userId => 
        supabase.from('profiles').select('username, avatar_url').eq('id', userId).single()
      );
      const profilesResults = await Promise.all(profilesPromises);
      const profilesMap = new Map(
        profilesResults.map((result, index) => [uniqueUserIds[index], result.data])
      );
      
      const users = campaignAccounts?.map((ca: any) => {
        const account = ca.social_accounts;
        const profile = profilesMap.get(account.user_id);
        return {
          user_id: account.user_id,
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
          platform: account.platform,
          account_username: account.username
        };
      }) || [];
      setAvailableUsers(users);
    } catch (error) {
      console.error("Error fetching available users:", error);
      toast.error("Failed to load users");
    }
  };
  const handleLinkAccount = async (userId: string) => {
    if (!selectedAnalyticsAccount) return;
    try {
      // Update ALL analytics entries for this account across all date ranges
      const {
        error: analyticsError
      } = await supabase.from('campaign_account_analytics').update({
        user_id: userId
      }).eq('campaign_id', campaignId).eq('platform', selectedAnalyticsAccount.platform).ilike('account_username', selectedAnalyticsAccount.account_username);
      if (analyticsError) throw analyticsError;

      // Find if there's a matching social account for this user
      const { data: existingAccount, error: accountCheckError } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', selectedAnalyticsAccount.platform)
        .ilike('username', selectedAnalyticsAccount.account_username)
        .maybeSingle();
      
      if (accountCheckError && accountCheckError.code !== 'PGRST116') throw accountCheckError;

      let socialAccountId = existingAccount?.id;

      // If no matching social account exists, create one
      if (!existingAccount) {
        console.log('Creating social account for user:', userId, 'platform:', selectedAnalyticsAccount.platform);
        const insertData = {
          user_id: userId,
          platform: selectedAnalyticsAccount.platform,
          username: selectedAnalyticsAccount.account_username,
          account_link: selectedAnalyticsAccount.account_link || '',
        };

        const { data: newAccount, error: createError } = await supabase
          .from('social_accounts')
          .insert(insertData)
          .select('id')
          .single();
        
        if (createError) throw createError;
        socialAccountId = newAccount.id;
      }

      // Link the social account to the campaign if not already linked
      const { error: linkError } = await supabase
        .from('social_account_campaigns')
        .upsert({
          social_account_id: socialAccountId,
          campaign_id: campaignId,
        }, {
          onConflict: 'social_account_id,campaign_id'
        });
      
      if (linkError) throw linkError;

      toast.success("Account successfully linked to user");
      setLinkAccountDialogOpen(false);
      setSelectedAnalyticsAccount(null);
      setUserSearchTerm("");
      fetchAnalytics();
    } catch (error: any) {
      console.error("Error linking account:", error);
      toast.error(error.message || "Failed to link account");
    }
  };
  const openLinkDialog = (account: AnalyticsData) => {
    setSelectedAnalyticsAccount(account);
    setUserSearchTerm("");
    fetchAvailableUsers(account.platform);
    setLinkAccountDialogOpen(true);
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
      const {
        error
      } = await supabase.from('campaign_account_analytics').delete().eq('id', deleteAccountId);
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
    const payout = views / 1000 * rpm * demographicMultiplier;
    return {
      payout: payout,
      views: views,
      rpm: rpm,
      demographicMultiplier: demographicMultiplier,
      demographicPercentage: demographicMultiplier * 100
    };
  };
  const fetchTransactions = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("wallet_transactions").select("*").contains('metadata', {
        campaign_id: campaignId
      }).eq('type', 'earning').order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.user_id))];
        const {
          data: profiles
        } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
        
        // Fetch analytics records to check if transactions have been reverted
        const analyticsIds = data
          .map(t => (t.metadata as any)?.analytics_id)
          .filter(Boolean);
        
        const { data: analyticsData } = await supabase
          .from("campaign_account_analytics")
          .select("id, last_payment_amount")
          .in("id", analyticsIds);
        
        // Filter out transactions where the analytics record shows no payment (reverted)
        const activeTransactions = data.filter(txn => {
          const analytics = analyticsData?.find(a => a.id === (txn.metadata as any)?.analytics_id);
          return analytics && analytics.last_payment_amount > 0;
        });
        
        const transactionsWithProfiles = activeTransactions.map(txn => ({
          ...txn,
          profiles: profiles?.find(p => p.id === txn.user_id)
        })) as Transaction[];
        setTransactions(transactionsWithProfiles);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };
  const handlePayUser = async () => {
    if (!selectedUser?.user_id) {
      toast.error("No user selected");
      return;
    }

    // Use custom amount if provided, otherwise use calculated payout
    const amount = paymentAmount ? parseFloat(paymentAmount) : calculatePayout(selectedUser).payout;
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      // First, update the wallet balance
      const {
        data: currentWallet,
        error: walletFetchError
      } = await supabase.from("wallets").select("balance, total_earned").eq("user_id", selectedUser.user_id).single();
      if (walletFetchError) throw walletFetchError;
      
      const balance_before = currentWallet.balance || 0;
      const balance_after = balance_before + amount;
      
      const {
        error: walletUpdateError
      } = await supabase.from("wallets").update({
        balance: balance_after,
        total_earned: (currentWallet.total_earned || 0) + amount
      }).eq("user_id", selectedUser.user_id);
      if (walletUpdateError) throw walletUpdateError;

      // Create wallet transaction with proper metadata
      const {
        error: transactionError
      } = await supabase.from("wallet_transactions").insert({
        user_id: selectedUser.user_id,
        amount: amount,
        type: "earning",
        description: `Payment for ${selectedUser.platform} account @${selectedUser.account_username}`,
        status: "completed",
        metadata: {
          campaign_id: campaignId,
          analytics_id: selectedUser.id,
          account_username: selectedUser.account_username,
          platform: selectedUser.platform,
          views: selectedUser.total_views,
          balance_before: balance_before,
          balance_after: balance_after
        }
      });
      if (transactionError) throw transactionError;

      // Update analytics record with payment info
      const {
        error: analyticsError
      } = await supabase.from("campaign_account_analytics").update({
        paid_views: selectedUser.total_views,
        last_payment_amount: amount,
        last_payment_date: new Date().toISOString()
      }).eq("id", selectedUser.id);
      if (analyticsError) throw analyticsError;

      // Update campaign budget_used
      const {
        data: campaignData,
        error: campaignFetchError
      } = await supabase.from("campaigns").select("budget_used").eq("id", campaignId).single();
      if (campaignFetchError) throw campaignFetchError;
      const {
        error: campaignUpdateError
      } = await supabase.from("campaigns").update({
        budget_used: (campaignData.budget_used || 0) + amount
      }).eq("id", campaignId);
      if (campaignUpdateError) throw campaignUpdateError;
      toast.success(`Payment of $${amount.toFixed(2)} sent successfully`);
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedUser(null);

      // Immediate refresh for instant UI update
      await Promise.all([
        fetchAnalytics(),
        fetchTransactions()
      ]);
      
      if (onPaymentComplete) {
        onPaymentComplete();
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    }
  };

  const handleRevertTransaction = async () => {
    if (!selectedTransaction || !selectedTransaction.metadata?.analytics_id) {
      toast.error("Invalid transaction data");
      return;
    }

    setRevertingTransaction(true);
    try {
      const amount = Math.abs(selectedTransaction.amount);
      const userId = selectedTransaction.user_id;

      // 1. Update wallet - subtract the amount
      const { data: currentWallet, error: walletFetchError } = await supabase
        .from("wallets")
        .select("balance, total_earned")
        .eq("user_id", userId)
        .single();

      if (walletFetchError) throw walletFetchError;

      const newBalance = (currentWallet.balance || 0) - amount;

      const { error: walletUpdateError } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          total_earned: Math.max(0, (currentWallet.total_earned || 0) - amount)
        })
        .eq("user_id", userId);

      if (walletUpdateError) throw walletUpdateError;

      // 2. Create balance correction transaction
      const { error: correctionError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          amount: -amount,
          type: "balance_correction",
          description: `Reverted payment for ${selectedTransaction.metadata.platform} account @${selectedTransaction.metadata.account_username}`,
          status: "completed",
          metadata: {
            original_transaction_id: selectedTransaction.id,
            campaign_id: campaignId,
            analytics_id: selectedTransaction.metadata.analytics_id,
            account_username: selectedTransaction.metadata.account_username,
            platform: selectedTransaction.metadata.platform,
            views: selectedTransaction.metadata.views,
            reverted_at: new Date().toISOString()
          }
        });

      if (correctionError) throw correctionError;

      // 3. Update analytics - mark as unpaid
      const { error: analyticsError } = await supabase
        .from("campaign_account_analytics")
        .update({
          paid_views: 0,
          last_payment_amount: 0,
          last_payment_date: null
        })
        .eq("id", selectedTransaction.metadata.analytics_id);

      if (analyticsError) throw analyticsError;

      // 4. Update campaign budget_used
      const { data: campaignData, error: campaignFetchError } = await supabase
        .from("campaigns")
        .select("budget_used")
        .eq("id", campaignId)
        .single();

      if (campaignFetchError) throw campaignFetchError;

      const { error: campaignUpdateError } = await supabase
        .from("campaigns")
        .update({
          budget_used: Math.max(0, (campaignData.budget_used || 0) - amount)
        })
        .eq("id", campaignId);

      if (campaignUpdateError) throw campaignUpdateError;

      toast.success(`Transaction of $${amount.toFixed(2)} successfully reverted`);
      setRevertDialogOpen(false);
      setSelectedTransaction(null);

      // Refresh data
      await Promise.all([
        fetchAnalytics(),
        fetchTransactions()
      ]);

      if (onPaymentComplete) {
        onPaymentComplete();
      }
    } catch (error) {
      console.error("Error reverting transaction:", error);
      toast.error("Failed to revert transaction");
    } finally {
      setRevertingTransaction(false);
    }
  };
  const filteredAnalytics = analytics.filter(item => {
    const matchesSearch = item.account_username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === "all" || item.platform === platformFilter;
    const matchesLinkedFilter = !showLinkedOnly || item.user_id !== null;
    const matchesPaidFilter = !showPaidOnly || (item.last_payment_amount && item.last_payment_amount > 0);
    const matchesDateRange = selectedDateRange === "all" || `${item.start_date}|${item.end_date}` === selectedDateRange;
    return matchesSearch && matchesPlatform && matchesLinkedFilter && matchesPaidFilter && matchesDateRange;
  }).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    return (aValue > bValue ? 1 : -1) * modifier;
  });
  const totalPages = Math.ceil(filteredAnalytics.length / itemsPerPage);
  const paginatedAnalytics = filteredAnalytics.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
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
  const avgEngagement = analytics.length > 0 ? analytics.reduce((sum, a) => sum + a.average_engagement_rate, 0) / analytics.length : 0;
  if (loading) {
    return <Card className="bg-[#202020] border-transparent">
        <CardContent className="p-8">
          <div className="text-center text-white/60">Loading analytics...</div>
        </CardContent>
      </Card>;
  }
  if (analytics.length === 0) {
    return <Card className="bg-[#202020] border-transparent">
        <CardContent className="p-8">
          <div className="text-center text-white/60">
            No analytics data available. Import a CSV file to get started.
          </div>
        </CardContent>
      </Card>;
  }
  return <>
      <div className="space-y-4">
        {/* Summary Cards */}
        

        {/* Navigation Buttons */}
        <div className="flex gap-2 mb-4 items-center">
          <Button variant={!showTransactions ? "default" : "outline"} onClick={() => setShowTransactions(false)} size="sm" className={`text-sm ${!showTransactions ? "bg-primary" : "bg-[#191919] border-white/10 text-white hover:bg-white/10"}`}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Analytics
          </Button>
          <Button variant={showTransactions ? "default" : "outline"} onClick={() => setShowTransactions(true)} size="sm" className={`text-sm ${showTransactions ? "bg-primary" : "bg-[#191919] border-white/10 text-white hover:bg-white/10"}`}>
            <Receipt className="h-4 w-4 mr-1.5" />
            Transactions ({transactions.length})
          </Button>
          
          {!showTransactions && dateRanges.length > 0 && <div className="ml-auto flex items-center gap-2">
              <Label className="text-white/60 text-sm">CSV Period:</Label>
              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger className="w-[200px] bg-[#191919] border-white/10 text-white">
                  <SelectValue placeholder="All periods" />
                </SelectTrigger>
                <SelectContent className="bg-[#202020] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-white/10">All Periods</SelectItem>
                  {dateRanges.map((range, idx) => <SelectItem key={idx} value={`${range.start}|${range.end}`} className="text-white hover:bg-white/10">
                      {new Date(range.start).toLocaleDateString()} - {new Date(range.end).toLocaleDateString()}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              {selectedDateRange !== "all" && <Button variant="destructive" size="sm" onClick={async () => {
            const [start, end] = selectedDateRange.split('|');
            try {
              const {
                error
              } = await supabase.from('campaign_account_analytics').delete().eq('campaign_id', campaignId).eq('start_date', start).eq('end_date', end);
              if (error) throw error;
              toast.success("CSV period deleted successfully");
              setSelectedDateRange("all");
              fetchAnalytics();
            } catch (error) {
              console.error("Error deleting CSV period:", error);
              toast.error("Failed to delete CSV period");
            }
          }} className="bg-destructive/20 hover:bg-destructive/30">
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Period
                </Button>}
            </div>}
        </div>

        {/* Filters and Table */}
        {!showTransactions && <Card className="bg-[#202020] border-transparent">
          <CardHeader className="px-3 py-3">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <CardTitle className="text-white text-sm">Account Analytics</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTrackAccountDialogOpen(true)}
                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Track Account
                </Button>
                <div className="relative flex-1 sm:w-40">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-white/40" />
                  <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-7 h-8 bg-[#191919] border-white/10 text-white text-xs" />
                </div>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-full sm:w-28 h-8 bg-[#191919] border-white/10 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-white/10">
                    <SelectItem value="all" className="text-white text-sm">All</SelectItem>
                    {platforms.map(platform => <SelectItem key={platform} value={platform} className="text-white capitalize text-sm">
                        {platform}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant={showLinkedOnly ? "default" : "outline"} onClick={() => setShowLinkedOnly(!showLinkedOnly)} size="sm" className={`h-8 text-sm ${showLinkedOnly ? "bg-primary" : "bg-[#191919] border-white/10 text-white hover:bg-white/10"}`}>
                  <Filter className="h-4 w-4 mr-1" />
                  Linked
                </Button>
                <Button variant={showPaidOnly ? "default" : "outline"} onClick={() => setShowPaidOnly(!showPaidOnly)} size="sm" className={`h-8 text-sm ${showPaidOnly ? "bg-green-500 hover:bg-green-600" : "bg-[#191919] border-white/10 text-white hover:bg-white/10"}`}>
                  <DollarSign className="h-4 w-4 mr-1" />
                  Paid
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
                    <TableHead className="text-white/60 font-medium text-right cursor-pointer hover:text-white transition-colors text-sm whitespace-nowrap py-3" onClick={() => handleSort('total_views')}>
                      <div className="flex items-center justify-end gap-1">
                        Views
                        {sortField === 'total_views' ? sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-white/60 font-medium text-sm py-3">Time Period</TableHead>
                    <TableHead className="text-white/60 font-medium text-sm py-3">Last Paid</TableHead>
                    <TableHead className="text-white/60 font-medium text-sm w-8 py-3"></TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {paginatedAnalytics.map(item => {
                  const platformIcon = getPlatformIcon(item.platform);
                  const username = item.account_username.startsWith('@') ? item.account_username.slice(1) : item.account_username;
                  return <TableRow key={item.id} className="border-white/5 hover:bg-transparent">
                      <TableCell className="py-3 sticky left-0 bg-[#202020] z-10">
                        <div className="flex items-center gap-2">
                          {platformIcon && <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-0.5">
                              <img src={platformIcon} alt={item.platform} className="w-full h-full object-contain" />
                            </div>}
                          <div className="flex items-center gap-1.5">
                            {item.account_link ? <a href={item.account_link} target="_blank" rel="noopener noreferrer" onClick={e => {
                            e.preventDefault();
                            window.open(item.account_link!, '_blank', 'noopener,noreferrer');
                          }} className="text-white hover:underline transition-all font-medium cursor-pointer text-sm truncate max-w-[150px]">
                                {username}
                              </a> : <span className="text-white font-medium text-sm truncate max-w-[150px]">{username}</span>}
                            
                            {/* Demographic Status Icon */}
                            {item.user_id && <TooltipProvider>
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
                              </TooltipProvider>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 bg-[#202020] cursor-pointer transition-colors" onClick={() => {
                      if (item.user_id && item.profiles) {
                        setSelectedUser(item);
                        setPaymentDialogOpen(true);
                      }
                    }}>
                        {item.user_id && item.profiles ? <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={item.profiles.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                                {item.profiles.username?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white text-sm truncate max-w-[90px] hover:underline font-semibold" style={{
                          letterSpacing: '-0.3px',
                          fontWeight: 600
                        }}>{item.profiles.username}</span>
                            {item.paid_views >= item.total_views && item.paid_views > 0 && <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 text-[10px] font-semibold px-1.5 py-0 rounded-[4px]">
                                      Paid
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-[#2a2a2a] border-white/10 text-white">
                                    <p className="text-sm font-medium">Paid ${item.last_payment_amount.toFixed(2)}</p>
                                    <p className="text-xs text-white/60">{new Date(item.last_payment_date!).toLocaleDateString()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>}
                          </div> : <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 rounded-md px-2 py-1.5 border border-white/10 transition-all" onClick={e => {
                        e.stopPropagation();
                        openLinkDialog(item);
                      }}>
                            <Link2 className="h-3.5 w-3.5 text-white/60" />
                            <span className="text-xs text-white/80 font-medium">Link User</span>
                          </div>}
                      </TableCell>
                      <TableCell className="text-white text-right text-sm bg-[#202020] py-3" style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500
                    }}>
                        {item.total_views.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white/60 text-sm bg-[#202020] py-3">
                        {item.start_date && item.end_date ? (
                          <span className="text-xs whitespace-nowrap">
                            {new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(item.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-xs text-white/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-white/60 text-sm bg-[#202020] py-3">
                        {item.last_payment_date ? (
                          <span className="text-xs">
                            {formatDistanceToNow(new Date(item.last_payment_date), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-xs text-white/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 bg-[#202020]">
                        <Button variant="ghost" size="icon" onClick={() => {
                        setDeleteAccountId(item.id);
                        setDeleteDialogOpen(true);
                      }} className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>;
                })}
              </TableBody>
            </Table>
          </div>
          {filteredAnalytics.length === 0 && <div className="text-center py-12 text-white/40">
              No accounts match your filters
            </div>}
        </CardContent>
      </Card>}

        {/* Transactions History */}
        {showTransactions && <Card className="bg-[#202020] border-transparent">
          <CardHeader className="px-3 py-3">
            <CardTitle className="text-white text-sm">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60 font-medium text-sm py-3">Date</TableHead>
                    <TableHead className="text-white/60 font-medium text-sm py-3">User</TableHead>
                    <TableHead className="text-white/60 font-medium text-sm py-3">Account</TableHead>
                    <TableHead className="text-white/60 font-medium text-sm py-3 text-right">Views</TableHead>
                    <TableHead className="text-white/60 font-medium text-sm py-3 text-right">Amount</TableHead>
                    <TableHead className="text-white/60 font-medium text-sm py-3">Status</TableHead>
                    <TableHead className="text-white/60 font-medium text-sm py-3 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(txn => {
                  const metadata = txn.metadata || {};
                  const platformIcon = getPlatformIcon(metadata.platform || '');
                  return <TableRow key={txn.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white/60 text-sm bg-[#202020] py-3">
                          {new Date(txn.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                        </TableCell>
                        <TableCell className="bg-[#202020] py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={txn.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                                {txn.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white text-sm font-medium">{txn.profiles?.username || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="bg-[#202020] py-3">
                          <div className="flex items-center gap-2">
                            {platformIcon && <img src={platformIcon} alt={metadata.platform} className="h-4 w-4" />}
                            <span className="text-white/80 text-sm">@{metadata.account_username || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white/80 text-right text-sm bg-[#202020] py-3" style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500
                    }}>
                          {metadata.views?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell className="text-green-400 text-right font-semibold text-sm bg-[#202020] py-3">
                          +${Number(txn.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="bg-[#202020] py-3">
                          <Badge variant="secondary" className="text-xs font-medium bg-green-500/10 text-green-500 border-0 px-2 py-0.5">
                            {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="bg-[#202020] py-3 text-center">
                          {txn.status === 'completed' && txn.type === 'earning' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTransaction(txn);
                                      setRevertDialogOpen(true);
                                    }}
                                    className="h-7 w-7 p-0 hover:bg-red-500/10 hover:text-red-500"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Revert Transaction</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                      </TableRow>;
                })}
                </TableBody>
              </Table>
            </div>
            {transactions.length === 0 && <div className="text-center py-12 text-white/40">
                No transactions yet
              </div>}
          </CardContent>
        </Card>}

      {/* Pagination */}
      {!showTransactions && totalPages > 1 && <div className="flex justify-center mt-4">
          <Pagination>
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-30" : "cursor-pointer hover:bg-[#202020] transition-colors"} style={{
                backgroundColor: 'transparent'
              }} />
              </PaginationItem>
              
              {Array.from({
              length: totalPages
            }, (_, i) => i + 1).map(page => {
              // Show first page, last page, current page, and pages around current
              if (page === 1 || page === totalPages || page >= currentPage - 1 && page <= currentPage + 1) {
                return <PaginationItem key={page}>
                      <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer transition-colors min-w-[36px] h-[36px] rounded-md border border-transparent" style={{
                    backgroundColor: currentPage === page ? '#202020' : 'transparent'
                  }}>
                        <span className={currentPage === page ? "text-white font-medium" : "text-white/50"}>
                          {page}
                        </span>
                      </PaginationLink>
                    </PaginationItem>;
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <PaginationItem key={page}>
                      <span className="px-2 text-white/20 text-sm">...</span>
                    </PaginationItem>;
              }
              return null;
            })}

              <PaginationItem>
                <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-30" : "cursor-pointer hover:bg-[#202020] transition-colors"} style={{
                backgroundColor: 'transparent'
              }} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>}
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
          <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600 text-white">
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
        
        {selectedUser && <div className="space-y-4 py-4">
            {/* User Info Card */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {selectedUser.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="font-semibold text-white">@{selectedUser.profiles?.username}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                      const platformIcon = getPlatformIcon(selectedUser.platform);
                      return platformIcon && <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            <img src={platformIcon} alt={selectedUser.platform} className="w-3 h-3" />
                            <span className="text-xs text-white/80 capitalize">{selectedUser.platform}</span>
                          </div>;
                    })()}
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        <span className="text-xs text-white/60">@{selectedUser.account_username}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Performance Stats - Moved here */}
                  
                </div>
              </div>

              {/* Demographic Status */}
              <div className="pt-2 border-t border-white/10">
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
                
                {selectedUser.demographic_submission && <div className="mt-1 text-xs text-white/40">
                    Last submitted: {new Date(selectedUser.demographic_submission.submitted_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
                    {selectedUser.demographic_submission.score !== null && <span className="ml-2">• Score: {selectedUser.demographic_submission.score}/100</span>}
                  </div>}
                
                {!selectedUser.demographic_submission && <div className="mt-1 text-xs text-red-400/80">
                    ⚠️ User has never submitted demographics
                  </div>}
              </div>
            </div>

            {/* Payment Status */}
            {selectedUser.paid_views > 0 && <div className="px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-xs font-medium text-green-400">Last Payment</span>
                  </div>
                  <span className="text-sm font-semibold text-white">${selectedUser.last_payment_amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-white/50">
                  <span>{selectedUser.paid_views.toLocaleString()} views</span>
                  <span>{new Date(selectedUser.last_payment_date!).toLocaleDateString()}</span>
                </div>
                {selectedUser.total_views > selectedUser.paid_views && <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-500/10 text-xs">
                    <span className="text-yellow-400">New Unpaid Views</span>
                    <span className="text-yellow-400 font-semibold">
                      {(selectedUser.total_views - selectedUser.paid_views).toLocaleString()}
                    </span>
                  </div>}
              </div>}

            {/* Payout Calculation */}
            <div className="space-y-3">
              <div className="p-2">
                <div className="text-sm font-medium text-white mb-2">Calculated Payout</div>
                
                {(() => {
                const calc = calculatePayout(selectedUser);
                return <>
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
                    </>;
              })()}
              </div>

              {/* Manual Override */}
              <div className="space-y-2">
                <Label htmlFor="payment-amount" className="text-white text-sm">
                  Custom Amount (Optional)
                </Label>
                <Input id="payment-amount" type="number" step="0.01" min="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Leave empty to use calculated amount" className="bg-[#191919] border-white/10 text-white" />
                <p className="text-xs text-white/40">
                  Override the calculated amount if needed
                </p>
              </div>
            </div>
          </div>}

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setPaymentDialogOpen(false);
            setPaymentAmount("");
            setSelectedUser(null);
          }} className="bg-transparent border-white/10 text-white hover:bg-white/5">
            Cancel
          </Button>
              <Button onClick={() => {
            handlePayUser();
          }} className="bg-primary hover:bg-primary/90" disabled={selectedUser && selectedUser.paid_views >= selectedUser.total_views}>
                {selectedUser && selectedUser.paid_views >= selectedUser.total_views ? "Already Paid" : "Send Payment"}
              </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Link Account Dialog */}
    <Dialog open={linkAccountDialogOpen} onOpenChange={setLinkAccountDialogOpen}>
      <DialogContent className="bg-[#202020] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Link Account to User
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Connect {selectedAnalyticsAccount?.account_username} to a user who joined this campaign
          </DialogDescription>
        </DialogHeader>

        {selectedAnalyticsAccount && <div className="space-y-4 py-4">
            {/* Account Info */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-xs text-white/60 mb-1">Analytics Account</div>
              <div className="flex items-center gap-2">
                {(() => {
                const platformIcon = selectedAnalyticsAccount.platform === 'tiktok' ? tiktokLogo : selectedAnalyticsAccount.platform === 'instagram' ? instagramLogo : selectedAnalyticsAccount.platform === 'youtube' ? youtubeLogo : null;
                return platformIcon && <img src={platformIcon} alt={selectedAnalyticsAccount.platform} className="w-4 h-4" />;
              })()}
                <span className="font-semibold">@{selectedAnalyticsAccount.account_username}</span>
              </div>
            </div>

            {/* User Search */}
            <div className="space-y-2">
              <Label htmlFor="user-search" className="text-white text-sm">
                Search Users
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input id="user-search" type="text" placeholder="Search by username..." value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} className="bg-[#191919] border-white/10 text-white pl-9" />
              </div>
            </div>

            {/* Available Users List */}
            <div className="space-y-2">
              <div className="text-xs text-white/60 mb-2">
                Available Users ({(() => {
                const uniqueUsers = availableUsers.reduce((acc, user) => {
                  if (!acc.find(u => u.user_id === user.user_id)) {
                    acc.push(user);
                  }
                  return acc;
                }, [] as typeof availableUsers);
                return uniqueUsers.filter(u => u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) || availableUsers.filter(a => a.user_id === u.user_id).some(a => a.account_username.toLowerCase().includes(userSearchTerm.toLowerCase()))).length;
              })()})
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {availableUsers.length === 0 ? <div className="p-4 text-center text-sm text-white/40">
                    No users have joined this campaign yet
                  </div> : (() => {
                // Group accounts by user
                const userGroups = availableUsers.reduce((acc, account) => {
                  if (!acc[account.user_id]) {
                    acc[account.user_id] = {
                      user_id: account.user_id,
                      username: account.username,
                      avatar_url: account.avatar_url,
                      accounts: []
                    };
                  }
                  acc[account.user_id].accounts.push({
                    platform: account.platform,
                    account_username: account.account_username
                  });
                  return acc;
                }, {} as Record<string, {
                  user_id: string;
                  username: string;
                  avatar_url: string | null;
                  accounts: Array<{
                    platform: string;
                    account_username: string;
                  }>;
                }>);
                const users = Object.values(userGroups);
                return users.filter(user => user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) || user.accounts.some(a => a.account_username.toLowerCase().includes(userSearchTerm.toLowerCase()))).map(user => <div key={user.user_id} onClick={() => handleLinkAccount(user.user_id)} className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                  {user.username?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="text-sm font-semibold mb-1">@{user.username}</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {user.accounts.map((account, idx) => {
                            const platformIcon = account.platform === 'tiktok' ? tiktokLogo : account.platform === 'instagram' ? instagramLogo : account.platform === 'youtube' ? youtubeLogo : null;
                            return <div key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                                        {platformIcon && <img src={platformIcon} alt={account.platform} className="w-3 h-3" />}
                                        <span className="text-xs text-white/80">@{account.account_username}</span>
                                      </div>;
                          })}
                                </div>
                              </div>
                            </div>
                            <Link2 className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                          </div>
                        </div>);
              })()}
              </div>
            </div>
          </div>}

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setLinkAccountDialogOpen(false);
            setSelectedAnalyticsAccount(null);
            setUserSearchTerm("");
          }} className="bg-transparent border-white/10 text-white hover:bg-white/5">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Shortimize Track Account Dialog */}
    <ShortimizeTrackAccountDialog
      campaignId={campaignId}
      open={trackAccountDialogOpen}
      onOpenChange={setTrackAccountDialogOpen}
      onSuccess={() => {
        fetchAnalytics();
        toast.success("Account will be tracked in Shortimize");
      }}
    />

    {/* Revert Transaction Dialog */}
    <AlertDialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
      <AlertDialogContent className="bg-[#0b0b0b] border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Revert Transaction
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/60">
            This will permanently revert this payment transaction. The following actions will be performed:
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {selectedTransaction && (
          <div className="space-y-3 my-4">
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-sm text-white/60 mb-1">Transaction Amount</div>
              <div className="text-2xl font-bold text-red-500">-${Math.abs(selectedTransaction.amount).toFixed(2)}</div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-white/80">Subtract ${Math.abs(selectedTransaction.amount).toFixed(2)} from user's balance</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-white/80">Create a "Balance Correction" transaction</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-white/80">Mark account as unpaid in analytics</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-white/80">Reduce campaign's used budget by ${Math.abs(selectedTransaction.amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 mt-4">
              <p className="text-sm text-red-400 font-medium">
                ⚠️ This action cannot be undone. The user will see this as a balance deduction.
              </p>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevertTransaction}
            disabled={revertingTransaction}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {revertingTransaction ? "Reverting..." : "Revert Transaction"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}