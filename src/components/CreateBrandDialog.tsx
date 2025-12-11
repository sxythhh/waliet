import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, X } from "lucide-react";

const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z.string().trim().min(1, "Slug is required").max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(500).optional(),
});

type BrandFormValues = z.infer<typeof brandSchema>;

interface CreateBrandDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function CreateBrandDialog({
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false
}: CreateBrandDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange || (() => {}) : setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    }
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
    const { error: uploadError } = await supabase.storage.from("campaign-banners").upload(filePath, logoFile);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("campaign-banners").getPublicUrl(filePath);
    return publicUrl;
  };

  const onSubmit = async (values: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      const logoUrl = await uploadLogo();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: brandData, error: brandError } = await supabase.from("brands").insert({
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        logo_url: logoUrl,
      }).select().single();

      if (brandError) throw brandError;

      // Add creator as brand member
      const { error: memberError } = await supabase.from("brand_members").insert({
        brand_id: brandData.id,
        user_id: user.id,
        role: "owner"
      });

      if (memberError) {
        console.error("Error adding brand member:", memberError);
      }

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
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Create Brand
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md bg-background border-0">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-medium">Create Brand</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Logo Upload */}
            <div className="flex items-start gap-4">
              {logoPreview ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                  <img src={logoPreview} alt="Brand logo" className="w-full h-full object-cover" />
                  <button type="button" onClick={removeLogo} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 border border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/50 transition-all shrink-0" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              
              <div className="flex-1 space-y-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="Brand name" 
                        className="bg-muted/50 border-0 h-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" 
                        {...field} 
                        onChange={e => {
                          field.onChange(e);
                          const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                          form.setValue("slug", slug);
                        }} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="text-muted-foreground text-sm pr-1">@</span>
                        <Input 
                          placeholder="brand-slug" 
                          className="bg-muted/50 border-0 h-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" 
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

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground text-xs font-normal">Description</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Brief description..." 
                    className="bg-muted/50 border-0 h-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex items-center gap-2 pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => {
                  setOpen(false);
                  form.reset();
                  setLogoFile(null);
                  setLogoPreview(null);
                }} 
                disabled={isSubmitting} 
                className="text-muted-foreground hover:text-foreground hover:bg-muted ml-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 tracking-[-0.5px]">
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
