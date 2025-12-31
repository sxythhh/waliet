import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageInput } from "./MessageInput";
import { format, isToday, isYesterday } from "date-fns";
import { Search, MessageSquare, Send, ArrowLeft, Users, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  brand_id: string;
  creator_id: string;
  last_message_at: string;
  created_at: string;
  creator?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  last_message?: {
    content: string;
    sender_type: string;
    is_read: boolean;
  };
  unread_count: number;
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

interface BrandMessagesTabProps {
  brandId: string;
}

export function BrandMessagesTab({ brandId }: BrandMessagesTabProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('brand-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Update messages if this conversation is selected
          if (selectedConversation?.id === newMsg.conversation_id) {
            setMessages(prev => [...prev, newMsg]);
            // Mark as read if from creator
            if (newMsg.sender_type === 'creator') {
              markMessageAsRead(newMsg.id);
            }
          }
          // Refresh conversations to update last_message
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId, selectedConversation?.id]);

  const fetchConversations = async () => {
    try {
      // Fetch conversations with creator info
      const { data: convos, error } = await supabase
        .from('conversations')
        .select(`
          id,
          brand_id,
          creator_id,
          last_message_at,
          created_at
        `)
        .eq('brand_id', brandId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch creator profiles and last messages
      const conversationsWithDetails = await Promise.all(
        (convos || []).map(async (conv) => {
          // Get creator profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, full_name')
            .eq('id', conv.creator_id)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_type, is_read')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread messages
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'creator')
            .eq('is_read', false);

          return {
            ...conv,
            creator: profile || undefined,
            last_message: lastMessage || undefined,
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark all creator messages as read
      const unreadMessages = (data || []).filter(
        m => m.sender_type === 'creator' && !m.is_read
      );
      for (const msg of unreadMessages) {
        await markMessageAsRead(msg.id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: 'brand',
        content: newMessage.trim()
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatConversationTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMM d');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.creator?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.creator?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-full flex">
        <div className="w-80 border-r border-border p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex bg-background">
      {/* Conversations List */}
      <div className={cn(
        "w-80 border-r border-border flex flex-col",
        selectedConversation && "hidden md:flex"
      )}>
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-muted/30 border-border/50"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Messages from creators will appear here
              </p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  "w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border/30",
                  selectedConversation?.id === conv.id && "bg-muted/70"
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={conv.creator?.avatar_url || undefined} />
                  <AvatarFallback>
                    <Users className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      @{conv.creator?.username || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatConversationTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message?.sender_type === 'brand' && 'You: '}
                      {conv.last_message?.content || 'No messages yet'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedConversation && "hidden md:flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border flex items-center gap-3 px-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedConversation.creator?.avatar_url || undefined} />
                <AvatarFallback>
                  <Users className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  @{selectedConversation.creator?.username || 'Unknown'}
                </p>
                {selectedConversation.creator?.full_name && (
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.creator.full_name}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Start the conversation by sending a message
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => {
                    const isFromBrand = msg.sender_type === 'brand';
                    const showDate = index === 0 ||
                      format(new Date(messages[index - 1].created_at), 'yyyy-MM-dd') !==
                      format(new Date(msg.created_at), 'yyyy-MM-dd');

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex items-center justify-center my-4">
                            <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                              {isToday(new Date(msg.created_at))
                                ? 'Today'
                                : isYesterday(new Date(msg.created_at))
                                  ? 'Yesterday'
                                  : format(new Date(msg.created_at), 'MMMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        <div className={cn(
                          "flex",
                          isFromBrand ? "justify-end" : "justify-start"
                        )}>
                          <div className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2.5",
                            isFromBrand
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}>
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <div className={cn(
                              "flex items-center gap-1 mt-1",
                              isFromBrand ? "justify-end" : "justify-start"
                            )}>
                              <span className={cn(
                                "text-[10px]",
                                isFromBrand ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </span>
                              {isFromBrand && (
                                msg.is_read
                                  ? <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                                  : <Check className="h-3 w-3 text-primary-foreground/70" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <MessageInput
                value={newMessage}
                onChange={setNewMessage}
                onSend={handleSendMessage}
                disabled={isSending}
                placeholder="Type a message..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <MessageSquare className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Your Messages</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Select a conversation from the list to view messages, or wait for creators to reach out.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
