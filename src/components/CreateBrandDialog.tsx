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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  brand_type: z.enum(["Lead", "DWY", "Client"], {
    required_error: "Please select a brand type",
  }),
});

type BrandFormValues = z.infer<typeof brandSchema>;

interface CreateBrandDialogProps {
  onSuccess?: () => void;
}

export function CreateBrandDialog({ onSuccess }: CreateBrandDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
      slug: "",
      brand_type: "Client",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;

    const fileExt = logoFile.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("campaign-banners")
      .upload(filePath, logoFile);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("campaign-banners").getPublicUrl(filePath);

    return publicUrl;
  };

  const onSubmit = async (values: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      const logoUrl = await uploadLogo();

      const { error } = await supabase.from("brands").insert({
        name: values.name,
        slug: values.slug,
        logo_url: logoUrl,
        brand_type: values.brand_type,
      });

      if (error) throw error;

      toast.success("Brand created successfully!");
      setOpen(false);
      form.reset();
      setLogoFile(null);
      setLogoPreview(null);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating brand:", error);
      if (error.code === "23505") {
        toast.error("A brand with this slug already exists");
      } else {
        toast.error("Failed to create brand. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Brand
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card border-0">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Create New Brand</DialogTitle>
          <DialogDescription className="text-xs">
            Add a new brand to the platform
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-3">
              {/* Logo Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Brand Logo</label>
                <div className="flex flex-col gap-2">
                  {logoPreview ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={logoPreview}
                        alt="Brand logo"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={removeLogo}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="text-center">
                        <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Upload</p>
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

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Brand Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter brand name" 
                          className="h-9 text-sm" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            const slug = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, "-")
                              .replace(/-+/g, "-")
                              .replace(/^-|-$/g, "");
                            form.setValue("slug", slug);
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="brand-slug"
                          className="h-9 text-sm"
                          {...field}
                          onChange={(e) => {
                            const slug = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, "-")
                              .replace(/-+/g, "-")
                              .replace(/^-|-$/g, "");
                            field.onChange(slug);
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="brand_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Brand Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select brand type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="DWY">DWY</SelectItem>
                        <SelectItem value="Client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                  setLogoFile(null);
                  setLogoPreview(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Brand"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
