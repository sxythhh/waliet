import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

interface EditBrandSubscriptionDialogProps {
  brandId: string;
  currentStatus: string | null;
  currentPlan: string | null;
  currentExpiresAt: string | null;
  onSuccess?: () => void;
}

export function EditBrandSubscriptionDialog({
  brandId,
  currentStatus,
  currentPlan,
  currentExpiresAt,
  onSuccess
}: EditBrandSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(currentStatus || "inactive");
  const [plan, setPlan] = useState(currentPlan || "");
  const [expiresAt, setExpiresAt] = useState(currentExpiresAt ? currentExpiresAt.split('T')[0] : "");

  useEffect(() => {
    if (open) {
      setStatus(currentStatus || "inactive");
      setPlan(currentPlan || "");
      setExpiresAt(currentExpiresAt ? currentExpiresAt.split('T')[0] : "");
    }
  }, [open, currentStatus, currentPlan, currentExpiresAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("brands")
        .update({
          subscription_status: status || null,
          subscription_plan: plan || null,
          subscription_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          subscription_started_at: status === "active" && currentStatus !== "active" ? new Date().toISOString() : undefined
        })
        .eq("id", brandId);

      if (error) throw error;

      toast.success("Subscription updated successfully");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Failed to update subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          Edit Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Expires At</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
