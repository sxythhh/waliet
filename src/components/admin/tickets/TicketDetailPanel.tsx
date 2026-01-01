import { forwardRef } from "react";
import { SupportTicket, TicketMessage, TicketStatus, TicketPriority, AdminUser } from "@/types/tickets";
import { TicketHeader } from "./TicketHeader";
import { TicketMessageThread } from "./TicketMessageThread";
import { TicketReplyComposer } from "./TicketReplyComposer";
import { MessageSquare } from "lucide-react";

interface TicketDetailPanelProps {
  ticket: SupportTicket | null;
  messages: TicketMessage[];
  adminUsers: AdminUser[];
  currentUserId?: string;
  replyText: string;
  onReplyChange: (text: string) => void;
  isInternal: boolean;
  onInternalChange: (isInternal: boolean) => void;
  onSendReply: () => void;
  onOpenTemplates: () => void;
  onStatusChange: (status: TicketStatus) => void;
  onPriorityChange: (priority: TicketPriority) => void;
  onAssigneeChange: (assigneeId: string | null) => void;
  onResolve: () => void;
  onClose: () => void;
  loadingMessages?: boolean;
  sendingReply?: boolean;
  updatingTicket?: boolean;
}

export const TicketDetailPanel = forwardRef<HTMLTextAreaElement, TicketDetailPanelProps>(
  function TicketDetailPanel(
    {
      ticket,
      messages,
      adminUsers,
      currentUserId,
      replyText,
      onReplyChange,
      isInternal,
      onInternalChange,
      onSendReply,
      onOpenTemplates,
      onStatusChange,
      onPriorityChange,
      onAssigneeChange,
      onResolve,
      onClose,
      loadingMessages,
      sendingReply,
      updatingTicket,
    },
    ref
  ) {
    if (!ticket) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Select a ticket</h3>
          <p className="text-sm text-muted-foreground max-w-[300px]">
            Choose a ticket from the list to view details, messages, and take action.
          </p>
          <div className="mt-6 text-xs text-muted-foreground">
            <p>Keyboard shortcuts:</p>
            <p className="mt-1">
              <kbd className="bg-muted px-1.5 py-0.5 rounded">j</kbd> / <kbd className="bg-muted px-1.5 py-0.5 rounded">k</kbd> to navigate
            </p>
            <p className="mt-1">
              <kbd className="bg-muted px-1.5 py-0.5 rounded">?</kbd> for all shortcuts
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <TicketHeader
          ticket={ticket}
          adminUsers={adminUsers}
          currentUserId={currentUserId}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onAssigneeChange={onAssigneeChange}
          onResolve={onResolve}
          onClose={onClose}
          updating={updatingTicket}
        />

        {/* Messages */}
        <TicketMessageThread
          messages={messages}
          loading={loadingMessages}
        />

        {/* Reply Composer */}
        <TicketReplyComposer
          ref={ref}
          value={replyText}
          onChange={onReplyChange}
          isInternal={isInternal}
          onInternalChange={onInternalChange}
          onSend={onSendReply}
          onOpenTemplates={onOpenTemplates}
          sending={sendingReply}
          disabled={ticket.status === "closed"}
        />
      </div>
    );
  }
);
