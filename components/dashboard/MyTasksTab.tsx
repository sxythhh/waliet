import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Briefcase,
  DollarSign,
  Building2,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Sparkles,
  Target,
  Zap,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading-bar";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTaskApplications } from "@/hooks/useTaskApplications";
import { useWallet } from "@/hooks/useWallet";
import { useTasks } from "@/hooks/useTasks";
import { useUserProfile } from "@/hooks/useSidebarData";
import { formatDistanceToNow } from "date-fns";

export interface MyTasksTabProps {
  onOpenPrivateDialog?: () => void;
  className?: string;
}

export function MyTasksTab({ className }: MyTasksTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "completed">("all");

  // Fetch user's task applications
  const { data: applications = [], isLoading: applicationsLoading } = useMyTaskApplications();

  // Fetch wallet data for balance display
  const { data: wallet } = useWallet();

  // Fetch user profile for greeting
  const { data: profile } = useUserProfile(user?.id);

  // Fetch featured tasks for recommendations
  const { data: featuredTasks = [] } = useTasks({ limit: 6 });

  // Filter applications by status
  const filteredApplications = useMemo(() => {
    if (filter === "all") return applications;
    return applications.filter((app) => app.status === filter);
  }, [applications, filter]);

  // Group applications by status
  const pendingApps = applications.filter((app) => app.status === "pending");
  const acceptedApps = applications.filter((app) => app.status === "accepted");
  const completedApps = applications.filter((app) => app.status === "completed");
  const rejectedApps = applications.filter((app) => app.status === "rejected");

  // Calculate potential earnings from accepted tasks
  const potentialEarnings = useMemo(() => {
    return acceptedApps.reduce((sum, app) => sum + (app.tasks?.reward_amount || 0), 0);
  }, [acceptedApps]);

  // Get tasks user hasn't applied to yet
  const recommendedTasks = useMemo(() => {
    const appliedTaskIds = applications.map((app) => app.task_id);
    return featuredTasks.filter((task) => !appliedTaskIds.includes(task.id)).slice(0, 3);
  }, [featuredTasks, applications]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="default" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Declined
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = profile?.full_name?.split(" ")[0] || profile?.username || "there";

  if (applicationsLoading) {
    return <PageLoading />;
  }

  const hasNoApplications = applications.length === 0;

  return (
    <div className={`space-y-8 pb-8 ${className || ""}`}>
      {/* Hero Section with Greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-muted-foreground max-w-md">
              {hasNoApplications
                ? "Ready to start earning? Browse available tasks and apply to get started."
                : `You have ${acceptedApps.length} active task${acceptedApps.length !== 1 ? "s" : ""} in progress.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/?tab=discover")}
              className="btn-shimmer"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Discover Tasks
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card */}
        <Card className="col-span-2 bg-gradient-to-br from-primary/5 to-transparent border-primary/20 overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                <p className="text-3xl font-bold tracking-tight">${(wallet?.balance || 0).toFixed(2)}</p>
                {potentialEarnings > 0 && (
                  <p className="text-sm text-primary mt-2 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +${potentialEarnings.toFixed(2)} potential
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
            </div>
            {(wallet?.total_earned || 0) > 0 && (
              <div className="mt-4 pt-4 border-t border-primary/10">
                <p className="text-xs text-muted-foreground">
                  Total Earned: <span className="text-foreground font-medium">${(wallet.total_earned || 0).toFixed(2)}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card
          className={`cursor-pointer transition-all hover:border-primary/30 ${filter === "accepted" ? "ring-2 ring-primary border-primary/30" : ""}`}
          onClick={() => setFilter("accepted")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-2xl font-bold text-green-500">{acceptedApps.length}</span>
            </div>
            <p className="text-sm font-medium">Active Tasks</p>
            <p className="text-xs text-muted-foreground mt-0.5">In progress</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:border-primary/30 ${filter === "pending" ? "ring-2 ring-primary border-primary/30" : ""}`}
          onClick={() => setFilter("pending")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-2xl font-bold text-amber-500">{pendingApps.length}</span>
            </div>
            <p className="text-sm font-medium">Pending</p>
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: "all", label: "All", count: applications.length },
          { key: "accepted", label: "Active", count: acceptedApps.length },
          { key: "pending", label: "Pending", count: pendingApps.length },
          { key: "completed", label: "Completed", count: completedApps.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 text-xs ${filter === tab.key ? "opacity-80" : "opacity-60"}`}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {hasNoApplications && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Briefcase className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Start Your Journey</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Browse available tasks from businesses looking for talented people like you. Apply to tasks that match your skills.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => navigate("/?tab=discover")} size="lg">
                <Search className="w-4 h-4 mr-2" />
                Browse Tasks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      {filteredApplications.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Applications</h2>
            <span className="text-sm text-muted-foreground">{filteredApplications.length} total</span>
          </div>

          <div className="space-y-3">
            {filteredApplications.map((app) => (
              <Card
                key={app.id}
                className="group cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => navigate(`/tasks/${app.task_id}`)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    {/* Business Logo */}
                    {app.tasks?.businesses?.logo_url ? (
                      <OptimizedImage
                        src={app.tasks.businesses.logo_url}
                        alt={app.tasks.businesses.name || "Business"}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 ring-1 ring-border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 ring-1 ring-border">
                        <Building2 className="w-7 h-7 text-muted-foreground" />
                      </div>
                    )}

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                            {app.tasks?.title || "Unknown Task"}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {app.tasks?.businesses?.name || "Unknown Business"}
                            </span>
                            {app.tasks?.businesses?.is_verified && <VerifiedBadge size="sm" />}
                          </div>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>

                      {/* Task Details */}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        {app.tasks?.reward_amount && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 text-green-500">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold">{app.tasks.reward_amount}</span>
                          </div>
                        )}
                        <div className="text-muted-foreground text-xs">
                          Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="hidden sm:flex w-8 h-8 rounded-full bg-muted/50 items-center justify-center group-hover:bg-primary/10 transition-colors flex-shrink-0">
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Tasks Section */}
      {recommendedTasks.length > 0 && !hasNoApplications && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Recommended for You</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/?tab=discover")}>
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedTasks.map((task) => (
              <Card
                key={task.id}
                className="group cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {task.businesses?.logo_url ? (
                      <OptimizedImage
                        src={task.businesses.logo_url}
                        alt={task.businesses.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate">{task.businesses?.name}</span>
                        {task.businesses?.is_verified && <VerifiedBadge size="sm" />}
                      </div>
                    </div>
                  </div>

                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors mb-3">
                    {task.title}
                  </h3>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-green-500">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">{task.reward_amount || "Negotiable"}</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Applications (collapsed) */}
      {rejectedApps.length > 0 && filter === "all" && (
        <div className="pt-4 border-t border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Declined Applications ({rejectedApps.length})
          </h3>
          <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
            {rejectedApps.slice(0, 3).map((app) => (
              <Card
                key={app.id}
                className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/tasks/${app.task_id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {app.tasks?.businesses?.logo_url ? (
                        <OptimizedImage
                          src={app.tasks.businesses.logo_url}
                          alt={app.tasks.businesses.name || "Business"}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium line-clamp-1">
                          {app.tasks?.title || "Unknown Task"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {app.tasks?.businesses?.name}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge("rejected")}
                  </div>
                </CardContent>
              </Card>
            ))}
            {rejectedApps.length > 3 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                +{rejectedApps.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
