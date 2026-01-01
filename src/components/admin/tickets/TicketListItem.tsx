import { SupportTicket } from "@/types/tickets";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { statusStyles, priorityStyles } from "./constants";

interface TicketListItemProps {
  ticket: SupportTicket;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onCheckChange: (checked: boolean) => void;
  showCheckbox?: boolean;
}

export function TicketListItem({
  ticket,
  isSelected,
  isChecked,
  onSelect,
  onCheckChange,
  showCheckbox = false,
}: TicketListItemProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative p-3 cursor-pointer transition-all duration-150",
        "border-b border-border/50 hover:bg-muted/50",
        isSelected && "bg-muted/70 border-l-2 border-l-primary"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {showCheckbox && (
          <div
            className="pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={onCheckChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        )}

        {/* Avatar */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={ticket.user?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-muted">
            {ticket.user?.username?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Header: ticket number + username + time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                {ticket.ticket_number}
              </span>
              <span className="text-sm font-medium truncate">
                {ticket.user?.username || "Unknown"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Subject */}
          <p className="text-sm text-foreground line-clamp-1">
            {ticket.subject}
          </p>

          {/* Footer: badges + message count */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", statusStyles[ticket.status])}
              >
                {ticket.status.replace("_", " ")}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", priorityStyles[ticket.priority])}
              >
                {ticket.priority}
              </Badge>
            </div>

            {/* Message count */}
            {ticket.message_count !== undefined && ticket.message_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span>{ticket.message_count}</span>
              </div>
            )}
          </div>

          {/* Assigned to */}
          {ticket.assigned_admin && (
            <p className="text-xs text-muted-foreground">
              → {ticket.assigned_admin.full_name || ticket.assigned_admin.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
