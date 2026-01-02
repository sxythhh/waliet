import { SupportTicket, TicketStatus, TicketPriority, AdminUser } from "@/types/tickets";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CheckCircle, User, XCircle } from "lucide-react";
import DiscordIcon from "@/assets/discord-icon.png";
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  TICKET_CATEGORIES,
  statusStyles,
  priorityStyles,
  getCategoryName,
} from "./constants";

interface TicketHeaderProps {
  ticket: SupportTicket;
  adminUsers: AdminUser[];
  currentUserId?: string;
  onStatusChange: (status: TicketStatus) => void;
  onPriorityChange: (priority: TicketPriority) => void;
  onAssigneeChange: (assigneeId: string | null) => void;
  onResolve: () => void;
  onClose: () => void;
  updating?: boolean;
}

export function TicketHeader({
  ticket,
  adminUsers,
  currentUserId,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onResolve,
  onClose,
  updating,
}: TicketHeaderProps) {
  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="border-b border-border px-3 py-2 space-y-2 shrink-0">
      {/* Top: Subject + Quick Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono text-muted-foreground">
              {ticket.ticket_number}
            </span>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0", statusStyles[ticket.status])}
            >
              {ticket.status.replace("_", " ")}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {getCategoryName(ticket.category)}
            </Badge>
            {ticket.discord_channel && !ticket.discord_channel.closed_at && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20"
              >
                <img src={DiscordIcon} alt="" className="h-2.5 w-2.5 mr-0.5" />
                Discord
              </Badge>
            )}
          </div>
          <h2 className="text-sm font-semibold tracking-tight line-clamp-1">
            {ticket.subject}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              <span className="text-foreground">{ticket.user?.username || "Unknown"}</span>
            </span>
            <span>•</span>
            <span>{format(new Date(ticket.created_at), "MMM d 'at' h:mm a")}</span>
          </div>
        </div>

        {/* Quick Actions */}
        {!isResolved && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onResolve}
              disabled={updating}
              className="h-7 px-2 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Resolve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={updating}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Bottom: Dropdowns - single compact row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status */}
        <Select
          value={ticket.status}
          onValueChange={(value) => onStatusChange(value as TicketStatus)}
          disabled={updating}
        >
          <SelectTrigger className="h-6 w-[110px] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                <span className={cn("font-medium", statusStyles[status.id])}>
                  {status.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select
          value={ticket.priority}
          onValueChange={(value) => onPriorityChange(value as TicketPriority)}
          disabled={updating}
        >
          <SelectTrigger className="h-6 w-[90px] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((priority) => (
              <SelectItem key={priority.id} value={priority.id}>
                <span className={cn("font-medium", priorityStyles[priority.id])}>
                  {priority.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assigned To */}
        <Select
          value={ticket.assigned_to || "unassigned"}
          onValueChange={(value) => onAssigneeChange(value === "unassigned" ? null : value)}
          disabled={updating}
        >
          <SelectTrigger className="h-6 w-[120px] text-[11px]">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="text-muted-foreground">Unassigned</span>
            </SelectItem>
            {currentUserId && (
              <SelectItem value={currentUserId}>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Me
                </span>
              </SelectItem>
            )}
            {adminUsers
              .filter((a) => a.id !== currentUserId)
              .map((admin) => (
                <SelectItem key={admin.id} value={admin.id}>
                  {admin.full_name || admin.email}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
