import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Send } from "lucide-react";
import { Brand } from "@/pages/BrandPortal";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface BrandPortalMessagesProps {
  brand: Brand;
  userId: string;
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

interface Conversation {
  id: string;
  brand_id: string;
  creator_id: string;
  last_message_at: string | null;
}

export function BrandPortalMessages({ brand, userId }: BrandPortalMessagesProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const accentColor = brand.brand_color || "#2061de";

  useEffect(() => {
    fetchConversation();
  }, [brand.id, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`portal-messages-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          // Mark as read if from brand
          if (newMsg.sender_type === "brand") {
            markMessagesAsRead(conversation.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation]);

  const fetchConversation = async () => {
    setIsLoading(true);
    try {
      // Find or create conversation with this brand
      const { data: existingConvo, error: fetchError } = await supabase
        .from("conversations")
        .select("*")
        .eq("brand_id", brand.id)
        .eq("creator_id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingConvo) {
        setConversation(existingConvo);
        await fetchMessages(existingConvo.id);
        await markMessagesAsRead(existingConvo.id);
      } else {
        // No conversation exists yet - that's ok
        setConversation(null);
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    } finally {
      setIsLoading(false);
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

  const markMessagesAsRead = async (conversationId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "brand")
      .eq("is_read", false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      let currentConversation = conversation;

      // Create conversation if it doesn't exist
      if (!currentConversation) {
        const { data: newConvo, error: createError } = await supabase
          .from("conversations")
          .insert({
            brand_id: brand.id,
            creator_id: userId,
          })
          .select()
          .single();

        if (createError) throw createError;
        currentConversation = newConvo;
        setConversation(newConvo);
      }

      // Send message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: currentConversation.id,
        sender_id: userId,
        sender_type: "creator",
        content: newMessage.trim(),
      });

      if (msgError) throw msgError;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", currentConversation.id);

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-foreground tracking-[-0.5px]">
          Messages
        </h1>
        <p className="text-sm text-muted-foreground tracking-[-0.3px]">
          Direct conversation with {brand.name}
        </p>
      </div>

      {/* Chat Card */}
      <Card className="border-0 shadow-sm bg-white dark:bg-card h-[calc(100vh-220px)] md:h-[500px] flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Avatar className="h-10 w-10">
            <AvatarImage src={brand.logo_url || ""} />
            <AvatarFallback
              className="text-white font-medium"
              style={{ backgroundColor: accentColor }}
            >
              {brand.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900 dark:text-foreground tracking-[-0.3px]">
              {brand.name}
            </p>
            <p className="text-xs text-muted-foreground">Brand Team</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <MessageCircle
                  className="h-8 w-8"
                  style={{ color: accentColor }}
                />
              </div>
              <p className="text-muted-foreground text-sm tracking-[-0.3px] text-center">
                No messages yet.
                <br />
                Start a conversation with {brand.name}!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isCreator = message.sender_type === "creator";

                return (
                  <div
                    key={message.id}
                    className={`flex ${isCreator ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isCreator
                          ? "text-white"
                          : "bg-muted text-foreground"
                      }`}
                      style={
                        isCreator
                          ? { backgroundColor: accentColor }
                          : undefined
                      }
                    >
                      <p className="text-sm whitespace-pre-wrap break-words tracking-[-0.3px]">
                        {message.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isCreator ? "text-white/70" : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(message.created_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="h-11 w-11 p-0 flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 tracking-[-0.3px]">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}
