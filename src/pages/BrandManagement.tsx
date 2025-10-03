import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CampaignAnalyticsTable } from "@/components/CampaignAnalyticsTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Check, X, TrendingUp, Users, Eye, DollarSign, Trash2, Edit } from "lucide-react";
import { PieChart, Pie, Cell, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { ManageTrainingDialog } from "@/components/ManageTrainingDialog";
import { ImportCampaignStatsDialog } from "@/components/ImportCampaignStatsDialog";
import { MatchAccountsDialog } from "@/components/MatchAccountsDialog";

interface Campaign {
  id: string;
  title: string;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  preview_url: string | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number;
  account_link: string | null;
}

interface Submission {
  id: string;
  status: string;
  views: number;
  earnings: number;
  submitted_at: string;
  creator_id: string;
  platform: string;
  content_url: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    trust_score: number;
    demographics_score: number;
    views_score: number;
    social_accounts: SocialAccount[];
  };
}

export default function BrandManagement() {
  const { slug } = useParams();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandId, setBrandId] = useState<string>("");
  const [brandType, setBrandType] = useState<string>("");
  const [assetsUrl, setAssetsUrl] = useState("");
  const [homeUrl, setHomeUrl] = useState("");
  const [savingUrls, setSavingUrls] = useState(false);
  const [editBudgetDialogOpen, setEditBudgetDialogOpen] = useState(false);
  const [editingBudgetUsed, setEditingBudgetUsed] = useState("");
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [deleteAnalyticsDialogOpen, setDeleteAnalyticsDialogOpen] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [slug]);

  useEffect(() => {
    if (selectedCampaignId) {
      fetchSubmissions();
      fetchAnalytics();
      fetchTransactions();

      // Set up real-time subscription for campaign submissions
      const channel = supabase
        .channel('campaign-submissions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'campaign_submissions',
            filter: `campaign_id=eq.${selectedCampaignId}`
          },
          (payload) => {
            console.log('Submission changed:', payload);
            fetchSubmissions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedCampaignId]);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_account_analytics")
        .select("*")
        .eq("campaign_id", selectedCampaignId)
        .order("total_views", { ascending: false });

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select(`
          *,
          profiles:user_id(username, avatar_url)
        `)
        .contains('metadata', { campaign_id: selectedCampaignId })
        .eq('type', 'earning')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchCampaigns = async () => {
    if (!slug) return;

    try {
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("id, assets_url, home_url, brand_type")
        .eq("slug", slug)
        .maybeSingle();

      if (brandError) throw brandError;
      if (!brandData) return;

      setBrandId(brandData.id);
      setAssetsUrl(brandData.assets_url || "");
      setHomeUrl(brandData.home_url || "");
      setBrandType(brandData.brand_type || "");

      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, budget, budget_used, rpm_rate, status, banner_url, preview_url")
        .eq("brand_id", brandData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);
      if (data && data.length > 0) {
        setSelectedCampaignId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_submissions")
        .select(
          `
          id,
          status,
          views,
          earnings,
          submitted_at,
          creator_id,
          platform,
          content_url,
          profiles!campaign_submissions_creator_id_fkey (
            username, 
            avatar_url, 
            trust_score, 
            demographics_score, 
            views_score
          )
        `
        )
        .eq("campaign_id", selectedCampaignId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      // Fetch social accounts separately - only campaign-specific accounts
      const submissionsWithAccounts = await Promise.all(
        (data || []).map(async (submission) => {
          const { data: accounts } = await supabase
            .from("social_accounts")
            .select("id, platform, username, follower_count, account_link")
            .eq("user_id", submission.creator_id)
            .eq("campaign_id", selectedCampaignId);

          return {
            ...submission,
            profiles: {
              ...submission.profiles,
              social_accounts: accounts || []
            }
          };
        })
      );

      setSubmissions(submissionsWithAccounts);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load submissions");
    }
  };

  const handleApplicationAction = async (
    submissionId: string,
    action: "approved" | "rejected"
  ) => {
    try {
      const { error } = await supabase
        .from("campaign_submissions")
        .update({ status: action })
        .eq("id", submissionId);

      if (error) throw error;

      toast.success(`Application ${action}`);
      fetchSubmissions();
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application");
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaignId) return;

    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", selectedCampaignId);

      if (error) throw error;

      toast.success("Campaign deleted successfully");
      fetchCampaigns();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const handleSaveUrls = async () => {
    if (!brandId) return;

    setSavingUrls(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({
          assets_url: assetsUrl || null,
          home_url: homeUrl || null,
          brand_type: brandType || null,
        })
        .eq("id", brandId);

      if (error) throw error;

      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSavingUrls(false);
    }
  };

  const handleEditBudgetUsed = () => {
    setEditingBudgetUsed(selectedCampaign?.budget_used?.toString() || "0");
    setEditBudgetDialogOpen(true);
  };

  const handleSaveBudgetUsed = async () => {
    if (!selectedCampaignId) return;

    const budgetUsedValue = parseFloat(editingBudgetUsed);
    if (isNaN(budgetUsedValue) || budgetUsedValue < 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ budget_used: budgetUsedValue })
        .eq("id", selectedCampaignId);

      if (error) throw error;

      toast.success("Budget updated successfully");
      setEditBudgetDialogOpen(false);
      fetchCampaigns();
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget");
    }
  };

  const handleDeleteAllAnalytics = async () => {
    if (!selectedCampaignId) return;

    try {
      const { error } = await supabase
        .from("campaign_account_analytics")
        .delete()
        .eq("campaign_id", selectedCampaignId);

      if (error) throw error;

      toast.success("All analytics deleted successfully");
      setDeleteAnalyticsDialogOpen(false);
    } catch (error) {
      console.error("Error deleting analytics:", error);
      toast.error("Failed to delete analytics");
    }
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const approvedSubmissions = submissions.filter((s) => s.status === "approved");
  const pendingSubmissions = submissions.filter((s) => s.status === "pending");

  const totalViews = approvedSubmissions.reduce((sum, s) => sum + s.views, 0);
  const totalSpent = approvedSubmissions.reduce((sum, s) => sum + Number(s.earnings), 0);
  const effectiveCPM =
    totalViews > 0 ? (totalSpent / totalViews) * 1000 : 0;

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">No campaigns found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Campaign Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold text-white">Campaign Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-[300px] bg-[#202020] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-white/10">
                {campaigns.map((campaign) => (
                  <SelectItem
                    key={campaign.id}
                    value={campaign.id}
                    className="text-white hover:bg-white/10 focus:bg-white/10"
                  >
                    {campaign.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCampaignId && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="bg-[#202020] border-white/10">
            <TabsTrigger value="analytics" className="text-[#A6A6A6] data-[state=active]:bg-primary data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="creators" className="text-[#A6A6A6] data-[state=active]:bg-primary data-[state=active]:text-white">
              Creators
            </TabsTrigger>
            <TabsTrigger value="applications" className="text-[#A6A6A6] data-[state=active]:bg-primary data-[state=active]:text-white">
              Applications
              {pendingSubmissions.length > 0 && (
                <Badge className="ml-2 bg-primary">{pendingSubmissions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-[#A6A6A6] data-[state=active]:bg-primary data-[state=active]:text-white">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {/* Campaign Performance Overview */}
            <Card className="bg-[#202020] border-transparent">
              <CardHeader>
                <CardTitle className="text-white text-sm">Campaign Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  <div className="text-center p-4 rounded-lg bg-[#191919]">
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      {analytics.reduce((sum, a) => sum + a.total_views, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-white/60 mt-1">Total Views</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-[#191919]">
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      {analytics.reduce((sum, a) => sum + a.total_videos, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-white/60 mt-1">Total Videos</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-[#191919]">
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      ${transactions.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-white/60 mt-1">Total Paid</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-[#191919]">
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      {analytics.length > 0 
                        ? (analytics.reduce((sum, a) => sum + a.average_engagement_rate, 0) / analytics.length).toFixed(2)
                        : '0.00'}%
                    </div>
                    <div className="text-sm text-white/60 mt-1">Avg Engagement</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-[#191919]">
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      ${effectiveCPM.toFixed(2)}
                    </div>
                    <div className="text-sm text-white/60 mt-1">Effective CPM</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-[#191919]">
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      ${Number(selectedCampaign?.budget_used || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-white/60 mt-1 flex items-center justify-center gap-1">
                      Budget Used
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 text-white/40 hover:text-white hover:bg-white/10 p-0"
                          onClick={handleEditBudgetUsed}
                          title="Edit budget used"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-[#191919]">
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      {approvedSubmissions.length}
                    </div>
                    <div className="text-sm text-white/60 mt-1">Active Creators</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-[#191919]">
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      ${selectedCampaign?.budget || 0}
                    </div>
                    <div className="text-sm text-white/60 mt-1">Total Budget</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              {/* Views by Platform - Pie Chart */}
              <Card className="bg-[#202020] border-transparent">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Views by Platform</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {(() => {
                      const platformData = analytics.reduce((acc: any[], account) => {
                        const existing = acc.find(item => item.platform === account.platform);
                        if (existing) {
                          existing.views += account.total_views;
                        } else {
                          acc.push({
                            platform: account.platform,
                            views: account.total_views
                          });
                        }
                        return acc;
                      }, []);

                      const COLORS: Record<string, string> = {
                        tiktok: '#EF4444',
                        instagram: '#A855F7',
                        youtube: '#EF4444',
                      };

                      if (platformData.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-white/40 text-sm">
                            No platform data available
                          </div>
                        );
                      }

                      const totalViews = platformData.reduce((sum, item) => sum + item.views, 0);

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={platformData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="views"
                              nameKey="platform"
                              stroke="none"
                            >
                              {platformData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[entry.platform.toLowerCase()] || '#22C55E'}
                                  className="transition-opacity hover:opacity-80"
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: "#0C0C0C",
                                border: "none",
                                borderRadius: "8px",
                                padding: "8px 12px"
                              }}
                              labelStyle={{
                                color: "#ffffff",
                                fontFamily: "Inter, sans-serif",
                                fontSize: "12px",
                                fontWeight: 500,
                                textTransform: "capitalize"
                              }}
                              itemStyle={{
                                color: "#ffffff",
                                fontFamily: "Inter, sans-serif",
                                fontSize: "12px"
                              }}
                              formatter={(value: number) => [
                                `${value.toLocaleString()} views (${((value / totalViews) * 100).toFixed(1)}%)`,
                                ''
                              ]}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              formatter={(value) => (
                                <span className="text-white/70 text-xs capitalize">{value}</span>
                              )}
                              iconType="circle"
                              iconSize={8}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Spend - Bar Chart */}
              <Card className="bg-[#202020] border-transparent">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Daily Spend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {(() => {
                      const dailySpendData = transactions.reduce((acc: any[], txn) => {
                        const date = new Date(txn.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        });
                        const existing = acc.find(item => item.date === date);
                        if (existing) {
                          existing.spend += Number(txn.amount);
                        } else {
                          acc.push({
                            date,
                            spend: Number(txn.amount)
                          });
                        }
                        return acc;
                      }, []);

                      // Sort by date and take last 7 days
                      const sortedData = dailySpendData
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(-7);

                      if (sortedData.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-white/40 text-sm">
                            No spending data available
                          </div>
                        );
                      }

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sortedData}>
                            <XAxis 
                              dataKey="date" 
                              stroke="rgba(255, 255, 255, 0.4)" 
                              fontSize={12} 
                              tickLine={false} 
                              axisLine={false}
                              style={{ opacity: 0.6 }}
                            />
                            <YAxis 
                              stroke="rgba(255, 255, 255, 0.4)" 
                              fontSize={12} 
                              tickLine={false} 
                              axisLine={false} 
                              tickFormatter={value => `$${value}`}
                              style={{ opacity: 0.6 }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: "#0C0C0C",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "8px",
                                padding: "8px 12px"
                              }}
                              labelStyle={{
                                color: "#ffffff",
                                fontFamily: "Inter, sans-serif",
                                fontSize: "12px",
                                fontWeight: 500
                              }}
                              itemStyle={{
                                color: "#ffffff",
                                fontFamily: "Inter, sans-serif",
                                fontSize: "12px"
                              }}
                              formatter={(value: number) => `$${value.toFixed(2)}`}
                              cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                            />
                            <Bar 
                              dataKey="spend" 
                              fill="#22C55E" 
                              radius={[8, 8, 0, 0]} 
                              name="Spent"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Creators Tab */}
          <TabsContent value="creators">
            <Card className="bg-[#202020] border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Active Creators
                  <Badge variant="secondary" className="ml-2">
                    {approvedSubmissions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvedSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-sm">No active creators yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvedSubmissions.map((submission) => {
                      const getPlatformIcon = (platform: string) => {
                        switch (platform.toLowerCase()) {
                          case 'tiktok':
                            return <img src="/src/assets/tiktok-logo.svg" alt="TikTok" className="w-4 h-4" />;
                          case 'instagram':
                            return <img src="/src/assets/instagram-logo.svg" alt="Instagram" className="w-4 h-4" />;
                          case 'youtube':
                            return <img src="/src/assets/youtube-logo.svg" alt="YouTube" className="w-4 h-4" />;
                          default:
                            return null;
                        }
                      };

                      return (
                        <Card key={submission.id} className="bg-transparent border border-white/10 overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              {/* Creator Avatar & Info */}
                              <div className="flex items-start gap-3 flex-1">
                                <div className="flex-shrink-0">
                                  {submission.profiles?.avatar_url ? (
                                    <img
                                      src={submission.profiles.avatar_url}
                                      alt={submission.profiles.username}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                      <Users className="h-6 w-6 text-primary" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 space-y-2">
                                  <div>
                                    <h3 className="font-semibold text-white">
                                      {submission.profiles?.username || "Unknown"}
                                    </h3>
                                  </div>

                                  {/* All Linked Accounts */}
                                  {submission.profiles?.social_accounts && submission.profiles.social_accounts.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {submission.profiles.social_accounts.map((account) => (
                                        <div key={account.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                          <a
                                            href={account.account_link || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors"
                                          >
                                            {getPlatformIcon(account.platform)}
                                            <span>@{account.username}</span>
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-white/40">No accounts linked</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card className="bg-[#202020] border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Pending Applications
                  <Badge variant="secondary" className="ml-2">
                    {pendingSubmissions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-sm">No pending applications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingSubmissions.map((submission) => {
                      const getPlatformIcon = (platform: string) => {
                        switch (platform.toLowerCase()) {
                          case 'tiktok':
                            return <img src="/src/assets/tiktok-logo.svg" alt="TikTok" className="w-4 h-4" />;
                          case 'instagram':
                            return <img src="/src/assets/instagram-logo.svg" alt="Instagram" className="w-4 h-4" />;
                          case 'youtube':
                            return <img src="/src/assets/youtube-logo.svg" alt="YouTube" className="w-4 h-4" />;
                          default:
                            return null;
                        }
                      };

                      return (
                        <Card key={submission.id} className="bg-transparent border border-white/10 overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              {/* Creator Avatar & Info */}
                              <div className="flex items-start gap-3 flex-1">
                                <div className="flex-shrink-0">
                                  {submission.profiles?.avatar_url ? (
                                    <img
                                      src={submission.profiles.avatar_url}
                                      alt={submission.profiles.username}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                      <Users className="h-6 w-6 text-primary" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 space-y-2">
                                  <div>
                                    <h3 className="font-semibold text-white">
                                      {submission.profiles?.username || "Unknown"}
                                    </h3>
                                    <span className="text-xs text-white/60">
                                      {new Date(submission.submitted_at).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric'
                                      })}
                                    </span>
                                  </div>

                                  {/* All Linked Accounts */}
                                  {submission.profiles?.social_accounts && submission.profiles.social_accounts.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {submission.profiles.social_accounts.map((account) => (
                                        <div key={account.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                          <a
                                            href={account.account_link || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors"
                                          >
                                            {getPlatformIcon(account.platform)}
                                            <span>@{account.username}</span>
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-white/40">No accounts linked</p>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-1.5 flex-shrink-0">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleApplicationAction(submission.id, "approved")
                                  }
                                  className="bg-success/20 hover:bg-success/30 text-success border-0 h-8 px-3"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleApplicationAction(submission.id, "rejected")
                                  }
                                  className="bg-destructive/20 hover:bg-destructive/30 border-0 h-8 px-3"
                                >
                                  <X className="h-3.5 w-3.5 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-[#202020] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Brand Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isAdmin && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-500 text-sm">
                      Only administrators can edit brand settings
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="brand-type" className="text-white">
                    Brand Type
                  </Label>
                  <Select value={brandType} onValueChange={setBrandType} disabled={!isAdmin}>
                    <SelectTrigger className="bg-[#191919] border-white/10 text-white">
                      <SelectValue placeholder="Select brand type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-white/10">
                      <SelectItem value="Standard" className="text-white hover:bg-white/10">
                        Standard
                      </SelectItem>
                      <SelectItem value="DWY" className="text-white hover:bg-white/10">
                        DWY (Do With You)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-white/60">
                    DWY brands have access to the Training portal
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assets-url" className="text-white">
                    Assets Page URL
                  </Label>
                  <Input
                    id="assets-url"
                    type="url"
                    placeholder="https://example.com/assets"
                    value={assetsUrl}
                    onChange={(e) => setAssetsUrl(e.target.value)}
                    className="bg-[#191919] border-white/10 text-white"
                    disabled={!isAdmin}
                  />
                  <p className="text-sm text-white/60">
                    This URL will be embedded when users visit the Assets page
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="home-url" className="text-white">
                    Home Page HTML (DWY Brands Only)
                  </Label>
                  <Textarea
                    id="home-url"
                    placeholder='<iframe src="https://example.com" width="100%" height="100%" frameborder="0" allowfullscreen />'
                    value={homeUrl}
                    onChange={(e) => setHomeUrl(e.target.value)}
                    className="bg-[#191919] border-white/10 text-white font-mono min-h-[120px]"
                    disabled={!isAdmin}
                  />
                  <p className="text-sm text-white/60">
                    For DWY brands, paste HTML code (like iframe) to embed on the Home page instead of the default dashboard
                  </p>
                </div>

                <Button
                  onClick={handleSaveUrls}
                  disabled={savingUrls || !isAdmin}
                  className="bg-primary hover:bg-primary/90"
                >
                  {savingUrls ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-[#202020] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Campaign?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete <strong className="text-white">{selectedCampaign?.title}</strong> and
                all associated submissions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCampaign}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Budget Used Dialog */}
        <AlertDialog open={editBudgetDialogOpen} onOpenChange={setEditBudgetDialogOpen}>
          <AlertDialogContent className="bg-[#2a2a2a] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Edit Budget Used</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                Update the used budget for this campaign.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="budget-used" className="text-white">
                  Budget Used ($)
                </Label>
                <Input
                  id="budget-used"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingBudgetUsed}
                  onChange={(e) => setEditingBudgetUsed(e.target.value)}
                  className="bg-[#191919] border-white/10 text-white"
                  placeholder="0.00"
                />
                <p className="text-sm text-white/40">
                  Total budget: ${selectedCampaign?.budget || 0}
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSaveBudgetUsed}
                className="bg-primary hover:bg-primary/90"
              >
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete All Analytics Dialog */}
        <AlertDialog open={deleteAnalyticsDialogOpen} onOpenChange={setDeleteAnalyticsDialogOpen}>
          <AlertDialogContent className="bg-[#202020] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete All Analytics?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete all analytics data for this campaign. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAllAnalytics}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
