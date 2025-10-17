import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

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

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by username, email, description, or campaign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
                  <TableCell className="max-w-xs truncate" title={tx.description}>
                    {tx.description}
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
