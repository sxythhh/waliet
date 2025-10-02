import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface JoinPrivateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinPrivateCampaignDialog({
  open,
  onOpenChange,
}: JoinPrivateCampaignDialogProps) {
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessCode.trim()) {
      toast.error("Please enter an access code");
      return;
    }

    setLoading(true);

    try {
      // Look up campaign by access code
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .select("id, title, is_private, preview_url")
        .eq("access_code", accessCode.trim())
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;

      if (!campaign) {
        toast.error("Invalid access code or campaign not found");
        return;
      }

      // Check if user already joined
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: existingSubmission } = await supabase
          .from("campaign_submissions")
          .select("id, status")
          .eq("campaign_id", campaign.id)
          .eq("creator_id", user.id)
          .maybeSingle();

        if (existingSubmission) {
          if (existingSubmission.status === "approved") {
            toast.error("You've already joined this campaign");
            navigate(`/campaign/${campaign.id}`);
            onOpenChange(false);
            return;
          } else {
            toast.error("You already have a pending application for this campaign");
            onOpenChange(false);
            return;
          }
        }
      }

      // Navigate to the appropriate page
      if (campaign.preview_url) {
        navigate(`/campaign/preview/${campaign.id}`);
      } else {
        navigate(`/campaign/join/${campaign.id}`);
      }

      toast.success(`Access granted to ${campaign.title}`);
      onOpenChange(false);
      setAccessCode("");
    } catch (error) {
      console.error("Error validating access code:", error);
      toast.error("Failed to validate access code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Join Private Campaign
          </DialogTitle>
          <DialogDescription>
            Enter the invite access code provided by the brand to join their private campaign.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-code">Access Code</Label>
            <Input
              id="access-code"
              placeholder="Enter access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              autoComplete="off"
              className="uppercase font-mono tracking-wider"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setAccessCode("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Validating..." : "Join Campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
