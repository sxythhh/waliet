import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PayoutTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  status: string | null;
  campaign_id: string | null;
  boost_id: string | null;
  campaign?: { title: string } | null;
  boost?: { title: string } | null;
}

interface AllPayoutsViewProps {
  brandId: string;
}

export function AllPayoutsView({ brandId }: AllPayoutsViewProps) {
  const [transactions, setTransactions] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [brandId]);

  const fetchTransactions = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("brand_wallet_transactions")
      .select(`
        id,
        amount,
        type,
        description,
        created_at,
        status,
        campaign_id,
        boost_id,
        campaign:campaigns(title),
        boost:bounty_campaigns(title)
      `)
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(absAmount);
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "payout": return "Creator Payout";
      case "topup": return "Top Up";
      case "allocation": return "Budget Allocation";
      case "adjustment": return "Adjustment";
      default: return type;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "failed": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground border-muted";
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-muted/50 dark:bg-muted-foreground/20" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg font-medium">No transactions yet</p>
        <p className="text-sm">Payouts and transactions will appear here</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Date</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Type</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Program</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Description</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Amount</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {format(new Date(tx.created_at), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {getTypeLabel(tx.type)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {tx.campaign?.title || tx.boost?.title || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                  {tx.description || "—"}
                </td>
                <td className={`px-4 py-3 text-sm font-medium text-right ${tx.amount < 0 ? "text-red-400" : "text-green-400"}`}>
                  {formatAmount(tx.amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="outline" className={`text-xs capitalize ${getStatusColor(tx.status)}`}>
                    {tx.status || "completed"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
