import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
}

interface BrandPortalEarningsProps {
  brand: Brand;
  userId: string;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  campaign_title?: string;
}

interface EarningsStats {
  totalEarnings: number;
  pendingPayouts: number;
  lastPayout: number;
  transactionCount: number;
}

export function BrandPortalEarnings({ brand, userId }: BrandPortalEarningsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const accentColor = brand.brand_color || "#2061de";

  useEffect(() => {
    const fetchEarnings = async () => {
      setLoading(true);

      // Fetch payouts from payout_items table
      const { data: payoutItems } = await supabase
        .from("payout_items")
        .select("id, amount, status, description, created_at")
        .eq("user_id", userId)
        .eq("brand_id", brand.id)
        .order("created_at", { ascending: false });

      const formattedTransactions: Transaction[] = (payoutItems || []).map(t => ({
        id: t.id,
        amount: t.amount || 0,
        status: t.status || "pending",
        description: t.description,
        created_at: t.created_at,
        campaign_title: undefined,
      }));

      setTransactions(formattedTransactions);

      // Calculate stats
      const totalEarnings = formattedTransactions
        .filter(t => t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingPayouts = formattedTransactions
        .filter(t => t.status === "pending")
        .reduce((sum, t) => sum + t.amount, 0);

      const completedTransactions = formattedTransactions.filter(t => t.status === "completed");
      const lastPayout = completedTransactions.length > 0 ? completedTransactions[0].amount : 0;

      setStats({
        totalEarnings,
        pendingPayouts,
        lastPayout,
        transactionCount: formattedTransactions.length,
      });

      setLoading(false);
    };

    fetchEarnings();
  }, [brand.id, userId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-50 text-emerald-600 border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-50 text-amber-600 border-0">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-50 text-red-600 border-0">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Earnings</h1>
        <p className="text-gray-500 mt-1">Track your earnings from {brand.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Earned</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${stats?.totalEarnings?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <DollarSign className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${stats?.pendingPayouts?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Last Payout</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${stats?.lastPayout?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50">
                <ArrowUpRight className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Transactions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.transactionCount || 0}
                </p>
              </div>
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <TrendingUp className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="bg-white border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <DollarSign className="h-6 w-6" style={{ color: accentColor }} />
              </div>
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">Your earnings will appear here</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-600 font-medium">Date</TableHead>
                    <TableHead className="text-gray-600 font-medium">Description</TableHead>
                    <TableHead className="text-gray-600 font-medium">Campaign</TableHead>
                    <TableHead className="text-gray-600 font-medium">Status</TableHead>
                    <TableHead className="text-gray-600 font-medium text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                      <TableCell className="text-gray-600">
                        {format(new Date(transaction.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-gray-900 font-medium">
                        {transaction.description || "Payment"}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {transaction.campaign_title || "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-900">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
