import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, subDays, startOfMonth } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DollarSign, Clock, CheckCircle2, XCircle, Wallet, TrendingUp,
  ChevronDown, ChevronUp, RotateCcw, Copy, Search, X, ArrowUpRight,
  ArrowDownRight, Calendar, CreditCard, AlertTriangle,
  Coins, ExternalLink
} from "lucide-react";
import { PageLoading } from "@/components/ui/loading-bar";
import { CryptoPayoutDialog } from "@/components/admin/CryptoPayoutDialog";
import { useTreasuryBalance, formatUsdcBalance } from "@/hooks/useTreasuryBalance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'in_transit' | 'rejected' | 'completed';
  payout_method: string;
  payout_details: any;
  requested_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  transaction_id: string | null;
  notes: string | null;
  // Crypto payout fields
  tx_signature: string | null;
  tx_confirmed_at: string | null;
  blockchain_network: string | null;
  crypto_amount: number | null;
  wallet_address: string | null;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
    id: string;
    wallets?: {
      balance: number;
      total_earned: number;
      total_withdrawn: number;
    };
  };
}

interface FinanceStats {
  totalProcessed: number;
  totalPending: number;
  thisMonthProcessed: number;
  pendingCount: number;
  completedCount: number;
  rejectedCount: number;
  avgPayoutAmount: number;
  change: number;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number;
  is_verified: boolean;
  account_link: string;
  social_account_campaigns?: {
    campaigns: {
      id: string;
      title: string;
      brand_name: string;
      brand_logo_url: string;
    };
  }[];
}

type StatusFilter = 'all' | 'pending' | 'in_transit' | 'completed' | 'rejected';

export default function AdminPayouts() {
  const [allRequests, setAllRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'complete' | 'revert' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [userSocialAccounts, setUserSocialAccounts] = useState<SocialAccount[]>([]);
  const [loadingSocialAccounts, setLoadingSocialAccounts] = useState(false);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [userPaymentMethods, setUserPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [socialAccountsOpen, setSocialAccountsOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<PayoutRequest['profiles'] | null>(null);
  const [cryptoPayoutDialogOpen, setCryptoPayoutDialogOpen] = useState(false);
  const [selectedCryptoRequest, setSelectedCryptoRequest] = useState<PayoutRequest | null>(null);
  const { toast } = useToast();
  const { usdcBalance, solBalance, treasuryAddress, loading: treasuryLoading } = useTreasuryBalance();

  useEffect(() => {
    fetchPayoutRequests();
  }, []);

  const fetchPayoutRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payout_requests")
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          wallets (
            balance,
            total_earned,
            total_withdrawn
          )
        )
      `)
      .order("requested_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payout requests"
      });
    } else {
      setAllRequests(data as any || []);
    }
    setLoading(false);
  };

  // Calculate stats
  const stats = useMemo((): FinanceStats => {
    const monthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subDays(monthStart, 1));

    const completed = allRequests.filter(r => r.status === 'completed');
    const pending = allRequests.filter(r => r.status === 'pending');
    const thisMonth = completed.filter(r => new Date(r.processed_at || r.requested_at) >= monthStart);
    const lastMonth = completed.filter(r => {
      const date = new Date(r.processed_at || r.requested_at);
      return date >= lastMonthStart && date < monthStart;
    });

    const thisMonthTotal = thisMonth.reduce((sum, r) => sum + Number(r.amount), 0);
    const lastMonthTotal = lastMonth.reduce((sum, r) => sum + Number(r.amount), 0);
    const change = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return {
      totalProcessed: completed.reduce((sum, r) => sum + Number(r.amount), 0),
      totalPending: pending.reduce((sum, r) => sum + Number(r.amount), 0),
      thisMonthProcessed: thisMonthTotal,
      pendingCount: pending.length,
      completedCount: completed.length,
      rejectedCount: allRequests.filter(r => r.status === 'rejected').length,
      avgPayoutAmount: completed.length > 0 ? completed.reduce((sum, r) => sum + Number(r.amount), 0) / completed.length : 0,
      change
    };
  }, [allRequests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let filtered = allRequests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(r => r.payout_method === paymentMethodFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.profiles?.username?.toLowerCase().includes(query) ||
        r.profiles?.full_name?.toLowerCase().includes(query) ||
        r.payout_details?.email?.toLowerCase().includes(query) ||
        r.payout_details?.address?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allRequests, statusFilter, paymentMethodFilter, searchQuery]);

  const statusCounts = useMemo(() => ({
    all: allRequests.length,
    pending: allRequests.filter(r => r.status === 'pending').length,
    in_transit: allRequests.filter(r => r.status === 'in_transit').length,
    completed: allRequests.filter(r => r.status === 'completed').length,
    rejected: allRequests.filter(r => r.status === 'rejected').length,
  }), [allRequests]);

  const fetchUserSocialAccounts = async (userId: string) => {
    setLoadingSocialAccounts(true);
    const { data, error } = await supabase
      .from("social_accounts")
      .select(`
        *,
        social_account_campaigns (
          campaigns (
            id, title, brand_name, brand_logo_url
          )
        ),
        demographic_submissions (
          status, tier1_percentage, submitted_at
        )
      `)
      .eq("user_id", userId);

    if (!error) setUserSocialAccounts(data || []);
    setLoadingSocialAccounts(false);
  };

  const fetchUserTransactions = async (userId: string) => {
    setLoadingTransactions(true);
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error) setUserTransactions(data || []);
    setLoadingTransactions(false);
  };

  const fetchUserPaymentMethods = async (userId: string) => {
    setLoadingPaymentMethods(true);
    const { data, error } = await supabase
      .from("wallets")
      .select("payout_method, payout_details")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data?.payout_details && Array.isArray(data.payout_details)) {
      setUserPaymentMethods(data.payout_details);
    } else if (!error && data?.payout_method) {
      setUserPaymentMethods([{ method: data.payout_method, details: {} }]);
    } else {
      setUserPaymentMethods([]);
    }
    setLoadingPaymentMethods(false);
  };

  const openUserDetailsDialog = (profile: PayoutRequest['profiles']) => {
    setSelectedUserProfile(profile);
    setUserDetailsDialogOpen(true);
    fetchUserSocialAccounts(profile.id);
    fetchUserTransactions(profile.id);
    fetchUserPaymentMethods(profile.id);
  };

  const openPayoutDetails = (request: PayoutRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const openCryptoPayoutDialog = (request: PayoutRequest) => {
    setSelectedCryptoRequest(request);
    setCryptoPayoutDialogOpen(true);
  };

  const openActionDialog = (request: PayoutRequest, actionType: 'approve' | 'reject' | 'complete' | 'revert') => {
    setSelectedRequest(request);
    setAction(actionType);
    setRejectionReason('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleCompleteDirectly = async (request: PayoutRequest) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: pendingTransaction } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", request.user_id)
      .eq("type", "withdrawal")
      .eq("amount", -Number(request.amount))
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingTransaction) {
      await supabase
        .from("wallet_transactions")
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq("id", pendingTransaction.id);
    }

    const { error } = await supabase
      .from("payout_requests")
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        processed_by: session.user.id
      })
      .eq("id", request.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to complete payout" });
    } else {
      toast({ title: "Success", description: "Payout completed" });
      fetchPayoutRequests();
      setDetailsOpen(false);
    }
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !action) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let updateData: any = {
      processed_at: new Date().toISOString(),
      processed_by: session.user.id,
      notes: notes || null
    };

    if (action === 'approve') {
      updateData.status = 'in_transit';
    } else if (action === 'reject') {
      if (!rejectionReason) {
        toast({ variant: "destructive", title: "Error", description: "Please provide a rejection reason" });
        return;
      }
      updateData.status = 'rejected';
      updateData.rejection_reason = rejectionReason;

      // Handle wallet restoration for rejection
      const { data: pendingTransaction } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("user_id", selectedRequest.user_id)
        .eq("type", "withdrawal")
        .eq("amount", -Number(selectedRequest.amount))
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingTransaction) {
        await supabase
          .from("wallet_transactions")
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq("id", pendingTransaction.id);

        const { data: walletData } = await supabase
          .from("wallets")
          .select("balance, total_withdrawn")
          .eq("user_id", selectedRequest.user_id)
          .single();

        if (walletData) {
          await supabase
            .from("wallets")
            .update({
              balance: Number(walletData.balance) + Number(selectedRequest.amount),
              total_withdrawn: Math.max(0, Number(walletData.total_withdrawn) - Number(selectedRequest.amount))
            })
            .eq("user_id", selectedRequest.user_id);
        }
      }
    } else if (action === 'revert') {
      let newStatus: 'pending' | 'in_transit' = 'pending';

      if (selectedRequest.status === 'completed') {
        newStatus = 'in_transit';

        const { data: walletData } = await supabase
          .from("wallets")
          .select("balance, total_withdrawn")
          .eq("user_id", selectedRequest.user_id)
          .single();

        if (walletData) {
          await supabase
            .from("wallets")
            .update({
              balance: Number(walletData.balance) + Number(selectedRequest.amount),
              total_withdrawn: Number(walletData.total_withdrawn) - Number(selectedRequest.amount)
            })
            .eq("user_id", selectedRequest.user_id);
        }
      }

      updateData.status = newStatus;
      updateData.rejection_reason = null;
    }

    const { error } = await supabase
      .from("payout_requests")
      .update(updateData)
      .eq("id", selectedRequest.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: `Failed to ${action} payout` });
    } else {
      toast({ title: "Success", description: `Payout ${action}d successfully` });
      setDialogOpen(false);
      setDetailsOpen(false);
      fetchPayoutRequests();
    }
  };

  const getPaymentInfo = (request: PayoutRequest) => {
    if (request.payout_method === 'crypto') {
      return request.payout_details?.address || request.payout_details?.wallet_address || 'N/A';
    } else if (request.payout_method === 'upi') {
      return request.payout_details?.upi_id || 'N/A';
    } else if (request.payout_method === 'wise') {
      return request.payout_details?.account_holder_name || request.payout_details?.email || 'N/A';
    }
    return request.payout_details?.email || request.payout_details?.account_number || 'N/A';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Copied to clipboard" });
  };

  const getNetAmount = (request: PayoutRequest) => {
    const amount = Number(request.amount);
    if (request.payout_method === 'paypal') {
      return amount - (amount * 0.06);
    }
    return amount - (amount * 0.0075) - 1;
  };

  return (
    <AdminPermissionGuard resource="payouts">
      <div className="h-full flex flex-col overflow-hidden">
        {/* Stats Header */}
        <div className="p-6 border-b border-border/50 bg-card/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold font-inter tracking-[-0.5px]">Finance</h1>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                  Manage payouts and track financial metrics
                </p>
              </div>
              <Button onClick={fetchPayoutRequests} variant="outline" size="sm" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-card/50 rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-inter">Total Processed</span>
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold font-inter tracking-[-0.5px]">
                  ${stats.totalProcessed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground font-inter">{stats.completedCount} payouts</p>
              </div>

              <div className="bg-card/50 rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-inter">Pending</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold font-inter tracking-[-0.5px] text-amber-500">
                  ${stats.totalPending.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground font-inter">{stats.pendingCount} requests</p>
              </div>

              <div className="bg-card/50 rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-inter">This Month</span>
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold font-inter tracking-[-0.5px]">
                  ${stats.thisMonthProcessed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <div className="flex items-center gap-1">
                  {stats.change >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-rose-500" />
                  )}
                  <span className={cn(
                    "text-xs font-inter",
                    stats.change >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {Math.abs(stats.change).toFixed(0)}% vs last month
                  </span>
                </div>
              </div>

              <div className="bg-card/50 rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-inter">Avg Payout</span>
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                </div>
                <p className="text-2xl font-bold font-inter tracking-[-0.5px]">
                  ${stats.avgPayoutAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground font-inter">{stats.rejectedCount} rejected</p>
              </div>

              <div className="bg-card/50 rounded-xl p-4 border border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-inter">Treasury</span>
                  <Coins className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold font-inter tracking-[-0.5px] text-amber-500">
                  {treasuryLoading ? "..." : formatUsdcBalance(usdcBalance)}
                </p>
                <p className="text-xs text-muted-foreground font-inter">
                  USDC on Solana
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-border/50 bg-background/50">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
              {(['pending', 'in_transit', 'completed', 'rejected', 'all'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium font-inter tracking-[-0.3px] transition-all",
                    statusFilter === status
                      ? status === 'pending' ? "bg-amber-500/20 text-amber-500"
                        : status === 'in_transit' ? "bg-blue-500/20 text-blue-500"
                        : status === 'completed' ? "bg-emerald-500/20 text-emerald-500"
                        : status === 'rejected' ? "bg-rose-500/20 text-rose-500"
                        : "bg-card text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {status === 'in_transit' ? 'In Transit' : status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-1.5 opacity-60">{statusCounts[status]}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/30 border-0 font-inter text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* Payment Method Filter */}
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-muted/30 border-0 text-sm font-inter">
                <CreditCard className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="wise">Wise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-7xl mx-auto p-6">
              {loading ? (
                <PageLoading text="Loading payouts..." />
              ) : filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No requests found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {statusFilter !== 'all' ? `No ${statusFilter} payout requests` : 'No payout requests yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground font-inter">
                    <div className="col-span-4">User</div>
                    <div className="col-span-2">Method</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {/* Table Rows */}
                  {filteredRequests.map((request) => (
                    <div
                      key={request.id}
                      className={cn(
                        "grid grid-cols-12 gap-4 px-4 py-3 rounded-xl items-center cursor-pointer transition-colors",
                        "bg-card/50 hover:bg-card border border-transparent hover:border-border/50",
                        selectedRequest?.id === request.id && "border-primary/50 bg-primary/5"
                      )}
                      onClick={() => openPayoutDetails(request)}
                    >
                      {/* User */}
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={request.profiles?.avatar_url || ''} />
                          <AvatarFallback className="text-xs font-medium bg-muted">
                            {(request.profiles?.username || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium font-inter truncate">
                            {request.profiles?.full_name || request.profiles?.username}
                          </p>
                          <p className="text-xs text-muted-foreground font-inter truncate">
                            {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {/* Method */}
                      <div className="col-span-2">
                        <Badge variant="secondary" className="capitalize font-inter text-xs">
                          {request.payout_method === 'crypto' && request.payout_details?.network
                            ? request.payout_details.network
                            : request.payout_method}
                        </Badge>
                      </div>

                      {/* Amount */}
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold font-inter">${Number(request.amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground font-inter">
                          → ${getNetAmount(request).toFixed(2)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-inter text-xs border-0",
                            request.status === 'pending' && "bg-amber-500/10 text-amber-500",
                            request.status === 'in_transit' && "bg-blue-500/10 text-blue-500",
                            request.status === 'completed' && "bg-emerald-500/10 text-emerald-500",
                            request.status === 'rejected' && "bg-rose-500/10 text-rose-500"
                          )}
                        >
                          {request.status === 'in_transit' ? 'In Transit' : request.status}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {request.status === 'pending' && (
                          <>
                            {request.payout_method === 'crypto' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openCryptoPayoutDialog(request)}
                                className="h-8 px-2 gap-1 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                              >
                                <Coins className="h-4 w-4" />
                                <span className="text-xs">USDC</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCompleteDirectly(request)}
                                className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openActionDialog(request, 'reject')}
                              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {request.status === 'in_transit' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCompleteDirectly(request)}
                            className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {(request.status === 'completed' || request.status === 'rejected' || request.status === 'in_transit') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openActionDialog(request, 'revert')}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Details Sheet */}
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent className="w-full sm:max-w-md p-0 border-l border-border/50">
            {selectedRequest && (
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                        onClick={() => selectedRequest.profiles && openUserDetailsDialog(selectedRequest.profiles)}
                      >
                        <AvatarImage src={selectedRequest.profiles?.avatar_url || ''} />
                        <AvatarFallback className="text-sm font-medium bg-muted">
                          {(selectedRequest.profiles?.username || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3
                          className="font-semibold font-inter cursor-pointer hover:text-primary transition-colors"
                          onClick={() => selectedRequest.profiles && openUserDetailsDialog(selectedRequest.profiles)}
                        >
                          {selectedRequest.profiles?.full_name || selectedRequest.profiles?.username}
                        </h3>
                        <p className="text-sm text-muted-foreground font-inter">
                          @{selectedRequest.profiles?.username}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "font-inter text-xs border-0",
                        selectedRequest.status === 'pending' && "bg-amber-500/10 text-amber-500",
                        selectedRequest.status === 'in_transit' && "bg-blue-500/10 text-blue-500",
                        selectedRequest.status === 'completed' && "bg-emerald-500/10 text-emerald-500",
                        selectedRequest.status === 'rejected' && "bg-rose-500/10 text-rose-500"
                      )}
                    >
                      {selectedRequest.status === 'in_transit' ? 'In Transit' : selectedRequest.status}
                    </Badge>
                  </div>

                  {/* Amount Card */}
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/20">
                    <p className="text-xs text-muted-foreground font-inter mb-1">Requested Amount</p>
                    <p className="text-3xl font-bold font-inter tracking-[-0.5px]">
                      ${Number(selectedRequest.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground font-inter mt-1">
                      Net: ${getNetAmount(selectedRequest).toFixed(2)} after fees
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <h4 className="text-sm font-medium font-inter text-muted-foreground">Payment Details</h4>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-inter">Method</span>
                        <Badge variant="secondary" className="capitalize">
                          {selectedRequest.payout_method}
                        </Badge>
                      </div>

                      {selectedRequest.payout_method === 'crypto' && selectedRequest.payout_details?.network && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-inter">Network</span>
                          <span className="text-sm font-medium font-inter">{selectedRequest.payout_details.network}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground font-inter shrink-0">
                          {selectedRequest.payout_method === 'crypto' ? 'Address' : 'Account'}
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-mono truncate">{getPaymentInfo(selectedRequest)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 shrink-0"
                            onClick={() => copyToClipboard(getPaymentInfo(selectedRequest))}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <h4 className="text-sm font-medium font-inter text-muted-foreground">Timeline</h4>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-inter">Requested</span>
                        <span className="text-sm font-inter">
                          {format(new Date(selectedRequest.requested_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>

                      {selectedRequest.processed_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-inter">Processed</span>
                          <span className="text-sm font-inter">
                            {format(new Date(selectedRequest.processed_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Wallet Info */}
                    {selectedRequest.profiles?.wallets && (
                      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-medium font-inter text-muted-foreground">User Wallet</h4>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-inter">Current Balance</span>
                          <span className="text-sm font-semibold font-inter">
                            ${Number(selectedRequest.profiles.wallets.balance).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-inter">Total Earned</span>
                          <span className="text-sm font-inter">
                            ${Number(selectedRequest.profiles.wallets.total_earned).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-inter">Total Withdrawn</span>
                          <span className="text-sm font-inter">
                            ${Number(selectedRequest.profiles.wallets.total_withdrawn).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {selectedRequest.rejection_reason && (
                      <div className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium font-inter text-rose-500">Rejection Reason</p>
                            <p className="text-sm text-rose-400 mt-1">{selectedRequest.rejection_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedRequest.notes && (
                      <div className="bg-muted/30 rounded-xl p-4">
                        <p className="text-sm font-medium font-inter text-muted-foreground mb-2">Notes</p>
                        <p className="text-sm font-inter">{selectedRequest.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Transaction Signature (for crypto payouts) */}
                  {selectedRequest.tx_signature && (
                    <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-emerald-500">Transaction Confirmed</span>
                        <a
                          href={`https://solscan.io/tx/${selectedRequest.tx_signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-500 hover:text-emerald-400"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-background p-2 rounded font-mono truncate">
                          {selectedRequest.tx_signature}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => copyToClipboard(selectedRequest.tx_signature!)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-border/50">
                    {selectedRequest.status === 'pending' && (
                      <>
                        {selectedRequest.payout_method === 'crypto' ? (
                          <Button
                            onClick={() => openCryptoPayoutDialog(selectedRequest)}
                            className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700"
                          >
                            <Coins className="h-4 w-4" />
                            Send USDC
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleCompleteDirectly(selectedRequest)}
                            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => openActionDialog(selectedRequest, 'reject')}
                          className="flex-1 gap-2 text-rose-500 hover:text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    {selectedRequest.status === 'in_transit' && (
                      <>
                        <Button
                          onClick={() => handleCompleteDirectly(selectedRequest)}
                          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openActionDialog(selectedRequest, 'revert')}
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Revert
                        </Button>
                      </>
                    )}
                    {(selectedRequest.status === 'completed' || selectedRequest.status === 'rejected') && (
                      <Button
                        variant="outline"
                        onClick={() => openActionDialog(selectedRequest, 'revert')}
                        className="w-full gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Revert Status
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>

        {/* Action Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-inter">
                {action === 'approve' && 'Approve Payout'}
                {action === 'reject' && 'Reject Payout'}
                {action === 'complete' && 'Complete Payout'}
                {action === 'revert' && 'Revert Status'}
              </DialogTitle>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground font-inter">Amount</p>
                  <p className="text-2xl font-bold font-inter">${Number(selectedRequest.amount).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground font-inter mt-1">
                    for @{selectedRequest.profiles?.username}
                  </p>
                </div>

                {action === 'reject' && (
                  <div className="space-y-2">
                    <Label htmlFor="reason" className="font-inter">Rejection Reason *</Label>
                    <Textarea
                      id="reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this request was rejected..."
                      className="font-inter"
                      rows={3}
                    />
                  </div>
                )}

                {action === 'revert' && (
                  <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                    <p className="text-sm text-amber-500 font-inter">
                      This will revert from <strong>{selectedRequest.status}</strong> to{' '}
                      <strong>
                        {selectedRequest.status === 'in_transit' ? 'pending' :
                         selectedRequest.status === 'completed' ? 'in transit' : 'pending'}
                      </strong>
                      {selectedRequest.status === 'completed' && (
                        <span className="block mt-2">The funds will be restored to the user's wallet.</span>
                      )}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes" className="font-inter">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes..."
                    className="font-inter"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleProcessRequest}
                    className={cn(
                      "flex-1",
                      action === 'reject' && "bg-rose-600 hover:bg-rose-700"
                    )}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* User Details Dialog */}
        <UserDetailsDialog
          open={userDetailsDialogOpen}
          onOpenChange={setUserDetailsDialogOpen}
          user={selectedUserProfile}
          socialAccounts={userSocialAccounts}
          transactions={userTransactions}
          paymentMethods={userPaymentMethods}
          loadingSocialAccounts={loadingSocialAccounts}
          loadingTransactions={loadingTransactions}
          loadingPaymentMethods={loadingPaymentMethods}
          socialAccountsOpen={socialAccountsOpen}
          onSocialAccountsOpenChange={setSocialAccountsOpen}
          transactionsOpen={transactionsOpen}
          onTransactionsOpenChange={setTransactionsOpen}
          paymentMethodsOpen={paymentMethodsOpen}
          onPaymentMethodsOpenChange={setPaymentMethodsOpen}
        />

        {/* Crypto Payout Dialog */}
        <CryptoPayoutDialog
          open={cryptoPayoutDialogOpen}
          onOpenChange={setCryptoPayoutDialogOpen}
          payoutRequest={selectedCryptoRequest}
          onSuccess={() => {
            fetchPayoutRequests();
            setDetailsOpen(false);
          }}
        />
      </div>
    </AdminPermissionGuard>
  );
}
