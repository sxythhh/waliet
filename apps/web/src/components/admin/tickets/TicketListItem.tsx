import { SupportTicket } from "@/types/tickets";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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
  const isOpen = ticket.status === "open" || ticket.status === "in_progress";

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative px-3 py-2.5 cursor-pointer transition-colors",
        "border-b border-border/40",
        isSelected
          ? "bg-muted"
          : "hover:bg-muted/40"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {showCheckbox && (
          <div
            className="pt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={onCheckChange}
            />
          </div>
        )}

        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={ticket.user?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
            {ticket.user?.username?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "text-sm truncate",
                isOpen ? "font-medium text-foreground" : "text-muted-foreground"
              )}>
                {ticket.user?.username || "Unknown"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                {ticket.ticket_number}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Subject */}
          <p className={cn(
            "text-sm line-clamp-1",
            isOpen ? "text-foreground" : "text-muted-foreground"
          )}>
            {ticket.subject}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="capitalize">{ticket.status.replace("_", " ")}</span>
            <span>·</span>
            <span className="capitalize">{ticket.priority}</span>
            {ticket.message_count !== undefined && ticket.message_count > 0 && (
              <>
                <span>·</span>
                <span>{ticket.message_count} messages</span>
              </>
            )}
            {ticket.assigned_admin && (
              <>
                <span>·</span>
                <span>{ticket.assigned_admin.full_name || ticket.assigned_admin.email}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
