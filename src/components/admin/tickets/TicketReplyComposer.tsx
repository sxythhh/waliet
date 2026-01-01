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
          "border-t border-border p-4 space-y-3 transition-colors",
          isInternal && "bg-amber-500/5"
        )}
      >
        {/* Internal Note Banner */}
        {isInternal && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Lock className="h-3.5 w-3.5" />
            <span>This note will only be visible to admins</span>
          </div>
        )}

        {/* Textarea */}
        <div
          className={cn(
            "relative rounded-lg border transition-all",
            focused
              ? "border-primary ring-2 ring-primary/20"
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
            className="min-h-[100px] resize-none border-0 focus-visible:ring-0 bg-transparent"
            disabled={disabled || sending}
          />

          {/* Character count */}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {value.length > 0 && `${value.length} chars`}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Templates Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenTemplates}
              disabled={disabled || sending}
              className="text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-4 w-4 mr-1" />
              Templates
              <kbd className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">T</kbd>
            </Button>

            {/* Internal Note Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="internal"
                checked={isInternal}
                onCheckedChange={(checked) => onInternalChange(checked as boolean)}
                disabled={disabled || sending}
                className={cn(
                  isInternal && "border-amber-500 data-[state=checked]:bg-amber-500"
                )}
              />
              <Label
                htmlFor="internal"
                className={cn(
                  "text-sm cursor-pointer",
                  isInternal ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                )}
              >
                Internal note
              </Label>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={onSend}
            disabled={!value.trim() || sending || disabled}
            className={cn(
              "min-w-[100px]",
              isInternal && "bg-amber-500 hover:bg-amber-600"
            )}
          >
            {sending ? (
              <>
                <span className="animate-pulse">Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                {isInternal ? "Add Note" : "Send"}
              </>
            )}
          </Button>
        </div>

        {/* Keyboard shortcut hint */}
        <p className="text-[10px] text-muted-foreground text-center">
          Press <kbd className="bg-muted px-1 py-0.5 rounded text-[10px]">⌘</kbd> +{" "}
          <kbd className="bg-muted px-1 py-0.5 rounded text-[10px]">Enter</kbd> to send
        </p>
      </div>
    );
  }
);
