import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CalendarDays, DollarSign, TrendingUp, Edit2, Save, X } from "lucide-react";

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

interface SalesDealSheetProps {
  deal: SalesDeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const STAGES: { value: SalesStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-slate-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { value: 'won', label: 'Won', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export function SalesDealSheet({ deal, open, onOpenChange, onUpdate }: SalesDealSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deal_value: deal?.deal_value?.toString() || '',
    probability: deal?.probability?.toString() || '',
    close_date: deal?.close_date || '',
    won_date: deal?.won_date || '',
    next_payment_date: deal?.next_payment_date || '',
    payment_amount: deal?.payment_amount?.toString() || '',
    notes: deal?.notes || '',
    lost_reason: deal?.lost_reason || '',
  });

  if (!deal) return null;

  const currentStage = STAGES.find(s => s.value === deal.stage);

  const handleEdit = () => {
    setFormData({
      deal_value: deal.deal_value?.toString() || '',
      probability: deal.probability?.toString() || '',
      close_date: deal.close_date || '',
      won_date: deal.won_date || '',
      next_payment_date: deal.next_payment_date || '',
      payment_amount: deal.payment_amount?.toString() || '',
      notes: deal.notes || '',
      lost_reason: deal.lost_reason || '',
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
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
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error('Failed to update deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={deal.brands.logo_url || ''} />
              <AvatarFallback>{deal.brands.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">{deal.brands.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${currentStage?.color}`} />
                <span className="text-sm text-muted-foreground">{currentStage?.label}</span>
              </div>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Deal Value & Probability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Deal Value</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.deal_value}
                  onChange={e => setFormData({ ...formData, deal_value: e.target.value })}
                  placeholder="0.00"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {deal.deal_value ? `$${deal.deal_value.toLocaleString()}` : 'Not set'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Probability</Label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={e => setFormData({ ...formData, probability: e.target.value })}
                  placeholder="50"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {deal.probability !== null ? `${deal.probability}%` : 'Not set'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Expected Close Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.close_date}
                  onChange={e => setFormData({ ...formData, close_date: e.target.value })}
                />
              ) : deal.close_date ? (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(deal.close_date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Not set</span>
              )}
            </div>

            {deal.stage === 'won' && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Won Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.won_date}
                    onChange={e => setFormData({ ...formData, won_date: e.target.value })}
                  />
                ) : deal.won_date ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-500">
                      {new Date(deal.won_date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Not set</span>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-muted-foreground">Next Payment Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.next_payment_date}
                  onChange={e => setFormData({ ...formData, next_payment_date: e.target.value })}
                />
              ) : deal.next_payment_date ? (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(deal.next_payment_date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Not set</span>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Payment Amount</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.payment_amount}
                  onChange={e => setFormData({ ...formData, payment_amount: e.target.value })}
                  placeholder="0.00"
                />
              ) : deal.payment_amount ? (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">${deal.payment_amount.toLocaleString()}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Not set</span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Notes</Label>
            {isEditing ? (
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes about this deal..."
                rows={6}
              />
            ) : deal.notes ? (
              <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
            ) : (
              <span className="text-muted-foreground text-sm">No notes</span>
            )}
          </div>

          {/* Lost Reason */}
          {deal.stage === 'lost' && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Lost Reason</Label>
              {isEditing ? (
                <Textarea
                  value={formData.lost_reason}
                  onChange={e => setFormData({ ...formData, lost_reason: e.target.value })}
                  placeholder="Why was this deal lost?"
                  rows={4}
                />
              ) : deal.lost_reason ? (
                <p className="text-sm whitespace-pre-wrap">{deal.lost_reason}</p>
              ) : (
                <span className="text-muted-foreground text-sm">No reason provided</span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button onClick={handleCancel} variant="outline" disabled={loading}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
