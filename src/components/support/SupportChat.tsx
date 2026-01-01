import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, TicketCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import supportAvatar from "@/assets/support-avatar.png";

interface Message {
  role: "user" | "assistant";
  content: string;
  ticketCreated?: {
    ticketNumber: string;
    ticketId: string;
  };
}

interface TicketResponse {
  type: "ticket_created";
  ticket_number: string;
  ticket_id: string;
  message: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

export const SupportChat = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there! I'm the Virality AI assistant. I'll do my best to help you out, and if I can't solve the issue, I'll create a support ticket for you. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Please sign in to use the support chat");
      }

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const contentType = response.headers.get("content-type");
      
      // Check if this is a JSON response (ticket created)
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        
        if (data.type === "ticket_created") {
          const ticketData = data as TicketResponse;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: ticketData.message,
              ticketCreated: {
                ticketNumber: ticketData.ticket_number,
                ticketId: ticketData.ticket_id,
              },
            },
          ]);
          
          toast({
            title: "Support Ticket Created",
            description: `Ticket ${ticketData.ticket_number} has been created. Our team will respond soon.`,
          });
          return;
        }
        
        // Handle error responses
        if (data.error) {
          throw new Error(data.error);
        }
      }

      // Handle streaming response
      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > 1) {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleViewTicket = (ticketId: string) => {
    navigate(`/support/tickets/${ticketId}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-sm flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-[200px]">
        {messages.map((message, index) => (
          <div key={index} className="flex gap-3">
            {message.role === "assistant" && (
              <img 
                src={supportAvatar} 
                alt="Virality AI" 
                className="flex-shrink-0 w-8 h-8 rounded-full object-cover"
              />
            )}
            <div
              className={`flex-1 ${
                message.role === "user" ? "ml-11" : ""
              }`}
            >
              <div
                className={`rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-muted text-foreground ml-auto max-w-[85%]"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.ticketCreated && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => handleViewTicket(message.ticketCreated!.ticketId)}
                  >
                    <TicketCheck className="h-4 w-4" />
                    View Ticket {message.ticketCreated.ticketNumber}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <img 
              src={supportAvatar} 
              alt="Virality AI" 
              className="flex-shrink-0 w-8 h-8 rounded-full object-cover"
            />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="How can I set up my bank account for payouts?"
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
