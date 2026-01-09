import { TicketStatus, TicketPriority, AdminUser } from "@/types/tickets";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, CheckCircle, XCircle, UserPlus, AlertTriangle, Trash2 } from "lucide-react";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "./constants";

interface TicketActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusChange: (status: TicketStatus) => void;
  onBulkPriorityChange: (priority: TicketPriority) => void;
  onBulkAssign: (adminId: string) => void;
  onBulkResolve: () => void;
  onBulkClose: () => void;
  adminUsers: AdminUser[];
  processing?: boolean;
}

export function TicketActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkAssign,
  onBulkResolve,
  onBulkClose,
  adminUsers,
  processing,
}: TicketActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background border border-border shadow-lg rounded-lg px-4 py-3 flex items-center gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClearSelection}
            disabled={processing}
          >
            <X className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {selectedCount} ticket{selectedCount > 1 ? "s" : ""} selected
          </span>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          {/* Change Status */}
          <Select
            onValueChange={(value) => onBulkStatusChange(value as TicketStatus)}
            disabled={processing}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Set Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Change Priority */}
          <Select
            onValueChange={(value) => onBulkPriorityChange(value as TicketPriority)}
            disabled={processing}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((priority) => (
                <SelectItem key={priority.id} value={priority.id}>
                  {priority.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assign To */}
          <Select onValueChange={onBulkAssign} disabled={processing}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <UserPlus className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Assign To" />
            </SelectTrigger>
            <SelectContent>
              {adminUsers.map((admin) => (
                <SelectItem key={admin.id} value={admin.id}>
                  {admin.full_name || admin.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-border" />

          {/* Quick Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkResolve}
            disabled={processing}
            className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Resolve
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onBulkClose}
            disabled={processing}
            className="text-muted-foreground hover:text-foreground"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
