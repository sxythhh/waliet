import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type SalesStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

interface SalesDeal {
  id: string;
  brand_id: string;
  stage: SalesStage;
  deal_value: number | null;
  probability: number | null;
  close_date: string | null;
  next_payment_date: string | null;
  payment_amount: number | null;
  notes: string | null;
  won_date: string | null;
  lost_reason: string | null;
  brands: Brand;
}

interface EditSalesDealDialogProps {
  deal: SalesDeal;
  children?: React.ReactNode;
  onUpdate?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditSalesDealDialog({ 
  deal, 
  children, 
  onUpdate,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: EditSalesDealDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deal_value: deal.deal_value?.toString() || '',
    probability: deal.probability?.toString() || '',
    close_date: deal.close_date || '',
    won_date: deal.won_date || '',
    next_payment_date: deal.next_payment_date || '',
    payment_amount: deal.payment_amount?.toString() || '',
    notes: deal.notes || '',
    lost_reason: deal.lost_reason || '',
  });
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('sales_deals')
        .update({
          deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
          probability: formData.probability ? parseInt(formData.probability) : null,
          close_date: formData.close_date || null,
          won_date: formData.won_date || null,
          next_payment_date: formData.next_payment_date || null,
          payment_amount: formData.payment_amount ? parseFloat(formData.payment_amount) : null,
          notes: formData.notes || null,
          lost_reason: formData.lost_reason || null,
        })
        .eq('id', deal.id);

      if (error) throw error;

      toast.success('Deal updated successfully');
      setOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error('Failed to update deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Deal - {deal.brands.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deal Value ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.deal_value}
                onChange={e => setFormData({ ...formData, deal_value: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Probability (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={e => setFormData({ ...formData, probability: e.target.value })}
                placeholder="50"
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Close Date</Label>
              <Input
                type="date"
                value={formData.close_date}
                onChange={e => setFormData({ ...formData, close_date: e.target.value })}
              />
            </div>

            {deal.stage === 'won' && (
              <div className="space-y-2">
                <Label>Won Date</Label>
                <Input
                  type="date"
                  value={formData.won_date}
                  onChange={e => setFormData({ ...formData, won_date: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Next Payment Date</Label>
              <Input
                type="date"
                value={formData.next_payment_date}
                onChange={e => setFormData({ ...formData, next_payment_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.payment_amount}
                onChange={e => setFormData({ ...formData, payment_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this deal..."
              rows={4}
            />
          </div>

          {deal.stage === 'lost' && (
            <div className="space-y-2">
              <Label>Lost Reason</Label>
              <Textarea
                value={formData.lost_reason}
                onChange={e => setFormData({ ...formData, lost_reason: e.target.value })}
                placeholder="Why was this deal lost?"
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
