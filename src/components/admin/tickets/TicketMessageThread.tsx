import { useEffect, useRef } from "react";
import { TicketMessage } from "@/types/tickets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Lock, MessageSquare } from "lucide-react";
import DiscordIcon from "@/assets/discord-icon.png";

interface TicketMessageThreadProps {
  messages: TicketMessage[];
  loading?: boolean;
}

export function TicketMessageThread({
  messages,
  loading,
}: TicketMessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3 animate-pulse",
              i % 2 === 0 ? "justify-start" : "justify-end"
            )}
          >
            {i % 2 === 0 && <div className="h-8 w-8 rounded-full bg-muted" />}
            <div className={cn("space-y-2", i % 2 === 0 ? "items-start" : "items-end")}>
              <div className="h-4 w-24 bg-muted rounded" />
              <div
                className={cn(
                  "h-20 w-64 bg-muted rounded-lg",
                  i % 2 !== 0 && "ml-auto"
                )}
              />
            </div>
            {i % 2 !== 0 && <div className="h-8 w-8 rounded-full bg-muted" />}
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">No messages yet</p>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-4 max-w-3xl mx-auto">
        {messages.map((message) => {
          const isAdmin = message.sender_type === "admin";
          const isInternal = message.is_internal;

          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                isAdmin ? "justify-end" : "justify-start"
              )}
            >
              {/* Avatar - Left for user */}
              {!isAdmin && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {message.sender?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Message Content */}
              <div
                className={cn(
                  "flex flex-col max-w-[70%]",
                  isAdmin ? "items-end" : "items-start"
                )}
              >
                {/* Sender info */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">
                    {message.sender?.full_name || message.sender?.username || "Unknown"}
                  </span>
                  {isInternal && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-500 border-amber-500/20"
                    >
                      <Lock className="h-2.5 w-2.5 mr-0.5" />
                      Internal
                    </Badge>
                  )}
                  {message.discord_message?.source === "discord" && (
                    <img
                      src={DiscordIcon}
                      alt="From Discord"
                      title="Sent via Discord"
                      className="h-3 w-3 opacity-60"
                    />
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(message.created_at), "MMM d, h:mm a")}
                  </span>
                </div>

                {/* Message bubble */}
                <div
                  className={cn(
                    "rounded-lg px-4 py-2.5 text-sm",
                    isInternal
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-100"
                      : isAdmin
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </div>

              {/* Avatar - Right for admin */}
              {isAdmin && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {message.sender?.username?.charAt(0).toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
