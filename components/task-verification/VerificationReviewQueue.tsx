import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  User,
  Calendar,
  Shield,
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { OptimizedImage } from "@/components/OptimizedImage";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateSubmissionStatus } from "@/hooks/useTaskSubmissions";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VerificationReviewQueueProps {
  businessId: string;
  taskId?: string; // Optional filter by specific task
}

interface SubmissionWithDetails {
  id: string;
  task_id: string;
  user_id: string;
  submission_url: string | null;
  submission_text: string | null;
  screenshot_url: string | null;
  verification_status: string;
  verification_score: number | null;
  verification_flags: string[];
  verification_notes: string | null;
  completion_time_seconds: number | null;
  created_at: string;
  tasks: {
    id: string;
    title: string;
    reward_amount: number | null;
    estimated_time_minutes: number | null;
  };
  profiles: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  user_trust_scores: {
    trust_score: number;
    total_submissions: number;
    approval_rate: number;
  } | null;
}

export function VerificationReviewQueue({
  businessId,
  taskId,
}: VerificationReviewQueueProps) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithDetails | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateStatus = useUpdateSubmissionStatus();

  // Fetch submissions for review
  const { data: submissions = [], isLoading, refetch } = useQuery({
    queryKey: ["verification-queue", businessId, taskId, statusFilter],
    queryFn: async (): Promise<SubmissionWithDetails[]> => {
      let query = supabase
        .from("task_submissions")
        .select(`
          id,
          task_id,
          user_id,
          submission_url,
          submission_text,
          screenshot_url,
          verification_status,
          verification_score,
          verification_flags,
          verification_notes,
          completion_time_seconds,
          created_at,
          tasks!inner (
            id,
            title,
            reward_amount,
            estimated_time_minutes,
            business_id
          ),
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("tasks.business_id", businessId)
        .order("created_at", { ascending: false });

      if (taskId) {
        query = query.eq("task_id", taskId);
      }

      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          query = query.in("verification_status", ["pending", "flagged"]);
        } else {
          query = query.eq("verification_status", statusFilter);
        }
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Fetch trust scores for users
      const userIds = [...new Set(data?.map((s) => s.user_id) || [])];
      const { data: trustScores } = await supabase
        .from("user_trust_scores")
        .select("*")
        .in("user_id", userIds);

      const trustScoreMap = new Map(
        trustScores?.map((ts) => [ts.user_id, ts]) || []
      );

      return (data || []).map((s) => ({
        ...s,
        user_trust_scores: trustScoreMap.get(s.user_id) || null,
      })) as SubmissionWithDetails[];
    },
  });

  const handleApprove = async (submission: SubmissionWithDetails) => {
    if (!user?.id) return;

    try {
      await updateStatus.mutateAsync({
        submissionId: submission.id,
        status: "approved",
        notes: reviewNotes || "Approved via review queue",
        reviewerId: user.id,
      });
      toast.success("Submission approved");
      setSelectedSubmission(null);
      setReviewNotes("");
      refetch();
    } catch (error) {
      toast.error("Failed to approve submission");
    }
  };

  const handleReject = async (submission: SubmissionWithDetails) => {
    if (!user?.id) return;

    try {
      await updateStatus.mutateAsync({
        submissionId: submission.id,
        status: "rejected",
        notes: reviewNotes || "Rejected via review queue",
        reviewerId: user.id,
      });
      toast.success("Submission rejected");
      setSelectedSubmission(null);
      setReviewNotes("");
      refetch();
    } catch (error) {
      toast.error("Failed to reject submission");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "flagged":
        return (
          <Badge variant="destructive" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Flagged
          </Badge>
        );
      case "auto_approved":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Auto-Approved
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500 bg-red-500/10";
      case "high":
        return "text-orange-500 bg-orange-500/10";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10";
      default:
        return "text-blue-500 bg-blue-500/10";
    }
  };

  const pendingCount = submissions.filter(
    (s) => s.verification_status === "pending" || s.verification_status === "flagged"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Verification Queue</h2>
          <p className="text-sm text-muted-foreground">
            {pendingCount} submission{pendingCount !== 1 ? "s" : ""} pending review
          </p>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading submissions...
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
            <h3 className="font-semibold mb-1">Queue is empty</h3>
            <p className="text-sm text-muted-foreground">
              No submissions match the current filter
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => (
            <Card
              key={submission.id}
              className={cn(
                "transition-all",
                submission.verification_status === "flagged" && "border-orange-500/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  {submission.profiles?.avatar_url ? (
                    <OptimizedImage
                      src={submission.profiles.avatar_url}
                      alt={submission.profiles.username || "User"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {submission.profiles?.full_name ||
                              submission.profiles?.username ||
                              "Unknown User"}
                          </span>
                          {getStatusBadge(submission.verification_status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {submission.tasks?.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Verification Score */}
                        {submission.verification_score !== null && (
                          <div
                            className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              submission.verification_score >= 80
                                ? "bg-green-500/10 text-green-500"
                                : submission.verification_score >= 60
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-red-500/10 text-red-500"
                            )}
                          >
                            {Math.round(submission.verification_score)}% confidence
                          </div>
                        )}

                        {/* Trust Score */}
                        {submission.user_trust_scores && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Shield className="w-3.5 h-3.5" />
                            {Math.round(submission.user_trust_scores.trust_score)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Flags */}
                    {submission.verification_flags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {submission.verification_flags.map((flag) => (
                          <Badge
                            key={flag}
                            variant="outline"
                            className="text-xs bg-orange-500/5 text-orange-600 border-orange-500/20"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {flag.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Expanded Details */}
                    {expandedId === submission.id && (
                      <div className="mt-4 space-y-4 pt-4 border-t">
                        {/* Screenshot */}
                        {submission.screenshot_url && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Screenshot Evidence
                            </p>
                            <a
                              href={submission.screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={submission.screenshot_url}
                                alt="Submission screenshot"
                                className="max-w-full max-h-[200px] rounded-lg border object-contain"
                              />
                            </a>
                          </div>
                        )}

                        {/* URL */}
                        {submission.submission_url && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Proof URL
                            </p>
                            <a
                              href={submission.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {submission.submission_url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Notes */}
                        {submission.submission_text && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              User Notes
                            </p>
                            <p className="text-sm">{submission.submission_text}</p>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Completion Time</p>
                            <p className="font-medium">
                              {submission.completion_time_seconds
                                ? `${Math.round(submission.completion_time_seconds / 60)} min`
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Expected Time</p>
                            <p className="font-medium">
                              {submission.tasks?.estimated_time_minutes
                                ? `${submission.tasks.estimated_time_minutes} min`
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Reward</p>
                            <p className="font-medium text-green-500">
                              ${submission.tasks?.reward_amount || 0}
                            </p>
                          </div>
                        </div>

                        {/* User History */}
                        {submission.user_trust_scores && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              User History
                            </p>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="font-medium">
                                  {submission.user_trust_scores.total_submissions}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Approval Rate</p>
                                <p className="font-medium">
                                  {Math.round(
                                    submission.user_trust_scores.approval_rate * 100
                                  )}
                                  %
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Trust Score</p>
                                <p className="font-medium">
                                  {Math.round(submission.user_trust_scores.trust_score)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(submission.created_at), {
                          addSuffix: true,
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedId(
                              expandedId === submission.id ? null : submission.id
                            )
                          }
                        >
                          {expandedId === submission.id ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              Details
                            </>
                          )}
                        </Button>

                        {(submission.verification_status === "pending" ||
                          submission.verification_status === "flagged") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog
        open={!!selectedSubmission}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>
              Review and verify this task submission from{" "}
              {selectedSubmission?.profiles?.full_name ||
                selectedSubmission?.profiles?.username}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              {/* Screenshot */}
              {selectedSubmission.screenshot_url && (
                <div>
                  <p className="text-sm font-medium mb-2">Screenshot Evidence</p>
                  <a
                    href={selectedSubmission.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={selectedSubmission.screenshot_url}
                      alt="Screenshot"
                      className="w-full max-h-[300px] object-contain rounded-lg border"
                    />
                  </a>
                </div>
              )}

              {/* URL */}
              {selectedSubmission.submission_url && (
                <div>
                  <p className="text-sm font-medium mb-1">Proof URL</p>
                  <a
                    href={selectedSubmission.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {selectedSubmission.submission_url}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Flags */}
              {selectedSubmission.verification_flags?.length > 0 && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="text-sm font-medium text-orange-600 mb-2">
                    Fraud Signals Detected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubmission.verification_flags.map((flag) => (
                      <Badge key={flag} variant="outline" className="text-orange-600">
                        {flag.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Notes */}
              <div>
                <p className="text-sm font-medium mb-2">Review Notes (optional)</p>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedSubmission(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedSubmission && handleReject(selectedSubmission)}
              disabled={updateStatus.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedSubmission && handleApprove(selectedSubmission)}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
