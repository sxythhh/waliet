"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Filter,
  Calendar,
  User,
  DollarSign,
  Clock,
  MoreHorizontal,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Video,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";

interface BrandCampaignsTabProps {
  workspaceSlug: string;
}

interface Session {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerAvatar: string | null;
  serviceName: string;
  status: "upcoming" | "in_progress" | "completed" | "cancelled" | "disputed";
  scheduledAt: string;
  duration: number; // in minutes
  price: number;
  notes: string | null;
  createdAt: string;
}

const statusConfig = {
  upcoming: {
    label: "Upcoming",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: Calendar,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted text-muted-foreground border-border",
    icon: XCircle,
  },
  disputed: {
    label: "Disputed",
    color: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: AlertCircle,
  },
};

const formatSessionTime = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, "h:mm a")}`;
  }
  return format(date, "MMM d, yyyy 'at' h:mm a");
};

export function BrandCampaignsTab({ workspaceSlug }: BrandCampaignsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Load sessions from localStorage
  useEffect(() => {
    const storageKey = `sessions-${workspaceSlug}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setSessions(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
  }, [workspaceSlug]);

  const saveSessions = useCallback(
    (newSessions: Session[]) => {
      const storageKey = `sessions-${workspaceSlug}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(newSessions));
        setSessions(newSessions);
      } catch (e) {
        console.error("Failed to save sessions:", e);
      }
    },
    [workspaceSlug]
  );

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || session.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Sort sessions: upcoming first, then by date
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    // Upcoming sessions first
    if (a.status === "upcoming" && b.status !== "upcoming") return -1;
    if (a.status !== "upcoming" && b.status === "upcoming") return 1;
    // Then by scheduled date
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  const handleStatusChange = (sessionId: string, newStatus: Session["status"]) => {
    const updated = sessions.map((s) =>
      s.id === sessionId ? { ...s, status: newStatus } : s
    );
    saveSessions(updated);
  };

  const upcomingCount = sessions.filter((s) => s.status === "upcoming").length;
  const todaysSessions = sessions.filter(
    (s) => s.status === "upcoming" && isToday(new Date(s.scheduledAt))
  ).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {upcomingCount > 0
              ? `${upcomingCount} upcoming session${upcomingCount > 1 ? "s" : ""}${
                  todaysSessions > 0 ? ` (${todaysSessions} today)` : ""
                }`
              : "Manage your bookings and sessions"}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sessions.filter((s) => s.status === "upcoming").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sessions.filter((s) => s.status === "completed").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    $
                    {sessions
                      .filter((s) => s.status === "completed")
                      .reduce((sum, s) => sum + s.price, 0)
                      .toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(sessions.map((s) => s.buyerEmail)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Unique Buyers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sessions..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 h-11 rounded-xl">
              <Filter className="w-4 h-4" />
              <span className="capitalize">{filterStatus === "all" ? "All" : statusConfig[filterStatus as keyof typeof statusConfig]?.label}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setFilterStatus("all")}
              className={filterStatus === "all" ? "bg-primary/10 text-primary" : ""}
            >
              All Sessions
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => setFilterStatus(key)}
                className={filterStatus === key ? "bg-primary/10 text-primary" : ""}
              >
                <config.icon className="w-4 h-4 mr-2" />
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sessions List */}
      {sortedSessions.length > 0 ? (
        <div className="space-y-3">
          {sortedSessions.map((session) => {
            const config = statusConfig[session.status];
            const StatusIcon = config.icon;
            const isOverdue =
              session.status === "upcoming" && isPast(new Date(session.scheduledAt));

            return (
              <Card
                key={session.id}
                className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedSession(session);
                  setDetailsOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={session.buyerAvatar || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {session.buyerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{session.buyerName}</h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${config.color}`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                          {isOverdue && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/20"
                            >
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{session.serviceName}</span>
                          <span>•</span>
                          <span>{formatSessionTime(session.scheduledAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">{session.duration} min</div>
                        <p className="text-[10px] text-muted-foreground">Duration</p>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-emerald-500">
                          ${session.price}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Price</p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                            setDetailsOpen(true);
                          }}
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message Buyer
                        </DropdownMenuItem>
                        {session.status === "upcoming" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(session.id, "in_progress");
                              }}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Start Session
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(session.id, "completed");
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(session.id, "cancelled");
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Session
                            </DropdownMenuItem>
                          </>
                        )}
                        {session.status === "in_progress" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(session.id, "completed");
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Sessions will appear here when buyers book your services
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>
              View and manage this session booking
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedSession.buyerAvatar || undefined} />
                  <AvatarFallback className="bg-muted">
                    {selectedSession.buyerName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedSession.buyerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.buyerEmail}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Service</p>
                  <p className="text-sm font-medium">{selectedSession.serviceName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={statusConfig[selectedSession.status].color}
                  >
                    {statusConfig[selectedSession.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Scheduled</p>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedSession.scheduledAt), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedSession.scheduledAt), "h:mm a")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Duration & Price</p>
                  <p className="text-sm font-medium">
                    {selectedSession.duration} min • ${selectedSession.price}
                  </p>
                </div>
              </div>

              {selectedSession.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">
                    {selectedSession.notes}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Booked {formatDistanceToNow(new Date(selectedSession.createdAt))} ago
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedSession?.status === "upcoming" && (
              <Button
                onClick={() => {
                  handleStatusChange(selectedSession.id, "completed");
                  setDetailsOpen(false);
                }}
              >
                Mark Complete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
