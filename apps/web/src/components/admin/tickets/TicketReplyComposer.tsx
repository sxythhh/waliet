import { forwardRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Send, FileText, Lock } from "lucide-react";

interface TicketReplyComposerProps {
  value: string;
  onChange: (value: string) => void;
  isInternal: boolean;
  onInternalChange: (isInternal: boolean) => void;
  onSend: () => void;
  onOpenTemplates: () => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const TicketReplyComposer = forwardRef<HTMLTextAreaElement, TicketReplyComposerProps>(
  function TicketReplyComposer(
    {
      value,
      onChange,
      isInternal,
      onInternalChange,
      onSend,
      onOpenTemplates,
      sending,
      disabled,
      placeholder = "Type your reply...",
    },
    ref
  ) {
    const [focused, setFocused] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (value.trim() && !sending && !disabled) {
          onSend();
        }
      }
    };

    return (
      <div
        className={cn(
          "border-t border-border px-3 py-2 space-y-2 transition-colors shrink-0",
          isInternal && "bg-amber-500/5"
        )}
      >
        {/* Internal Note Banner */}
        {isInternal && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Lock className="h-3 w-3" />
            <span>Internal note - only visible to admins</span>
          </div>
        )}

        {/* Textarea */}
        <div
          className={cn(
            "relative rounded-md border transition-all",
            focused
              ? "border-primary ring-1 ring-primary/20"
              : "border-border",
            isInternal && "border-amber-500/30"
          )}
        >
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={isInternal ? "Add internal note..." : placeholder}
            className="min-h-[60px] max-h-[120px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm py-2"
            disabled={disabled || sending}
          />
        </div>

        {/* Actions - compact single row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Templates Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenTemplates}
              disabled={disabled || sending}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              Templates
            </Button>

            {/* Internal Note Checkbox */}
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="internal"
                checked={isInternal}
                onCheckedChange={(checked) => onInternalChange(checked as boolean)}
                disabled={disabled || sending}
                className={cn(
                  "h-3.5 w-3.5",
                  isInternal && "border-amber-500 data-[state=checked]:bg-amber-500"
                )}
              />
              <Label
                htmlFor="internal"
                className={cn(
                  "text-xs cursor-pointer",
                  isInternal ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                )}
              >
                Internal
              </Label>
            </div>

            {/* Keyboard hint inline */}
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              <kbd className="bg-muted px-1 py-0.5 rounded">⌘↵</kbd> send
            </span>
          </div>

          {/* Send Button */}
          <Button
            size="sm"
            onClick={onSend}
            disabled={!value.trim() || sending || disabled}
            className={cn(
              "h-7 px-3 text-xs",
              isInternal && "bg-amber-500 hover:bg-amber-600"
            )}
          >
            {sending ? (
              <span className="animate-pulse">Sending...</span>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1" />
                {isInternal ? "Note" : "Send"}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }
);
