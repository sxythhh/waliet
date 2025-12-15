import { useState, useEffect, useRef, useMemo } from "react";
import { X, MessageCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { MessageInput } from "@/components/brand/MessageInput";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import mailIcon from "@/assets/mail-icon.svg";
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

// Helper to detect and parse boost/campaign URLs
const parseInviteUrl = (content: string): { type: 'boost' | 'campaign'; id: string } | null => {
  // Match patterns like /boost/{id} or /c/{slug}
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
      className={`mt-2 p-3 rounded-xl border cursor-pointer transition-colors ${
        isCreatorMessage 
          ? 'bg-white/10 border-white/20 hover:bg-white/20' 
          : 'bg-background border-border hover:bg-accent'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 rounded-lg">
          <AvatarImage src={data.logo_url || undefined} />
          <AvatarFallback className="rounded-lg text-xs">{data.brand_name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isCreatorMessage ? 'text-white' : 'text-foreground'}`}>
            {data.title}
          </p>
          <p className={`text-xs ${isCreatorMessage ? 'text-white/70' : 'text-muted-foreground'}`}>
            {type === 'boost' ? 'Boost' : 'Campaign'} • {data.brand_name}
          </p>
        </div>
        <ExternalLink className={`h-4 w-4 ${isCreatorMessage ? 'text-white/70' : 'text-muted-foreground'}`} />
      </div>
    </div>
  );
}

export function CreatorChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);
  useEffect(() => {
    if (userId && isOpen) {
      fetchConversations();
    }
  }, [userId, isOpen]);
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      markMessagesAsRead(activeConversation.id);
    }
  }, [activeConversation]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('creator-messages').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    }, payload => {
      const newMessage = payload.new as Message;
      if (activeConversation && newMessage.conversation_id === activeConversation.id) {
        setMessages(prev => [...prev, newMessage]);
        markMessagesAsRead(activeConversation.id);
      }
      fetchConversations();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeConversation]);
  const fetchConversations = async () => {
    if (!userId) return;
    setLoading(true);
    const {
      data: convos,
      error
    } = await supabase.from("conversations").select(`
        *,
        brand:brands(name, logo_url)
      `).eq("creator_id", userId).order("last_message_at", {
      ascending: false,
      nullsFirst: false
    });
    if (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
      return;
    }

    // Get unread counts and last messages
    const conversationsWithDetails = await Promise.all((convos || []).map(async conv => {
      const {
        count
      } = await supabase.from("messages").select("*", {
        count: "exact",
        head: true
      }).eq("conversation_id", conv.id).eq("sender_type", "brand").eq("is_read", false);
      const {
        data: lastMsg
      } = await supabase.from("messages").select("content").eq("conversation_id", conv.id).order("created_at", {
        ascending: false
      }).limit(1).single();
      return {
        ...conv,
        unread_count: count || 0,
        last_message: lastMsg?.content || ""
      };
    }));
    setConversations(conversationsWithDetails);
    setTotalUnread(conversationsWithDetails.reduce((sum, c) => sum + (c.unread_count || 0), 0));
    setLoading(false);
  };
  const fetchMessages = async (conversationId: string) => {
    const {
      data,
      error
    } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", {
      ascending: true
    });
    if (!error && data) {
      setMessages(data);
    }
  };
  const markMessagesAsRead = async (conversationId: string) => {
    await supabase.from("messages").update({
      is_read: true
    }).eq("conversation_id", conversationId).eq("sender_type", "brand").eq("is_read", false);
    fetchConversations();
  };
  const handleBack = () => {
    setActiveConversation(null);
    setMessages([]);
    setNewMessage("");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !userId) return;
    
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConversation.id,
      sender_id: userId,
      sender_type: "creator",
      content: newMessage.trim(),
    });

    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeConversation.id);
    }
    setSending(false);
  };
  return <>
      {/* Floating Button */}
      <button onClick={() => setIsOpen(true)} className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-[#2060de] hover:bg-[#1a50c0] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center group">
        <img src={mailIcon} alt="Messages" className="w-6 h-6" />
        {totalUnread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-medium flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>}
      </button>

      {/* Chat Panel */}
      {isOpen && <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[380px] h-[480px] md:h-[520px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
            {activeConversation ? <div className="flex items-center gap-3">
                <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={activeConversation.brand?.logo_url || ""} />
                  <AvatarFallback className="text-xs bg-muted">
                    {activeConversation.brand?.name?.charAt(0) || "B"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm font-inter tracking-[-0.5px]">
                  {activeConversation.brand?.name}
                </span>
              </div> : <h3 className="font-semibold text-base font-inter tracking-[-0.5px]">Messages</h3>}
            <button onClick={() => {
          setIsOpen(false);
          setActiveConversation(null);
          setMessages([]);
        }} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!activeConversation ?
        // Conversations List
        <ScrollArea className="h-full">
                {loading ? <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div> : conversations.length === 0 ?
          // Empty State
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <img src={mailIcon} alt="Mail" className="w-8 h-8 opacity-50" />
                    </div>
                    <h4 className="font-medium text-base font-inter tracking-[-0.5px] mb-2">No messages yet</h4>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                      When brands message you, they'll appear here.
                    </p>
                  </div> : <div>
                    {conversations.map(conv => <button key={conv.id} onClick={() => setActiveConversation(conv)} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={conv.brand?.logo_url || ""} />
                          <AvatarFallback className="text-sm bg-muted">
                            {conv.brand?.name?.charAt(0) || "B"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-medium text-sm font-inter tracking-[-0.5px] truncate">
                              {conv.brand?.name}
                            </span>
                            {conv.last_message_at && <span className="text-xs text-muted-foreground flex-shrink-0">
                                {format(new Date(conv.last_message_at), "MMM d")}
                              </span>}
                          </div>
                          <p className="text-sm text-muted-foreground truncate font-inter tracking-[-0.5px]">
                            {conv.last_message || "No messages yet"}
                          </p>
                        </div>
                        {(conv.unread_count || 0) > 0 && <span className="w-5 h-5 bg-[#2060de] rounded-full text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </span>}
                      </button>)}
                  </div>}
              </ScrollArea> :
        // Messages View
        <div className="flex flex-col h-full">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {messages.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                        No messages in this conversation yet.
                      </p>
                    </div> : messages.map(message => {
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
                    })}
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
            </div>}
          </div>
        </div>}
    </>;
}