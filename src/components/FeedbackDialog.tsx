import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lightbulb, Bug } from "lucide-react";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "feature" | "bug";
}

export function FeedbackDialog({
  open,
  onOpenChange,
  type
}: FeedbackDialogProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a message."
      });
      return;
    }
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to submit feedback."
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        user_id: user.id,
        type,
        message: message.trim()
      });
      if (error) throw error;
      toast({
        title: "Thank you!",
        description: type === "feature" ? "Your feature request has been submitted." : "Your bug report has been submitted."
      });
      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const isFeature = type === "feature";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background/95 backdrop-blur-xl border-none shadow-2xl sm:max-w-[440px] p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isFeature ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
              {isFeature ? (
                <Lightbulb className="w-5 h-5 text-amber-500" />
              ) : (
                <Bug className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-lg tracking-tight text-foreground">
                {isFeature ? "Feature Request" : "Bug Report"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isFeature ? "Share your ideas with us" : "Help us fix issues"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-5 space-y-5">
          <div className="space-y-2">
            <Textarea
              placeholder={isFeature ? "I'd love to see..." : "I encountered an issue when..."}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="min-h-[140px] bg-transparent border-border/50 rounded-xl resize-none text-sm placeholder:text-muted-foreground/60 focus:border-border focus:ring-0"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !message.trim()}
              className={`flex-1 h-11 rounded-xl font-medium ${isFeature ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-red-500 hover:bg-red-600 text-white'}`}
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
