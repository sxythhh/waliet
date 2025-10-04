import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, TrendingUp, Users, Image as ImageIcon } from "lucide-react";
interface DemographicSubmission {
  id: string;
  tier1_percentage: number;
  screenshot_url: string | null;
  submitted_at: string;
  status: string;
  score: number | null;
  admin_notes: string | null;
  reviewed_at: string | null;
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
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchSubmissions();
  }, []);
  const fetchSubmissions = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("demographic_submissions").select(`
        *,
        social_accounts (
          id,
          platform,
          username,
          user_id
        )
      `).order("submitted_at", {
      ascending: false
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch submissions"
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
        description: "Score must be between 0 and 100"
      });
      return;
    }
    setUpdating(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const {
        error: updateError
      } = await supabase.from("demographic_submissions").update({
        status: reviewStatus,
        score: scoreValue,
        admin_notes: adminNotes.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id
      }).eq("id", selectedSubmission.id);
      if (updateError) throw updateError;
      if (reviewStatus === "approved") {
        const {
          error: profileError
        } = await supabase.from("profiles").update({
          demographics_score: scoreValue
        }).eq("id", selectedSubmission.social_accounts.user_id);
        if (profileError) throw profileError;
      }
      toast({
        title: "Success",
        description: "Submission reviewed successfully"
      });
      setSelectedSubmission(null);
      setScore("");
      setAdminNotes("");
      fetchSubmissions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update submission"
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
    const config = {
      pending: {
        variant: "secondary" as const,
        icon: Clock,
        color: "text-warning"
      },
      approved: {
        variant: "default" as const,
        icon: CheckCircle2,
        color: "text-success"
      },
      rejected: {
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-destructive"
      }
    };
    const {
      variant,
      icon: Icon,
      color
    } = config[status as keyof typeof config] || config.pending;
    return <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {status}
      </Badge>;
  };
  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      tiktok: "/src/assets/tiktok-logo.svg",
      instagram: "/src/assets/instagram-logo.svg",
      youtube: "/src/assets/youtube-logo.svg"
    };
    return icons[platform.toLowerCase()] || null;
  };
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  const approvedSubmissions = submissions.filter(s => s.status === "approved");
  const rejectedSubmissions = submissions.filter(s => s.status === "rejected");
  const avgTier1 = submissions.length > 0 ? submissions.reduce((sum, s) => sum + s.tier1_percentage, 0) / submissions.length : 0;
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading submissions...</p>
      </div>;
  }
  return <div className="p-8 space-y-6 px-[27px] py-0">
      {/* Header */}
      

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold font-chakra">{pendingSubmissions.length}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold font-chakra">{approvedSubmissions.length}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold font-chakra">{rejectedSubmissions.length}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-chakra">{avgTier1.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Avg Tier 1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-card border-0">
          <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Pending ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Approved ({approvedSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Rejected ({rejectedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingSubmissions.length === 0 ? <Card className="bg-card border-0">
              <CardContent className="py-12 text-center text-muted-foreground">
                No pending submissions
              </CardContent>
            </Card> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingSubmissions.map(submission => <Card key={submission.id} className="bg-card border-0 overflow-hidden hover:border-primary/50 transition-all cursor-pointer group" onClick={() => openReviewDialog(submission)}>
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(submission.social_accounts.platform) && <img src={getPlatformIcon(submission.social_accounts.platform)!} alt={submission.social_accounts.platform} className="h-5 w-5" />}
                        <div>
                          <h3 className="font-semibold text-base">@{submission.social_accounts.username}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{submission.social_accounts.platform}</p>
                        </div>
                      </div>
                      {getStatusBadge(submission.status)}
                    </div>

                    {/* Tier 1 Percentage - Big Display */}
                    <div className="bg-[#0d0d0d] rounded-lg p-4 mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Tier 1 Audience</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold font-chakra text-primary">{submission.tier1_percentage}%</p>
                        <p className="text-xs text-muted-foreground">of total audience</p>
                      </div>
                    </div>

                    {/* Screenshot Preview */}
                    {submission.screenshot_url ? <div className="mb-3 rounded-lg overflow-hidden border border-border/50 group-hover:border-primary/30 transition-all">
                        <img src={submission.screenshot_url} alt="Demographics screenshot" className="w-full h-32 object-cover" />
                      </div> : <div className="mb-3 rounded-lg overflow-hidden border border-dashed border-border/50 h-32 flex items-center justify-center bg-muted/20">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                      </div>}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                      </span>
                      <Button size="sm" className="h-7 text-xs" onClick={e => {
                  e.stopPropagation();
                  openReviewDialog(submission);
                }}>
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4">
          {approvedSubmissions.length === 0 ? <Card className="bg-card border-0">
              <CardContent className="py-12 text-center text-muted-foreground">
                No approved submissions
              </CardContent>
            </Card> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {approvedSubmissions.map(submission => <Card key={submission.id} className="bg-card border-0 overflow-hidden hover:border-success/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(submission.social_accounts.platform) && <img src={getPlatformIcon(submission.social_accounts.platform)!} alt={submission.social_accounts.platform} className="h-5 w-5" />}
                        <div>
                          <h3 className="font-semibold text-sm">@{submission.social_accounts.username}</h3>
                        </div>
                      </div>
                      {getStatusBadge(submission.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-[#0d0d0d] rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Tier 1</p>
                        <p className="text-lg font-bold font-chakra">{submission.tier1_percentage}%</p>
                      </div>
                      <div className="bg-[#0d0d0d] rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Score</p>
                        <p className="text-lg font-bold font-chakra text-success">{submission.score}</p>
                      </div>
                    </div>

                    {submission.admin_notes && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{submission.admin_notes}</p>}

                    <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => openReviewDialog(submission)}>
                      View Details
                    </Button>
                  </CardContent>
                </Card>)}
            </div>}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="space-y-4">
          {rejectedSubmissions.length === 0 ? <Card className="bg-card border-0">
              <CardContent className="py-12 text-center text-muted-foreground">
                No rejected submissions
              </CardContent>
            </Card> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {rejectedSubmissions.map(submission => <Card key={submission.id} className="bg-card border-0 overflow-hidden hover:border-destructive/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(submission.social_accounts.platform) && <img src={getPlatformIcon(submission.social_accounts.platform)!} alt={submission.social_accounts.platform} className="h-5 w-5" />}
                        <div>
                          <h3 className="font-semibold text-sm">@{submission.social_accounts.username}</h3>
                        </div>
                      </div>
                      {getStatusBadge(submission.status)}
                    </div>

                    <div className="bg-[#0d0d0d] rounded-lg p-2 mb-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Tier 1 Percentage</p>
                      <p className="text-lg font-bold font-chakra">{submission.tier1_percentage}%</p>
                    </div>

                    {submission.admin_notes && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{submission.admin_notes}</p>}

                    <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => openReviewDialog(submission)}>
                      View Details
                    </Button>
                  </CardContent>
                </Card>)}
            </div>}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl bg-card border-0">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Review Demographic Submission</DialogTitle>
          </DialogHeader>

          {selectedSubmission && <div className="space-y-4">
              {/* Account Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                {getPlatformIcon(selectedSubmission.social_accounts.platform) && <img src={getPlatformIcon(selectedSubmission.social_accounts.platform)!} alt={selectedSubmission.social_accounts.platform} className="h-6 w-6" />}
                <div>
                  <p className="font-semibold">@{selectedSubmission.social_accounts.username}</p>
                  <p className="text-xs text-muted-foreground capitalize">{selectedSubmission.social_accounts.platform}</p>
                </div>
              </div>

              {/* Tier 1 Display */}
              <div className="bg-[#0d0d0d] rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Tier 1 Audience Percentage</p>
                <p className="text-4xl font-bold font-chakra text-primary">{selectedSubmission.tier1_percentage}%</p>
              </div>

              {/* Screenshot */}
              {selectedSubmission.screenshot_url && <div>
                  <Label className="text-xs mb-2 block">Demographics Screenshot</Label>
                  <div className="rounded-lg overflow-hidden border">
                    <img src={selectedSubmission.screenshot_url} alt="Demographics screenshot" className="w-full" />
                  </div>
                </div>}

              {/* Status Selection */}
              <div className="space-y-2">
                <Label className="text-xs">Review Decision</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={reviewStatus === "approved" ? "default" : "outline"} onClick={() => setReviewStatus("approved")} className="h-9 text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button variant={reviewStatus === "rejected" ? "destructive" : "outline"} onClick={() => setReviewStatus("rejected")} className="h-9 text-sm">
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>

              {/* Score Input */}
              <div className="space-y-1.5">
                <Label htmlFor="score" className="text-xs">Score (0-100)</Label>
                <Input id="score" type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} placeholder="Enter score" className="h-9 text-sm" />
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">Admin Notes</Label>
                <Textarea id="notes" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Optional notes about this submission..." rows={3} className="text-sm min-h-[70px]" />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(null)} disabled={updating} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleReview} disabled={updating} size="sm" className="flex-1">
                  {updating ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}