import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";
import { Clock, CheckCircle, AlertTriangle, Flag, DollarSign, ChevronDown, ChevronUp, ExternalLink, User } from "lucide-react";
import { toast } from "sonner";
import creditCardIcon from "@/assets/credit-card-icon.svg";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
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
  video_submission?: {
    video_url: string;
    video_title: string | null;
    video_thumbnail_url: string | null;
    platform: string | null;
    views: number | null;
    video_author_username: string | null;
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
      } = await supabase.from('video_submissions').select('id, video_url, video_title, video_thumbnail_url, platform, views, video_author_username').in('id', itemSubmissionIds);

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
      fetchPayoutRequests();
    } catch (error) {
      console.error('Error flagging item:', error);
      toast.error('Failed to flag item');
    } finally {
      setFlaggingItem(null);
    }
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
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1">
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
  if (loading) {
    return <Card className="bg-card border-0">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>)}
          </div>
        </CardContent>
      </Card>;
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
      <div className="space-y-6 font-['Inter'] tracking-[-0.5px]">

        {/* Desktop Table */}
        {requests.length > 0 && <div className="hidden md:block">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Payout Requests</h3>
          <div className="rounded-lg overflow-hidden border border-border/40 bg-background">
          <Table>
            
            <TableBody>
              {requests.map((request, index) => {
                const isExpanded = expandedRequest === request.id;
                const isLast = index === requests.length - 1;
                const flaggedItems = request.items?.filter(i => i.flagged_at) || [];
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
                        <span className="text-lg font-semibold">${request.total_amount.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{request.items?.length || 0} submissions</span>
                          {flaggedItems.length > 0 && <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                              {flaggedItems.length} flagged
                            </Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="w-32">
                          <Progress value={getClearingProgress(request)} className="h-1.5" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {request.status === 'completed' ? 'Completed' : `Clears ${formatDistanceToNow(new Date(request.clearing_ends_at), {
                            addSuffix: true
                          })}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {getStatusBadge(request)}
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Items */}
                    {isExpanded && <TableRow className={`bg-muted/10 ${!isLast ? 'border-b border-border/50' : ''}`}>
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-4 space-y-2">
                            <div className="text-xs font-medium text-muted-foreground mb-3">Submission Items</div>
                            <div className="grid gap-2">
                              {request.items?.map(item => {
                            const platformIcon = getPlatformIcon(item.video_submission?.platform || null);
                            const isFlagged = !!item.flagged_at;
                            return <div key={item.id} className={`flex items-center gap-4 p-3 rounded-lg border ${isFlagged ? 'bg-amber-500/5 border-amber-500/20' : 'bg-background/50 border-border/30'}`}>
                                    {/* Thumbnail */}
                                    <div className="w-16 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                                      {item.video_submission?.video_thumbnail_url ? <img src={item.video_submission.video_thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
                                          {platformIcon && <img src={platformIcon} alt="" className="h-5 w-5 opacity-50" />}
                                        </div>}
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        {platformIcon && <img src={platformIcon} alt="" className="h-4 w-4" />}
                                        <span className="text-sm font-medium truncate">
                                          {item.video_submission?.video_title || item.video_submission?.video_url || 'Video'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        @{item.video_submission?.video_author_username || 'unknown'} • {item.video_submission?.views?.toLocaleString() || 0} views
                                      </div>
                                    </div>
                                    
                                    {/* Amount */}
                                    <div className="text-right">
                                      <div className="text-sm font-semibold">${item.amount.toFixed(2)}</div>
                                    </div>
                                    
                                    {/* Flag Status / Action */}
                                    <div className="flex items-center gap-2">
                                      {isFlagged ? <Tooltip>
                                          <TooltipTrigger>
                                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                              <Flag className="h-3 w-3 mr-1" />
                                              Flagged
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{item.flag_reason || 'Flagged for review'}</p>
                                          </TooltipContent>
                                        </Tooltip> : request.status === 'clearing' && <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-amber-500" onClick={e => {
                                  e.stopPropagation();
                                  handleFlagItem(item.id, 'Flagged by brand for review');
                                }} disabled={flaggingItem === item.id}>
                                            <Flag className="h-3 w-3 mr-1" />
                                            Flag
                                          </Button>}
                                      
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => {
                                  e.stopPropagation();
                                  window.open(item.video_submission?.video_url, '_blank');
                                }}>
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Button>
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
          </div>
        </div>}

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {requests.map(request => {
          const flaggedItems = request.items?.filter(i => i.flagged_at) || [];
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
                    <span className="text-2xl font-bold">${request.total_amount.toFixed(2)}</span>
                    <div className="text-sm text-muted-foreground">
                      {request.items?.length || 0} items
                      {flaggedItems.length > 0 && <span className="text-amber-500 ml-1">({flaggedItems.length} flagged)</span>}
                    </div>
                  </div>
                  
                  <div>
                    <Progress value={getClearingProgress(request)} className="h-1.5 mb-1" />
                    <div className="text-xs text-muted-foreground">
                      {request.status === 'completed' ? 'Completed' : `Clears ${formatDistanceToNow(new Date(request.clearing_ends_at), {
                    addSuffix: true
                  })}`}
                    </div>
                  </div>
                </CardContent>
              </Card>;
        })}
        </div>

        {/* Boost Transactions History */}
        {transactions.length > 0 && <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Completed Payments</h3>
            <div className="rounded-lg overflow-hidden border border-border/40 bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent bg-muted/30">
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
      </div>
    </TooltipProvider>;
}