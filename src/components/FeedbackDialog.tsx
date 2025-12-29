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
      <DialogContent className="bg-background border border-border sm:max-w-[440px] p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFeature ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
              {isFeature ? (
                <Lightbulb className="w-5 h-5 text-amber-500" />
              ) : (
                <Bug className="w-5 h-5 text-red-500" />
              )}
            </div>
            <h2 className="font-geist font-semibold text-lg tracking-[-0.5px] text-foreground">
              {isFeature ? "Feature Request" : "Bug Report"}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 pt-4 space-y-4">
          <div className="space-y-2">
            <Textarea 
              placeholder={isFeature ? "I'd love to see..." : "I encountered an issue when..."} 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              className="min-h-[140px] bg-muted border-border rounded-xl resize-none font-inter tracking-[-0.5px] text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-0" 
            />
          </div>

          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              disabled={loading} 
              className="flex-1 h-11 rounded-xl font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !message.trim()} 
              className={`flex-1 h-11 rounded-xl font-inter tracking-[-0.5px] ${isFeature ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-red-500 hover:bg-red-600 text-white'}`}
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
