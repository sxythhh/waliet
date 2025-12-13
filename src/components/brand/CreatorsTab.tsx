import { useState, useEffect, useRef } from "react";
import { Search, Users, X, Mail, ExternalLink, Download, MessageSquare, Send, PenSquare, HelpCircle, ArrowLeft, Smile, Bold, Italic, Link, Inbox, Bookmark, Filter, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-black-new.png";
import xLogo from "@/assets/x-logo.png";

interface Creator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  campaigns: {
    id: string;
    title: string;
  }[];
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
  }[];
  total_views: number;
  total_earnings: number;
  date_joined: string | null;
}

interface Conversation {
  id: string;
  brand_id: string;
  creator_id: string;
  last_message_at: string;
  created_at: string;
  creator?: Creator;
  last_message?: Message;
  unread_count?: number;
  is_bookmarked?: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'brand' | 'creator';
  content: string;
  is_read: boolean;
  created_at: string;
}

interface CreatorsTabProps {
  brandId: string;
}

const PLATFORM_LOGOS: Record<string, string> = {
  tiktok: tiktokLogo,
  instagram: instagramLogo,
  youtube: youtubeLogo,
  x: xLogo
};

type MobileView = 'messages' | 'conversation' | 'creators';
type MessageFilter = 'all' | 'unread' | 'bookmarked';

export function CreatorsTab({ brandId }: CreatorsTabProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('creators');
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all');
  const [bookmarkedConversations, setBookmarkedConversations] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchCreators();
    fetchConversations();
  }, [brandId]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      markMessagesAsRead(activeConversation.id);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!activeConversation) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          markMessagesAsRead(activeConversation.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation?.id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchConversations = async () => {
    if (!brandId) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("brand_id", brandId)
      .order("last_message_at", { ascending: false });

    if (data) {
      setConversations(data);
      
      // Set bookmarked conversations from database
      const bookmarked = new Set<string>();
      for (const conv of data) {
        if (conv.is_bookmarked) {
          bookmarked.add(conv.id);
        }
      }
      setBookmarkedConversations(bookmarked);
      
      // Fetch unread counts for each conversation
      const counts = new Map<string, number>();
      for (const conv of data) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("sender_type", "creator")
          .eq("is_read", false);
        if (count && count > 0) {
          counts.set(conv.id, count);
        }
      }
      setUnreadCounts(counts);
    }
  };

  const toggleBookmark = async (conversationId: string) => {
    const isCurrentlyBookmarked = bookmarkedConversations.has(conversationId);
    const newBookmarkState = !isCurrentlyBookmarked;
    
    // Optimistic update
    setBookmarkedConversations(prev => {
      const newSet = new Set(prev);
      if (newBookmarkState) {
        newSet.add(conversationId);
      } else {
        newSet.delete(conversationId);
      }
      return newSet;
    });

    // Persist to database
    const { error } = await supabase
      .from("conversations")
      .update({ is_bookmarked: newBookmarkState })
      .eq("id", conversationId);
    
    if (error) {
      // Revert on error
      setBookmarkedConversations(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyBookmarked) {
          newSet.add(conversationId);
        } else {
          newSet.delete(conversationId);
        }
        return newSet;
      });
    }
  };

  const deleteConversation = async (conversationId: string) => {
    // First delete all messages in the conversation
    await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);
    
    // Then delete the conversation
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);
    
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      setBookmarkedConversations(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (messageFilter === 'unread') {
      return unreadCounts.get(conv.id) && unreadCounts.get(conv.id)! > 0;
    }
    if (messageFilter === 'bookmarked') {
      return bookmarkedConversations.has(conv.id);
    }
    return true;
  });

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as Message[]);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "creator")
      .eq("is_read", false);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeConversation || !currentUserId) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConversation.id,
        sender_id: currentUserId,
        sender_type: "brand",
        content: messageInput.trim()
      });

      if (!error) {
        setMessageInput("");
        fetchConversations();
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const startConversation = async (creator: Creator) => {
    if (!currentUserId) return;

    // Check if conversation already exists
    const existing = conversations.find(c => c.creator_id === creator.id);
    if (existing) {
      setActiveConversation({ ...existing, creator });
      setMobileView('conversation');
      return;
    }

    // Create new conversation
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        brand_id: brandId,
        creator_id: creator.id
      })
      .select()
      .single();

    if (data) {
      const newConversation = { ...data, creator };
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      setMobileView('conversation');
    }
  };

  const fetchCreators = async () => {
    if (!brandId) {
      setCreators([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, title")
      .eq("brand_id", brandId);
    
    if (!campaigns || campaigns.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    const campaignIds = campaigns.map(c => c.id);
    const campaignMap = new Map(campaigns.map(c => [c.id, c.title]));

    const { data: connections } = await supabase
      .from("social_account_campaigns")
      .select(`
        campaign_id,
        user_id,
        connected_at,
        social_accounts!inner (
          platform,
          username,
          account_link
        )
      `)
      .in("campaign_id", campaignIds)
      .eq("status", "active");
    
    if (!connections || connections.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(connections.map(c => c.user_id))];
    const BATCH_SIZE = 500;
    const profiles: any[] = [];
    
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchIds = userIds.slice(i, i + BATCH_SIZE);
      const { data: batchProfiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, email, total_earnings")
        .in("id", batchIds);
      if (batchProfiles) {
        profiles.push(...batchProfiles);
      }
    }

    const analytics: any[] = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchIds = userIds.slice(i, i + BATCH_SIZE);
      const { data: batchAnalytics } = await supabase
        .from("campaign_account_analytics")
        .select("user_id, total_views, paid_views")
        .in("campaign_id", campaignIds)
        .in("user_id", batchIds);
      if (batchAnalytics) {
        analytics.push(...batchAnalytics);
      }
    }

    const creatorMap = new Map<string, Creator>();
    for (const conn of connections) {
      const userId = conn.user_id;
      const profile = profiles?.find(p => p.id === userId);
      if (!profile) continue;

      if (!creatorMap.has(userId)) {
        creatorMap.set(userId, {
          id: userId,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          email: profile.email,
          campaigns: [],
          social_accounts: [],
          total_views: 0,
          total_earnings: 0,
          date_joined: conn.connected_at
        });
      } else {
        const creator = creatorMap.get(userId)!;
        if (conn.connected_at && (!creator.date_joined || conn.connected_at < creator.date_joined)) {
          creator.date_joined = conn.connected_at;
        }
      }

      const creator = creatorMap.get(userId)!;
      const campaignTitle = campaignMap.get(conn.campaign_id);
      if (campaignTitle && !creator.campaigns.find(c => c.id === conn.campaign_id)) {
        creator.campaigns.push({ id: conn.campaign_id, title: campaignTitle });
      }

      const socialAccount = conn.social_accounts as any;
      if (socialAccount && !creator.social_accounts.find(s => s.platform === socialAccount.platform && s.username === socialAccount.username)) {
        creator.social_accounts.push({
          platform: socialAccount.platform,
          username: socialAccount.username,
          account_link: socialAccount.account_link
        });
      }
    }

    if (analytics && analytics.length > 0) {
      for (const analytic of analytics) {
        const creator = creatorMap.get(analytic.user_id);
        if (creator) {
          creator.total_views += analytic.total_views || 0;
        }
      }
    }

    const transactions: any[] = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchIds = userIds.slice(i, i + BATCH_SIZE);
      const { data: batchTx } = await supabase
        .from("wallet_transactions")
        .select("user_id, amount, metadata")
        .eq("type", "earning")
        .in("user_id", batchIds);
      if (batchTx) {
        transactions.push(...batchTx);
      }
    }
    
    if (transactions.length > 0) {
      for (const tx of transactions) {
        const campaignId = (tx.metadata as any)?.campaign_id;
        if (campaignId && campaignIds.includes(campaignId)) {
          const creator = creatorMap.get(tx.user_id);
          if (creator) {
            creator.total_earnings += Number(tx.amount) || 0;
          }
        }
      }
    }
    
    setCreators(Array.from(creatorMap.values()));
    setLoading(false);
  };

  const filteredCreators = creators.filter(creator => {
    const query = searchQuery.toLowerCase();
    return creator.username.toLowerCase().includes(query) || 
           creator.full_name?.toLowerCase().includes(query) || 
           creator.email?.toLowerCase().includes(query) ||
           creator.social_accounts.some(s => s.username.toLowerCase().includes(query));
  });

  const getConversationCreator = (conv: Conversation) => {
    return creators.find(c => c.id === conv.creator_id);
  };

  const exportToCSV = () => {
    const rows: string[][] = [];
    rows.push(["Creator Name", "Username", "Email", "Platform", "Account Username", "Account URL", "Date Joined", "Total Earnings"]);
    
    for (const creator of creators) {
      if (creator.social_accounts.length === 0) {
        rows.push([
          creator.full_name || "",
          creator.username,
          creator.email || "",
          "",
          "",
          "",
          creator.date_joined ? new Date(creator.date_joined).toLocaleDateString() : "",
          creator.total_earnings.toFixed(2)
        ]);
      } else {
        for (const account of creator.social_accounts) {
          rows.push([
            creator.full_name || "",
            creator.username,
            creator.email || "",
            account.platform,
            account.username,
            account.account_link || "",
            creator.date_joined ? new Date(creator.date_joined).toLocaleDateString() : "",
            creator.total_earnings.toFixed(2)
          ]);
        }
      }
    }
    
    const csvContent = rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `creators-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-full flex">
        <div className="w-80 border-r border-[#e0e0e0] dark:border-[#1a1a1a] p-4 space-y-4 hidden lg:block">
          <Skeleton className="h-6 w-24" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 hidden lg:block" />
        <div className="w-full lg:w-96 border-l border-[#e0e0e0] dark:border-[#1a1a1a] p-4 space-y-4">
          <Skeleton className="h-6 w-24" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Mobile Navigation Tabs
  const MobileNav = () => (
    <div className="lg:hidden flex border-b border-[#e0e0e0] dark:border-[#1a1a1a]">
      <button
        onClick={() => setMobileView('messages')}
        className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
          mobileView === 'messages' 
            ? 'text-primary border-b-2 border-primary' 
            : 'text-muted-foreground'
        }`}
      >
        Messages
      </button>
      <button
        onClick={() => setMobileView('creators')}
        className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
          mobileView === 'creators' 
            ? 'text-primary border-b-2 border-primary' 
            : 'text-muted-foreground'
        }`}
      >
        Creators ({creators.length})
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col lg:flex-row bg-background">
      <MobileNav />
      
      {/* Left Column - Conversations List */}
      <div className={`w-full lg:w-80 border-r border-[#e0e0e0] dark:border-[#1a1a1a] flex flex-col ${
        mobileView === 'messages' ? 'flex' : 'hidden lg:flex'
      } ${mobileView === 'conversation' ? 'hidden lg:flex' : ''}`}>
        <div className="p-4 border-b border-[#e0e0e0] dark:border-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Messages</h2>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <PenSquare className="h-4 w-4" />
          </Button>
        </div>

        {/* Message Filters */}
        <div className="p-3 border-b border-[#e0e0e0] dark:border-[#1a1a1a] flex items-center gap-2">
          <Button
            variant={messageFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs rounded-full"
            onClick={() => setMessageFilter('all')}
          >
            All
          </Button>
          <Button
            variant={messageFilter === 'unread' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs rounded-full gap-1.5"
            onClick={() => setMessageFilter('unread')}
          >
            <div className="h-2 w-2 rounded-full bg-primary" />
            Unread
          </Button>
          <Button
            variant={messageFilter === 'bookmarked' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs rounded-full gap-1.5"
            onClick={() => setMessageFilter('bookmarked')}
          >
            <Bookmark className="h-3 w-3" />
            Saved
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[400px]">
              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                <Inbox className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Your Inbox is Empty</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
                Start conversations by posting a job and messaging creators. Your conversations will appear here.
              </p>
              <Button 
                className="gap-2 bg-[#2060de] hover:bg-[#2060de]/90 border-t border-[#4b85f7]"
                onClick={() => setMobileView('creators')}
              >
                <Plus className="h-4 w-4" />
                Create a Campaign
              </Button>
              <button className="text-xs text-muted-foreground mt-4 hover:text-foreground transition-colors">
                Need help getting started?
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[300px]">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                {messageFilter === 'unread' ? (
                  <Mail className="h-8 w-8 text-muted-foreground/50" />
                ) : (
                  <Bookmark className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <h3 className="font-medium mb-2">
                {messageFilter === 'unread' ? 'No unread messages' : 'No saved conversations'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {messageFilter === 'unread' 
                  ? "You're all caught up!" 
                  : "Bookmark conversations to find them here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e0e0e0] dark:divide-[#1a1a1a]">
              {filteredConversations.map(conv => {
                const creator = getConversationCreator(conv);
                const unreadCount = unreadCounts.get(conv.id) || 0;
                const isBookmarked = bookmarkedConversations.has(conv.id);
                return (
                  <div
                    key={conv.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      activeConversation?.id === conv.id ? "bg-muted/50" : ""
                    }`}
                    onClick={() => {
                      setActiveConversation({ ...conv, creator });
                      setMobileView('conversation');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={creator?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {creator?.username.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold' : 'font-medium'}`}>
                          {creator?.full_name || creator?.username || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true }) : "No messages"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(conv.id);
                          }}
                        >
                          <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current text-primary' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this conversation? This cannot be undone.')) {
                              deleteConversation(conv.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Middle Column - Active Conversation */}
      <div className={`flex-1 flex flex-col min-w-0 border-r border-[#e0e0e0] dark:border-[#1a1a1a] ${
        mobileView === 'conversation' ? 'flex' : 'hidden lg:flex'
      }`}>
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-[#e0e0e0] dark:border-[#1a1a1a] flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:hidden"
                onClick={() => setMobileView('messages')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage src={activeConversation.creator?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {activeConversation.creator?.username.slice(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {activeConversation.creator?.full_name || activeConversation.creator?.username || "Unknown"}
              </span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === "brand" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        msg.sender_type === "brand"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.sender_type === "brand" ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}>
                        {format(new Date(msg.created_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Redesigned Message Input */}
            <div className="p-4 md:p-6 border-t border-[#e0e0e0] dark:border-[#1a1a1a] bg-background">
              <div className="rounded-2xl border border-[#e0e0e0] dark:border-[#1a1a1a] bg-card shadow-sm overflow-hidden">
                <Textarea
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="border-0 focus-visible:ring-0 resize-none min-h-[80px] text-sm px-4 pt-4 pb-2"
                  rows={3}
                />
                <div className="flex items-center justify-between px-4 pb-4">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Link className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    className="h-9 px-5 gap-2 rounded-lg bg-[#0a0a0a] dark:bg-white text-white dark:text-[#0a0a0a] hover:bg-[#0a0a0a]/90 dark:hover:bg-white/90"
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || sendingMessage}
                  >
                    Send
                    <span className="text-xs opacity-60 hidden sm:inline">⌘ ↵</span>
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Creators List */}
      <div className={`w-full lg:w-96 flex flex-col ${
        mobileView === 'creators' ? 'flex' : 'hidden lg:flex'
      } ${mobileView === 'conversation' ? 'hidden lg:flex' : ''}`}>
        <div className="p-4 border-b border-[#e0e0e0] dark:border-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Creators</h2>
            <span className="text-xs text-muted-foreground">({creators.length})</span>
          </div>
          {creators.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 gap-2 text-xs"
              onClick={exportToCSV}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#e0e0e0] dark:border-[#1a1a1a]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {creators.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[300px]">
              <Users className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No creators yet</h3>
              <p className="text-sm text-muted-foreground">
                Creators will appear here once they join your campaigns.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e0e0e0] dark:divide-[#1a1a1a]">
              {filteredCreators.map(creator => (
                <div
                  key={creator.id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedCreator(creator)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10 ring-2 ring-background">
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {creator.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {creator.full_name || creator.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{creator.username}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        startConversation(creator);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Social Accounts */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {creator.social_accounts.slice(0, 2).map((account, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 gap-1.5 text-foreground rounded-full bg-muted/50 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (account.account_link) {
                            window.open(account.account_link, "_blank");
                          }
                        }}
                      >
                        <img
                          src={PLATFORM_LOGOS[account.platform.toLowerCase()]}
                          alt={account.platform}
                          className="h-3 w-3 object-contain"
                        />
                        <span className="text-xs max-w-[60px] truncate">@{account.username}</span>
                      </Button>
                    ))}
                    {creator.social_accounts.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{creator.social_accounts.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Joined {creator.date_joined ? format(new Date(creator.date_joined), "MMM d, yyyy") : "-"}</span>
                    <span className="text-green-500 font-medium">${creator.total_earnings.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Creator Details Dialog */}
      <Dialog open={!!selectedCreator} onOpenChange={() => setSelectedCreator(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Creator Details</DialogTitle>
          </DialogHeader>
          
          {selectedCreator && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-background">
                  <AvatarImage src={selectedCreator.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {selectedCreator.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedCreator.full_name || selectedCreator.username}</h3>
                  <p className="text-sm text-muted-foreground">@{selectedCreator.username}</p>
                  {selectedCreator.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedCreator.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Views</p>
                  <p className="font-semibold text-lg">{selectedCreator.total_views.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Earnings</p>
                  <p className="font-semibold text-lg text-green-500">${selectedCreator.total_earnings.toFixed(2)}</p>
                </div>
              </div>

              {/* Social Accounts */}
              <div>
                <h4 className="text-sm font-medium mb-3">Connected Accounts</h4>
                <div className="space-y-2">
                  {selectedCreator.social_accounts.map((account, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-between h-auto py-2 px-3"
                      onClick={() => account.account_link && window.open(account.account_link, "_blank")}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={PLATFORM_LOGOS[account.platform.toLowerCase()]}
                          alt={account.platform}
                          className="h-5 w-5 object-contain"
                        />
                        <span>@{account.username}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ))}
                </div>
              </div>

              {/* Campaigns */}
              <div>
                <h4 className="text-sm font-medium mb-3">Joined Campaigns</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCreator.campaigns.map(campaign => (
                    <span
                      key={campaign.id}
                      className="px-3 py-1 rounded-full bg-muted text-xs font-medium"
                    >
                      {campaign.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* Message Button */}
              <Button
                className="w-full"
                onClick={() => {
                  startConversation(selectedCreator);
                  setSelectedCreator(null);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
