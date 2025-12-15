import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";
const brandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(100),
  home_url: z.string().trim().url("Please enter a valid URL").optional().or(z.literal("")),
  description: z.string().trim().max(500).optional()
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
  const navigate = useNavigate();
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
      home_url: "",
      description: ""
    }
  });
  const brandName = form.watch("name");

  // Generate initials from brand name
  const getInitials = (name: string) => {
    if (!name) return "V";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
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
  const generateSlug = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  };
  const onSubmit = async (values: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      const logoUrl = await uploadLogo();
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const slug = generateSlug(values.name);
      const {
        data: brandData,
        error: brandError
      } = await supabase.from("brands").insert({
        name: values.name,
        slug: slug,
        description: values.description || null,
        home_url: values.home_url || null,
        logo_url: logoUrl
      }).select().single();
      if (brandError) throw brandError;

      // Add creator as brand member
      const {
        error: memberError
      } = await supabase.from("brand_members").insert({
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

      // Navigate to the new brand workspace
      navigate(`/dashboard?workspace=${slug}`);
    } catch (error: any) {
      console.error("Error creating brand:", error);
      if (error.code === "23505") {
        toast.error("A brand with this name already exists");
      } else {
        toast.error("Failed to create brand. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleCancel = () => {
    form.reset();
    setLogoFile(null);
    setLogoPreview(null);
    setOpen(false);
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && <DialogTrigger asChild />}
      <DialogContent className="sm:max-w-[420px] bg-card border-0 p-0 overflow-hidden rounded-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            {/* Header */}
            <div className="px-6 pt-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg font-semibold tracking-tight font-inter">
                  Create Brand
                </DialogTitle>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                  Create and customize your brand workspace.
                </p>
              </DialogHeader>
            </div>

            {/* Content */}
            <div className="space-y-5 px-6 py-5">
              {/* Logo Section */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                  Set an Icon
                </label>
                <div className="flex items-center gap-4">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  
                  {/* Logo Preview or Initials */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-primary flex items-center justify-center">
                    {logoPreview ? <img src={logoPreview} alt="Brand logo" className="w-full h-full object-cover" /> : <span className="text-primary-foreground text-base font-semibold font-inter">
                        {getInitials(brandName)}
                      </span>}
                  </div>

                  {/* Upload/Remove Buttons */}
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 px-3 text-sm font-inter tracking-[-0.3px] gap-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                    </Button>
                    {logoPreview && <Button type="button" variant="ghost" size="sm" onClick={removeLogo} className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground font-inter tracking-[-0.3px]">
                        Remove
                      </Button>}
                  </div>
                </div>
              </div>

              {/* Name Field */}
              <FormField control={form.control} name="name" render={({
              field
            }) => <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter brand name" className="h-10 bg-transparent border-border text-sm font-inter tracking-[-0.3px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#3672ea] rounded-lg transition-colors" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>} />

              {/* Website URL Field */}
              <FormField control={form.control} name="home_url" render={({
              field
            }) => <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Website URL
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourbrand.com" className="h-10 bg-transparent border-border text-sm font-inter tracking-[-0.3px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#3672ea] rounded-lg transition-colors" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>} />
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={handleCancel} className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.3px] hover:bg-transparent">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.5px] bg-[#1f60dd] text-white hover:bg-[#1a52c2] border-t border-[#3672ea] rounded-lg">
                {isSubmitting ? <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span> : "Continue"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
}