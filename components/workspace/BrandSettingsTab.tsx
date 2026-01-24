"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload, Eye, EyeOff, Trash2, Plus, X, UserPlus, MoreHorizontal, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface BrandSettingsTabProps {
  workspaceSlug: string;
}

const BRAND_COLORS = ["#8B5CF6", "#3B82F6", "#14B8A6", "#22C55E", "#F97316", "#EF4444", "#EC4899", "#64748B"];

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
];

interface TeamMember {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending";
  avatar_url?: string;
  full_name?: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
}

export function BrandSettingsTab({ workspaceSlug }: BrandSettingsTabProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Brand info state
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [brandColor, setBrandColor] = useState("#8B5CF6");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Social links
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [linkedinHandle, setLinkedinHandle] = useState("");
  const [appStoreUrl, setAppStoreUrl] = useState("");

  // Business info
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCountry, setBillingCountry] = useState("");

  // Integrations state
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [shortimizeApiKey, setShortimizeApiKey] = useState("");
  const [shortimizeCollection, setShortimizeCollection] = useState("");
  const [dubApiKey, setDubApiKey] = useState("");
  const [showShortimizeKey, setShowShortimizeKey] = useState(false);
  const [showDubKey, setShowDubKey] = useState(false);

  // Notifications
  const [notifyNewApplication, setNotifyNewApplication] = useState(true);
  const [notifyNewSubmission, setNotifyNewSubmission] = useState(true);
  const [notifyNewMessage, setNotifyNewMessage] = useState(true);

  // Custom webhooks
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  // Delete workspace state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const userEmail = "user@example.com"; // Would come from auth context

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`waliet_brand_settings_${workspaceSlug}`);
    if (saved) {
      const data = JSON.parse(saved);
      setBrandName(data.brandName || "");
      setBrandSlug(data.brandSlug || workspaceSlug);
      setBrandDescription(data.brandDescription || "");
      setBrandColor(data.brandColor || "#8B5CF6");
      setLogoUrl(data.logoUrl || null);
      setWebsiteUrl(data.websiteUrl || "");
      setInstagramHandle(data.instagramHandle || "");
      setTiktokHandle(data.tiktokHandle || "");
      setLinkedinHandle(data.linkedinHandle || "");
      setAppStoreUrl(data.appStoreUrl || "");
      setLegalBusinessName(data.legalBusinessName || "");
      setVatNumber(data.vatNumber || "");
      setBillingAddress(data.billingAddress || "");
      setBillingCountry(data.billingCountry || "");
      setSlackWebhookUrl(data.slackWebhookUrl || "");
      setDiscordWebhookUrl(data.discordWebhookUrl || "");
      setShortimizeApiKey(data.shortimizeApiKey || "");
      setShortimizeCollection(data.shortimizeCollection || "");
      setDubApiKey(data.dubApiKey || "");
      setNotifyNewApplication(data.notifyNewApplication ?? true);
      setNotifyNewSubmission(data.notifyNewSubmission ?? true);
      setNotifyNewMessage(data.notifyNewMessage ?? true);
      setWebhooks(data.webhooks || []);
      setTeamMembers(data.teamMembers || [{ id: "1", email: userEmail, role: "owner", status: "active", full_name: "You" }]);
    } else {
      setBrandSlug(workspaceSlug);
      setTeamMembers([{ id: "1", email: userEmail, role: "owner", status: "active", full_name: "You" }]);
    }
  }, [workspaceSlug]);

  const saveToLocalStorage = () => {
    localStorage.setItem(`waliet_brand_settings_${workspaceSlug}`, JSON.stringify({
      brandName, brandSlug, brandDescription, brandColor, logoUrl, websiteUrl,
      instagramHandle, tiktokHandle, linkedinHandle, appStoreUrl,
      legalBusinessName, vatNumber, billingAddress, billingCountry,
      slackWebhookUrl, discordWebhookUrl, shortimizeApiKey, shortimizeCollection, dubApiKey,
      notifyNewApplication, notifyNewSubmission, notifyNewMessage,
      webhooks, teamMembers
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate slug format
      const slugRegex = /^[a-z0-9-]+$/;
      if (brandSlug && !slugRegex.test(brandSlug)) {
        toast.error("URL can only contain lowercase letters, numbers, and hyphens");
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      saveToLocalStorage();
      toast.success("Settings saved");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Failed to upload logo");
      setUploadingAvatar(false);
    }
  };

  const handleAddWebhook = () => {
    if (!newWebhookName || !newWebhookUrl) {
      toast.error("Please fill in all fields");
      return;
    }
    const newWebhook: Webhook = {
      id: Date.now().toString(),
      name: newWebhookName,
      url: newWebhookUrl,
      events: ["all"],
      is_active: true,
    };
    setWebhooks([...webhooks, newWebhook]);
    setWebhookDialogOpen(false);
    setNewWebhookName("");
    setNewWebhookUrl("");
    toast.success("Webhook added");
  };

  const handleRemoveWebhook = (id: string) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
    toast.success("Webhook removed");
  };

  const handleInviteMember = () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }
    const newMember: TeamMember = {
      id: Date.now().toString(),
      email: inviteEmail,
      role: inviteRole,
      status: "pending",
    };
    setTeamMembers([...teamMembers, newMember]);
    setInviteDialogOpen(false);
    setInviteEmail("");
    toast.success("Invitation sent");
  };

  const handleRemoveMember = (id: string) => {
    setTeamMembers(teamMembers.filter(m => m.id !== id));
    toast.success("Member removed");
  };

  const handleDeleteWorkspace = async () => {
    if (deleteConfirmEmail !== userEmail) {
      toast.error("Please enter your email correctly to confirm");
      return;
    }
    setDeleting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      localStorage.removeItem(`waliet_brand_settings_${workspaceSlug}`);
      toast.success("Workspace deleted");
      setShowDeleteDialog(false);
      // Would redirect to dashboard
    } catch (error) {
      toast.error("Failed to delete workspace");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full p-1.5 h-full">
      <div className="border border-border rounded-xl bg-card overflow-hidden h-full flex flex-col">
        {/* Sticky Header & Tabs */}
        <div className="sticky top-0 z-10 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.5px]">Settings</h1>
              <p className="text-sm text-muted-foreground tracking-[-0.5px]">
                Manage your workspace and preferences
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-6 tracking-[-0.5px] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-6 border-b border-border px-6">
            {[
              { key: "general", label: "General" },
              { key: "integrations", label: "Integrations" },
              { key: "team", label: "Team" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-1 py-3 text-sm font-medium tracking-[-0.5px] transition-all border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">

          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-8">
              {/* Brand Profile Section */}
              <section className="space-y-5">
                <div className="flex items-center gap-5">
                  {/* Logo */}
                  <div
                    className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity ring-1 ring-border/50"
                    style={{ backgroundColor: logoUrl ? undefined : brandColor }}
                    onClick={() => document.getElementById('brand-logo-upload')?.click()}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt={brandName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-lg font-semibold">
                        {brandName?.slice(0, 2).toUpperCase() || "W"}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    {/* Color Swatches */}
                    <div className="flex items-center gap-1">
                      {BRAND_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-6 h-6 rounded transition-all flex-shrink-0 border-2 ${
                            brandColor === color ? 'border-white/50' : 'border-transparent hover:border-white/20'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setBrandColor(color)}
                        />
                      ))}
                    </div>

                    {/* Upload Button */}
                    <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium tracking-[-0.3px] bg-muted hover:bg-muted/80 text-foreground rounded-lg cursor-pointer transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      {logoUrl ? 'Change logo' : 'Upload logo'}
                      <input id="brand-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                    </label>
                  </div>
                </div>

                {/* Brand Name & URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Brand name</Label>
                    <Input
                      value={brandName}
                      onChange={e => setBrandName(e.target.value)}
                      className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] text-sm"
                      placeholder="Your Brand"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">URL</Label>
                    <div className="flex items-center">
                      <Input
                        value={brandSlug}
                        onChange={e => setBrandSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 rounded-r-none tracking-[-0.3px] text-sm"
                      />
                      <span className="h-10 px-3 flex items-center text-xs text-muted-foreground bg-muted/50 dark:bg-[#0a0a0a] rounded-r-lg tracking-[-0.3px]">
                        .waliet.app
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Description</Label>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{brandDescription.length}/500</span>
                  </div>
                  <Textarea
                    value={brandDescription}
                    onChange={e => setBrandDescription(e.target.value)}
                    className="min-h-[100px] bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] resize-none text-sm"
                    placeholder="Tell others about your workspace..."
                    maxLength={500}
                  />
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Website</Label>
                  <Input
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] text-sm"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </section>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Social Links Section */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium tracking-[-0.3px]">Social Links</h3>
                  <p className="text-xs text-muted-foreground tracking-[-0.3px] mt-0.5">Connect your social profiles</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Instagram */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Instagram</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">@</span>
                      <Input
                        value={instagramHandle}
                        onChange={e => setInstagramHandle(e.target.value.replace(/^@/, '').trim())}
                        className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] pl-7 text-sm"
                        placeholder="username"
                      />
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">TikTok</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">@</span>
                      <Input
                        value={tiktokHandle}
                        onChange={e => setTiktokHandle(e.target.value.replace(/^@/, '').trim())}
                        className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] pl-7 text-sm"
                        placeholder="username"
                      />
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">LinkedIn</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">@</span>
                      <Input
                        value={linkedinHandle}
                        onChange={e => setLinkedinHandle(e.target.value.replace(/^@/, '').trim())}
                        className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] pl-7 text-sm"
                        placeholder="username"
                      />
                    </div>
                  </div>

                  {/* App Store */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">App Store</Label>
                    <Input
                      value={appStoreUrl}
                      onChange={e => setAppStoreUrl(e.target.value)}
                      className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] text-sm"
                      placeholder="https://apps.apple.com/..."
                    />
                  </div>
                </div>
              </section>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Business Information Section */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium tracking-[-0.3px]">Business Information</h3>
                  <p className="text-xs text-muted-foreground tracking-[-0.3px] mt-0.5">For invoicing and tax purposes</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Legal Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Legal business name</Label>
                    <Input
                      value={legalBusinessName}
                      onChange={e => setLegalBusinessName(e.target.value)}
                      className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] text-sm"
                      placeholder="Company Name LLC"
                    />
                  </div>

                  {/* VAT */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">VAT number</Label>
                    <Input
                      value={vatNumber}
                      onChange={e => setVatNumber(e.target.value)}
                      className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] text-sm"
                      placeholder="EU123456789"
                    />
                  </div>

                  {/* Billing Address - Full width */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Billing address</Label>
                    <Input
                      value={billingAddress}
                      onChange={e => setBillingAddress(e.target.value)}
                      className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] text-sm"
                      placeholder="123 Main St, City, State, ZIP"
                    />
                  </div>

                  {/* Country */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Country</Label>
                    <Select value={billingCountry} onValueChange={setBillingCountry}>
                      <SelectTrigger className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] text-sm">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {COUNTRIES.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Danger Zone */}
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium tracking-[-0.3px] text-destructive">Danger Zone</h3>
                  <p className="text-xs text-muted-foreground tracking-[-0.3px] mt-0.5">
                    Permanently delete this workspace and all its data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white tracking-[-0.5px] text-sm"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete workspace
                </Button>
              </section>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === "integrations" && (
            <div className="space-y-8">
              {/* Analytics Integrations Section */}
              <section className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium tracking-[-0.5px]">Analytics</h3>
                  <p className="text-xs text-muted-foreground tracking-[-0.3px] mt-0.5">Connect video and link tracking services</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shortimize */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-gradient-to-br from-purple-500 to-pink-500" />
                      <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Shortimize API Key</Label>
                    </div>
                    <div className="relative">
                      <Input
                        type={showShortimizeKey ? "text" : "password"}
                        value={shortimizeApiKey}
                        onChange={e => setShortimizeApiKey(e.target.value)}
                        className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] pr-10 text-sm"
                        placeholder="Enter API key"
                      />
                      <button
                        type="button"
                        onClick={() => setShowShortimizeKey(!showShortimizeKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showShortimizeKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Shortimize Collection */}
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Default Collection</Label>
                    <Input
                      value={shortimizeCollection}
                      onChange={e => setShortimizeCollection(e.target.value)}
                      className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] text-sm"
                      placeholder="e.g., Campaign Videos"
                    />
                  </div>

                  {/* Dub.co */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-black dark:bg-white" />
                      <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Dub.co API Key</Label>
                    </div>
                    <div className="relative">
                      <Input
                        type={showDubKey ? "text" : "password"}
                        value={dubApiKey}
                        onChange={e => setDubApiKey(e.target.value)}
                        className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] pr-10 text-sm"
                        placeholder="Enter API key"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDubKey(!showDubKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showDubKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground tracking-[-0.3px]">
                      Get key from <a href="https://dub.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dub.co/settings/tokens</a>
                    </p>
                  </div>

                  {/* Slack */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-[#4A154B] flex items-center justify-center text-white text-[10px] font-bold">#</div>
                      <Label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">Slack Webhook</Label>
                    </div>
                    <Input
                      type="url"
                      value={slackWebhookUrl}
                      onChange={e => setSlackWebhookUrl(e.target.value)}
                      className="h-10 bg-muted/50 dark:bg-[#0a0a0a] border-0 tracking-[-0.3px] text-sm"
                      placeholder="https://hooks.slack.com/..."
                    />
                  </div>
                </div>
              </section>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Custom Webhooks Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium tracking-[-0.5px]">Custom Webhooks</h3>
                    <p className="text-xs text-muted-foreground tracking-[-0.3px] mt-0.5">Send events to your own endpoints</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setWebhookDialogOpen(true)}
                    className="h-8 text-xs tracking-[-0.3px]"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Webhook
                  </Button>
                </div>

                {webhooks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/50 px-4 py-6 text-center">
                    <p className="text-xs text-muted-foreground">No custom webhooks configured</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/50 divide-y divide-border/50 overflow-hidden">
                    {webhooks.map(webhook => (
                      <div key={webhook.id} className="flex items-center justify-between px-4 py-3 bg-card/50">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={webhook.is_active}
                            onCheckedChange={(checked) => {
                              setWebhooks(webhooks.map(w => w.id === webhook.id ? { ...w, is_active: checked } : w));
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium tracking-[-0.3px]">{webhook.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">{webhook.url}</p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveWebhook(webhook.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Notifications Section */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium tracking-[-0.5px]">Notifications</h3>
                  <p className="text-xs text-muted-foreground tracking-[-0.3px] mt-0.5">Configure webhook and email alerts</p>
                </div>

                <div className="space-y-1">
                  {/* New application */}
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium tracking-[-0.5px]">New application</p>
                        <p className="text-xs text-muted-foreground tracking-[-0.3px]">When someone applies to your workspace</p>
                      </div>
                    </div>
                    <Switch checked={notifyNewApplication} onCheckedChange={setNotifyNewApplication} />
                  </div>

                  {/* New submission */}
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium tracking-[-0.5px]">New submission</p>
                        <p className="text-xs text-muted-foreground tracking-[-0.3px]">When a submission is made</p>
                      </div>
                    </div>
                    <Switch checked={notifyNewSubmission} onCheckedChange={setNotifyNewSubmission} />
                  </div>

                  {/* New message */}
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium tracking-[-0.5px]">New message</p>
                        <p className="text-xs text-muted-foreground tracking-[-0.3px]">When you receive a new message</p>
                      </div>
                    </div>
                    <Switch checked={notifyNewMessage} onCheckedChange={setNotifyNewMessage} />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "team" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium tracking-[-0.5px]">Team Members</h3>
                  <p className="text-xs text-muted-foreground tracking-[-0.3px] mt-0.5">Manage who has access to this workspace</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setInviteDialogOpen(true)}
                  className="h-8 text-xs tracking-[-0.3px]"
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Invite Member
                </Button>
              </div>

              {/* Members List */}
              <div className="rounded-lg border border-border/50 divide-y divide-border/50 overflow-hidden">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3 bg-card/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="text-xs bg-muted">
                          {member.full_name?.slice(0, 2).toUpperCase() || member.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium tracking-[-0.3px]">{member.full_name || member.email}</p>
                          {member.status === "pending" && (
                            <Badge variant="outline" className="text-[10px] h-5 text-amber-500 bg-amber-500/10">Pending</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground tracking-[-0.3px]">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-5 capitalize">{member.role}</Badge>
                      {member.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRemoveMember(member.id)} className="text-destructive">
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="tracking-[-0.5px]">Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs tracking-[-0.3px]">Email address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-[-0.3px]">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Can manage settings and members</SelectItem>
                  <SelectItem value="member">Member - Can view and contribute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setInviteDialogOpen(false)} className="tracking-[-0.5px]">Cancel</Button>
            <Button onClick={handleInviteMember} className="tracking-[-0.5px]">Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Webhook Dialog */}
      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="tracking-[-0.5px]">Add Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs tracking-[-0.3px]">Name</Label>
              <Input
                value={newWebhookName}
                onChange={e => setNewWebhookName(e.target.value)}
                placeholder="My Webhook"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-[-0.3px]">URL</Label>
              <Input
                type="url"
                value={newWebhookUrl}
                onChange={e => setNewWebhookUrl(e.target.value)}
                placeholder="https://your-endpoint.com/webhook"
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setWebhookDialogOpen(false)} className="tracking-[-0.5px]">Cancel</Button>
            <Button onClick={handleAddWebhook} className="tracking-[-0.5px]">Add Webhook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="tracking-[-0.5px]">Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription className="tracking-[-0.5px]">
              This action cannot be undone. This will permanently delete the workspace
              <span className="font-semibold text-foreground"> {brandName || workspaceSlug}</span> and all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-sm text-muted-foreground tracking-[-0.5px]">
              Type your email <span className="font-medium text-foreground">{userEmail}</span> to confirm
            </Label>
            <Input
              value={deleteConfirmEmail}
              onChange={e => setDeleteConfirmEmail(e.target.value)}
              placeholder="Enter your email"
              className="h-11 tracking-[-0.5px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmEmail("")} className="tracking-[-0.5px] border-0 hover:bg-muted hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteWorkspace}
              disabled={deleting || deleteConfirmEmail !== userEmail}
              className="tracking-[-0.5px]"
            >
              {deleting ? "Deleting..." : "Delete Workspace"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
