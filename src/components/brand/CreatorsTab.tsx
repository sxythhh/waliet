import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Users, X, Mail, ExternalLink, Download, MessageSquare, Send, PenSquare, HelpCircle, ArrowLeft, Bookmark, Filter, Plus, Trash2, PanelRightClose, PanelRightOpen, MoreHorizontal, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageInput } from "@/components/brand/MessageInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import xLogoBlack from "@/assets/x-logo.png";
import xLogoWhite from "@/assets/x-logo-light.png";
import mailIcon from "@/assets/mail-icon.svg";
interface CreatorCampaign {
  id: string;
  title: string;
  type: 'campaign' | 'boost';
  status?: 'pending' | 'accepted' | 'rejected';
}
interface Creator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  campaigns: CreatorCampaign[];
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
    avatar_url?: string | null;
    follower_count?: number | null;
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
const getPlatformLogos = (isDark: boolean): Record<string, string> => ({
  tiktok: isDark ? tiktokLogoWhite : tiktokLogoBlack,
  instagram: isDark ? instagramLogoWhite : instagramLogoBlack,
  youtube: isDark ? youtubeLogoWhite : youtubeLogoBlack,
  x: isDark ? xLogoWhite : xLogoBlack
});
type MobileView = 'messages' | 'conversation' | 'creators';
type MessageFilter = 'all' | 'unread' | 'bookmarked';
interface Campaign {
  id: string;
  title: string;
}
export function CreatorsTab({
  brandId
}: CreatorsTabProps) {
  const {
    resolvedTheme
  } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const PLATFORM_LOGOS = useMemo(() => getPlatformLogos(isDark), [isDark]);
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
  const [creatorsCollapsed, setCreatorsCollapsed] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [removingFromCampaign, setRemovingFromCampaign] = useState<{
    creatorId: string;
    campaign: CreatorCampaign;
  } | null>(null);
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
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!activeConversation) return;
    const channel = supabase.channel('messages-changes').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${activeConversation.id}`
    }, payload => {
      const newMessage = payload.new as Message;
      setMessages(prev => [...prev, newMessage]);
      markMessagesAsRead(activeConversation.id);
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation?.id]);
  const fetchCurrentUser = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };
  const fetchConversations = async () => {
    if (!brandId) return;
    const {
      data,
      error
    } = await supabase.from("conversations").select("*").eq("brand_id", brandId).order("last_message_at", {
      ascending: false
    });
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
        const {
          count
        } = await supabase.from("messages").select("*", {
          count: "exact",
          head: true
        }).eq("conversation_id", conv.id).eq("sender_type", "creator").eq("is_read", false);
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
    const {
      error
    } = await supabase.from("conversations").update({
      is_bookmarked: newBookmarkState
    }).eq("id", conversationId);
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
    await supabase.from("messages").delete().eq("conversation_id", conversationId);

    // Then delete the conversation
    const {
      error
    } = await supabase.from("conversations").delete().eq("id", conversationId);
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
    // Filter by message type
    if (messageFilter === 'unread') {
      const hasUnread = unreadCounts.get(conv.id) && unreadCounts.get(conv.id)! > 0;
      if (!hasUnread) return false;
    }
    if (messageFilter === 'bookmarked') {
      if (!bookmarkedConversations.has(conv.id)) return false;
    }

    // Filter by campaign
    if (campaignFilter !== 'all') {
      const creator = creators.find(c => c.id === conv.creator_id);
      if (!creator) return false;
      const isInCampaign = creator.campaigns.some(c => c.id === campaignFilter);
      if (!isInCampaign) return false;
    }
    return true;
  });
  const fetchMessages = async (conversationId: string) => {
    const {
      data
    } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", {
      ascending: true
    });
    if (data) {
      setMessages(data as Message[]);
    }
  };
  const markMessagesAsRead = async (conversationId: string) => {
    await supabase.from("messages").update({
      is_read: true
    }).eq("conversation_id", conversationId).eq("sender_type", "creator").eq("is_read", false);
  };
  const sendMessage = async () => {
    if (!messageInput.trim() || !activeConversation || !currentUserId) return;
    setSendingMessage(true);
    try {
      const {
        error
      } = await supabase.from("messages").insert({
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
      setActiveConversation({
        ...existing,
        creator
      });
      setMobileView('conversation');
      return;
    }

    // Create new conversation
    const {
      data,
      error
    } = await supabase.from("conversations").insert({
      brand_id: brandId,
      creator_id: creator.id
    }).select().single();
    if (data) {
      const newConversation = {
        ...data,
        creator
      };
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

    // Fetch campaigns and bounty campaigns in parallel
    const [campaignsResult, bouncyCampaignsResult] = await Promise.all([supabase.from("campaigns").select("id, title").eq("brand_id", brandId), supabase.from("bounty_campaigns").select("id, title").eq("brand_id", brandId)]);
    const campaignsData = campaignsResult.data || [];
    const bouncyCampaignsData = bouncyCampaignsResult.data || [];

    // Store campaigns for filter dropdown
    setCampaigns(campaignsData);
    const campaignIds = campaignsData.map(c => c.id);
    const bountyIds = bouncyCampaignsData.map(b => b.id);
    const campaignMap = new Map(campaignsData.map(c => [c.id, c.title]));
    const bountyMap = new Map(bouncyCampaignsData.map(b => [b.id, b.title]));

    // Fetch campaign connections and bounty applications in parallel
    const [connectionsResult, bountyApplicationsResult] = await Promise.all([campaignIds.length > 0 ? supabase.from("social_account_campaigns").select(`
            campaign_id,
            user_id,
            connected_at,
            social_accounts!inner (
              platform,
              username,
              account_link,
              avatar_url,
              follower_count
            )
          `).in("campaign_id", campaignIds).eq("status", "active") : Promise.resolve({
      data: []
    }), bountyIds.length > 0 ? supabase.from("bounty_applications").select("bounty_campaign_id, user_id, applied_at, status").in("bounty_campaign_id", bountyIds) : Promise.resolve({
      data: []
    })]);
    const connections = connectionsResult.data || [];
    const bountyApplications = bountyApplicationsResult.data || [];
    if (connections.length === 0 && bountyApplications.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    // Collect all unique user IDs from both sources
    const campaignUserIds = connections.map(c => c.user_id);
    const bountyUserIds = bountyApplications.map(b => b.user_id);
    const userIds = [...new Set([...campaignUserIds, ...bountyUserIds])];
    const BATCH_SIZE = 500;
    const profiles: any[] = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchIds = userIds.slice(i, i + BATCH_SIZE);
      const {
        data: batchProfiles
      } = await supabase.from("profiles").select("id, username, full_name, avatar_url, email, total_earnings").in("id", batchIds);
      if (batchProfiles) {
        profiles.push(...batchProfiles);
      }
    }
    const analytics: any[] = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchIds = userIds.slice(i, i + BATCH_SIZE);
      const {
        data: batchAnalytics
      } = await supabase.from("campaign_account_analytics").select("user_id, total_views, paid_views").in("campaign_id", campaignIds).in("user_id", batchIds);
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
        creator.campaigns.push({
          id: conn.campaign_id,
          title: campaignTitle,
          type: 'campaign'
        });
      }
      const socialAccount = conn.social_accounts as any;
      if (socialAccount && !creator.social_accounts.find(s => s.platform === socialAccount.platform && s.username === socialAccount.username)) {
        creator.social_accounts.push({
          platform: socialAccount.platform,
          username: socialAccount.username,
          account_link: socialAccount.account_link,
          avatar_url: socialAccount.avatar_url,
          follower_count: socialAccount.follower_count
        });
      }
    }

    // Also add creators from bounty applications
    for (const app of bountyApplications) {
      const userId = app.user_id;
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
          date_joined: app.applied_at
        });
      } else {
        const creator = creatorMap.get(userId)!;
        if (app.applied_at && (!creator.date_joined || app.applied_at < creator.date_joined)) {
          creator.date_joined = app.applied_at;
        }
      }
      const creator = creatorMap.get(userId)!;
      const bountyTitle = bountyMap.get(app.bounty_campaign_id);
      if (bountyTitle && !creator.campaigns.find(c => c.id === app.bounty_campaign_id)) {
        creator.campaigns.push({
          id: app.bounty_campaign_id,
          title: bountyTitle,
          type: 'boost',
          status: app.status
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
      const {
        data: batchTx
      } = await supabase.from("wallet_transactions").select("user_id, amount, metadata").eq("type", "earning").in("user_id", batchIds);
      if (batchTx) {
        transactions.push(...batchTx);
      }
    }
    if (transactions.length > 0) {
      for (const tx of transactions) {
        const campaignId = (tx.metadata as any)?.campaign_id;
        const bountyId = (tx.metadata as any)?.bounty_campaign_id;
        if (campaignId && campaignIds.includes(campaignId) || bountyId && bountyIds.includes(bountyId)) {
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
    return creator.username.toLowerCase().includes(query) || creator.full_name?.toLowerCase().includes(query) || creator.email?.toLowerCase().includes(query) || creator.social_accounts.some(s => s.username.toLowerCase().includes(query));
  });
  const removeFromCampaign = async (creatorId: string, campaign: CreatorCampaign) => {
    try {
      if (campaign.type === 'campaign') {
        // Remove from campaign - delete social_account_campaigns entries
        await supabase.from("social_account_campaigns").delete().eq("campaign_id", campaign.id).eq("user_id", creatorId);

        // Also delete campaign submissions
        await supabase.from("campaign_submissions").delete().eq("campaign_id", campaign.id).eq("creator_id", creatorId);
      } else {
        // Remove from boost - delete bounty application
        await supabase.from("bounty_applications").delete().eq("bounty_campaign_id", campaign.id).eq("user_id", creatorId);
      }

      // Update local state
      setCreators(prev => prev.map(c => {
        if (c.id === creatorId) {
          return {
            ...c,
            campaigns: c.campaigns.filter(camp => camp.id !== campaign.id)
          };
        }
        return c;
      }).filter(c => c.campaigns.length > 0)); // Remove creator if no campaigns left

      // Update selected creator if viewing
      if (selectedCreator?.id === creatorId) {
        const updatedCampaigns = selectedCreator.campaigns.filter(c => c.id !== campaign.id);
        if (updatedCampaigns.length === 0) {
          setSelectedCreator(null);
        } else {
          setSelectedCreator({
            ...selectedCreator,
            campaigns: updatedCampaigns
          });
        }
      }
      setRemovingFromCampaign(null);
    } catch (error) {
      console.error("Error removing from campaign:", error);
    }
  };
  const getConversationCreator = (conv: Conversation) => {
    return creators.find(c => c.id === conv.creator_id);
  };
  const exportToCSV = () => {
    const rows: string[][] = [];
    rows.push(["Creator Name", "Username", "Email", "Platform", "Account Username", "Account URL", "Date Joined", "Total Earnings"]);
    for (const creator of creators) {
      if (creator.social_accounts.length === 0) {
        rows.push([creator.full_name || "", creator.username, creator.email || "", "", "", "", creator.date_joined ? new Date(creator.date_joined).toLocaleDateString() : "", creator.total_earnings.toFixed(2)]);
      } else {
        for (const account of creator.social_accounts) {
          rows.push([creator.full_name || "", creator.username, creator.email || "", account.platform, account.username, account.account_link || "", creator.date_joined ? new Date(creator.date_joined).toLocaleDateString() : "", creator.total_earnings.toFixed(2)]);
        }
      }
    }
    const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
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
    return <div className="h-full flex font-inter tracking-[-0.5px]">
        <div className="w-80 border-r border-border p-4 space-y-4 hidden lg:block">
          <Skeleton className="h-6 w-24" />
          {[1, 2, 3].map(i => <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>)}
        </div>
        <div className="flex-1 hidden lg:block" />
        <div className="w-full lg:w-96 border-l border-border p-4 space-y-4">
          <Skeleton className="h-6 w-24" />
          {[1, 2, 3, 4].map(i => <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>)}
        </div>
      </div>;
  }

  // Mobile Navigation Tabs
  const MobileNav = () => <div className="lg:hidden flex border-b border-border bg-background/50 backdrop-blur-sm">
      <button onClick={() => setMobileView('messages')} className={`flex-1 py-3 text-sm font-medium text-center transition-colors font-inter tracking-[-0.5px] ${mobileView === 'messages' ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground'}`}>
        Messages
      </button>
      <button onClick={() => setMobileView('creators')} className={`flex-1 py-3 text-sm font-medium text-center transition-colors font-inter tracking-[-0.5px] ${mobileView === 'creators' ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground'}`}>
        Creators ({creators.length})
      </button>
    </div>;
  return <div className="h-full flex flex-col lg:flex-row bg-background font-inter tracking-[-0.5px]">
      <MobileNav />
      
      {/* Left Column - Conversations List */}
      <div className={`w-full lg:w-80 border-r border-border flex flex-col ${mobileView === 'messages' ? 'flex' : 'hidden lg:flex'} ${mobileView === 'conversation' ? 'hidden lg:flex' : ''}`}>
        <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-sm">Messages</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50">
            <PenSquare className="h-4 w-4" />
          </Button>
        </div>

        {/* Message Filters */}
        <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
          <button className={`h-7 px-3 text-xs rounded-md transition-all ${messageFilter === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`} onClick={() => setMessageFilter('all')}>
            All
          </button>
          <button className={`h-7 px-3 text-xs rounded-md transition-all flex items-center gap-1.5 ${messageFilter === 'unread' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`} onClick={() => setMessageFilter('unread')}>
            <div className={`h-1.5 w-1.5 rounded-full ${messageFilter === 'unread' ? 'bg-background' : 'bg-emerald-500'}`} />
            Unread
          </button>
          <button className={`h-7 px-3 text-xs rounded-md transition-all flex items-center gap-1.5 ${messageFilter === 'bookmarked' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`} onClick={() => setMessageFilter('bookmarked')}>
            <Bookmark className="h-3 w-3" />
            Saved
          </button>
          
          {campaigns.length > 0 && <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs rounded-md border-0 bg-transparent hover:bg-muted/50 text-muted-foreground">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all" className="text-xs">All Campaigns</SelectItem>
                {campaigns.map(campaign => <SelectItem key={campaign.id} value={campaign.id} className="text-xs">
                    {campaign.title}
                  </SelectItem>)}
              </SelectContent>
            </Select>}
        </div>

        <ScrollArea className="flex-1">
          {conversations.length === 0 ? <div className="flex flex-col items-center justify-center p-8 text-center h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
                <img src={mailIcon} className="h-8 w-8 opacity-60" alt="Mail" />
              </div>
              <h3 className="font-semibold text-base mb-2">Your Inbox is Empty</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[220px] leading-relaxed">
                Start conversations by messaging creators from the right panel.
              </p>
              <Button onClick={() => setMobileView('creators')} className="gap-2 bg-foreground text-background hover:bg-foreground/90 h-9 px-4 text-xs rounded-3xl">
                <Plus className="h-3.5 w-3.5" />
                Browse Creators
              </Button>
            </div> : filteredConversations.length === 0 ? <div className="flex flex-col items-center justify-center p-8 text-center h-[300px]">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                {messageFilter === 'unread' ? <Mail className="h-7 w-7 text-muted-foreground/60" /> : <Bookmark className="h-7 w-7 text-muted-foreground/60" />}
              </div>
              <h3 className="font-medium text-sm mb-1">
                {messageFilter === 'unread' ? 'No unread messages' : 'No saved conversations'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {messageFilter === 'unread' ? "You're all caught up!" : "Bookmark conversations to find them here."}
              </p>
            </div> : <div>
              {filteredConversations.map(conv => {
            const creator = getConversationCreator(conv);
            const unreadCount = unreadCounts.get(conv.id) || 0;
            const isBookmarked = bookmarkedConversations.has(conv.id);
            return <div key={conv.id} className={`group p-4 cursor-pointer transition-all hover:bg-muted/30 ${activeConversation?.id === conv.id ? "bg-muted/40" : ""}`} onClick={() => {
              setActiveConversation({
                ...conv,
                creator
              });
              setMobileView('conversation');
            }}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-1 ring-border">
                          <AvatarImage src={creator?.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                            {creator?.username.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        {unreadCount > 0 && <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 text-white text-[9px] font-medium flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold' : 'font-medium'}`}>
                          {creator?.full_name || creator?.username || "Unknown"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), {
                      addSuffix: true
                    }) : "No messages"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground shrink-0 opacity-0 group-hover:opacity-100 hover:bg-muted/50">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={e => {
                      e.stopPropagation();
                      toggleBookmark(conv.id);
                    }} className="text-xs">
                            <Bookmark className={`h-3.5 w-3.5 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                            {isBookmarked ? 'Unbookmark' : 'Bookmark'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => {
                      e.stopPropagation();
                      setDeleteConfirmId(conv.id);
                    }} className="text-xs text-destructive focus:text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>;
          })}
            </div>}
        </ScrollArea>
      </div>

      {/* Middle Column - Active Conversation */}
      <div className={`flex-1 flex flex-col min-w-0 border-r border-border ${mobileView === 'conversation' ? 'flex' : 'hidden lg:flex'}`}>
        {activeConversation ? <>
            {/* Conversation Header */}
            <div className="h-14 px-4 border-b border-border flex items-center gap-3 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden hover:bg-muted/50" onClick={() => setMobileView('messages')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-9 w-9 ring-1 ring-border">
                <AvatarImage src={activeConversation.creator?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                  {activeConversation.creator?.username.slice(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <span className="font-inter tracking-[-0.5px] font-medium text-sm flex-1">
                {activeConversation.creator?.full_name || activeConversation.creator?.username || "Unknown"}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 px-3 font-inter tracking-[-0.5px] text-sm bg-[#2060de] hover:bg-[#1a50c0] text-white">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Pay
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden lg:flex hover:bg-muted/50" onClick={() => setCreatorsCollapsed(!creatorsCollapsed)}>
                  {creatorsCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(msg => <div key={msg.id} className={`flex ${msg.sender_type === "brand" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.sender_type === "brand" ? "bg-foreground text-background" : "bg-muted/60"}`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-1.5 ${msg.sender_type === "brand" ? "text-background/60" : "text-muted-foreground"}`}>
                        {format(new Date(msg.created_at), "h:mm a")}
                      </p>
                    </div>
                  </div>)}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <MessageInput value={messageInput} onChange={setMessageInput} onSend={sendMessage} disabled={sendingMessage} />
            </div>
          </> : <div className="flex-1 flex flex-col">
            {/* Empty state header with toggle */}
            <div className="h-14 px-4 border-b border-border flex items-center justify-end shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden lg:flex hover:bg-muted/50" onClick={() => setCreatorsCollapsed(!creatorsCollapsed)}>
                {creatorsCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          </div>}
      </div>

      {/* Right Column - Creators List */}
      <div className={`flex flex-col transition-all duration-300 font-inter tracking-[-0.5px] border-l border-border ${creatorsCollapsed ? 'w-0 overflow-hidden lg:w-0' : 'w-full lg:w-96'} ${mobileView === 'creators' ? 'flex' : 'hidden lg:flex'} ${mobileView === 'conversation' ? 'hidden lg:flex' : ''}`}>
        <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-sm">Creators</h2>
            
          </div>
          {creators.length > 0 && <Button variant="ghost" size="sm" className="h-8 px-3 gap-1.5 text-xs hover:bg-muted/50" onClick={exportToCSV}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search creators..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-muted/30 border-border text-sm" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {creators.length === 0 ? <div className="flex flex-col items-center justify-center p-8 text-center h-[300px]">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <img src="/assets/frame-person-icon.svg" alt="" className="h-7 w-7 opacity-60" />
              </div>
              <h3 className="font-medium text-sm mb-1">No creators yet</h3>
              <p className="text-xs text-muted-foreground">
                Creators will appear here once they join your campaigns.
              </p>
            </div> : <div>
              {filteredCreators.map(creator => <div key={creator.id} className="p-4 hover:bg-muted/20 transition-all cursor-pointer group" onClick={() => setSelectedCreator(creator)}>
                  {/* Header Row */}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10 ring-1 ring-border">
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                        {creator.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {creator.full_name || creator.username}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                          {creator.campaigns.length} campaign{creator.campaigns.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        @{creator.username}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50" onClick={e => {
                e.stopPropagation();
                startConversation(creator);
              }}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Social Accounts - Simplified Display */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {creator.social_accounts.slice(0, 3).map((account, idx) => <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors text-xs" onClick={e => {
                e.stopPropagation();
                if (account.account_link) {
                  window.open(account.account_link, "_blank");
                }
              }}>
                        <img src={PLATFORM_LOGOS[account.platform.toLowerCase()]} alt={account.platform} className="h-3 w-3 object-contain" />
                        <span className="text-[11px] truncate max-w-[70px]">@{account.username}</span>
                      </div>)}
                    {creator.social_accounts.length > 3 && <span className="text-[10px] text-muted-foreground">
                        +{creator.social_accounts.length - 3}
                      </span>}
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{creator.date_joined ? format(new Date(creator.date_joined), "MMM d, yyyy") : "-"}</span>
                      
                      
                    </div>
                    <span className="text-emerald-500 font-medium">${creator.total_earnings.toFixed(2)}</span>
                  </div>
                </div>)}
            </div>}
        </ScrollArea>
      </div>

      {/* Creator Details Dialog */}
      <Dialog open={!!selectedCreator} onOpenChange={() => setSelectedCreator(null)}>
        <DialogContent className="max-w-md font-inter tracking-[-0.5px] p-0 gap-0 overflow-hidden max-h-[90vh]">
          <div className="p-4 sm:p-6 pb-3 sm:pb-4">
            <DialogHeader className="p-0">
              <DialogTitle className="font-inter tracking-[-0.5px] text-base">Creator Details</DialogTitle>
            </DialogHeader>
          </div>
          
          {selectedCreator && <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="pb-4 sm:pb-6 space-y-4 sm:space-y-5 px-4 sm:px-6">
              {/* Profile Header */}
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shrink-0">
                  <AvatarImage src={selectedCreator.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm sm:text-base font-medium">
                    {selectedCreator.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{selectedCreator.full_name || selectedCreator.username}</h3>
                  <p className="text-xs text-muted-foreground truncate">@{selectedCreator.username}</p>
                  {selectedCreator.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{selectedCreator.email}</span>
                    </p>}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-lg bg-muted/30 p-2.5 sm:p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Views</p>
                  <p className="font-medium text-sm">{selectedCreator.total_views.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2.5 sm:p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Earnings</p>
                  <p className="font-medium text-sm text-emerald-500">${selectedCreator.total_earnings.toFixed(2)}</p>
                </div>
              </div>

              {/* Social Accounts */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Connected Accounts</h4>
                <div className="space-y-1.5">
                  {selectedCreator.social_accounts.map((account, idx) => <div key={idx} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => account.account_link && window.open(account.account_link, "_blank")}>
                      {account.avatar_url ? <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                          <AvatarImage src={account.avatar_url} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                            {account.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar> : <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                          <img src={PLATFORM_LOGOS[account.platform.toLowerCase()]} alt={account.platform} className="h-3.5 w-3.5 sm:h-4 sm:w-4 object-contain" />
                        </div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <img src={PLATFORM_LOGOS[account.platform.toLowerCase()]} alt={account.platform} className="h-3 w-3 object-contain shrink-0" />
                          <span className="text-xs font-medium truncate">@{account.username}</span>
                        </div>
                        {account.follower_count && account.follower_count > 0 && <p className="text-[10px] text-muted-foreground">{account.follower_count.toLocaleString()} followers</p>}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    </div>)}
                </div>
              </div>

              {/* Campaigns */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Campaigns & Boosts</h4>
                <div className="space-y-1.5">
                  {selectedCreator.campaigns.map(campaign => {
                  const label = campaign.type === 'campaign' ? 'Joined' : campaign.status === 'accepted' ? 'Accepted' : campaign.status === 'rejected' ? 'Rejected' : 'Applied';
                  return <div key={campaign.id} className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg bg-muted/20 group">
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] sm:text-xs font-medium truncate block">
                          {campaign.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
                      e.stopPropagation();
                      setRemovingFromCampaign({
                        creatorId: selectedCreator.id,
                        campaign
                      });
                    }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>;
                })}
                </div>
              </div>

              {/* Message Button */}
              <Button className="w-full h-9 text-xs font-medium bg-foreground text-background hover:bg-foreground/90" onClick={() => {
              startConversation(selectedCreator);
              setSelectedCreator(null);
            }}>
                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                Send Message
              </Button>
            </div>
          </ScrollArea>}
        </DialogContent>
      </Dialog>

      {/* Delete Conversation Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-inter tracking-[-0.5px]">Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription className="font-inter tracking-[-0.5px]">
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-inter tracking-[-0.5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-inter tracking-[-0.5px]" onClick={() => {
            if (deleteConfirmId) {
              deleteConversation(deleteConfirmId);
              setDeleteConfirmId(null);
            }
          }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove from Campaign Confirmation Dialog */}
      <AlertDialog open={!!removingFromCampaign} onOpenChange={open => !open && setRemovingFromCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-inter tracking-[-0.5px]">Remove from {removingFromCampaign?.campaign.type === 'boost' ? 'boost' : 'campaign'}?</AlertDialogTitle>
            <AlertDialogDescription className="font-inter tracking-[-0.5px]">
              This will remove the creator from "{removingFromCampaign?.campaign.title}". They will need to rejoin if they want to participate again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-inter tracking-[-0.5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-inter tracking-[-0.5px]" onClick={() => {
            if (removingFromCampaign) {
              removeFromCampaign(removingFromCampaign.creatorId, removingFromCampaign.campaign);
            }
          }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}