import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditBrandDialog } from "@/components/EditBrandDialog";
import { ManageRoadmapDialog } from "@/components/admin/ManageRoadmapDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarDays, DollarSign, TrendingUp, ExternalLink, Trash2 } from "lucide-react";

type SalesStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  brand_type: string | null;
  home_url: string | null;
  account_url: string | null;
  assets_url: string | null;
  show_account_tab: boolean;
  is_active: boolean;
  created_at: string;
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
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const toggleBrandActive = async () => {
    if (!deal.brands) return;
    try {
      const { error } = await supabase
        .from("brands")
        .update({ is_active: !deal.brands.is_active })
        .eq("id", deal.brands.id);
      
      if (error) throw error;
      toast.success(`Brand ${!deal.brands.is_active ? 'activated' : 'deactivated'}`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating brand status:", error);
      toast.error("Failed to update brand status");
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deal.brands) return;
    try {
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("id", deal.brands.id);
      
      if (error) throw error;
      toast.success("Brand deleted successfully");
      if (onUpdate) onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting brand:", error);
      toast.error("Failed to delete brand");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const getBrandTypeBadgeColor = (type: string | null) => {
    switch (type) {
      case "Standard":
        return "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30";
      case "DWY":
        return "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30";
      default:
        return "";
    }
  };

  if (!deal) return null;

  const currentStage = STAGES.find(s => s.value === deal.stage);

  return (
    <>
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
                  {deal.brands?.brand_type && (
                    <Badge className={getBrandTypeBadgeColor(deal.brands.brand_type)}>
                      {deal.brands.brand_type}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Brand Information Section */}
            <div className="space-y-4 pb-6 border-b">
              <h3 className="font-semibold text-lg">Brand Information</h3>
              
              {deal.brands?.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{deal.brands.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {deal.brands?.slug && (
                  <div>
                    <Label className="text-muted-foreground">Slug</Label>
                    <p className="text-sm mt-1 font-mono">{deal.brands.slug}</p>
                  </div>
                )}
                {deal.brands?.created_at && (
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="text-sm mt-1">
                      {new Date(deal.brands.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </div>

              {(deal.brands?.home_url || deal.brands?.account_url || deal.brands?.assets_url) && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Links</Label>
                  <div className="space-y-1">
                    {deal.brands?.home_url && (
                      <a 
                        href={deal.brands.home_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Home URL
                      </a>
                    )}
                    {deal.brands?.account_url && (
                      <a 
                        href={deal.brands.account_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Account URL
                      </a>
                    )}
                    {deal.brands?.assets_url && (
                      <a 
                        href={deal.brands.assets_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Assets URL
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Brand Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {deal.brands?.brand_type === "DWY" && (
                  <ManageRoadmapDialog brandId={deal.brands.id} brandName={deal.brands.name} />
                )}
                <Button 
                  size="sm" 
                  variant={deal.brands?.is_active ? "outline" : "default"}
                  onClick={toggleBrandActive}
                >
                  {deal.brands?.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                {deal.brands && (
                  <EditBrandDialog brand={deal.brands} onSuccess={onUpdate} />
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => window.open(`/brand/${deal.brands?.slug}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Page
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDeleteClick}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Brand
                </Button>
              </div>
            </div>

            {/* Deal Value & Probability */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Deal Value</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {deal.deal_value ? `$${deal.deal_value.toLocaleString()}` : 'Not set'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Probability</Label>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {deal.probability !== null ? `${deal.probability}%` : 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Expected Close Date</Label>
                {deal.close_date ? (
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
                  {deal.won_date ? (
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
                {deal.next_payment_date ? (
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
                {deal.payment_amount ? (
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
              {deal.notes ? (
                <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
              ) : (
                <span className="text-muted-foreground text-sm">No notes</span>
              )}
            </div>

            {/* Lost Reason */}
            {deal.stage === 'lost' && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Lost Reason</Label>
                {deal.lost_reason ? (
                  <p className="text-sm whitespace-pre-wrap">{deal.lost_reason}</p>
                ) : (
                  <span className="text-muted-foreground text-sm">No reason provided</span>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deal.brands?.name}</strong> and all
              associated campaigns and deals. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}