import { useEffect, useCallback, useRef } from "react";
import { SupportTicket } from "@/types/tickets";

interface UseTicketShortcutsProps {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  onSelectTicket: (ticket: SupportTicket) => void;
  onResolveTicket?: () => void;
  onAssignToMe?: () => void;
  onOpenTemplates?: () => void;
  onToggleUserContext?: () => void;
  onToggleShortcutsHelp?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  replyInputRef?: React.RefObject<HTMLTextAreaElement>;
  enabled?: boolean;
}

export function useTicketShortcuts({
  tickets,
  selectedTicket,
  onSelectTicket,
  onResolveTicket,
  onAssignToMe,
  onOpenTemplates,
  onToggleUserContext,
  onToggleShortcutsHelp,
  searchInputRef,
  replyInputRef,
  enabled = true,
}: UseTicketShortcutsProps) {
  const isInputFocused = useRef(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if we're in an input field (except for specific shortcuts)
      const target = event.target as HTMLElement;
      const isInInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Allow Escape to work anywhere
      if (event.key === "Escape") {
        // Blur any focused input
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      // Skip shortcuts when typing in input fields
      if (isInInput) {
        isInputFocused.current = true;
        return;
      }

      isInputFocused.current = false;

      // Don't handle if modifier keys are pressed (except for ?)
      if (event.key !== "?" && (event.metaKey || event.ctrlKey || event.altKey)) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "j": {
          // Next ticket
          event.preventDefault();
          if (tickets.length === 0) return;

          if (!selectedTicket) {
            onSelectTicket(tickets[0]);
          } else {
            const currentIndex = tickets.findIndex(t => t.id === selectedTicket.id);
            if (currentIndex < tickets.length - 1) {
              onSelectTicket(tickets[currentIndex + 1]);
            }
          }
          break;
        }

        case "k": {
          // Previous ticket
          event.preventDefault();
          if (tickets.length === 0) return;

          if (!selectedTicket) {
            onSelectTicket(tickets[tickets.length - 1]);
          } else {
            const currentIndex = tickets.findIndex(t => t.id === selectedTicket.id);
            if (currentIndex > 0) {
              onSelectTicket(tickets[currentIndex - 1]);
            }
          }
          break;
        }

        case "r": {
          // Focus reply composer
          event.preventDefault();
          if (replyInputRef?.current) {
            replyInputRef.current.focus();
          }
          break;
        }

        case "e": {
          // Resolve ticket
          event.preventDefault();
          if (selectedTicket && onResolveTicket) {
            onResolveTicket();
          }
          break;
        }

        case "a": {
          // Assign to me
          event.preventDefault();
          if (selectedTicket && onAssignToMe) {
            onAssignToMe();
          }
          break;
        }

        case "/": {
          // Focus search
          event.preventDefault();
          if (searchInputRef?.current) {
            searchInputRef.current.focus();
          }
          break;
        }

        case "t": {
          // Open templates
          event.preventDefault();
          if (onOpenTemplates) {
            onOpenTemplates();
          }
          break;
        }

        case "i": {
          // Toggle user context
          event.preventDefault();
          if (onToggleUserContext) {
            onToggleUserContext();
          }
          break;
        }

        case "?": {
          // Show shortcuts help
          event.preventDefault();
          if (onToggleShortcutsHelp) {
            onToggleShortcutsHelp();
          }
          break;
        }
      }
    },
    [
      enabled,
      tickets,
      selectedTicket,
      onSelectTicket,
      onResolveTicket,
      onAssignToMe,
      onOpenTemplates,
      onToggleUserContext,
      onToggleShortcutsHelp,
      searchInputRef,
      replyInputRef,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    isInputFocused: isInputFocused.current,
  };
}
