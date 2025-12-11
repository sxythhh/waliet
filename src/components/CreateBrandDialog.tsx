import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, X } from "lucide-react";
const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z.string().trim().min(1, "Slug is required").max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(500).optional(),
  brand_type: z.enum(["Lead", "DWY", "Client"], {
    required_error: "Please select a brand type"
  }),
  email: z.string().trim().email("Valid email is required")
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
      brand_type: "Client",
      email: ""
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
        data: brandData,
        error: brandError
      } = await supabase.from("brands").insert({
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        logo_url: logoUrl,
        brand_type: values.brand_type
      }).select().single();
      if (brandError) throw brandError;
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const {
        error: dealError
      } = await supabase.from("sales_deals").insert({
        brand_id: brandData.id,
        stage: 'lead',
        owner_id: user.id
      });
      if (dealError) {
        console.error("Error creating sales deal:", dealError);
      }
      const {
        error: inviteError
      } = await supabase.from("brand_invitations").insert({
        brand_id: brandData.id,
        email: values.email,
        role: "admin",
        invited_by: user.id
      });
      if (inviteError) throw inviteError;
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
  return <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && <DialogTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Create Brand
          </Button>
        </DialogTrigger>}
      <DialogContent className="max-w-md bg-white dark:bg-[#080808] border-border dark:border-[#1a1a1a]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-medium">Create Brand</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Logo Upload */}
            <div className="flex items-start gap-4">
              {logoPreview ? <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted dark:bg-[#1a1a1a] shrink-0">
                  <img src={logoPreview} alt="Brand logo" className="w-full h-full object-cover" />
                  <button type="button" onClick={removeLogo} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div> : <div className="w-20 h-20 border border-dashed border-border dark:border-[#2a2a2a] rounded-xl flex items-center justify-center cursor-pointer hover:border-muted-foreground dark:hover:border-[#3a3a3a] hover:bg-muted/50 dark:hover:bg-[#111] transition-all shrink-0" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-5 w-5 text-muted-foreground dark:text-[#666]" />
                </div>}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              
              <div className="flex-1 space-y-3">
                <FormField control={form.control} name="name" render={({
                field
              }) => <FormItem>
                    <FormControl>
                      <Input placeholder="Brand name" className="bg-muted/50 dark:bg-[#111] border-border dark:border-[#1a1a1a] h-9 text-sm" {...field} onChange={e => {
                    field.onChange(e);
                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                    form.setValue("slug", slug);
                  }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

                <FormField control={form.control} name="slug" render={({
                field
              }) => <FormItem>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="text-muted-foreground dark:text-[#666] text-sm pr-1">@</span>
                        <Input placeholder="brand-slug" className="bg-muted/50 dark:bg-[#111] border-border dark:border-[#1a1a1a] h-9 text-sm" {...field} onChange={e => {
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                      field.onChange(slug);
                    }} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              </div>
            </div>

            <FormField control={form.control} name="brand_type" render={({
            field
          }) => {}} />

            <FormField control={form.control} name="description" render={({
            field
          }) => <FormItem>
                <FormLabel className="text-muted-foreground text-xs font-normal">Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Brief description..." className="bg-muted/50 dark:bg-[#111] border-border dark:border-[#1a1a1a] text-sm resize-none min-h-[60px]" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>} />

            <FormField control={form.control} name="email" render={({
            field
          }) => {}} />

            <div className="flex items-center gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => {
              setOpen(false);
              form.reset();
              setLogoFile(null);
              setLogoPreview(null);
            }} disabled={isSubmitting} className="text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-[#1a1a1a] ml-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
}