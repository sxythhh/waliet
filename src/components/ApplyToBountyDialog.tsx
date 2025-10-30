import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

interface ApplyToBountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bountyId: string;
  bountyTitle: string;
  onSuccess: () => void;
}

export function ApplyToBountyDialog({ 
  open, 
  onOpenChange, 
  bountyId, 
  bountyTitle, 
  onSuccess 
}: ApplyToBountyDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [applicationText, setApplicationText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoUrl.trim()) {
      toast.error("Please provide a video URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(videoUrl);
    } catch {
      toast.error("Please provide a valid URL");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to apply");
        return;
      }

      // Check if already applied
      const { data: existing } = await supabase
        .from('bounty_applications')
        .select('id')
        .eq('bounty_campaign_id', bountyId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (existing) {
        toast.error("You've already applied to this bounty");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('bounty_applications')
        .insert({
          bounty_campaign_id: bountyId,
          user_id: session.user.id,
          video_url: videoUrl.trim(),
          application_text: applicationText.trim() || null
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setVideoUrl("");
      setApplicationText("");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#202020] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Apply to Bounty</DialogTitle>
          <DialogDescription className="text-white/60">
            Submit your application for: <span className="font-semibold text-white">{bountyTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="video_url" className="text-white flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Application Video URL *
            </Label>
            <Input
              id="video_url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="bg-[#191919] border-white/10 text-white mt-2"
              required
            />
            <p className="text-xs text-white/50 mt-2">
              Provide a link to a video showcasing your content creation skills
            </p>
          </div>

          <div>
            <Label htmlFor="application_text" className="text-white">
              Why are you a good fit? (Optional)
            </Label>
            <Textarea
              id="application_text"
              value={applicationText}
              onChange={(e) => setApplicationText(e.target.value)}
              placeholder="Tell the brand why you'd be perfect for this bounty..."
              className="bg-[#191919] border-white/10 text-white min-h-[120px] mt-2"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}