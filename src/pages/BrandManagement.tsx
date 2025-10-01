import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Check, X, TrendingUp, Users, Eye, DollarSign, Trash2 } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface Campaign {
  id: string;
  title: string;
  budget: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
}

interface Submission {
  id: string;
  status: string;
  views: number;
  earnings: number;
  submitted_at: string;
  creator_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
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
  const [assetsUrl, setAssetsUrl] = useState("");
  const [homeUrl, setHomeUrl] = useState("");
  const [savingUrls, setSavingUrls] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [slug]);

  useEffect(() => {
    if (selectedCampaignId) {
      fetchSubmissions();
    }
  }, [selectedCampaignId]);

  const fetchCampaigns = async () => {
    if (!slug) return;

    try {
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("id, assets_url, home_url")
        .eq("slug", slug)
        .maybeSingle();

      if (brandError) throw brandError;
      if (!brandData) return;

      setBrandId(brandData.id);
      setAssetsUrl(brandData.assets_url || "");
      setHomeUrl(brandData.home_url || "");

      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, budget, rpm_rate, status, banner_url")
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
          profiles (username, avatar_url)
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
        })
        .eq("id", brandId);

      if (error) throw error;

      toast.success("URLs updated successfully");
    } catch (error) {
      console.error("Error updating URLs:", error);
      toast.error("Failed to update URLs");
    } finally {
      setSavingUrls(false);
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
                  <CardTitle className="text-sm text-white/60 font-normal flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    ${totalSpent.toFixed(2)}
                  </div>
                  <div className="text-sm text-white/40">
                    of ${selectedCampaign?.budget || 0}
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
            <Card className="bg-[#202020] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Active Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Creator</TableHead>
                      <TableHead className="text-white/60">Views</TableHead>
                      <TableHead className="text-white/60">Earnings</TableHead>
                      <TableHead className="text-white/60">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedSubmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-white/40">
                          No creators yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvedSubmissions.map((submission) => (
                        <TableRow key={submission.id} className="border-white/10">
                          <TableCell className="text-white">
                            {submission.profiles?.username || "Unknown"}
                          </TableCell>
                          <TableCell className="text-white">
                            {submission.views.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-white">
                            ${Number(submission.earnings).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-500/20 text-green-400">
                              Active
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card className="bg-[#202020] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Pending Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Creator</TableHead>
                      <TableHead className="text-white/60">Applied</TableHead>
                      <TableHead className="text-white/60">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSubmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-white/40">
                          No pending applications
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingSubmissions.map((submission) => (
                        <TableRow key={submission.id} className="border-white/10">
                          <TableCell className="text-white">
                            {submission.profiles?.username || "Unknown"}
                          </TableCell>
                          <TableCell className="text-white">
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleApplicationAction(submission.id, "approved")
                                }
                                className="bg-green-500 hover:bg-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleApplicationAction(submission.id, "rejected")
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
                      Only administrators can edit brand URLs
                    </p>
                  </div>
                )}

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
                    Home Page URL (DWY Brands Only)
                  </Label>
                  <Input
                    id="home-url"
                    type="url"
                    placeholder="https://example.com/home"
                    value={homeUrl}
                    onChange={(e) => setHomeUrl(e.target.value)}
                    className="bg-[#191919] border-white/10 text-white"
                    disabled={!isAdmin}
                  />
                  <p className="text-sm text-white/60">
                    For DWY brands, this URL will be embedded on the Home page instead of the default dashboard
                  </p>
                </div>

                <Button
                  onClick={handleSaveUrls}
                  disabled={savingUrls || !isAdmin}
                  className="bg-primary hover:bg-primary/90"
                >
                  {savingUrls ? "Saving..." : "Save URLs"}
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
      </div>
    </div>
  );
}
