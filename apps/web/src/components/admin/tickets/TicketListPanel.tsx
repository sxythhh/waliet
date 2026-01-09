import { SupportTicket } from "@/types/tickets";
import { TicketListItem } from "./TicketListItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface TicketListPanelProps {
  tickets: SupportTicket[];
  selectedTicketId: string | null;
  selectedIds: Set<string>;
  onSelectTicket: (ticket: SupportTicket) => void;
  onCheckChange: (ticketId: string, checked: boolean) => void;
  showCheckboxes: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export function TicketListPanel({
  tickets,
  selectedTicketId,
  selectedIds,
  onSelectTicket,
  onCheckChange,
  showCheckboxes,
  loading,
  emptyMessage = "No tickets found",
}: TicketListPanelProps) {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3 p-3">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-4 w-2/3 bg-muted rounded" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-muted rounded" />
                    <div className="h-5 w-16 bg-muted rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border/50">
        {tickets.map((ticket) => (
          <TicketListItem
            key={ticket.id}
            ticket={ticket}
            isSelected={ticket.id === selectedTicketId}
            isChecked={selectedIds.has(ticket.id)}
            onSelect={() => onSelectTicket(ticket)}
            onCheckChange={(checked) => onCheckChange(ticket.id, checked)}
            showCheckbox={showCheckboxes}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
