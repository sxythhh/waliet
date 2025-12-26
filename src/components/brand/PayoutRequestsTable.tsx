import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";
import { Clock, CheckCircle, AlertTriangle, Flag, DollarSign, ChevronDown, ChevronUp, User, Search } from "lucide-react";
import { toast } from "sonner";
import creditCardIcon from "@/assets/credit-card-icon.svg";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import flagAmberIcon from "@/assets/flag-amber-icon.svg";
import { BrandPayoutStatusCards } from "./BrandPayoutStatusCards";
import { PayoutItemRow } from "./PayoutItemRow";
import { canBeFlagged } from "./FlaggingWindowBadge";
interface PayoutRequest {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  clearing_ends_at: string;
  created_at: string;
  completed_at: string | null;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
  items?: PayoutItem[];
}
interface PayoutItem {
  id: string;
  submission_id: string;
  source_type: string;
  source_id: string;
  amount: number;
  is_locked: boolean;
  flagged_at: string | null;
  flagged_by: string | null;
  flag_reason: string | null;
  status?: string;
  approved_at?: string | null;
  approved_by?: string | null;
  views_at_request?: number | null; // Snapshot of unpaid views when payout was requested
  video_submission?: {
    video_url: string;
    video_title: string | null;
    video_description: string | null;
    video_thumbnail_url: string | null;
    video_author_avatar: string | null;
    platform: string | null;
    views: number | null;
    likes: number | null;
    video_author_username: string | null;
    paid_views?: number | null;
  };
}
interface BoostTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  metadata: any;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}
interface PayoutRequestsTableProps {
  campaignId?: string;
  boostId?: string;
  brandId?: string;
  showEmpty?: boolean;
}
export function PayoutRequestsTable({
  campaignId,
  boostId,
  brandId,
  showEmpty = true
}: PayoutRequestsTableProps) {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [transactions, setTransactions] = useState<BoostTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [flaggingItem, setFlaggingItem] = useState<string | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("highest");
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagItemId, setFlagItemId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [selectedFlagReason, setSelectedFlagReason] = useState<string | null>(null);

  const FLAG_REASON_OPTIONS = [
    "Suspicious activity",
    "Bot-like behavior",
    "Content violation",
    "Duplicate submission"
  ];

  // Helper to get filtered items for a request (only items belonging to current campaign/boost)
  const getFilteredItemsForRequest = (request: PayoutRequest) => {
    if (!request.items) return {
      items: [],
      total: 0,
      otherCount: 0
    };

    // If viewing a specific campaign or boost, filter items
    if (campaignId) {
      const filtered = request.items.filter(item => item.source_type === 'campaign' && item.source_id === campaignId);
      const otherItems = request.items.filter(item => item.source_type !== 'campaign' || item.source_id !== campaignId);
      return {
        items: filtered,
        total: filtered.reduce((sum, item) => sum + item.amount, 0),
        otherCount: otherItems.length
      };
    }
    if (boostId) {
      const filtered = request.items.filter(item => item.source_type === 'boost' && item.source_id === boostId);
      const otherItems = request.items.filter(item => item.source_type !== 'boost' || item.source_id !== boostId);
      return {
        items: filtered,
        total: filtered.reduce((sum, item) => sum + item.amount, 0),
        otherCount: otherItems.length
      };
    }

    // If viewing all (brandId), show all items
    return {
      items: request.items,
      total: request.total_amount,
      otherCount: 0
    };
  };

  // Filter and sort requests
  const filteredRequests = useMemo(() => {
    const filtered = requests.filter(request => {
      // Get filtered info for this request
      const {
        items: filteredItems,
        total: filteredTotal
      } = getFilteredItemsForRequest(request);

      // Search filter - match username or amount
      const matchesSearch = searchQuery === "" || request.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) || filteredTotal.toFixed(2).includes(searchQuery);

      // Status filter
      const matchesStatus = statusFilter === "all" || statusFilter === "flagged" && filteredItems.some(i => i.flagged_at) || statusFilter !== "flagged" && request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort the filtered results
    return filtered.sort((a, b) => {
      const { total: totalA } = getFilteredItemsForRequest(a);
      const { total: totalB } = getFilteredItemsForRequest(b);
      const clearingA = new Date(a.clearing_ends_at).getTime();
      const clearingB = new Date(b.clearing_ends_at).getTime();

      switch (sortBy) {
        case "highest":
          return totalB - totalA;
        case "lowest":
          return totalA - totalB;
        case "deadline_soon":
          return clearingA - clearingB;
        case "deadline_later":
          return clearingB - clearingA;
        default:
          return 0;
      }
    });
  }, [requests, searchQuery, statusFilter, sortBy, campaignId, boostId]);
  useEffect(() => {
    fetchPayoutRequests();
    if (boostId) {
      fetchBoostTransactions();
    }

    // Set up realtime subscription
    const channel = supabase.channel(`payout-requests-${campaignId || boostId || brandId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'submission_payout_requests'
    }, () => {
      fetchPayoutRequests();
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'wallet_transactions'
    }, () => {
      if (boostId) fetchBoostTransactions();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, boostId, brandId]);
  const fetchBoostTransactions = async () => {
    if (!boostId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('wallet_transactions').select('*').eq('type', 'earning').order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Filter by boost_id in metadata
      const boostTransactions = (data || []).filter(t => {
        const metadata = t.metadata as Record<string, unknown> | null;
        return metadata?.boost_id === boostId;
      });

      // Fetch user profiles
      const userIds = [...new Set(boostTransactions.map(t => t.user_id))];
      const {
        data: profilesData
      } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      const enrichedTransactions: BoostTransaction[] = boostTransactions.map(t => ({
        ...t,
        profiles: profilesMap.get(t.user_id) || undefined
      }));
      setTransactions(enrichedTransactions);
    } catch (error) {
      console.error('Error fetching boost transactions:', error);
    }
  };
  const fetchPayoutRequests = async () => {
    try {
      // First, get video submissions that match our filter to find their IDs
      let submissionsQuery = supabase.from('video_submissions').select('id, source_id, source_type, brand_id');

      // Filter by campaign, boost, or brand
      if (campaignId) {
        submissionsQuery = submissionsQuery.eq('source_id', campaignId).eq('source_type', 'campaign');
      }
      if (boostId) {
        submissionsQuery = submissionsQuery.eq('source_id', boostId).eq('source_type', 'boost');
      }
      if (brandId) {
        submissionsQuery = submissionsQuery.eq('brand_id', brandId);
      }
      const {
        data: submissionsData,
        error: submissionsError
      } = await submissionsQuery;
      if (submissionsError) throw submissionsError;
      const submissionIds = (submissionsData || []).map(s => s.id);
      if (submissionIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get payout items for these submissions
      const {
        data: itemsData,
        error: itemsError
      } = await supabase.from('submission_payout_items').select('*').in('submission_id', submissionIds);
      if (itemsError) throw itemsError;
      if (!itemsData || itemsData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get unique payout request IDs
      const requestIds = [...new Set(itemsData.map(item => item.payout_request_id))];
      if (requestIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Fetch video submission details for the items
      const itemSubmissionIds = [...new Set(itemsData.map(item => item.submission_id))];
      const {
        data: videoSubmissions
      } = await supabase.from('video_submissions').select('id, video_url, video_title, video_description, video_thumbnail_url, video_author_avatar, platform, views, likes, video_author_username, paid_views').in('id', itemSubmissionIds);

      // Fetch the payout requests
      const {
        data: requestsData,
        error: requestsError
      } = await supabase.from('submission_payout_requests').select('*').in('id', requestIds).order('created_at', {
        ascending: false
      });
      if (requestsError) throw requestsError;

      // Fetch user profiles
      const userIds = [...new Set((requestsData || []).map(r => r.user_id))];
      const {
        data: profilesData
      } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Create a map of video submissions by ID
      const videoSubmissionsMap = new Map((videoSubmissions || []).map(v => [v.id, v]));

      // Map items to their requests
      const itemsByRequest = new Map<string, PayoutItem[]>();
      (itemsData || []).forEach(item => {
        const items = itemsByRequest.get(item.payout_request_id) || [];
        items.push({
          ...item,
          video_submission: videoSubmissionsMap.get(item.submission_id) || undefined
        });
        itemsByRequest.set(item.payout_request_id, items);
      });

      // Combine everything
      const enrichedRequests: PayoutRequest[] = (requestsData || []).map(request => ({
        ...request,
        profiles: profilesMap.get(request.user_id) || undefined,
        items: itemsByRequest.get(request.id) || []
      }));
      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching payout requests:', error);
      toast.error('Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };
  const handleFlagItem = async (itemId: string, reason: string) => {
    setFlaggingItem(itemId);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const {
        error
      } = await supabase.from('submission_payout_items').update({
        flagged_at: new Date().toISOString(),
        flagged_by: user.id,
        flag_reason: reason
      }).eq('id', itemId);
      if (error) throw error;
      toast.success('Item flagged for review');
      setFlagDialogOpen(false);
      setFlagItemId(null);
      setFlagReason("");
      setSelectedFlagReason(null);
      fetchPayoutRequests();
    } catch (error) {
      console.error('Error flagging item:', error);
      toast.error('Failed to flag item');
    } finally {
      setFlaggingItem(null);
    }
  };

  const openFlagDialog = (itemId: string) => {
    setFlagItemId(itemId);
    setFlagReason("");
    setSelectedFlagReason(null);
    setFlagDialogOpen(true);
  };

  const submitFlag = () => {
    if (!flagItemId) return;
    const reason = flagReason.trim() || selectedFlagReason || "Flagged for review";
    handleFlagItem(flagItemId, reason);
  };

  const getPlatformIcon = (platform: string | null) => {
    switch (platform?.toLowerCase()) {
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
  const getStatusBadge = (request: PayoutRequest) => {
    const now = new Date();
    const clearingEnds = new Date(request.clearing_ends_at);
    const daysRemaining = differenceInDays(clearingEnds, now);
    const hoursRemaining = differenceInHours(clearingEnds, now);
    const hasFlags = request.items?.some(item => item.flagged_at) || false;
    if (request.status === 'completed') {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>;
    }
    if (request.status === 'cancelled') {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Cancelled
        </Badge>;
    }
    if (hasFlags) {
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
          <Flag className="h-3 w-3" />
          Flagged
        </Badge>;
    }
    if (request.status === 'clearing') {
      if (hoursRemaining <= 0) {
        return <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
            <Clock className="h-3 w-3" />
            Ready
          </Badge>;
      }
      return <Badge className="bg-blue-500/10 text-blue-500 border-transparent hover:bg-blue-500/10 gap-1">
          <Clock className="h-3 w-3" />
          {daysRemaining > 0 ? `${daysRemaining}d left` : `${hoursRemaining}h left`}
        </Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground gap-1">
        {request.status}
      </Badge>;
  };
  const getClearingProgress = (request: PayoutRequest) => {
    if (request.status === 'completed') return 100;
    const createdAt = new Date(request.created_at);
    const clearingEnds = new Date(request.clearing_ends_at);
    const now = new Date();
    const totalDuration = clearingEnds.getTime() - createdAt.getTime();
    const elapsed = now.getTime() - createdAt.getTime();
    return Math.min(100, Math.max(0, elapsed / totalDuration * 100));
  };
  const handleApprovePayout = async (request: PayoutRequest) => {
    setApprovingRequest(request.id);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the filtered items for this campaign/boost only
      const {
        items: filteredItems,
        total: filteredTotal
      } = getFilteredItemsForRequest(request);
      if (filteredItems.length === 0) {
        toast.error('No items to approve for this campaign');
        return;
      }
      const itemIds = filteredItems.map(item => item.id);
      const submissionIds = filteredItems.map(item => item.submission_id);

      // Update the status of only these items to 'approved'
      const {
        error: itemsUpdateError
      } = await supabase.from('submission_payout_items').update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id
      }).in('id', itemIds);
      if (itemsUpdateError) throw itemsUpdateError;

      // Check if ALL items in this request are now approved
      const {
        data: allItems
      } = await supabase.from('submission_payout_items').select('id, status').eq('payout_request_id', request.id);
      const allApproved = allItems?.every(item => item.status === 'approved') || false;

      // If all items approved, mark the request as completed
      if (allApproved) {
        const {
          error: updateError
        } = await supabase.from('submission_payout_requests').update({
          status: 'completed',
          completed_at: new Date().toISOString()
        }).eq('id', request.id);
        if (updateError) throw updateError;
      }

      // Fetch current wallet balance
      const {
        data: walletData,
        error: fetchWalletError
      } = await supabase.from('wallets').select('balance, total_earned').eq('user_id', request.user_id).single();
      if (fetchWalletError) throw fetchWalletError;

      // Credit the creator's wallet with only the filtered amount
      const {
        error: walletUpdateError
      } = await supabase.from('wallets').update({
        balance: (walletData?.balance || 0) + filteredTotal,
        total_earned: (walletData?.total_earned || 0) + filteredTotal
      }).eq('user_id', request.user_id);
      if (walletUpdateError) throw walletUpdateError;

      // Create wallet transaction record with only the filtered amount
      const {
        error: txError
      } = await supabase.from('wallet_transactions').insert({
        user_id: request.user_id,
        amount: filteredTotal,
        type: 'earning',
        description: campaignId ? 'Campaign payout' : boostId ? 'Boost payout' : 'Payout',
        metadata: {
          payout_request_id: request.id,
          campaign_id: campaignId || null,
          boost_id: boostId || null,
          approved_by: user.id,
          item_ids: itemIds
        }
      });
      if (txError) throw txError;

      // Update video_submissions: increment paid_views and set payout_status back to 'available'
      // This allows the video to accrue more views and be paid out again
      for (const item of filteredItems) {
        const viewsToAdd = item.views_at_request || 0;

        // Get current paid_views
        const {
          data: currentSub
        } = await supabase.from('video_submissions').select('paid_views').eq('id', item.submission_id).single();
        const newPaidViews = (currentSub?.paid_views || 0) + viewsToAdd;
        const {
          error: updateSubError
        } = await supabase.from('video_submissions').update({
          paid_views: newPaidViews,
          payout_status: 'available' // Keep available for future payouts
        }).eq('id', item.submission_id);
        if (updateSubError) {
          console.error('Error updating paid_views:', updateSubError);
        }
      }

      // Update boost budget_used if this is a boost payout
      if (boostId) {
        const {
          data: currentBoost
        } = await supabase.from('bounty_campaigns').select('budget_used').eq('id', boostId).single();
        if (currentBoost) {
          await supabase.from('bounty_campaigns').update({
            budget_used: (currentBoost.budget_used || 0) + filteredTotal
          }).eq('id', boostId);
        }
      }

      // Update paid_views in campaign_account_analytics
      if (campaignId) {
        // Get total views from approved submissions
        const {
          data: submissions,
          error: submissionsError
        } = await supabase.from('video_submissions').select('views, video_author_username, platform').in('id', submissionIds);
        if (submissionsError) {
          console.error('Error fetching submissions for paid views:', submissionsError);
        }
        if (submissions && submissions.length > 0) {
          const totalViewsPaid = submissions.reduce((sum, sub) => sum + (sub.views || 0), 0);

          // Get unique usernames and platforms
          const uniqueAccounts = new Map<string, string>();
          submissions.forEach(sub => {
            if (sub.video_author_username && sub.platform) {
              uniqueAccounts.set(`${sub.video_author_username}-${sub.platform}`, sub.platform);
            }
          });

          // Update campaign_account_analytics for each account
          for (const [key, platform] of uniqueAccounts) {
            const username = key.split('-')[0];
            const {
              data: analytics
            } = await supabase.from('campaign_account_analytics').select('paid_views').eq('campaign_id', campaignId).eq('account_username', username).eq('platform', platform).single();
            if (analytics) {
              const {
                error: updateError
              } = await supabase.from('campaign_account_analytics').update({
                paid_views: (analytics.paid_views || 0) + totalViewsPaid,
                last_payment_amount: filteredTotal,
                last_payment_date: new Date().toISOString()
              }).eq('campaign_id', campaignId).eq('account_username', username).eq('platform', platform);
              if (updateError) {
                console.error('Error updating paid_views in analytics:', updateError);
              }
            }
          }
        }
      }
      const statusNote = allApproved ? '' : ' (other items still pending in different campaigns)';
      toast.success(`Payout of $${filteredTotal.toFixed(2)} approved and sent to creator${statusNote}`);
      fetchPayoutRequests();
    } catch (error) {
      console.error('Error approving payout:', error);
      toast.error('Failed to approve payout');
    } finally {
      setApprovingRequest(null);
    }
  };
  // Calculate summary stats for status cards - MUST be before early returns
  const summaryStats = useMemo(() => {
    let inReviewAmount = 0, inReviewCount = 0, approvedAmount = 0, approvedCount = 0, flaggedAmount = 0, flaggedCount = 0;
    let earliestClearingEndsAt: string | undefined;
    let canStillFlagAny = false;
    requests.forEach(request => {
      const { items: displayItems } = getFilteredItemsForRequest(request);
      displayItems.forEach(item => {
        if (item.flagged_at) { flaggedAmount += item.amount; flaggedCount++; }
        else if (item.status === 'approved') { approvedAmount += item.amount; approvedCount++; }
        else {
          inReviewAmount += item.amount; inReviewCount++;
          if (!earliestClearingEndsAt || request.clearing_ends_at < earliestClearingEndsAt) earliestClearingEndsAt = request.clearing_ends_at;
          if (canBeFlagged(request.created_at, request.clearing_ends_at)) canStillFlagAny = true;
        }
      });
    });
    return { inReviewAmount, inReviewCount, approvedAmount, approvedCount, flaggedAmount, flaggedCount, earliestClearingEndsAt, canStillFlag: canStillFlagAny };
  }, [requests, campaignId, boostId]);

  if (loading) {
    return <div className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="flex items-center gap-4 p-4 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>)}
        </div>
      </div>;
  }
  const hasAnyData = requests.length > 0 || transactions.length > 0;
  if (!hasAnyData && showEmpty) {
    return <Card className="bg-card border-0 h-full">
        <CardContent className="p-6 h-full flex items-center justify-center">
          <div className="text-center py-8">
            <img src={creditCardIcon} alt="" className="h-12 w-12 mx-auto opacity-50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Payout Activity</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              No payout requests or transactions have been made for this {boostId ? 'boost' : 'campaign'} yet. Payout activity will appear here.
            </p>
          </div>
        </CardContent>
      </Card>;
  }
  if (!hasAnyData) {
    return null;
  }

  return <TooltipProvider>
      <div className="space-y-6 font-['Inter'] tracking-[-0.5px] h-full py-[10px]">
        
        {/* Summary Status Cards */}
        {requests.length > 0 && (
          <BrandPayoutStatusCards
            inReviewAmount={summaryStats.inReviewAmount}
            inReviewCount={summaryStats.inReviewCount}
            approvedAmount={summaryStats.approvedAmount}
            approvedCount={summaryStats.approvedCount}
            flaggedAmount={summaryStats.flaggedAmount}
            flaggedCount={summaryStats.flaggedCount}
            earliestClearingEndsAt={summaryStats.earliestClearingEndsAt}
            canStillFlag={summaryStats.canStillFlag}
          />
        )}

        {/* Desktop Table */}
        {requests.length > 0 && <div className="hidden md:block">
          {/* Filter Bar */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted px-3 text-sm">
                  {sortBy === "highest" ? "Highest paid out" : sortBy === "lowest" ? "Lowest paid out" : sortBy === "deadline_soon" ? "Deadline ending soon" : "Deadline ending later"}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground" onClick={() => setSortBy("highest")}>Highest paid out</DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground" onClick={() => setSortBy("lowest")}>Lowest paid out</DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground" onClick={() => setSortBy("deadline_soon")}>Deadline ending soon</DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground" onClick={() => setSortBy("deadline_later")}>Deadline ending later</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted px-3 text-sm">
                  {statusFilter === "all" ? "All statuses" : statusFilter === "clearing" ? "In Review" : statusFilter === "completed" ? "Approved" : statusFilter === "flagged" ? "Flagged" : "Cancelled"}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground" onClick={() => setStatusFilter("all")}>All statuses</DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground" onClick={() => setStatusFilter("clearing")}>In Review</DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground" onClick={() => setStatusFilter("completed")}>Approved</DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground" onClick={() => setStatusFilter("flagged")}>Flagged</DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground" onClick={() => setStatusFilter("cancelled")}>Cancelled</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {filteredRequests.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">
              No payouts match your search criteria
            </div> : <div className="rounded-lg overflow-hidden border border-border/40 bg-background">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5 pl-4">Creator</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Amount</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Items</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Clearing</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Status</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5 text-right pr-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request, index) => {
                const isExpanded = expandedRequest === request.id;
                const isLast = index === filteredRequests.length - 1;
                const {
                  items: displayItems,
                  total: displayTotal,
                  otherCount
                } = getFilteredItemsForRequest(request);
                const flaggedItems = displayItems.filter(i => i.flagged_at) || [];
                const approvedItems = displayItems.filter(i => i.status === 'approved') || [];
                const hasPendingItems = displayItems.some(i => i.status !== 'approved');
                return <>
                    <TableRow key={request.id} className={`hover:bg-muted/20 transition-colors cursor-pointer ${!isLast && !isExpanded ? 'border-b border-border/50' : 'border-0'}`} onClick={() => setExpandedRequest(isExpanded ? null : request.id)}>
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={request.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {request.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{request.profiles?.username || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(request.created_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-lg font-semibold">${displayTotal.toFixed(2)}</span>
                          {otherCount > 0 && <span className="text-xs text-muted-foreground">
                              +{otherCount} other {otherCount === 1 ? 'item' : 'items'}
                            </span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{displayItems.length} submissions</span>
                          {approvedItems.length > 0 && approvedItems.length < displayItems.length && <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-xs">
                              {approvedItems.length} approved
                            </Badge>}
                          {flaggedItems.length > 0 && <Badge variant="outline" className="text-amber-500 border-transparent text-xs gap-1">
                              <img src={flagAmberIcon} alt="" className="h-3 w-3" />
                              {flaggedItems.length} flagged
                            </Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {!hasPendingItems ? <div className="text-xs text-muted-foreground">—</div> : <div className="w-32">
                            <Progress value={getClearingProgress(request)} className="h-1.5" />
                            <div className="text-xs text-muted-foreground mt-1">
                              {request.status === 'completed' ? 'Completed' : `Clears ${formatDistanceToNow(new Date(request.clearing_ends_at), {
                            addSuffix: true
                          })}`}
                            </div>
                          </div>}
                      </TableCell>
                      <TableCell className="py-3">
                        {!hasPendingItems ? null : getStatusBadge(request)}
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          {request.status !== 'completed' && request.status !== 'cancelled' && hasPendingItems && <Button variant="default" size="sm" className="h-7 text-xs gap-1" disabled={approvingRequest === request.id} onClick={e => {
                          e.stopPropagation();
                          handleApprovePayout(request);
                        }}>
                              
                              {approvingRequest === request.id ? 'Approving...' : `Approve $${displayTotal.toFixed(2)}`}
                            </Button>}
                          {!hasPendingItems && displayItems.length > 0 && <Badge className="bg-emerald-500/10 text-emerald-500 border-transparent text-xs hover:bg-emerald-500/10">
                              Approved
                            </Badge>}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Items */}
                    {isExpanded && <TableRow className={`bg-muted/10 ${!isLast ? 'border-b border-border/50' : ''}`}>
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-xs font-medium text-muted-foreground">
                                Submission Items ({displayItems.length})
                              </div>
                              {otherCount > 0 && <span className="text-xs text-muted-foreground">
                                  {otherCount} more {otherCount === 1 ? 'item' : 'items'} in other campaigns
                                </span>}
                            </div>
                            <div className="grid gap-3">
                              {displayItems.map(item => {
                            const platformIcon = getPlatformIcon(item.video_submission?.platform || null);
                            const isFlagged = !!item.flagged_at;
                            const isApproved = item.status === 'approved';
                            return <div key={item.id} className={`group rounded-xl border overflow-hidden transition-all hover:border-border/60 ${isApproved ? 'bg-emerald-500/5 border-emerald-500/20' : isFlagged ? 'bg-amber-500/5 border-amber-500/20' : 'bg-card/40 border-border/40'}`}>
                                    {/* Main Content - Horizontal Layout */}
                                    <div className="flex gap-4 p-4">
                                      {/* 9:16 Video Thumbnail */}
                                      <a href={item.video_submission?.video_url} target="_blank" rel="noopener noreferrer" className="relative w-16 h-[90px] rounded-lg overflow-hidden bg-muted/30 flex-shrink-0 group/thumb" onClick={e => e.stopPropagation()}>
                                        {item.video_submission?.video_thumbnail_url ? <img src={item.video_submission.video_thumbnail_url} alt={item.video_submission?.video_title || "Video"} className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105" /> : <div className="w-full h-full flex items-center justify-center">
                                            {platformIcon && <img src={platformIcon} alt="" className="w-5 h-5 opacity-40" />}
                                          </div>}
                                        {/* Platform badge */}
                                        <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-black/60 flex items-center justify-center">
                                          {platformIcon && <img src={platformIcon} alt="" className="h-2.5 w-2.5" />}
                                        </div>
                                      </a>

                                      {/* Video Details */}
                                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        {/* Top: Title & Amount */}
                                        <div>
                                          <div className="flex items-start justify-between gap-2 mb-1">
                                            <a href={item.video_submission?.video_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium tracking-[-0.3px] line-clamp-2 hover:underline transition-all" onClick={e => e.stopPropagation()}>
                                              {item.video_submission?.video_title || item.video_submission?.video_description || 'Untitled Video'}
                                            </a>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              {isApproved && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0 h-5">
                                                  Paid
                                                </Badge>}
                                              <span className="text-sm font-semibold text-emerald-500 tabular-nums">
                                                ${item.amount.toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {/* Description */}
                                          {item.video_submission?.video_description && item.video_submission?.video_title && <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                                              {item.video_submission.video_description}
                                            </p>}
                                          
                                          {/* Author info */}
                                          <div className="flex items-center gap-2">
                                            {item.video_submission?.video_author_avatar ? <img src={item.video_submission.video_author_avatar} alt="" className="h-4 w-4 rounded-full" /> : <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                                                <span className="text-[8px] font-medium">
                                                  {(item.video_submission?.video_author_username || 'U')[0].toUpperCase()}
                                                </span>
                                              </div>}
                                            <span className="text-xs text-muted-foreground">
                                              @{item.video_submission?.video_author_username || 'unknown'}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Bottom: Metrics Row */}
                                        <div className="flex items-center justify-between mt-2">
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground" style={{
                                      letterSpacing: '-0.05em'
                                    }}>
                                            <div className="flex items-center gap-1">
                                              <span className="font-medium text-foreground tabular-nums">
                                                {item.video_submission?.views?.toLocaleString() || 0}
                                              </span>
                                              <span>views</span>
                                            </div>
                                            {item.video_submission?.likes !== undefined && item.video_submission?.likes !== null && <div className="flex items-center gap-1">
                                                <span className="font-medium text-foreground tabular-nums">
                                                  {item.video_submission.likes.toLocaleString()}
                                                </span>
                                                <span>likes</span>
                                              </div>}
                                          </div>
                                          
                                          {/* Actions */}
                                          <div className="flex items-center gap-1">
                                            {isFlagged ? <Tooltip>
                                                <TooltipTrigger>
                                                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                                                    <Flag className="h-2.5 w-2.5 mr-1" />
                                                    Flagged
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>{item.flag_reason || 'Flagged for review'}</p>
                                                </TooltipContent>
                                              </Tooltip> : request.status === 'clearing' && <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/50 px-2.5 gap-1.5 transition-colors" 
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  openFlagDialog(item.id);
                                                }} 
                                                disabled={flaggingItem === item.id}
                                              >
                                                <Flag className="h-3 w-3" />
                                                Flag
                                              </Button>}
                                            
                                            
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>;
                          })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>}
                  </>;
              })}
            </TableBody>
          </Table>
          </div>}
        </div>}

        {/* Mobile Cards */}
        {requests.length > 0 && <div className="md:hidden space-y-3">
          {/* Mobile Search and Filter */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by creator or amount..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="clearing">Clearing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredRequests.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">
              No payouts match your search criteria
            </div> : filteredRequests.map(request => {
          const {
            items: displayItems,
            total: displayTotal,
            otherCount
          } = getFilteredItemsForRequest(request);
          const flaggedItems = displayItems.filter(i => i.flagged_at) || [];
          const hasPendingItems = displayItems.some(i => i.status !== 'approved');
          return <Card key={request.id} className="bg-card/50 border-border/50" onClick={() => {
            setSelectedRequest(request);
            setDetailsDialogOpen(true);
          }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={request.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted text-xs">
                            {request.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{request.profiles?.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(request.created_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(request)}
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold">${displayTotal.toFixed(2)}</span>
                        {otherCount > 0 && <span className="text-xs text-muted-foreground">
                            +{otherCount} other {otherCount === 1 ? 'item' : 'items'}
                          </span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {displayItems.length} items
                        {flaggedItems.length > 0 && <span className="text-amber-500 ml-1">({flaggedItems.length} flagged)</span>}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <Progress value={getClearingProgress(request)} className="h-1.5 mb-1" />
                      <div className="text-xs text-muted-foreground">
                        {request.status === 'completed' ? 'Completed' : `Clears ${formatDistanceToNow(new Date(request.clearing_ends_at), {
                    addSuffix: true
                  })}`}
                      </div>
                    </div>

                    {request.status !== 'completed' && request.status !== 'cancelled' && hasPendingItems && <Button variant="default" size="sm" className="w-full h-8 text-xs gap-1" disabled={approvingRequest === request.id} onClick={e => {
                e.stopPropagation();
                handleApprovePayout(request);
              }}>
                        <CheckCircle className="h-3 w-3" />
                        {approvingRequest === request.id ? 'Approving...' : `Approve $${displayTotal.toFixed(2)}`}
                      </Button>}
                    {!hasPendingItems && displayItems.length > 0 && <Badge className="w-full justify-center bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs py-1">
                        Approved
                      </Badge>}
                  </CardContent>
                </Card>;
        })}
        </div>}

        {/* Boost Transactions History */}
        {transactions.length > 0 && <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Completed Payments</h3>
            <div className="rounded-lg overflow-hidden border border-border/40 bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium text-xs py-2.5 pl-4">Date</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Creator</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Description</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-xs py-2.5 text-right pr-4">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, index) => {
                const isLast = index === transactions.length - 1;
                return <TableRow key={txn.id} className={`hover:bg-muted/10 transition-colors ${!isLast ? 'border-b border-border/40' : 'border-0'}`}>
                        <TableCell className="py-3 pl-4">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(txn.created_at), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={txn.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {txn.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{txn.profiles?.username || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-muted-foreground">
                            {txn.description || 'Boost payout'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right pr-4">
                          <span className="text-sm font-semibold text-emerald-500">
                            ${Math.abs(txn.amount).toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>;
              })}
                </TableBody>
              </Table>
            </div>
          </div>}

        {/* Mobile Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Payout Request Details
              </DialogTitle>
              <DialogDescription>
                {selectedRequest && <span>
                    Requested on {format(new Date(selectedRequest.created_at), 'MMM d, yyyy')}
                  </span>}
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && <div className="space-y-4 mt-4">
                {/* Creator Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedRequest.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted">
                      {selectedRequest.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedRequest.profiles?.username}</div>
                    <div className="text-sm text-muted-foreground">
                      ${selectedRequest.total_amount.toFixed(2)} • {selectedRequest.items?.length} items
                    </div>
                  </div>
                  {getStatusBadge(selectedRequest)}
                </div>
                
                {/* Clearing Progress */}
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-2">Clearing Progress</div>
                  <Progress value={getClearingProgress(selectedRequest)} className="h-2 mb-2" />
                  <div className="text-sm">
                    {selectedRequest.status === 'completed' ? 'Payout completed' : `Clearing ends ${formatDistanceToNow(new Date(selectedRequest.clearing_ends_at), {
                  addSuffix: true
                })}`}
                  </div>
                </div>
                
                {/* Items */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Submissions</div>
                  {selectedRequest.items?.map(item => {
                const platformIcon = getPlatformIcon(item.video_submission?.platform || null);
                const isFlagged = !!item.flagged_at;
                return <div key={item.id} className={`p-3 rounded-lg border ${isFlagged ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/20 border-border/30'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                            {item.video_submission?.video_thumbnail_url ? <img src={item.video_submission.video_thumbnail_url} alt="" className="w-full h-full object-cover" /> : platformIcon ? <div className="w-full h-full flex items-center justify-center">
                                <img src={platformIcon} alt="" className="h-4 w-4 opacity-50" />
                              </div> : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">
                              @{item.video_submission?.video_author_username || 'unknown'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.video_submission?.views?.toLocaleString() || 0} views
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">${item.amount.toFixed(2)}</div>
                            {isFlagged && <Badge className="bg-amber-500/10 text-amber-500 text-xs mt-1">
                                Flagged
                              </Badge>}
                          </div>
                        </div>
                      </div>;
              })}
                </div>
              </div>}
          </DialogContent>
        </Dialog>

        {/* Flag Reason Dialog */}
        <Dialog open={flagDialogOpen} onOpenChange={(open) => {
          setFlagDialogOpen(open);
          if (!open) {
            setFlagItemId(null);
            setFlagReason("");
            setSelectedFlagReason(null);
          }
        }}>
          <DialogContent className="sm:max-w-md border-0 bg-card/95 backdrop-blur-sm shadow-xl">
            <DialogHeader className="flex-row items-center gap-2.5 space-y-0">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-500/10">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <DialogTitle className="text-sm font-medium tracking-[-0.5px]">Flag this payout?</DialogTitle>
              <div className="flex-1" />
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-7 text-xs font-medium tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90"
                onClick={submitFlag}
                disabled={flaggingItem !== null || (!flagReason.trim() && !selectedFlagReason)}
              >
                Give reason
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs font-medium tracking-[-0.5px] text-muted-foreground hover:text-foreground"
                onClick={() => setFlagDialogOpen(false)}
              >
                Cancel
              </Button>
            </DialogHeader>
            
            <div className="space-y-3 pt-1">
              <Input 
                placeholder="Reason for flagging..." 
                value={flagReason}
                onChange={(e) => {
                  setFlagReason(e.target.value);
                  if (e.target.value.trim()) {
                    setSelectedFlagReason(null);
                  }
                }}
                className="h-10 border-0 bg-muted/50 text-sm tracking-[-0.5px] placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-border"
              />
              
              <div className="flex flex-wrap gap-2">
                {FLAG_REASON_OPTIONS.map((reason) => (
                  <Button
                    key={reason}
                    variant="ghost"
                    size="sm"
                    className={`h-8 text-xs font-medium tracking-[-0.5px] rounded-full px-3.5 ${
                      selectedFlagReason === reason 
                        ? "bg-foreground text-background hover:bg-foreground/90" 
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => {
                      setSelectedFlagReason(selectedFlagReason === reason ? null : reason);
                      if (selectedFlagReason !== reason) {
                        setFlagReason("");
                      }
                    }}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>;
}