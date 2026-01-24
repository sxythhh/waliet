import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KEYBOARD_SHORTCUTS } from "./constants";
import { Keyboard } from "lucide-react";

interface TicketShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketShortcutsHelp({ open, onOpenChange }: TicketShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center gap-3">
              <kbd className="inline-flex items-center justify-center h-7 min-w-[28px] px-2 bg-muted border border-border rounded text-xs font-mono">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Press <kbd className="bg-muted px-1 py-0.5 rounded text-[10px]">Escape</kbd> to close
        </p>
      </DialogContent>
    </Dialog>
  );
}
