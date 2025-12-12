import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
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
  campaign_name?: string;
  campaign_logo_url?: string;
}
export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [amountFilter, setAmountFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [campaigns, setCampaigns] = useState<{
    id: string;
    name: string;
  }[]>([]);
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
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchTransactions();
    fetchCampaigns();
  }, []);
  const fetchCampaigns = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("campaigns").select("id, title").order("title");
      if (error) throw error;
      setCampaigns(data?.map(c => ({
        id: c.id,
        name: c.title
      })) || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };
  const fetchTransactions = async () => {
    try {
      // Fetch ALL transactions by increasing the range beyond the default 1000 limit
      let allTransactions: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      // Keep fetching until we get all transactions
      while (hasMore) {
        const {
          data: txData,
          error: txError
        } = await supabase.from("wallet_transactions").select("*").order("created_at", {
          ascending: false
        }).range(from, from + batchSize - 1);
        if (txError) throw txError;
        if (txData && txData.length > 0) {
          allTransactions = [...allTransactions, ...txData];
          from += batchSize;
          hasMore = txData.length === batchSize; // Continue if we got a full batch
        } else {
          hasMore = false;
        }
      }

      // Fetch user profiles separately
      const userIds = allTransactions?.map(tx => tx.user_id).filter((id): id is string => !!id) || [];
      const uniqueUserIds = [...new Set(userIds)];
      let profilesMap: Record<string, any> = {};
      if (uniqueUserIds.length > 0) {
        const {
          data: profilesData
        } = await supabase.from("profiles").select("id, username, email").in("id", uniqueUserIds);
        profilesMap = profilesData?.reduce((acc, profile) => ({
          ...acc,
          [profile.id]: profile
        }), {} as Record<string, any>) || {};
      }

      // Fetch campaign names if metadata contains campaign_id
      const campaignIds = allTransactions?.filter(tx => tx.metadata && typeof tx.metadata === 'object' && 'campaign_id' in tx.metadata).map(tx => (tx.metadata as any).campaign_id) || [];
      let campaignsMap: Record<string, {
        title: string;
        brand_logo_url?: string;
      }> = {};
      if (campaignIds.length > 0) {
        const {
          data: campaignData
        } = await supabase.from("campaigns").select("id, title, brand_logo_url").in("id", campaignIds);
        campaignsMap = campaignData?.reduce((acc, camp) => ({
          ...acc,
          [camp.id]: {
            title: camp.title,
            brand_logo_url: camp.brand_logo_url
          }
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
          campaign_name: campaignId ? campaignsMap[campaignId]?.title : undefined,
          campaign_logo_url: campaignId ? campaignsMap[campaignId]?.brand_logo_url : undefined
        };
      }) || [];
      console.log(`Loaded ${formattedTransactions.length} total transactions`);
      console.log('Date range:', formattedTransactions.length > 0 ? {
        earliest: formattedTransactions[formattedTransactions.length - 1]?.created_at,
        latest: formattedTransactions[0]?.created_at
      } : 'No transactions');
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
    const {
      data,
      error
    } = await supabase.from("social_accounts").select(`
        *,
        social_account_campaigns (
          campaigns (
            id,
            title,
            brand_name,
            brand_logo_url
          )
        ),
        demographic_submissions (
          status,
          tier1_percentage,
          submitted_at
        )
      `).eq("user_id", userId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch social accounts"
      });
      setUserSocialAccounts([]);
    } else {
      setUserSocialAccounts(data || []);
    }
    setLoadingSocialAccounts(false);
  };
  const fetchUserTransactions = async (userId: string) => {
    setLoadingTransactions(true);
    const {
      data: txData,
      error
    } = await supabase.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", {
      ascending: false
    }).limit(10);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch transactions"
      });
      setUserTransactions([]);
    } else {
      setUserTransactions(txData || []);
    }
    setLoadingTransactions(false);
  };
  const fetchUserPaymentMethods = async (userId: string) => {
    setLoadingPaymentMethods(true);
    const {
      data,
      error
    } = await supabase.from("wallets").select("payout_method, payout_details").eq("user_id", userId).maybeSingle();
    if (error) {
      console.error("Error fetching payment methods:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payment methods"
      });
      setUserPaymentMethods([]);
    } else if (data && data.payout_details) {
      // payout_details is an array of {method, details} objects
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
    // Fetch user profile
    const {
      data: userData,
      error
    } = await supabase.from("profiles").select(`
        *,
        wallets (
          balance,
          total_earned,
          total_withdrawn
        )
      `).eq("id", userId).maybeSingle();
    if (error || !userData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch user details"
      });
      return;
    }
    setSelectedUser(userData);
    setUserDetailsDialogOpen(true);
    fetchUserSocialAccounts(userId);
    fetchUserTransactions(userId);
    fetchUserPaymentMethods(userId);
  };
  const filteredTransactions = transactions.filter(tx => {
    // Search term filter
    const matchesSearch = !searchTerm || tx.id?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.username?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.email?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Campaign filter
    const matchesCampaign = selectedCampaign === "all" || selectedCampaign === "none" && !tx.metadata?.campaign_id || tx.metadata?.campaign_id === selectedCampaign;

    // Type filter
    let matchesType = true;
    if (selectedType === "campaign_budget") {
      matchesType = tx.type === "balance_correction" && tx.metadata?.adjustment_type === "manual_budget_update";
    } else if (selectedType === "balance_correction") {
      matchesType = tx.type === "balance_correction" && tx.metadata?.adjustment_type !== "manual_budget_update";
    } else if (selectedType !== "all") {
      matchesType = tx.type === selectedType;
    }

    // Amount filter
    let matchesAmount = true;
    if (amountFilter === "positive") {
      matchesAmount = tx.amount > 0;
    } else if (amountFilter === "negative") {
      matchesAmount = tx.amount < 0;
    } else if (amountFilter === "over100") {
      matchesAmount = Math.abs(tx.amount) > 100;
    } else if (amountFilter === "under10") {
      matchesAmount = Math.abs(tx.amount) < 10;
    }

    // Date range filter
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
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "secondary"} className="capitalize font-inter tracking-[-0.5px]">{status}</Badge>;
  };
  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      tiktok: tiktokLogo,
      instagram: instagramLogo,
      youtube: youtubeLogo
    };
    return icons[platform.toLowerCase()];
  };
  const getTypeBadge = (type: string) => {
    const isCredit = type === "credit" || type === "earnings" || type === "referral_bonus" || type === "transfer_received";
    const isDebit = type === "transfer_sent";
    return <Badge variant={isCredit ? "default" : "destructive"}>
        {isCredit ? "+" : "-"}${Math.abs(Number(type))}
      </Badge>;
  };
  return <div className="w-full px-3 py-4 md:container md:mx-auto md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl md:text-3xl font-bold">All Transactions</h1>
        <div className="text-sm text-muted-foreground">
          Total: {filteredTransactions.length} transactions
        </div>
      </div>

      <Card className="p-3 md:p-4 border-0 bg-[#1f1f1f]/0">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2">
          <div className="relative w-full md:flex-1 md:min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5 z-10" />
            <Input placeholder="Search transactions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9 text-sm bg-background/60 border-0 shadow-sm w-full" />
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:gap-2">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-full md:w-[160px] h-9 text-sm bg-background/60 border-0 shadow-sm">
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="none">No Campaign</SelectItem>
                {campaigns.map(campaign => <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[140px] h-9 text-sm bg-background/60 border-0 shadow-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="earning">Earning</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                <SelectItem value="balance_correction">Balance Correction</SelectItem>
                <SelectItem value="campaign_budget">Campaign Budget</SelectItem>
              </SelectContent>
            </Select>

            <Select value={amountFilter} onValueChange={setAmountFilter}>
              <SelectTrigger className="w-full md:w-[140px] h-9 text-sm bg-background/60 border-0 shadow-sm">
                <SelectValue placeholder="Amount" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="positive">Positive Only</SelectItem>
                <SelectItem value="negative">Negative Only</SelectItem>
                <SelectItem value="over100">Over $100</SelectItem>
                <SelectItem value="under10">Under $10</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className={cn("w-full md:w-auto h-9 px-3 text-sm bg-background/60 border-0 shadow-sm hover:bg-background/80", !dateFrom && !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateFrom ? dateTo ? <>
                        {format(dateFrom, "LLL dd")} - {format(dateTo, "LLL dd")}
                      </> : format(dateFrom, "LLL dd, y") : <span>Date range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border shadow-lg" align="start">
                <div className="flex flex-col gap-2 p-3">
                  <div className="text-xs font-medium text-muted-foreground">From:</div>
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="pointer-events-auto" />
                  <div className="text-xs font-medium text-muted-foreground mt-2">To:</div>
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} disabled={date => dateFrom ? date < dateFrom : false} className="pointer-events-auto" />
                  <Button variant="ghost" size="sm" onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }} className="mt-2">
                    Clear dates
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-3 border border-border">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-3 w-40" />
              </Card>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? <Card className="p-6 text-center text-muted-foreground border border-border">
            No transactions found
          </Card> : filteredTransactions.map(tx => <Card key={tx.id} className="p-3 border border-border">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => tx.user_id && openUserDetailsDialog(tx.user_id)}>
                  {tx.username || "Unknown"}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(tx.created_at), "MMM d, yyyy · HH:mm")}
                </p>
              </div>
              <span className={cn("font-semibold text-sm", tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="text-xs capitalize">
                {tx.type === 'balance_correction' && tx.metadata?.adjustment_type === 'manual_budget_update'
                  ? 'Campaign Budget'
                  : tx.type.replace("_", " ")}
              </Badge>
              {getStatusBadge(tx.status)}
            </div>

            {tx.metadata?.campaign_budget_before !== undefined && tx.metadata?.campaign_budget_after !== undefined ? (
              <p className="text-xs text-muted-foreground">
                Budget: ${Number(tx.metadata.campaign_budget_before).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → ${Number(tx.metadata.campaign_budget_after).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            ) : null}
            {(tx.campaign_name || tx.description) && <p className="text-xs text-muted-foreground line-clamp-2">
                {tx.campaign_name || tx.description}
              </p>}
          </Card>)}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block rounded-lg border border-[#141414] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-[#141414]">
              <TableHead className="w-[200px] font-medium text-white font-inter tracking-[-0.5px]">User</TableHead>
              <TableHead className="w-[160px] font-medium text-white font-inter tracking-[-0.5px]">Date</TableHead>
              <TableHead className="w-[120px] font-medium text-white font-inter tracking-[-0.5px]">Amount</TableHead>
              <TableHead className="w-[140px] font-medium text-white font-inter tracking-[-0.5px]">Type</TableHead>
              <TableHead className="font-medium text-white font-inter tracking-[-0.5px]">Details</TableHead>
              <TableHead className="w-[100px] text-right font-medium text-white font-inter tracking-[-0.5px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <>
                {[...Array(10)].map((_, i) => (
                  <TableRow key={i} className="border-b border-[#141414]">
                    <TableCell className="py-3"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="py-3 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </>
            ) : filteredTransactions.length === 0 ? <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-inter tracking-[-0.5px]">
                  No transactions found
                </TableCell>
              </TableRow> : filteredTransactions.map(tx => <TableRow key={tx.id} className="hover:bg-muted/30 border-b border-[#141414]">
                  <TableCell className="py-3">
                    <span className="font-medium text-sm cursor-pointer hover:text-primary transition-colors font-inter tracking-[-0.5px]" onClick={() => tx.user_id && openUserDetailsDialog(tx.user_id)}>
                      {tx.username || "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                    {format(new Date(tx.created_at), "MMM d, yyyy · HH:mm")}
                  </TableCell>
                  <TableCell className="py-3">
                    <span className={cn("font-semibold text-sm font-inter tracking-[-0.5px]", tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                      {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="text-xs capitalize font-inter tracking-[-0.5px]">
                      {tx.type === 'balance_correction' && tx.metadata?.adjustment_type === 'manual_budget_update'
                        ? 'Campaign Budget'
                        : tx.type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-1">
                      {tx.campaign_name && <div className="flex items-center gap-2">
                          {tx.campaign_logo_url && <OptimizedImage src={tx.campaign_logo_url} alt={`${tx.campaign_name} logo`} className="h-4 w-4 rounded object-cover" />}
                          <span className="text-sm font-inter tracking-[-0.5px]">{tx.campaign_name}</span>
                        </div>}
                      {tx.metadata?.campaign_budget_before !== undefined && tx.metadata?.campaign_budget_after !== undefined ? (
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                          Budget: ${Number(tx.metadata.campaign_budget_before).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → ${Number(tx.metadata.campaign_budget_after).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : null}
                      {tx.type === "withdrawal" && tx.metadata?.payout_method ? (
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                          Withdrawal to {tx.metadata.payout_method === 'crypto' ? 'Crypto' : tx.metadata.payout_method === 'paypal' ? 'PayPal' : tx.metadata.payout_method}
                          {tx.metadata.payout_details?.wallet_address && ` · ${tx.metadata.payout_details.wallet_address.slice(0, 6)}...${tx.metadata.payout_details.wallet_address.slice(-4)}`}
                          {tx.metadata.payout_details?.paypal_email && ` · ${tx.metadata.payout_details.paypal_email}`}
                        </span>
                      ) : tx.type === "balance_correction" && !tx.metadata?.adjustment_type ? (
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                          Balance Correction{tx.description && ` · ${tx.description}`}
                        </span>
                      ) : tx.type === "earning" && tx.metadata?.account_username ? (
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">@{tx.metadata.account_username}</span>
                      ) : tx.type === "transfer_sent" && tx.metadata?.recipient_username ? (
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">To: @{tx.metadata.recipient_username}</span>
                      ) : tx.type === "transfer_received" && tx.metadata?.sender_username ? (
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">From: @{tx.metadata.sender_username}</span>
                      ) : !tx.campaign_name && !tx.metadata?.campaign_budget_before && tx.description ? (
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">{tx.description}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    {getStatusBadge(tx.status)}
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>

      {/* User Details Dialog */}
      {selectedUser && <UserDetailsDialog open={userDetailsDialogOpen} onOpenChange={setUserDetailsDialogOpen} user={selectedUser} socialAccounts={userSocialAccounts} loadingSocialAccounts={loadingSocialAccounts} transactions={userTransactions} loadingTransactions={loadingTransactions} paymentMethods={userPaymentMethods} loadingPaymentMethods={loadingPaymentMethods} socialAccountsOpen={socialAccountsOpen} onSocialAccountsOpenChange={setSocialAccountsOpen} transactionsOpen={transactionsOpen} onTransactionsOpenChange={setTransactionsOpen} paymentMethodsOpen={paymentMethodsOpen} onPaymentMethodsOpenChange={setPaymentMethodsOpen} onBalanceUpdated={() => {
      fetchTransactions();
      if (selectedUser) {
        fetchUserTransactions(selectedUser.id);
      }
    }} />}
    </div>;
}