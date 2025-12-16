import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, Target, TrendingUp, ArrowRight, Bookmark, Upload, X, Check, ExternalLink, Hash, Trash2, Copy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import { useAdminCheck } from "@/hooks/useAdminCheck";
const CAMPAIGN_NICHES = [
  { id: 'tech', label: 'Tech & Software' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'fashion', label: 'Fashion & Beauty' },
  { id: 'finance', label: 'Finance & Crypto' },
  { id: 'creative', label: 'Art & Creative' },
  { id: 'music', label: 'Music & Audio' },
  { id: 'photography', label: 'Photography' },
  { id: 'education', label: 'Education' },
  { id: 'travel', label: 'Travel' },
  { id: 'fitness', label: 'Health & Fitness' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'parenting', label: 'Parenting & Family' },
  { id: 'pets', label: 'Pets & Animals' },
  { id: 'home', label: 'Home & Garden' },
  { id: 'auto', label: 'Automotive' },
  { id: 'luxury', label: 'Luxury & Premium' },
  { id: 'ecommerce', label: 'E-commerce & Retail' },
];

const PAYOUT_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const campaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  goal: z.enum(["attention", "leads", "conversions"]).optional(),
  description: z.string().trim().max(2000).optional(),
  campaign_type: z.string().optional(),
  category: z.string().optional(),
  is_infinite_budget: z.boolean().default(false),
  budget: z.string().optional(),
  rpm_rate: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "CPM rate must be a positive number"
  }),
  embed_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  preview_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  allowed_platforms: z.array(z.string()).min(1, "Select at least one platform"),
  is_private: z.boolean().default(false),
  access_code: z.string().trim().optional(),
  requires_application: z.boolean().default(true),
  hashtags: z.array(z.string()).default([]),
  application_questions: z.array(z.string().trim().min(1)).max(5, "Maximum 5 questions allowed").default([]),
  payout_day_of_week: z.number().min(0).max(6).default(2)
}).refine(data => {
  if (data.is_private) {
    return data.access_code && data.access_code.length >= 6;
  }
  return true;
}, {
  message: "Access code must be at least 6 characters",
  path: ["access_code"]
}).refine(data => {
  if (!data.is_infinite_budget) {
    return data.budget && !isNaN(Number(data.budget)) && Number(data.budget) > 0;
  }
  return true;
}, {
  message: "Budget must be a positive number",
  path: ["budget"]
});
type CampaignFormValues = z.infer<typeof campaignSchema>;

interface Blueprint {
  id: string;
  title: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  campaign_type?: string | null;
  category?: string | null;
  budget: number;
  budget_used?: number;
  rpm_rate: number;
  guidelines: string | null;
  banner_url: string | null;
  allowed_platforms: string[];
  slug?: string;
  embed_url?: string | null;
  preview_url?: string | null;
  is_private?: boolean;
  access_code?: string | null;
  requires_application?: boolean;
  status?: string;
  is_infinite_budget?: boolean;
  hashtags?: string[] | null;
  asset_links?: {
    label: string;
    url: string;
  }[] | null;
  requirements?: string[] | null;
  application_questions?: string[] | null;
  payout_day_of_week?: number | null;
  blueprint_id?: string | null;
}
interface CampaignCreationWizardProps {
  brandId: string;
  brandName: string;
  brandLogoUrl?: string;
  onSuccess?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign;
  onDelete?: () => void;
  initialBlueprintId?: string;
}
const STEPS = [{
  id: 1,
  label: "Budget & Targeting"
}, {
  id: 2,
  label: "Campaign Details"
}];
export function CampaignCreationWizard({
  brandId,
  brandName,
  brandLogoUrl,
  onSuccess,
  open,
  onOpenChange,
  campaign,
  onDelete,
  initialBlueprintId
}: CampaignCreationWizardProps) {
  const isEditMode = !!campaign;
  const [currentStep, setCurrentStep] = useState(isEditMode ? 2 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(campaign?.banner_url || null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shortimizeApiKey, setShortimizeApiKey] = useState("");
  const [manualBudgetUsed, setManualBudgetUsed] = useState<string>("");
  const [isAdjustingBudget, setIsAdjustingBudget] = useState(false);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(campaign?.blueprint_id || initialBlueprintId || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isAdmin
  } = useAdminCheck();

  // Initialize manual budget used with current value
  useEffect(() => {
    if (campaign?.budget_used !== undefined) {
      setManualBudgetUsed(campaign.budget_used.toString());
    }
  }, [campaign?.budget_used]);
  const handleManualBudgetAdjustment = async () => {
    if (!campaign?.id || !manualBudgetUsed) return;
    const newBudgetUsed = parseFloat(manualBudgetUsed);
    if (isNaN(newBudgetUsed) || newBudgetUsed < 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    const oldBudgetUsed = campaign.budget_used || 0;
    const difference = newBudgetUsed - oldBudgetUsed;
    if (difference === 0) {
      toast.info("No change in budget used");
      return;
    }
    setIsAdjustingBudget(true);
    try {
      // Update the campaign budget_used
      const {
        error: updateError
      } = await supabase.from('campaigns').update({
        budget_used: newBudgetUsed
      }).eq('id', campaign.id);
      if (updateError) throw updateError;

      // Record the adjustment as a transaction
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const {
        error: txError
      } = await supabase.from('wallet_transactions').insert({
        user_id: user?.id,
        amount: difference,
        type: 'balance_correction',
        status: 'completed',
        description: `Manual budget adjustment for ${campaign.title}`,
        created_by: user?.id,
        metadata: {
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          old_budget_used: oldBudgetUsed,
          new_budget_used: newBudgetUsed,
          adjustment_type: 'manual_budget_update'
        }
      });
      if (txError) throw txError;
      toast.success(`Budget used updated: $${oldBudgetUsed.toFixed(2)} → $${newBudgetUsed.toFixed(2)}`);
      onSuccess?.();
    } catch (error: any) {
      console.error('Budget adjustment error:', error);
      toast.error(error.message || 'Failed to adjust budget');
    } finally {
      setIsAdjustingBudget(false);
    }
  };
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: campaign?.title || "",
      goal: campaign?.category as "attention" | "leads" | "conversions" || "attention",
      description: campaign?.description || "",
      campaign_type: campaign?.campaign_type || "clipping",
      category: campaign?.category || "",
      is_infinite_budget: campaign?.is_infinite_budget || false,
      budget: campaign?.budget?.toString() || "",
      rpm_rate: campaign?.rpm_rate?.toString() || "5",
      embed_url: campaign?.embed_url || "",
      preview_url: campaign?.preview_url || "",
      allowed_platforms: campaign?.allowed_platforms || ["tiktok", "instagram"],
      is_private: campaign?.is_private || false,
      access_code: campaign?.access_code || "",
      requires_application: campaign?.requires_application !== false,
      hashtags: campaign?.hashtags || [],
      application_questions: campaign?.application_questions || [],
      payout_day_of_week: campaign?.payout_day_of_week ?? 2
    }
  });
  const [newQuestion, setNewQuestion] = useState("");
  const addQuestion = () => {
    if (newQuestion.trim()) {
      const currentQuestions = form.getValues("application_questions") || [];
      if (currentQuestions.length < 5) {
        form.setValue("application_questions", [...currentQuestions, newQuestion.trim()]);
        setNewQuestion("");
      }
    }
  };
  const removeQuestion = (index: number) => {
    const currentQuestions = form.getValues("application_questions") || [];
    form.setValue("application_questions", currentQuestions.filter((_, i) => i !== index));
  };
  // Reset form when campaign changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: campaign?.title || "",
        goal: campaign?.category as "attention" | "leads" | "conversions" || "attention",
        description: campaign?.description || "",
        campaign_type: campaign?.campaign_type || "clipping",
        category: campaign?.category || "",
        is_infinite_budget: campaign?.is_infinite_budget || false,
        budget: campaign?.budget?.toString() || "",
        rpm_rate: campaign?.rpm_rate?.toString() || "5",
        embed_url: campaign?.embed_url || "",
        preview_url: campaign?.preview_url || "",
        allowed_platforms: campaign?.allowed_platforms || ["tiktok", "instagram"],
        is_private: campaign?.is_private || false,
        access_code: campaign?.access_code || "",
        requires_application: campaign?.requires_application !== false,
        hashtags: campaign?.hashtags || [],
        application_questions: campaign?.application_questions || [],
        payout_day_of_week: campaign?.payout_day_of_week ?? 2
      });
      setBannerPreview(campaign?.banner_url || null);
      setCurrentStep(isEditMode ? 2 : 1);
      setNewQuestion("");
    }
  }, [open, campaign]);

  // Load brand's shortimize API key
  useEffect(() => {
    const loadShortimizeApiKey = async () => {
      if (open && brandId && isAdmin) {
        const {
          data
        } = await supabase.from('brands').select('shortimize_api_key').eq('id', brandId).single();
        setShortimizeApiKey(data?.shortimize_api_key || "");
      }
    };
    loadShortimizeApiKey();
  }, [open, brandId, isAdmin]);

  // Load brand's blueprints
  useEffect(() => {
    const loadBlueprints = async () => {
      if (open && brandId) {
        const { data } = await supabase
          .from('blueprints')
          .select('id, title')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false });
        setBlueprints(data || []);
      }
    };
    loadBlueprints();
  }, [open, brandId]);

  // Reset selected blueprint when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedBlueprintId(campaign?.blueprint_id || initialBlueprintId || null);
    }
  }, [open, campaign?.blueprint_id, initialBlueprintId]);
  const watchedValues = form.watch();
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
  const uploadBanner = async (): Promise<string | null> => {
    if (!bannerFile) return campaign?.banner_url || null;
    const fileExt = bannerFile.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    const {
      error: uploadError
    } = await supabase.storage.from("campaign-banners").upload(filePath, bannerFile);
    if (uploadError) throw uploadError;
    const {
      data: {
        publicUrl
      }
    } = supabase.storage.from("campaign-banners").getPublicUrl(filePath);
    return publicUrl;
  };
  const handleNext = async () => {
    if (currentStep === 1) {
      const isValid = await form.trigger(["budget", "rpm_rate", "allowed_platforms"]);
      if (isValid) setCurrentStep(2);
    }
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const values = form.getValues();
      const bannerUrl = await uploadBanner();
      const {
        data: brandData
      } = await supabase.from('brands').select('logo_url').eq('id', brandId).single();
      const generateSlug = (title: string) => {
        const baseSlug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() || 'untitled';
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        return `${baseSlug}-${randomSuffix}`;
      };
      const campaignData = {
        title: values.title || "Untitled Campaign",
        description: values.description || null,
        campaign_type: values.campaign_type || "clipping",
        category: values.category || null,
        is_infinite_budget: values.is_infinite_budget,
        budget: values.is_infinite_budget ? 0 : Number(values.budget) || 0,
        rpm_rate: Number(values.rpm_rate) || 5,
        embed_url: values.embed_url || null,
        preview_url: values.preview_url || null,
        brand_id: brandId,
        brand_name: brandName,
        brand_logo_url: brandData?.logo_url || null,
        banner_url: bannerUrl,
        status: "draft",
        allowed_platforms: values.allowed_platforms,
        application_questions: [],
        slug: generateSlug(values.title || "untitled"),
        is_private: values.is_private,
        access_code: values.is_private ? values.access_code?.toUpperCase() : null,
        requires_application: values.requires_application,
        is_featured: false,
        hashtags: values.hashtags || []
      };
      const {
        error
      } = await supabase.from("campaigns").insert(campaignData);
      if (error) throw error;

      // Save shortimize API key to brand if admin
      if (isAdmin && shortimizeApiKey) {
        await supabase.from("brands").update({
          shortimize_api_key: shortimizeApiKey
        }).eq("id", brandId);
      }
      toast.success("Campaign saved as draft!");
      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
      setBannerFile(null);
      setBannerPreview(null);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const onSubmit = async (values: CampaignFormValues) => {
    console.log('Form submitted with values:', values);
    setIsSubmitting(true);
    try {
      const bannerUrl = await uploadBanner();
      const {
        data: brandData
      } = await supabase.from('brands').select('logo_url').eq('id', brandId).single();
      if (isEditMode && campaign) {
        // Update existing campaign - only include editable fields
        const updateData = {
          title: values.title,
          description: values.description || null,
          campaign_type: values.campaign_type || "clipping",
          category: values.category || null,
          is_infinite_budget: values.is_infinite_budget,
          budget: values.is_infinite_budget ? 0 : Number(values.budget) || 0,
          rpm_rate: Number(values.rpm_rate) || 5,
          embed_url: values.embed_url || null,
          preview_url: values.preview_url || null,
          allowed_platforms: values.allowed_platforms,
          is_private: values.is_private,
          access_code: values.is_private ? values.access_code?.toUpperCase() : null,
          requires_application: values.requires_application,
          hashtags: values.hashtags || [],
          application_questions: values.application_questions || [],
          payout_day_of_week: values.payout_day_of_week,
          blueprint_id: selectedBlueprintId || null,
          ...(bannerFile ? {
            banner_url: bannerUrl
          } : {})
        };
        console.log('Updating campaign with data:', updateData);
        const {
          data,
          error
        } = await supabase.from("campaigns").update(updateData).eq("id", campaign.id).select();
        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
        console.log('Campaign updated successfully:', data);
        toast.success("Campaign updated successfully!");
      } else {
        // Create new campaign
        const slug = (() => {
          const baseSlug = values.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
          const randomSuffix = Math.random().toString(36).substring(2, 10);
          return `${baseSlug}-${randomSuffix}`;
        })();
        const insertData = {
          title: values.title,
          description: values.description || null,
          campaign_type: values.campaign_type || "clipping",
          category: values.category || null,
          is_infinite_budget: values.is_infinite_budget,
          budget: values.is_infinite_budget ? 0 : Number(values.budget) || 0,
          rpm_rate: Number(values.rpm_rate) || 5,
          embed_url: values.embed_url || null,
          preview_url: values.preview_url || null,
          allowed_platforms: values.allowed_platforms,
          is_private: values.is_private,
          access_code: values.is_private ? values.access_code?.toUpperCase() : null,
          requires_application: values.requires_application,
          hashtags: values.hashtags || [],
          application_questions: values.application_questions || [],
          payout_day_of_week: values.payout_day_of_week,
          banner_url: bannerUrl,
          brand_id: brandId,
          brand_name: brandName,
          brand_logo_url: brandData?.logo_url || null,
          status: "active",
          slug: slug,
          is_featured: false,
          blueprint_id: selectedBlueprintId || initialBlueprintId || null
        };
        const {
          error
        } = await supabase.from("campaigns").insert(insertData);
        if (error) throw error;
        toast.success("Campaign created successfully!");
      }

      // Save shortimize API key to brand if admin
      if (isAdmin && shortimizeApiKey) {
        await supabase.from("brands").update({
          shortimize_api_key: shortimizeApiKey
        }).eq("id", brandId);
      }
      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
      setBannerFile(null);
      setBannerPreview(null);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error(`Failed to ${isEditMode ? "update" : "create"} campaign. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = async () => {
    if (!campaign) return;
    setIsSubmitting(true);
    try {
      const {
        error
      } = await supabase.from("campaigns").delete().eq("id", campaign.id);
      if (error) throw error;
      toast.success("Campaign deleted successfully!");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      onDelete?.();
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const getStepProgress = () => {
    return currentStep / STEPS.length * 100;
  };
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[900px] w-[95vw] max-h-[85vh] bg-background border-border p-0 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              {brandLogoUrl ? (
                <img src={brandLogoUrl} alt={brandName} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{brandName?.charAt(0) || "V"}</span>
                </div>
              )}
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-[-0.5px]">
                  {isEditMode ? "Edit Campaign" : "New Campaign"}
                </h2>
                <p className="text-xs text-muted-foreground">{brandName}</p>
              </div>
            </div>
            {!isEditMode && (
              <div className="flex items-center gap-2">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        currentStep === step.id
                          ? "bg-primary text-primary-foreground"
                          : currentStep > step.id
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        currentStep > step.id ? "bg-primary text-primary-foreground" : "bg-current/20"
                      }`}>
                        {currentStep > step.id ? <Check className="w-2.5 h-2.5" /> : step.id}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                    {index < STEPS.length - 1 && (
                      <div className={`w-8 h-px ${currentStep > step.id ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
                {/* Step 1: Budget & Targeting */}
                {currentStep === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Budget */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Budget</h3>
                      </div>

                      <FormField
                        control={form.control}
                        name="is_infinite_budget"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm text-foreground cursor-pointer">Unlimited Budget</FormLabel>
                              <p className="text-xs text-muted-foreground">No cap on spending</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {!watchedValues.is_infinite_budget && (
                        <FormField
                          control={form.control}
                          name="budget"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Total Budget</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                  <Input type="number" placeholder="10,000" className="pl-7 h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="rpm_rate"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">CPM Rate</FormLabel>
                              <span className="text-xs text-muted-foreground">per 1K views</span>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input type="number" placeholder="5" className="pl-7 h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Right Column - Platforms & Access */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                          <Target className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Targeting</h3>
                      </div>

                      <FormField
                        control={form.control}
                        name="allowed_platforms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Platforms</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                {[
                                  { id: "tiktok", label: "TikTok", logo: tiktokLogo },
                                  { id: "instagram", label: "Instagram", logo: instagramLogo },
                                  { id: "youtube", label: "YouTube", logo: youtubeLogo }
                                ].map(platform => {
                                  const isSelected = field.value.includes(platform.id);
                                  return (
                                    <button
                                      key={platform.id}
                                      type="button"
                                      onClick={() => {
                                        const newValue = isSelected
                                          ? field.value.filter(p => p !== platform.id)
                                          : [...field.value, platform.id];
                                        field.onChange(newValue);
                                      }}
                                      className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                                        isSelected
                                          ? "bg-primary/10 ring-1 ring-primary/30"
                                          : "bg-muted/30 hover:bg-muted/50"
                                      }`}
                                    >
                                      <img src={platform.logo} alt={platform.label} className="w-5 h-5 object-contain" />
                                      <span className="text-xs font-medium text-foreground">{platform.label}</span>
                                      {isSelected && (
                                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                          <Check className="w-2.5 h-2.5 text-white" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Content Niche</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30">
                                  <SelectValue placeholder="Select a niche (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CAMPAIGN_NICHES.map((niche) => (
                                  <SelectItem key={niche.id} value={niche.id}>
                                    {niche.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="is_private"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                              <FormLabel className="text-xs text-foreground cursor-pointer font-inter tracking-[-0.5px]">Private</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="requires_application"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                              <FormLabel className="text-xs text-foreground cursor-pointer font-inter tracking-[-0.5px]">Applications</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {watchedValues.is_private && (
                        <FormField
                          control={form.control}
                          name="access_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Access Code</FormLabel>
                              <FormControl>
                                <Input placeholder="BRAND2024" className="h-10 bg-muted/30 border-0 uppercase focus:ring-1 focus:ring-primary/30" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Application Questions - Full Width */}
                    {watchedValues.requires_application && (
                      <div className="md:col-span-2 pt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                            <Eye className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Application Questions</h3>
                          <span className="text-xs text-muted-foreground">({(form.watch("application_questions")?.length || 0)}/5)</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a question creators must answer..."
                            value={newQuestion}
                            onChange={e => setNewQuestion(e.target.value)}
                            className="flex-1 h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30"
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={addQuestion}
                            disabled={(form.watch("application_questions")?.length || 0) >= 5}
                            className="h-10 px-4"
                          >
                            Add
                          </Button>
                        </div>

                        {(form.watch("application_questions")?.length ?? 0) > 0 && (
                          <div className="mt-3 space-y-2">
                            {form.watch("application_questions")?.map((question, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 group">
                                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-semibold text-primary">{index + 1}</span>
                                </span>
                                <span className="text-sm flex-1 text-foreground">{question}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeQuestion(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Campaign Details */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    {/* Banner Upload - Compact */}
                    <div className="space-y-2">
                      {bannerPreview ? (
                        <div className="relative h-32 rounded-xl overflow-hidden group">
                          <img src={bannerPreview} alt="Campaign banner" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={removeBanner}
                              className="gap-2"
                            >
                              <X className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-center"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="text-center">
                            <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Upload banner image</p>
                          </div>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </div>

                    {/* Title & Description */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Campaign Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter campaign name" className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hashtags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Tracking Hashtags</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  placeholder="Add hashtag and press Enter"
                                  className="h-10 pl-8 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const input = e.currentTarget;
                                      const value = input.value.trim().replace(/^#/, '');
                                      if (value && !field.value?.includes(value)) {
                                        field.onChange([...(field.value || []), value]);
                                        input.value = '';
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </FormControl>
                            {field.value && field.value.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {field.value.map((tag: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="gap-1 text-xs">
                                    #{tag}
                                    <button
                                      type="button"
                                      onClick={() => field.onChange(field.value.filter((_: string, i: number) => i !== index))}
                                      className="ml-0.5 hover:text-destructive"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your campaign..."
                              className="min-h-[80px] bg-muted/30 border-0 resize-none focus:ring-1 focus:ring-primary/30"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Blueprint Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Blueprint</Label>
                      <Select
                        value={selectedBlueprintId || "none"}
                        onValueChange={(val) => setSelectedBlueprintId(val === "none" ? null : val)}
                      >
                        <SelectTrigger className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30">
                          <SelectValue placeholder="Select a blueprint" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No blueprint</SelectItem>
                          {blueprints.map((blueprint) => (
                            <SelectItem key={blueprint.id} value={blueprint.id}>
                              {blueprint.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Collapsible Sections */}
                    <div className="space-y-3">

                      {/* Admin-only: Shortimize API Key */}
                      {isAdmin && (
                        <div className="rounded-lg bg-muted/20 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">Shortimize Integration</span>
                            <Badge variant="outline" className="text-xs">Admin</Badge>
                          </div>
                          <Input
                            type="password"
                            placeholder="Enter Shortimize API key"
                            value={shortimizeApiKey}
                            onChange={e => setShortimizeApiKey(e.target.value)}
                            className="h-9 bg-muted/30 border-0 text-sm focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                      )}
                    </div>

                    {/* Edit Mode Options */}
                    {isEditMode && (
                      <div className="pt-4 border-t border-border space-y-4">
                        {/* Manual Budget Adjustment - Admin Only */}
                        {isAdmin && (
                          <div className="rounded-lg bg-muted/20 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">Manual Budget Adjustment</span>
                              <Badge variant="outline" className="text-xs">Admin</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">Current: ${(campaign?.budget_used || 0).toFixed(2)}</p>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={manualBudgetUsed}
                                  onChange={e => setManualBudgetUsed(e.target.value)}
                                  placeholder="New budget used"
                                  className="pl-7 h-9 bg-muted/30 border-0"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleManualBudgetAdjustment}
                                disabled={isAdjustingBudget || !manualBudgetUsed}
                                className="h-9"
                              >
                                {isAdjustingBudget ? "Saving..." : "Update"}
                              </Button>
                            </div>
                            {manualBudgetUsed && !isNaN(parseFloat(manualBudgetUsed)) && (
                              <p className="text-xs text-muted-foreground mt-1.5">
                                Change: {parseFloat(manualBudgetUsed) - (campaign?.budget_used || 0) >= 0 ? '+' : ''}
                                ${(parseFloat(manualBudgetUsed) - (campaign?.budget_used || 0)).toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Payout Day - Admin Only */}
                        {isAdmin && (
                          <FormField
                            control={form.control}
                            name="payout_day_of_week"
                            render={({ field }) => (
                              <div className="rounded-lg bg-muted/20 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">Payout Day</span>
                                  <Badge variant="outline" className="text-xs">Admin</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">Demographics due 1 day before</p>
                                <Select 
                                  onValueChange={(val) => field.onChange(parseInt(val))} 
                                  value={field.value?.toString()}
                                >
                                  <SelectTrigger className="h-9 bg-muted/30 border-0">
                                    <SelectValue placeholder="Select payout day" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PAYOUT_DAYS.map((day) => (
                                      <SelectItem key={day.value} value={day.value.toString()}>
                                        {day.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          />
                        )}

                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">Pause Campaign</span>
                            <p className="text-xs text-muted-foreground">Hide from discover</p>
                          </div>
                          <Switch
                            checked={campaign?.status === 'paused'}
                            onCheckedChange={async checked => {
                              if (!campaign?.id) return;
                              const newStatus = checked ? 'paused' : 'active';
                              const { error } = await supabase
                                .from('campaigns')
                                .update({ status: newStatus })
                                .eq('id', campaign.id);
                              if (error) {
                                toast.error('Failed to update campaign status');
                              } else {
                                toast.success(checked ? 'Campaign paused' : 'Campaign activated');
                                onSuccess?.();
                              }
                            }}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = `${window.location.origin}/join/${campaign?.slug}`;
                              navigator.clipboard.writeText(link);
                              toast.success('Invite link copied');
                            }}
                            className="gap-2"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy Link
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(true)}
                            className="gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </Form>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-background">
            {!isEditMode ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Save Draft
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {currentStep > 1 && !isEditMode && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}
              
              {currentStep < 2 && !isEditMode ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="min-w-[100px] gap-2"
                >
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    if (isEditMode) {
                      const values = form.getValues();
                      await onSubmit(values as CampaignFormValues);
                      return;
                    }
                    const isValid = await form.trigger();
                    if (!isValid) {
                      const errors = form.formState.errors;
                      const errorMessages = Object.entries(errors)
                        .map(([key, error]) => `${key}: ${error?.message}`)
                        .join(', ');
                      toast.error(`Please fix form errors: ${errorMessages}`);
                      return;
                    }
                    form.handleSubmit(onSubmit)();
                  }}
                  disabled={isSubmitting}
                  className="min-w-[100px]"
                >
                  {isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Create Campaign"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}