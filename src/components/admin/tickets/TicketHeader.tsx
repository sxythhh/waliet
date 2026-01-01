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
    <div className="border-b border-border p-4 space-y-4">
      {/* Top: Subject + Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              {ticket.ticket_number}
            </span>
            <Badge
              variant="outline"
              className={cn("text-xs", statusStyles[ticket.status])}
            >
              {ticket.status.replace("_", " ")}
            </Badge>
          </div>
          <h2 className="text-lg font-semibold tracking-tight line-clamp-2">
            {ticket.subject}
          </h2>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span>
              by <span className="text-foreground">{ticket.user?.username || "Unknown"}</span>
            </span>
            <span>•</span>
            <span>{format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            <span>•</span>
            <Badge variant="secondary" className="text-xs">
              {getCategoryName(ticket.category)}
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isResolved && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onResolve}
                disabled={updating}
                className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={updating}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Close
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bottom: Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Select
            value={ticket.status}
            onValueChange={(value) => onStatusChange(value as TicketStatus)}
            disabled={updating}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
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
        </div>

        {/* Priority */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Priority:</span>
          <Select
            value={ticket.priority}
            onValueChange={(value) => onPriorityChange(value as TicketPriority)}
            disabled={updating}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
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
        </div>

        {/* Assigned To */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Assigned:</span>
          <Select
            value={ticket.assigned_to || "unassigned"}
            onValueChange={(value) => onAssigneeChange(value === "unassigned" ? null : value)}
            disabled={updating}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
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
                    Assign to me
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
    </div>
  );
}
