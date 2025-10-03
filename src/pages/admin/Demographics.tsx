import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Users, TrendingUp, Image as ImageIcon, FileText } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface DemographicSubmission {
  id: string;
  tier1_percentage: number;
  screenshot_url: string | null;
  submitted_at: string;
  status: string;
  score: number | null;
  admin_notes: string | null;
  social_accounts: {
    id: string;
    platform: string;
    username: string;
    user_id: string;
  };
}

export default function Demographics() {
  const [submissions, setSubmissions] = useState<DemographicSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<DemographicSubmission | null>(null);
  const [score, setScore] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved");
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("demographic_submissions")
      .select(`
        *,
        social_accounts (
          id,
          platform,
          username,
          user_id
        )
      `)
      .order("submitted_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch submissions",
      });
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  const handleReview = async () => {
    if (!selectedSubmission) return;

    const scoreValue = parseInt(score);
    if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
      toast({
        variant: "destructive",
        title: "Invalid Score",
        description: "Score must be between 0 and 100",
      });
      return;
    }

    setUpdating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("demographic_submissions")
        .update({
          status: reviewStatus,
          score: scoreValue,
          admin_notes: adminNotes.trim() || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
        })
        .eq("id", selectedSubmission.id);

      if (updateError) throw updateError;

      if (reviewStatus === "approved") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            demographics_score: scoreValue,
          })
          .eq("id", selectedSubmission.social_accounts.user_id);

        if (profileError) throw profileError;
      }

      toast({
        title: "Success",
        description: "Submission reviewed successfully",
      });

      setSelectedSubmission(null);
      setScore("");
      setAdminNotes("");
      fetchSubmissions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update submission",
      });
    } finally {
      setUpdating(false);
    }
  };

  const openReviewDialog = (submission: DemographicSubmission) => {
    setSelectedSubmission(submission);
    setScore(submission.score?.toString() || "");
    setAdminNotes(submission.admin_notes || "");
    setReviewStatus(submission.status as "approved" | "rejected" || "approved");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "tiktok":
        return <img src="/src/assets/tiktok-logo.svg" alt="TikTok" className="w-5 h-5" />;
      case "instagram":
        return <img src="/src/assets/instagram-logo.svg" alt="Instagram" className="w-5 h-5" />;
      case "youtube":
        return <img src="/src/assets/youtube-logo.svg" alt="YouTube" className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  const reviewedSubmissions = submissions.filter(s => s.status !== "pending");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#0a0a0a]">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-sm px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Demographics Management</h1>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-[#1a1a1a] border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60 mb-1">Pending</p>
                        <p className="text-3xl font-bold text-yellow-400">{pendingSubmissions.length}</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60 mb-1">Approved</p>
                        <p className="text-3xl font-bold text-green-400">
                          {submissions.filter(s => s.status === "approved").length}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60 mb-1">Rejected</p>
                        <p className="text-3xl font-bold text-red-400">
                          {submissions.filter(s => s.status === "rejected").length}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <XCircle className="h-6 w-6 text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Submissions Tabs */}
              <Tabs defaultValue="pending" className="space-y-6">
                <TabsList className="bg-[#1a1a1a] border border-white/10">
                  <TabsTrigger value="pending" className="data-[state=active]:bg-blue-500">
                    Pending ({pendingSubmissions.length})
                  </TabsTrigger>
                  <TabsTrigger value="reviewed" className="data-[state=active]:bg-blue-500">
                    Reviewed ({reviewedSubmissions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : pendingSubmissions.length === 0 ? (
                    <Card className="bg-[#1a1a1a] border-white/10">
                      <CardContent className="p-12 text-center">
                        <Clock className="h-16 w-16 mx-auto mb-4 text-white/20" />
                        <p className="text-white/60 text-lg">No pending submissions</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {pendingSubmissions.map((submission) => (
                        <Card key={submission.id} className="bg-[#1a1a1a] border-white/10 hover:border-primary/30 transition-all group">
                          <CardContent className="p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                {getPlatformIcon(submission.social_accounts.platform)}
                                <div>
                                  <h3 className="font-semibold text-white text-lg">
                                    @{submission.social_accounts.username}
                                  </h3>
                                  <p className="text-sm text-white/60 capitalize">
                                    {submission.social_accounts.platform}
                                  </p>
                                </div>
                              </div>
                              {getStatusBadge(submission.status)}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-1">
                                  <TrendingUp className="h-4 w-4 text-blue-400" />
                                  <p className="text-xs text-white/60">Tier 1</p>
                                </div>
                                <p className="text-2xl font-bold text-white">{submission.tier1_percentage}%</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-purple-400" />
                                  <p className="text-xs text-white/60">Submitted</p>
                                </div>
                                <p className="text-sm font-medium text-white">
                                  {new Date(submission.submitted_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {/* Screenshot Preview */}
                            {submission.screenshot_url && (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <ImageIcon className="h-4 w-4 text-white/60" />
                                  <p className="text-xs text-white/60">Screenshot</p>
                                </div>
                                <img
                                  src={submission.screenshot_url}
                                  alt="Demographics screenshot"
                                  className="w-full h-40 object-cover rounded-lg border border-white/10"
                                />
                              </div>
                            )}

                            {/* Action Button */}
                            <Button 
                              onClick={() => openReviewDialog(submission)} 
                              className="w-full bg-blue-500 hover:bg-blue-600"
                            >
                              Review Submission
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reviewed" className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : reviewedSubmissions.length === 0 ? (
                    <Card className="bg-[#1a1a1a] border-white/10">
                      <CardContent className="p-12 text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-white/20" />
                        <p className="text-white/60 text-lg">No reviewed submissions</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {reviewedSubmissions.map((submission) => (
                        <Card key={submission.id} className="bg-[#1a1a1a] border-white/10 hover:border-primary/30 transition-all">
                          <CardContent className="p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                {getPlatformIcon(submission.social_accounts.platform)}
                                <div>
                                  <h3 className="font-semibold text-white text-lg">
                                    @{submission.social_accounts.username}
                                  </h3>
                                  <p className="text-sm text-white/60 capitalize">
                                    {submission.social_accounts.platform}
                                  </p>
                                </div>
                              </div>
                              {getStatusBadge(submission.status)}
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                <p className="text-xs text-white/60 mb-1">Tier 1</p>
                                <p className="text-xl font-bold text-white">{submission.tier1_percentage}%</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                <p className="text-xs text-white/60 mb-1">Score</p>
                                <p className="text-xl font-bold text-blue-400">{submission.score || "N/A"}</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                <p className="text-xs text-white/60 mb-1">Date</p>
                                <p className="text-xs font-medium text-white">
                                  {new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </div>

                            {/* Admin Notes */}
                            {submission.admin_notes && (
                              <div className="mb-4 bg-white/5 rounded-lg p-3 border border-white/10">
                                <p className="text-xs text-white/60 mb-1">Admin Notes</p>
                                <p className="text-sm text-white/80">{submission.admin_notes}</p>
                              </div>
                            )}

                            {/* Action Button */}
                            <Button 
                              variant="outline" 
                              onClick={() => openReviewDialog(submission)} 
                              className="w-full border-white/20 hover:bg-white/10"
                            >
                              Update Review
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="sm:max-w-[700px] bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">Review Submission</DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Account Info */}
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                {getPlatformIcon(selectedSubmission.social_accounts.platform)}
                <div>
                  <p className="font-semibold text-white text-lg">
                    @{selectedSubmission.social_accounts.username}
                  </p>
                  <p className="text-sm text-white/60 capitalize">
                    {selectedSubmission.social_accounts.platform}
                  </p>
                </div>
              </div>

              {/* Tier 1 Percentage */}
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg p-6 border border-blue-500/30">
                <p className="text-sm text-white/80 mb-2">Tier 1 Percentage</p>
                <p className="text-4xl font-bold text-white">{selectedSubmission.tier1_percentage}%</p>
              </div>

              {/* Screenshot */}
              {selectedSubmission.screenshot_url && (
                <div>
                  <p className="text-sm text-white/60 mb-3">Screenshot Evidence</p>
                  <img
                    src={selectedSubmission.screenshot_url}
                    alt="Demographics screenshot"
                    className="w-full rounded-lg border border-white/10 object-contain max-h-[400px]"
                  />
                </div>
              )}

              {/* Status Selection */}
              <div className="space-y-3">
                <Label className="text-white">Review Decision</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={reviewStatus === "approved" ? "default" : "outline"}
                    onClick={() => setReviewStatus("approved")}
                    className={reviewStatus === "approved" ? "bg-green-500 hover:bg-green-600" : "border-white/20 hover:bg-white/10"}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant={reviewStatus === "rejected" ? "default" : "outline"}
                    onClick={() => setReviewStatus("rejected")}
                    className={reviewStatus === "rejected" ? "bg-red-500 hover:bg-red-600" : "border-white/20 hover:bg-white/10"}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>

              {/* Score Input */}
              <div className="space-y-2">
                <Label htmlFor="score" className="text-white">Demographics Score (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Enter score"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-white">Admin Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this review..."
                  rows={4}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleReview} 
                disabled={updating} 
                className="w-full bg-blue-500 hover:bg-blue-600 h-12 text-lg"
              >
                {updating ? "Submitting Review..." : "Submit Review"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}