import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload, Check, Eye, EyeOff, Trash2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import framePersonIcon from "@/assets/frame-person-notification-icon.svg";
import stackedInboxIcon from "@/assets/stacked-inbox-icon.svg";
import mailNotificationIcon from "@/assets/mail-notification-icon.svg";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { EditBrandDialog } from "@/components/EditBrandDialog";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { TeamMembersTab } from "./TeamMembersTab";
import { BrandWalletTab } from "./BrandWalletTab";
import { LowBalanceSettingsTab, LowBalanceSettingsHandle } from "./LowBalanceSettingsTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import slackLogo from "@/assets/slack-logo.png";
import discordLogo from "@/assets/discord-logo.png";
import shortimizeLogo from "@/assets/shortimize-logo.png";
import dubLogo from "@/assets/dub-logo.png";
import { SubscriptionCheckoutDialog } from "./SubscriptionCheckoutDialog";
import { CustomWebhooksTab } from "./CustomWebhooksTab";
import { BillingUsageCard } from "./BillingUsageCard";
import { SubscriptionGateDialog } from "./SubscriptionGateDialog";
import { DataExportDialog, AccountDeletionDialog } from "@/components/dashboard/settings";

// Plan ID to display name mapping
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  'plan_DU4ba3ik2UHVZ': 'Starter',
  'plan_JSWLvDSLsSde4': 'Growth',
  'starter': 'Starter',
  'growth': 'Growth',
  'pro': 'Pro',
  'enterprise': 'Enterprise',
  'free': 'Free'
};
const PLAN_PRICES: Record<string, number> = {
  'plan_DU4ba3ik2UHVZ': 99,
  'plan_JSWLvDSLsSde4': 249,
  'starter': 99,
  'growth': 249
};
const BRAND_COLORS = ["#8B5CF6", "#3B82F6", "#0EA5E9", "#14B8A6", "#22C55E", "#EAB308", "#F97316", "#EF4444", "#EC4899", "#A855F7", "#D946EF", "#F43F5E", "#64748B", "#1E293B"];
const COUNTRIES = [{
  code: "AF",
  name: "Afghanistan"
}, {
  code: "AL",
  name: "Albania"
}, {
  code: "DZ",
  name: "Algeria"
}, {
  code: "AD",
  name: "Andorra"
}, {
  code: "AO",
  name: "Angola"
}, {
  code: "AG",
  name: "Antigua and Barbuda"
}, {
  code: "AR",
  name: "Argentina"
}, {
  code: "AM",
  name: "Armenia"
}, {
  code: "AU",
  name: "Australia"
}, {
  code: "AT",
  name: "Austria"
}, {
  code: "AZ",
  name: "Azerbaijan"
}, {
  code: "BS",
  name: "Bahamas"
}, {
  code: "BH",
  name: "Bahrain"
}, {
  code: "BD",
  name: "Bangladesh"
}, {
  code: "BB",
  name: "Barbados"
}, {
  code: "BY",
  name: "Belarus"
}, {
  code: "BE",
  name: "Belgium"
}, {
  code: "BZ",
  name: "Belize"
}, {
  code: "BJ",
  name: "Benin"
}, {
  code: "BT",
  name: "Bhutan"
}, {
  code: "BO",
  name: "Bolivia"
}, {
  code: "BA",
  name: "Bosnia and Herzegovina"
}, {
  code: "BW",
  name: "Botswana"
}, {
  code: "BR",
  name: "Brazil"
}, {
  code: "BN",
  name: "Brunei"
}, {
  code: "BG",
  name: "Bulgaria"
}, {
  code: "BF",
  name: "Burkina Faso"
}, {
  code: "BI",
  name: "Burundi"
}, {
  code: "CV",
  name: "Cabo Verde"
}, {
  code: "KH",
  name: "Cambodia"
}, {
  code: "CM",
  name: "Cameroon"
}, {
  code: "CA",
  name: "Canada"
}, {
  code: "CF",
  name: "Central African Republic"
}, {
  code: "TD",
  name: "Chad"
}, {
  code: "CL",
  name: "Chile"
}, {
  code: "CN",
  name: "China"
}, {
  code: "CO",
  name: "Colombia"
}, {
  code: "KM",
  name: "Comoros"
}, {
  code: "CG",
  name: "Congo"
}, {
  code: "CR",
  name: "Costa Rica"
}, {
  code: "HR",
  name: "Croatia"
}, {
  code: "CU",
  name: "Cuba"
}, {
  code: "CY",
  name: "Cyprus"
}, {
  code: "CZ",
  name: "Czech Republic"
}, {
  code: "DK",
  name: "Denmark"
}, {
  code: "DJ",
  name: "Djibouti"
}, {
  code: "DM",
  name: "Dominica"
}, {
  code: "DO",
  name: "Dominican Republic"
}, {
  code: "EC",
  name: "Ecuador"
}, {
  code: "EG",
  name: "Egypt"
}, {
  code: "SV",
  name: "El Salvador"
}, {
  code: "GQ",
  name: "Equatorial Guinea"
}, {
  code: "ER",
  name: "Eritrea"
}, {
  code: "EE",
  name: "Estonia"
}, {
  code: "SZ",
  name: "Eswatini"
}, {
  code: "ET",
  name: "Ethiopia"
}, {
  code: "FJ",
  name: "Fiji"
}, {
  code: "FI",
  name: "Finland"
}, {
  code: "FR",
  name: "France"
}, {
  code: "GA",
  name: "Gabon"
}, {
  code: "GM",
  name: "Gambia"
}, {
  code: "GE",
  name: "Georgia"
}, {
  code: "DE",
  name: "Germany"
}, {
  code: "GH",
  name: "Ghana"
}, {
  code: "GR",
  name: "Greece"
}, {
  code: "GD",
  name: "Grenada"
}, {
  code: "GT",
  name: "Guatemala"
}, {
  code: "GN",
  name: "Guinea"
}, {
  code: "GW",
  name: "Guinea-Bissau"
}, {
  code: "GY",
  name: "Guyana"
}, {
  code: "HT",
  name: "Haiti"
}, {
  code: "HN",
  name: "Honduras"
}, {
  code: "HU",
  name: "Hungary"
}, {
  code: "IS",
  name: "Iceland"
}, {
  code: "IN",
  name: "India"
}, {
  code: "ID",
  name: "Indonesia"
}, {
  code: "IR",
  name: "Iran"
}, {
  code: "IQ",
  name: "Iraq"
}, {
  code: "IE",
  name: "Ireland"
}, {
  code: "IL",
  name: "Israel"
}, {
  code: "IT",
  name: "Italy"
}, {
  code: "JM",
  name: "Jamaica"
}, {
  code: "JP",
  name: "Japan"
}, {
  code: "JO",
  name: "Jordan"
}, {
  code: "KZ",
  name: "Kazakhstan"
}, {
  code: "KE",
  name: "Kenya"
}, {
  code: "KI",
  name: "Kiribati"
}, {
  code: "KP",
  name: "North Korea"
}, {
  code: "KR",
  name: "South Korea"
}, {
  code: "KW",
  name: "Kuwait"
}, {
  code: "KG",
  name: "Kyrgyzstan"
}, {
  code: "LA",
  name: "Laos"
}, {
  code: "LV",
  name: "Latvia"
}, {
  code: "LB",
  name: "Lebanon"
}, {
  code: "LS",
  name: "Lesotho"
}, {
  code: "LR",
  name: "Liberia"
}, {
  code: "LY",
  name: "Libya"
}, {
  code: "LI",
  name: "Liechtenstein"
}, {
  code: "LT",
  name: "Lithuania"
}, {
  code: "LU",
  name: "Luxembourg"
}, {
  code: "MG",
  name: "Madagascar"
}, {
  code: "MW",
  name: "Malawi"
}, {
  code: "MY",
  name: "Malaysia"
}, {
  code: "MV",
  name: "Maldives"
}, {
  code: "ML",
  name: "Mali"
}, {
  code: "MT",
  name: "Malta"
}, {
  code: "MH",
  name: "Marshall Islands"
}, {
  code: "MR",
  name: "Mauritania"
}, {
  code: "MU",
  name: "Mauritius"
}, {
  code: "MX",
  name: "Mexico"
}, {
  code: "FM",
  name: "Micronesia"
}, {
  code: "MD",
  name: "Moldova"
}, {
  code: "MC",
  name: "Monaco"
}, {
  code: "MN",
  name: "Mongolia"
}, {
  code: "ME",
  name: "Montenegro"
}, {
  code: "MA",
  name: "Morocco"
}, {
  code: "MZ",
  name: "Mozambique"
}, {
  code: "MM",
  name: "Myanmar"
}, {
  code: "NA",
  name: "Namibia"
}, {
  code: "NR",
  name: "Nauru"
}, {
  code: "NP",
  name: "Nepal"
}, {
  code: "NL",
  name: "Netherlands"
}, {
  code: "NZ",
  name: "New Zealand"
}, {
  code: "NI",
  name: "Nicaragua"
}, {
  code: "NE",
  name: "Niger"
}, {
  code: "NG",
  name: "Nigeria"
}, {
  code: "MK",
  name: "North Macedonia"
}, {
  code: "NO",
  name: "Norway"
}, {
  code: "OM",
  name: "Oman"
}, {
  code: "PK",
  name: "Pakistan"
}, {
  code: "PW",
  name: "Palau"
}, {
  code: "PS",
  name: "Palestine"
}, {
  code: "PA",
  name: "Panama"
}, {
  code: "PG",
  name: "Papua New Guinea"
}, {
  code: "PY",
  name: "Paraguay"
}, {
  code: "PE",
  name: "Peru"
}, {
  code: "PH",
  name: "Philippines"
}, {
  code: "PL",
  name: "Poland"
}, {
  code: "PT",
  name: "Portugal"
}, {
  code: "QA",
  name: "Qatar"
}, {
  code: "RO",
  name: "Romania"
}, {
  code: "RU",
  name: "Russia"
}, {
  code: "RW",
  name: "Rwanda"
}, {
  code: "KN",
  name: "Saint Kitts and Nevis"
}, {
  code: "LC",
  name: "Saint Lucia"
}, {
  code: "VC",
  name: "Saint Vincent and the Grenadines"
}, {
  code: "WS",
  name: "Samoa"
}, {
  code: "SM",
  name: "San Marino"
}, {
  code: "ST",
  name: "Sao Tome and Principe"
}, {
  code: "SA",
  name: "Saudi Arabia"
}, {
  code: "SN",
  name: "Senegal"
}, {
  code: "RS",
  name: "Serbia"
}, {
  code: "SC",
  name: "Seychelles"
}, {
  code: "SL",
  name: "Sierra Leone"
}, {
  code: "SG",
  name: "Singapore"
}, {
  code: "SK",
  name: "Slovakia"
}, {
  code: "SI",
  name: "Slovenia"
}, {
  code: "SB",
  name: "Solomon Islands"
}, {
  code: "SO",
  name: "Somalia"
}, {
  code: "ZA",
  name: "South Africa"
}, {
  code: "SS",
  name: "South Sudan"
}, {
  code: "ES",
  name: "Spain"
}, {
  code: "LK",
  name: "Sri Lanka"
}, {
  code: "SD",
  name: "Sudan"
}, {
  code: "SR",
  name: "Suriname"
}, {
  code: "SE",
  name: "Sweden"
}, {
  code: "CH",
  name: "Switzerland"
}, {
  code: "SY",
  name: "Syria"
}, {
  code: "TW",
  name: "Taiwan"
}, {
  code: "TJ",
  name: "Tajikistan"
}, {
  code: "TZ",
  name: "Tanzania"
}, {
  code: "TH",
  name: "Thailand"
}, {
  code: "TL",
  name: "Timor-Leste"
}, {
  code: "TG",
  name: "Togo"
}, {
  code: "TO",
  name: "Tonga"
}, {
  code: "TT",
  name: "Trinidad and Tobago"
}, {
  code: "TN",
  name: "Tunisia"
}, {
  code: "TR",
  name: "Turkey"
}, {
  code: "TM",
  name: "Turkmenistan"
}, {
  code: "TV",
  name: "Tuvalu"
}, {
  code: "UG",
  name: "Uganda"
}, {
  code: "UA",
  name: "Ukraine"
}, {
  code: "AE",
  name: "United Arab Emirates"
}, {
  code: "GB",
  name: "United Kingdom"
}, {
  code: "US",
  name: "United States"
}, {
  code: "UY",
  name: "Uruguay"
}, {
  code: "UZ",
  name: "Uzbekistan"
}, {
  code: "VU",
  name: "Vanuatu"
}, {
  code: "VA",
  name: "Vatican City"
}, {
  code: "VE",
  name: "Venezuela"
}, {
  code: "VN",
  name: "Vietnam"
}, {
  code: "YE",
  name: "Yemen"
}, {
  code: "ZM",
  name: "Zambia"
}, {
  code: "ZW",
  name: "Zimbabwe"
}];
interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_type: string | null;
  brand_color: string | null;
  assets_url: string | null;
  home_url: string | null;
  account_url: string | null;
  show_account_tab: boolean;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  whop_membership_id: string | null;
  whop_manage_url: string | null;
  shortimize_api_key: string | null;
  dub_api_key: string | null;
  slack_webhook_url: string | null;
  discord_webhook_url: string | null;
  notify_new_application: boolean;
  notify_new_sale: boolean;
  notify_new_message: boolean;
  instagram_handle: string | null;
  linkedin_handle: string | null;
  tiktok_handle: string | null;
  website_url: string | null;
  app_store_url: string | null;
  settings: Record<string, any> | null;
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("wallet");
  const [editedBrandName, setEditedBrandName] = useState("");
  const [editedSlug, setEditedSlug] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [profile, setProfile] = useState({
    billing_address: "",
    legal_business_name: "",
    vat_number: "",
    billing_country: ""
  });

  // Integration states
  const [shortimizeApiKey, setShortimizeApiKey] = useState("");
  const [shortimizeCollectionName, setShortimizeCollectionName] = useState("");
  const [dubApiKey, setDubApiKey] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [showDubKey, setShowDubKey] = useState(false);
  const [showShortimizeKey, setShowShortimizeKey] = useState(false);
  const [savingLowBalance, setSavingLowBalance] = useState(false);
  const lowBalanceRef = useRef<LowBalanceSettingsHandle>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Notification preferences
  const [notifyNewApplication, setNotifyNewApplication] = useState(true);
  const [notifyNewSale, setNotifyNewSale] = useState(true);
  const [notifyNewMessage, setNotifyNewMessage] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Social media states
  const [instagramHandle, setInstagramHandle] = useState("");
  const [linkedinHandle, setLinkedinHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#8B5CF6");
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<{
    id: string;
    name: string;
  } | null>(null);
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
      setEditedDescription(data?.description || "");
      setShortimizeApiKey(data?.shortimize_api_key || "");
      const settings = data?.settings as Record<string, any> || {};
      setShortimizeCollectionName(settings?.shortimize_collection_name || "");
      setDubApiKey(data?.dub_api_key || "");
      setSlackWebhookUrl(data?.slack_webhook_url || "");
      setDiscordWebhookUrl(data?.discord_webhook_url || "");
      setNotifyNewApplication(data?.notify_new_application ?? true);
      setNotifyNewSale(data?.notify_new_sale ?? true);
      setNotifyNewMessage(data?.notify_new_message ?? true);
      setInstagramHandle(data?.instagram_handle || "");
      setLinkedinHandle(data?.linkedin_handle || "");
      setTiktokHandle(data?.tiktok_handle || "");
      setWebsiteUrl(data?.website_url || "");
      setAppStoreUrl(data?.app_store_url || "");
      setBrandColor(data?.brand_color || "#8B5CF6");
    } catch (error) {
      console.error("Error fetching brand:", error);
    }
  };
  const handleSaveNotifications = async () => {
    if (!brand?.id) return;
    try {
      setSavingNotifications(true);
      const {
        error
      } = await supabase.from("brands").update({
        notify_new_application: notifyNewApplication,
        notify_new_sale: notifyNewSale,
        notify_new_message: notifyNewMessage
      }).eq("id", brand.id);
      if (error) throw error;
      toast.success("Notification preferences saved");
    } catch (error) {
      console.error("Error saving notifications:", error);
      toast.error("Failed to save notification preferences");
    } finally {
      setSavingNotifications(false);
    }
  };
  const handleSaveIntegrations = async () => {
    if (!brand?.id) return;
    try {
      setSavingIntegrations(true);
      // Get existing settings and merge with new collection name
      const existingSettings = (brand?.settings as Record<string, any>) || {};
      const updatedSettings = {
        ...existingSettings,
        shortimize_collection_name: shortimizeCollectionName || null
      };
      const {
        error
      } = await supabase.from("brands").update({
        shortimize_api_key: shortimizeApiKey || null,
        dub_api_key: dubApiKey || null,
        slack_webhook_url: slackWebhookUrl || null,
        discord_webhook_url: discordWebhookUrl || null,
        settings: updatedSettings
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
        slug: editedSlug,
        description: editedDescription || null,
        brand_color: brandColor,
        instagram_handle: instagramHandle || null,
        linkedin_handle: linkedinHandle || null,
        tiktok_handle: tiktokHandle || null,
        website_url: websiteUrl || null,
        app_store_url: appStoreUrl || null
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
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brand?.id) return;
    try {
      setUploadingAvatar(true);

      // Get current user for RLS policy compliance
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload");
        return;
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${brand.id}-${Date.now()}.${fileExt}`;
      // Path must start with user ID to satisfy RLS policy
      const filePath = `${user.id}/${fileName}`;
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
      setUserEmail(user.email || "");
      const {
        data: profileData,
        error
      } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      if (profileData) {
        setProfile({
          billing_address: (profileData as any).billing_address || "",
          legal_business_name: (profileData as any).legal_business_name || "",
          vat_number: (profileData as any).vat_number || "",
          billing_country: (profileData as any).billing_country || ""
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteWorkspace = async () => {
    if (!brand?.id || deleteConfirmEmail !== userEmail) {
      toast.error("Please enter your email correctly to confirm");
      return;
    }
    try {
      setDeleting(true);

      // Delete the brand (this will cascade delete related data)
      const {
        error
      } = await supabase.from("brands").delete().eq("id", brand.id);
      if (error) throw error;
      toast.success("Workspace deleted successfully");
      setShowDeleteDialog(false);
      setDeleteConfirmEmail("");
      refreshBrands();
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error("Failed to delete workspace");
    } finally {
      setDeleting(false);
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
        legal_business_name: profile.legal_business_name,
        vat_number: profile.vat_number,
        billing_country: profile.billing_country
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
  return <div className="w-full p-1.5 h-full">
      <div className="border border-border rounded-xl bg-card overflow-hidden h-full flex flex-col">
        {/* Sticky Header & Tabs */}
        <div className="sticky top-0 z-10 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.5px]">Settings</h1>
              <p className="text-sm text-muted-foreground tracking-[-0.5px]">
                Manage your workspace and billing
              </p>
            </div>
            {isBrandMode && brand && <Button onClick={async () => {
              if (activeTab === 'general') {
                handleSaveBrand();
              } else if (activeTab === 'integrations') {
                handleSaveIntegrations();
              } else if (activeTab === 'wallet') {
                if (lowBalanceRef.current) {
                  setSavingLowBalance(true);
                  await lowBalanceRef.current.save();
                  setSavingLowBalance(false);
                }
              }
            }} disabled={activeTab === 'general' ? savingBrand : activeTab === 'integrations' ? savingIntegrations : activeTab === 'wallet' ? savingLowBalance : false} className="h-9 px-6 tracking-[-0.5px] bg-black dark:bg-white text-white dark:text-black border-0 hover:bg-black/90 dark:hover:bg-white/90">
                  {(activeTab === 'general' && savingBrand) || (activeTab === 'integrations' && savingIntegrations) || (activeTab === 'wallet' && savingLowBalance) ? "Saving..." : "Save Changes"}
                </Button>}
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-6 border-b border-border px-6">
            {[{
              key: "wallet",
              label: "Billing"
            }, {
              key: "general",
              label: "General"
            }, {
              key: "integrations",
              label: "Integrations"
            }, {
              key: "team",
              label: "Team"
            }].map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-1 py-3 text-sm font-medium tracking-[-0.5px] transition-all border-b-2 -mb-px ${activeTab === tab.key ? "border-[#1f60dd] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {tab.label}
                </button>)}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        {/* General Tab */}
        <TabsContent value="general" className="mt-6">
          {isBrandMode && brand && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Brand Identity & Business Info */}
              <div className="space-y-6">
                {/* Brand Identity Card */}
                <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-[#0e0e0e] space-y-4">
                  <h3 className="text-sm font-medium tracking-[-0.5px] text-foreground">Brand Identity</h3>

                  {/* Icon Section */}
                  <div className="flex items-center gap-2.5">
                    {/* Logo Preview or Initials with Color */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity" style={{
                    backgroundColor: brand.logo_url ? undefined : brandColor
                  }} onClick={() => document.getElementById('brand-logo-upload')?.click()}>
                      {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" /> : <span className="text-white text-sm font-semibold font-inter">
                          {brand.name?.slice(0, 2).toUpperCase() || "B"}
                        </span>}
                    </div>

                    {/* Color Picker */}
                    <div className="grid grid-cols-7 gap-0.5">
                      {BRAND_COLORS.map(color => <button key={color} type="button" className={`w-[18px] h-[18px] rounded transition-all flex-shrink-0 ${brandColor === color ? 'ring-1 ring-offset-1 ring-offset-background ring-white/80' : 'hover:opacity-80'}`} style={{
                      backgroundColor: color
                    }} onClick={() => setBrandColor(color)} />)}
                    </div>

                    {/* Upload/Remove Buttons */}
                    <div className="flex items-center gap-1">
                      <label className="h-7 px-2.5 text-xs font-inter tracking-[-0.3px] gap-1.5 bg-muted dark:bg-[#0f0f0f] border-0 text-muted-foreground hover:bg-muted/80 dark:hover:bg-[#1a1a1a] hover:text-foreground rounded-md cursor-pointer flex items-center transition-colors">
                        <Upload className="h-3 w-3" />
                        {brand.logo_url ? 'Change' : 'Upload'}
                        <input id="brand-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                      </label>
                    </div>
                  </div>

                  {/* Brand Name */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Brand name</Label>
                    <Input value={editedBrandName} onChange={e => setEditedBrandName(e.target.value)} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px]" />
                  </div>

                  {/* Public URL */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Public URL</Label>
                    <div className="flex items-center">
                      <Input value={editedSlug} onChange={e => setEditedSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="h-11 bg-background dark:bg-[#080808] border-0 rounded-r-none tracking-[-0.5px]" />
                      <span className="h-11 px-3 flex items-center text-sm text-muted-foreground bg-background dark:bg-[#080808] rounded-r-lg tracking-[-0.5px]">
                        .virality.gg
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Description</Label>
                    <Textarea
                      value={editedDescription}
                      onChange={e => setEditedDescription(e.target.value)}
                      className="min-h-[80px] bg-background dark:bg-[#080808] border-0 tracking-[-0.5px] resize-none text-sm"
                      placeholder="Tell creators about your brand..."
                      maxLength={500}
                    />
                    <p className="text-[10px] text-muted-foreground">{editedDescription.length}/500</p>
                  </div>

                  {/* Website URL (readonly) */}
                  {brand.home_url && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Website</Label>
                      <Input value={brand.home_url} readOnly className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px]" />
                    </div>
                  )}
                </div>

                {/* Business Information Card */}
                <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-[#0e0e0e] space-y-4">
                  <h3 className="text-sm font-medium tracking-[-0.5px] text-foreground">Business Information</h3>

                  {/* Legal Business Name */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Legal Business Name</Label>
                    <Input value={profile.legal_business_name} onChange={e => setProfile({
                    ...profile,
                    legal_business_name: e.target.value
                  })} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px]" placeholder="Company Name LLC" />
                  </div>

                  {/* Billing Address */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Billing Address</Label>
                    <Input value={profile.billing_address} onChange={e => setProfile({
                    ...profile,
                    billing_address: e.target.value
                  })} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px]" placeholder="123 Main St, City, State, ZIP" />
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Country</Label>
                    <Select value={profile.billing_country} onValueChange={value => setProfile({
                    ...profile,
                    billing_country: value
                  })}>
                      <SelectTrigger className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px]">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {COUNTRIES.map(country => <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* VAT Number */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">VAT Number</Label>
                    <Input value={profile.vat_number} onChange={e => setProfile({
                    ...profile,
                    vat_number: e.target.value
                  })} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px]" placeholder="EU123456789" />
                  </div>
                </div>
              </div>

              {/* Right Column - Social Media & Danger Zone */}
              <div className="space-y-6">
                {/* Social Media Card */}
                <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-[#0e0e0e] space-y-4">
                  <h3 className="text-sm font-medium tracking-[-0.5px] text-foreground">Social Media</h3>

                  {/* Instagram */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Instagram</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input value={instagramHandle} onChange={e => {
                        let value = e.target.value;
                        // Extract handle from URL if pasted
                        const instagramMatch = value.match(/(?:instagram\.com|instagr\.am)\/([^\/\?]+)/i);
                        if (instagramMatch) value = instagramMatch[1];
                        setInstagramHandle(value.replace(/^@/, '').trim());
                      }} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px] pl-8" placeholder="Add your Instagram handle" />
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">LinkedIn</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input value={linkedinHandle} onChange={e => {
                        let value = e.target.value;
                        // Extract handle from URL if pasted
                        const linkedinMatch = value.match(/linkedin\.com\/(?:in|company)\/([^\/\?]+)/i);
                        if (linkedinMatch) value = linkedinMatch[1];
                        setLinkedinHandle(value.replace(/^@/, '').trim());
                      }} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px] pl-8" placeholder="Add your LinkedIn handle" />
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">TikTok</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input value={tiktokHandle} onChange={e => {
                        let value = e.target.value;
                        // Extract handle from URL if pasted
                        const tiktokMatch = value.match(/tiktok\.com\/@?([^\/\?]+)/i);
                        if (tiktokMatch) value = tiktokMatch[1];
                        setTiktokHandle(value.replace(/^@/, '').trim());
                      }} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px] pl-8" placeholder="Add your TikTok handle" />
                    </div>
                  </div>

                  {/* App Store URL */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">App Store URL</Label>
                    <Input value={appStoreUrl} onChange={e => setAppStoreUrl(e.target.value)} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px]" placeholder="Add a link to your App Store" />
                  </div>
                </div>

                {/* Danger Zone - Delete Workspace */}
                <div className="space-y-4 p-4 rounded-xl bg-destructive/5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium tracking-[-0.5px] text-destructive">Danger Zone</h3>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                      Once you delete a workspace, there is no going back. Please be certain.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="w-full h-10 tracking-[-0.5px]">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Workspace
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6">
          {isBrandMode && brand && (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Analytics Integrations */}
              <div className="space-y-6">
                {/* Shortimize API Key */}
                <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-white dark:bg-[#0e0e0e]">
                  <div className="flex items-center gap-3">
                    <img src={shortimizeLogo} alt="Shortimize" className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <h3 className="font-medium tracking-[-0.5px]">Shortimize</h3>
                      <p className="text-xs text-muted-foreground tracking-[-0.5px]">Connect to track video analytics</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">API Key</Label>
                    <div className="relative">
                      <Input type={showShortimizeKey ? "text" : "password"} value={shortimizeApiKey} onChange={e => setShortimizeApiKey(e.target.value)} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px] pr-10" placeholder="Enter your Shortimize API key" />
                      <button type="button" onClick={() => setShowShortimizeKey(!showShortimizeKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showShortimizeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Default Collection Name</Label>
                    <Input value={shortimizeCollectionName} onChange={e => setShortimizeCollectionName(e.target.value)} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px]" placeholder="e.g., Campaign Videos" />
                    <p className="text-xs text-muted-foreground tracking-[-0.3px]">
                      Videos will be organized into this collection by default
                    </p>
                  </div>
                </div>

                {/* Dub.co Link Tracking */}
                <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-white dark:bg-[#0e0e0e]">
                  <div className="flex items-center gap-3">
                    <img src={dubLogo} alt="Dub" className="w-10 h-10 rounded-lg object-cover bg-white p-1" />
                    <div>
                      <h3 className="font-medium tracking-[-0.5px]">Dub.co</h3>
                      <p className="text-xs text-muted-foreground tracking-[-0.5px]">Create short links and track click analytics</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">API Key</Label>
                    <div className="relative">
                      <Input type={showDubKey ? "text" : "password"} value={dubApiKey} onChange={e => setDubApiKey(e.target.value)} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px] pr-10" placeholder="Enter your Dub.co API key" />
                      <button type="button" onClick={() => setShowDubKey(!showDubKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showDubKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get your API key from <a href="https://dub.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dub.co/settings/tokens</a>
                    </p>
                  </div>
                </div>

                {/* Slack Webhook */}
                <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-white dark:bg-[#0e0e0e]">
                  <div className="flex items-center gap-3">
                    <img alt="Slack" className="w-10 h-10 rounded-lg object-contain" src="/lovable-uploads/25b74ff6-cd28-4cbc-aabb-4a5090ade12b.webp" />
                    <div>
                      <h3 className="font-medium tracking-[-0.5px]">Slack</h3>
                      <p className="text-xs text-muted-foreground tracking-[-0.5px]">Get notified when you receive new applications</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Webhook URL</Label>
                    <Input type="url" value={slackWebhookUrl} onChange={e => setSlackWebhookUrl(e.target.value)} className="h-11 bg-background dark:bg-[#080808] border-0 tracking-[-0.5px]" placeholder="https://hooks.slack.com/services/..." />
                  </div>
                </div>

              </div>

              {/* Right Column - Custom Webhooks & Notifications */}
              <div className="space-y-6">
                {/* Custom Webhooks Section */}
                <CustomWebhooksTab brandId={brand.id} />

                {/* Notifications Section */}
                <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-white dark:bg-[#0e0e0e]">
                  <div>
                    <h3 className="font-medium tracking-[-0.5px]">Notifications</h3>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">Configure when to receive webhook and email alerts</p>
                  </div>
                  <div className="divide-y divide-border/50">
                    {/* New partner application */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <img src={framePersonIcon} alt="" className="h-5 w-5 opacity-60" />
                        <div>
                          <p className="text-sm font-medium tracking-[-0.5px]">New creator application</p>
                          <p className="text-xs text-muted-foreground tracking-[-0.5px]">Alert when a new creator applies to your program.</p>
                        </div>
                      </div>
                      <Switch checked={notifyNewApplication} onCheckedChange={checked => {
                      setNotifyNewApplication(checked);
                      handleSaveNotifications();
                    }} />
                    </div>

                    {/* New boost submission */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <img src={stackedInboxIcon} alt="" className="h-5 w-5 opacity-60" />
                        <div>
                          <p className="text-sm font-medium tracking-[-0.5px]">New boost submission</p>
                          <p className="text-xs text-muted-foreground tracking-[-0.5px]">Alert when a new submission is made to your boost.</p>
                        </div>
                      </div>
                      <Switch checked={notifyNewSale} onCheckedChange={checked => {
                      setNotifyNewSale(checked);
                      handleSaveNotifications();
                    }} />
                    </div>

                    {/* New message from partner */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <img src={mailNotificationIcon} alt="" className="h-5 w-5 opacity-60" />
                        <div>
                          <p className="text-sm font-medium tracking-[-0.5px]">New message from creator</p>
                          <p className="text-xs text-muted-foreground tracking-[-0.5px]">Alert when a new message is received from a creator.</p>
                        </div>
                      </div>
                      <Switch checked={notifyNewMessage} onCheckedChange={checked => {
                      setNotifyNewMessage(checked);
                      handleSaveNotifications();
                    }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-6">
          {isBrandMode && brand && <TeamMembersTab brandId={brand.id} brandSlug={brand.slug} />}
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet" className="mt-6">
          {isBrandMode && brand && (
            <div className="space-y-6">
              {/* Balance & Add Funds - Primary Focus */}
              {currentBrand && <BrandWalletTab brandId={currentBrand.id} brandSlug={currentBrand.slug} />}

              {/* Subscription & Usage Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subscription Info */}
                <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-[#0e0e0e] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium tracking-[-0.5px]">Subscription</h3>
                    {brand.subscription_status === 'active' && <span className="px-2 py-0.5 text-xs font-medium font-inter tracking-[-0.5px] bg-green-500/10 text-green-600 rounded-full">
                        Active
                      </span>}
                    {brand.subscription_status !== 'active' && <span className="px-2 py-0.5 text-xs font-medium font-inter tracking-[-0.5px] bg-muted text-muted-foreground rounded-full">
                        {brand.subscription_status || 'Inactive'}
                      </span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground tracking-[-0.3px]">Plan</p>
                      <p className="text-sm font-medium tracking-[-0.5px]">
                        {brand.subscription_plan ? PLAN_DISPLAY_NAMES[brand.subscription_plan] || brand.subscription_plan : 'No plan'}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground tracking-[-0.3px]">Price</p>
                      <p className="text-sm font-medium tracking-[-0.5px]">
                        {brand.subscription_plan && PLAN_PRICES[brand.subscription_plan] ? `$${PLAN_PRICES[brand.subscription_plan]}/mo` : '—'}
                      </p>
                    </div>

                    {brand.subscription_started_at && <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground tracking-[-0.3px]">Started</p>
                        <p className="text-sm font-medium tracking-[-0.5px]">
                          {new Date(brand.subscription_started_at).toLocaleDateString()}
                        </p>
                      </div>}

                    {brand.subscription_expires_at && <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground tracking-[-0.3px]">Renews</p>
                        <p className="text-sm font-medium tracking-[-0.5px]">
                          {new Date(brand.subscription_expires_at).toLocaleDateString()}
                        </p>
                      </div>}
                  </div>

                  {brand.whop_manage_url && <div className="pt-2 border-t border-border/50">
                      <a href={brand.whop_manage_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline tracking-[-0.3px]">
                        Manage billing →
                      </a>
                    </div>}
                </div>

                {/* Usage Tracking */}
                <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-[#0e0e0e]">
                  <BillingUsageCard
                    brandId={brand.id}
                    subscriptionPlan={brand.subscription_plan}
                    onUpgrade={() => setShowUpgradeDialog(true)}
                  />
                </div>
              </div>

              {/* Low Balance Protection - Collapsible */}
              {currentBrand && (
                <Collapsible defaultOpen={false}>
                  <div className="rounded-xl border border-border/50 bg-white dark:bg-[#0e0e0e] overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-[18px] text-muted-foreground" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>
                          shield
                        </span>
                        <span className="text-sm font-medium tracking-[-0.5px]">Low Balance Protection</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        <LowBalanceSettingsTab ref={lowBalanceRef} brandId={currentBrand.id} />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </div>
          )}

          {/* Subscription Upgrade Dialog */}
          {brand && <SubscriptionGateDialog
            brandId={brand.id}
            open={showUpgradeDialog}
            onOpenChange={setShowUpgradeDialog}
          />}

          {/* Subscription Checkout Dialog */}
          {selectedCheckoutPlan && brand && <SubscriptionCheckoutDialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog} planId={selectedCheckoutPlan.id} planName={selectedCheckoutPlan.name} brandId={brand.slug} onComplete={() => {
            fetchBrand();
            toast.success("Subscription activated!");
          }} />}
        </TabsContent>

      </Tabs>

      {/* Create Brand Dialog */}
      <CreateBrandDialog open={showCreateBrandDialog} onOpenChange={setShowCreateBrandDialog} onSuccess={handleBrandCreated} />

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="tracking-[-0.5px]">Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription className="tracking-[-0.5px]">
              This action cannot be undone. This will permanently delete the workspace
              <span className="font-semibold text-foreground"> {brand?.name}</span> and all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-sm text-muted-foreground tracking-[-0.5px]">
              Type your email <span className="font-medium text-foreground">{userEmail}</span> to confirm
            </Label>
            <Input value={deleteConfirmEmail} onChange={e => setDeleteConfirmEmail(e.target.value)} placeholder="Enter your email" className="h-11 tracking-[-0.5px]" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmEmail("")} className="tracking-[-0.5px] border-0 hover:bg-muted hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={deleting || deleteConfirmEmail !== userEmail} className="tracking-[-0.5px]">
              {deleting ? "Deleting..." : "Delete Workspace"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      </div>
    </div>;
}