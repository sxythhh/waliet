import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Wallet, ArrowUpRight, Clock, CheckCircle2, DollarSign, TrendingUp, Loader2, ExternalLink, XCircle } from "lucide-react";
import { Brand } from "@/pages/BrandPortal";
import { CreatorWithdrawDialog } from "@/components/dashboard/CreatorWithdrawDialog";
import { format, formatDistanceToNow } from "date-fns";

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
  type?: string;
}

interface EarningsStats {
  totalEarnings: number;
  pendingPayouts: number;
  lastPayout: number;
  transactionCount: number;
}

interface UserProfile {
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
  email: string | null;
  bio: string | null;
}

export function BrandPortalWallet({ brand, userId }: BrandPortalWalletProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [brand.id, userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username, avatar_url, full_name, bio")
          .eq("id", userId)
          .maybeSingle();
        setProfile({ ...profileData, email: user.email || null });
      }

      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletData) {
        setBalance({
          available: walletData.balance || 0,
          pending: 0,
        });
      }

      // Fetch transactions from wallet_transactions
      const { data: txData } = await supabase
        .from("wallet_transactions")
        .select("id, amount, description, status, created_at, type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const formattedTx: Transaction[] = (txData || []).map(t => ({
        id: t.id,
        amount: t.amount || 0,
        description: t.description,
        status: t.status || "pending",
        created_at: t.created_at || new Date().toISOString(),
        type: t.type,
      }));

      setTransactions(formattedTx);

      // Calculate stats
      const totalEarnings = formattedTx
        .filter(t => t.status === "completed" && t.type === "earning")
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingPayouts = formattedTx
        .filter(t => t.status === "pending")
        .reduce((sum, t) => sum + t.amount, 0);

      const completedTx = formattedTx.filter(t => t.status === "completed" && t.type === "earning");
      const lastPayout = completedTx.length > 0 ? completedTx[0].amount : 0;

      setStats({
        totalEarnings,
        pendingPayouts,
        lastPayout,
        transactionCount: formattedTx.length,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[10px]">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-0 text-[10px]">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="text-lg font-semibold bg-muted text-muted-foreground">
              {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.username?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">
              {profile?.full_name || profile?.username || "Creator"}
            </h1>
            {profile?.username && (
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                @{profile.username}
              </p>
            )}
            {profile?.bio && (
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1 line-clamp-1">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Balance & Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <Card className="bg-card border-border col-span-2 lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mb-1">
                  Available Balance
                </p>
                <p className="text-2xl font-semibold text-foreground font-inter tracking-[-0.5px]">
                  ${balance.available.toFixed(2)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <Button
              onClick={() => setShowWithdrawDialog(true)}
              className="w-full mt-4 gap-2 bg-foreground text-background hover:bg-foreground/90"
              disabled={balance.available <= 0}
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </Button>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mb-1">
                  Total Earned
                </p>
                <p className="text-2xl font-semibold text-foreground font-inter tracking-[-0.5px]">
                  ${stats?.totalEarnings?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mb-1">
                  Pending
                </p>
                <p className="text-2xl font-semibold text-foreground font-inter tracking-[-0.5px]">
                  ${stats?.pendingPayouts?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Count */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mb-1">
                  Transactions
                </p>
                <p className="text-2xl font-semibold text-foreground font-inter tracking-[-0.5px]">
                  {stats?.transactionCount || 0}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground font-inter tracking-[-0.5px]">
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-muted">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-inter tracking-[-0.3px] text-sm">
                No transactions yet
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-inter tracking-[-0.3px]">
                Your earnings will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${tx.type === 'earning' ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                      {tx.type === 'earning' ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      ) : tx.type === 'withdrawal' ? (
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground font-inter tracking-[-0.3px] truncate">
                        {tx.description || "Transaction"}
                      </p>
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                        {format(new Date(tx.created_at), "MMM d, yyyy")} · {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(tx.status)}
                    <span className={`text-sm font-semibold font-inter tracking-[-0.3px] ${
                      tx.amount >= 0 ? "text-emerald-500" : "text-red-500"
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
        onSuccess={fetchData}
      />
    </div>
  );
}
