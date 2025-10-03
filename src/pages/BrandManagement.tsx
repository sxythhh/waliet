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
import { Check, X, TrendingUp, Users, Eye, DollarSign, Trash2, Edit } from "lucide-react";
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

  useEffect(() => {
    fetchCampaigns();
  }, [slug]);

  useEffect(() => {
    if (selectedCampaignId) {
      fetchSubmissions();

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
          profiles (
            username, 
            avatar_url, 
            trust_score, 
            demographics_score, 
            views_score,
            social_accounts (
              id,
              platform,
              username,
              follower_count,
              account_link
            )
          )
        `
        )
        .eq("campaign_id", selectedCampaignId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
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
          <h1 className="text-3xl font-bold text-white">Campaign Management</h1>
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
            <div className="flex justify-end mb-4">
              <ImportCampaignStatsDialog 
                campaignId={selectedCampaignId}
                onImportComplete={fetchSubmissions}
                onMatchingRequired={() => setMatchDialogOpen(true)}
              />
            </div>
            
            {/* Imported Analytics Data */}
            <CampaignAnalyticsTable campaignId={selectedCampaignId} />
            
            {/* Matching Dialog */}
            <MatchAccountsDialog
              open={matchDialogOpen}
              onOpenChange={setMatchDialogOpen}
              campaignId={selectedCampaignId}
              onMatchComplete={fetchSubmissions}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#202020] border-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/60 font-normal flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Effective CPM
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    ${effectiveCPM.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#202020] border-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/60 font-normal flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Budget Used
                    </span>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
                        onClick={handleEditBudgetUsed}
                        title="Edit budget used"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    ${Number(selectedCampaign?.budget_used || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-white/40">
                    of ${selectedCampaign?.budget || 0}
                  </div>
                  {/* Debug info */}
                  <div className="text-xs text-white/20 mt-2">
                    Admin: {isAdmin ? 'Yes' : 'No'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#202020] border-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/60 font-normal flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Total Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {totalViews.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#202020] border-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/60 font-normal flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Creators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {approvedSubmissions.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <Card className="bg-[#202020] border-transparent">
                <CardHeader>
                  <CardTitle className="text-white">Views Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-white/40 text-sm">
                      {approvedSubmissions.length > 0 
                        ? `${approvedSubmissions.length} submissions tracked`
                        : 'No data available'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#202020] border-transparent">
                <CardHeader>
                  <CardTitle className="text-white">Earnings by Creator</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {approvedSubmissions.length === 0 ? (
                      <div className="h-[300px] flex items-center justify-center text-white/40 text-sm">
                        No creator data available
                      </div>
                    ) : (
                      approvedSubmissions
                        .sort((a, b) => Number(b.earnings) - Number(a.earnings))
                        .slice(0, 5)
                        .map((submission) => (
                          <div key={submission.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm">
                                {submission.profiles?.username?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <span className="text-white text-sm">
                                {submission.profiles?.username || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-white/60 text-sm">
                                {submission.views.toLocaleString()} views
                              </span>
                              <span className="text-white font-semibold">
                                ${Number(submission.earnings).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#202020] border-transparent lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">Campaign Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {((totalSpent / (selectedCampaign?.budget || 1)) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-white/60 mt-1">Budget Used</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {approvedSubmissions.length > 0 
                          ? (totalViews / approvedSubmissions.length).toFixed(0)
                          : '0'}
                      </div>
                      <div className="text-sm text-white/60 mt-1">Avg Views per Creator</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {approvedSubmissions.length > 0
                          ? (totalSpent / approvedSubmissions.length).toFixed(2)
                          : '0.00'}
                      </div>
                      <div className="text-sm text-white/60 mt-1">Avg Earnings per Creator</div>
                    </div>
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

                                  {/* Application Account */}
                                  {submission.profiles?.social_accounts && submission.profiles.social_accounts.length > 0 ? (
                                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                      {(() => {
                                        const applicationAccount = submission.profiles.social_accounts.find(
                                          account => account.platform.toLowerCase() === submission.platform.toLowerCase()
                                        );
                                        
                                        if (!applicationAccount) return null;
                                        
                                        return (
                                          <a
                                            href={applicationAccount.account_link || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors"
                                          >
                                            {getPlatformIcon(applicationAccount.platform)}
                                            <span>@{applicationAccount.username}</span>
                                          </a>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-white/40">No account found</p>
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

                                  {/* Application Account */}
                                  {submission.profiles?.social_accounts && submission.profiles.social_accounts.length > 0 ? (
                                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                      {(() => {
                                        const applicationAccount = submission.profiles.social_accounts.find(
                                          account => account.platform.toLowerCase() === submission.platform.toLowerCase()
                                        );
                                        
                                        if (!applicationAccount) return null;
                                        
                                        return (
                                          <a
                                            href={applicationAccount.account_link || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors"
                                          >
                                            {getPlatformIcon(applicationAccount.platform)}
                                            <span>@{applicationAccount.username}</span>
                                          </a>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-white/40">No account found</p>
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
      </div>
    </div>
  );
}
