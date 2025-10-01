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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, TrendingUp, Users, Eye, DollarSign } from "lucide-react";

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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (brandError) throw brandError;
      if (!brandData) return;

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

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const approvedSubmissions = submissions.filter((s) => s.status === "approved");
  const pendingSubmissions = submissions.filter((s) => s.status === "pending");

  const totalViews = approvedSubmissions.reduce((sum, s) => sum + s.views, 0);
  const totalSpent = approvedSubmissions.reduce((sum, s) => sum + Number(s.earnings), 0);
  const effectiveCPM =
    totalViews > 0 ? (totalSpent / totalViews) * 1000 : 0;

  if (loading) {
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
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="bg-[#202020] border-white/10">
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="creators" className="data-[state=active]:bg-primary">
              Creators
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-primary">
              Applications
              {pendingSubmissions.length > 0 && (
                <Badge className="ml-2 bg-primary">{pendingSubmissions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#202020] border-white/10">
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

              <Card className="bg-[#202020] border-white/10">
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

              <Card className="bg-[#202020] border-white/10">
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

              <Card className="bg-[#202020] border-white/10">
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
        </Tabs>
      </div>
    </div>
  );
}
