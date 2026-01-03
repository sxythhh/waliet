import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Crown,
  Infinity,
  DollarSign,
  Briefcase,
  Zap,
  Users,
} from "lucide-react";

interface CustomPlanManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: {
    id: string;
    name: string;
    logo_url?: string | null;
  } | null;
  onSuccess?: () => void;
}

interface CustomPlan {
  id: string;
  name: string;
  campaigns_limit: number | null;
  boosts_limit: number | null;
  hires_limit: number | null;
  monthly_price: number | null;
  whop_plan_id: string | null;
  whop_product_type: string | null;
  is_active: boolean;
  notes: string | null;
}

export function CustomPlanManager({
  open,
  onOpenChange,
  brand,
  onSuccess,
}: CustomPlanManagerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingPlan, setExistingPlan] = useState<CustomPlan | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [campaignsLimit, setCampaignsLimit] = useState("");
  const [campaignsUnlimited, setCampaignsUnlimited] = useState(false);
  const [boostsLimit, setBoostsLimit] = useState("");
  const [boostsUnlimited, setBoostsUnlimited] = useState(false);
  const [hiresLimit, setHiresLimit] = useState("");
  const [hiresUnlimited, setHiresUnlimited] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [whopPlanId, setWhopPlanId] = useState("");
  const [whopProductType, setWhopProductType] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && brand) {
      fetchExistingPlan();
    }
  }, [open, brand]);

  const fetchExistingPlan = async () => {
    if (!brand) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_brand_plans")
        .select("*")
        .eq("brand_id", brand.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setExistingPlan(data);
        setName(data.name);
        setCampaignsLimit(data.campaigns_limit === -1 ? "" : String(data.campaigns_limit || ""));
        setCampaignsUnlimited(data.campaigns_limit === -1);
        setBoostsLimit(data.boosts_limit === -1 ? "" : String(data.boosts_limit || ""));
        setBoostsUnlimited(data.boosts_limit === -1);
        setHiresLimit(data.hires_limit === -1 ? "" : String(data.hires_limit || ""));
        setHiresUnlimited(data.hires_limit === -1);
        setMonthlyPrice(data.monthly_price ? String(data.monthly_price) : "");
        setWhopPlanId(data.whop_plan_id || "");
        setWhopProductType(data.whop_product_type || "");
        setNotes(data.notes || "");
      } else {
        resetForm();
      }
    } catch (error) {
      console.error("Error fetching custom plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setExistingPlan(null);
    setName("");
    setCampaignsLimit("");
    setCampaignsUnlimited(false);
    setBoostsLimit("");
    setBoostsUnlimited(false);
    setHiresLimit("");
    setHiresUnlimited(false);
    setMonthlyPrice("");
    setWhopPlanId("");
    setWhopProductType("");
    setNotes("");
  };

  const handleSave = async () => {
    if (!brand || !name.trim()) {
      toast.error("Please enter a plan name");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const planData = {
        brand_id: brand.id,
        name: name.trim(),
        campaigns_limit: campaignsUnlimited ? -1 : (campaignsLimit ? parseInt(campaignsLimit) : null),
        boosts_limit: boostsUnlimited ? -1 : (boostsLimit ? parseInt(boostsLimit) : null),
        hires_limit: hiresUnlimited ? -1 : (hiresLimit ? parseInt(hiresLimit) : null),
        monthly_price: monthlyPrice ? parseFloat(monthlyPrice) : null,
        whop_plan_id: whopPlanId.trim() || null,
        whop_product_type: whopProductType || null,
        notes: notes.trim() || null,
        is_active: true,
        created_by: user?.id,
      };

      if (existingPlan) {
        const { error } = await supabase
          .from("custom_brand_plans")
          .update(planData)
          .eq("id", existingPlan.id);

        if (error) throw error;
        toast.success("Custom plan updated");
      } else {
        const { error } = await supabase
          .from("custom_brand_plans")
          .insert(planData);

        if (error) throw error;
        toast.success("Custom plan created");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving custom plan:", error);
      toast.error(error.message || "Failed to save custom plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!existingPlan) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("custom_brand_plans")
        .update({ is_active: false })
        .eq("id", existingPlan.id);

      if (error) throw error;
      toast.success("Custom plan deactivated");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error deactivating plan:", error);
      toast.error(error.message || "Failed to deactivate plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-instrument tracking-tight flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Custom Plan
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            {brand ? (
              <>Configure custom subscription limits for <span className="font-medium">{brand.name}</span></>
            ) : (
              "Configure custom subscription limits for this brand"
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {existingPlan && (
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-inter tracking-[-0.3px]">
                  This brand has an existing custom plan. Changes will update the current plan.
                </p>
              </div>
            )}

            {/* Plan Name */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.3px] text-sm">
                Plan Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g., Enterprise Custom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-inter tracking-[-0.3px]"
              />
            </div>

            {/* Limits Section */}
            <div className="space-y-3">
              <Label className="font-inter tracking-[-0.3px] text-sm text-muted-foreground">
                Limits
              </Label>

              {/* Campaigns */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Briefcase className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-inter tracking-[-0.3px]">Campaigns</span>
                </div>
                <Input
                  type="number"
                  placeholder="Standard"
                  value={campaignsLimit}
                  onChange={(e) => setCampaignsLimit(e.target.value)}
                  disabled={campaignsUnlimited}
                  className="w-24 font-inter tracking-[-0.3px]"
                  min="0"
                />
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="campaigns-unlimited"
                    checked={campaignsUnlimited}
                    onCheckedChange={(checked) => setCampaignsUnlimited(checked as boolean)}
                  />
                  <label htmlFor="campaigns-unlimited" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Infinity className="h-3 w-3" /> Unlimited
                  </label>
                </div>
              </div>

              {/* Boosts */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-inter tracking-[-0.3px]">Boosts</span>
                </div>
                <Input
                  type="number"
                  placeholder="Standard"
                  value={boostsLimit}
                  onChange={(e) => setBoostsLimit(e.target.value)}
                  disabled={boostsUnlimited}
                  className="w-24 font-inter tracking-[-0.3px]"
                  min="0"
                />
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="boosts-unlimited"
                    checked={boostsUnlimited}
                    onCheckedChange={(checked) => setBoostsUnlimited(checked as boolean)}
                  />
                  <label htmlFor="boosts-unlimited" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Infinity className="h-3 w-3" /> Unlimited
                  </label>
                </div>
              </div>

              {/* Hires */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-inter tracking-[-0.3px]">Hires</span>
                </div>
                <Input
                  type="number"
                  placeholder="Standard"
                  value={hiresLimit}
                  onChange={(e) => setHiresLimit(e.target.value)}
                  disabled={hiresUnlimited}
                  className="w-24 font-inter tracking-[-0.3px]"
                  min="0"
                />
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="hires-unlimited"
                    checked={hiresUnlimited}
                    onCheckedChange={(checked) => setHiresUnlimited(checked as boolean)}
                  />
                  <label htmlFor="hires-unlimited" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Infinity className="h-3 w-3" /> Unlimited
                  </label>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="font-inter tracking-[-0.3px] text-sm text-muted-foreground">
                Pricing (for reference)
              </Label>

              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.3px] text-xs">Monthly Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    className="pl-9 font-inter tracking-[-0.3px]"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Whop Integration */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="font-inter tracking-[-0.3px] text-sm text-muted-foreground">
                Whop Integration
              </Label>

              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.3px] text-xs">Whop Plan ID</Label>
                <Input
                  placeholder="plan_xxx"
                  value={whopPlanId}
                  onChange={(e) => setWhopPlanId(e.target.value)}
                  className="font-inter tracking-[-0.3px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.3px] text-xs">Product Type</Label>
                <Select value={whopProductType} onValueChange={setWhopProductType}>
                  <SelectTrigger className="font-inter tracking-[-0.3px]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="font-inter tracking-[-0.3px] text-sm">Admin Notes</Label>
              <Textarea
                placeholder="Internal notes about this custom plan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="font-inter tracking-[-0.3px]"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {existingPlan && (
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={saving}
              className="mr-auto font-inter tracking-[-0.3px]"
            >
              Deactivate
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-inter tracking-[-0.3px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="gap-2 font-inter tracking-[-0.3px]"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {existingPlan ? "Update Plan" : "Create Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
