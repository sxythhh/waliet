import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Calendar as CalendarIcon, Loader2, Undo2, ChevronLeft, ChevronRight,
  Download, ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, DollarSign,
  Activity, Wallet, Clock, CheckCircle2, XCircle, RotateCcw, Copy, X,
  CreditCard, AlertTriangle, Coins, ExternalLink, ChevronDown, ChevronUp
} from "lucide-react";
import { PageLoading, LoadingBar, InlineLoading } from "@/components/ui/loading-bar";
import { format, subDays, subWeeks, subMonths, formatDistanceToNow, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek } from "date-fns";
import { OptimizedImage } from "@/components/OptimizedImage";
import { UserContextSheet } from "@/components/admin/UserContextSheet";
import { CryptoPayoutDialog } from "@/components/admin/CryptoPayoutDialog";
import { useTreasuryBalance, formatUsdcBalance, formatSolBalance } from "@/hooks/useTreasuryBalance";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { StatCard } from "@/components/admin/StatCard";
import { PayoutApprovals } from "@/components/admin/PayoutApprovals";
import { FinancialContextCard } from "@/components/admin/FinancialContextCard";
import { CampaignBudgetAdjustmentDialog } from "@/components/admin/CampaignBudgetAdjustmentDialog";
import instagramLogo from "@/assets/instagram-logo-white.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminEmptyState,
  AdminButton,
  AdminSearchInput,
  AdminTabs,
  TYPOGRAPHY,
  PADDING,
  BORDERS,
  BACKGROUNDS,
  TRANSITIONS,
  TABLE,
} from "@/components/admin/design-system";

interface TransactionMetadata {
  campaign_id?: string;
  platform?: string;
  reversed?: boolean;
  [key: string]: unknown;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  metadata: TransactionMetadata | null;
  created_at: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  campaign_name?: string;
  campaign_logo_url?: string;
  campaign_budget?: number | null;
  campaign_budget_used?: number | null;
}

interface PayoutDetails {
  address?: string;
  email?: string;
  network?: string;
  [key: string]: unknown;
}

interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'in_transit' | 'rejected' | 'completed';
  payout_method: string;
  payout_details: PayoutDetails | null;
  requested_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  tx_signature: string | null;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    wallets?: {
      balance: number;
      total_earned: number;
      total_withdrawn: number;
    };
  };
}

interface ProfileData {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
}

interface CampaignData {
  id: string;
  title: string;
  brand_logo_url: string | null;
  budget: number;
  budget_used: number;
}

interface WalletTransactionRow {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  metadata: TransactionMetadata | null;
  created_at: string;
}

interface UserWithWallet {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  wallets: {
    balance: number;
    total_earned: number;
    total_withdrawn: number;
  } | null;
}

interface SocialAccountRow {
  id: string;
  platform: string;
  username: string;
  followers_count: number;
  social_account_campaigns: { campaigns: { id: string; title: string; brand_name: string; brand_logo_url: string | null } | null }[];
  demographic_submissions: { status: string; tier1_percentage: number | null }[];
}

interface UserTransactionRow {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  created_at: string;
}

interface PaymentMethodRow {
  payout_method: string;
  payout_details: PayoutDetails[] | null;
}

type ViewMode = "all" | "transactions" | "payouts";
type ContextType = "transaction" | "payout" | null;
type DatePreset = "today" | "this_week" | "last_week" | "this_month" | "last_3_months" | "all_time" | "custom";

const ITEMS_PER_PAGE = 25;

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "all_time", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

function getDateRangeFromPreset(preset: DatePreset): { from: Date | undefined; to: Date | undefined } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case "last_week":
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return { from: lastWeekStart, to: lastWeekEnd };
    case "this_month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_3_months":
      return { from: subMonths(now, 3), to: endOfDay(now) };
    case "all_time":
    case "custom":
    default:
      return { from: undefined, to: undefined };
  }
}

export default function Finance() {
  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // View states
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all_time");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [customDatePickerOpen, setCustomDatePickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Handle date preset changes
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "custom") {
      setCustomDatePickerOpen(true);
    } else {
      const { from, to } = getDateRangeFromPreset(preset);
      setDateFrom(from);
      setDateTo(to);
      setCustomDatePickerOpen(false);
    }
  };

  // Context panel states
  const [contextOpen, setContextOpen] = useState(false);
  const [contextType, setContextType] = useState<ContextType>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);

  // Payout queue states
  const [payoutQueueExpanded, setPayoutQueueExpanded] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [payoutAction, setPayoutAction] = useState<'reject' | 'revert' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [cryptoPayoutDialogOpen, setCryptoPayoutDialogOpen] = useState(false);
  const [selectedCryptoRequest, setSelectedCryptoRequest] = useState<PayoutRequest | null>(null);

  // User details states
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithWallet | null>(null);
  const [userSocialAccounts, setUserSocialAccounts] = useState<SocialAccountRow[]>([]);
  const [loadingSocialAccounts, setLoadingSocialAccounts] = useState(false);
  const [userTransactions, setUserTransactions] = useState<UserTransactionRow[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [userPaymentMethods, setUserPaymentMethods] = useState<PayoutDetails[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [socialAccountsOpen, setSocialAccountsOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);

  // Processing states
  const [undoingTransaction, setUndoingTransaction] = useState<string | null>(null);
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);

  // Budget adjustment dialog
  const [budgetAdjustmentDialogOpen, setBudgetAdjustmentDialogOpen] = useState(false);

  const { toast } = useToast();
  const { usdcBalance, solBalance, loading: treasuryLoading } = useTreasuryBalance();

  // Filter transactions and payouts by date range
  const dateFilteredTransactions = useMemo(() => {
    if (!dateFrom && !dateTo) return transactions;
    return transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      if (dateFrom && txDate < dateFrom) return false;
      if (dateTo && txDate > dateTo) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  const dateFilteredPayouts = useMemo(() => {
    if (!dateFrom && !dateTo) return payoutRequests;
    return payoutRequests.filter(r => {
      const rDate = new Date(r.requested_at);
      if (dateFrom && rDate < dateFrom) return false;
      if (dateTo && rDate > dateTo) return false;
      return true;
    });
  }, [payoutRequests, dateFrom, dateTo]);

  // Calculate combined stats based on date filter
  const stats = useMemo(() => {
    // Transaction stats - use date filtered data
    const totalEarnings = dateFilteredTransactions.filter(tx => tx.type === 'earning').reduce((sum, tx) => sum + tx.amount, 0);
    const totalWithdrawals = dateFilteredTransactions.filter(tx => tx.type === 'withdrawal').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalVolume = dateFilteredTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    // Payout stats - use date filtered data
    const pendingPayouts = dateFilteredPayouts.filter(r => r.status === 'pending');
    const completedPayouts = dateFilteredPayouts.filter(r => r.status === 'completed');
    const totalPendingAmount = pendingPayouts.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalProcessed = completedPayouts.reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      totalEarnings,
      totalWithdrawals,
      totalVolume,
      transactionCount: dateFilteredTransactions.length,
      pendingPayoutsCount: pendingPayouts.length,
      totalPendingAmount,
      completedPayoutsCount: completedPayouts.length,
      totalProcessed,
    };
  }, [dateFilteredTransactions, dateFilteredPayouts]);

  const fetchTransactions = useCallback(async () => {
    try {
      let allTransactions: WalletTransactionRow[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("wallet_transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allTransactions = [...allTransactions, ...(data as WalletTransactionRow[])];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Fetch profiles
      const userIds = [...new Set(allTransactions.map(tx => tx.user_id).filter(Boolean))];
      let profilesMap: Record<string, ProfileData> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, email, avatar_url")
          .in("id", userIds);
        profilesMap = (profiles as ProfileData[] | null)?.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, ProfileData>) || {};
      }

      // Fetch campaigns
      const campaignIds = allTransactions
        .filter(tx => tx.metadata?.campaign_id)
        .map(tx => tx.metadata!.campaign_id as string);
      let campaignsMap: Record<string, CampaignData> = {};
      if (campaignIds.length > 0) {
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, title, brand_logo_url, budget, budget_used")
          .in("id", campaignIds);
        campaignsMap = (campaigns as CampaignData[] | null)?.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, CampaignData>) || {};
      }

      const formatted: Transaction[] = allTransactions.map(tx => ({
        ...tx,
        username: profilesMap[tx.user_id]?.username,
        email: profilesMap[tx.user_id]?.email,
        avatar_url: profilesMap[tx.user_id]?.avatar_url,
        campaign_name: tx.metadata?.campaign_id ? campaignsMap[tx.metadata.campaign_id]?.title : null,
        campaign_logo_url: tx.metadata?.campaign_id ? campaignsMap[tx.metadata.campaign_id]?.brand_logo_url : null,
        campaign_budget: tx.metadata?.campaign_id ? campaignsMap[tx.metadata.campaign_id]?.budget : null,
        campaign_budget_used: tx.metadata?.campaign_id ? campaignsMap[tx.metadata.campaign_id]?.budget_used : null,
      }));

      setTransactions(formatted);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }, []);

  const fetchPayoutRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from("payout_requests")
      .select(`*, profiles:user_id (id, username, full_name, avatar_url, wallets (balance, total_earned, total_withdrawn))`)
      .order("requested_at", { ascending: false });

    if (!error) {
      setPayoutRequests((data as PayoutRequest[]) || []);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTransactions(), fetchPayoutRequests()]);
    setLoading(false);
  }, [fetchTransactions, fetchPayoutRequests]);

  // Fetch data
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // User details
  const fetchUserData = useCallback(async (userId: string) => {
    setLoadingSocialAccounts(true);
    setLoadingTransactions(true);
    setLoadingPaymentMethods(true);

    const [socialRes, txRes, walletRes] = await Promise.all([
      supabase.from("social_accounts").select(`*, social_account_campaigns (campaigns (id, title, brand_name, brand_logo_url)), demographic_submissions (status, tier1_percentage)`).eq("user_id", userId),
      supabase.from("wallet_transactions").select("id, amount, type, status, description, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("wallets").select("payout_method, payout_details").eq("user_id", userId).maybeSingle()
    ]);

    setUserSocialAccounts((socialRes.data as SocialAccountRow[]) || []);
    setUserTransactions((txRes.data as UserTransactionRow[]) || []);
    const paymentData = walletRes.data as PaymentMethodRow | null;
    setUserPaymentMethods(paymentData?.payout_details && Array.isArray(paymentData.payout_details) ? paymentData.payout_details : []);
    setLoadingSocialAccounts(false);
    setLoadingTransactions(false);
    setLoadingPaymentMethods(false);
  }, []);

  const openUserDetailsDialog = useCallback(async (userId: string) => {
    const { data: userData } = await supabase
      .from("profiles")
      .select(`*, wallets (balance, total_earned, total_withdrawn)`)
      .eq("id", userId)
      .maybeSingle();

    if (userData) {
      setSelectedUser(userData as UserWithWallet);
      setUserDetailsDialogOpen(true);
      fetchUserData(userId);
    }
  }, [fetchUserData]);

  // Transaction actions
  const handleUndoTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to undo this transaction?')) return;
    setUndoingTransaction(transactionId);
    try {
      const { error } = await supabase.functions.invoke('undo-transaction', {
        body: { transaction_id: transactionId }
      });
      if (error) throw error;
      toast({ title: "Transaction undone successfully" });
      fetchTransactions();
      setContextOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setUndoingTransaction(null);
    }
  };

  // Payout actions
  const handleCompletePayout = async (request: PayoutRequest) => {
    setProcessingPayout(request.id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Update pending transaction
    const { data: pendingTx } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", request.user_id)
      .eq("type", "withdrawal")
      .eq("amount", -Number(request.amount))
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingTx) {
      await supabase.from("wallet_transactions").update({ status: 'completed' }).eq("id", pendingTx.id);
    }

    const { error } = await supabase
      .from("payout_requests")
      .update({ status: 'completed', processed_at: new Date().toISOString(), processed_by: session.user.id })
      .eq("id", request.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to complete payout" });
    } else {
      toast({ title: "Payout completed" });
      fetchPayoutRequests();
      setContextOpen(false);
    }
    setProcessingPayout(null);
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout || !rejectionReason) {
      toast({ variant: "destructive", title: "Please provide a rejection reason" });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Restore wallet balance
    const { data: pendingTx } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", selectedPayout.user_id)
      .eq("type", "withdrawal")
      .eq("amount", -Number(selectedPayout.amount))
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingTx) {
      await supabase.from("wallet_transactions").update({ status: 'rejected' }).eq("id", pendingTx.id);
      const { data: wallet } = await supabase.from("wallets").select("balance, total_withdrawn").eq("user_id", selectedPayout.user_id).single();
      if (wallet) {
        await supabase.from("wallets").update({
          balance: Number(wallet.balance) + Number(selectedPayout.amount),
          total_withdrawn: Math.max(0, Number(wallet.total_withdrawn) - Number(selectedPayout.amount))
        }).eq("user_id", selectedPayout.user_id);
      }
    }

    const { error } = await supabase
      .from("payout_requests")
      .update({ status: 'rejected', rejection_reason: rejectionReason, processed_at: new Date().toISOString(), processed_by: session.user.id })
      .eq("id", selectedPayout.id);

    if (!error) {
      toast({ title: "Payout rejected" });
      fetchPayoutRequests();
      setActionDialogOpen(false);
      setContextOpen(false);
      setRejectionReason('');
    }
  };

  const openCryptoPayoutDialog = (request: PayoutRequest) => {
    setSelectedCryptoRequest(request);
    setCryptoPayoutDialogOpen(true);
  };

  // Filtering (uses date-filtered data)
  const filteredTransactions = useMemo(() => {
    return dateFilteredTransactions.filter(tx => {
      const matchesSearch = !searchTerm ||
        tx.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === "all" || tx.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [dateFilteredTransactions, searchTerm, selectedType]);

  const filteredPayouts = useMemo(() => {
    return dateFilteredPayouts.filter(r => {
      const matchesSearch = !searchTerm ||
        r.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = payoutStatusFilter === "all" || r.status === payoutStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [dateFilteredPayouts, searchTerm, payoutStatusFilter]);

  // Pending payouts always shows all pending (not date filtered)
  const pendingPayouts = payoutRequests.filter(r => r.status === 'pending');

  // Combined items for unified view
  const combinedItems = useMemo(() => {
    if (viewMode === "transactions") return filteredTransactions.map(t => ({ type: 'transaction' as const, data: t, date: t.created_at }));
    if (viewMode === "payouts") return filteredPayouts.map(p => ({ type: 'payout' as const, data: p, date: p.requested_at }));

    // In "All" view, exclude withdrawal transactions since payout requests already represent them
    // This prevents duplicates where both the withdrawal tx and payout request would appear
    const txItems = filteredTransactions
      .filter(t => t.type !== 'withdrawal')
      .map(t => ({ type: 'transaction' as const, data: t, date: t.created_at }));
    const payoutItems = filteredPayouts.map(p => ({ type: 'payout' as const, data: p, date: p.requested_at }));
    return [...txItems, ...payoutItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewMode, filteredTransactions, filteredPayouts]);

  const totalPages = Math.ceil(combinedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = combinedItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedType, payoutStatusFilter, dateFrom, dateTo, datePreset, viewMode]);

  // Helpers
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      earning: 'Earning', withdrawal: 'Withdrawal', balance_correction: 'Correction',
      transfer_sent: 'Transfer Out', transfer_received: 'Transfer In', referral_bonus: 'Referral'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      earning: 'text-emerald-400 bg-emerald-500/10',
      withdrawal: 'text-orange-400 bg-orange-500/10',
      balance_correction: 'text-blue-400 bg-blue-500/10',
      transfer_sent: 'text-red-400 bg-red-500/10',
      transfer_received: 'text-emerald-400 bg-emerald-500/10',
      referral_bonus: 'text-purple-400 bg-purple-500/10'
    };
    return colors[type] || 'text-white/60 bg-white/5';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'tiktok': return <img src={tiktokLogo} alt="TikTok" className="h-3.5 w-3.5" />;
      case 'instagram': return <img src={instagramLogo} alt="Instagram" className="h-3.5 w-3.5" />;
      case 'youtube': return <img src={youtubeLogo} alt="YouTube" className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'User', 'Amount', 'Status', 'Details'];
    const rows = combinedItems.map(item => {
      if (item.type === 'transaction') {
        const tx = item.data as Transaction;
        return [format(new Date(tx.created_at), "yyyy-MM-dd HH:mm"), getTypeLabel(tx.type), tx.username || 'Unknown', tx.amount.toFixed(2), tx.status, tx.campaign_name || tx.description || ''];
      } else {
        const p = item.data as PayoutRequest;
        return [format(new Date(p.requested_at), "yyyy-MM-dd HH:mm"), 'Payout', p.profiles?.username || 'Unknown', Number(p.amount).toFixed(2), p.status, p.payout_method];
      }
    });
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <AdminPermissionGuard resource="finance">
      <div className="h-full overflow-auto bg-background">
        {/* Header with Date Filter */}
        <div className={cn("bg-background border-b", BORDERS.default)}>
          <div className={cn(PADDING.page, "space-y-4")}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={TYPOGRAPHY.pageTitle}>Finance</h1>
                <p className={cn(TYPOGRAPHY.caption, "mt-1")}>Unified view of all financial activity</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Budget Adjustment Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBudgetAdjustmentDialogOpen(true)}
                  className="gap-2 font-['Inter']"
                >
                  <DollarSign className="h-4 w-4" />
                  Adjust Budget
                </Button>

                {/* Date Preset Dropdown */}
                <Select value={datePreset} onValueChange={(v) => handleDatePresetChange(v as DatePreset)}>
                  <SelectTrigger className="w-[150px] h-9 border-0 bg-muted/50 hover:bg-muted transition-colors font-['Inter']">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_PRESETS.map(preset => (
                      <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Custom Date Range Picker */}
                {datePreset === "custom" && (
                  <Popover open={customDatePickerOpen} onOpenChange={setCustomDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn("px-3 py-2 text-sm rounded-lg bg-muted/50 hover:bg-muted transition-colors font-['Inter']", dateFrom && "text-foreground")}>
                        {dateFrom ? (dateTo ? `${format(dateFrom, "MMM d")} - ${format(dateTo, "MMM d")}` : format(dateFrom, "MMM d, y")) : "Pick dates"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <div className="p-3 space-y-3">
                        <div className="text-xs font-medium text-muted-foreground">From:</div>
                        <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                        <div className="text-xs font-medium text-muted-foreground">To:</div>
                        <Calendar mode="single" selected={dateTo} onSelect={setDateTo} disabled={date => dateFrom ? date < dateFrom : false} />
                        <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="w-full">Clear dates</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                <button onClick={exportToCSV} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-['Inter']">
                  Export
                </button>
                <button onClick={fetchAllData} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-['Inter']">
                  Refresh
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <StatCard
                label="Earnings"
                value={`$${stats.totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                subtext={datePreset !== "all_time" ? DATE_PRESETS.find(p => p.value === datePreset)?.label : undefined}
              />
              <StatCard
                label="Withdrawals"
                value={`$${stats.totalWithdrawals.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              />
              <StatCard
                label="Volume"
                value={`$${stats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                subtext={`${stats.transactionCount} transactions`}
              />
              <StatCard
                label="Pending Payouts"
                value={`$${stats.totalPendingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                subtext={`${stats.pendingPayoutsCount} requests`}
              />
              <StatCard
                label="Processed"
                value={`$${stats.totalProcessed.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                subtext={`${stats.completedPayoutsCount} completed`}
              />
              <StatCard
                label="Treasury"
                value={treasuryLoading ? "..." : formatUsdcBalance(usdcBalance)}
                subtext={treasuryLoading ? "Loading..." : `${formatSolBalance(solBalance)} SOL`}
                variant="primary"
              />
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="px-6 py-4">
          <FinancialContextCard />
        </div>

        {/* Pending Crypto Approvals */}
        <PayoutApprovals />

        {/* Pending Payouts Queue */}
        {pendingPayouts.length > 0 && (
          <div className="px-6 py-4">
            <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Pending Payouts</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{pendingPayouts.length} requests • ${stats.totalPendingAmount.toFixed(2)} total</p>
                </div>
                <button
                  onClick={() => setPayoutQueueExpanded(!payoutQueueExpanded)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {payoutQueueExpanded ? "Hide" : "Show"}
                </button>
              </div>

              {payoutQueueExpanded && (
                <div className="p-3 space-y-2">
                  {pendingPayouts.slice(0, 6).map(request => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/30"
                      onClick={() => { setSelectedPayout(request); setContextType('payout'); setContextOpen(true); }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={request.profiles?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">{(request.profiles?.username || '?')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate font-['Inter'] tracking-[-0.3px]">{request.profiles?.username}</p>
                          <p className="text-xs text-muted-foreground font-['Inter']">${Number(request.amount).toFixed(2)} • {request.payout_method}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {request.payout_method === 'crypto' ? (
                          <button
                            onClick={() => openCryptoPayoutDialog(request)}
                            className="text-xs text-amber-500 hover:text-amber-400 transition-colors font-['Inter']"
                          >
                            Send
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCompletePayout(request)}
                            disabled={processingPayout === request.id}
                            className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors font-['Inter'] disabled:opacity-50"
                          >
                            {processingPayout === request.id ? "..." : "Complete"}
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedPayout(request); setPayoutAction('reject'); setActionDialogOpen(true); }}
                          className="text-xs text-muted-foreground hover:text-rose-500 transition-colors font-['Inter']"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingPayouts.length > 6 && (
                    <button
                      onClick={() => { setViewMode('payouts'); setPayoutStatusFilter('pending'); }}
                      className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-['Inter']"
                    >
                      View all {pendingPayouts.length} pending payouts
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-6 py-4">
          <div className="bg-card border border-border/40 rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode */}
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/30">
                {(['all', 'transactions', 'payouts'] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all tracking-tight",
                      viewMode === mode ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode === 'all' ? 'All Activity' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-border/40" />

              {/* Search */}
              <div className="flex-1 min-w-[200px] max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, email, campaign..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors">
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              {/* Type Filter (Transactions) */}
              {viewMode !== 'payouts' && (
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[130px] h-9 bg-muted/40 border-0">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="earning">Earnings</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                    <SelectItem value="balance_correction">Corrections</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Status Filter (Payouts) */}
              {viewMode !== 'transactions' && (
                <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
                  <SelectTrigger className="w-[130px] h-9 bg-muted/40 border-0">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <span className="text-xs text-muted-foreground ml-auto">{combinedItems.length.toLocaleString()} items</span>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="px-6 pb-6">
          <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="p-8"><PageLoading /></div>
              ) : combinedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No items found</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/30 hover:bg-transparent bg-muted/30">
                        <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</TableHead>
                        <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                        <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                        <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount</TableHead>
                        <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item, idx) => {
                        if (item.type === 'transaction') {
                          const tx = item.data as Transaction;
                          return (
                            <TableRow
                              key={`tx-${tx.id}`}
                              className={cn(TABLE.row, TABLE.rowHover, "cursor-pointer", TRANSITIONS.fast)}
                              onClick={() => { setSelectedTransaction(tx); setContextType('transaction'); setContextOpen(true); }}
                            >
                              <TableCell className="py-3">
                                <div className="flex items-center gap-3">
                                  {tx.avatar_url ? (
                                    <img src={tx.avatar_url} alt={tx.username} className="h-8 w-8 rounded-full object-cover ring-1 ring-border" />
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                                      <span className="text-xs font-medium text-muted-foreground">{(tx.username || '?')[0].toUpperCase()}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-sm font-medium hover:text-primary transition-colors" onClick={e => { e.stopPropagation(); tx.user_id && openUserDetailsDialog(tx.user_id); }}>
                                      {tx.username || "Unknown"}
                                    </span>
                                    {tx.campaign_name && <p className="text-xs text-muted-foreground truncate max-w-[150px]">{tx.campaign_name}</p>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-sm">{format(new Date(tx.created_at), "MMM d, yyyy")}</div>
                                <div className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "HH:mm")}</div>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", getTypeColor(tx.type))}>
                                  {tx.amount >= 0 ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                  {getTypeLabel(tx.type)}
                                </span>
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <span className={cn("text-sm font-semibold", tx.amount >= 0 ? "text-emerald-500" : "text-red-500")}>
                                  {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge variant="secondary" className="text-xs capitalize">{tx.status}</Badge>
                              </TableCell>
                              <TableCell className="py-3 text-right" onClick={e => e.stopPropagation()}>
                                {!tx.metadata?.reversed && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10" aria-label="Undo transaction" onClick={() => handleUndoTransaction(tx.id)} disabled={undoingTransaction === tx.id}>
                                    {undoingTransaction === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        } else {
                          const payout = item.data as PayoutRequest;
                          return (
                            <TableRow
                              key={`payout-${payout.id}`}
                              className={cn(TABLE.row, TABLE.rowHover, "cursor-pointer", TRANSITIONS.fast)}
                              onClick={() => { setSelectedPayout(payout); setContextType('payout'); setContextOpen(true); }}
                            >
                              <TableCell className="py-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={payout.profiles?.avatar_url || ''} />
                                    <AvatarFallback className="text-xs">{(payout.profiles?.username || '?')[0].toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="text-sm font-medium hover:text-primary transition-colors" onClick={e => { e.stopPropagation(); payout.profiles && openUserDetailsDialog(payout.profiles.id); }}>
                                      {payout.profiles?.full_name || payout.profiles?.username}
                                    </span>
                                    <p className="text-xs text-muted-foreground">@{payout.profiles?.username}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-sm">{format(new Date(payout.requested_at), "MMM d, yyyy")}</div>
                                <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(payout.requested_at), { addSuffix: true })}</div>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge variant="secondary" className="capitalize text-xs gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  {payout.payout_method}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <span className="text-sm font-semibold">${Number(payout.amount).toFixed(2)}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge variant="secondary" className={cn("text-xs capitalize", payout.status === 'pending' && "bg-amber-500/10 text-amber-500", payout.status === 'in_transit' && "bg-blue-500/10 text-blue-500", payout.status === 'completed' && "bg-emerald-500/10 text-emerald-500", payout.status === 'rejected' && "bg-rose-500/10 text-rose-500")}>
                                  {payout.status === 'in_transit' ? 'In Transit' : payout.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 text-right" onClick={e => e.stopPropagation()}>
                                {payout.status === 'pending' && (
                                  <div className="flex items-center justify-end gap-1">
                                    {payout.payout_method === 'crypto' ? (
                                      <Button size="sm" variant="ghost" onClick={() => openCryptoPayoutDialog(payout)} className="h-8 w-8 p-0 text-amber-500 hover:bg-amber-500/10">
                                        <Coins className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <Button size="sm" variant="ghost" onClick={() => handleCompletePayout(payout)} disabled={processingPayout === payout.id} className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-500/10">
                                        {processingPayout === payout.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                      </Button>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={() => { setSelectedPayout(payout); setPayoutAction('reject'); setActionDialogOpen(true); }} className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10">
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, combinedItems.length)} of {combinedItems.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 gap-1">
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 gap-1">
                          Next <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
          </div>
        </div>

        {/* Context Panel (Sheet) */}
        <Sheet open={contextOpen} onOpenChange={setContextOpen}>
          <SheetContent className="w-full sm:max-w-md p-0 border-l border-border/50">
            <ScrollArea className="h-full">
              {contextType === 'transaction' && selectedTransaction && (
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {selectedTransaction.avatar_url ? (
                        <img src={selectedTransaction.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-border cursor-pointer hover:ring-primary" onClick={() => selectedTransaction.user_id && openUserDetailsDialog(selectedTransaction.user_id)} />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                          <span className="text-sm font-medium">{(selectedTransaction.username || '?')[0].toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold cursor-pointer hover:text-primary" onClick={() => selectedTransaction.user_id && openUserDetailsDialog(selectedTransaction.user_id)}>{selectedTransaction.username || 'Unknown'}</h3>
                        <p className="text-sm text-muted-foreground">{selectedTransaction.email}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-xs", getTypeColor(selectedTransaction.type))}>{getTypeLabel(selectedTransaction.type)}</Badge>
                  </div>

                  <div className={cn("rounded-xl p-5 border", selectedTransaction.amount >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20")}>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className={cn("text-3xl font-bold", selectedTransaction.amount >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {selectedTransaction.amount >= 0 ? '+' : ''}${Math.abs(selectedTransaction.amount).toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Details</h4>
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><Badge variant="secondary" className="capitalize">{selectedTransaction.status}</Badge></div>
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm">{format(new Date(selectedTransaction.created_at), "MMM dd, yyyy HH:mm")}</span></div>
                      {selectedTransaction.campaign_name && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Campaign</span>
                            <div className="flex items-center gap-2">
                              {selectedTransaction.campaign_logo_url && <OptimizedImage src={selectedTransaction.campaign_logo_url} alt="" className="h-4 w-4 rounded" />}
                              <span className="text-sm">{selectedTransaction.campaign_name}</span>
                            </div>
                          </div>
                          {selectedTransaction.campaign_budget && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Campaign Budget</span>
                              <span className="text-sm">
                                ${selectedTransaction.campaign_budget_used?.toLocaleString() || 0} / ${selectedTransaction.campaign_budget.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {selectedTransaction.metadata?.platform && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Platform</span>
                          <div className="flex items-center gap-2">{getPlatformIcon(selectedTransaction.metadata.platform)}<span className="text-sm capitalize">{selectedTransaction.metadata.platform}</span></div>
                        </div>
                      )}
                      {selectedTransaction.description && <div><span className="text-sm text-muted-foreground">Description</span><p className="text-sm mt-1">{selectedTransaction.description}</p></div>}
                    </div>
                  </div>

                  {!selectedTransaction.metadata?.reversed && (
                    <Button variant="outline" className="w-full gap-2 text-rose-500 hover:text-rose-600 border-rose-500/30 hover:bg-rose-500/10" onClick={() => handleUndoTransaction(selectedTransaction.id)} disabled={undoingTransaction === selectedTransaction.id}>
                      {undoingTransaction === selectedTransaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                      Undo Transaction
                    </Button>
                  )}
                </div>
              )}

              {contextType === 'payout' && selectedPayout && (
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary" onClick={() => selectedPayout.profiles && openUserDetailsDialog(selectedPayout.profiles.id)}>
                        <AvatarImage src={selectedPayout.profiles?.avatar_url || ''} />
                        <AvatarFallback>{(selectedPayout.profiles?.username || '?')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold cursor-pointer hover:text-primary" onClick={() => selectedPayout.profiles && openUserDetailsDialog(selectedPayout.profiles.id)}>{selectedPayout.profiles?.full_name || selectedPayout.profiles?.username}</h3>
                        <p className="text-sm text-muted-foreground">@{selectedPayout.profiles?.username}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-xs", selectedPayout.status === 'pending' && "bg-amber-500/10 text-amber-500", selectedPayout.status === 'completed' && "bg-emerald-500/10 text-emerald-500", selectedPayout.status === 'rejected' && "bg-rose-500/10 text-rose-500")}>
                      {selectedPayout.status}
                    </Badge>
                  </div>

                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Requested Amount</p>
                    <p className="text-3xl font-bold">${Number(selectedPayout.amount).toFixed(2)}</p>
                    {selectedPayout.payout_method === 'crypto' && (
                      <div className="mt-2 pt-2 border-t border-primary/10">
                        <p className="text-xs text-muted-foreground">Amount after fees ($1 + 0.75%)</p>
                        <p className="text-lg font-semibold text-emerald-500">
                          ${(Number(selectedPayout.amount) - (Number(selectedPayout.amount) * 0.0075) - 1).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Payment Details</h4>
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Method</span><Badge variant="secondary" className="capitalize">{selectedPayout.payout_method}</Badge></div>
                      {selectedPayout.payout_details?.network && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Network</span>
                          <span className="text-sm font-medium capitalize">{selectedPayout.payout_details.network}</span>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <span className="text-sm text-muted-foreground">Wallet Address</span>
                        <div className="flex items-center gap-2 bg-background/50 rounded-lg p-2">
                          <code className="text-xs font-mono break-all flex-1">{selectedPayout.payout_details?.address || selectedPayout.payout_details?.email || 'N/A'}</code>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 flex-shrink-0" onClick={() => copyToClipboard(selectedPayout.payout_details?.address || selectedPayout.payout_details?.email || '')}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Timeline</h4>
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Requested</span><span className="text-sm">{format(new Date(selectedPayout.requested_at), 'MMM dd, yyyy HH:mm')}</span></div>
                      {selectedPayout.processed_at && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Processed</span><span className="text-sm">{format(new Date(selectedPayout.processed_at), 'MMM dd, yyyy HH:mm')}</span></div>}
                    </div>

                    {selectedPayout.profiles?.wallets && (
                      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">User Wallet</h4>
                        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Balance</span><span className="text-sm font-semibold">${Number(selectedPayout.profiles.wallets.balance).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Earned</span><span className="text-sm">${Number(selectedPayout.profiles.wallets.total_earned).toFixed(2)}</span></div>
                      </div>
                    )}

                    {selectedPayout.rejection_reason && (
                      <div className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-rose-500">Rejection Reason</p>
                            <p className="text-sm text-rose-400 mt-1">{selectedPayout.rejection_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPayout.tx_signature && (
                      <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-emerald-500">Transaction Confirmed</span>
                          <a href={`https://solscan.io/tx/${selectedPayout.tx_signature}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        <code className="text-xs bg-background p-2 rounded block font-mono truncate">{selectedPayout.tx_signature}</code>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                    {selectedPayout.status === 'pending' && (
                      <>
                        {selectedPayout.payout_method === 'crypto' ? (
                          <div className="flex gap-2">
                            <Button onClick={() => openCryptoPayoutDialog(selectedPayout)} className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700">
                              <Coins className="h-4 w-4" /> Send USDC
                            </Button>
                            <Button variant="outline" onClick={() => { setPayoutAction('reject'); setActionDialogOpen(true); }} className="flex-1 gap-2 text-rose-500 border-rose-500/30 hover:bg-rose-500/10">
                              <XCircle className="h-4 w-4" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button onClick={() => handleCompletePayout(selectedPayout)} disabled={processingPayout === selectedPayout.id} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
                              {processingPayout === selectedPayout.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Complete
                            </Button>
                            <Button variant="outline" onClick={() => { setPayoutAction('reject'); setActionDialogOpen(true); }} className="flex-1 gap-2 text-rose-500 border-rose-500/30 hover:bg-rose-500/10">
                              <XCircle className="h-4 w-4" /> Reject
                            </Button>
                          </div>
                        )}
                        {selectedPayout.payout_method === 'crypto' && (
                          <Button
                            variant="outline"
                            onClick={() => handleCompletePayout(selectedPayout)}
                            disabled={processingPayout === selectedPayout.id}
                            className="w-full gap-2 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                          >
                            {processingPayout === selectedPayout.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Mark as Completed
                          </Button>
                        )}
                      </>
                    )}
                    {selectedPayout.status === 'in_transit' && (
                      <Button onClick={() => handleCompletePayout(selectedPayout)} disabled={processingPayout === selectedPayout.id} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                        {processingPayout === selectedPayout.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark as Completed
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Reject Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Payout</DialogTitle>
            </DialogHeader>
            {selectedPayout && (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">${Number(selectedPayout.amount).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-1">for @{selectedPayout.profiles?.username}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Rejection Reason *</Label>
                  <Textarea id="reason" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this request was rejected..." rows={3} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setActionDialogOpen(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleRejectPayout} className="flex-1 bg-rose-600 hover:bg-rose-700">Confirm Rejection</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* User Context Sheet */}
        <UserContextSheet
          open={userDetailsDialogOpen}
          onOpenChange={setUserDetailsDialogOpen}
          user={selectedUser}
          onUserUpdated={fetchAllData}
        />

        {/* Crypto Payout Dialog */}
        <CryptoPayoutDialog
          open={cryptoPayoutDialogOpen}
          onOpenChange={setCryptoPayoutDialogOpen}
          payoutRequest={selectedCryptoRequest}
          onSuccess={() => { fetchPayoutRequests(); setContextOpen(false); }}
        />

        {/* Campaign Budget Adjustment Dialog */}
        <CampaignBudgetAdjustmentDialog
          open={budgetAdjustmentDialogOpen}
          onOpenChange={setBudgetAdjustmentDialogOpen}
          onSuccess={fetchAllData}
        />
      </div>
    </AdminPermissionGuard>
  );
}
