import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Upload, X, Globe, Link2, FolderOpen } from "lucide-react";

const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z.string().trim().min(1, "Slug is required").max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(500).optional(),
  brand_type: z.enum(["Lead", "DWY", "Client"], {
    required_error: "Please select a brand type"
  }),
  home_url: z.string().trim().optional().or(z.literal("")),
  account_url: z.string().url().optional().or(z.literal("")),
  assets_url: z.string().url().optional().or(z.literal("")),
  show_account_tab: z.boolean(),
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  reactivateButton?: React.ReactNode;
}

export function EditBrandDialog({
  brand,
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  reactivateButton
}: EditBrandDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
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
      show_account_tab: brand.show_account_tab ?? true,
    }
  });

  useEffect(() => {
    if (open) {
      const defaultAssetsUrl = brand.assets_url || 
        (brand.brand_type === "DWY" ? "https://partners.virality.cc/template/assets" : "");
      
      form.reset({
        name: brand.name,
        slug: brand.slug,
        description: brand.description || "",
        brand_type: brand.brand_type as "Lead" | "DWY" | "Client" || "Client",
        home_url: brand.home_url || "",
        account_url: brand.account_url || "",
        assets_url: defaultAssetsUrl,
        show_account_tab: brand.show_account_tab ?? true,
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
    const { error: uploadError } = await supabase.storage.from("campaign-banners").upload(filePath, logoFile);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("campaign-banners").getPublicUrl(filePath);
    return publicUrl;
  };

  const onSubmit = async (values: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      const logoUrl = await uploadLogo();
      
      const { error: brandError } = await supabase
        .from("brands")
        .update({
          name: values.name,
          slug: values.slug,
          description: values.description || null,
          logo_url: logoUrl,
          brand_type: values.brand_type,
          home_url: values.home_url || null,
          account_url: values.account_url || null,
          assets_url: values.assets_url || null,
          show_account_tab: values.show_account_tab
        })
        .eq("id", brand.id);
      
      if (brandError) throw brandError;

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="ghost" className="bg-[#1a1b1a]">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[#0c0c0c] border-[#1a1a1a]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-medium text-white">Edit Brand</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Logo Upload */}
            <div className="flex items-start gap-4">
              {logoPreview ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#1a1a1a] shrink-0">
                  <img src={logoPreview} alt="Brand logo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ) : (
                <div 
                  className="w-20 h-20 border border-dashed border-[#2a2a2a] rounded-xl flex items-center justify-center cursor-pointer hover:border-[#3a3a3a] hover:bg-[#111] transition-all shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 text-[#666]" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              
              <div className="flex-1 space-y-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="Brand name" 
                        className="bg-[#111] border-[#1a1a1a] text-white h-9 text-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="text-[#666] text-sm pr-1">@</span>
                        <Input 
                          placeholder="brand-slug" 
                          className="bg-[#111] border-[#1a1a1a] text-white h-9 text-sm"
                          {...field}
                          onChange={e => {
                            const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                            field.onChange(slug);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <FormField control={form.control} name="brand_type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#888] text-xs font-normal">Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-[#111] border-[#1a1a1a] text-white h-9 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-[#111] border-[#1a1a1a]">
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="DWY">DWY</SelectItem>
                    <SelectItem value="Client">Client</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#888] text-xs font-normal">Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Brief description..." 
                    className="bg-[#111] border-[#1a1a1a] text-white text-sm resize-none min-h-[60px]"
                    rows={2}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Links Section */}
            <div className="space-y-3 pt-2">
              <p className="text-[#888] text-xs font-normal">Links</p>
              
              <FormField control={form.control} name="home_url" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[#666] shrink-0" />
                      <Textarea 
                        placeholder='Home embed HTML (iframe)' 
                        className="bg-[#111] border-[#1a1a1a] text-white text-xs font-mono resize-none min-h-[36px]"
                        rows={1}
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="account_url" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-[#666] shrink-0" />
                      <Input 
                        placeholder="Account URL" 
                        className="bg-[#111] border-[#1a1a1a] text-white h-9 text-sm"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="assets_url" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-[#666] shrink-0" />
                      <Input 
                        placeholder="Assets URL" 
                        className="bg-[#111] border-[#1a1a1a] text-white h-9 text-sm"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="show_account_tab" render={({ field }) => (
              <FormItem className="flex items-center justify-between py-2">
                <FormLabel className="text-[#888] text-xs font-normal cursor-pointer">
                  Show account tab in sidebar
                </FormLabel>
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-primary"
                  />
                </FormControl>
              </FormItem>
            )} />

            <div className="flex items-center gap-2 pt-2">
              {reactivateButton && (
                <div className="mr-auto">
                  {reactivateButton}
                </div>
              )}
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setOpen(false)} 
                disabled={isSubmitting}
                className="text-[#888] hover:text-white hover:bg-[#1a1a1a]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-white text-black hover:bg-white/90"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
