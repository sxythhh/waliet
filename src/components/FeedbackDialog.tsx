import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "feature" | "bug";
}

export function FeedbackDialog({ open, onOpenChange, type }: FeedbackDialogProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a message.",
      });
      return;
    }

    setLoading(true);
    try {
      // For now, just show a success message - can be extended to save to DB
      toast({
        title: "Thank you!",
        description: type === "feature" 
          ? "Your feature request has been submitted." 
          : "Your bug report has been submitted.",
      });
      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b0b0b] border sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            {type === "feature" ? "Feature Request" : "Report Bug"}
          </DialogTitle>
          <DialogDescription>
            {type === "feature"
              ? "Share your ideas for new features or improvements."
              : "Describe the bug you encountered so we can fix it."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Textarea
            placeholder={type === "feature" 
              ? "Describe your feature request..." 
              : "Describe the bug you encountered..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] bg-muted/20 border-border"
          />

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
