import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, X, Trash2, Copy } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
const campaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.string().trim().max(500).optional(),
  campaign_type: z.string().optional(),
  category: z.string().optional(),
  is_infinite_budget: z.boolean().default(false),
  budget: z.string().optional(),
  rpm_rate: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "RPM rate must be a positive number"
  }),
  guidelines: z.string().trim().max(2000).optional(),
  embed_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  preview_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  analytics_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  allowed_platforms: z.array(z.string()).min(1, "Select at least one platform"),
  application_questions: z.array(z.string().trim().min(1)).max(3, "Maximum 3 questions allowed"),
  is_private: z.boolean().default(false),
  access_code: z.string().trim().optional(),
  requires_application: z.boolean().default(true),
  is_featured: z.boolean().default(false)
}).refine(data => {
  // If campaign is private, access code is required
  if (data.is_private) {
    return data.access_code && data.access_code.length >= 6;
  }
  return true;
}, {
  message: "Access code must be at least 6 characters for private campaigns",
  path: ["access_code"]
}).refine(data => {
  // If not infinite budget, budget is required and must be positive
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
  budget_used: number;
  rpm_rate: number;
  guidelines: string | null;
  banner_url: string | null;
  allowed_platforms: string[];
  application_questions: any[];
  slug?: string;
  embed_url?: string | null;
  preview_url?: string | null;
  analytics_url?: string | null;
  is_private?: boolean;
  access_code?: string | null;
  requires_application?: boolean;
  status?: string;
  is_infinite_budget?: boolean;
  is_featured?: boolean;
}
interface CreateCampaignDialogProps {
  brandId: string;
  brandName: string;
  onSuccess?: () => void;
  campaign?: Campaign;
  trigger?: React.ReactNode;
  onDelete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function CreateCampaignDialog({
  brandId,
  brandName,
  onSuccess,
  campaign,
  trigger,
  onDelete,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: CreateCampaignDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(campaign?.banner_url || null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isCampaignEnded, setIsCampaignEnded] = useState(campaign?.status === "ended");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: campaign?.title || "",
      description: campaign?.description || "",
      campaign_type: campaign?.campaign_type || "",
      category: campaign?.category || "",
      is_infinite_budget: campaign?.is_infinite_budget || false,
      budget: campaign?.budget?.toString() || "",
      rpm_rate: campaign?.rpm_rate?.toString() || "",
      guidelines: campaign?.guidelines || "",
      embed_url: campaign?.embed_url || "",
      preview_url: campaign?.preview_url || "",
      analytics_url: campaign?.analytics_url || "",
      allowed_platforms: campaign?.allowed_platforms || ["tiktok", "instagram"],
      application_questions: campaign?.application_questions || [],
      is_private: campaign?.is_private || false,
      access_code: campaign?.access_code || "",
      requires_application: campaign?.requires_application !== false,
      is_featured: campaign?.is_featured || false
    }
  });
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
  const onSubmit = async (values: CampaignFormValues) => {
    setIsSubmitting(true);
    try {
      const bannerUrl = await uploadBanner();

      // Fetch brand logo URL
      const { data: brandData } = await supabase
        .from('brands')
        .select('logo_url')
        .eq('id', brandId)
        .single();

      // Generate slug from title
      const generateSlug = (title: string, id?: string) => {
        const baseSlug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

        // For updates, keep existing slug if title hasn't changed meaningfully
        if (campaign && campaign.slug) {
          const existingBase = campaign.slug.substring(0, campaign.slug.lastIndexOf('-'));
          if (existingBase === baseSlug) {
            return campaign.slug;
          }
        }

        // For new campaigns or if title changed, add random suffix
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        return `${baseSlug}-${randomSuffix}`;
      };
      const campaignData = {
        title: values.title,
        description: values.description || null,
        campaign_type: values.campaign_type || null,
        category: values.category || null,
        is_infinite_budget: values.is_infinite_budget,
        budget: values.is_infinite_budget ? 0 : Number(values.budget),
        rpm_rate: Number(values.rpm_rate),
        guidelines: values.guidelines || null,
        embed_url: values.embed_url || null,
        preview_url: values.preview_url || null,
        analytics_url: values.analytics_url || null,
        brand_id: brandId,
        brand_name: brandName,
        brand_logo_url: brandData?.logo_url || null,
        banner_url: bannerUrl,
        status: isCampaignEnded ? "ended" : "active",
        allowed_platforms: values.allowed_platforms,
        application_questions: values.application_questions,
        slug: generateSlug(values.title, campaign?.id),
        is_private: values.is_private,
        access_code: values.is_private ? values.access_code?.toUpperCase() : null,
        requires_application: values.requires_application,
        is_featured: values.is_featured
      };
      if (campaign) {
        // Update existing campaign
        const {
          error
        } = await supabase.from("campaigns").update(campaignData).eq("id", campaign.id);
        if (error) throw error;
        toast.success("Campaign updated successfully!");
      } else {
        // Create new campaign
        const {
          error
        } = await supabase.from("campaigns").insert(campaignData);
        if (error) throw error;
        toast.success("Campaign created successfully!");
      }
      setOpen(false);
      form.reset();
      setBannerFile(null);
      setBannerPreview(null);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error(`Failed to ${campaign ? "update" : "create"} campaign. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 p-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] h-full max-h-[90vh]">
          {/* Left Column - Form */}
          <div className="overflow-y-auto p-6 lg:p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-white text-2xl">
                {campaign ? "Edit Campaign" : "Create New Campaign"}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {campaign ? `Edit campaign details for ${brandName}` : `Create a new campaign for ${brandName}`}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Banner Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Campaign Banner</label>
              <div className="flex flex-col gap-3">
                {bannerPreview ? <div className="relative w-full h-56 rounded-xl overflow-hidden bg-[#191919]">
                    <img src={bannerPreview} alt="Campaign banner" className="w-full h-full object-cover" />
                    <Button type="button" size="icon" className="absolute top-3 right-3 bg-[#191919]/80 hover:bg-destructive" onClick={removeBanner}>
                      <X className="h-4 w-4 text-white" />
                    </Button>
                  </div> : <div className="w-full h-56 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors bg-[#191919]" onClick={() => fileInputRef.current?.click()}>
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                        <Upload className="h-8 w-8 text-white/60" />
                      </div>
                      <p className="text-sm text-white/80 font-medium mb-1">
                        Click to upload campaign banner
                      </p>
                      <p className="text-xs text-white/40">
                        Recommended: 1200x400px • PNG, JPG up to 10MB
                      </p>
                    </div>
                  </div>}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
            </div>

            <FormField control={form.control} name="title" render={({
                field
              }) => <FormItem>
                  <FormLabel className="text-white">Campaign Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter campaign title" className="bg-[#191919] text-white placeholder:text-white/40" {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive/80" />
                </FormItem>} />


            {campaign?.slug && <div className="p-3 rounded-lg bg-[#191919]">
                <p className="text-xs text-white/40 mb-1">Campaign Slug</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white/80 font-mono flex-1">{campaign.slug}</p>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => {
                    navigator.clipboard.writeText(campaign.slug!);
                    toast.success("Slug copied to clipboard!");
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>}

            <FormField control={form.control} name="description" render={({
                field
              }) => <FormItem>
                  <FormLabel className="text-white">Campaign Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of the campaign" className="resize-none bg-[#191919] text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none focus-visible:bg-[#191919] transition-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive/80" />
                </FormItem>} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="campaign_type" render={({
                  field
                }) => <FormItem>
                    <FormLabel className="text-white">Campaign Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#191919] text-white border-white/10">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#191919] border-white/10">
                        <SelectItem value="ugc" className="text-white">UGC</SelectItem>
                        <SelectItem value="clipping" className="text-white">Clipping</SelectItem>
                        <SelectItem value="faceless" className="text-white">Faceless</SelectItem>
                        <SelectItem value="slideshows" className="text-white">Slideshows</SelectItem>
                        <SelectItem value="ai" className="text-white">AI</SelectItem>
                        <SelectItem value="logo" className="text-white">Logo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>} />

              <FormField control={form.control} name="category" render={({
                  field
                }) => <FormItem>
                    <FormLabel className="text-white">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#191919] text-white border-white/10">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#191919] border-white/10">
                        <SelectItem value="personal-brand" className="text-white">Personal Brand</SelectItem>
                        <SelectItem value="lifestyle" className="text-white">Lifestyle</SelectItem>
                        <SelectItem value="app" className="text-white">App</SelectItem>
                        <SelectItem value="physical-product" className="text-white">Physical Product</SelectItem>
                        <SelectItem value="trading-finance" className="text-white">Trading/Finance</SelectItem>
                        <SelectItem value="software" className="text-white">Software</SelectItem>
                        <SelectItem value="business" className="text-white">Business</SelectItem>
                        <SelectItem value="music" className="text-white">Music</SelectItem>
                        <SelectItem value="sports-gambling" className="text-white">Sports/Gambling</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>} />
            </div>

            {/* Infinite Budget Toggle */}
            <FormField control={form.control} name="is_infinite_budget" render={({
                field
              }) => <FormItem className="flex items-center justify-between space-y-0 rounded-lg p-4 bg-[#191919]">
                  <div className="space-y-1">
                    <FormLabel className="text-white font-medium cursor-pointer">
                      Infinite Budget
                    </FormLabel>
                    <p className="text-xs text-white/40">
                      Campaign has unlimited budget and will never run out
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="budget" render={({
                  field
                }) => <FormItem>
                    <FormLabel className="text-white">Budget ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" step="0.01" disabled={form.watch("is_infinite_budget")} className="bg-[#191919] text-white placeholder:text-white/40 disabled:opacity-50" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>} />

              <FormField control={form.control} name="rpm_rate" render={({
                  field
                }) => <FormItem>
                    <FormLabel className="text-white">RPM Rate ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" step="0.01" className="bg-[#191919] text-white placeholder:text-white/40" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>} />
            </div>

            <FormField control={form.control} name="guidelines" render={({
                field
              }) => <FormItem>
                  <FormLabel className="text-white">Campaign Guidelines</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter campaign guidelines and requirements" className="resize-none bg-[#191919] text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none focus-visible:bg-[#191919] transition-none" rows={4} {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive/80" />
                </FormItem>} />

            <FormField control={form.control} name="embed_url" render={({
                field
              }) => <FormItem>
                  <FormLabel className="text-white">Campaign Embed URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/campaign-embed" className="bg-[#191919] text-white placeholder:text-white/40" {...field} />
                  </FormControl>
                  <p className="text-xs text-white/40 mt-1">
                    Enter a URL to display as an embedded page for campaign participants
                  </p>
                  <FormMessage className="text-destructive/80" />
                </FormItem>} />

            <FormField control={form.control} name="preview_url" render={({
                field
              }) => <FormItem>
                  <FormLabel className="text-white">Campaign Preview URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/campaign-preview" className="bg-[#191919] text-white placeholder:text-white/40" {...field} />
                  </FormControl>
                  <p className="text-xs text-white/40 mt-1">
                    Enter a URL to display as preview for non-members viewing this campaign
                  </p>
                  <FormMessage className="text-destructive/80" />
                </FormItem>} />

            <FormField control={form.control} name="analytics_url" render={({
                field
              }) => <FormItem>
                  <FormLabel className="text-white">Analytics URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/analytics" className="bg-[#191919] text-white placeholder:text-white/40" {...field} />
                  </FormControl>
                  <p className="text-xs text-white/40 mt-1">
                    Enter a URL to external analytics dashboard
                  </p>
                  <FormMessage className="text-destructive/80" />
                </FormItem>} />

            <FormField control={form.control} name="allowed_platforms" render={() => <FormItem>
                  <FormLabel className="text-white">Allowed Platforms</FormLabel>
                  <div className="space-y-3">
                    <FormField control={form.control} name="allowed_platforms" render={({
                    field
                  }) => <FormItem className="flex items-center justify-between space-y-0 rounded-lg p-3 bg-[#191919]">
                          <FormLabel className="text-white font-normal cursor-pointer">
                            TikTok
                          </FormLabel>
                          <FormControl>
                            <Switch checked={field.value?.includes("tiktok")} onCheckedChange={checked => {
                        const newValue = checked ? [...(field.value || []), "tiktok"] : field.value?.filter(val => val !== "tiktok") || [];
                        field.onChange(newValue);
                      }} />
                          </FormControl>
                        </FormItem>} />
                    <FormField control={form.control} name="allowed_platforms" render={({
                    field
                  }) => <FormItem className="flex items-center justify-between space-y-0 rounded-lg p-3 bg-[#191919]">
                          <FormLabel className="text-white font-normal cursor-pointer">
                            Instagram
                          </FormLabel>
                          <FormControl>
                            <Switch checked={field.value?.includes("instagram")} onCheckedChange={checked => {
                        const newValue = checked ? [...(field.value || []), "instagram"] : field.value?.filter(val => val !== "instagram") || [];
                        field.onChange(newValue);
                      }} />
                          </FormControl>
                        </FormItem>} />
                    <FormField control={form.control} name="allowed_platforms" render={({
                    field
                  }) => <FormItem className="flex items-center justify-between space-y-0 rounded-lg p-3 bg-[#191919]">
                          <FormLabel className="text-white font-normal cursor-pointer">
                            X (Twitter)
                          </FormLabel>
                          <FormControl>
                            <Switch checked={field.value?.includes("x")} onCheckedChange={checked => {
                        const newValue = checked ? [...(field.value || []), "x"] : field.value?.filter(val => val !== "x") || [];
                        field.onChange(newValue);
                      }} />
                          </FormControl>
                        </FormItem>} />
                    <FormField control={form.control} name="allowed_platforms" render={({
                    field
                  }) => <FormItem className="flex items-center justify-between space-y-0 rounded-lg p-3 bg-[#191919]">
                          <FormLabel className="text-white font-normal cursor-pointer">
                            YouTube
                          </FormLabel>
                          <FormControl>
                            <Switch checked={field.value?.includes("youtube")} onCheckedChange={checked => {
                        const newValue = checked ? [...(field.value || []), "youtube"] : field.value?.filter(val => val !== "youtube") || [];
                        field.onChange(newValue);
                      }} />
                          </FormControl>
                        </FormItem>} />
                  </div>
                  <FormMessage className="text-destructive/80" />
                </FormItem>} />

            <FormField control={form.control} name="application_questions" render={({
                field
              }) => <FormItem>
                  <FormLabel className="text-white">Application Questions (Optional, max 3)</FormLabel>
                  <div className="space-y-2">
                    {field.value?.map((question, index) => <div key={index} className="flex gap-2">
                        <Input value={question} onChange={e => {
                      const newQuestions = [...(field.value || [])];
                      newQuestions[index] = e.target.value;
                      field.onChange(newQuestions);
                    }} placeholder={`Question ${index + 1}`} className="bg-[#191919] text-white placeholder:text-white/40" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                      const newQuestions = field.value?.filter((_, i) => i !== index) || [];
                      field.onChange(newQuestions);
                    }} className="text-destructive/60 hover:text-destructive hover:bg-destructive/10">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>)}
                    {(!field.value || field.value.length < 3) && <Button type="button" variant="outline" size="sm" onClick={() => field.onChange([...(field.value || []), ""])} className="w-full bg-[#191919] text-white hover:bg-white/5">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>}
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    Custom questions for creators to answer when applying to this campaign
                  </p>
                  <FormMessage className="text-destructive/80" />
                </FormItem>} />

            <div className="space-y-4 p-4 bg-[#191919]/50 rounded-lg">
              <FormField control={form.control} name="requires_application" render={({
                  field
                }) => <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={!field.value} onCheckedChange={checked => field.onChange(!checked)} className="border-white/20 data-[state=checked]:bg-primary" />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-white font-normal cursor-pointer">
                        Make this campaign public (instant join)
                      </FormLabel>
                      <p className="text-xs text-white/40">
                        Users can join instantly without submitting an application
                      </p>
                    </div>
                  </FormItem>} />

              <FormField control={form.control} name="is_private" render={({
                  field
                }) => <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-white/20 data-[state=checked]:bg-primary" />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-white font-normal cursor-pointer">
                        Make this campaign private (invite-only)
                      </FormLabel>
                      <p className="text-xs text-white/40">
                        Private campaigns require an access code to join and won't appear in public listings
                      </p>
                    </div>
                  </FormItem>} />

              <FormField control={form.control} name="is_featured" render={({
                  field
                }) => <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-white/20 data-[state=checked]:bg-primary" />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-white font-normal cursor-pointer">
                        Feature this campaign
                      </FormLabel>
                      <p className="text-xs text-white/40">
                        Featured campaigns appear first on the discover page with a special badge
                      </p>
                    </div>
                  </FormItem>} />

              {form.watch("is_private") && <FormField control={form.control} name="access_code" render={({
                  field
                }) => <FormItem>
                      <FormLabel className="text-white">Access Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter access code (min 6 characters)" className="bg-[#191919] text-white placeholder:text-white/40 uppercase font-mono tracking-wider" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <p className="text-xs text-white/40">
                        This code will be required for creators to join your campaign
                      </p>
                      <FormMessage className="text-destructive/80" />
                    </FormItem>} />}
            </div>

            {/* Mark as Ended Toggle */}
            {campaign && <div className="flex items-center justify-between rounded-lg p-4 bg-[#191919]">
                <div>
                  <p className="text-white font-medium">Mark Campaign as Ended</p>
                  <p className="text-xs text-white/40 mt-1">
                    Ended campaigns will be visible but not joinable
                  </p>
                </div>
                <Switch checked={isCampaignEnded} onCheckedChange={setIsCampaignEnded} />
              </div>}

            <div className="flex justify-between gap-3 pt-4">
              <div>
                {campaign && onDelete && <Button type="button" variant="ghost" onClick={() => setDeleteDialogOpen(true)} disabled={isSubmitting} className="text-destructive/60 hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Campaign
                  </Button>}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => {
                    setOpen(false);
                    form.reset();
                    setBannerFile(null);
                    setBannerPreview(null);
                  }} disabled={isSubmitting} className="text-white/60 hover:text-white hover:bg-white/10">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white min-w-[140px]">
                  {isSubmitting ? campaign ? "Updating..." : "Creating..." : campaign ? "Update Campaign" : "Create Campaign"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
          </div>

          {/* Right Column - Preview */}
          <div className="hidden lg:flex flex-col bg-[#111111] p-6 overflow-y-auto">
            <div className="flex items-center gap-2 text-white/40 mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm font-medium">Preview</span>
            </div>

            {/* Campaign Preview Card */}
            <div className="rounded-xl overflow-hidden bg-[#111111]">
              {/* Banner */}
              <div className="relative w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5">
                {bannerPreview || campaign?.banner_url ? <img src={bannerPreview || campaign?.banner_url || ''} alt="Campaign banner" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
                    <Upload className="h-12 w-12 text-white/20" />
                  </div>}
              </div>

              {/* Campaign Info */}
              <div className="p-4 space-y-4 bg-[#0a0a0a]">
                {/* Featured Badge */}
                {form.watch("is_featured") && <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      Featured
                    </span>
                  </div>}

                {/* Title */}
                <h3 className="text-xl font-bold text-white line-clamp-2">
                  {form.watch("title") || "Campaign Title"}
                </h3>

                {/* Platforms */}
                <div className="flex items-center gap-2 text-sm">
                    {form.watch("allowed_platforms")?.includes("tiktok") && <div className="flex items-center gap-1.5">
                        <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />
                        <span className="text-xs">TikTok</span>
                      </div>}
                    {form.watch("allowed_platforms")?.includes("instagram") && <div className="flex items-center gap-1.5">
                        <img src={instagramLogo} alt="Instagram" className="w-4 h-4" />
                        <span className="text-xs">Instagram</span>
                      </div>}
                    {form.watch("allowed_platforms")?.includes("youtube") && <div className="flex items-center gap-1.5">
                        <img src={youtubeLogo} alt="YouTube" className="w-4 h-4" />
                        <span className="text-xs">YouTube</span>
                      </div>}
                    {form.watch("allowed_platforms")?.includes("x") && <div className="flex items-center gap-1.5">
                        <X className="w-4 h-4" />
                        <span className="text-xs">X</span>
                      </div>}
                  </div>

                {/* Budget Progress */}
                {!form.watch("is_infinite_budget") && form.watch("budget") && <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">
                        ${campaign?.budget_used?.toFixed(2) || "0.00"} / ${Number(form.watch("budget")).toFixed(2)}
                      </span>
                      <span className="text-white font-semibold">
                        {campaign?.budget_used && Number(form.watch("budget")) ? Math.round(campaign.budget_used / Number(form.watch("budget")) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{
                    width: `${campaign?.budget_used && Number(form.watch("budget")) ? Math.min(campaign.budget_used / Number(form.watch("budget")) * 100, 100) : 0}%`
                  }} />
                    </div>
                  </div>}

                {form.watch("is_infinite_budget") && <div className="flex items-center gap-2 text-sm">
                    <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      ∞ Unlimited Budget
                    </div>
                  </div>}

                {/* Description Preview */}
                {form.watch("description") && <p className="text-sm text-white/60 line-clamp-3">
                    {form.watch("description")}
                  </p>}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#202020] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete <strong className="text-white">{campaign?.title}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
            setDeleteDialogOpen(false);
            setOpen(false);
            onDelete?.();
          }} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>;
}