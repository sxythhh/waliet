import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";
import { Brand } from "@/pages/BrandPortal";
import { CreatorWithdrawDialog } from "@/components/dashboard/CreatorWithdrawDialog";
import { formatDistanceToNow } from "date-fns";

interface BrandPortalWalletProps {
  brand: Brand;
  userId: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

export function BrandPortalWallet({ brand, userId }: BrandPortalWalletProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  const accentColor = brand.brand_color || "#2061de";

  useEffect(() => {
    fetchWalletData();
  }, [brand.id, userId]);

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance, pending_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletData) {
        setBalance({
          available: walletData.balance || 0,
          pending: walletData.pending_balance || 0,
        });
      }

      // Fetch recent transactions for this brand
      const { data: txData } = await supabase
        .from("brand_wallet_transactions")
        .select("id, amount, description, status, created_at")
        .eq("brand_id", brand.id)
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      setTransactions((txData as Transaction[]) || []);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-foreground tracking-[-0.5px]">
          Wallet
        </h1>
        <p className="text-sm text-muted-foreground tracking-[-0.3px]">
          Your earnings from {brand.name}
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Available Balance */}
        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground tracking-[-0.3px] mb-1">
                  Available Balance
                </p>
                <p className="text-3xl font-semibold tracking-[-0.5px]">
                  ${balance.available.toFixed(2)}
                </p>
              </div>
              <div
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <Wallet className="h-5 w-5" style={{ color: accentColor }} />
              </div>
            </div>
            <Button
              onClick={() => setShowWithdrawDialog(true)}
              className="w-full mt-4 gap-2"
              style={{ backgroundColor: accentColor }}
              disabled={balance.available <= 0}
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </Button>
          </CardContent>
        </Card>

        {/* Pending Balance */}
        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground tracking-[-0.3px] mb-1">
                  Pending
                </p>
                <p className="text-3xl font-semibold tracking-[-0.5px]">
                  ${balance.pending.toFixed(2)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 tracking-[-0.3px]">
              Earnings being processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-sm bg-white dark:bg-card">
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-foreground mb-4 tracking-[-0.5px]">
            Recent Transactions
          </h3>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground tracking-[-0.3px]">
                No transactions yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate tracking-[-0.3px]">
                      {tx.description || "Payment"}
                    </p>
                    <p className="text-xs text-muted-foreground tracking-[-0.3px]">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(tx.status)}
                    <span className={`text-sm font-semibold tracking-[-0.3px] ${
                      tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"
                    }`}>
                      {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <CreatorWithdrawDialog
        open={showWithdrawDialog}
        onOpenChange={setShowWithdrawDialog}
        balance={balance.available}
        onSuccess={fetchWalletData}
      />
    </div>
  );
}
