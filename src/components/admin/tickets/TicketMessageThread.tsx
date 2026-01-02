import { useEffect, useRef } from "react";
import { TicketMessage } from "@/types/tickets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
            {i % 2 === 0 && <div className="h-7 w-7 rounded-full bg-muted" />}
            <div className={cn("space-y-1.5", i % 2 === 0 ? "items-start" : "items-end")}>
              <div className="h-3 w-20 bg-muted rounded" />
              <div
                className={cn(
                  "h-16 w-56 bg-muted rounded",
                  i % 2 !== 0 && "ml-auto"
                )}
              />
            </div>
            {i % 2 !== 0 && <div className="h-7 w-7 rounded-full bg-muted" />}
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">No messages yet</p>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-4 max-w-2xl mx-auto">
        {messages.map((message) => {
          const isAdmin = message.sender_type === "admin";
          const isInternal = message.is_internal;

          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-2.5",
                isAdmin ? "justify-end" : "justify-start"
              )}
            >
              {/* Avatar - Left for user */}
              {!isAdmin && (
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
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
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {message.sender?.full_name || message.sender?.username || "Unknown"}
                  </span>
                  {isInternal && (
                    <span className="text-[10px] text-muted-foreground/60">
                      (internal)
                    </span>
                  )}
                  {message.discord_message?.source === "discord" && (
                    <span className="text-[10px] text-muted-foreground/60">
                      via Discord
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/60">
                    {format(new Date(message.created_at), "h:mm a")}
                  </span>
                </div>

                {/* Message bubble */}
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    isInternal
                      ? "bg-muted/50 border border-dashed border-border text-muted-foreground"
                      : isAdmin
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>

              {/* Avatar - Right for admin */}
              {isAdmin && (
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-foreground text-background">
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
