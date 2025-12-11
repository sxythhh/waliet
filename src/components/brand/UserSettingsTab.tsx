import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Building2, FileText, Globe, Folder, ExternalLink, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { EditBrandDialog } from "@/components/EditBrandDialog";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";

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
}

export function UserSettingsTab() {
  const navigate = useNavigate();
  const { currentBrand, isBrandMode, refreshBrands } = useWorkspace();
  const { isAdmin } = useAdminCheck();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
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
    } catch (error) {
      console.error("Error fetching brand:", error);
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

  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
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
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.5px]">Settings</h1>
          <p className="text-sm text-muted-foreground tracking-[-0.5px]">
            Manage your workspace and billing
          </p>
        </div>
      </div>

      {/* Brand Settings Section */}
      {isBrandMode && brand && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium tracking-[-0.5px]">Brand</h2>
              <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                Workspace settings
              </p>
            </div>
            <EditBrandDialog
              brand={brand}
              onSuccess={fetchBrand}
              trigger={
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              }
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="w-14 h-14 rounded-xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg font-semibold">
                  {brand.name?.[0]?.toUpperCase() || "B"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium tracking-[-0.5px] truncate">{brand.name}</p>
                <p className="text-sm text-muted-foreground tracking-[-0.5px]">
                  @{brand.slug}
                </p>
              </div>
            </div>

            {(brand.home_url || brand.assets_url) && (
              <div className="grid grid-cols-2 gap-3">
                {brand.home_url && (
                  <a
                    href={brand.home_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm truncate tracking-[-0.5px]">Website</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 ml-auto" />
                  </a>
                )}
                {brand.assets_url && (
                  <a
                    href={brand.assets_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <Folder className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm truncate tracking-[-0.5px]">Assets</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 ml-auto" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New Brand - Admin Only */}
      {isAdmin && (
        <div className="space-y-4">
          <div>
            <h2 className="font-medium tracking-[-0.5px]">Workspaces</h2>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">
              Create and manage brand workspaces
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full h-11 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
            onClick={() => setShowCreateBrandDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Brand Workspace
          </Button>
        </div>
      )}

      {/* Billing Information */}
      <div className="space-y-4">
        <div>
          <h2 className="font-medium tracking-[-0.5px]">Billing Information</h2>
          <p className="text-xs text-muted-foreground tracking-[-0.5px]">
            Your legal and billing details
          </p>
        </div>

        <div className="space-y-4">
          {/* Legal Business Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-2 tracking-[-0.5px]">
              <Building2 className="h-3.5 w-3.5" />
              Legal Business Name
            </Label>
            <Input
              value={profile.legal_business_name}
              onChange={e => setProfile({ ...profile, legal_business_name: e.target.value })}
              className="bg-muted/30 border-0 h-11"
              placeholder="Company Name LLC"
            />
          </div>

          {/* Billing Address */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-2 tracking-[-0.5px]">
              <FileText className="h-3.5 w-3.5" />
              Billing Address
            </Label>
            <Input
              value={profile.billing_address}
              onChange={e => setProfile({ ...profile, billing_address: e.target.value })}
              className="bg-muted/30 border-0 h-11"
              placeholder="123 Main St, City, State, ZIP"
            />
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full h-11">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Create Brand Dialog */}
      <CreateBrandDialog
        open={showCreateBrandDialog}
        onOpenChange={setShowCreateBrandDialog}
        onSuccess={handleBrandCreated}
      />
    </div>
  );
}
