import { useState, useEffect, useRef, useMemo } from "react";
import { X, MessageCircle, Megaphone, ChevronUp, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MessageInput } from "@/components/brand/MessageInput";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import mailIconLight from "@/assets/mail-icon.svg";

interface Conversation {
  id: string;
  brand_id: string;
  creator_id: string;
  last_message_at: string | null;
  brand?: {
    name: string;
    logo_url: string | null;
  };
  unread_count?: number;
  last_message?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_active: boolean;
}

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: "open" | "in_progress" | "awaiting_reply" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  updated_at: string;
  messages?: TicketMessage[];
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "admin";
  content: string;
  is_internal: boolean;
  created_at: string;
}

type UnifiedThread = {
  id: string;
  type: "conversation" | "announcement" | "ticket";
  title: string;
  subtitle: string;
  avatar_url?: string | null;
  last_message_at: string;
  unread_count: number;
  status?: string;
  priority?: string;
  data: Conversation | Announcement | SupportTicket;
};

// Helper to detect and parse boost/campaign URLs
const parseInviteUrl = (content: string): { type: 'boost' | 'campaign'; id: string } | null => {
  const boostMatch = content.match(/\/boost\/([a-zA-Z0-9-]+)/);
  const campaignMatch = content.match(/\/c\/([a-zA-Z0-9-]+)/);

  if (boostMatch) return { type: 'boost', id: boostMatch[1] };
  if (campaignMatch) return { type: 'campaign', id: campaignMatch[1] };
  return null;
};

// Invite Card Component for boost/campaign links
function InviteCard({ type, id, isCreatorMessage }: { type: 'boost' | 'campaign'; id: string; isCreatorMessage: boolean }) {
  const navigate = useNavigate();
  const [data, setData] = useState<{ title: string; brand_name: string; logo_url: string | null } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (type === 'boost') {
        const { data: boost } = await supabase
          .from('bounty_campaigns')
          .select('title, brands!inner(name, logo_url)')
          .eq('id', id)
          .maybeSingle();
        if (boost) {
          setData({
            title: boost.title,
            brand_name: (boost.brands as any)?.name || '',
            logo_url: (boost.brands as any)?.logo_url || null
          });
        }
      } else {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('title, brand_name, brand_logo_url')
          .eq('slug', id)
          .maybeSingle();
        if (campaign) {
          setData({
            title: campaign.title,
            brand_name: campaign.brand_name,
            logo_url: campaign.brand_logo_url
          });
        }
      }
    };
    fetchData();
  }, [type, id]);

  const handleClick = () => {
    if (type === 'boost') {
      navigate(`/boost/${id}`);
    } else {
      navigate(`/c/${id}`);
    }
  };

  if (!data) return null;

  return (
    <div
      className={`mt-2 p-2.5 rounded-lg cursor-pointer ${
        isCreatorMessage
          ? 'bg-white/5 border border-white/10'
          : 'bg-muted/50 border border-border/50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 rounded-md">
          <AvatarImage src={data.logo_url || undefined} />
          <AvatarFallback className="rounded-md text-[10px] font-medium">{data.brand_name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate font-inter tracking-[-0.5px] ${isCreatorMessage ? 'text-white' : 'text-foreground'}`}>
            {data.title}
          </p>
          <p className={`text-[10px] font-inter tracking-[-0.5px] ${isCreatorMessage ? 'text-white/60' : 'text-muted-foreground'}`}>
            {type === 'boost' ? 'Boost' : 'Campaign'} • {data.brand_name}
          </p>
        </div>
      </div>
    </div>
  );
}

function getTicketStatusColor(status: string) {
  switch (status) {
    case "open": return "bg-blue-500/10 text-blue-500";
    case "in_progress": return "bg-amber-500/10 text-amber-500";
    case "awaiting_reply": return "bg-purple-500/10 text-purple-500";
    case "resolved": return "bg-emerald-500/10 text-emerald-500";
    case "closed": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

export function UnifiedMessagesWidget() {
  const { resolvedTheme } = useTheme();
  const mailIcon = mailIconLight;
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [activeThread, setActiveThread] = useState<UnifiedThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userId && isOpen) {
      fetchConversations();
      fetchAnnouncements();
      fetchTickets();
    }
  }, [userId, isOpen]);

  useEffect(() => {
    if (activeThread) {
      if (activeThread.type === "conversation") {
        const conv = activeThread.data as Conversation;
        fetchMessages(conv.id);
        markMessagesAsRead(conv.id);
      } else if (activeThread.type === "ticket") {
        const ticket = activeThread.data as SupportTicket;
        fetchTicketMessages(ticket.id);
      }
    }
  }, [activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, ticketMessages]);

  // Real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('unified-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, payload => {
        const newMsg = payload.new as Message;
        if (activeThread?.type === "conversation") {
          const conv = activeThread.data as Conversation;
          if (newMsg.conversation_id === conv.id) {
            setMessages(prev => [...prev, newMsg]);
            markMessagesAsRead(conv.id);
          }
        }
        fetchConversations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchTickets();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages'
      }, payload => {
        const newMsg = payload.new as TicketMessage;
        if (activeThread?.type === "ticket") {
          const ticket = activeThread.data as SupportTicket;
          if (newMsg.ticket_id === ticket.id && !newMsg.is_internal) {
            setTicketMessages(prev => [...prev, newMsg]);
          }
        }
        fetchTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeThread]);

  const fetchConversations = async () => {
    if (!userId) return;
    setLoading(true);

    const { data: convos, error } = await supabase
      .from("conversations")
      .select(`*, brand:brands(name, logo_url)`)
      .eq("creator_id", userId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
      return;
    }

    const conversationsWithDetails = await Promise.all((convos || []).map(async conv => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("sender_type", "brand")
        .eq("is_read", false);

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...conv,
        unread_count: count || 0,
        last_message: lastMsg?.content || ""
      };
    }));

    setConversations(conversationsWithDetails);
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAnnouncements(data);
    }
  };

  const fetchTickets = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .not("status", "in", '("resolved","closed")')
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setTickets(data as SupportTicket[]);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setTicketMessages(data as TicketMessage[]);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "brand")
      .eq("is_read", false);
    fetchConversations();
  };

  const handleBack = () => {
    setActiveThread(null);
    setMessages([]);
    setTicketMessages([]);
    setNewMessage("");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeThread || !userId) return;

    setSending(true);

    if (activeThread.type === "conversation") {
      const conv = activeThread.data as Conversation;
      const { error } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: userId,
        sender_type: "creator",
        content: newMessage.trim(),
      });

      if (error) {
        toast.error("Failed to send message");
      } else {
        setNewMessage("");
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conv.id);
      }
    } else if (activeThread.type === "ticket") {
      const ticket = activeThread.data as SupportTicket;
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_id: userId,
        sender_type: "user",
        content: newMessage.trim(),
      });

      if (error) {
        toast.error("Failed to send reply");
      } else {
        setNewMessage("");
        await supabase
          .from("support_tickets")
          .update({ status: "awaiting_reply" })
          .eq("id", ticket.id);
      }
    }

    setSending(false);
  };

  // Build unified threads list
  const unifiedThreads = useMemo((): UnifiedThread[] => {
    const threads: UnifiedThread[] = [];

    // Add tickets first (they're usually more important)
    tickets.forEach(ticket => {
      threads.push({
        id: `ticket-${ticket.id}`,
        type: "ticket",
        title: ticket.subject,
        subtitle: `#${ticket.ticket_number}`,
        last_message_at: ticket.updated_at,
        unread_count: 0, // Could track unread ticket messages
        status: ticket.status,
        priority: ticket.priority,
        data: ticket,
      });
    });

    // Add conversations
    conversations.forEach(conv => {
      threads.push({
        id: `conv-${conv.id}`,
        type: "conversation",
        title: conv.brand?.name || "Unknown Brand",
        subtitle: conv.last_message || "No messages yet",
        avatar_url: conv.brand?.logo_url,
        last_message_at: conv.last_message_at || "",
        unread_count: conv.unread_count || 0,
        data: conv,
      });
    });

    // Sort by date
    threads.sort((a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    return threads;
  }, [tickets, conversations]);

  // Calculate total unread
  useEffect(() => {
    const convUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    setTotalUnread(convUnread + tickets.length); // Count open tickets as "unread"
  }, [conversations, tickets]);

  return (
    <>
      {/* Floating Button - Mobile (Circle) */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-[#2060de] hover:bg-[#1a50c0] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center group"
      >
        <img src={mailIcon} alt="Messages" className="w-6 h-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-medium flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Floating Button - Desktop (Card) */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 z-50 items-center gap-3 px-5 py-3 rounded-2xl bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-[#222] transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-200 dark:border-white/10"
      >
        <MessageCircle className="w-5 h-5 text-foreground" />
        <span className="font-medium text-sm text-foreground font-['Inter'] tracking-[-0.5px]">Messages</span>
        {totalUnread > 0 && (
          <span className="w-5 h-5 bg-red-500 rounded-full text-white text-xs font-medium flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[380px] h-[480px] md:h-[520px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
            {activeThread ? (
              <div className="flex items-center gap-3">
                <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                {activeThread.type === "ticket" ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Ticket className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <span className="font-medium text-sm font-inter tracking-[-0.5px] line-clamp-1">
                        {activeThread.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{activeThread.subtitle}</span>
                        <Badge variant="outline" className={`text-[9px] h-4 px-1 ${getTicketStatusColor(activeThread.status || "")}`}>
                          {(activeThread.status || "").replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : activeThread.type === "announcement" ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Megaphone className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="font-medium text-sm font-inter tracking-[-0.5px]">
                      Announcement
                    </span>
                  </>
                ) : (
                  <>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={activeThread.avatar_url || ""} />
                      <AvatarFallback className="text-xs bg-muted">
                        {activeThread.title.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm font-inter tracking-[-0.5px]">
                      {activeThread.title}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <h3 className="font-semibold text-base font-inter tracking-[-0.5px]">Messages</h3>
            )}
            <button
              onClick={() => {
                setIsOpen(false);
                setActiveThread(null);
                setMessages([]);
                setTicketMessages([]);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeThread?.type === "announcement" ? (
              // Announcement Detail View
              <ScrollArea className="h-full">
                <div className="p-4">
                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <h4 className="font-semibold text-base font-inter tracking-[-0.5px] mb-2">
                      {activeThread.title}
                    </h4>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] whitespace-pre-wrap">
                      {(activeThread.data as Announcement).content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      {format(new Date(activeThread.last_message_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            ) : activeThread?.type === "ticket" ? (
              // Ticket Messages View
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {ticketMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                          No messages in this ticket yet.
                        </p>
                      </div>
                    ) : (
                      ticketMessages.map(message => {
                        const isUserMessage = message.sender_type === "user";
                        return (
                          <div key={message.id} className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isUserMessage ? "bg-[#2060de] text-white" : "bg-muted"}`}>
                              <p className="text-sm font-inter tracking-[-0.5px] whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <p className={`text-[10px] mt-1 ${isUserMessage ? "text-white/70" : "text-muted-foreground"}`}>
                                {format(new Date(message.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                {/* Reply Input */}
                <div className="p-3 border-t border-border">
                  <MessageInput
                    value={newMessage}
                    onChange={setNewMessage}
                    onSend={handleSendMessage}
                    disabled={sending}
                    placeholder="Reply to ticket..."
                  />
                </div>
              </div>
            ) : activeThread?.type === "conversation" ? (
              // Conversation Messages View
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                          No messages in this conversation yet.
                        </p>
                      </div>
                    ) : (
                      messages.map(message => {
                        const inviteData = parseInviteUrl(message.content);
                        const isCreatorMessage = message.sender_type === "creator";

                        return (
                          <div key={message.id} className={`flex ${isCreatorMessage ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 overflow-hidden ${isCreatorMessage ? "bg-[#2060de] text-white" : "bg-muted"}`}>
                              <p className="text-sm font-inter tracking-[-0.5px] whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              {inviteData && (
                                <InviteCard
                                  type={inviteData.type}
                                  id={inviteData.id}
                                  isCreatorMessage={isCreatorMessage}
                                />
                              )}
                              <p className={`text-[10px] mt-1 ${isCreatorMessage ? "text-white/70" : "text-muted-foreground"}`}>
                                {format(new Date(message.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                {/* Message Input */}
                <div className="p-3 border-t border-border">
                  <MessageInput
                    value={newMessage}
                    onChange={setNewMessage}
                    onSend={handleSendMessage}
                    disabled={sending}
                    placeholder="Type a message..."
                  />
                </div>
              </div>
            ) : (
              // Unified Threads List
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : announcements.length === 0 && unifiedThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <img src={mailIcon} alt="Mail" className="w-8 h-8 opacity-50" />
                    </div>
                    <h4 className="font-medium text-base font-inter tracking-[-0.5px] mb-2">No messages yet</h4>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                      When brands message you or you have support tickets, they'll appear here.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Announcements Section */}
                    {announcements.length > 0 && (
                      <div className="border-b border-border">
                        {announcements.map(announcement => (
                          <button
                            key={announcement.id}
                            onClick={() => setActiveThread({
                              id: `ann-${announcement.id}`,
                              type: "announcement",
                              title: announcement.title,
                              subtitle: announcement.content,
                              last_message_at: announcement.created_at,
                              unread_count: 0,
                              data: announcement,
                            })}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-amber-500/5 transition-colors text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                              <Megaphone className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="font-medium text-sm font-inter tracking-[-0.5px] truncate">
                                  {announcement.title}
                                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {format(new Date(announcement.created_at), "MMM d")}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate font-inter tracking-[-0.5px]">
                                {announcement.content}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Unified Threads */}
                    {unifiedThreads.map(thread => (
                      <button
                        key={thread.id}
                        onClick={() => setActiveThread(thread)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        {thread.type === "ticket" ? (
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Ticket className="w-5 h-5 text-blue-500" />
                          </div>
                        ) : (
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={thread.avatar_url || ""} />
                            <AvatarFallback className="text-sm bg-muted">
                              {thread.title.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-medium text-sm font-inter tracking-[-0.5px] truncate">
                                {thread.title}
                              </span>
                              {thread.type === "ticket" && (
                                <Badge variant="outline" className={`text-[9px] h-4 px-1 ${getTicketStatusColor(thread.status || "")}`}>
                                  {(thread.status || "").replace("_", " ")}
                                </Badge>
                              )}
                            </div>
                            {thread.last_message_at && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {format(new Date(thread.last_message_at), "MMM d")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate font-inter tracking-[-0.5px]">
                            {thread.subtitle}
                          </p>
                        </div>
                        {thread.unread_count > 0 && (
                          <span className="w-5 h-5 bg-[#2060de] rounded-full text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                            {thread.unread_count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </>
  );
}
