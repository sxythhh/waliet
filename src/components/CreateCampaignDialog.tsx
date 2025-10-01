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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, X } from "lucide-react";

const campaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.string().trim().max(1000).optional(),
  budget: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Budget must be a positive number",
  }),
  rpm_rate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "RPM rate must be a positive number",
  }),
  guidelines: z.string().trim().max(2000).optional(),
  allowed_platforms: z.array(z.string()).min(1, "Select at least one platform"),
  application_questions: z.array(z.string().trim().min(1)).max(3, "Maximum 3 questions allowed"),
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
}

interface CreateCampaignDialogProps {
  brandId: string;
  brandName: string;
  onSuccess?: () => void;
  campaign?: Campaign;
  trigger?: React.ReactNode;
}

export function CreateCampaignDialog({
  brandId,
  brandName,
  onSuccess,
  campaign,
  trigger,
}: CreateCampaignDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    campaign?.banner_url || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: campaign?.title || "",
      description: campaign?.description || "",
      budget: campaign?.budget?.toString() || "",
      rpm_rate: campaign?.rpm_rate?.toString() || "",
      guidelines: campaign?.guidelines || "",
      allowed_platforms: campaign?.allowed_platforms || ["tiktok", "instagram"],
      application_questions: campaign?.application_questions || [],
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

      const campaignData = {
        title: values.title,
        description: values.description || null,
        budget: Number(values.budget),
        rpm_rate: Number(values.rpm_rate),
        guidelines: values.guidelines || null,
        brand_id: brandId,
        brand_name: brandName,
        banner_url: bannerUrl,
        status: "active",
        allowed_platforms: values.allowed_platforms,
        application_questions: values.application_questions,
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
                  <FormLabel className="text-white">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your campaign"
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
              name="guidelines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Campaign Guidelines</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter campaign guidelines and requirements"
                      className="resize-none bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
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
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="allowed_platforms"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes("tiktok")}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), "tiktok"]
                                  : field.value?.filter((val) => val !== "tiktok") || [];
                                field.onChange(newValue);
                              }}
                              className="border-white/20 data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                          <FormLabel className="text-white font-normal cursor-pointer">
                            TikTok
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="allowed_platforms"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes("instagram")}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), "instagram"]
                                  : field.value?.filter((val) => val !== "instagram") || [];
                                field.onChange(newValue);
                              }}
                              className="border-white/20 data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                          <FormLabel className="text-white font-normal cursor-pointer">
                            Instagram
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormMessage className="text-destructive/80" />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel className="text-white">Application Questions (Max 3)</FormLabel>
              {[0, 1, 2].map((index) => (
                <FormField
                  key={index}
                  control={form.control}
                  name={`application_questions.${index}` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder={`Question ${index + 1} (optional)`}
                          className="bg-[#191919] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const questions = form.getValues("application_questions") || [];
                            questions[index] = e.target.value;
                            form.setValue("application_questions", questions.filter(q => q && q.trim()));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
              <FormMessage className="text-destructive/80" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
