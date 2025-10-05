import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, X, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const campaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.string().trim().max(500).optional(),
  budget: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Budget must be a positive number",
  }),
  rpm_rate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "RPM rate must be a positive number",
  }),
  guidelines: z.string().trim().max(2000).optional(),
  embed_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  preview_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  allowed_platforms: z.array(z.string()).min(1, "Select at least one platform"),
  application_questions: z.array(z.string().trim().min(1)).max(3, "Maximum 3 questions allowed"),
  is_private: z.boolean().default(false),
  access_code: z.string().trim().optional(),
  requires_application: z.boolean().default(true),
}).refine((data) => {
  // If campaign is private, access code is required
  if (data.is_private) {
    return data.access_code && data.access_code.length >= 6;
  }
  return true;
}, {
  message: "Access code must be at least 6 characters for private campaigns",
  path: ["access_code"],
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  rpm_rate: number;
  guidelines: string | null;
  banner_url: string | null;
  allowed_platforms: string[];
  application_questions: any[];
  slug?: string;
  embed_url?: string | null;
  preview_url?: string | null;
  is_private?: boolean;
  access_code?: string | null;
  requires_application?: boolean;
}

interface CreateCampaignDialogProps {
  brandId: string;
  brandName: string;
  onSuccess?: () => void;
  campaign?: Campaign;
  trigger?: React.ReactNode;
  onDelete?: () => void;
}

export function CreateCampaignDialog({
  brandId,
  brandName,
  onSuccess,
  campaign,
  trigger,
  onDelete,
}: CreateCampaignDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    campaign?.banner_url || null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: campaign?.title || "",
      description: campaign?.description || "",
      budget: campaign?.budget?.toString() || "",
      rpm_rate: campaign?.rpm_rate?.toString() || "",
      guidelines: campaign?.guidelines || "",
      embed_url: campaign?.embed_url || "",
      preview_url: campaign?.preview_url || "",
      allowed_platforms: campaign?.allowed_platforms || ["tiktok", "instagram"],
      application_questions: campaign?.application_questions || [],
      is_private: campaign?.is_private || false,
      access_code: campaign?.access_code || "",
      requires_application: campaign?.requires_application !== false,
    },
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

    const { error: uploadError } = await supabase.storage
      .from("campaign-banners")
      .upload(filePath, bannerFile);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("campaign-banners").getPublicUrl(filePath);

    return publicUrl;
  };

  const onSubmit = async (values: CampaignFormValues) => {
    setIsSubmitting(true);
    try {
      const bannerUrl = await uploadBanner();

      // Generate slug from title
      const generateSlug = (title: string, id?: string) => {
        const baseSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        
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
        budget: Number(values.budget),
        rpm_rate: Number(values.rpm_rate),
        guidelines: values.guidelines || null,
        embed_url: values.embed_url || null,
        preview_url: values.preview_url || null,
        brand_id: brandId,
        brand_name: brandName,
        banner_url: bannerUrl,
        status: "active",
        allowed_platforms: values.allowed_platforms,
        application_questions: values.application_questions,
        slug: generateSlug(values.title, campaign?.id),
        is_private: values.is_private,
        access_code: values.is_private ? values.access_code?.toUpperCase() : null,
        requires_application: values.requires_application,
      };

      if (campaign) {
        // Update existing campaign
        const { error } = await supabase
          .from("campaigns")
          .update(campaignData)
          .eq("id", campaign.id);

        if (error) throw error;
        toast.success("Campaign updated successfully!");
      } else {
        // Create new campaign
        const { error } = await supabase.from("campaigns").insert(campaignData);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#202020] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">
            {campaign ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {campaign
              ? `Edit campaign details for ${brandName}`
              : `Create a new campaign for ${brandName}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Banner Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Campaign Banner</label>
              <div className="flex flex-col gap-3">
                {bannerPreview ? (
                  <div className="relative w-full h-56 rounded-xl overflow-hidden bg-[#191919] border border-white/10">
                    <img
                      src={bannerPreview}
                      alt="Campaign banner"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="absolute top-3 right-3 bg-[#191919]/80 hover:bg-destructive border border-white/10"
                      onClick={removeBanner}
                    >
                      <X className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="w-full h-56 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors bg-[#191919]"
                    onClick={() => fileInputRef.current?.click()}
                  >
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
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Campaign Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter campaign title" 
                      className="bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-destructive/80" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Campaign Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the campaign"
                      className="resize-none bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-destructive/80" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Budget ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        className="bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rpm_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">RPM Rate ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        className="bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="embed_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Campaign Brief URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/campaign-brief"
                      className="bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-white/40 mt-1">
                    Enter a URL to your campaign brief or guidelines document
                  </p>
                  <FormMessage className="text-destructive/80" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="embed_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Campaign Embed URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/campaign-embed"
                      className="bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-white/40 mt-1">
                    Enter a URL to display as an embedded page for campaign participants
                  </p>
                  <FormMessage className="text-destructive/80" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preview_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Campaign Preview URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/campaign-preview"
                      className="bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-white/40 mt-1">
                    Enter a URL to display as preview for non-members viewing this campaign
                  </p>
                  <FormMessage className="text-destructive/80" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowed_platforms"
              render={() => (
                <FormItem>
                  <FormLabel className="text-white">Allowed Platforms</FormLabel>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="allowed_platforms"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0 rounded-lg border border-white/10 p-3 bg-[#191919]">
                          <FormLabel className="text-white font-normal cursor-pointer">
                            TikTok
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value?.includes("tiktok")}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), "tiktok"]
                                  : field.value?.filter((val) => val !== "tiktok") || [];
                                field.onChange(newValue);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="allowed_platforms"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0 rounded-lg border border-white/10 p-3 bg-[#191919]">
                          <FormLabel className="text-white font-normal cursor-pointer">
                            Instagram
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value?.includes("instagram")}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), "instagram"]
                                  : field.value?.filter((val) => val !== "instagram") || [];
                                field.onChange(newValue);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="allowed_platforms"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0 rounded-lg border border-white/10 p-3 bg-[#191919]">
                          <FormLabel className="text-white font-normal cursor-pointer">
                            X (Twitter)
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value?.includes("x")}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), "x"]
                                  : field.value?.filter((val) => val !== "x") || [];
                                field.onChange(newValue);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="allowed_platforms"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0 rounded-lg border border-white/10 p-3 bg-[#191919]">
                          <FormLabel className="text-white font-normal cursor-pointer">
                            YouTube
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value?.includes("youtube")}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), "youtube"]
                                  : field.value?.filter((val) => val !== "youtube") || [];
                                field.onChange(newValue);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormMessage className="text-destructive/80" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="application_questions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Application Questions (Optional, max 3)</FormLabel>
                  <div className="space-y-2">
                    {field.value?.map((question, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={question}
                          onChange={(e) => {
                            const newQuestions = [...(field.value || [])];
                            newQuestions[index] = e.target.value;
                            field.onChange(newQuestions);
                          }}
                          placeholder={`Question ${index + 1}`}
                          className="bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newQuestions = field.value?.filter((_, i) => i !== index) || [];
                            field.onChange(newQuestions);
                          }}
                          className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!field.value || field.value.length < 3) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange([...(field.value || []), ""])}
                        className="w-full bg-[#191919] border-white/10 text-white hover:bg-white/5"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    Custom questions for creators to answer when applying to this campaign
                  </p>
                  <FormMessage className="text-destructive/80" />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 bg-[#191919]/50 rounded-lg border border-white/10">
              <FormField
                control={form.control}
                name="requires_application"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={!field.value}
                        onCheckedChange={(checked) => field.onChange(!checked)}
                        className="border-white/20 data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-white font-normal cursor-pointer">
                        Make this campaign public (instant join)
                      </FormLabel>
                      <p className="text-xs text-white/40">
                        Users can join instantly without submitting an application
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_private"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-white/20 data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-white font-normal cursor-pointer">
                        Make this campaign private (invite-only)
                      </FormLabel>
                      <p className="text-xs text-white/40">
                        Private campaigns require an access code to join and won't appear in public listings
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("is_private") && (
                <FormField
                  control={form.control}
                  name="access_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Access Code *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter access code (min 6 characters)"
                          className="bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary uppercase font-mono tracking-wider"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <p className="text-xs text-white/40">
                        This code will be required for creators to join your campaign
                      </p>
                      <FormMessage className="text-destructive/80" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-white/10">
              <div>
                {campaign && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isSubmitting}
                    className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Campaign
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    form.reset();
                    setBannerFile(null);
                    setBannerPreview(null);
                  }}
                  disabled={isSubmitting}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-white min-w-[140px]"
                >
                  {isSubmitting
                    ? campaign
                      ? "Updating..."
                      : "Creating..."
                    : campaign
                    ? "Update Campaign"
                    : "Create Campaign"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
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
            <AlertDialogAction 
              onClick={() => {
                setDeleteDialogOpen(false);
                setOpen(false);
                onDelete?.();
              }} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
