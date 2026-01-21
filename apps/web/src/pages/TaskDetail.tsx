import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Clock, Users, Calendar, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading-bar";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SEOHead } from "@/components/SEOHead";
import { useTask } from "@/hooks/useTasks";
import { useHasAppliedToTask, useApplyToTask } from "@/hooks/useTaskApplications";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: task, isLoading: taskLoading } = useTask(id);
  const { data: existingApplication, isLoading: applicationLoading } = useHasAppliedToTask(id);
  const applyMutation = useApplyToTask();

  const isLoading = taskLoading || applicationLoading;
  const hasApplied = !!existingApplication;
  const canApply = user && !hasApplied && task?.status === "active";

  const handleApply = async () => {
    if (!id || !user) {
      toast.error("Please sign in to apply");
      return;
    }

    try {
      await applyMutation.mutateAsync({ task_id: id });
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error("Failed to apply", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-2">Task not found</h1>
        <p className="text-muted-foreground mb-4">The task you're looking for doesn't exist.</p>
        <Button onClick={() => navigate("/")}>Go back home</Button>
      </div>
    );
  }

  const isEnded = task.status === "completed" || task.status === "cancelled";
  const isFull = task.max_participants > 0 && task.current_participants >= task.max_participants;
  const spotsRemaining = task.max_participants > 0 ? task.max_participants - (task.current_participants || 0) : null;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${task.title} | Waliet`}
        description={task.description || `Complete this task and earn $${task.reward_amount}`}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold truncate">Task Details</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Task Header */}
        <Card>
          <CardContent className="p-6">
            {/* Business Info */}
            <div className="flex items-start gap-4 mb-6">
              {task.businesses?.logo_url ? (
                <OptimizedImage
                  src={task.businesses.logo_url}
                  alt={task.businesses.name || "Business"}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-muted-foreground">
                    {task.businesses?.name || "Unknown Business"}
                  </span>
                  {task.businesses?.is_verified && <VerifiedBadge size="sm" />}
                </div>
                <h2 className="text-2xl font-bold leading-tight">{task.title}</h2>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant={isEnded ? "secondary" : task.status === "active" ? "default" : "outline"}>
                {task.status === "active" ? "Active" : task.status === "completed" ? "Completed" : task.status}
              </Badge>
              {hasApplied && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Applied
                </Badge>
              )}
              {isFull && !isEnded && (
                <Badge variant="secondary">Full</Badge>
              )}
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Reward */}
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">Reward</span>
                </div>
                <div className="text-xl font-bold text-green-600">
                  ${task.reward_amount?.toLocaleString() || "Negotiable"}
                </div>
              </div>

              {/* Spots */}
              {spotsRemaining !== null && (
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Spots Left</span>
                  </div>
                  <div className="text-xl font-bold">{spotsRemaining}</div>
                </div>
              )}

              {/* Deadline */}
              {task.deadline && (
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium">Deadline</span>
                  </div>
                  <div className="text-sm font-medium">
                    {format(new Date(task.deadline), "MMM d, yyyy")}
                  </div>
                </div>
              )}

              {/* Posted */}
              {task.created_at && (
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Posted</span>
                  </div>
                  <div className="text-sm font-medium">
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {task.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Requirements */}
        {task.requirements && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.requirements}</p>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Apply Button */}
        <div className="sticky bottom-4 bg-background/80 backdrop-blur-lg p-4 -mx-4 border-t">
          <div className="max-w-4xl mx-auto">
            {!user ? (
              <Button className="w-full" size="lg" onClick={() => navigate("/auth")}>
                Sign in to Apply
              </Button>
            ) : hasApplied ? (
              <Button className="w-full" size="lg" disabled>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Already Applied
              </Button>
            ) : isEnded ? (
              <Button className="w-full" size="lg" disabled>
                Task Ended
              </Button>
            ) : isFull ? (
              <Button className="w-full" size="lg" disabled>
                No Spots Available
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={handleApply}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? "Applying..." : `Apply for $${task.reward_amount || 0}`}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
