import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Trash2 } from "lucide-react";

import {
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity,
  CloseOpportunity,
  CloseOpportunityStatus,
} from "@/hooks/useCloseOpportunities";

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  opportunity: CloseOpportunity | null;
  statuses: CloseOpportunityStatus[];
}

export function OpportunityDialog({
  open,
  onOpenChange,
  brandId,
  opportunity,
  statuses,
}: OpportunityDialogProps) {
  const [statusId, setStatusId] = useState("");
  const [value, setValue] = useState("");
  const [valuePeriod, setValuePeriod] = useState<"one_time" | "monthly" | "annual">("one_time");
  const [confidence, setConfidence] = useState(50);
  const [note, setNote] = useState("");

  const createOpp = useCreateOpportunity();
  const updateOpp = useUpdateOpportunity();
  const deleteOpp = useDeleteOpportunity();

  const isEditing = !!opportunity;
  const isSubmitting = createOpp.isPending || updateOpp.isPending;
  const isDeleting = deleteOpp.isPending;

  // Reset form when dialog opens/closes or opportunity changes
  useEffect(() => {
    if (open && opportunity) {
      setStatusId(opportunity.status_id || "");
      setValue(opportunity.value?.toString() || "");
      setValuePeriod(opportunity.value_period || "one_time");
      setConfidence(opportunity.confidence || 50);
      setNote(opportunity.note || "");
    } else if (open) {
      // Default to first active status for new opportunities
      const activeStatus = statuses.find(s => s.type === "active");
      setStatusId(activeStatus?.id || statuses[0]?.id || "");
      setValue("");
      setValuePeriod("one_time");
      setConfidence(50);
      setNote("");
    }
  }, [open, opportunity, statuses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!statusId) return;

    if (isEditing && opportunity) {
      updateOpp.mutate(
        {
          brandId,
          close_opportunity_id: opportunity.close_opportunity_id,
          status_id: statusId,
          value: value ? parseFloat(value) : undefined,
          value_period: valuePeriod,
          confidence,
          note: note || undefined,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createOpp.mutate(
        {
          brand_id: brandId,
          status_id: statusId,
          value: value ? parseFloat(value) : undefined,
          value_period: valuePeriod,
          confidence,
          note: note || undefined,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!opportunity) return;

    if (confirm("Are you sure you want to delete this opportunity? This cannot be undone.")) {
      deleteOpp.mutate(
        {
          brandId,
          closeOpportunityId: opportunity.close_opportunity_id,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

  const getStatusColor = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId);
    if (!status) return "bg-gray-500";
    switch (status.type) {
      case "won": return "bg-green-500";
      case "lost": return "bg-red-500";
      default: return "bg-blue-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            {isEditing ? "Edit Opportunity" : "New Opportunity"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <Label className="font-inter tracking-[-0.5px]">Status</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="h-10 font-inter tracking-[-0.5px]">
                <SelectValue placeholder="Select status">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(statusId)}`} />
                    {statuses.find(s => s.id === statusId)?.label || "Select status"}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem
                    key={status.id}
                    value={status.id}
                    className="font-inter tracking-[-0.5px]"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          status.type === "won"
                            ? "bg-green-500"
                            : status.type === "lost"
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                      />
                      {status.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label className="font-inter tracking-[-0.5px]">Value</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 h-10 font-inter tracking-[-0.5px]"
                />
              </div>
              <Select value={valuePeriod} onValueChange={(v) => setValuePeriod(v as any)}>
                <SelectTrigger className="w-28 h-10 font-inter tracking-[-0.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time" className="font-inter tracking-[-0.5px]">One-time</SelectItem>
                  <SelectItem value="monthly" className="font-inter tracking-[-0.5px]">Monthly</SelectItem>
                  <SelectItem value="annual" className="font-inter tracking-[-0.5px]">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-inter tracking-[-0.5px]">Confidence</Label>
              <span className="text-sm font-medium font-inter tracking-[-0.5px]">
                {confidence}%
              </span>
            </div>
            <Slider
              value={[confidence]}
              onValueChange={([v]) => setConfidence(v)}
              min={0}
              max={100}
              step={5}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label className="font-inter tracking-[-0.5px]">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this opportunity..."
              rows={3}
              className="font-inter tracking-[-0.5px] resize-none"
            />
          </div>

          {/* Weighted Value Preview */}
          {value && parseFloat(value) > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between text-sm font-inter tracking-[-0.5px]">
                <span className="text-muted-foreground">Weighted Value</span>
                <span className="font-medium">
                  ${((parseFloat(value) || 0) * (confidence / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            {isEditing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !statusId}>
                {isSubmitting
                  ? isEditing
                    ? "Saving..."
                    : "Creating..."
                  : isEditing
                  ? "Save"
                  : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
