import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Upload, X } from "lucide-react";
const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z.string().trim().min(1, "Slug is required").max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(500).optional(),
  brand_type: z.enum(["Lead", "DWY", "Client"], {
    required_error: "Please select a brand type"
  }),
  home_url: z.string().url().optional().or(z.literal("")),
  account_url: z.string().url().optional().or(z.literal("")),
  assets_url: z.string().url().optional().or(z.literal("")),
  show_account_tab: z.boolean()
});
type BrandFormValues = z.infer<typeof brandSchema>;
interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  brand_type: string | null;
  home_url: string | null;
  account_url: string | null;
  assets_url: string | null;
  show_account_tab: boolean;
}
interface EditBrandDialogProps {
  brand: Brand;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}
export function EditBrandDialog({
  brand,
  onSuccess,
  trigger
}: EditBrandDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(brand.logo_url);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: brand.name,
      slug: brand.slug,
      description: brand.description || "",
      brand_type: brand.brand_type as "Lead" | "DWY" | "Client" || "Client",
      home_url: brand.home_url || "",
      account_url: brand.account_url || "",
      assets_url: brand.assets_url || "",
      show_account_tab: brand.show_account_tab ?? true
    }
  });
  useEffect(() => {
    if (open) {
      form.reset({
        name: brand.name,
        slug: brand.slug,
        description: brand.description || "",
        brand_type: brand.brand_type as "Lead" | "DWY" | "Client" || "Client",
        home_url: brand.home_url || "",
        account_url: brand.account_url || "",
        assets_url: brand.assets_url || "",
        show_account_tab: brand.show_account_tab ?? true
      });
      setLogoPreview(brand.logo_url);
      setLogoFile(null);
    }
  }, [open, brand, form]);
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
    if (!logoFile) return brand.logo_url;
    const fileExt = logoFile.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    const {
      error: uploadError
    } = await supabase.storage.from("campaign-banners").upload(filePath, logoFile);
    if (uploadError) throw uploadError;
    const {
      data: {
        publicUrl
      }
    } = supabase.storage.from("campaign-banners").getPublicUrl(filePath);
    return publicUrl;
  };
  const onSubmit = async (values: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      const logoUrl = await uploadLogo();
      const {
        error
      } = await supabase.from("brands").update({
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        logo_url: logoUrl,
        brand_type: values.brand_type,
        home_url: values.home_url || null,
        account_url: values.account_url || null,
        assets_url: values.assets_url || null,
        show_account_tab: values.show_account_tab
      }).eq("id", brand.id);
      if (error) throw error;
      toast.success("Brand updated successfully!");
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating brand:", error);
      if (error.code === "23505") {
        toast.error("A brand with this slug already exists");
      } else {
        toast.error("Failed to update brand. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="ghost" className="bg-[#1a1b1a]">
            <Pencil className="h-4 w-4" />
          </Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
          <DialogDescription>
            Update brand information and settings
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Brand Logo</label>
              <div className="flex flex-col gap-3">
                {logoPreview ? <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
                    <img src={logoPreview} alt="Brand logo" className="w-full h-full object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={removeLogo}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div> : <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Upload logo</p>
                    </div>
                  </div>}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
            </div>

            <FormField control={form.control} name="name" render={({
            field
          }) => <FormItem>
                  <FormLabel>Brand Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter brand name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="slug" render={({
            field
          }) => <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="brand-slug" {...field} onChange={e => {
                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                field.onChange(slug);
              }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="brand_type" render={({
            field
          }) => <FormItem>
                  <FormLabel>Brand Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="DWY">DWY</SelectItem>
                      <SelectItem value="Client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="description" render={({
            field
          }) => <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the brand" className="resize-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium">Brand Links</h4>
              
              <FormField control={form.control} name="home_url" render={({
              field
            }) => <FormItem>
                    <FormLabel>Home URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/home" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL for the brand's home page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="account_url" render={({
              field
            }) => <FormItem>
                    <FormLabel>Account URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/account" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL for the brand's account page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="assets_url" render={({
              field
            }) => <FormItem>
                    <FormLabel>Assets URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/assets" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL for the brand's assets page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="show_account_tab" render={({
              field
            }) => <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Show Account Tab
                      </FormLabel>
                      <FormDescription>
                        Display the account tab in the sidebar
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Brand"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
}