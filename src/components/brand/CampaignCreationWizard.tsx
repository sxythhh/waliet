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
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import { useAdminCheck } from "@/hooks/useAdminCheck";
const campaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  goal: z.enum(["attention", "leads", "conversions"]).optional(),
  description: z.string().trim().max(2000).optional(),
  campaign_type: z.string().optional(),
  is_infinite_budget: z.boolean().default(false),
  budget: z.string().optional(),
  rpm_rate: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "CPM rate must be a positive number"
  }),
  guidelines: z.string().trim().max(2000).optional(),
  embed_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  preview_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  allowed_platforms: z.array(z.string()).min(1, "Select at least one platform"),
  is_private: z.boolean().default(false),
  access_code: z.string().trim().optional(),
  requires_application: z.boolean().default(true),
  hashtags: z.array(z.string()).default([]),
  asset_links: z.array(z.object({
    label: z.string(),
    url: z.string()
  })).default([]),
  requirements: z.array(z.string()).default([]),
  application_questions: z.array(z.string().trim().min(1)).max(5, "Maximum 5 questions allowed").default([])
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
}
const STEPS = [{
  id: 1,
  label: "Your Goal"
}, {
  id: 2,
  label: "Budget & Targeting"
}, {
  id: 3,
  label: "Campaign Details"
}];
const GOALS = [{
  id: "attention",
  title: "Attention",
  description: "Focus on generating (authentic) views and impressions towards your brand/product, based on the content in your blueprint.",
  icon: Eye
}, {
  id: "leads",
  title: "Leads",
  description: "Maximizing view to lead ratio. The focus is less on going viral and more on generating lead intent and customer awareness",
  icon: Target
}, {
  id: "conversions",
  title: "Conversions",
  description: "For serious conversion-focused brands, seeking maximum ROI based on campaign spend.",
  icon: TrendingUp,
  enterprise: true
}];
export function CampaignCreationWizard({
  brandId,
  brandName,
  brandLogoUrl,
  onSuccess,
  open,
  onOpenChange,
  campaign,
  onDelete
}: CampaignCreationWizardProps) {
  const isEditMode = !!campaign;
  const [currentStep, setCurrentStep] = useState(isEditMode ? 3 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(campaign?.banner_url || null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shortimizeApiKey, setShortimizeApiKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isAdmin
  } = useAdminCheck();
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: campaign?.title || "",
      goal: campaign?.category as "attention" | "leads" | "conversions" || "attention",
      description: campaign?.description || "",
      campaign_type: campaign?.campaign_type || "clipping",
      is_infinite_budget: campaign?.is_infinite_budget || false,
      budget: campaign?.budget?.toString() || "",
      rpm_rate: campaign?.rpm_rate?.toString() || "5",
      guidelines: campaign?.guidelines || "",
      embed_url: campaign?.embed_url || "",
      preview_url: campaign?.preview_url || "",
      allowed_platforms: campaign?.allowed_platforms || ["tiktok", "instagram"],
      is_private: campaign?.is_private || false,
      access_code: campaign?.access_code || "",
      requires_application: campaign?.requires_application !== false,
      hashtags: campaign?.hashtags || [],
      asset_links: campaign?.asset_links || [],
      requirements: campaign?.requirements || [],
      application_questions: campaign?.application_questions || []
    }
  });
  const [newAssetLabel, setNewAssetLabel] = useState("");
  const [newAssetUrl, setNewAssetUrl] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const addAssetLink = () => {
    if (newAssetLabel.trim() && newAssetUrl.trim()) {
      const currentLinks = form.getValues("asset_links") || [];
      form.setValue("asset_links", [...currentLinks, {
        label: newAssetLabel.trim(),
        url: newAssetUrl.trim()
      }]);
      setNewAssetLabel("");
      setNewAssetUrl("");
    }
  };
  const removeAssetLink = (index: number) => {
    const currentLinks = form.getValues("asset_links") || [];
    form.setValue("asset_links", currentLinks.filter((_, i) => i !== index));
  };
  const addRequirement = () => {
    if (newRequirement.trim()) {
      const currentReqs = form.getValues("requirements") || [];
      form.setValue("requirements", [...currentReqs, newRequirement.trim()]);
      setNewRequirement("");
    }
  };
  const removeRequirement = (index: number) => {
    const currentReqs = form.getValues("requirements") || [];
    form.setValue("requirements", currentReqs.filter((_, i) => i !== index));
  };
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
        is_infinite_budget: campaign?.is_infinite_budget || false,
        budget: campaign?.budget?.toString() || "",
        rpm_rate: campaign?.rpm_rate?.toString() || "5",
        guidelines: campaign?.guidelines || "",
        embed_url: campaign?.embed_url || "",
        preview_url: campaign?.preview_url || "",
        allowed_platforms: campaign?.allowed_platforms || ["tiktok", "instagram"],
        is_private: campaign?.is_private || false,
        access_code: campaign?.access_code || "",
        requires_application: campaign?.requires_application !== false,
        hashtags: campaign?.hashtags || [],
        asset_links: campaign?.asset_links || [],
        requirements: campaign?.requirements || [],
        application_questions: campaign?.application_questions || []
      });
      setBannerPreview(campaign?.banner_url || null);
      setCurrentStep(isEditMode ? 3 : 1);
      setNewAssetLabel("");
      setNewAssetUrl("");
      setNewRequirement("");
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
  const watchedValues = form.watch();
  const selectedGoal = GOALS.find(g => g.id === watchedValues.goal);
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
      const isValid = await form.trigger("goal");
      if (isValid) setCurrentStep(2);
    } else if (currentStep === 2) {
      const isValid = await form.trigger(["budget", "rpm_rate", "allowed_platforms"]);
      if (isValid) setCurrentStep(3);
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
        category: values.goal,
        is_infinite_budget: values.is_infinite_budget,
        budget: values.is_infinite_budget ? 0 : Number(values.budget) || 0,
        rpm_rate: Number(values.rpm_rate) || 5,
        guidelines: values.guidelines || null,
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
          category: values.goal || null,
          is_infinite_budget: values.is_infinite_budget,
          budget: values.is_infinite_budget ? 0 : Number(values.budget) || 0,
          rpm_rate: Number(values.rpm_rate) || 5,
          guidelines: values.guidelines || null,
          embed_url: values.embed_url || null,
          preview_url: values.preview_url || null,
          allowed_platforms: values.allowed_platforms,
          is_private: values.is_private,
          access_code: values.is_private ? values.access_code?.toUpperCase() : null,
          requires_application: values.requires_application,
          hashtags: values.hashtags || [],
          asset_links: values.asset_links || [],
          requirements: values.requirements || [],
          application_questions: values.application_questions || [],
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
          category: values.goal || null,
          is_infinite_budget: values.is_infinite_budget,
          budget: values.is_infinite_budget ? 0 : Number(values.budget) || 0,
          rpm_rate: Number(values.rpm_rate) || 5,
          guidelines: values.guidelines || null,
          embed_url: values.embed_url || null,
          preview_url: values.preview_url || null,
          allowed_platforms: values.allowed_platforms,
          is_private: values.is_private,
          access_code: values.is_private ? values.access_code?.toUpperCase() : null,
          requires_application: values.requires_application,
          hashtags: values.hashtags || [],
          asset_links: values.asset_links || [],
          requirements: values.requirements || [],
          application_questions: values.application_questions || [],
          banner_url: bannerUrl,
          brand_id: brandId,
          brand_name: brandName,
          brand_logo_url: brandData?.logo_url || null,
          status: "active",
          slug: slug,
          is_featured: false
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
        <DialogContent className="max-w-[1400px] w-[95vw] max-h-[90vh] bg-white dark:bg-[#0a0a0a] border-border p-0 overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] flex-1 min-h-0 overflow-hidden">
            {/* Left Column - Main Content */}
            <div className="flex flex-col min-h-0 overflow-hidden">
              {/* Main Form Area */}
              <div className="flex-1 overflow-y-auto px-8 py-[20px] lg:px-[30px]">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto">
                    {/* Step 1: Goal Selection */}
                    {currentStep === 1 && <div className="space-y-8">
                        <div className="text-center mb-10">
                          <h1 className="text-2xl font-bold text-foreground mb-2">
                            Select Your Campaign Goal
                          </h1>
                          <p className="text-muted-foreground text-sm">
                            Select the marketing objective that best fits your business goals.
                          </p>
                        </div>

                        <FormField control={form.control} name="goal" render={({
                      field
                    }) => <FormItem>
                            <FormControl>
                              <div className="space-y-3">
                                {GOALS.map(goal => <button key={goal.id} type="button" onClick={() => field.onChange(goal.id)} className={`w-full flex items-start gap-4 p-5 rounded-xl border text-left transition-all ${field.value === goal.id ? "border-border bg-card" : "border-border hover:border-muted-foreground/30 bg-card"}`}>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${field.value === goal.id ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                                      {field.value === goal.id && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-base text-foreground tracking-[-0.5px]" style={{
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                          {goal.title}
                                        </h3>
                                        {goal.enterprise && <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs tracking-[-0.5px]" style={{
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                            Enterprise
                                          </Badge>}
                                      </div>
                                      <p className="text-sm text-muted-foreground leading-relaxed tracking-[-0.3px]" style={{
                                fontFamily: 'Inter, sans-serif'
                              }}>
                                        {goal.description}
                                      </p>
                                    </div>
                                  </button>)}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      </div>}

                    {/* Step 2: Budget & Targeting */}
                    {currentStep === 2 && <div className="space-y-6">
                        {/* Budget Section */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-foreground tracking-[-0.5px]" style={{
                        fontFamily: 'Inter, sans-serif'
                      }}>Budget Settings</h3>
                          
                          <FormField control={form.control} name="is_infinite_budget" render={({
                        field
                      }) => <FormItem className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                              <div>
                                <FormLabel className="text-foreground tracking-[-0.5px]" style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>Unlimited Budget</FormLabel>
                                <p className="text-xs text-muted-foreground tracking-[-0.3px]" style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>
                                  No cap on campaign spending
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>} />

                          {!watchedValues.is_infinite_budget && <FormField control={form.control} name="budget" render={({
                        field
                      }) => <FormItem>
                                <FormLabel className="text-foreground tracking-[-0.5px]" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>Total Budget ($)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="10000" className="bg-background border-border tracking-[-0.5px]" style={{
                            fontFamily: 'Inter, sans-serif'
                          }} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />}

                          <FormField control={form.control} name="rpm_rate" render={({
                        field
                      }) => <FormItem>
                              <FormLabel className="text-foreground tracking-[-0.5px]" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>CPM Rate ($)</FormLabel>
                              <p className="text-xs text-muted-foreground mb-2 tracking-[-0.3px]" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>
                                Cost per 1,000 views paid to creators
                              </p>
                              <FormControl>
                                <Input type="number" placeholder="5" className="bg-background border-border tracking-[-0.5px]" style={{
                            fontFamily: 'Inter, sans-serif'
                          }} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        </div>

                        {/* Platform Targeting */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-foreground tracking-[-0.5px]" style={{
                        fontFamily: 'Inter, sans-serif'
                      }}>Platform Targeting</h3>
                          
                          <FormField control={form.control} name="allowed_platforms" render={({
                        field
                      }) => <FormItem>
                              <FormControl>
                                <div className="space-y-2">
                                  {[{
                              id: "tiktok",
                              label: "TikTok",
                              logo: tiktokLogo
                            }, {
                              id: "instagram",
                              label: "Instagram",
                              logo: instagramLogo
                            }, {
                              id: "youtube",
                              label: "YouTube",
                              logo: youtubeLogo
                            }].map(platform => {
                              const isSelected = field.value.includes(platform.id);
                              return <button key={platform.id} type="button" onClick={() => {
                                const newValue = isSelected ? field.value.filter(p => p !== platform.id) : [...field.value, platform.id];
                                field.onChange(newValue);
                              }} className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${isSelected ? "border-border bg-card" : "border-border hover:border-muted-foreground/30 bg-card"}`}>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                                          {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <img src={platform.logo} alt={platform.label} className="w-6 h-6 object-contain" />
                                        <span className="text-sm font-medium text-foreground tracking-[-0.5px]" style={{
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                          {platform.label}
                                        </span>
                                      </button>;
                            })}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        </div>

                        {/* Privacy Settings */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-foreground tracking-[-0.5px]" style={{
                        fontFamily: 'Inter, sans-serif'
                      }}>Access Settings</h3>
                          
                          <FormField control={form.control} name="is_private" render={({
                        field
                      }) => <FormItem className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                              <div>
                                <FormLabel className="text-foreground tracking-[-0.5px]" style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>Private Campaign</FormLabel>
                                <p className="text-xs text-muted-foreground tracking-[-0.3px]" style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>
                                  Only accessible via invite code
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>} />

                          {watchedValues.is_private && <FormField control={form.control} name="access_code" render={({
                        field
                      }) => <FormItem>
                                <FormLabel className="text-foreground tracking-[-0.5px]" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>Access Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="BRAND2024" className="bg-background border-border uppercase tracking-[-0.5px]" style={{
                            fontFamily: 'Inter, sans-serif'
                          }} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />}

                          <FormField control={form.control} name="requires_application" render={({
                        field
                      }) => <FormItem className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                              <div>
                                <FormLabel className="text-foreground tracking-[-0.5px]" style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>Require Application</FormLabel>
                                <p className="text-xs text-muted-foreground tracking-[-0.3px]" style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>
                                  Creators must apply to join
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>} />

                          {/* Application Questions - only shown when requires_application is true */}
                          {watchedValues.requires_application && <div className="space-y-3">
                              <label className="text-sm font-medium text-foreground tracking-[-0.5px]" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>
                                Application Questions
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Add up to 5 questions creators must answer when applying
                              </p>
                              <div className="flex gap-2">
                                <Input placeholder="Add a question..." value={newQuestion} onChange={e => setNewQuestion(e.target.value)} className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground/50" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQuestion())} />
                                <Button type="button" variant="outline" size="icon" onClick={addQuestion} className="shrink-0" disabled={(form.watch("application_questions")?.length || 0) >= 5}>
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                              {form.watch("application_questions")?.length > 0 && <div className="space-y-2">
                                  {form.watch("application_questions")?.map((question, index) => <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-xs text-primary font-semibold">{index + 1}</span>
                                      </div>
                                      <span className="text-sm flex-1">{question}</span>
                                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeQuestion(index)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>)}
                                </div>}
                            </div>}
                        </div>
                      </div>}

                    {/* Step 3: Campaign Details */}
                    {currentStep === 3 && <div className="space-y-6">
                        <div className="mb-8">
                          <h1 className="text-xl font-semibold text-foreground tracking-[-0.5px]">
                            {isEditMode ? "Edit Campaign" : "Campaign Details"}
                          </h1>
                          <p className="text-sm text-muted-foreground mt-1">
                            {isEditMode ? "Update your campaign settings." : "Add the final details for your campaign."}
                          </p>
                        </div>

                        <div className="space-y-5">
                          <FormField control={form.control} name="title" render={({
                        field
                      }) => <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-foreground tracking-[-0.5px]">
                                Campaign Name
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="Enter campaign name" className="h-11 bg-[#0a0a0a] border-[#1a1a1a] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-0" style={{
                            letterSpacing: '-0.3px'
                          }} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />

                          <FormField control={form.control} name="description" render={({
                        field
                      }) => <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-foreground tracking-[-0.5px]">
                                Campaign Description
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Describe your campaign, requirements, and what creators should know
                              </p>
                              <FormControl>
                                <Textarea placeholder="Enter campaign description..." className="min-h-[120px] bg-[#0a0a0a] border-0 text-foreground placeholder:text-muted-foreground/50 focus:ring-0 focus:shadow-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none focus-visible:bg-[#0a0a0a] transition-none resize-none" style={{
                            letterSpacing: '-0.3px'
                          }} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />

                          <FormField control={form.control} name="hashtags" render={({
                        field
                      }) => <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-foreground tracking-[-0.5px]">
                                Campaign Hashtags
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Videos with these hashtags in their caption will be tracked (without #)
                              </p>
                              <FormControl>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <div className="relative flex-1">
                                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input placeholder="Add hashtag and press Enter" className="h-11 pl-9 bg-[#0a0a0a] border-[#1a1a1a] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-0" style={{
                                  letterSpacing: '-0.3px'
                                }} onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const input = e.currentTarget;
                                    const value = input.value.trim().replace(/^#/, '');
                                    if (value && !field.value?.includes(value)) {
                                      field.onChange([...(field.value || []), value]);
                                      input.value = '';
                                    }
                                  }
                                }} />
                                    </div>
                                  </div>
                                  {field.value && field.value.length > 0 && <div className="flex flex-wrap gap-2">
                                      {field.value.map((tag: string, index: number) => <Badge key={index} variant="secondary" className="gap-1 px-2 py-1">
                                          #{tag}
                                          <button type="button" onClick={() => {
                                  field.onChange(field.value.filter((_: string, i: number) => i !== index));
                                }} className="ml-1 hover:text-destructive">
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>)}
                                    </div>}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />

                          {isAdmin && <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground tracking-[-0.5px]">
                                Shortimize API Key
                              </label>
                              <Input type="password" placeholder="Enter Shortimize API key" value={shortimizeApiKey} onChange={e => setShortimizeApiKey(e.target.value)} className="bg-[#0a0a0a] border-[#1a1a1a] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-0" style={{
                          letterSpacing: '-0.3px'
                        }} />
                              <p className="text-xs text-muted-foreground">
                                Used for video tracking and analytics
                              </p>
                            </div>}

                          {/* Asset Links */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground tracking-[-0.5px]">
                              Asset Links
                            </label>
                            <p className="text-xs text-muted-foreground">Add links to Google Drive, Dropbox, or other resources</p>
                            <div className="flex gap-2">
                              <Input placeholder="Label (e.g. Google Drive)" value={newAssetLabel} onChange={e => setNewAssetLabel(e.target.value)} className="flex-1 bg-[#0a0a0a] border-[#1a1a1a] text-foreground placeholder:text-muted-foreground/50" />
                              <Input placeholder="URL" value={newAssetUrl} onChange={e => setNewAssetUrl(e.target.value)} className="flex-1 bg-[#0a0a0a] border-[#1a1a1a] text-foreground placeholder:text-muted-foreground/50" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAssetLink())} />
                              <Button type="button" variant="outline" size="icon" onClick={addAssetLink} className="shrink-0">
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                            {form.watch("asset_links")?.length > 0 && <div className="space-y-2">
                                {form.watch("asset_links")?.map((link, index) => <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
                                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="font-medium text-sm">{link.label}</span>
                                    <span className="text-xs text-muted-foreground truncate flex-1">{link.url}</span>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeAssetLink(index)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>)}
                              </div>}
                          </div>

                          {/* Requirements */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground tracking-[-0.5px]">
                              Campaign Requirements
                            </label>
                            <p className="text-xs text-muted-foreground">List the requirements creators must follow</p>
                            <div className="flex gap-2">
                              <Input placeholder="Add a requirement" value={newRequirement} onChange={e => setNewRequirement(e.target.value)} className="flex-1 bg-[#0a0a0a] border-[#1a1a1a] text-foreground placeholder:text-muted-foreground/50" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRequirement())} />
                              <Button type="button" variant="outline" size="icon" onClick={addRequirement} className="shrink-0">
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                            {form.watch("requirements")?.length > 0 && <div className="space-y-2">
                                {form.watch("requirements")?.map((req, index) => <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
                                    <div className="w-5 h-5 rounded-full bg-[#2060df]/10 flex items-center justify-center shrink-0">
                                      <span className="text-xs text-[#2060df] font-semibold">{index + 1}</span>
                                    </div>
                                    <span className="text-sm flex-1">{req}</span>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeRequirement(index)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>)}
                              </div>}
                          </div>

                          {/* Banner Upload */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground tracking-[-0.5px]">
                              Campaign Banner
                            </label>
                            {bannerPreview ? <div className="relative w-full h-36 rounded-lg overflow-hidden bg-[#0a0a0a] border border-[#1a1a1a]">
                                <img src={bannerPreview} alt="Campaign banner" className="w-full h-full object-cover" />
                                <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 bg-black/60 hover:bg-destructive/90 text-white" onClick={removeBanner}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div> : <div className="w-full h-36 rounded-lg flex items-center justify-center cursor-pointer transition-all bg-[#0a0a0a] border border-dashed border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#0f0f0f]" onClick={() => fileInputRef.current?.click()}>
                                <div className="text-center">
                                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
                                    <Upload className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm text-muted-foreground" style={{
                              letterSpacing: '-0.3px'
                            }}>
                                    Click to upload
                                  </p>
                                  <p className="text-xs text-muted-foreground/60 mt-1">
                                    PNG, JPG up to 10MB
                                  </p>
                                </div>
                              </div>}
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                          </div>

                          {/* Pause toggle and Delete button for edit mode */}
                          {isEditMode && <div className="pt-4 border-t border-border space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label htmlFor="pause-campaign" className="text-sm font-medium">Pause Campaign</Label>
                                  <p className="text-xs text-muted-foreground">Paused campaigns won't appear in discover</p>
                                </div>
                                <Switch id="pause-campaign" checked={campaign?.status === 'paused'} onCheckedChange={async checked => {
                            if (!campaign?.id) return;
                            const newStatus = checked ? 'paused' : 'active';
                            const {
                              error
                            } = await supabase.from('campaigns').update({
                              status: newStatus
                            }).eq('id', campaign.id);
                            if (error) {
                              toast.error('Failed to update campaign status');
                            } else {
                              toast.success(checked ? 'Campaign paused' : 'Campaign activated');
                              onSuccess?.();
                            }
                          }} />
                              </div>
                              <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => {
                            const link = `${window.location.origin}/join/${campaign?.slug}`;
                            navigator.clipboard.writeText(link);
                            toast.success('Invite link copied to clipboard');
                          }} className="gap-2 border-black/0">
                                  <Copy className="h-4 w-4" />
                                  Copy Invite Link
                                </Button>
                                <Button type="button" variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="gap-2">
                                  <Trash2 className="h-4 w-4" />
                                  Delete Campaign
                                </Button>
                              </div>
                            </div>}
                        </div>
                      </div>}
                  </form>
                </Form>
              </div>

              {/* Bottom Action Bar */}
              <div className="border-t border-border lg:px-16 py-4 bg-neutral-950/0 px-[12px]">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                  {!isEditMode ? <Button type="button" variant="ghost" onClick={handleSaveDraft} disabled={isSubmitting} className="gap-2 tracking-[-0.5px]" style={{
                  fontFamily: 'Inter, sans-serif'
                }}>
                      <Bookmark className="h-4 w-4" />
                      Save as Draft
                    </Button> : <div />}

                  <div className="flex items-center gap-3">
                    {currentStep > 1 && !isEditMode && <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting} style={{
                    fontFamily: 'Inter, sans-serif'
                  }} className="tracking-[-0.5px] border-black/0">
                        Back
                      </Button>}
                    
                    {currentStep < 3 && !isEditMode ? <Button type="button" onClick={handleNext} disabled={isSubmitting} className="min-w-[120px] tracking-[-0.5px]" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>
                        Continue
                      </Button> : <Button type="button" onClick={async () => {
                    // Skip validation for edit mode - call onSubmit directly
                    if (isEditMode) {
                      const values = form.getValues();
                      console.log('Edit mode - submitting with values:', values);
                      await onSubmit(values as CampaignFormValues);
                      return;
                    }
                    // Validate for new campaigns
                    const isValid = await form.trigger();
                    if (!isValid) {
                      const errors = form.formState.errors;
                      const errorMessages = Object.entries(errors).map(([key, error]) => `${key}: ${error?.message}`).join(', ');
                      toast.error(`Please fix form errors: ${errorMessages}`);
                      console.log('Form errors:', errors);
                      return;
                    }
                    form.handleSubmit(onSubmit)();
                  }} disabled={isSubmitting} className="min-w-[120px] tracking-[-0.5px]" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>
                        {isSubmitting ? isEditMode ? "Saving..." : "Creating..." : isEditMode ? "Save Changes" : "Finish"}
                      </Button>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Preview Sidebar */}
            <div className="hidden lg:flex flex-col bg-muted/30 dark:bg-[#0f0f0f] border-l border-border">
              {/* Preview Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-center gap-2 text-primary-foreground">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium tracking-[-0.5px]" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Preview</span>
              </div>

              {/* Preview Content */}
              <div className="flex-1 p-6">
                {/* Campaign Preview Card */}
                <div className="rounded-xl overflow-hidden">
                  {/* Banner Area */}
                  {bannerPreview ? <div className="h-28">
                      <img src={bannerPreview} alt="Campaign banner" className="w-full h-full object-cover" />
                    </div> : <div className="h-28 bg-gradient-to-br from-muted/80 to-muted/40 dark:from-[#1a1a1a] dark:to-[#0d0d0d]" />}
                </div>

                {/* Campaign Info */}
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    {/* Brand Logo */}
                    {brandLogoUrl ? <img src={brandLogoUrl} alt={brandName} className="w-10 h-10 rounded-lg object-cover bg-background flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-foreground">{brandName?.charAt(0) || "V"}</span>
                      </div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-foreground tracking-[-0.5px]" style={{
                        fontFamily: 'Inter, sans-serif'
                      }}>
                          {watchedValues.title || "Untitled"}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge variant="secondary" className="text-xs tracking-[-0.5px]" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>
                            {isEditMode ? campaign?.status || "Active" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {watchedValues.hashtags && watchedValues.hashtags.length > 0 && <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <Hash className="h-4 w-4" />
                      {watchedValues.hashtags.map((tag: string, i: number) => <span key={i}>#{tag}{i < watchedValues.hashtags!.length - 1 ? ',' : ''}</span>)}
                    </div>}

                  {/* Progress Indicator */}
                  {!isEditMode && <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground tracking-[-0.5px]" style={{
                      fontFamily: 'Inter, sans-serif'
                    }}>
                          Step {currentStep}: {STEPS[currentStep - 1]?.label}
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{
                      width: `${getStepProgress()}%`
                    }} />
                      </div>
                    </div>}

                  {/* Pricing Embed */}
                  <div className="rounded-xl overflow-hidden bg-muted/50 dark:bg-[#141414]">
                    <iframe src="https://joinvirality.com/pickplan-3" className="w-full border-0" style={{
                    height: '350px'
                  }} scrolling="no" title="Pricing Plans" />
                  </div>
                </div>
              </div>
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