import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, Bookmark, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoading } from "@/components/ui/loading-bar";
import { TaskCard } from "./TaskCard";
import { useTasks, type TaskWithBusiness } from "@/hooks/useTasks";
import { useBusinesses } from "@/hooks/useBusinesses";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTaskApplications } from "@/hooks/useTaskApplications";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";

// Task categories for filtering
const CATEGORIES = [
  { value: "all", label: "All Tasks" },
  { value: "writing", label: "Writing" },
  { value: "design", label: "Design" },
  { value: "development", label: "Development" },
  { value: "marketing", label: "Marketing" },
  { value: "data", label: "Data Entry" },
  { value: "research", label: "Research" },
  { value: "other", label: "Other" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "reward-high", label: "Highest Reward" },
  { value: "reward-low", label: "Lowest Reward" },
];

export function TasksDiscoverTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showBookmarked, setShowBookmarked] = useState(false);

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();

  // Fetch businesses for the sidebar
  const { data: businesses = [], isLoading: businessesLoading } = useBusinesses();

  // Fetch user's applications to show "Applied" status
  const { data: myApplications = [] } = useMyTaskApplications();
  const appliedTaskIds = useMemo(
    () => myApplications.map((app) => app.task_id),
    [myApplications]
  );

  // Fetch bookmarks
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["task-bookmarks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("task_bookmarks")
        .select("task_id")
        .eq("user_id", user.id);
      return data?.map((b) => b.task_id) || [];
    },
    enabled: !!user?.id,
  });

  // Toggle bookmark mutation
  const toggleBookmark = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const isBookmarked = bookmarks.includes(taskId);
      if (isBookmarked) {
        await supabase
          .from("task_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("task_id", taskId);
      } else {
        await supabase
          .from("task_bookmarks")
          .insert({ user_id: user.id, task_id: taskId });
      }
      return { taskId, wasBookmarked: isBookmarked };
    },
    onSuccess: ({ taskId, wasBookmarked }) => {
      queryClient.invalidateQueries({ queryKey: ["task-bookmarks", user?.id] });
      toast.success(wasBookmarked ? "Bookmark removed" : "Task bookmarked");
    },
    onError: () => {
      toast.error("Please sign in to bookmark tasks");
    },
  });

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.businesses?.name?.toLowerCase().includes(query) ||
          task.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (category !== "all") {
      result = result.filter((task) => task.category === category);
    }

    // Bookmarked filter
    if (showBookmarked) {
      result = result.filter((task) => bookmarks.includes(task.id));
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "reward-high":
          return (b.reward_amount || 0) - (a.reward_amount || 0);
        case "reward-low":
          return (a.reward_amount || 0) - (b.reward_amount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, searchQuery, category, sortBy, showBookmarked, bookmarks]);

  // Group tasks by status
  const activeTasks = filteredTasks.filter(
    (t) => t.status === "active" || t.status === "paused"
  );

  const handleTaskClick = (task: TaskWithBusiness) => {
    // Navigate to task details or open apply dialog
    navigate(`/tasks/${task.id}`);
  };

  if (tasksLoading) {
    return <PageLoading />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and filters */}
      <div className="px-6 pt-4 pb-4 space-y-4 border-b">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showBookmarked ? "default" : "outline"}
              size="icon"
              onClick={() => setShowBookmarked(!showBookmarked)}
              title="Show bookmarked only"
            >
              <Bookmark className={`h-4 w-4 ${showBookmarked ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{activeTasks.length} active tasks</span>
          <span>{businesses.length} businesses</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Check back later for new opportunities"}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Tasks Grid */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Available Tasks</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isBookmarked={bookmarks.includes(task.id)}
                      hasApplied={appliedTaskIds.includes(task.id)}
                      onClick={() => handleTaskClick(task)}
                      onBookmarkClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark.mutate(task.id);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Businesses Section */}
              {businesses.length > 0 && !searchQuery && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Businesses</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {businesses.slice(0, 12).map((business) => (
                      <button
                        key={business.id}
                        onClick={() => navigate(`/business/${business.slug}`)}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-center"
                      >
                        {business.logo_url ? (
                          <OptimizedImage
                            src={business.logo_url}
                            alt={business.name}
                            className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-muted flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm font-medium truncate">
                            {business.name}
                          </span>
                          {business.is_verified && <VerifiedBadge size="sm" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
