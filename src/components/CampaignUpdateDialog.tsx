import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

interface CampaignUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  currentUpdate?: string | null;
  onUpdateSaved?: () => void;
}

export function CampaignUpdateDialog({
  open,
  onOpenChange,
  campaignId,
  currentUpdate,
  onUpdateSaved
}: CampaignUpdateDialogProps) {
  const [update, setUpdate] = useState(currentUpdate || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUpdate(currentUpdate || "");
    }
  }, [open, currentUpdate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          campaign_update: update.trim() || null,
          campaign_update_at: update.trim() ? new Date().toISOString() : null
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success("Campaign update saved");
      onUpdateSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving campaign update:', error);
      toast.error("Failed to save update");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          campaign_update: null,
          campaign_update_at: null
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success("Campaign update cleared");
      setUpdate("");
      onUpdateSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error clearing campaign update:', error);
      toast.error("Failed to clear update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            <Megaphone className="h-4 w-4" />
            Campaign Update
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
            This message will be displayed to creators on the campaign details popup.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            placeholder="Write an update for creators (e.g., 'Payouts delayed this week' or 'New guidelines added')"
            value={update}
            onChange={(e) => setUpdate(e.target.value)}
            className="min-h-[120px] resize-none"
            style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentUpdate && (
            <Button
              variant="ghost"
              onClick={handleClear}
              disabled={saving}
              className="text-destructive hover:text-destructive"
              style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
            >
              Clear Update
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
            >
              {saving ? "Saving..." : "Save Update"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
