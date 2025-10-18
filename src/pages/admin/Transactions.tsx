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
import { Search, DollarSign, Calendar as CalendarIcon, User } from "lucide-react";
import { format } from "date-fns";
import { OptimizedImage } from "@/components/OptimizedImage";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import instagramLogo from "@/assets/instagram-logo.svg";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
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
      const {
        data: txData,
        error: txError
      } = await supabase.from("wallet_transactions").select("*").order("created_at", {
        ascending: false
      });
      if (txError) throw txError;

      // Fetch user profiles separately
      const userIds = txData?.map(tx => tx.user_id).filter((id): id is string => !!id) || [];
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
      if (txError) throw txError;

      // Fetch campaign names if metadata contains campaign_id
      const campaignIds = txData?.filter(tx => tx.metadata && typeof tx.metadata === 'object' && 'campaign_id' in tx.metadata).map(tx => (tx.metadata as any).campaign_id) || [];
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
      const formattedTransactions = txData?.map((tx: any) => {
        const campaignId = tx.metadata && typeof tx.metadata === 'object' && 'campaign_id' in tx.metadata ? (tx.metadata as any).campaign_id : undefined;
        console.log('Transaction:', tx.id, 'Campaign ID:', campaignId, 'Logo URL:', campaignsMap[campaignId]?.brand_logo_url);
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
      .select(`
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
      `)
      .eq("user_id", userId);
    
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
    const { data: txData, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    
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
    const { data, error } = await supabase
      .from("wallets")
      .select("payout_method, payout_details")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching payment methods:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payment methods"
      });
      setUserPaymentMethods([]);
    } else {
      setUserPaymentMethods(data ? [data] : []);
    }
    setLoadingPaymentMethods(false);
  };

  const openUserDetailsDialog = async (userId: string) => {
    // Fetch user profile
    const { data: userData, error } = await supabase
      .from("profiles")
      .select(`
        *,
        wallets (
          balance,
          total_earned,
          total_withdrawn
        )
      `)
      .eq("id", userId)
      .maybeSingle();
    
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
    const matchesSearch = tx.username?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.email?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Campaign filter
    const matchesCampaign = selectedCampaign === "all" || selectedCampaign === "none" && !tx.metadata?.campaign_id || tx.metadata?.campaign_id === selectedCampaign;

    // Type filter
    const matchesType = selectedType === "all" || tx.type === selectedType;

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
    const txDate = new Date(tx.created_at);
    if (dateFrom) {
      matchesDateRange = txDate >= dateFrom;
    }
    if (dateTo && matchesDateRange) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      matchesDateRange = txDate <= endOfDay;
    }
    return matchesSearch && matchesCampaign && matchesType && matchesAmount && matchesDateRange;
  });
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
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
    const isCredit = type === "credit" || type === "earnings" || type === "referral_bonus";
    return <Badge variant={isCredit ? "default" : "destructive"}>
        {isCredit ? "+" : "-"}${Math.abs(Number(type))}
      </Badge>;
  };
  return <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">All Transactions</h1>
        <div className="text-sm text-muted-foreground">
          Total: {filteredTransactions.length} transactions
        </div>
      </div>

      <Card className="p-4 bg-muted/30 border-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5 z-10" />
            <Input placeholder="Search transactions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9 text-sm bg-background/60 border-0 shadow-sm" />
          </div>

          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[160px] h-9 text-sm bg-background/60 border-0 shadow-sm">
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
            <SelectTrigger className="w-[140px] h-9 text-sm bg-background/60 border-0 shadow-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="earning">Earning</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="balance_correction">Balance Correction</SelectItem>
            </SelectContent>
          </Select>

          <Select value={amountFilter} onValueChange={setAmountFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm bg-background/60 border-0 shadow-sm">
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
              <Button variant="ghost" className={cn("h-9 px-3 text-sm bg-background/60 border-0 shadow-sm hover:bg-background/80", !dateFrom && !dateTo && "text-muted-foreground")}>
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
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">User & Date</TableHead>
              <TableHead className="w-[140px]">Amount</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-[80px] text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading transactions...
                </TableCell>
              </TableRow> : filteredTransactions.length === 0 ? <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow> : filteredTransactions.map(tx => <TableRow key={tx.id} className="hover:bg-muted/50">
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span 
                          className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={() => tx.user_id && openUserDetailsDialog(tx.user_id)}
                        >
                          {tx.username || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-5">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), "MMM d, yyyy · HH:mm")}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className={cn("inline-flex items-center gap-1.5 font-semibold text-sm", tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                      <DollarSign className="h-3.5 w-3.5" />
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="secondary" className="text-xs font-medium capitalize px-2.5 py-0.5 bg-[#000a00]/0">
                      {tx.type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-2">
                      {tx.campaign_name && <div className="flex items-center gap-2">
                          {tx.campaign_logo_url && <OptimizedImage src={tx.campaign_logo_url} alt={`${tx.campaign_name} logo`} className="h-5 w-5 rounded object-cover" />}
                          <span className="text-xs font-medium text-muted-foreground">{tx.campaign_name}</span>
                        </div>}
                      {tx.type === "earning" && tx.metadata?.account_username && tx.metadata?.platform ? <div className="flex items-center gap-2">
                          {getPlatformIcon(tx.metadata.platform) && <img src={getPlatformIcon(tx.metadata.platform)} alt={tx.metadata.platform} className="h-4 w-4" />}
                          <span className="text-sm font-medium">@{tx.metadata.account_username}</span>
                        </div> : <span className="text-sm text-muted-foreground">{tx.description}</span>}
                      {(tx.type === "earning" || tx.metadata?.adjustment_type === "manual_budget_update") && (tx.metadata?.campaign_budget_before !== undefined || tx.metadata?.budget_before !== undefined) && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">Campaign Budget:</span>
                            <span>${Number(tx.metadata.budget_before || tx.metadata.campaign_budget_before || 0).toFixed(2)}</span>
                            <span>→</span>
                            <span className="font-semibold">${Number(tx.metadata.budget_after || tx.metadata.campaign_budget_after || 0).toFixed(2)}</span>
                            {tx.metadata.campaign_total_budget && (
                              <span className="text-muted-foreground/70">/ ${Number(tx.metadata.campaign_total_budget).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    {getStatusBadge(tx.status)}
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </Card>

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
            if (selectedUser) {
              fetchUserTransactions(selectedUser.id);
            }
          }}
        />
      )}
    </div>;
}