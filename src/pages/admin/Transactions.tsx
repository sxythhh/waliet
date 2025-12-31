import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Calendar as CalendarIcon, Loader2, Undo2, ChevronLeft, ChevronRight, Download, ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { format, subDays } from "date-fns";
import { OptimizedImage } from "@/components/OptimizedImage";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import instagramLogo from "@/assets/instagram-logo-white.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  metadata: any;
  created_at: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  campaign_name?: string;
  campaign_logo_url?: string;
}

const ITEMS_PER_PAGE = 25;

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [amountFilter, setAmountFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userSocialAccounts, setUserSocialAccounts] = useState<any[]>([]);
  const [loadingSocialAccounts, setLoadingSocialAccounts] = useState(false);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [userPaymentMethods, setUserPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [socialAccountsOpen, setSocialAccountsOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const [undoingTransaction, setUndoingTransaction] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    const last7Days = subDays(today, 7);
    const last30Days = subDays(today, 30);

    const todayTx = transactions.filter(tx => new Date(tx.created_at) >= new Date(today.setHours(0, 0, 0, 0)));
    const last7DaysTx = transactions.filter(tx => new Date(tx.created_at) >= last7Days);

    const totalVolume = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalEarnings = transactions.filter(tx => tx.type === 'earning').reduce((sum, tx) => sum + tx.amount, 0);
    const totalWithdrawals = transactions.filter(tx => tx.type === 'withdrawal').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const todayVolume = todayTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const weekVolume = last7DaysTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
      totalVolume,
      totalEarnings,
      totalWithdrawals,
      todayVolume,
      weekVolume,
      todayCount: todayTx.length,
      weekCount: last7DaysTx.length,
      totalCount: transactions.length,
    };
  }, [transactions]);

  const handleUndoTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to undo this transaction? This will reverse all related changes.')) {
      return;
    }
    setUndoingTransaction(transactionId);
    try {
      const { data, error } = await supabase.functions.invoke('undo-transaction', {
        body: { transaction_id: transactionId }
      });
      if (error) throw error;
      toast({
        title: "Transaction Undone",
        description: data.message || `Successfully reversed transaction.`,
      });
      fetchTransactions();
    } catch (error: any) {
      console.error('Error undoing transaction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to undo transaction",
        variant: "destructive"
      });
    } finally {
      setUndoingTransaction(null);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase.from("campaigns").select("id, title").order("title");
      if (error) throw error;
      setCampaigns(data?.map(c => ({ id: c.id, name: c.title })) || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      let allTransactions: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: txData, error: txError } = await supabase
          .from("wallet_transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);
        if (txError) throw txError;
        if (txData && txData.length > 0) {
          allTransactions = [...allTransactions, ...txData];
          from += batchSize;
          hasMore = txData.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      const userIds = allTransactions?.map(tx => tx.user_id).filter((id): id is string => !!id) || [];
      const uniqueUserIds = [...new Set(userIds)];
      let profilesMap: Record<string, any> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, email, avatar_url")
          .in("id", uniqueUserIds);
        profilesMap = profilesData?.reduce((acc, profile) => ({
          ...acc,
          [profile.id]: profile
        }), {} as Record<string, any>) || {};
      }

      const campaignIds = allTransactions?.filter(tx => tx.metadata && typeof tx.metadata === 'object' && 'campaign_id' in tx.metadata).map(tx => (tx.metadata as any).campaign_id) || [];
      let campaignsMap: Record<string, { title: string; brand_logo_url?: string }> = {};
      if (campaignIds.length > 0) {
        const { data: campaignData } = await supabase
          .from("campaigns")
          .select("id, title, brand_logo_url")
          .in("id", campaignIds);
        campaignsMap = campaignData?.reduce((acc, camp) => ({
          ...acc,
          [camp.id]: { title: camp.title, brand_logo_url: camp.brand_logo_url }
        }), {}) || {};
      }

      const formattedTransactions = allTransactions?.map((tx: any) => {
        const campaignId = tx.metadata && typeof tx.metadata === 'object' && 'campaign_id' in tx.metadata ? (tx.metadata as any).campaign_id : undefined;
        return {
          id: tx.id,
          user_id: tx.user_id,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          description: tx.description,
          metadata: tx.metadata,
          created_at: tx.created_at,
          username: profilesMap[tx.user_id]?.username,
          email: profilesMap[tx.user_id]?.email,
          avatar_url: profilesMap[tx.user_id]?.avatar_url,
          campaign_name: campaignId ? campaignsMap[campaignId]?.title : undefined,
          campaign_logo_url: campaignId ? campaignsMap[campaignId]?.brand_logo_url : undefined
        };
      }) || [];

      setTransactions(formattedTransactions);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSocialAccounts = async (userId: string) => {
    setLoadingSocialAccounts(true);
    const { data, error } = await supabase
      .from("social_accounts")
      .select(`*, social_account_campaigns (campaigns (id, title, brand_name, brand_logo_url)), demographic_submissions (status, tier1_percentage, submitted_at)`)
      .eq("user_id", userId);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch social accounts" });
      setUserSocialAccounts([]);
    } else {
      setUserSocialAccounts(data || []);
    }
    setLoadingSocialAccounts(false);
  };

  const fetchUserTransactions = async (userId: string) => {
    setLoadingTransactions(true);
    const { data: txData, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch transactions" });
      setUserTransactions([]);
    } else {
      setUserTransactions(txData || []);
    }
    setLoadingTransactions(false);
  };

  const fetchUserPaymentMethods = async (userId: string) => {
    setLoadingPaymentMethods(true);
    const { data, error } = await supabase
      .from("wallets")
      .select("payout_method, payout_details")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("Error fetching payment methods:", error);
      setUserPaymentMethods([]);
    } else if (data && data.payout_details) {
      const details = data.payout_details as any[];
      if (Array.isArray(details) && details.length > 0) {
        setUserPaymentMethods(details.map((item: any) => ({
          method: item.method || data.payout_method,
          details: item.details || item
        })));
      } else {
        setUserPaymentMethods([]);
      }
    } else {
      setUserPaymentMethods([]);
    }
    setLoadingPaymentMethods(false);
  };

  const openUserDetailsDialog = async (userId: string) => {
    const { data: userData, error } = await supabase
      .from("profiles")
      .select(`*, wallets (balance, total_earned, total_withdrawn)`)
      .eq("id", userId)
      .maybeSingle();
    if (error || !userData) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch user details" });
      return;
    }
    setSelectedUser(userData);
    setUserDetailsDialogOpen(true);
    fetchUserSocialAccounts(userId);
    fetchUserTransactions(userId);
    fetchUserPaymentMethods(userId);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchTerm ||
      tx.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCampaign = selectedCampaign === "all" ||
      (selectedCampaign === "none" && !tx.metadata?.campaign_id) ||
      tx.metadata?.campaign_id === selectedCampaign;

    let matchesType = true;
    if (selectedType === "campaign_budget") {
      matchesType = tx.type === "balance_correction" && tx.metadata?.adjustment_type === "manual_budget_update";
    } else if (selectedType === "balance_correction") {
      matchesType = tx.type === "balance_correction" && tx.metadata?.adjustment_type !== "manual_budget_update";
    } else if (selectedType !== "all") {
      matchesType = tx.type === selectedType;
    }

    let matchesAmount = true;
    if (amountFilter === "positive") matchesAmount = tx.amount > 0;
    else if (amountFilter === "negative") matchesAmount = tx.amount < 0;
    else if (amountFilter === "over100") matchesAmount = Math.abs(tx.amount) > 100;
    else if (amountFilter === "under10") matchesAmount = Math.abs(tx.amount) < 10;

    let matchesDateRange = true;
    if (dateFrom || dateTo) {
      const txDate = new Date(tx.created_at);
      if (dateFrom) {
        const startOfDay = new Date(dateFrom);
        startOfDay.setHours(0, 0, 0, 0);
        matchesDateRange = txDate >= startOfDay;
      }
      if (dateTo && matchesDateRange) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        matchesDateRange = txDate <= endOfDay;
      }
    }
    return matchesSearch && matchesCampaign && matchesType && matchesAmount && matchesDateRange;
  });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCampaign, selectedType, amountFilter, dateFrom, dateTo]);

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Email', 'Type', 'Amount', 'Status', 'Campaign', 'Description'];
    const rows = filteredTransactions.map(tx => [
      format(new Date(tx.created_at), "yyyy-MM-dd HH:mm:ss"),
      tx.username || 'Unknown',
      tx.email || '',
      tx.type,
      tx.amount.toFixed(2),
      tx.status,
      tx.campaign_name || '',
      tx.description || ''
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getTypeLabel = (type: string, metadata: any) => {
    if (type === 'balance_correction' && metadata?.adjustment_type === 'manual_budget_update') {
      return 'Budget Update';
    }
    const labels: Record<string, string> = {
      earning: 'Earning',
      withdrawal: 'Withdrawal',
      balance_correction: 'Correction',
      transfer_sent: 'Transfer Out',
      transfer_received: 'Transfer In',
      referral_bonus: 'Referral'
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

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white font-inter tracking-[-0.5px]">
              Transactions
            </h1>
            <p className="text-sm text-white/40 font-inter tracking-[-0.2px] mt-1">
              {filteredTransactions.length.toLocaleString()} transactions found
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="w-fit gap-2 bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl p-4 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <span className="text-[11px] text-white/50 font-inter font-medium">Total Earnings</span>
            </div>
            <p className="text-xl font-semibold text-emerald-400 font-inter tracking-[-0.5px]">
              ${stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
              </div>
              <span className="text-[11px] text-white/50 font-inter font-medium">Total Withdrawals</span>
            </div>
            <p className="text-xl font-semibold text-orange-400 font-inter tracking-[-0.5px]">
              ${stats.totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <DollarSign className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="text-[11px] text-white/50 font-inter font-medium">Week Volume</span>
            </div>
            <p className="text-xl font-semibold text-blue-400 font-inter tracking-[-0.5px]">
              ${stats.weekVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-white/30 mt-1">{stats.weekCount.toLocaleString()} transactions</p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Activity className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <span className="text-[11px] text-white/50 font-inter font-medium">Today</span>
            </div>
            <p className="text-xl font-semibold text-purple-400 font-inter tracking-[-0.5px]">
              ${stats.todayVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-white/30 mt-1">{stats.todayCount.toLocaleString()} transactions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.04]">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/30 h-4 w-4" />
              <Input
                placeholder="Search by user, email, campaign..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/20 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[140px] h-10 bg-white/5 border-white/10 text-white/80 rounded-xl">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="earning">Earnings</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="balance_correction">Corrections</SelectItem>
                  <SelectItem value="campaign_budget">Budget Updates</SelectItem>
                </SelectContent>
              </Select>

              <Select value={amountFilter} onValueChange={setAmountFilter}>
                <SelectTrigger className="w-[130px] h-10 bg-white/5 border-white/10 text-white/80 rounded-xl">
                  <SelectValue placeholder="Amount" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  <SelectItem value="all">All Amounts</SelectItem>
                  <SelectItem value="positive">Credits</SelectItem>
                  <SelectItem value="negative">Debits</SelectItem>
                  <SelectItem value="over100">Over $100</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-10 px-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl",
                      !dateFrom && !dateTo ? "text-white/50" : "text-white/80"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? (dateTo ? `${format(dateFrom, "MMM d")} - ${format(dateTo, "MMM d")}` : format(dateFrom, "MMM d, y")) : "Date range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#1a1a1a] border-white/10" align="end">
                  <div className="flex flex-col gap-2 p-3">
                    <div className="text-xs font-medium text-white/50">From:</div>
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="bg-transparent" />
                    <div className="text-xs font-medium text-white/50 mt-2">To:</div>
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} disabled={date => dateFrom ? date < dateFrom : false} className="bg-transparent" />
                    <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="mt-2 text-white/60 hover:text-white">
                      Clear dates
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.04]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-white/50 font-medium font-inter text-xs h-12">User</TableHead>
                <TableHead className="text-white/50 font-medium font-inter text-xs h-12">Date</TableHead>
                <TableHead className="text-white/50 font-medium font-inter text-xs h-12">Type</TableHead>
                <TableHead className="text-white/50 font-medium font-inter text-xs h-12">Amount</TableHead>
                <TableHead className="text-white/50 font-medium font-inter text-xs h-12">Details</TableHead>
                <TableHead className="text-white/50 font-medium font-inter text-xs h-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="py-4"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full bg-white/5" /><Skeleton className="h-4 w-24 bg-white/5" /></div></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-28 bg-white/5" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-6 w-20 rounded-full bg-white/5" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-40 bg-white/5" /></TableCell>
                    <TableCell className="py-4 text-right"><Skeleton className="h-8 w-8 rounded-lg bg-white/5 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredTransactions.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center py-12 text-white/40 font-inter">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map(tx => (
                  <TableRow key={tx.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        {tx.avatar_url ? (
                          <img src={tx.avatar_url} alt={tx.username} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                            <span className="text-xs font-medium text-white/60">{(tx.username || '?')[0].toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <span
                            className="text-sm font-medium text-white cursor-pointer hover:text-primary transition-colors font-inter tracking-[-0.3px]"
                            onClick={() => tx.user_id && openUserDetailsDialog(tx.user_id)}
                          >
                            {tx.username || "Unknown"}
                          </span>
                          {tx.email && <p className="text-[11px] text-white/30 font-inter">{tx.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-white/60 font-inter tracking-[-0.2px]">
                        {format(new Date(tx.created_at), "MMM d, yyyy")}
                      </div>
                      <div className="text-[11px] text-white/30 font-inter">
                        {format(new Date(tx.created_at), "HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-inter", getTypeColor(tx.type))}>
                        {tx.amount >= 0 ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                        {getTypeLabel(tx.type, tx.metadata)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={cn("text-base font-semibold font-inter tracking-[-0.5px]", tx.amount >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1 max-w-[280px]">
                        {tx.type === "earning" && tx.metadata?.account_username && (
                          <div className="flex items-center gap-1.5">
                            {getPlatformIcon(tx.metadata?.platform)}
                            <span className="text-sm text-white/70 font-inter">@{tx.metadata.account_username}</span>
                          </div>
                        )}
                        {tx.campaign_name && (
                          <div className="flex items-center gap-2">
                            {tx.campaign_logo_url && <OptimizedImage src={tx.campaign_logo_url} alt="" className="h-4 w-4 rounded object-cover" />}
                            <span className="text-sm text-white/50 font-inter truncate">{tx.campaign_name}</span>
                          </div>
                        )}
                        {tx.type === "withdrawal" && tx.metadata?.payout_method && (
                          <span className="text-sm text-white/50 font-inter">
                            {tx.metadata.payout_method === 'crypto' ? 'Crypto' : tx.metadata.payout_method === 'paypal' ? 'PayPal' : tx.metadata.payout_method}
                          </span>
                        )}
                        {!tx.campaign_name && !tx.metadata?.account_username && !tx.metadata?.payout_method && tx.description && (
                          <span className="text-sm text-white/40 font-inter truncate block">{tx.description}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {tx.metadata?.reversed ? (
                        <span className="text-xs text-white/30 font-inter">Reversed</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-white/40"
                          onClick={() => handleUndoTransaction(tx.id)}
                          disabled={undoingTransaction === tx.id}
                        >
                          {undoingTransaction === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <p className="text-sm text-white/40 font-inter">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 px-3 bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white rounded-xl disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <Button
                      key={pageNum}
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "h-9 w-9 p-0 rounded-xl font-inter",
                        currentPage === pageNum
                          ? "bg-white/10 text-white border border-white/20"
                          : "bg-white/5 text-white/50 border border-white/5 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-9 px-3 bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white rounded-xl disabled:opacity-30"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* User Details Dialog */}
        {selectedUser && (
          <UserDetailsDialog
            open={userDetailsDialogOpen}
            onOpenChange={setUserDetailsDialogOpen}
            user={selectedUser}
            socialAccounts={userSocialAccounts}
            loadingSocialAccounts={loadingSocialAccounts}
            transactions={userTransactions}
            loadingTransactions={loadingTransactions}
            paymentMethods={userPaymentMethods}
            loadingPaymentMethods={loadingPaymentMethods}
            socialAccountsOpen={socialAccountsOpen}
            onSocialAccountsOpenChange={setSocialAccountsOpen}
            transactionsOpen={transactionsOpen}
            onTransactionsOpenChange={setTransactionsOpen}
            paymentMethodsOpen={paymentMethodsOpen}
            onPaymentMethodsOpenChange={setPaymentMethodsOpen}
            onBalanceUpdated={() => {
              fetchTransactions();
              if (selectedUser) fetchUserTransactions(selectedUser.id);
            }}
          />
        )}
      </div>
    </div>
  );
}
