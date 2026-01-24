import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Users, DollarSign, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageLoading } from "@/components/ui/loading-bar";
import { OptimizedImage } from "@/components/OptimizedImage";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { useBusinessTasks, useDeleteTask, type Task } from "@/hooks/useTasks";
import { useTaskApplications } from "@/hooks/useTaskApplications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

interface BusinessTasksTabProps {
  businessId: string;
  businessName: string;
  businessSlug: string;
}

export function BusinessTasksTab({ businessId, businessName, businessSlug }: BusinessTasksTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);

  // Fetch tasks for this business
  const { data: tasks = [], isLoading } = useBusinessTasks(businessId);
  const deleteMutation = useDeleteTask();

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group by status
  const activeTasks = filteredTasks.filter(t => t.status === "active");
  const draftTasks = filteredTasks.filter(t => t.status === "draft");
  const pausedTasks = filteredTasks.filter(t => t.status === "paused");
  const completedTasks = filteredTasks.filter(t => t.status === "completed" || t.status === "cancelled");

  const handleDelete = async () => {
    if (!deleteConfirmTask) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmTask.id);
      toast.success("Task deleted successfully");
      setDeleteConfirmTask(null);
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleStatusChange = async (task: Task, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["business-tasks", businessId] });
      toast.success(`Task ${newStatus === "active" ? "activated" : newStatus}`);
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "paused":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Paused</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage tasks for {businessName}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {["all", "active", "draft", "paused", "completed"].map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{tasks.length}</div>
            <div className="text-xs text-muted-foreground">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{activeTasks.length}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{draftTasks.length + pausedTasks.length}</div>
            <div className="text-xs text-muted-foreground">Draft/Paused</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{completedTasks.length}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? "No tasks found" : "No tasks yet"}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              {searchQuery ? "Try adjusting your search" : "Create your first task to start hiring"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onEdit={() => setEditingTask(task)}
              onDelete={() => setDeleteConfirmTask(task)}
              onStatusChange={(status) => handleStatusChange(task, status)}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateTaskDialog
        businessId={businessId}
        businessName={businessName}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["business-tasks", businessId] });
        }}
      />

      {/* Edit Dialog */}
      {editingTask && (
        <CreateTaskDialog
          businessId={businessId}
          businessName={businessName}
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["business-tasks", businessId] });
            setEditingTask(null);
          }}
          onDelete={() => {
            setDeleteConfirmTask(editingTask);
            setEditingTask(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmTask} onOpenChange={(open) => !open && setDeleteConfirmTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmTask?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Task row component
function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  getStatusBadge,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  getStatusBadge: (status: string | null) => React.ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <Card className="group hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Banner */}
          {task.banner_url ? (
            <OptimizedImage
              src={task.banner_url}
              alt={task.title}
              className="w-20 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-14 rounded-lg bg-muted flex-shrink-0" />
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base line-clamp-1">{task.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {task.reward_amount != null && (
                    <span className="flex items-center gap-1 text-green-600">
                      <DollarSign className="w-3.5 h-3.5" />
                      ${task.reward_amount}
                    </span>
                  )}
                  {task.max_participants > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {task.current_participants || 0}/{task.max_participants}
                    </span>
                  )}
                  {task.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(task.deadline), "MMM d")}
                    </span>
                  )}
                  {task.created_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(task.status)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/tasks/${task.id}`)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {task.status !== "active" && (
                      <DropdownMenuItem onClick={() => onStatusChange("active")}>
                        Activate
                      </DropdownMenuItem>
                    )}
                    {task.status === "active" && (
                      <DropdownMenuItem onClick={() => onStatusChange("paused")}>
                        Pause
                      </DropdownMenuItem>
                    )}
                    {task.status !== "completed" && (
                      <DropdownMenuItem onClick={() => onStatusChange("completed")}>
                        Mark Complete
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
