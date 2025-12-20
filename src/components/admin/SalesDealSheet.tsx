import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditBrandDialog } from "@/components/EditBrandDialog";
import { ManageRoadmapDialog } from "@/components/admin/ManageRoadmapDialog";
import { EditBrandSubscriptionDialog } from "@/components/admin/EditBrandSubscriptionDialog";
import { AdjustBrandWalletDialog } from "@/components/admin/AdjustBrandWalletDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarDays, ExternalLink, Trash2, Users, CreditCard, Globe, User, Crown, Power, Pencil, Map, Wallet } from "lucide-react";

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
  subscription_status?: string | null;
  subscription_plan?: string | null;
  subscription_expires_at?: string | null;
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

interface BrandOwner {
  user_id: string;
  profile?: {
    username: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
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
  const [brandOwner, setBrandOwner] = useState<BrandOwner | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [campaignCount, setCampaignCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (deal?.brands?.id && open) {
      fetchBrandContext();
    }
  }, [deal?.brands?.id, open]);

  const fetchBrandContext = async () => {
    if (!deal?.brands?.id) return;

    // Fetch owner
    const { data: ownerData } = await supabase
      .from("brand_members")
      .select("user_id")
      .eq("brand_id", deal.brands.id)
      .eq("role", "owner")
      .single();

    if (ownerData) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, full_name, email, avatar_url")
        .eq("id", ownerData.user_id)
        .single();

      setBrandOwner({ user_id: ownerData.user_id, profile: profileData || undefined });
    }

    // Fetch member count
    const { count: members } = await supabase
      .from("brand_members")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", deal.brands.id);
    setMemberCount(members || 0);

    // Fetch campaign count
    const { count: campaigns } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", deal.brands.id);
    setCampaignCount(campaigns || 0);

    // Fetch wallet balance
    const { data: txData } = await supabase
      .from("brand_wallet_transactions")
      .select("type, amount, status")
      .eq("brand_id", deal.brands.id);

    const calculatedBalance = (txData || []).reduce((acc, tx) => {
      if (tx.status !== "completed") return acc;
      const txAmount = Number(tx.amount) || 0;
      if (["deposit", "topup", "refund", "admin_credit"].includes(tx.type)) {
        return acc + txAmount;
      } else {
        return acc - txAmount;
      }
    }, 0);
    setWalletBalance(calculatedBalance);
  };

  const toggleBrandActive = async () => {
    if (!deal?.brands) return;
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

  const handleDeleteClick = () => setDeleteDialogOpen(true);

  const handleDeleteConfirm = async () => {
    if (!deal?.brands) return;
    try {
      const { error } = await supabase.from("brands").delete().eq("id", deal.brands.id);
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

  const getSubscriptionBadge = () => {
    const status = deal?.brands?.subscription_status;
    if (status === 'active') return <Badge className="bg-emerald-500/15 text-emerald-500 border-0">Active</Badge>;
    if (status === 'cancelled') return <Badge className="bg-amber-500/15 text-amber-500 border-0">Cancelled</Badge>;
    return <Badge className="bg-muted text-muted-foreground border-0">No Plan</Badge>;
  };

  const getStageBadge = () => {
    const stage = STAGES.find(s => s.value === deal?.stage);
    if (!stage) return null;
    return (
      <Badge className={`${stage.color} text-white border-0`}>
        {stage.label}
      </Badge>
    );
  };

  if (!deal) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {/* Header with gradient background */}
          <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-8">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16 border-2 border-background shadow-lg">
                <AvatarImage src={deal.brands.logo_url || ''} />
                <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                  {deal.brands.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold font-inter tracking-[-0.5px] truncate">
                  {deal.brands.name}
                </h2>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">
                  /{deal.brands.slug}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {getStageBadge()}
                  {deal.brands?.brand_type && (
                    <Badge variant="outline" className="border-border/50">
                      {deal.brands.brand_type}
                    </Badge>
                  )}
                  {!deal.brands.is_active && (
                    <Badge className="bg-destructive/15 text-destructive border-0">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold">{memberCount}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Globe className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold">{campaignCount}</p>
                <p className="text-xs text-muted-foreground">Campaigns</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <CalendarDays className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold">
                  {new Date(deal.brands.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
            </div>

            {/* Owner Section */}
            {brandOwner?.profile && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Owner</span>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={brandOwner.profile.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {brandOwner.profile.full_name?.[0] || brandOwner.profile.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {brandOwner.profile.full_name || brandOwner.profile.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {brandOwner.profile.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Section */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Subscription</span>
                </div>
                <EditBrandSubscriptionDialog
                  brandId={deal.brands.id}
                  currentStatus={deal.brands.subscription_status || null}
                  currentPlan={deal.brands.subscription_plan || null}
                  currentExpiresAt={deal.brands.subscription_expires_at || null}
                  onSuccess={onUpdate}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {deal.brands.subscription_plan || 'No Plan'}
                  </p>
                  {deal.brands.subscription_expires_at && (
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(deal.brands.subscription_expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {getSubscriptionBadge()}
              </div>
            </div>

            {/* Wallet Section */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">Wallet</span>
                </div>
                <AdjustBrandWalletDialog
                  brandId={deal.brands.id}
                  brandName={deal.brands.name}
                  onSuccess={() => {
                    fetchBrandContext();
                    onUpdate?.();
                  }}
                />
              </div>
              <p className="text-2xl font-semibold">${walletBalance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Available Balance</p>
            </div>

            {/* Description */}
            {deal.brands?.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Description
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {deal.brands.description}
                </p>
              </div>
            )}

            {/* Lost Reason */}
            {deal.stage === 'lost' && deal.lost_reason && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <p className="text-xs font-medium text-destructive uppercase tracking-wider mb-2">
                  Lost Reason
                </p>
                <p className="text-sm">{deal.lost_reason}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {deal.brands?.brand_type === "DWY" && (
                  <ManageRoadmapDialog brandId={deal.brands.id} brandName={deal.brands.name} />
                )}
                {deal.brands && <EditBrandDialog brand={deal.brands} onSuccess={onUpdate} />}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/brand/${deal.brands?.slug}/account`, '_blank')}
                  className="gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Page
                </Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs font-medium text-destructive/70 uppercase tracking-wider mb-3">
                Danger Zone
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleBrandActive}
                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Power className="h-3.5 w-3.5 mr-1.5" />
                  {deal.brands?.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeleteClick}
                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
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
              Delete Brand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}