import { SupportTicket, TicketStatus, TicketPriority, AdminUser } from "@/types/tickets";
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
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
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
    <div className="border-b border-border px-3 py-2.5 space-y-2 shrink-0">
      {/* Top: Subject + Quick Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-0.5">
            <span className="font-mono">{ticket.ticket_number}</span>
            <span>·</span>
            <span className="capitalize">{ticket.status.replace("_", " ")}</span>
            <span>·</span>
            <span>{getCategoryName(ticket.category)}</span>
            {ticket.discord_channel && !ticket.discord_channel.closed_at && (
              <>
                <span>·</span>
                <span>Discord</span>
              </>
            )}
          </div>
          <h2 className="text-sm font-medium tracking-tight line-clamp-1">
            {ticket.subject}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <span>{ticket.user?.username || "Unknown"}</span>
            <span>·</span>
            <span>{format(new Date(ticket.created_at), "MMM d 'at' h:mm a")}</span>
          </div>
        </div>

        {/* Quick Actions */}
        {!isResolved && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onResolve}
              disabled={updating}
              className="h-7 px-2.5 text-xs"
            >
              Resolve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={updating}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              Close
            </Button>
          </div>
        )}
      </div>

      {/* Bottom: Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status */}
        <Select
          value={ticket.status}
          onValueChange={(value) => onStatusChange(value as TicketStatus)}
          disabled={updating}
        >
          <SelectTrigger className="h-6 w-[100px] text-[11px] bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
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
          <SelectTrigger className="h-6 w-[80px] text-[11px] bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((priority) => (
              <SelectItem key={priority.id} value={priority.id}>
                {priority.name}
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
          <SelectTrigger className="h-6 w-[110px] text-[11px] bg-transparent">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="text-muted-foreground">Unassigned</span>
            </SelectItem>
            {currentUserId && (
              <SelectItem value={currentUserId}>Me</SelectItem>
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
