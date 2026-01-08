import { useState } from "react";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import {
  ToolsProvider,
  useToolsWorkspace,
  useToolsTasks,
  useToolsEvents,
  useToolsTransactions,
  useToolsTimeTracking,
} from "@/components/tools/contexts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Play,
  Square,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Database,
  Settings,
  Table2,
  Download,
  RefreshCw,
  Search,
  Server,
  HardDrive,
  Users,
  Activity,
  Copy,
  Check,
  Info,
  Shield,
  Zap,
  Eye,
  EyeOff,
  DollarSign,
  Upload,
} from "lucide-react";
import { CSVImportDialog } from "@/components/admin/CSVImportDialog";
import { TrainingDataManager } from "@/components/admin/TrainingDataManager";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Type for valid Supabase table names
type TableName = keyof Database['public']['Tables'];

// Type for RPC function names (including custom ones not in generated types)
type RpcFunctionName = keyof Database['public']['Functions'] | 'execute_readonly_query';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

// Task type for drag and drop
interface TaskItem {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
}

// Draggable Task Card Component
interface DraggableTaskCardProps {
  task: TaskItem;
  isDragOverlay?: boolean;
}

function DraggableTaskCard({ task, isDragOverlay }: DraggableTaskCardProps) {
  return (
    <Card className={cn(
      "mb-2 transition-all",
      isDragOverlay && "shadow-lg ring-2 ring-primary rotate-2",
      !isDragOverlay && "hover:shadow-md"
    )}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{task.title}</p>
              <Badge
                variant={task.priority === "urgent" ? "destructive" : task.priority === "high" ? "default" : "secondary"}
                className="text-xs shrink-0"
              >
                {task.priority}
              </Badge>
            </div>
            {task.due_date && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Draggable wrapper for task cards
function DraggableTask({ task, activeId }: { task: TaskItem; activeId: string | null }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task, status: task.status },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab active:cursor-grabbing touch-none",
        isDragging && "opacity-30"
      )}
    >
      <DraggableTaskCard task={task} />
    </div>
  );
}

// Droppable Column Component
interface DroppableColumnProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  tasks: TaskItem[];
  className?: string;
  activeId: string | null;
}

function DroppableColumn({ id, title, icon, tasks, className, activeId }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: { status: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg p-4 min-h-[450px] transition-colors",
        className,
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
      </div>
      <div className="space-y-0 min-h-[350px]">
        {tasks.map(task => (
          <DraggableTask key={task.id} task={task} activeId={activeId} />
        ))}
        {tasks.length === 0 && (
          <div className={cn(
            "flex items-center justify-center h-32 border-2 border-dashed rounded-lg text-muted-foreground text-sm transition-colors",
            isOver && "border-primary bg-primary/5"
          )}>
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

// Task Board Component with Drag and Drop
function TaskBoard() {
  const { tasks, isLoading, addTask, updateTask } = useToolsTasks();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addTask({ title: newTaskTitle.trim() });
    setNewTaskTitle("");
    toast.success("Task created");
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Get the status from the droppable column
    const overId = over.id as string;
    let newStatus: "todo" | "in_progress" | "done" | null = null;

    if (["todo", "in_progress", "done"].includes(overId)) {
      // Dropped on a column
      if (overId !== task.status) {
        newStatus = overId as "todo" | "in_progress" | "done";
      }
    }

    if (newStatus) {
      await updateTask(taskId, { status: newStatus });
      toast.success(`Task moved to ${newStatus.replace(/_/g, " ")}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Add a new task..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          className="flex-1"
        />
        <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DroppableColumn
            id="todo"
            title="To Do"
            icon={<Circle className="h-4 w-4 text-muted-foreground" />}
            tasks={todoTasks}
            className="bg-muted/30"
            activeId={activeId}
          />
          <DroppableColumn
            id="in_progress"
            title="In Progress"
            icon={<AlertCircle className="h-4 w-4 text-blue-500" />}
            tasks={inProgressTasks}
            className="bg-blue-500/10"
            activeId={activeId}
          />
          <DroppableColumn
            id="done"
            title="Done"
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            tasks={doneTasks}
            className="bg-emerald-500/10"
            activeId={activeId}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[300px]">
              <DraggableTaskCard task={activeTask} isDragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// Calendar View Component
function CalendarView() {
  const { events, isLoading, addEvent, getEventsForDate } = useToolsEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", start_time: "", end_time: "" });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad with days from previous/next month
  const startDay = monthStart.getDay();
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.start_time) {
      toast.error("Please fill in required fields");
      return;
    }

    await addEvent({
      title: newEvent.title,
      description: newEvent.description,
      start_time: newEvent.start_time,
      end_time: newEvent.end_time || newEvent.start_time,
      all_day: false,
    });

    setNewEvent({ title: "", description: "", start_time: "", end_time: "" });
    setIsAddEventOpen(false);
    toast.success("Event created");
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Event</DialogTitle>
              <DialogDescription>Create a new calendar event</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>Cancel</Button>
              <Button onClick={handleAddEvent}>Create Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                {paddedDays.map((day, index) => {
                  const dayEvents = day ? getEventsForDate(day) : [];
                  const isSelected = day && selectedDate && isSameDay(day, selectedDate);
                  const isToday = day && isSameDay(day, new Date());

                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[80px] p-1 border rounded-lg cursor-pointer transition-colors",
                        day && isSameMonth(day, currentDate) ? "bg-background" : "bg-muted/30",
                        isSelected && "ring-2 ring-primary",
                        isToday && "bg-primary/10",
                        day && "hover:bg-muted/50"
                      )}
                      onClick={() => day && setSelectedDate(day)}
                    >
                      {day && (
                        <>
                          <div className={cn(
                            "text-sm font-medium",
                            isToday && "text-primary"
                          )}>
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1 mt-1">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                className="text-xs bg-primary/20 rounded px-1 truncate"
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Day Events */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map(event => (
                      <div key={event.id} className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-medium">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(event.start_time), "h:mm a")}
                          {event.end_time && ` - ${format(new Date(event.end_time), "h:mm a")}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No events for this day</p>
                )
              ) : (
                <p className="text-muted-foreground text-sm">Click a day to see events</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Revenue Tracking Component
function RevenueTracking() {
  const { transactions, stats, isLoading, addTransaction } = useToolsTransactions();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTxn, setNewTxn] = useState({ description: "", amount: "", type: "income" as const, status: "completed" as const });

  const handleAddTransaction = async () => {
    if (!newTxn.description || !newTxn.amount) {
      toast.error("Please fill in required fields");
      return;
    }

    await addTransaction({
      description: newTxn.description,
      amount: parseFloat(newTxn.amount),
      type: newTxn.type,
      status: newTxn.status,
    });

    setNewTxn({ description: "", amount: "", type: "income", status: "completed" });
    setIsAddOpen(false);
    toast.success("Transaction added");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const recentTxns = transactions.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">Total Income</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">${stats.totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ArrowDownLeft className="h-4 w-4 text-red-500" />
              <span className="text-sm">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold text-red-600">${stats.totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Net Revenue</span>
            </div>
            <p className={cn("text-2xl font-bold", stats.netRevenue >= 0 ? "text-emerald-600" : "text-red-600")}>
              ${stats.netRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">${stats.pendingIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newTxn.description}
                    onChange={(e) => setNewTxn({ ...newTxn, description: e.target.value })}
                    placeholder="Transaction description"
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={newTxn.amount}
                    onChange={(e) => setNewTxn({ ...newTxn, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={newTxn.type} onValueChange={(v: "income" | "expense") => setNewTxn({ ...newTxn, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={newTxn.status} onValueChange={(v: "pending" | "completed") => setNewTxn({ ...newTxn, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddTransaction}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {recentTxns.length > 0 ? (
            <div className="space-y-3">
              {recentTxns.map(txn => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      txn.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
                    )}>
                      {txn.type === "income" ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(txn.date), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-semibold", txn.type === "income" ? "text-emerald-600" : "text-red-600")}>
                      {txn.type === "income" ? "+" : "-"}${txn.amount.toLocaleString()}
                    </p>
                    <Badge variant={txn.status === "completed" ? "default" : "secondary"} className="text-xs">
                      {txn.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Time Tracker Widget
function TimeTrackerWidget() {
  const { isTracking, elapsedTime, activeEntry, startTracking, stopTracking, getTotalTimeToday } = useToolsTimeTracking();
  const [description, setDescription] = useState("");

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggle = async () => {
    if (isTracking) {
      await stopTracking();
      setDescription("");
      toast.success("Time tracking stopped");
    } else {
      await startTracking(description || "Untitled");
      toast.success("Time tracking started");
    }
  };

  const todayMinutes = getTotalTimeToday();

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            variant={isTracking ? "destructive" : "default"}
            className="h-12 w-12 rounded-full shrink-0"
            onClick={handleToggle}
          >
            {isTracking ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>

          <div className="flex-1 min-w-0">
            {isTracking ? (
              <>
                <p className="text-2xl font-mono font-bold">{formatTime(elapsedTime)}</p>
                <p className="text-sm text-muted-foreground truncate">{activeEntry?.description || "Tracking..."}</p>
              </>
            ) : (
              <Input
                placeholder="What are you working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleToggle()}
                className="bg-background/50"
              />
            )}
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="font-semibold">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Database table statistics
interface TableStats {
  table_name: string;
  row_count: number;
  size_bytes: number;
}

// Pre-built query templates
const QUERY_TEMPLATES = [
  { name: "Active Users (30d)", query: "SELECT COUNT(DISTINCT user_id) as count FROM wallet_transactions WHERE created_at > NOW() - INTERVAL '30 days'" },
  { name: "Revenue Today", query: "SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE type = 'earning' AND DATE(created_at) = CURRENT_DATE" },
  { name: "Pending Payouts", query: "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payout_requests WHERE status = 'pending'" },
  { name: "Top Campaigns", query: "SELECT title, budget, budget_used FROM campaigns WHERE status = 'active' ORDER BY budget_used DESC LIMIT 10" },
  { name: "New Signups (7d)", query: "SELECT DATE(created_at) as date, COUNT(*) as count FROM profiles WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date" },
  { name: "Fraud Flags", query: "SELECT status, COUNT(*) as count FROM fraud_flags GROUP BY status" },
];

// Data Analytics Component
function DataAnalytics() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState("");
  const [queryResult, setQueryResult] = useState<Record<string, unknown>[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch table statistics
  const { data: tableStats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ["admin-table-stats"],
    queryFn: async () => {
      // Get list of tables with row counts
      const tables = [
        "profiles", "brands", "campaigns", "campaign_submissions", "wallet_transactions",
        "payout_requests", "fraud_flags", "wallets", "campaign_applications", "resources"
      ];

      const stats: TableStats[] = [];
      for (const table of tables) {
        try {
          const { count } = await supabase.from(table as TableName).select("*", { count: "exact", head: true });
          stats.push({ table_name: table, row_count: count || 0, size_bytes: 0 });
        } catch {
          stats.push({ table_name: table, row_count: 0, size_bytes: 0 });
        }
      }
      return stats.sort((a, b) => b.row_count - a.row_count);
    },
    staleTime: 60000,
  });

  // Fetch sample data for selected table
  const { data: tableData, isLoading: loadingTable } = useQuery({
    queryKey: ["admin-table-data", selectedTable],
    queryFn: async () => {
      if (!selectedTable) return null;
      const { data, error } = await supabase.from(selectedTable as TableName).select("*").limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTable,
  });

  const executeQuery = async (query: string) => {
    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      // Use RPC function for safe read-only queries
      // Note: execute_readonly_query is a custom function not in generated types
      const { data, error } = await supabase.rpc("execute_readonly_query" as RpcFunctionName, { query_text: query });

      if (error) {
        // Fall back to parsing simple SELECT queries
        const match = query.match(/FROM\s+(\w+)/i);
        if (match) {
          const tableName = match[1];
          const { data: fallbackData, error: fallbackError } = await supabase
            .from(tableName as TableName)
            .select("*")
            .limit(100);

          if (fallbackError) throw fallbackError;
          setQueryResult(fallbackData);
        } else {
          throw error;
        }
      } else {
        setQueryResult(data);
      }
      toast.success("Query executed successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute query";
      setQueryError(errorMessage);
      toast.error("Query failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "string" && (val.includes(",") || val.includes("\n"))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const copyQuery = (query: string) => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Query copied to clipboard");
  };

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Table2 className="h-4 w-4" />
              <span className="text-sm">Tables</span>
            </div>
            <p className="text-2xl font-bold">{tableStats?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm">Total Rows</span>
            </div>
            <p className="text-2xl font-bold">
              {tableStats?.reduce((sum, t) => sum + t.row_count, 0).toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Profiles</span>
            </div>
            <p className="text-2xl font-bold">
              {tableStats?.find(t => t.table_name === "profiles")?.row_count.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Transactions</span>
            </div>
            <p className="text-2xl font-bold">
              {tableStats?.find(t => t.table_name === "wallet_transactions")?.row_count.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Browser */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tables</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => refetchStats()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {tableStats?.map((table) => (
                  <button
                    key={table.table_name}
                    onClick={() => setSelectedTable(table.table_name)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors",
                      selectedTable === table.table_name
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Table2 className="h-4 w-4" />
                      <span className="text-sm font-medium">{table.table_name}</span>
                    </div>
                    <Badge variant={selectedTable === table.table_name ? "secondary" : "outline"}>
                      {table.row_count.toLocaleString()}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Table Preview / Query Results */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {queryResult ? "Query Results" : selectedTable ? `Preview: ${selectedTable}` : "Select a table"}
              </CardTitle>
              {(tableData || queryResult) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(queryResult || tableData || [], selectedTable || "query-results")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingTable ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : queryResult || tableData ? (
              <ScrollArea className="h-[350px]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {Object.keys((queryResult || tableData)?.[0] || {}).slice(0, 8).map((key) => (
                          <th key={key} className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(queryResult || tableData)?.slice(0, 50).map((row: Record<string, unknown>, i: number) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          {Object.values(row).slice(0, 8).map((val: unknown, j: number) => (
                            <td key={j} className="p-2 max-w-[200px] truncate">
                              {val === null ? (
                                <span className="text-muted-foreground italic">null</span>
                              ) : typeof val === "object" ? (
                                <span className="text-muted-foreground">{JSON.stringify(val).slice(0, 50)}...</span>
                              ) : (
                                String(val).slice(0, 100)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Table2 className="h-12 w-12 mb-4" />
                <p>Select a table to preview data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Query Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {QUERY_TEMPLATES.map((template) => (
              <Button
                key={template.name}
                variant="outline"
                className="h-auto py-3 flex flex-col items-start text-left"
                onClick={() => {
                  setCustomQuery(template.query);
                  executeQuery(template.query);
                }}
              >
                <span className="text-sm font-medium">{template.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Query */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Custom Query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Enter a SELECT query... (e.g., SELECT * FROM profiles LIMIT 10)"
              rows={3}
              className="font-mono text-sm pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => copyQuery(customQuery)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {queryError && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {queryError}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => executeQuery(customQuery)}
              disabled={!customQuery.trim() || isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Query
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCustomQuery("");
                setQueryResult(null);
                setQueryError(null);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Settings Component
function AdminSettings() {
  const [showSecrets, setShowSecrets] = useState(false);
  const queryClient = useQueryClient();

  // System stats
  const { data: systemStats, isLoading } = useQuery({
    queryKey: ["admin-system-stats"],
    queryFn: async () => {
      const [profiles, brands, campaigns, transactions, payouts] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("brands").select("*", { count: "exact", head: true }),
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase.from("wallet_transactions").select("*", { count: "exact", head: true }),
        supabase.from("payout_requests").select("*", { count: "exact", head: true }),
      ]);

      return {
        profiles: profiles.count || 0,
        brands: brands.count || 0,
        campaigns: campaigns.count || 0,
        transactions: transactions.count || 0,
        payouts: payouts.count || 0,
      };
    },
    staleTime: 60000,
  });

  // Feature flags (stored in localStorage for now, could be moved to DB)
  const [featureFlags, setFeatureFlags] = useState(() => {
    const stored = localStorage.getItem("admin_feature_flags");
    return stored ? JSON.parse(stored) : {
      maintenance_mode: false,
      new_signup_enabled: true,
      payouts_enabled: true,
      crypto_payouts_enabled: true,
      debug_mode: false,
      beta_features: false,
    };
  });

  const updateFeatureFlag = (key: string, value: boolean) => {
    const updated = { ...featureFlags, [key]: value };
    setFeatureFlags(updated);
    localStorage.setItem("admin_feature_flags", JSON.stringify(updated));
    toast.success(`${key.replace(/_/g, " ")} ${value ? "enabled" : "disabled"}`);
  };

  // Environment info
  const envInfo = {
    supabase_url: import.meta.env.VITE_SUPABASE_URL || "Not configured",
    environment: import.meta.env.MODE,
    version: import.meta.env.VITE_APP_VERSION || "1.0.0",
    build_time: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <CardTitle>System Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-2xl font-bold">{systemStats?.profiles.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Users</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-2xl font-bold">{systemStats?.brands.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Brands</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-2xl font-bold">{systemStats?.campaigns.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Campaigns</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-2xl font-bold">{systemStats?.transactions.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Transactions</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-2xl font-bold">{systemStats?.payouts.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Payouts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <CardTitle>Feature Flags</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(featureFlags).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    value ? "bg-emerald-500" : "bg-muted-foreground"
                  )} />
                  <div>
                    <p className="font-medium capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      {key === "maintenance_mode" && "Disable all user access except admins"}
                      {key === "new_signup_enabled" && "Allow new user registrations"}
                      {key === "payouts_enabled" && "Enable payout processing"}
                      {key === "crypto_payouts_enabled" && "Enable cryptocurrency payouts"}
                      {key === "debug_mode" && "Show debug information in UI"}
                      {key === "beta_features" && "Enable beta features for testing"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={value as boolean}
                  onCheckedChange={(checked) => updateFeatureFlag(key, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Environment</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSecrets(!showSecrets)}
            >
              {showSecrets ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showSecrets ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(envInfo).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="font-mono text-sm text-muted-foreground uppercase">{key}</span>
                <span className="font-mono text-sm">
                  {key.includes("url") || key.includes("key") || key.includes("secret")
                    ? showSecrets
                      ? value
                      : "••••••••••••"
                    : value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                queryClient.invalidateQueries();
                toast.success("Cache cleared");
              }}
            >
              <RefreshCw className="h-5 w-5" />
              <span>Clear Cache</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                toast.success("Local storage cleared");
              }}
            >
              <HardDrive className="h-5 w-5" />
              <span>Clear Storage</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                window.location.reload();
              }}
            >
              <RefreshCw className="h-5 w-5" />
              <span>Reload App</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                console.log("System Stats:", systemStats);
                console.log("Feature Flags:", featureFlags);
                console.log("Environment:", envInfo);
                toast.success("Debug info logged to console");
              }}
            >
              <Info className="h-5 w-5" />
              <span>Log Debug Info</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Tools Content
function ToolsContent() {
  const { currentWorkspace, isLoading } = useToolsWorkspace();
  const [activeTab, setActiveTab] = useState("tasks");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-muted-foreground">Failed to initialize tools. Please refresh.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Tracker */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
            <p className="text-muted-foreground">Internal productivity & team management</p>
          </div>
        </div>
        <TimeTrackerWidget />
      </div>

      {/* Sub-navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b">
          <TabsList className="h-auto bg-transparent p-0 gap-0">
            {[
              { value: "tasks", label: "Tasks" },
              { value: "calendar", label: "Calendar" },
              { value: "revenue", label: "Revenue" },
              { value: "import", label: "Import" },
              { value: "training", label: "Training Data" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative px-4 py-2.5 rounded-none bg-transparent font-medium text-muted-foreground transition-colors",
                  "hover:text-foreground",
                  "data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 after:transition-transform",
                  "data-[state=active]:after:scale-x-100"
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="tasks" className="mt-6">
          <TaskBoard />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarView />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <RevenueTracking />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <CardTitle>Import Leads to Close CRM</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Import leads from a CSV file directly into your Close CRM account.
                  The importer will check for duplicates by email and map statuses to your Close CRM lead statuses.
                </p>
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">Expected CSV format:</h4>
                    <div className="flex flex-wrap gap-2">
                      {["name", "email", "phone", "status", "created", "last_contact", "utm_campaign", "utm_source", "utm_medium"].map((col) => (
                        <Badge key={col} variant="secondary" className="text-xs">
                          {col}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Only <code className="text-primary">email</code> is required. Other columns are optional.
                    </p>
                  </div>
                </div>
                <Button onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Start Import
                </Button>
              </div>
            </CardContent>
          </Card>
          <CSVImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <TrainingDataManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Main export
export default function Tools() {
  return (
    <AdminPermissionGuard resource="tools">
      <div className="w-full h-full p-6">
        <div className="max-w-7xl mx-auto">
          <ToolsProvider>
            <ToolsContent />
          </ToolsProvider>
        </div>
      </div>
    </AdminPermissionGuard>
  );
}
