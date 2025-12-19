import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Crown, Check, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { EditBrandDialog } from "@/components/EditBrandDialog";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { TeamMembersTab } from "./TeamMembersTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import slackLogo from "@/assets/slack-logo.png";
import discordLogo from "@/assets/discord-logo.png";
import shortimizeLogo from "@/assets/shortimize-logo.png";
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
  shortimize_api_key: string | null;
  slack_webhook_url: string | null;
  discord_webhook_url: string | null;
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [activeTab, setActiveTab] = useState("general");
  const [editedBrandName, setEditedBrandName] = useState("");
  const [editedSlug, setEditedSlug] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [profile, setProfile] = useState({
    billing_address: "",
    legal_business_name: ""
  });

  // Integration states
  const [shortimizeApiKey, setShortimizeApiKey] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [showShortimizeKey, setShowShortimizeKey] = useState(false);
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
      const {
        data,
        error
      } = await supabase.from("brands").select("*").eq("id", currentBrand.id).single();
      if (error) throw error;
      setBrand(data);
      setEditedBrandName(data?.name || "");
      setEditedSlug(data?.slug || "");
      setSelectedPlan(data?.subscription_plan || "");
      setSelectedStatus(data?.subscription_status || "inactive");
      setShortimizeApiKey(data?.shortimize_api_key || "");
      setSlackWebhookUrl(data?.slack_webhook_url || "");
      setDiscordWebhookUrl(data?.discord_webhook_url || "");
    } catch (error) {
      console.error("Error fetching brand:", error);
    }
  };
  const handleSaveIntegrations = async () => {
    if (!brand?.id) return;
    try {
      setSavingIntegrations(true);
      const {
        error
      } = await supabase.from("brands").update({
        shortimize_api_key: shortimizeApiKey || null,
        slack_webhook_url: slackWebhookUrl || null,
        discord_webhook_url: discordWebhookUrl || null
      }).eq("id", brand.id);
      if (error) throw error;
      toast.success("Integrations saved");
      fetchBrand();
    } catch (error) {
      console.error("Error saving integrations:", error);
      toast.error("Failed to save integrations");
    } finally {
      setSavingIntegrations(false);
    }
  };
  const handleSaveBrand = async () => {
    if (!brand?.id) return;

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(editedSlug)) {
      toast.error("URL can only contain lowercase letters, numbers, and hyphens");
      return;
    }
    try {
      setSavingBrand(true);
      const {
        error
      } = await supabase.from("brands").update({
        name: editedBrandName,
        slug: editedSlug
      }).eq("id", brand.id);
      if (error) throw error;
      toast.success("Brand settings saved");
      fetchBrand();
      refreshBrands();
    } catch (error: any) {
      console.error("Error saving brand:", error);
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast.error("This URL is already taken");
      } else {
        toast.error("Failed to save brand settings");
      }
    } finally {
      setSavingBrand(false);
    }
  };
  const handleUpdatePlan = async () => {
    if (!brand?.id) return;
    try {
      setSavingPlan(true);
      const {
        error
      } = await supabase.from("brands").update({
        subscription_plan: selectedPlan || null,
        subscription_status: selectedStatus
      }).eq("id", brand.id);
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
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brand?.id) return;
    try {
      setUploadingAvatar(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${brand.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true
      });
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const {
        error: updateError
      } = await supabase.from('brands').update({
        logo_url: publicUrl
      }).eq('id', brand.id);
      if (updateError) throw updateError;
      toast.success("Avatar updated successfully");
      fetchBrand();
      refreshBrands();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      const {
        data: profileData,
        error
      } = await supabase.from("profiles").select("*").eq("id", user.id).single();
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        error
      } = await supabase.from("profiles").update({
        billing_address: profile.billing_address,
        legal_business_name: profile.legal_business_name
      } as any).eq("id", user.id);
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
  const Spacer = () => <div className="h-6" />;
  if (loading) {
    return <div className="p-4 space-y-6 max-w-xl mx-auto">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>

        {/* Tabs Navigation Skeleton */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="h-9 w-18 rounded-full" />
        </div>

        {/* Avatar Section Skeleton */}
        <div className="space-y-3 pt-2">
          <Skeleton className="h-4 w-14 rounded-md" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>

        {/* Brand Name Input Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>

        {/* Public URL Input Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded-md" />
          <div className="flex items-center">
            <Skeleton className="h-11 flex-1 rounded-l-lg rounded-r-none" />
            <Skeleton className="h-11 w-24 rounded-r-lg rounded-l-none" />
          </div>
        </div>

        {/* Save Button Skeleton */}
        <Skeleton className="h-11 w-full rounded-lg" />

        {/* Admin Plan Section Skeleton */}
        <div className="space-y-4 p-4 rounded-xl bg-muted/30">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-40 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-10 rounded-md" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-12 rounded-md" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>;
  }
  return <div className="p-4 space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.5px]">Settings</h1>
        <p className="text-sm text-muted-foreground tracking-[-0.5px]">
          Manage your workspace and billing
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-6 border-b border-border">
          {["general", "integrations", "team", "billing"].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-1 py-3 text-sm font-medium tracking-[-0.5px] transition-all border-b-2 -mb-px ${activeTab === tab ? "border-[#1f60dd] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>)}
        </div>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-0">
          {isBrandMode && brand && <>
              {/* Avatar Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium tracking-[-0.5px] text-muted-foreground">
                  Avatar
                </Label>
                <div className="flex items-center gap-4">
                  {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-xl font-semibold">
                      {brand.name?.[0]?.toUpperCase() || "B"}
                    </div>}
                  <label className="px-4 py-2 text-sm font-medium tracking-[-0.5px] rounded-lg bg-muted/50 hover:bg-muted text-foreground transition-colors cursor-pointer">
                    {uploadingAvatar ? "Uploading..." : "Change avatar"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                  Recommended: 800×800px
                </p>
              </div>

              <Spacer />

              {/* Brand Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium tracking-[-0.5px] text-muted-foreground">
                  Brand name
                </Label>
                <Input value={editedBrandName} onChange={e => setEditedBrandName(e.target.value)} className="h-11 bg-muted/30 border-0 tracking-[-0.5px]" />
              </div>

              <Spacer />

              {/* Public URL */}
              <div className="space-y-2">
                <Label className="text-sm font-medium tracking-[-0.5px] text-muted-foreground">
                  Public URL
                </Label>
                <div className="flex items-center">
                  <Input value={editedSlug} onChange={e => setEditedSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="h-11 bg-muted/30 border-0 rounded-r-none tracking-[-0.5px]" />
                  <span className="h-11 px-3 flex items-center text-sm text-muted-foreground bg-muted/30 rounded-r-lg tracking-[-0.5px]">
                    .virality.gg
                  </span>
                </div>
              </div>

              <Spacer />

              {/* Save Button */}
              <Button onClick={handleSaveBrand} disabled={savingBrand || editedBrandName === brand.name && editedSlug === brand.slug} className="w-full h-11 tracking-[-0.5px]">
                {savingBrand ? "Saving..." : "Save Changes"}
              </Button>

              <Spacer />

              {/* Website URL */}
              {brand.home_url && <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium tracking-[-0.5px] text-muted-foreground">
                      Website
                    </Label>
                    <Input value={brand.home_url} readOnly className="h-11 bg-muted/30 border-0 tracking-[-0.5px]" />
                  </div>
                  <Spacer />
                </>}

              {/* Admin: Subscription Plan Management */}
              {isAdmin && <div className="space-y-4 p-4 rounded-xl bg-amber-500/10">
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
                  
                  <Button onClick={handleUpdatePlan} disabled={savingPlan} size="sm" className="w-full">
                    {savingPlan ? "Updating..." : "Update Plan"}
                  </Button>
                </div>}
            </>}
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6 space-y-6">
          {isBrandMode && brand && <>
              {/* Shortimize API Key */}
              <div className="rounded-xl border border-border/50 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <img src={shortimizeLogo} alt="Shortimize" className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <h3 className="font-medium tracking-[-0.5px]">Shortimize</h3>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">Connect to track video analytics</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium tracking-[-0.5px] text-muted-foreground">
                    API Key
                  </Label>
                  <div className="relative">
                    <Input type={showShortimizeKey ? "text" : "password"} value={shortimizeApiKey} onChange={e => setShortimizeApiKey(e.target.value)} className="h-11 bg-muted/30 border-0 tracking-[-0.5px] pr-10" placeholder="Enter your Shortimize API key" />
                    <button type="button" onClick={() => setShowShortimizeKey(!showShortimizeKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showShortimizeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Slack Webhook */}
              <div className="rounded-xl border border-border/50 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <img alt="Slack" className="w-10 h-10 rounded-lg object-contain" src="/lovable-uploads/25b74ff6-cd28-4cbc-aabb-4a5090ade12b.webp" />
                  <div>
                    <h3 className="font-medium tracking-[-0.5px]">Slack</h3>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">Get notified when you receive new applications</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium tracking-[-0.5px] text-muted-foreground">
                    Webhook URL
                  </Label>
                  <Input type="url" value={slackWebhookUrl} onChange={e => setSlackWebhookUrl(e.target.value)} className="h-11 bg-muted/30 border-0 tracking-[-0.5px]" placeholder="https://hooks.slack.com/services/..." />
                </div>
              </div>

              {/* Discord Webhook */}
              <div className="rounded-xl border border-border/50 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <img src={discordLogo} alt="Discord" className="w-10 h-10 rounded-lg object-cover border-black/0" />
                  <div>
                    <h3 className="font-medium tracking-[-0.5px]">Discord</h3>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">Get notified when you receive new applications</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium tracking-[-0.5px] text-muted-foreground">
                    Webhook URL
                  </Label>
                  <Input type="url" value={discordWebhookUrl} onChange={e => setDiscordWebhookUrl(e.target.value)} className="h-11 bg-muted/30 border-0 tracking-[-0.5px]" placeholder="https://discord.com/api/webhooks/..." />
                </div>
              </div>

              {/* Save Button */}
              <Button onClick={handleSaveIntegrations} disabled={savingIntegrations} className="w-full h-11 tracking-[-0.5px]">
                {savingIntegrations ? "Saving..." : "Save Integrations"}
              </Button>
            </>}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-6">
          {isBrandMode && brand && <TeamMembersTab brandId={brand.id} />}
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-6 space-y-0">
          {/* Legal Business Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium tracking-[-0.5px] text-muted-foreground">
              Legal Business Name
            </Label>
            <Input value={profile.legal_business_name} onChange={e => setProfile({
            ...profile,
            legal_business_name: e.target.value
          })} className="h-11 bg-muted/30 border-0 tracking-[-0.5px]" placeholder="Company Name LLC" />
          </div>

          <Spacer />

          {/* Billing Address */}
          <div className="space-y-2">
            <Label className="text-sm font-medium tracking-[-0.5px] text-muted-foreground">
              Billing Address
            </Label>
            <Input value={profile.billing_address} onChange={e => setProfile({
            ...profile,
            billing_address: e.target.value
          })} className="h-11 bg-muted/30 border-0 tracking-[-0.5px]" placeholder="123 Main St, City, State, ZIP" />
          </div>

          <Spacer />

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full h-11 tracking-[-0.5px]">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Create Brand Dialog */}
      <CreateBrandDialog open={showCreateBrandDialog} onOpenChange={setShowCreateBrandDialog} onSuccess={handleBrandCreated} />
    </div>;
}