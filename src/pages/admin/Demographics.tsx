import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  const reviewedSubmissions = submissions.filter(s => s.status !== "pending");

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold">Demographics Management</h1>

          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingSubmissions.length})
              </TabsTrigger>
              <TabsTrigger value="reviewed">
                Reviewed ({reviewedSubmissions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-6">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : pendingSubmissions.length === 0 ? (
                <p className="text-muted-foreground">No pending submissions</p>
              ) : (
                pendingSubmissions.map((submission) => (
                  <Card key={submission.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            @{submission.social_accounts.username}
                          </h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {submission.social_accounts.platform}
                          </p>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>

                      <div className="space-y-4">
                        <div className="flex gap-8">
                          <div>
                            <p className="text-sm text-muted-foreground">Tier 1 Percentage</p>
                            <p className="text-2xl font-bold">{submission.tier1_percentage}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Submitted</p>
                            <p className="font-medium">
                              {new Date(submission.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {submission.screenshot_url && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Screenshot</p>
                            <img
                              src={submission.screenshot_url}
                              alt="Demographics screenshot"
                              className="max-h-48 rounded border"
                            />
                          </div>
                        )}

                        <Button onClick={() => openReviewDialog(submission)}>
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="reviewed" className="space-y-4 mt-6">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : reviewedSubmissions.length === 0 ? (
                <p className="text-muted-foreground">No reviewed submissions</p>
              ) : (
                reviewedSubmissions.map((submission) => (
                  <Card key={submission.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            @{submission.social_accounts.username}
                          </h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {submission.social_accounts.platform}
                          </p>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>

                      <div className="space-y-4">
                        <div className="flex gap-8">
                          <div>
                            <p className="text-sm text-muted-foreground">Tier 1 %</p>
                            <p className="text-xl font-bold">{submission.tier1_percentage}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Score</p>
                            <p className="text-xl font-bold">{submission.score || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Submitted</p>
                            <p className="font-medium">
                              {new Date(submission.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {submission.admin_notes && (
                          <div>
                            <p className="text-sm text-muted-foreground">Admin Notes</p>
                            <p className="text-sm">{submission.admin_notes}</p>
                          </div>
                        )}

                        <Button 
                          variant="outline" 
                          onClick={() => openReviewDialog(submission)}
                        >
                          Edit Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Account</p>
                <p className="font-medium">
                  @{selectedSubmission.social_accounts.username} ({selectedSubmission.social_accounts.platform})
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tier 1 Percentage</p>
                <p className="text-2xl font-bold">{selectedSubmission.tier1_percentage}%</p>
              </div>

              {selectedSubmission.screenshot_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Screenshot</p>
                  <img
                    src={selectedSubmission.screenshot_url}
                    alt="Demographics screenshot"
                    className="w-full rounded border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    variant={reviewStatus === "approved" ? "default" : "outline"}
                    onClick={() => setReviewStatus("approved")}
                    className="flex-1"
                  >
                    Approve
                  </Button>
                  <Button
                    variant={reviewStatus === "rejected" ? "destructive" : "outline"}
                    onClick={() => setReviewStatus("rejected")}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="score">Score (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Enter score"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                />
              </div>

              <Button onClick={handleReview} disabled={updating} className="w-full">
                {updating ? "Updating..." : "Submit Review"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}