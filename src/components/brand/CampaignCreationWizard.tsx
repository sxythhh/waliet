import { useState, useRef } from "react";
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
import { Eye, Target, TrendingUp, ArrowRight, Bookmark, Upload, X, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
const campaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  goal: z.enum(["attention", "leads", "conversions"]),
  description: z.string().trim().max(500).optional(),
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
  requires_application: z.boolean().default(true)
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
interface CampaignCreationWizardProps {
  brandId: string;
  brandName: string;
  brandLogoUrl?: string;
  onSuccess?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  onOpenChange
}: CampaignCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: "",
      goal: "attention",
      description: "",
      campaign_type: "clipping",
      is_infinite_budget: false,
      budget: "",
      rpm_rate: "5",
      guidelines: "",
      embed_url: "",
      preview_url: "",
      allowed_platforms: ["tiktok", "instagram"],
      is_private: false,
      access_code: "",
      requires_application: true
    }
  });
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
    if (!bannerFile) return null;
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
        is_featured: false
      };
      const {
        error
      } = await supabase.from("campaigns").insert(campaignData);
      if (error) throw error;
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
    setIsSubmitting(true);
    try {
      const bannerUrl = await uploadBanner();
      const {
        data: brandData
      } = await supabase.from('brands').select('logo_url').eq('id', brandId).single();
      const generateSlug = (title: string) => {
        const baseSlug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        return `${baseSlug}-${randomSuffix}`;
      };
      const campaignData = {
        title: values.title,
        description: values.description || null,
        campaign_type: values.campaign_type || "clipping",
        category: values.goal,
        is_infinite_budget: values.is_infinite_budget,
        budget: values.is_infinite_budget ? 0 : Number(values.budget),
        rpm_rate: Number(values.rpm_rate),
        guidelines: values.guidelines || null,
        embed_url: values.embed_url || null,
        preview_url: values.preview_url || null,
        brand_id: brandId,
        brand_name: brandName,
        brand_logo_url: brandData?.logo_url || null,
        banner_url: bannerUrl,
        status: "active",
        allowed_platforms: values.allowed_platforms,
        application_questions: [],
        slug: generateSlug(values.title),
        is_private: values.is_private,
        access_code: values.is_private ? values.access_code?.toUpperCase() : null,
        requires_application: values.requires_application,
        is_featured: false
      };
      const {
        error
      } = await supabase.from("campaigns").insert(campaignData);
      if (error) throw error;
      toast.success("Campaign created successfully!");
      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
      setBannerFile(null);
      setBannerPreview(null);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Failed to create campaign. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const getStepProgress = () => {
    return currentStep / STEPS.length * 100;
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px] w-[95vw] max-h-[90vh] bg-white dark:bg-[#0a0a0a] border-border p-0 overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] flex-1 min-h-0 overflow-hidden">
          {/* Left Column - Main Content */}
          <div className="flex flex-col min-h-0 overflow-hidden">
            {/* Main Form Area */}
            <div className="flex-1 overflow-y-auto px-8 lg:px-16 py-10">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto">
                  {/* Step 1: Goal Selection */}
                  {currentStep === 1 && <div className="space-y-8">
                      <div className="text-center mb-10">
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                          Select Your Campaign Goal
                        </h1>
                        <p className="text-muted-foreground">
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
                                        <h3 className="font-semibold text-base text-foreground tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                          {goal.title}
                                        </h3>
                                        {goal.enterprise && <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                            Enterprise
                                          </Badge>}
                                      </div>
                                      <p className="text-sm text-muted-foreground leading-relaxed tracking-[-0.3px]" style={{ fontFamily: 'Inter, sans-serif' }}>
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
                  {currentStep === 2 && <div className="space-y-8">
                      <div className="text-center mb-10">
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                          Budget & Targeting
                        </h1>
                        <p className="text-muted-foreground">
                          Set your campaign budget and target platforms.
                        </p>
                      </div>

                      {/* Budget Section */}
                      <div className="space-y-6 p-6 rounded-xl bg-[#1f1f1f]/0">
                        <h3 className="font-semibold text-foreground">Budget Settings</h3>
                        
                        <FormField control={form.control} name="is_infinite_budget" render={({
                      field
                    }) => <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel className="text-foreground">Unlimited Budget</FormLabel>
                                <p className="text-xs text-muted-foreground">
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
                                <FormLabel className="text-foreground">Total Budget ($)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="10000" className="bg-background border-border" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />}

                        <FormField control={form.control} name="rpm_rate" render={({
                      field
                    }) => <FormItem>
                              <FormLabel className="text-foreground">CPM Rate ($)</FormLabel>
                              <p className="text-xs text-muted-foreground mb-2">
                                Cost per 1,000 views paid to creators
                              </p>
                              <FormControl>
                                <Input type="number" placeholder="5" className="bg-background border-border" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                      </div>

                      {/* Platform Targeting */}
                      <div className="space-y-6 p-6 rounded-xl bg-[#1f1f1f]/0">
                        <h3 className="font-semibold text-foreground">Platform Targeting</h3>
                        
                        <FormField control={form.control} name="allowed_platforms" render={({
                      field
                    }) => <FormItem>
                              <FormControl>
                                <div className="grid grid-cols-3 gap-3">
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
                            }} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30 bg-background"}`}>
                                        <img src={platform.logo} alt={platform.label} className="w-8 h-8 object-contain" />
                                        <span className="text-sm font-medium text-foreground">
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
                      <div className="space-y-6 p-6 rounded-xl bg-[#1f1f1f]/0">
                        <h3 className="font-semibold text-foreground">Access Settings</h3>
                        
                        <FormField control={form.control} name="is_private" render={({
                      field
                    }) => <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel className="text-foreground">Private Campaign</FormLabel>
                                <p className="text-xs text-muted-foreground">
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
                                <FormLabel className="text-foreground">Access Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="BRAND2024" className="bg-background border-border uppercase" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />}

                        <FormField control={form.control} name="requires_application" render={({
                      field
                    }) => <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel className="text-foreground">Require Application</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Creators must apply to join
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>} />
                      </div>
                    </div>}

                  {/* Step 3: Campaign Details */}
                  {currentStep === 3 && <div className="space-y-6">
                      <div className="mb-8">
                        <h1 className="text-xl font-semibold text-foreground tracking-[-0.5px]">
                          Campaign Details
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add the final details for your campaign.
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
                                Description
                              </FormLabel>
                              <FormControl>
                                <Textarea placeholder="Describe your campaign objectives and expectations..." className="min-h-[100px] bg-[#0a0a0a] border-[#1a1a1a] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-0 resize-none" style={{
                          letterSpacing: '-0.3px'
                        }} rows={4} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />

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

                        <FormField control={form.control} name="guidelines" render={({
                      field
                    }) => <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-foreground tracking-[-0.5px]">
                                Creator Guidelines
                              </FormLabel>
                              <FormControl>
                                <Textarea placeholder="Provide guidelines for creators..." className="min-h-[100px] bg-[#0a0a0a] border-[#1a1a1a] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-0 resize-none" style={{
                          letterSpacing: '-0.3px'
                        }} rows={4} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />

                      </div>
                    </div>}
                </form>
              </Form>
            </div>

            {/* Bottom Action Bar */}
            <div className="border-t border-border px-8 lg:px-16 py-4 bg-background">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={handleSaveDraft} disabled={isSubmitting} className="gap-2 tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <Bookmark className="h-4 w-4" />
                  Save as Draft
                </Button>

                <div className="flex items-center gap-3">
                  {currentStep > 1 && <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting} className="tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Back
                    </Button>}
                  
                  {currentStep < 3 ? <Button type="button" onClick={handleNext} disabled={isSubmitting} className="min-w-[120px] tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Continue
                    </Button> : <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} className="min-w-[120px] tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {isSubmitting ? "Creating..." : "Finish"}
                    </Button>}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview Sidebar */}
          <div className="hidden lg:flex flex-col bg-muted/30 dark:bg-[#0f0f0f] border-l border-border">
            {/* Preview Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-center gap-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>Preview</span>
            </div>

            {/* Preview Content */}
            <div className="flex-1 p-6">
              {/* Campaign Preview Card */}
              <div className="rounded-xl overflow-hidden">
                {/* Banner Area */}
                {bannerPreview ? (
                  <div className="h-28 relative">
                    <img 
                      src={bannerPreview} 
                      alt="Campaign banner" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3">
                      {brandLogoUrl ? (
                        <img src={brandLogoUrl} alt={brandName} className="w-10 h-10 rounded-lg object-cover bg-background shadow-lg" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-lg">
                          <span className="text-base font-bold text-foreground">{brandName?.charAt(0) || "V"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-28 bg-gradient-to-br from-muted/80 to-muted/40 dark:from-[#1a1a1a] dark:to-[#0d0d0d] flex items-end p-3">
                    {brandLogoUrl ? (
                      <img src={brandLogoUrl} alt={brandName} className="w-10 h-10 rounded-lg object-cover bg-background shadow-lg" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-lg">
                        <span className="text-base font-bold text-foreground">{brandName?.charAt(0) || "V"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Campaign Info */}
              <div className="mt-4 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {watchedValues.title || "Untitled"}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Draft
                    </Badge>
                    <Badge variant="outline" className="text-xs tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Clipping
                    </Badge>
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground tracking-[-0.5px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Step {currentStep}: {STEPS[currentStep - 1]?.label}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{
                      width: `${getStepProgress()}%`
                    }} />
                  </div>
                </div>

                {/* Pricing Embed */}
                <div className="rounded-xl overflow-hidden bg-muted/50 dark:bg-[#141414]">
                  <iframe 
                    src="https://joinvirality.com/pickplan-3" 
                    className="w-full border-0" 
                    style={{ height: '350px' }}
                    scrolling="no"
                    title="Pricing Plans" 
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}