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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {campaign ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
          <DialogDescription>
            {campaign
              ? `Edit campaign for ${brandName}`
              : `Create a new campaign for ${brandName}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Banner Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Campaign Banner</label>
              <div className="flex flex-col gap-3">
                {bannerPreview ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={bannerPreview}
                      alt="Campaign banner"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeBanner}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload banner
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 1200x400px
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
                  <FormLabel>Campaign Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter campaign title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your campaign"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rpm_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RPM Rate ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="guidelines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Guidelines</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter campaign guidelines and requirements"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                  setBannerFile(null);
                  setBannerPreview(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
