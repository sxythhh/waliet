import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Target, Calendar, Award, XCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  wonDeals: number;
  lostDeals: number;
  totalDeals: number;
  closeRate: number;
  avgDealValue: number;
  revenueThisMonth: number;
  dealsByStage: Record<string, number>;
}

export function SalesAnalyticsView() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: deals, error } = await supabase
        .from('sales_deals')
        .select('*');

      if (error) throw error;

      const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
      const wonDeals = deals.filter(d => d.stage === 'won');
      const lostDeals = deals.filter(d => d.stage === 'lost');

      const totalPipelineValue = activeDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
      const weightedPipelineValue = activeDeals.reduce(
        (sum, deal) => sum + (deal.deal_value || 0) * ((deal.probability || 50) / 100),
        0
      );

      const thisMonth = new Date();
      thisMonth.setDate(1);
      const revenueThisMonth = wonDeals
        .filter(d => d.won_date && new Date(d.won_date) >= thisMonth)
        .reduce((sum, deal) => sum + (deal.deal_value || 0), 0);

      const totalClosed = wonDeals.length + lostDeals.length;
      const closeRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;

      const avgDealValue = wonDeals.length > 0
        ? wonDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0) / wonDeals.length
        : 0;

      const dealsByStage = deals.reduce((acc, deal) => {
        acc[deal.stage] = (acc[deal.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setAnalytics({
        totalPipelineValue,
        weightedPipelineValue,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        totalDeals: deals.length,
        closeRate,
        avgDealValue,
        revenueThisMonth,
        dealsByStage,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.totalPipelineValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Weighted: ${Math.round(analytics.weightedPipelineValue).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Close Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.closeRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.wonDeals} won / {analytics.wonDeals + analytics.lostDeals} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(analytics.avgDealValue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From won deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.revenueThisMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Closed this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.dealsByStage).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{stage}</span>
                  <span className="text-sm text-muted-foreground">{count} deals</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Win/Loss Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.wonDeals}</p>
                  <p className="text-sm text-muted-foreground">Deals Won</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.lostDeals}</p>
                  <p className="text-sm text-muted-foreground">Deals Lost</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
