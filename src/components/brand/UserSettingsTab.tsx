import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Crown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { EditBrandDialog } from "@/components/EditBrandDialog";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { TeamMembersTab } from "./TeamMembersTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_type: string | null;
  assets_url: string | null;
  home_url: string | null;
  account_url: string | null;
  show_account_tab: boolean;
  subscription_plan: string | null;
  subscription_status: string | null;
}

export function UserSettingsTab() {
  const navigate = useNavigate();
  const {
    currentBrand,
    isBrandMode,
    refreshBrands
  } = useWorkspace();
  const {
    isAdmin
  } = useAdminCheck();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [activeTab, setActiveTab] = useState("general");
  const [profile, setProfile] = useState({
    billing_address: "",
    legal_business_name: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (isBrandMode && currentBrand?.id) {
      fetchBrand();
    }
  }, [isBrandMode, currentBrand?.id]);

  const fetchBrand = async () => {
    if (!currentBrand?.id) return;
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("id", currentBrand.id)
        .single();
      if (error) throw error;
      setBrand(data);
      setSelectedPlan(data?.subscription_plan || "");
      setSelectedStatus(data?.subscription_status || "inactive");
    } catch (error) {
      console.error("Error fetching brand:", error);
    }
  };

  const handleUpdatePlan = async () => {
    if (!brand?.id) return;
    try {
      setSavingPlan(true);
      const { error } = await supabase
        .from("brands")
        .update({
          subscription_plan: selectedPlan || null,
          subscription_status: selectedStatus
        })
        .eq("id", brand.id);
      
      if (error) throw error;
      toast.success("Subscription plan updated");
      fetchBrand();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update subscription plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      if (profileData) {
        setProfile({
          billing_address: (profileData as any).billing_address || "",
          legal_business_name: (profileData as any).legal_business_name || ""
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          billing_address: profile.billing_address,
          legal_business_name: profile.legal_business_name
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleBrandCreated = () => {
    refreshBrands();
    setShowCreateBrandDialog(false);
  };

  const DottedSeparator = () => (
    <div className="border-t border-dotted border-muted-foreground/30 my-6" />
  );

  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 dark:bg-muted-foreground/20" />
          <Skeleton className="h-4 w-48 dark:bg-muted-foreground/20" />
        </div>
        <div className="space-y-6">
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full dark:bg-muted-foreground/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.5px]">Settings</h1>
        <p className="text-sm text-muted-foreground tracking-[-0.5px]">
          Manage your workspace and billing
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-11 p-1 bg-muted/50 rounded-lg">
          <TabsTrigger 
            value="general" 
            className="flex-1 h-9 text-sm font-medium tracking-[-0.5px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
          >
            General
          </TabsTrigger>
          <TabsTrigger 
            value="team" 
            className="flex-1 h-9 text-sm font-medium tracking-[-0.5px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
          >
            Team
          </TabsTrigger>
          <TabsTrigger 
            value="billing" 
            className="flex-1 h-9 text-sm font-medium tracking-[-0.5px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
          >
            Billing
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-0">
          {isBrandMode && brand && (
            <>
              {/* Avatar Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium tracking-[-0.5px]">
                  Avatar <span className="text-primary">*</span>
                </Label>
                <div className="flex items-start gap-6">
                  {brand.logo_url ? (
                    <img 
                      src={brand.logo_url} 
                      alt={brand.name} 
                      className="w-20 h-20 rounded-2xl object-cover shadow-sm" 
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-semibold shadow-sm">
                      {brand.name?.[0]?.toUpperCase() || "B"}
                    </div>
                  )}
                  <EditBrandDialog 
                    brand={brand} 
                    onSuccess={fetchBrand} 
                    trigger={
                      <Button variant="outline" size="sm" className="h-9 px-4 tracking-[-0.5px]">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    } 
                  />
                </div>
                <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                  Upload images up to 800x800 px. Your avatar shows up in your public profile.
                </p>
              </div>

              <DottedSeparator />

              {/* Brand Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium tracking-[-0.5px]">
                  Brand name <span className="text-primary">*</span>
                </Label>
                <div className="relative">
                  <Input 
                    value={brand.name} 
                    readOnly
                    className="h-11 bg-muted/30 border-muted-foreground/20 tracking-[-0.5px]" 
                  />
                </div>
              </div>

              <DottedSeparator />

              {/* Public URL */}
              <div className="space-y-2">
                <Label className="text-sm font-medium tracking-[-0.5px]">
                  Public URL <span className="text-primary">*</span>
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input 
                      value={brand.slug} 
                      readOnly
                      className="h-11 bg-muted/30 border-muted-foreground/20 pr-10 tracking-[-0.5px]" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground tracking-[-0.5px] whitespace-nowrap">
                    .virality.gg
                  </span>
                </div>
              </div>

              <DottedSeparator />

              {/* Website URL */}
              {brand.home_url && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium tracking-[-0.5px]">
                      Website
                    </Label>
                    <Input 
                      value={brand.home_url} 
                      readOnly
                      className="h-11 bg-muted/30 border-muted-foreground/20 tracking-[-0.5px]" 
                    />
                  </div>
                  <DottedSeparator />
                </>
              )}

              {/* Admin: Subscription Plan Management */}
              {isAdmin && (
                <div className="space-y-4 p-4 rounded-xl bg-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-medium tracking-[-0.5px]">Admin: Subscription Plan</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Plan</Label>
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger className="bg-background h-10">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Status</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="bg-background h-10">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="past_due">Past Due</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleUpdatePlan} 
                    disabled={savingPlan}
                    size="sm"
                    className="w-full"
                  >
                    {savingPlan ? "Updating..." : "Update Plan"}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-6">
          {isBrandMode && brand && (
            <TeamMembersTab brandId={brand.id} />
          )}
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-6 space-y-0">
          {/* Legal Business Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium tracking-[-0.5px]">
              Legal Business Name
            </Label>
            <Input 
              value={profile.legal_business_name} 
              onChange={e => setProfile({
                ...profile,
                legal_business_name: e.target.value
              })}
              className="h-11 bg-muted/30 border-muted-foreground/20 tracking-[-0.5px]" 
              placeholder="Company Name LLC" 
            />
          </div>

          <DottedSeparator />

          {/* Billing Address */}
          <div className="space-y-2">
            <Label className="text-sm font-medium tracking-[-0.5px]">
              Billing Address
            </Label>
            <Input 
              value={profile.billing_address} 
              onChange={e => setProfile({
                ...profile,
                billing_address: e.target.value
              })}
              className="h-11 bg-muted/30 border-muted-foreground/20 tracking-[-0.5px]" 
              placeholder="123 Main St, City, State, ZIP" 
            />
          </div>

          <DottedSeparator />

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full h-11 tracking-[-0.5px]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Create Brand Dialog */}
      <CreateBrandDialog 
        open={showCreateBrandDialog} 
        onOpenChange={setShowCreateBrandDialog} 
        onSuccess={handleBrandCreated} 
      />
    </div>
  );
}
