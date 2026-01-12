import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Check, Lock, FileText, Plus, X, HelpCircle, ImagePlus, ClipboardCheck } from "lucide-react";
import { ViewBonusesConfig } from "./ViewBonusesConfig";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ApplicationQuestionsEditor } from "./ApplicationQuestionsEditor";
import { ApplicationQuestion } from "@/types/applicationQuestions";
import { useBrandUsage } from "@/hooks/useBrandUsage";
import { DiscordRoleSelector } from "./DiscordRoleSelector";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";

// Types
export type CampaignType = 'cpm' | 'boost';
export type WizardMode = 'create' | 'edit' | 'clone';

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  defaults: {
    budget: string;
    rpm_rate: string;
    payment_model: 'pay_per_view' | 'pay_per_post';
    allowed_platforms: string[];
    requires_application: boolean;
    is_private: boolean;
  };
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Campaign',
    description: 'Balanced CPM for TikTok & Instagram',
    defaults: {
      budget: '1000',
      rpm_rate: '5',
      payment_model: 'pay_per_view',
      allowed_platforms: ['tiktok', 'instagram'],
      requires_application: true,
      is_private: false
    }
  },
  {
    id: 'premium',
    name: 'Premium Performance',
    description: 'Higher CPM across all platforms',
    defaults: {
      budget: '5000',
      rpm_rate: '10',
      payment_model: 'pay_per_view',
      allowed_platforms: ['tiktok', 'instagram', 'youtube'],
      requires_application: true,
      is_private: false
    }
  },
  {
    id: 'budget',
    name: 'Budget Awareness',
    description: 'Cost-effective TikTok-only campaign',
    defaults: {
      budget: '500',
      rpm_rate: '2',
      payment_model: 'pay_per_view',
      allowed_platforms: ['tiktok'],
      requires_application: false,
      is_private: false
    }
  },
  {
    id: 'exclusive',
    name: 'Exclusive Partnership',
    description: 'Private high-value creator program',
    defaults: {
      budget: '10000',
      rpm_rate: '15',
      payment_model: 'pay_per_view',
      allowed_platforms: ['tiktok', 'instagram', 'youtube'],
      requires_application: true,
      is_private: true
    }
  }
];

interface Blueprint {
  id: string;
  title: string;
  platforms?: string[] | null;
}

interface PlatformRate {
  platform: string;
  type: 'cpm' | 'per_post';
  cpm_rate?: number;
  post_rate?: number;
}

export interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName?: string;
  brandLogoUrl?: string;
  subscriptionPlan?: string | null;
  onSuccess?: () => void;
  mode?: WizardMode;
  campaignId?: string;
  boostId?: string;
  initialType?: CampaignType;
  initialBlueprintId?: string;
  onDelete?: () => void;
}

// Constants
const STEPS = [
  { id: 1, label: "Type" },
  { id: 2, label: "Compensation" },
  { id: 3, label: "Targeting" },
  { id: 4, label: "Details" },
  { id: 5, label: "Review" },
];

const POSITION_TYPES = [
  { value: "content_creator", label: "Content Creator", description: "Creates and posts content on their own channels" },
  { value: "ugc_creator", label: "UGC Creator", description: "Creates content for your brand's channels" },
  { value: "ambassador", label: "Brand Ambassador", description: "Long-term partnership representing your brand" },
  { value: "affiliate", label: "Affiliate Partner", description: "Promotes products with commission-based earnings" },
  { value: "other", label: "Other", description: "Custom position type" },
];

const PLATFORM_OPTIONS = [
  { id: 'tiktok', label: 'TikTok', icon: tiktokLogoWhite, iconLight: tiktokLogoBlack },
  { id: 'instagram', label: 'Instagram', icon: instagramLogoWhite, iconLight: instagramLogoBlack },
  { id: 'youtube', label: 'YouTube', icon: youtubeLogoWhite, iconLight: youtubeLogoBlack },
  { id: 'x', label: 'X (Twitter)', icon: null },
];

const CAMPAIGN_NICHES = [
  { id: 'tech', label: 'Tech & Software' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'fashion', label: 'Fashion & Beauty' },
  { id: 'finance', label: 'Finance & Crypto' },
  { id: 'creative', label: 'Art & Creative' },
  { id: 'music', label: 'Music & Audio' },
  { id: 'education', label: 'Education' },
  { id: 'fitness', label: 'Health & Fitness' },
  { id: 'food', label: 'Food & Drink' },
];

const CATEGORY_SUGGESTIONS = [
  "Gaming", "Tech", "Lifestyle", "Fashion", "Beauty", "Fitness", "Food",
  "Travel", "Music", "Education", "Finance", "Entertainment", "Sports",
  "Health", "Parenting", "Pets", "Home", "Auto", "Art", "Comedy"
];

const SKILL_SUGGESTIONS = [
  "Video Editing", "Storytelling", "On-Camera Presence", "Voice Over",
  "Motion Graphics", "Photography", "Copywriting", "Live Streaming",
  "Product Reviews", "Tutorials", "Comedy", "ASMR", "Unboxing", "Vlogs"
];

export function CampaignWizard({
  open,
  onOpenChange,
  brandId,
  brandName,
  brandLogoUrl,
  subscriptionPlan,
  onSuccess,
  mode = 'create',
  campaignId,
  boostId,
  initialType,
  initialBlueprintId,
}: CampaignWizardProps) {
  // Determine if we're in edit or clone mode
  const isEditMode = mode === 'edit';
  const isCloneMode = mode === 'clone';

  // Skip type step when initialType is provided (type already chosen from type picker)
  const skipTypeStep = Boolean(initialType) || isEditMode;

  // Step management - skip step 1 when type is pre-selected or in edit mode
  const [currentStep, setCurrentStep] = useState(skipTypeStep ? 2 : 1);
  const [creating, setCreating] = useState(false);

  // Usage limits
  const { canCreateCampaign, canCreateBoost } = useBrandUsage(brandId, subscriptionPlan);

  // Data fetching state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>("");
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [brandDiscordGuildId, setBrandDiscordGuildId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form data - unified state for both types
  const [formData, setFormData] = useState({
    // Type selection
    campaignType: (initialType || 'boost') as CampaignType,

    // Shared fields
    title: "",
    description: "",
    content_distribution: "creators_own_page" as "creators_own_page" | "brand_accounts",
    is_private: false,
    payout_type: "on_platform" as "on_platform" | "off_platform",
    shortimize_collection_name: "",
    discord_role_id: "",
    application_questions: [] as ApplicationQuestion[],

    // Boost-specific
    position_type: "" as string,
    custom_position: "" as string,
    monthly_retainer: "",
    videos_per_month: "",
    max_accepted_creators: "",
    payment_schedule: "monthly" as "weekly" | "biweekly" | "monthly",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    view_bonuses_enabled: false,
    view_bonus_tiers: [] as { bonus_type: 'milestone' | 'cpm'; view_threshold: number; min_views?: number; bonus_amount: number; cpm_rate?: number }[],
    experience_level: "any" as "any" | "beginner" | "intermediate" | "advanced",
    content_type: "both" as "short_form" | "long_form" | "both",
    categories: [] as string[],
    skills: [] as string[],

    // CPM Campaign-specific
    budget: "",
    is_infinite_budget: false,
    rpm_rate: "5",
    payment_model: "pay_per_view" as "pay_per_view" | "pay_per_post",
    allowed_platforms: ["tiktok", "instagram"] as string[],
    category: "",
    requires_application: true,
    access_code: "",
    hashtags: [] as string[],
    require_audience_insights: false,
    require_phone_number: false,
    min_insights_score: 60,
  });

  // Platform rates for CPM campaigns
  const [platformRates, setPlatformRates] = useState<Record<string, PlatformRate>>({});

  // Tag inputs
  const [categoryInput, setCategoryInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");

  // Get selected blueprint
  const selectedBlueprint = blueprints.find(bp => bp.id === selectedBlueprintId);

  // Computed values
  const isCPMCampaign = formData.campaignType === 'cpm';
  const isBoost = formData.campaignType === 'boost';

  // Fetch brand data on open
  useEffect(() => {
    const fetchBrandData = async () => {
      if (open && brandId) {
        setLoadingBalance(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          // Fetch balance
          const { data, error } = await supabase.functions.invoke('get-brand-balance', {
            body: { brand_id: brandId }
          });
          if (error) throw error;
          setAvailableBalance(data?.balance || 0);

          // Fetch subscription status and Discord guild
          const { data: brandData } = await supabase
            .from('brands')
            .select('subscription_status, discord_guild_id')
            .eq('id', brandId)
            .single();
          setSubscriptionStatus(brandData?.subscription_status || null);
          setBrandDiscordGuildId(brandData?.discord_guild_id || null);
        } catch (error) {
          console.error('Error fetching brand data:', error);
        } finally {
          setLoadingBalance(false);
        }
      }
    };
    fetchBrandData();
  }, [open, brandId]);

  // Fetch blueprints
  useEffect(() => {
    if (open && brandId) {
      fetchBlueprints();
    }
  }, [open, brandId]);

  // Set initial blueprint
  useEffect(() => {
    if (initialBlueprintId && open) {
      setSelectedBlueprintId(initialBlueprintId);
    }
  }, [initialBlueprintId, open]);

  // Load existing data for edit/clone mode
  useEffect(() => {
    if (!open) return;

    if (mode === 'create') {
      resetForm();
      if (initialType) {
        setFormData(prev => ({ ...prev, campaignType: initialType }));
      }
      return;
    }

    // Edit or Clone mode - set correct starting step and load existing data
    setCurrentStep(skipTypeStep ? 2 : 1);

    const loadExistingData = async () => {
      setLoadingData(true);
      try {
        if (campaignId) {
          // Load CPM campaign
          const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

          if (error) throw error;
          if (data) {
            populateFromCampaign(data);
          }
        } else if (boostId) {
          // Load boost
          const { data, error } = await supabase
            .from('bounty_campaigns')
            .select('*')
            .eq('id', boostId)
            .single();

          if (error) throw error;

          // Also fetch view bonus tiers
          const { data: tiers } = await supabase
            .from('boost_view_bonuses')
            .select('*')
            .eq('bounty_campaign_id', boostId);

          if (data) {
            populateFromBoost(data, tiers || []);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load campaign data');
      } finally {
        setLoadingData(false);
      }
    };

    loadExistingData();
  }, [open, mode, campaignId, boostId, initialType]);

  const populateFromCampaign = (data: any) => {
    const title = isCloneMode ? `${data.title} (Copy)` : data.title;

    setFormData(prev => ({
      ...prev,
      campaignType: 'cpm',
      title,
      description: data.description || "",
      content_distribution: data.content_distribution || "creators_own_page",
      is_private: data.is_private || false,
      payout_type: data.payout_type || "on_platform",
      shortimize_collection_name: data.shortimize_collection_name || "",
      discord_role_id: data.discord_role_id || "",
      budget: data.budget?.toString() || "",
      is_infinite_budget: data.is_infinite_budget || false,
      rpm_rate: data.rpm_rate?.toString() || "5",
      payment_model: data.payment_model || "pay_per_view",
      allowed_platforms: data.allowed_platforms || ["tiktok", "instagram"],
      category: data.category || "",
      requires_application: data.requires_application ?? true,
      access_code: data.access_code || "",
      hashtags: data.hashtags || [],
      require_audience_insights: data.require_audience_insights || false,
      require_phone_number: data.require_phone_number || false,
      min_insights_score: data.min_insights_score || 60,
    }));

    setBannerPreview(data.banner_url || null);
    setSelectedBlueprintId(data.blueprint_id || "");

    // Load platform rates
    if (data.platform_rates) {
      setPlatformRates(data.platform_rates);
    }
  };

  const populateFromBoost = (data: any, tiers: any[]) => {
    const title = isCloneMode ? `${data.title} (Copy)` : data.title;

    setFormData(prev => ({
      ...prev,
      campaignType: 'boost',
      title,
      description: data.description || "",
      content_distribution: data.content_distribution || "creators_own_page",
      is_private: data.is_private || false,
      payout_type: data.payout_type || "on_platform",
      shortimize_collection_name: data.shortimize_collection_name || "",
      discord_role_id: data.discord_role_id || "",
      position_type: data.position_type || "",
      monthly_retainer: data.monthly_retainer?.toString() || "",
      videos_per_month: data.videos_per_month?.toString() || "",
      max_accepted_creators: data.max_accepted_creators?.toString() || "",
      payment_schedule: data.payment_schedule || "monthly",
      start_date: data.start_date ? new Date(data.start_date) : undefined,
      end_date: data.end_date ? new Date(data.end_date) : undefined,
      view_bonuses_enabled: data.view_bonuses_enabled || false,
      view_bonus_tiers: tiers.map(t => ({
        bonus_type: t.bonus_type,
        view_threshold: t.view_threshold,
        min_views: t.min_views,
        bonus_amount: t.bonus_amount,
        cpm_rate: t.cpm_rate,
      })),
      experience_level: data.experience_level || "any",
      content_type: data.content_type || "both",
      categories: data.categories || [],
      skills: data.skills || [],
    }));

    setBannerPreview(data.banner_url || null);
    setSelectedBlueprintId(data.blueprint_id || "");
  };

  const fetchBlueprints = async () => {
    const { data } = await supabase
      .from('blueprints')
      .select('id, title, platforms')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });
    setBlueprints(data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Platform rate helpers
  const addPlatformRate = (platformId: string, type: 'cpm' | 'per_post', rate: number) => {
    setPlatformRates(prev => ({
      ...prev,
      [platformId]: {
        platform: platformId,
        type,
        ...(type === 'cpm' ? { cpm_rate: rate } : { post_rate: rate })
      }
    }));
  };

  const removePlatformRate = (platformId: string) => {
    setPlatformRates(prev => {
      const newRates = { ...prev };
      delete newRates[platformId];
      return newRates;
    });
  };

  const getAvailablePlatforms = () => {
    return PLATFORM_OPTIONS.filter(p =>
      formData.allowed_platforms.includes(p.id) && !platformRates[p.id]
    );
  };

  // Validation and navigation
  const handleNext = async () => {
    if (currentStep === 1) {
      // Type step validation
      if (!formData.campaignType) {
        toast.error("Please select a campaign type");
        return;
      }
      if (isBoost && !formData.position_type) {
        toast.error("Please select a position type");
        return;
      }
      if (isBoost && formData.position_type === "other" && !formData.custom_position) {
        toast.error("Please enter a custom position name");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Compensation step validation
      if (isBoost) {
        if (!formData.monthly_retainer || !formData.videos_per_month || !formData.max_accepted_creators) {
          toast.error("Please fill in all required fields");
          return;
        }
        // Only validate budget against balance when creating (not editing) and paying on-platform
        if (!isEditMode && formData.payout_type === "on_platform") {
          const monthlyRetainer = parseFloat(formData.monthly_retainer) || 0;
          const maxCreators = parseInt(formData.max_accepted_creators, 10) || 0;
          const totalBudgetNeeded = monthlyRetainer * maxCreators;
          if (totalBudgetNeeded > availableBalance) {
            toast.error(`Total budget ($${totalBudgetNeeded.toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceeds available balance`);
            return;
          }
        }
      } else {
        // CPM campaign validation
        // Only validate budget when creating (not editing) and paying on-platform
        if (!isEditMode) {
          if (!formData.is_infinite_budget && (!formData.budget || parseFloat(formData.budget) <= 0)) {
            toast.error("Please enter a valid budget");
            return;
          }
          if (!formData.is_infinite_budget && formData.payout_type === "on_platform" && parseFloat(formData.budget) > availableBalance) {
            toast.error("Budget exceeds available balance");
            return;
          }
        }
        if (!formData.rpm_rate || parseFloat(formData.rpm_rate) <= 0) {
          toast.error("Please enter a valid CPM rate");
          return;
        }
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Targeting step validation
      if (isCPMCampaign && formData.allowed_platforms.length === 0) {
        toast.error("Please select at least one platform");
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Details step validation
      if (!formData.title) {
        toast.error("Please enter a title");
        return;
      }
      setCurrentStep(5);
    }
  };

  const handleBack = () => {
    if (currentStep > (skipTypeStep ? 2 : 1)) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit handlers
  const handleSubmit = async () => {
    if (isBoost) {
      await handleSubmitBoost();
    } else {
      await handleSubmitCampaign();
    }
  };

  const handleSubmitBoost = async () => {
    if (!canCreateBoost && !isEditMode) {
      toast.error("Boost limit reached. Upgrade your plan to create more boosts.");
      return;
    }

    if (!formData.title || !formData.monthly_retainer || !formData.videos_per_month || !formData.max_accepted_creators) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      // Upload banner if new file
      let banner_url = bannerPreview;
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${brandId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('campaign-banners')
          .upload(fileName, bannerFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('campaign-banners')
          .getPublicUrl(fileName);
        banner_url = publicUrl;
      }

      const blueprintPlatforms = selectedBlueprint?.platforms || ['tiktok', 'instagram', 'youtube'];
      const fullRequirements = `PLATFORMS: ${blueprintPlatforms.join(", ")}`;
      const boostStatus = subscriptionStatus === 'active' ? 'active' : 'draft';
      const finalPositionType = formData.position_type === 'other'
        ? formData.custom_position
        : formData.position_type;

      const baseSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      const boostData = {
        brand_id: brandId,
        title: formData.title,
        description: formData.description || null,
        monthly_retainer: parseFloat(formData.monthly_retainer),
        videos_per_month: parseInt(formData.videos_per_month, 10),
        content_style_requirements: fullRequirements,
        max_accepted_creators: parseInt(formData.max_accepted_creators, 10),
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        banner_url,
        status: isEditMode ? undefined : boostStatus,
        blueprint_embed_url: null,
        blueprint_id: selectedBlueprintId && selectedBlueprintId !== "none" ? selectedBlueprintId : null,
        is_private: formData.is_private,
        application_questions: formData.application_questions.length > 0 ? formData.application_questions as unknown as any : null,
        content_distribution: formData.content_distribution,
        position_type: finalPositionType || null,
        slug: isEditMode ? undefined : uniqueSlug,
        shortimize_collection_name: formData.shortimize_collection_name || null,
        view_bonuses_enabled: formData.view_bonuses_enabled,
        discord_guild_id: brandDiscordGuildId || null,
        discord_role_id: formData.discord_role_id || null,
        experience_level: formData.experience_level || 'any',
        content_type: formData.content_type || 'both',
        categories: formData.categories.length > 0 ? formData.categories : null,
        skills: formData.skills.length > 0 ? formData.skills : null,
        payout_type: formData.payout_type
      };

      let resultId: string;

      if (isEditMode && boostId) {
        // Update existing boost
        const { error } = await supabase
          .from('bounty_campaigns')
          .update(boostData)
          .eq('id', boostId);
        if (error) throw error;
        resultId = boostId;

        // Update view bonus tiers
        await supabase
          .from('boost_view_bonuses')
          .delete()
          .eq('bounty_campaign_id', boostId);
      } else {
        // Create new boost
        const { data: bountyData, error } = await supabase
          .from('bounty_campaigns')
          .insert(boostData)
          .select()
          .single();
        if (error) throw error;
        resultId = bountyData.id;
      }

      // Insert view bonus tiers
      if (formData.view_bonuses_enabled && formData.view_bonus_tiers.length > 0) {
        const tiersToInsert = formData.view_bonus_tiers.map(tier => ({
          bounty_campaign_id: resultId,
          view_threshold: tier.view_threshold,
          bonus_amount: tier.bonus_amount,
          bonus_type: tier.bonus_type,
          cpm_rate: tier.cpm_rate || null,
          min_views: tier.min_views || null
        }));
        await supabase.from('boost_view_bonuses').insert(tiersToInsert);
      }

      if (isEditMode) {
        toast.success("Boost updated successfully!");
      } else if (subscriptionStatus === 'active') {
        toast.success("Boost created and launched!");
      } else {
        toast.success("Boost saved as draft. Activate your subscription to launch it.");
      }

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving boost:", error);
      toast.error(error.message || "Failed to save boost");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitCampaign = async () => {
    if (!canCreateCampaign && !isEditMode) {
      toast.error("Campaign limit reached. Upgrade your plan to create more campaigns.");
      return;
    }

    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }

    if (!formData.is_infinite_budget && (!formData.budget || parseFloat(formData.budget) <= 0)) {
      toast.error("Please enter a valid budget");
      return;
    }

    setCreating(true);
    try {
      // Upload banner if new file
      let banner_url = bannerPreview;
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${brandId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('campaign-banners')
          .upload(fileName, bannerFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('campaign-banners')
          .getPublicUrl(fileName);
        banner_url = publicUrl;
      }

      const baseSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      const campaignData = {
        brand_id: brandId,
        brand_name: brandName || '',
        brand_logo_url: brandLogoUrl || null,
        title: formData.title,
        description: formData.description || null,
        budget: formData.is_infinite_budget ? 0 : parseFloat(formData.budget),
        is_infinite_budget: formData.is_infinite_budget,
        rpm_rate: parseFloat(formData.rpm_rate),
        payment_model: formData.payment_model,
        post_rate: formData.payment_model === 'pay_per_post' ? parseFloat(formData.rpm_rate) : null,
        platform_rates: Object.keys(platformRates).length > 0 ? platformRates : null,
        allowed_platforms: formData.allowed_platforms,
        banner_url,
        status: isEditMode ? undefined : 'draft',
        slug: isEditMode ? undefined : uniqueSlug,
        category: formData.category || null,
        content_distribution: formData.content_distribution,
        is_private: formData.is_private,
        access_code: formData.is_private ? formData.access_code : null,
        requires_application: formData.requires_application,
        hashtags: formData.hashtags.length > 0 ? formData.hashtags : null,
        blueprint_id: selectedBlueprintId && selectedBlueprintId !== "none" ? selectedBlueprintId : null,
        shortimize_collection_name: formData.shortimize_collection_name || null,
        discord_guild_id: brandDiscordGuildId || null,
        discord_role_id: formData.discord_role_id || null,
        require_audience_insights: formData.require_audience_insights,
        min_insights_score: formData.require_audience_insights ? formData.min_insights_score : null,
        require_phone_number: formData.require_phone_number,
        payout_type: formData.payout_type
      };

      if (isEditMode && campaignId) {
        // Update existing campaign
        const { error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', campaignId);
        if (error) throw error;
        toast.success("Campaign updated successfully!");
      } else {
        // Create new campaign
        const { data: newCampaign, error } = await supabase
          .from('campaigns')
          .insert(campaignData)
          .select()
          .single();
        if (error) throw error;

        // Allocate budget if not infinite
        if (!formData.is_infinite_budget && parseFloat(formData.budget) > 0 && newCampaign) {
          await supabase.functions.invoke('allocate-brand-budget', {
            body: { brand_id: brandId, campaign_id: newCampaign.id, amount: parseFloat(formData.budget) }
          });
        }

        toast.success("Campaign created! It's now pending review.");
      }

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving campaign:", error);
      toast.error(error.message || "Failed to save campaign");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      campaignType: initialType || 'boost',
      title: "",
      description: "",
      content_distribution: "creators_own_page",
      is_private: false,
      payout_type: "on_platform",
      shortimize_collection_name: "",
      discord_role_id: "",
      application_questions: [],
      position_type: "",
      custom_position: "",
      monthly_retainer: "",
      videos_per_month: "",
      max_accepted_creators: "",
      payment_schedule: "monthly",
      start_date: undefined,
      end_date: undefined,
      view_bonuses_enabled: false,
      view_bonus_tiers: [],
      experience_level: "any",
      content_type: "both",
      categories: [],
      skills: [],
      budget: "",
      is_infinite_budget: false,
      rpm_rate: "5",
      payment_model: "pay_per_view",
      allowed_platforms: ["tiktok", "instagram"],
      category: "",
      requires_application: true,
      access_code: "",
      hashtags: [],
      require_audience_insights: false,
      require_phone_number: false,
      min_insights_score: 60,
    });

    setCategoryInput("");
    setSkillInput("");
    setHashtagInput("");
    setBannerFile(null);
    setBannerPreview(null);
    setSelectedBlueprintId("");
    setPlatformRates({});
    setCurrentStep(skipTypeStep ? 2 : 1);
  };

  // Get title based on mode and type
  const getDialogTitle = () => {
    if (isEditMode) {
      return isBoost ? "Edit Boost" : "Edit Campaign";
    }
    if (isCloneMode) {
      return isBoost ? "Clone Boost" : "Clone Campaign";
    }
    return "Create Campaign";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[540px] w-[95vw] max-h-[85vh] bg-background border-border p-0 overflow-hidden flex flex-col">
          {/* Hidden file input for banner upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          {/* Stepper Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center justify-center gap-0">
              {STEPS.filter(step => !skipTypeStep || step.id !== 1).map((step, index, filteredSteps) => {
                // When skipping type step, renumber steps (2->1, 3->2, etc.)
                const displayNumber = skipTypeStep ? step.id - 1 : step.id;
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                        currentStep > step.id
                          ? "bg-primary text-primary-foreground"
                          : currentStep === step.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {currentStep > step.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          displayNumber
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] mt-1.5 font-medium font-inter tracking-[-0.3px]",
                        currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {index < filteredSteps.length - 1 && (
                      <div className={cn(
                        "w-12 h-0.5 mx-2 transition-colors",
                        currentStep > step.id ? "bg-primary" : "bg-muted"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6 py-4">
            {loadingData ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <>
                {/* Step 1: Type Selection */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold font-geist tracking-[-0.5px]">What type of campaign?</h3>
                      <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">Choose how you want to work with creators</p>
                    </div>

                    {/* Campaign Type Selection */}
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, campaignType: 'boost'})}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all",
                          formData.campaignType === 'boost'
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm font-inter tracking-[-0.3px]">Boost (Retainer)</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.3px]">Hire creators on a monthly retainer with fixed deliverables</p>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            formData.campaignType === 'boost'
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40"
                          )}>
                            {formData.campaignType === 'boost' && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({...formData, campaignType: 'cpm'})}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all",
                          formData.campaignType === 'cpm'
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm font-inter tracking-[-0.3px]">Campaign (CPM)</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.3px]">Pay creators per 1,000 views on their content</p>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            formData.campaignType === 'cpm'
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40"
                          )}>
                            {formData.campaignType === 'cpm' && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Position Type (Boost only) */}
                    {isBoost && (
                      <div className="space-y-3 pt-4">
                        <Label className="text-xs text-foreground font-inter tracking-[-0.3px]">Position Type</Label>
                        {POSITION_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData({...formData, position_type: type.value})}
                            className={cn(
                              "w-full p-3 rounded-lg border text-left transition-all",
                              formData.position_type === type.value
                                ? "border-primary bg-primary/5"
                                : "border-border/50 hover:border-border hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm font-inter tracking-[-0.3px]">{type.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.3px]">{type.description}</p>
                              </div>
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                formData.position_type === type.value
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40"
                              )}>
                                {formData.position_type === type.value && (
                                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                                )}
                              </div>
                            </div>
                          </button>
                        ))}

                        {formData.position_type === "other" && (
                          <div className="space-y-1.5 pt-2">
                            <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Custom Position Name</Label>
                            <Input
                              value={formData.custom_position}
                              onChange={e => setFormData({...formData, custom_position: e.target.value})}
                              placeholder="e.g., Social Media Manager"
                              className="h-11 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content Distribution - Who Posts the Video */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Who will post the videos?</Label>
                      <div className="flex rounded-lg border border-border/50 overflow-hidden bg-muted/30">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, content_distribution: "creators_own_page"})}
                          className={cn(
                            "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                            formData.content_distribution === "creators_own_page"
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          Creator
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, content_distribution: "brand_accounts"})}
                          className={cn(
                            "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                            formData.content_distribution === "brand_accounts"
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          Brand
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                        {formData.content_distribution === "brand_accounts"
                          ? "Creators submit raw videos. You post them on your brand channels."
                          : "Creators post videos on their own accounts. You track performance."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Compensation */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {isBoost ? (
                      // Boost Compensation
                      <>
                        {/* Selected Blueprint Preview */}
                        {selectedBlueprint && (
                          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Using blueprint</p>
                                <p className="text-sm font-semibold text-foreground font-geist truncate">{selectedBlueprint.title}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Compensation Card */}
                        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                          <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                            <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">Compensation</h3>
                          </div>

                          <div className="p-4 space-y-4">
                            {/* Schedule Selector */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Pay frequency</Label>
                              <Select value={formData.payment_schedule} onValueChange={(value: any) => setFormData({...formData, payment_schedule: value})}>
                                <SelectTrigger className="h-10 bg-background border border-border/50 font-inter tracking-[-0.3px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Payment Amount */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                                  Payment per {formData.payment_schedule === 'weekly' ? 'week' : formData.payment_schedule === 'biweekly' ? '2 weeks' : 'month'}
                                </Label>
                                <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                                  Balance: <span className="text-foreground font-medium">${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </span>
                              </div>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-medium font-geist">$</span>
                                <Input
                                  type="number"
                                  min="10"
                                  value={formData.monthly_retainer}
                                  onChange={e => setFormData({...formData, monthly_retainer: e.target.value})}
                                  className="pl-9 h-12 border border-border/50 !bg-transparent text-xl font-semibold font-geist tracking-[-0.5px]"
                                />
                              </div>
                            </div>

                            {/* Payout Type */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Payment method</Label>
                              <div className="flex rounded-lg border border-border/50 overflow-hidden bg-muted/30">
                                <button
                                  type="button"
                                  onClick={() => setFormData({...formData, payout_type: "on_platform"})}
                                  className={cn(
                                    "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                                    formData.payout_type === "on_platform"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  On Platform
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData({...formData, payout_type: "off_platform"})}
                                  className={cn(
                                    "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                                    formData.payout_type === "off_platform"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  Off Platform
                                </button>
                              </div>
                              {formData.payout_type === "off_platform" && (
                                <p className="text-[10px] text-amber-500 font-inter tracking-[-0.3px]">
                                  You'll be responsible for paying creators directly outside of Virality.
                                </p>
                              )}
                            </div>

                            {/* Who Posts the Video */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Who will post the videos?</Label>
                              <div className="flex rounded-lg border border-border/50 overflow-hidden bg-muted/30">
                                <button
                                  type="button"
                                  onClick={() => setFormData({...formData, content_distribution: "creators_own_page"})}
                                  className={cn(
                                    "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                                    formData.content_distribution === "creators_own_page"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  Creator
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData({...formData, content_distribution: "brand_accounts"})}
                                  className={cn(
                                    "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                                    formData.content_distribution === "brand_accounts"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  Brand
                                </button>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.3px]">
                                {formData.content_distribution === "brand_accounts"
                                  ? "Creators submit raw videos via Google Drive. You post them on your brand channels."
                                  : "Creators post videos on their own accounts. You track performance."}
                              </p>
                            </div>

                            {/* Videos & Creators Row */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Videos required</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={formData.videos_per_month}
                                  onChange={e => setFormData({...formData, videos_per_month: e.target.value})}
                                  placeholder="4"
                                  className="h-10 !bg-transparent border border-border/50 font-geist tracking-[-0.3px]"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Max creators</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={formData.max_accepted_creators}
                                  onChange={e => setFormData({...formData, max_accepted_creators: e.target.value})}
                                  placeholder="5"
                                  className="h-10 !bg-transparent border border-border/50 font-geist tracking-[-0.3px]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* View Bonuses Card */}
                        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                          <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                            <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">View Bonuses</h3>
                          </div>
                          <div className="p-4">
                            <ViewBonusesConfig
                              tiers={formData.view_bonus_tiers}
                              onTiersChange={(newTiers) => setFormData({
                                ...formData,
                                view_bonus_tiers: newTiers,
                                view_bonuses_enabled: newTiers.length > 0
                              })}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      // CPM Campaign Compensation
                      <>
                        {/* Budget Card - only show in create/clone mode, not edit mode */}
                        {!isEditMode && (
                          <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                            <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                              <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">Budget</h3>
                            </div>
                            <div className="p-4 space-y-4">
                              {/* Infinite Budget Toggle */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-sm font-inter tracking-[-0.3px]">Unlimited Budget</Label>
                                  <p className="text-xs text-muted-foreground">No spending cap on this campaign</p>
                                </div>
                                <Switch
                                  checked={formData.is_infinite_budget}
                                  onCheckedChange={(checked) => setFormData({...formData, is_infinite_budget: checked})}
                                />
                              </div>

                              {/* Budget Amount */}
                              {!formData.is_infinite_budget && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Total Budget</Label>
                                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                                      Balance: <span className="text-foreground font-medium">${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </span>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-medium">$</span>
                                    <Input
                                      type="number"
                                      min="100"
                                      value={formData.budget}
                                      onChange={e => setFormData({...formData, budget: e.target.value})}
                                      className="pl-9 h-12 border border-border/50 !bg-transparent text-xl font-semibold font-geist"
                                    />
                                  </div>
                                  {formData.payout_type === "on_platform" && parseFloat(formData.budget) > availableBalance && (
                                    <p className="text-xs text-destructive">Exceeds available balance (${availableBalance.toFixed(2)})</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Payment Model Card */}
                        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                          <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                            <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">Payment Model</h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {/* Submission Model */}
                            <div className="space-y-2">
                              <div className="flex rounded-lg border border-border/50 overflow-hidden bg-muted/30">
                                <button
                                  type="button"
                                  onClick={() => setFormData({...formData, payment_model: "pay_per_view"})}
                                  className={cn(
                                    "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                                    formData.payment_model === "pay_per_view"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  Per Account
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData({...formData, payment_model: "pay_per_post"})}
                                  className={cn(
                                    "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                                    formData.payment_model === "pay_per_post"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  Per Video
                                </button>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-inter tracking-[-0.3px]">
                                {formData.payment_model === "pay_per_view"
                                  ? "Pay creators based on total account views across all their content"
                                  : "Pay creators based on views for each individual video submitted"}
                              </p>
                            </div>

                            {/* Default CPM Rate */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Default CPM Rate</Label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  value={formData.rpm_rate}
                                  onChange={e => setFormData({...formData, rpm_rate: e.target.value})}
                                  placeholder="5"
                                  className="pl-8 h-10 border border-border/50 !bg-transparent font-geist"
                                />
                              </div>
                            </div>

                            {/* Payout Type */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Payment method</Label>
                              <div className="flex rounded-lg border border-border/50 overflow-hidden bg-muted/30">
                                <button
                                  type="button"
                                  onClick={() => setFormData({...formData, payout_type: "on_platform"})}
                                  className={cn(
                                    "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                                    formData.payout_type === "on_platform"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  On Platform
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData({...formData, payout_type: "off_platform"})}
                                  className={cn(
                                    "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                                    formData.payout_type === "off_platform"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  Off Platform
                                </button>
                              </div>
                              {formData.payout_type === "off_platform" && (
                                <p className="text-[10px] text-amber-500">
                                  You'll be responsible for paying creators directly outside of Virality.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Platform Rates */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-medium font-inter tracking-[-0.5px]">Platform Rates</Label>
                              <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.3px]">Set custom rates for each platform</p>
                            </div>
                            {getAvailablePlatforms().length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-xs font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                onClick={() => {
                                  const firstAvailable = getAvailablePlatforms()[0];
                                  if (firstAvailable) {
                                    addPlatformRate(firstAvailable.id, 'cpm', 5);
                                  }
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add Rate
                              </Button>
                            )}
                          </div>

                          {/* Configured Platform Rates */}
                          {Object.keys(platformRates).length > 0 ? (
                            <div className="grid gap-3">
                              {Object.values(platformRates).map(rate => {
                                const platformInfo = PLATFORM_OPTIONS.find(p => p.id === rate.platform);
                                const availableForSwap = PLATFORM_OPTIONS.filter(p =>
                                  (formData.platforms || []).includes(p.id) && (p.id === rate.platform || !platformRates[p.id])
                                );
                                return (
                                  <div key={rate.platform} className="group relative flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-muted/40 to-muted/20 border border-border/50 hover:border-border transition-all duration-200">
                                    {/* Platform Icon & Selector */}
                                    <div className="flex items-center gap-3 min-w-[140px]">
                                      <div className="w-9 h-9 rounded-lg bg-background/80 flex items-center justify-center border border-border/50">
                                        {platformInfo?.icon ? (
                                          <>
                                            <img src={platformInfo.iconLight} alt={platformInfo.label} className="h-4 w-4 dark:hidden" />
                                            <img src={platformInfo.icon} alt={platformInfo.label} className="h-4 w-4 hidden dark:block" />
                                          </>
                                        ) : (
                                          <span className="text-xs font-bold text-muted-foreground">X</span>
                                        )}
                                      </div>
                                      <Select
                                        value={rate.platform}
                                        onValueChange={(newPlatform) => {
                                          if (newPlatform === rate.platform) return;
                                          setPlatformRates(prev => {
                                            const { [rate.platform]: removed, ...rest } = prev;
                                            return {
                                              ...rest,
                                              [newPlatform]: { ...removed, platform: newPlatform }
                                            };
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="h-9 w-[100px] text-xs bg-background/80 border-border/50 font-medium font-inter tracking-[-0.5px]">
                                          <SelectValue>{platformInfo?.label}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableForSwap.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                              <div className="flex items-center gap-2">
                                                {p.icon && p.iconLight ? (
                                                  <>
                                                  <img src={p.iconLight} alt={p.label} className="h-4 w-4 dark:hidden" />
                                                  <img src={p.icon} alt={p.label} className="h-4 w-4 hidden dark:block" />
                                                </>
                                                ) : (
                                                  <span className="h-4 w-4 flex items-center justify-center text-xs font-bold">X</span>
                                                )}
                                                {p.label}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-8 w-px bg-border/50" />

                                    {/* Rate Configuration */}
                                    <div className="flex items-center gap-3 flex-1">
                                      <Select
                                        value={rate.type}
                                        onValueChange={(value: 'cpm' | 'per_post') => {
                                          setPlatformRates(prev => ({
                                            ...prev,
                                            [rate.platform]: {
                                              ...prev[rate.platform],
                                              type: value,
                                              ...(value === 'cpm' ? { cpm_rate: prev[rate.platform].cpm_rate || 5, post_rate: undefined } : { post_rate: prev[rate.platform].post_rate || 10, cpm_rate: undefined })
                                            }
                                          }));
                                        }}
                                      >
                                        <SelectTrigger className="h-9 w-[120px] text-xs bg-background/80 border-border/50 font-inter tracking-[-0.3px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="cpm">Per 1k views</SelectItem>
                                          <SelectItem value="per_post">Per post</SelectItem>
                                        </SelectContent>
                                      </Select>

                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                                        <Input
                                          type="number"
                                          value={rate.type === 'cpm' ? rate.cpm_rate || '' : rate.post_rate || ''}
                                          onChange={e => {
                                            const value = parseFloat(e.target.value) || 0;
                                            setPlatformRates(prev => ({
                                              ...prev,
                                              [rate.platform]: {
                                                ...prev[rate.platform],
                                                ...(rate.type === 'cpm' ? { cpm_rate: value } : { post_rate: value })
                                              }
                                            }));
                                          }}
                                          className="h-9 w-24 pl-7 text-sm font-medium bg-background/80 border-border/50 font-inter tracking-[-0.5px]"
                                          placeholder={rate.type === 'cpm' ? '5' : '10'}
                                        />
                                      </div>
                                    </div>

                                    {/* Remove Button */}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-lg"
                                      onClick={() => removePlatformRate(rate.platform)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border/50 bg-muted/10">
                              <div className="flex -space-x-2 mb-3">
                                {PLATFORM_OPTIONS.slice(0, 3).map((p, i) => (
                                  <div key={p.id} className="w-8 h-8 rounded-full bg-muted/80 dark:bg-muted flex items-center justify-center border border-border/30" style={{ zIndex: 3 - i }}>
                                    {p.icon && p.iconLight ? (
                                      <img src={p.icon} alt={p.label} className="h-4 w-4 brightness-0 opacity-40 dark:brightness-100 dark:opacity-50" />
                                    ) : (
                                      <span className="text-xs font-bold text-muted-foreground">X</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">No custom rates configured</p>
                              <p className="text-xs text-muted-foreground/60 font-inter tracking-[-0.3px] mt-0.5">Using default RPM for all platforms</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Discord Integration */}
                    {brandDiscordGuildId && (
                      <div className="space-y-3 p-4 rounded-xl bg-muted/20">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="h-4 w-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Discord Integration</Label>
                        </div>
                        <DiscordRoleSelector
                          brandId={brandId}
                          guildId={brandDiscordGuildId}
                          selectedRoleId={formData.discord_role_id}
                          onRoleChange={(roleId) => setFormData({...formData, discord_role_id: roleId})}
                        />
                      </div>
                    )}

                  </div>
                )}

                {/* Step 3: Targeting */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    {isCPMCampaign ? (
                      // CPM Campaign Targeting
                      <div className="space-y-4">
                        {/* Platforms Card */}
                        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                          <div className="px-4 py-3 border-b border-border/30">
                            <h4 className="text-sm font-medium font-inter tracking-[-0.5px]">Platforms</h4>
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mt-0.5">Select where creators can post</p>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-2 gap-2">
                              {PLATFORM_OPTIONS.map(platform => {
                                const isSelected = formData.allowed_platforms.includes(platform.id);
                                return (
                                  <button
                                    key={platform.id}
                                    type="button"
                                    onClick={() => {
                                      const newPlatforms = isSelected
                                        ? formData.allowed_platforms.filter(p => p !== platform.id)
                                        : [...formData.allowed_platforms, platform.id];
                                      setFormData({...formData, allowed_platforms: newPlatforms});
                                    }}
                                    className={cn(
                                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all font-inter tracking-[-0.3px]",
                                      isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted/50 dark:bg-muted/30 text-foreground hover:bg-muted"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-6 h-6 rounded-md flex items-center justify-center",
                                      isSelected ? "bg-white/20" : "bg-background"
                                    )}>
                                      {platform.icon && platform.iconLight ? (
                                        <>
                                        <img src={platform.iconLight} alt={platform.label} className="h-4 w-4 dark:hidden" />
                                        <img src={platform.icon} alt={platform.label} className="h-4 w-4 hidden dark:block" />
                                      </>
                                      ) : (
                                        <span className="text-xs font-bold">X</span>
                                      )}
                                    </div>
                                    <span className="flex-1 text-left">{platform.label}</span>
                                    {isSelected && <Check className="h-4 w-4" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Category Card */}
                        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                          <div className="px-4 py-3 border-b border-border/30">
                            <h4 className="text-sm font-medium font-inter tracking-[-0.5px]">Niche / Category</h4>
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mt-0.5">Target specific content categories</p>
                          </div>
                          <div className="p-4">
                            <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                              <SelectTrigger className="h-11 bg-muted/30 dark:bg-muted/20 border-0 font-inter tracking-[-0.3px]">
                                <SelectValue placeholder="Select a niche" />
                              </SelectTrigger>
                              <SelectContent>
                                {CAMPAIGN_NICHES.map(niche => (
                                  <SelectItem key={niche.id} value={niche.id}>{niche.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Requirements Card */}
                        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                          <div className="px-4 py-3 border-b border-border/30">
                            <h4 className="text-sm font-medium font-inter tracking-[-0.5px]">Requirements</h4>
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mt-0.5">Set creator eligibility criteria</p>
                          </div>
                          <div className="divide-y divide-border/30">
                            {/* Requires Application Toggle */}
                            <div className="flex items-center justify-between px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">Require Application</p>
                                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Creators must apply to join</p>
                                </div>
                              </div>
                              <Switch
                                checked={formData.requires_application}
                                onCheckedChange={(checked) => setFormData({...formData, requires_application: checked})}
                              />
                            </div>

                            {/* Audience Insights Requirement */}
                            <div className="px-4 py-3.5 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                    {/* Google Material "insights" icon */}
                                    <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M21 8c-1.45 0-2.26 1.44-1.93 2.51l-3.55 3.56c-.3-.09-.74-.09-1.04 0l-2.55-2.55C12.27 10.45 11.46 9 10 9c-1.45 0-2.27 1.44-1.93 2.52l-4.56 4.55C2.44 15.74 1 16.55 1 18c0 1.1.9 2 2 2 1.45 0 2.26-1.44 1.93-2.51l4.55-4.56c.3.09.74.09 1.04 0l2.55 2.55C12.73 16.55 13.54 18 15 18c1.45 0 2.27-1.44 1.93-2.52l3.56-3.55c1.07.33 2.51-.48 2.51-1.93 0-1.1-.9-2-2-2z"/>
                                      <path d="M15 9l.94-2.07L18 6l-2.06-.93L15 3l-.92 2.07L12 6l2.08.93z"/>
                                      <path d="M3.5 11L4 9l2-.5L4 8l-.5-2L3 8l-2 .5L3 9z"/>
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium font-inter tracking-[-0.3px]">Require Audience Insights</p>
                                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Only verified creators can apply</p>
                                  </div>
                                </div>
                                <Switch
                                  checked={formData.require_audience_insights}
                                  onCheckedChange={(checked) => setFormData({...formData, require_audience_insights: checked})}
                                />
                              </div>
                              {formData.require_audience_insights && (
                                <div className="pl-11 space-y-1.5">
                                  <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Minimum Score</Label>
                                  <Select
                                    value={formData.min_insights_score.toString()}
                                    onValueChange={(value) => setFormData({...formData, min_insights_score: parseInt(value)})}
                                  >
                                    <SelectTrigger className="h-10 bg-muted/30 dark:bg-muted/20 border-0 font-inter tracking-[-0.3px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="40">40% (Low)</SelectItem>
                                      <SelectItem value="60">60% (Medium)</SelectItem>
                                      <SelectItem value="80">80% (High)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>

                            {/* Require Phone Number */}
                            <div className="flex items-center justify-between px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                  <Icon icon="material-symbols:phone-enabled-outline" className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">Require Phone Number</p>
                                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Creators must have a verified phone</p>
                                </div>
                              </div>
                              <Switch
                                checked={formData.require_phone_number}
                                onCheckedChange={(checked) => setFormData({...formData, require_phone_number: checked})}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Boost Targeting
                      <>
                        {/* Experience Level & Content Type */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-foreground font-inter tracking-[-0.3px]">Experience Level</Label>
                            <Select value={formData.experience_level} onValueChange={(value: any) => setFormData({...formData, experience_level: value})}>
                              <SelectTrigger className="h-11 bg-muted/30 border-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any Level</SelectItem>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-foreground font-inter tracking-[-0.3px]">Content Format</Label>
                            <Select value={formData.content_type} onValueChange={(value: any) => setFormData({...formData, content_type: value})}>
                              <SelectTrigger className="h-11 bg-muted/30 border-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="both">Any Format</SelectItem>
                                <SelectItem value="short_form">Short Form</SelectItem>
                                <SelectItem value="long_form">Long Form</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Categories */}
                        <div className="space-y-2">
                          <Label className="text-xs text-foreground font-inter tracking-[-0.3px]">Categories / Niches</Label>
                          <div className="flex gap-2">
                            <Input
                              value={categoryInput}
                              onChange={(e) => setCategoryInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const trimmed = categoryInput.trim();
                                  if (trimmed && !formData.categories.includes(trimmed)) {
                                    setFormData({...formData, categories: [...formData.categories, trimmed]});
                                    setCategoryInput("");
                                  }
                                }
                              }}
                              placeholder="Add category..."
                              className="h-10 bg-muted/30 border-0 flex-1"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-10 px-3"
                              disabled={!categoryInput.trim()}
                              onClick={() => {
                                const trimmed = categoryInput.trim();
                                if (trimmed && !formData.categories.includes(trimmed)) {
                                  setFormData({...formData, categories: [...formData.categories, trimmed]});
                                  setCategoryInput("");
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {CATEGORY_SUGGESTIONS.filter(c => !formData.categories.includes(c)).slice(0, 8).map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setFormData({...formData, categories: [...formData.categories, cat]})}
                                className="px-2.5 py-1 text-xs rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                + {cat}
                              </button>
                            ))}
                          </div>
                          {formData.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {formData.categories.map((cat, index) => (
                                <Badge key={index} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1 text-xs">
                                  {cat}
                                  <button
                                    type="button"
                                    onClick={() => setFormData({...formData, categories: formData.categories.filter((_, i) => i !== index)})}
                                    className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Skills */}
                        <div className="space-y-2">
                          <Label className="text-xs text-foreground font-inter tracking-[-0.3px]">Skills Needed</Label>
                          <div className="flex gap-2">
                            <Input
                              value={skillInput}
                              onChange={(e) => setSkillInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const trimmed = skillInput.trim();
                                  if (trimmed && !formData.skills.includes(trimmed)) {
                                    setFormData({...formData, skills: [...formData.skills, trimmed]});
                                    setSkillInput("");
                                  }
                                }
                              }}
                              placeholder="Add skill..."
                              className="h-10 bg-muted/30 border-0 flex-1"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-10 px-3"
                              disabled={!skillInput.trim()}
                              onClick={() => {
                                const trimmed = skillInput.trim();
                                if (trimmed && !formData.skills.includes(trimmed)) {
                                  setFormData({...formData, skills: [...formData.skills, trimmed]});
                                  setSkillInput("");
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {SKILL_SUGGESTIONS.filter(s => !formData.skills.includes(s)).slice(0, 6).map((skill) => (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => setFormData({...formData, skills: [...formData.skills, skill]})}
                                className="px-2.5 py-1 text-xs rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                + {skill}
                              </button>
                            ))}
                          </div>
                          {formData.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {formData.skills.map((skill, index) => (
                                <Badge key={index} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1 text-xs">
                                  {skill}
                                  <button
                                    type="button"
                                    onClick={() => setFormData({...formData, skills: formData.skills.filter((_, i) => i !== index)})}
                                    className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 4: Details */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Title</Label>
                      <Input
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder={isBoost ? "e.g., Monthly Content Creator" : "e.g., Summer Campaign 2024"}
                        className="h-11 bg-muted/30 border-0"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Describe what this entails..."
                        className="min-h-[90px] bg-muted/30 border-0 resize-none"
                      />
                    </div>

                    {/* Banner Image */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Banner Image</Label>
                      {bannerPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-border/50">
                          <img
                            src={bannerPreview}
                            alt="Banner preview"
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-8"
                            >
                              Change
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={removeBanner}
                              className="h-8"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-32 rounded-xl border-2 border-dashed border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-colors flex flex-col items-center justify-center gap-2"
                        >
                          <ImagePlus className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Click to upload banner</span>
                        </button>
                      )}
                    </div>

                    {/* Application Questions - Only show when requires_application is enabled */}
                    {formData.requires_application && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Application Questions</Label>
                          <span className="text-xs text-muted-foreground">(Optional)</span>
                        </div>
                        <ApplicationQuestionsEditor
                          questions={formData.application_questions}
                          onChange={(questions) => setFormData({...formData, application_questions: questions})}
                          maxQuestions={10}
                        />
                      </div>
                    )}

                    {/* Hashtags (CPM only) */}
                    {isCPMCampaign && (
                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Tracking Hashtags</Label>
                        <div className="flex gap-2">
                          <Input
                            value={hashtagInput}
                            onChange={(e) => setHashtagInput(e.target.value.replace(/^#/, ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = hashtagInput.trim().replace(/^#/, '');
                                if (trimmed && !formData.hashtags.includes(trimmed)) {
                                  setFormData({...formData, hashtags: [...formData.hashtags, trimmed]});
                                  setHashtagInput("");
                                }
                              }
                            }}
                            placeholder="Add hashtag..."
                            className="h-10 bg-muted/30 border-0 flex-1"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-10 px-3"
                            disabled={!hashtagInput.trim()}
                            onClick={() => {
                              const trimmed = hashtagInput.trim().replace(/^#/, '');
                              if (trimmed && !formData.hashtags.includes(trimmed)) {
                                setFormData({...formData, hashtags: [...formData.hashtags, trimmed]});
                                setHashtagInput("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {formData.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {formData.hashtags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1 gap-1 text-xs">
                                #{tag}
                                <button
                                  type="button"
                                  onClick={() => setFormData({...formData, hashtags: formData.hashtags.filter((_, i) => i !== index)})}
                                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}

                {/* Step 5: Review */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    {/* Preview Card - Different styles for Campaign vs Boost */}
                    {isBoost ? (
                      /* Boost Card Style */
                      <div className="rounded-xl border border-border/60 bg-transparent overflow-hidden">
                        <div className="p-4 space-y-3">
                          <h3 className="text-[15px] font-semibold leading-tight line-clamp-2 text-foreground tracking-[-0.3px]">
                            {formData.title || 'Untitled'}
                          </h3>
                          {formData.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 font-inter tracking-[-0.3px]">
                              {formData.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-inter tracking-[-0.5px]">
                              <span className="text-foreground font-medium">${formData.monthly_retainer || '0'}</span>/mo
                            </span>
                            <span className="text-border">·</span>
                            <span className="font-inter tracking-[-0.5px]">
                              <span className="text-foreground font-medium">{formData.videos_per_month || '0'}</span> videos
                            </span>
                            <span className="text-border">·</span>
                            <span className="font-inter tracking-[-0.5px]">
                              <span className="text-foreground font-medium">
                                ${(parseInt(formData.videos_per_month, 10) || 0) > 0
                                  ? ((parseFloat(formData.monthly_retainer) || 0) / (parseInt(formData.videos_per_month, 10) || 1)).toFixed(0)
                                  : '0'}
                              </span>/video
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-inter tracking-[-0.5px]">
                            <span className="text-xs text-muted-foreground">
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formData.max_accepted_creators || '0'}</span> spots available
                            </span>
                          </div>
                        </div>
                        <div className="px-3 py-2 bg-muted/40 dark:bg-[#0f0f0f] border-t border-border/40 flex items-center gap-2">
                          {brandLogoUrl ? (
                            <div className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0 bg-background">
                              <img src={brandLogoUrl} alt={brandName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-semibold text-primary">
                                {brandName?.charAt(0) || "B"}
                              </span>
                            </div>
                          )}
                          <span className="font-inter tracking-[-0.5px] text-xs font-medium text-foreground truncate">
                            {brandName}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Campaign Card Style - Matching CampaignCard component */
                      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                        {/* Banner */}
                        <div className="relative w-full aspect-[21/9]">
                          {bannerPreview ? (
                            <img
                              src={bannerPreview}
                              alt={formData.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="absolute inset-0 w-full h-full flex items-center justify-center"
                              style={{ backgroundColor: '#1a1a1a' }}
                            >
                              {brandLogoUrl && (
                                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
                                  <img
                                    src={brandLogoUrl}
                                    alt={brandName}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-3 space-y-2.5 font-inter" style={{ letterSpacing: '-0.5px' }}>
                          {/* Title with Status */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2 flex-1">
                              {formData.title || 'Untitled'}
                            </h3>
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium shrink-0 bg-muted text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                              Draft
                            </div>
                          </div>

                          {/* Brand Info */}
                          <div className="flex items-center gap-1.5">
                            {brandLogoUrl && (
                              <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                                <img
                                  src={brandLogoUrl}
                                  alt={brandName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground truncate">
                              {brandName}
                            </span>
                          </div>

                          {/* Budget Progress */}
                          <div className="pt-1">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {formData.is_infinite_budget ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">∞ Unlimited</span>
                                ) : (
                                  <>
                                    <span className="text-foreground font-semibold">$0</span>
                                    <span className="text-muted-foreground"> / ${parseFloat(formData.budget) || 0}</span>
                                  </>
                                )}
                              </span>
                            </div>
                            {!formData.is_infinite_budget && (
                              <Progress value={0} className="h-1.5 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Budget Summary */}
                    <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border/30">
                        <h4 className="text-sm font-medium font-inter tracking-[-0.5px]">Budget Summary</h4>
                      </div>
                      <div className="p-4 space-y-3">
                        {isBoost ? (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground font-inter tracking-[-0.3px]">Payment per creator</span>
                              <span className="font-medium font-geist tracking-[-0.3px]">${parseFloat(formData.monthly_retainer) || 0}/{formData.payment_schedule === 'monthly' ? 'mo' : formData.payment_schedule === 'weekly' ? 'wk' : formData.payment_schedule === 'bi_weekly' ? '2wk' : 'mo'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground font-inter tracking-[-0.3px]">Max creators</span>
                              <span className="font-medium font-geist tracking-[-0.3px]">{parseInt(formData.max_accepted_creators, 10) || 0}</span>
                            </div>
                            <div className="h-px bg-border/50" />
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-foreground font-medium font-inter tracking-[-0.3px]">Total budget needed</span>
                              <span className="font-bold font-geist tracking-[-0.3px] text-primary">
                                ${((parseFloat(formData.monthly_retainer) || 0) * (parseInt(formData.max_accepted_creators, 10) || 0)).toLocaleString('en-US', { minimumFractionDigits: 0 })}/{formData.payment_schedule === 'monthly' ? 'mo' : formData.payment_schedule === 'weekly' ? 'wk' : formData.payment_schedule === 'bi_weekly' ? '2wk' : 'mo'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground font-inter tracking-[-0.3px]">Campaign budget</span>
                              <span className="font-medium font-geist tracking-[-0.3px]">{formData.is_infinite_budget ? 'Unlimited' : `$${parseFloat(formData.budget) || 0}`}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground font-inter tracking-[-0.3px]">CPM rate</span>
                              <span className="font-medium font-geist tracking-[-0.3px]">${formData.rpm_rate || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground font-inter tracking-[-0.3px]">Platforms</span>
                              <span className="font-medium font-geist tracking-[-0.3px]">{formData.allowed_platforms.join(', ') || 'None'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Schedule (Boost only) */}
                    {isBoost && (
                      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-border/30">
                          <h4 className="text-sm font-medium font-inter tracking-[-0.5px]">Schedule</h4>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Start Date</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" className={cn("w-full h-11 justify-start text-left font-normal bg-muted/30 hover:bg-muted/50", !formData.start_date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span className="text-sm">
                                      {formData.start_date ? format(formData.start_date, "MMM d, yyyy") : "Optional"}
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar mode="single" selected={formData.start_date} onSelect={date => setFormData({...formData, start_date: date})} initialFocus />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">End Date</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" className={cn("w-full h-11 justify-start text-left font-normal bg-muted/30 hover:bg-muted/50", !formData.end_date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span className="text-sm">
                                      {formData.end_date ? format(formData.end_date, "MMM d, yyyy") : "Optional"}
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar mode="single" selected={formData.end_date} onSelect={date => setFormData({...formData, end_date: date})} disabled={date => formData.start_date ? date < formData.start_date : false} initialFocus />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-between bg-background border-t border-border/50">
            <div className="flex items-center gap-2">
              {/* Show Back button only if not on first step */}
              {currentStep > (skipTypeStep ? 2 : 1) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="font-inter tracking-[-0.5px]"
                >
                  Back
                </Button>
              )}

            </div>

            <div className="flex items-center gap-2">
              {currentStep < 5 ? (
                <Button type="button" size="sm" onClick={handleNext} className="min-w-[100px] font-inter tracking-[-0.5px]">
                  Continue
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={handleSubmit} disabled={creating} className="min-w-[100px] font-inter tracking-[-0.5px]">
                  {creating ? "Saving..." : isEditMode ? "Save Changes" : isBoost ? "Create Boost" : "Create Campaign"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
