import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, X } from "lucide-react";
const brandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(100),
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
      description: ""
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
  return <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && <DialogTrigger asChild>
          
        </DialogTrigger>}
      <DialogContent className="max-w-sm bg-[#0a0a0a] border-0 p-0 overflow-hidden">
        <Form className="py-0 px-0">
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-5">
            {/* Logo Upload + Brand Name in same row */}
            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {logoPreview ? <div className="relative group flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-primary/20">
                    <img src={logoPreview} alt="Brand logo" className="w-full h-full object-cover" />
                  </div>
                  <button type="button" onClick={removeLogo} className="absolute -top-1.5 -right-1.5 p-1 bg-red-500/90 rounded-full hover:bg-red-500 transition-colors shadow-lg">
                    <X className="h-2.5 w-2.5 text-white" />
                  </button>
                </div> : <button type="button" onClick={() => fileInputRef.current?.click()} className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:bg-primary/5 group bg-[#141414] flex-shrink-0">
                  <Upload className="h-4 w-4 text-neutral-500 group-hover:text-primary transition-colors" />
                </button>}

              <FormField control={form.control} name="name" render={({
              field
            }) => <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Brand name" className="bg-[#141414] border-0 h-11 text-sm text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0 rounded-xl" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.3px'
                }} {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>} />
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-white font-medium rounded-xl transition-all border-t border-t-[#4b85f7]" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px',
            backgroundColor: '#2061de'
          }}>
              {isSubmitting ? <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span> : "Create Brand"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
}