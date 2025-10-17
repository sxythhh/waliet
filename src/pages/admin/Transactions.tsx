import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { OptimizedImage } from "@/components/OptimizedImage";
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
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title")
        .order("title");

      if (error) throw error;

      setCampaigns(data?.map(c => ({ id: c.id, name: c.title })) || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: txData, error: txError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (txError) throw txError;

      // Fetch user profiles separately
      const userIds = txData?.map(tx => tx.user_id).filter((id): id is string => !!id) || [];
      const uniqueUserIds = [...new Set(userIds)];
      
      let profilesMap: Record<string, any> = {};
      
      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", uniqueUserIds);

        profilesMap = profilesData?.reduce((acc, profile) => ({
          ...acc,
          [profile.id]: profile
        }), {} as Record<string, any>) || {};
      }

      if (txError) throw txError;

      // Fetch campaign names if metadata contains campaign_id
      const campaignIds = txData
        ?.filter(tx => tx.metadata && typeof tx.metadata === 'object' && 'campaign_id' in tx.metadata)
        .map(tx => (tx.metadata as any).campaign_id) || [];

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

      const formattedTransactions = txData?.map((tx: any) => {
        const campaignId = tx.metadata && typeof tx.metadata === 'object' && 'campaign_id' in tx.metadata 
          ? (tx.metadata as any).campaign_id 
          : undefined;
        
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
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    // Search term filter
    const matchesSearch =
      tx.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Campaign filter
    const matchesCampaign =
      selectedCampaign === "all" ||
      (selectedCampaign === "none" && !tx.metadata?.campaign_id) ||
      (tx.metadata?.campaign_id === selectedCampaign);

    // Type filter
    const matchesType =
      selectedType === "all" || tx.type === selectedType;

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

    return matchesSearch && matchesCampaign && matchesType && matchesAmount;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      tiktok: tiktokLogo,
      instagram: instagramLogo,
      youtube: youtubeLogo,
    };
    return icons[platform.toLowerCase()];
  };

  const getTypeBadge = (type: string) => {
    const isCredit = type === "credit" || type === "earnings" || type === "referral_bonus";
    return (
      <Badge variant={isCredit ? "default" : "destructive"}>
        {isCredit ? "+" : "-"}${Math.abs(Number(type))}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">All Transactions</h1>
        <div className="text-sm text-muted-foreground">
          Total: {filteredTransactions.length} transactions
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
            <Input
              placeholder="Search by username, email, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              <SelectItem value="none">No Campaign</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="earning">Earning</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="balance_correction">Balance Correction</SelectItem>
            </SelectContent>
          </Select>

          <Select value={amountFilter} onValueChange={setAmountFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by amount" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Amounts</SelectItem>
              <SelectItem value="positive">Positive Only</SelectItem>
              <SelectItem value="negative">Negative Only</SelectItem>
              <SelectItem value="over100">Over $100</SelectItem>
              <SelectItem value="under10">Under $10</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{tx.username || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{tx.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className={tx.amount >= 0 ? "text-green-600" : "text-red-600"}>
                        {tx.amount >= 0 ? "+" : ""}${tx.amount.toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tx.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {tx.campaign_name ? (
                      <div className="flex items-center gap-2">
                        {tx.campaign_logo_url && (
                          <OptimizedImage 
                            src={tx.campaign_logo_url} 
                            alt={`${tx.campaign_name} logo`}
                            className="h-6 w-6 rounded object-cover"
                          />
                        )}
                        <span className="text-sm">{tx.campaign_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs" title={tx.description}>
                    {tx.type === "earning" && tx.metadata?.account_username && tx.metadata?.platform ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(tx.metadata.platform) && (
                            <img 
                              src={getPlatformIcon(tx.metadata.platform)} 
                              alt={tx.metadata.platform}
                              className="h-4 w-4"
                            />
                          )}
                          <span className="font-medium">@{tx.metadata.account_username}</span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{tx.description}</span>
                      </div>
                    ) : (
                      <span className="truncate block">{tx.description}</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
