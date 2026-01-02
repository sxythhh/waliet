import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTicketShortcuts } from "@/hooks/useTicketShortcuts";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bug, Lightbulb, MessageSquare, CheckCircle, Clock, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { PageLoading } from "@/components/ui/loading-bar";
import {
  SupportTicket,
  TicketMessage,
  TicketStats,
  TicketFilters as TicketFiltersType,
  TicketStatus,
  TicketPriority,
  AdminUser,
  UserContext,
} from "@/types/tickets";
import {
  TicketStatsCards,
  TicketFilters,
  TicketListPanel,
  TicketDetailPanel,
  TicketUserContext,
  TicketTemplatesDialog,
  TicketActionBar,
  TicketShortcutsHelp,
} from "@/components/admin/tickets";

// Feedback types
interface FeedbackSubmission {
  id: string;
  user_id: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    email: string;
  };
}

export default function Tickets() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // Core data state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [userContext, setUserContext] = useState<UserContext | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingUserContext, setLoadingUserContext] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [processingBulk, setProcessingBulk] = useState(false);

  // Filters
  const [filters, setFilters] = useState<TicketFiltersType>({
    search: "",
    status: "all",
    priority: "all",
    category: "all",
    assigned: "all",
  });

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  // UI state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showUserContext, setShowUserContext] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tickets" | "feedback">("tickets");

  // Feedback state
  const [feedbackSubmissions, setFeedbackSubmissions] = useState<FeedbackSubmission[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<string>("all");
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null);

  // Stats
  const stats: TicketStats = useMemo(() => ({
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    awaiting_reply: tickets.filter((t) => t.status === "awaiting_reply").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
    total: tickets.length,
  }), [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filters.status !== "all" && ticket.status !== filters.status) return false;
      if (filters.priority !== "all" && ticket.priority !== filters.priority) return false;
      if (filters.category !== "all" && ticket.category !== filters.category) return false;
      if (filters.assigned === "unassigned" && ticket.assigned_to) return false;
      if (filters.assigned !== "all" && filters.assigned !== "unassigned" && ticket.assigned_to !== filters.assigned) return false;

      if (filters.search) {
        const query = filters.search.toLowerCase();
        return (
          ticket.ticket_number.toLowerCase().includes(query) ||
          ticket.subject.toLowerCase().includes(query) ||
          ticket.user?.username?.toLowerCase().includes(query) ||
          ticket.user?.email?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [tickets, filters]);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ticketsData, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enrichedTickets = await Promise.all(
        (ticketsData || []).map(async (ticket) => {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("username, email, avatar_url, full_name, trust_score, demographics_score, total_earnings, country, created_at")
            .eq("id", ticket.user_id)
            .single();

          let assignedAdmin = null;
          if (ticket.assigned_to) {
            const { data: adminProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", ticket.assigned_to)
              .single();
            assignedAdmin = adminProfile;
          }

          const { count } = await supabase
            .from("ticket_messages")
            .select("id", { count: "exact", head: true })
            .eq("ticket_id", ticket.id);

          return {
            ...ticket,
            user: userProfile || undefined,
            assigned_admin: assignedAdmin || undefined,
            message_count: count || 0,
          };
        })
      );

      setTickets(enrichedTickets as SupportTicket[]);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch tickets" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch admin users
  const fetchAdminUsers = useCallback(async () => {
    try {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", adminIds);
        setAdminUsers((profiles || []) as AdminUser[]);
      }
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  }, []);

  // Fetch feedback submissions
  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      let query = supabase
        .from("feedback_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (feedbackFilter !== "all") {
        if (feedbackFilter === "bug" || feedbackFilter === "feature") {
          query = query.eq("type", feedbackFilter);
        } else {
          query = query.eq("status", feedbackFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const userIds = [...new Set(data.map((s) => s.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
        const enrichedData = data.map((submission) => ({
          ...submission,
          user: profileMap.get(submission.user_id),
        }));

        setFeedbackSubmissions(enrichedData);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setFeedbackLoading(false);
    }
  }, [feedbackFilter]);

  // Update feedback status
  const updateFeedbackStatus = useCallback(async (id: string, newStatus: string) => {
    setUpdatingFeedbackId(id);
    try {
      const { error } = await supabase
        .from("feedback_submissions")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setFeedbackSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
      toast({ title: "Status updated" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setUpdatingFeedbackId(null);
    }
  }, [toast]);

  // Feedback helpers
  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="h-4 w-4 text-red-500" />;
      case "feature":
        return <Lightbulb className="h-4 w-4 text-amber-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const getFeedbackStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-0 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-0 text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-0 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const feedbackStats = useMemo(() => ({
    total: feedbackSubmissions.length,
    bugs: feedbackSubmissions.filter((s) => s.type === "bug").length,
    features: feedbackSubmissions.filter((s) => s.type === "feature").length,
    pending: feedbackSubmissions.filter((s) => s.status === "pending").length,
  }), [feedbackSubmissions]);

  // Fetch messages
  const fetchMessages = useCallback(async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const { data: messagesData, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const enrichedMessages = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", msg.sender_id)
            .single();
          return { ...msg, sender: senderProfile || undefined };
        })
      );

      setMessages(enrichedMessages as TicketMessage[]);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Fetch user context
  const fetchUserContext = useCallback(async (userId: string) => {
    setLoadingUserContext(true);
    try {
      // Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, email, avatar_url, full_name, trust_score, demographics_score, total_earnings, country, created_at, bio, phone_number")
        .eq("id", userId)
        .single();

      if (!profile) {
        setUserContext(null);
        return;
      }

      // Wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance, total_earned, total_withdrawn")
        .eq("user_id", userId)
        .single();

      // Social accounts
      const { data: socialAccounts } = await supabase
        .from("social_accounts")
        .select("id, platform, username, follower_count, is_verified")
        .eq("user_id", userId);

      // Ticket history
      const { data: ticketHistory } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Recent transactions
      const { data: recentTransactions } = await supabase
        .from("wallet_transactions")
        .select("id, amount, type, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      setUserContext({
        profile: profile as UserContext["profile"],
        wallet: wallet ? { balance: Number(wallet.balance), total_earned: Number(wallet.total_earned), total_withdrawn: Number(wallet.total_withdrawn) } : undefined,
        social_accounts: socialAccounts || undefined,
        ticket_history: ticketHistory || undefined,
        recent_transactions: recentTransactions || undefined,
      });
    } catch (error) {
      console.error("Error fetching user context:", error);
      setUserContext(null);
    } finally {
      setLoadingUserContext(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTickets();
    fetchAdminUsers();
  }, [fetchTickets, fetchAdminUsers]);

  // Fetch feedback when tab changes or filter changes
  useEffect(() => {
    if (activeTab === "feedback") {
      fetchFeedback();
    }
  }, [activeTab, fetchFeedback]);

  // Fetch messages and user context when ticket selected
  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      fetchUserContext(selectedTicket.user_id);
    } else {
      setMessages([]);
      setUserContext(null);
    }
  }, [selectedTicket?.id, fetchMessages, fetchUserContext]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => fetchTickets())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages" }, (payload) => {
        if (selectedTicket && payload.new.ticket_id === selectedTicket.id) {
          fetchMessages(selectedTicket.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket?.id, fetchTickets, fetchMessages]);

  // Update ticket status
  const updateTicketStatus = useCallback(async (status: TicketStatus) => {
    if (!selectedTicket) return;
    setUpdatingTicket(true);
    try {
      const { error } = await supabase.from("support_tickets").update({ status }).eq("id", selectedTicket.id);
      if (error) throw error;
      setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? { ...t, status } : t)));
      setSelectedTicket((prev) => (prev ? { ...prev, status } : prev));
      toast({ title: "Status updated" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setUpdatingTicket(false);
    }
  }, [selectedTicket, toast]);

  // Update ticket priority
  const updateTicketPriority = useCallback(async (priority: TicketPriority) => {
    if (!selectedTicket) return;
    setUpdatingTicket(true);
    try {
      const { error } = await supabase.from("support_tickets").update({ priority }).eq("id", selectedTicket.id);
      if (error) throw error;
      setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? { ...t, priority } : t)));
      setSelectedTicket((prev) => (prev ? { ...prev, priority } : prev));
      toast({ title: "Priority updated" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update priority" });
    } finally {
      setUpdatingTicket(false);
    }
  }, [selectedTicket, toast]);

  // Assign ticket
  const assignTicket = useCallback(async (adminId: string | null) => {
    if (!selectedTicket) return;
    setUpdatingTicket(true);
    try {
      const { error } = await supabase.from("support_tickets").update({ assigned_to: adminId }).eq("id", selectedTicket.id);
      if (error) throw error;
      await fetchTickets();
      toast({ title: adminId ? "Ticket assigned" : "Assignment removed" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to assign ticket" });
    } finally {
      setUpdatingTicket(false);
    }
  }, [selectedTicket, fetchTickets, toast]);

  // Send reply
  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || !selectedTicket || !user) return;
    setSending(true);
    try {
      const { data: newMessage, error: messageError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          sender_type: "admin",
          content: replyText.trim(),
          is_internal: isInternal,
        })
        .select("id")
        .single();
      if (messageError) throw messageError;

      if (selectedTicket.status === "open" || selectedTicket.status === "awaiting_reply") {
        await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", selectedTicket.id);
      }

      // Push to Discord if ticket has a linked channel and not internal
      if (!isInternal && selectedTicket.discord_channel && newMessage) {
        supabase.functions.invoke("push-discord-message", {
          body: { ticket_message_id: newMessage.id },
        }).catch(err => console.error("Failed to push to Discord:", err));
      }

      setReplyText("");
      setIsInternal(false);
      fetchMessages(selectedTicket.id);
      fetchTickets();
      toast({ title: isInternal ? "Internal note added" : "Reply sent" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to send reply" });
    } finally {
      setSending(false);
    }
  }, [replyText, selectedTicket, user, isInternal, fetchMessages, fetchTickets, toast]);

  // Resolve ticket
  const handleResolve = useCallback(() => updateTicketStatus("resolved"), [updateTicketStatus]);

  // Close ticket
  const handleClose = useCallback(() => updateTicketStatus("closed"), [updateTicketStatus]);

  // Assign to me
  const handleAssignToMe = useCallback(() => {
    if (user) assignTicket(user.id);
  }, [user, assignTicket]);

  // Handle template select
  const handleTemplateSelect = useCallback((content: string) => {
    setReplyText(content);
    replyInputRef.current?.focus();
  }, []);

  // Bulk actions
  const handleBulkStatusChange = useCallback(async (status: TicketStatus) => {
    setProcessingBulk(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("support_tickets").update({ status }).in("id", ids);
      if (error) throw error;
      setSelectedIds(new Set());
      fetchTickets();
      toast({ title: `Updated ${ids.length} ticket(s)` });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update tickets" });
    } finally {
      setProcessingBulk(false);
    }
  }, [selectedIds, fetchTickets, toast]);

  const handleBulkPriorityChange = useCallback(async (priority: TicketPriority) => {
    setProcessingBulk(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("support_tickets").update({ priority }).in("id", ids);
      if (error) throw error;
      setSelectedIds(new Set());
      fetchTickets();
      toast({ title: `Updated ${ids.length} ticket(s)` });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update tickets" });
    } finally {
      setProcessingBulk(false);
    }
  }, [selectedIds, fetchTickets, toast]);

  const handleBulkAssign = useCallback(async (adminId: string) => {
    setProcessingBulk(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("support_tickets").update({ assigned_to: adminId }).in("id", ids);
      if (error) throw error;
      setSelectedIds(new Set());
      fetchTickets();
      toast({ title: `Assigned ${ids.length} ticket(s)` });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to assign tickets" });
    } finally {
      setProcessingBulk(false);
    }
  }, [selectedIds, fetchTickets, toast]);

  const handleBulkResolve = useCallback(() => handleBulkStatusChange("resolved"), [handleBulkStatusChange]);
  const handleBulkClose = useCallback(() => handleBulkStatusChange("closed"), [handleBulkStatusChange]);

  // Selection handling
  const handleCheckChange = useCallback((ticketId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(ticketId);
      else next.delete(ticketId);
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useTicketShortcuts({
    tickets: filteredTickets,
    selectedTicket,
    onSelectTicket: setSelectedTicket,
    onResolveTicket: handleResolve,
    onAssignToMe: handleAssignToMe,
    onOpenTemplates: () => setTemplatesOpen(true),
    onToggleUserContext: () => setShowUserContext((prev) => !prev),
    onToggleShortcutsHelp: () => setShortcutsHelpOpen((prev) => !prev),
    searchInputRef,
    replyInputRef,
    enabled: true,
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tickets" | "feedback")} className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 shrink-0 border-b border-border/50">
          <div className="flex items-center justify-between gap-4">
            <TabsList className="bg-muted/30 p-1 h-auto">
              <TabsTrigger value="tickets" className="text-sm font-['Inter'] tracking-[-0.3px] data-[state=active]:bg-card px-4 py-2">
                Tickets
                {stats.open > 0 && (
                  <span className="ml-2 bg-blue-500/20 text-blue-400 text-xs px-1.5 py-0.5 rounded-full">
                    {stats.open}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="feedback" className="text-sm font-['Inter'] tracking-[-0.3px] data-[state=active]:bg-card px-4 py-2">
                Feedback
                {feedbackStats.pending > 0 && (
                  <span className="ml-2 bg-amber-500/20 text-amber-400 text-xs px-1.5 py-0.5 rounded-full">
                    {feedbackStats.pending}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <span className="text-xs text-muted-foreground hidden md:inline">
              <kbd className="bg-muted px-1 py-0.5 rounded text-[10px]">?</kbd> shortcuts
            </span>
          </div>
        </div>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
          {/* Tickets Header */}
          <div className="px-6 py-3 space-y-2 shrink-0 border-b border-border/50">
            <div className="flex items-center gap-4">
              <TicketStatsCards
                stats={stats}
                activeStatus={filters.status}
                onStatusClick={(status) => setFilters((prev) => ({ ...prev, status: status === prev.status ? "all" : status }))}
              />
            </div>
            <TicketFilters
              ref={searchInputRef}
              filters={filters}
              onFiltersChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
              onRefresh={fetchTickets}
              adminUsers={adminUsers}
              loading={loading}
            />
          </div>

          {/* Three-column layout */}
          <div className="flex-1 overflow-hidden px-4 pb-4 pt-2">
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-border/50 bg-card/30">
              {/* Left: Ticket List */}
              <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                <TicketListPanel
                  tickets={filteredTickets}
                  selectedTicketId={selectedTicket?.id || null}
                  selectedIds={selectedIds}
                  onSelectTicket={setSelectedTicket}
                  onCheckChange={handleCheckChange}
                  showCheckboxes={selectedIds.size > 0}
                  loading={loading}
                  emptyMessage={filters.search ? "No tickets match your search" : "No tickets found"}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Center: Ticket Detail */}
              <ResizablePanel defaultSize={showUserContext ? 50 : 75} minSize={40}>
                <TicketDetailPanel
                  ref={replyInputRef}
                  ticket={selectedTicket}
                  messages={messages}
                  adminUsers={adminUsers}
                  currentUserId={user?.id}
                  replyText={replyText}
                  onReplyChange={setReplyText}
                  isInternal={isInternal}
                  onInternalChange={setIsInternal}
                  onSendReply={handleSendReply}
                  onOpenTemplates={() => setTemplatesOpen(true)}
                  onStatusChange={updateTicketStatus}
                  onPriorityChange={updateTicketPriority}
                  onAssigneeChange={assignTicket}
                  onResolve={handleResolve}
                  onClose={handleClose}
                  loadingMessages={loadingMessages}
                  sendingReply={sending}
                  updatingTicket={updatingTicket}
                />
              </ResizablePanel>

              {/* Right: User Context */}
              {showUserContext && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                    <TicketUserContext
                      userContext={userContext}
                      loading={loadingUserContext}
                      onClose={() => setShowUserContext(false)}
                      onViewTicket={(ticketId) => {
                        const ticket = tickets.find((t) => t.id === ticketId);
                        if (ticket) setSelectedTicket(ticket);
                      }}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="flex-1 overflow-auto mt-0 data-[state=inactive]:hidden">
          <div className="p-6 space-y-4 max-w-5xl mx-auto">
            {/* Feedback Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">{feedbackStats.total}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Bug className="h-4 w-4 text-red-500" />
                  <span>{feedbackStats.bugs}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span>{feedbackStats.features}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>{feedbackStats.pending} pending</span>
                </div>
              </div>
              <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
                <SelectTrigger className="w-[160px] h-9 bg-muted/30 border-0 text-sm">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions</SelectItem>
                  <SelectItem value="bug">Bugs Only</SelectItem>
                  <SelectItem value="feature">Features Only</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feedback List */}
            {feedbackLoading ? (
              <PageLoading />
            ) : feedbackSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-['Inter'] tracking-[-0.3px]">No feedback submissions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackSubmissions.map((submission) => {
                  const isUpdating = updatingFeedbackId === submission.id;
                  return (
                    <div key={submission.id} className="bg-muted/20 rounded-xl overflow-hidden">
                      {/* Card Header */}
                      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getFeedbackTypeIcon(submission.type)}
                          <Badge variant="secondary" className="capitalize text-xs">
                            {submission.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.3px]">
                            {format(new Date(submission.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        {submission.user && (
                          <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.3px]">
                            {submission.user.username || submission.user.email}
                          </span>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="px-4 py-3">
                        <p className="text-sm font-['Inter'] tracking-[-0.3px] whitespace-pre-wrap leading-relaxed">
                          {submission.message}
                        </p>
                      </div>

                      {/* Card Footer - Status Actions */}
                      <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isUpdating ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Updating...
                            </div>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2.5 text-xs font-['Inter'] tracking-[-0.3px] ${
                                  submission.status === "pending"
                                    ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                                    : "hover:bg-muted text-muted-foreground"
                                }`}
                                onClick={() => updateFeedbackStatus(submission.id, "pending")}
                                disabled={submission.status === "pending"}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2.5 text-xs font-['Inter'] tracking-[-0.3px] ${
                                  submission.status === "in_progress"
                                    ? "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                                    : "hover:bg-muted text-muted-foreground"
                                }`}
                                onClick={() => updateFeedbackStatus(submission.id, "in_progress")}
                                disabled={submission.status === "in_progress"}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                In Progress
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2.5 text-xs font-['Inter'] tracking-[-0.3px] ${
                                  submission.status === "resolved"
                                    ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                                    : "hover:bg-muted text-muted-foreground"
                                }`}
                                onClick={() => updateFeedbackStatus(submission.id, "resolved")}
                                disabled={submission.status === "resolved"}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolved
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2.5 text-xs font-['Inter'] tracking-[-0.3px] ${
                                  submission.status === "rejected"
                                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                                    : "hover:bg-muted text-muted-foreground"
                                }`}
                                onClick={() => updateFeedbackStatus(submission.id, "rejected")}
                                disabled={submission.status === "rejected"}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </Button>
                            </>
                          )}
                        </div>
                        {getFeedbackStatusBadge(submission.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Bulk Action Bar */}
      <TicketActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkPriorityChange={handleBulkPriorityChange}
        onBulkAssign={handleBulkAssign}
        onBulkResolve={handleBulkResolve}
        onBulkClose={handleBulkClose}
        adminUsers={adminUsers}
        processing={processingBulk}
      />

      {/* Templates Dialog */}
      <TicketTemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelectTemplate={handleTemplateSelect}
        variables={{
          username: selectedTicket?.user?.username,
          ticket_number: selectedTicket?.ticket_number,
        }}
      />

      {/* Shortcuts Help */}
      <TicketShortcutsHelp
        open={shortcutsHelpOpen}
        onOpenChange={setShortcutsHelpOpen}
      />
    </div>
  );
}
