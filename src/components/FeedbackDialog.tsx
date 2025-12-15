import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lightbulb, Bug, Send } from "lucide-react";
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
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
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
      const {
        error
      } = await supabase.from("feedback_submissions").insert({
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
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border-0 sm:max-w-[440px] p-0 overflow-hidden">
        {/* Header */}
        

        {/* Content */}
        <div className="p-5 pt-0 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-500 font-inter tracking-[-0.5px] uppercase">
              {isFeature ? "Your idea" : "Bug description"}
            </label>
            <Textarea placeholder={isFeature ? "I'd love to see..." : "I encountered an issue when..."} value={message} onChange={e => setMessage(e.target.value)} className="min-h-[140px] bg-[#111] border-[#222] rounded-xl resize-none font-inter tracking-[-0.5px] text-sm placeholder:text-neutral-600 focus:border-[#333] focus:ring-0" />
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1 h-11 rounded-xl font-inter tracking-[-0.5px] text-neutral-400 hover:text-white hover:bg-[#1a1a1a]">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !message.trim()} className={`flex-1 h-11 rounded-xl font-inter tracking-[-0.5px] ${isFeature ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}