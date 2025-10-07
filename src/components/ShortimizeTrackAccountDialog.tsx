import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ShortimizeTrackAccountDialogProps {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ShortimizeTrackAccountDialog = ({
  campaignId,
  open,
  onOpenChange,
  onSuccess,
}: ShortimizeTrackAccountDialogProps) => {
  const [accountUrl, setAccountUrl] = useState("");
  const [trackingType, setTrackingType] = useState("latest_30");
  const [isTracking, setIsTracking] = useState(false);

  const handleTrack = async () => {
    if (!accountUrl.trim()) {
      toast.error("Please enter an account URL");
      return;
    }

    setIsTracking(true);
    try {
      const { data, error } = await supabase.functions.invoke('track-shortimize-account', {
        body: {
          accountUrl: accountUrl.trim(),
          campaignId,
          collectionNames: [`campaign_${campaignId}`],
          trackingType,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.alreadyTracked ? "Account already tracked" : "Account tracking started");
        setAccountUrl("");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to track account");
      }
    } catch (error: any) {
      console.error("Error tracking account:", error);
      toast.error(error.message || "Failed to track account");
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track Account in Shortimize</DialogTitle>
          <DialogDescription>
            Enter a social media account URL to start tracking analytics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="accountUrl">Account URL</Label>
            <Input
              id="accountUrl"
              placeholder="https://www.tiktok.com/@username"
              value={accountUrl}
              onChange={(e) => setAccountUrl(e.target.value)}
              disabled={isTracking}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingType">Tracking Type</Label>
            <Select value={trackingType} onValueChange={setTrackingType} disabled={isTracking}>
              <SelectTrigger id="trackingType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest_30">Latest 30 Posts</SelectItem>
                <SelectItem value="latest_200">Latest 200 Posts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isTracking}>
            Cancel
          </Button>
          <Button onClick={handleTrack} disabled={isTracking}>
            {isTracking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Tracking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
