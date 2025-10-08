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
import { Separator } from "@/components/ui/separator";
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
  home_url: z.string().trim().optional().or(z.literal("")),
  account_url: z.string().url().optional().or(z.literal("")),
  assets_url: z.string().url().optional().or(z.literal("")),
  show_account_tab: z.boolean(),
  // Sales deal fields
  deal_value: z.string().optional(),
  probability: z.string().optional(),
  close_date: z.string().optional(),
  next_payment_date: z.string().optional(),
  payment_amount: z.string().optional(),
  notes: z.string().optional(),
  won_date: z.string().optional(),
  lost_reason: z.string().optional(),
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
  const [dealId, setDealId] = useState<string | null>(null);
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
      deal_value: "",
      probability: "",
      close_date: "",
      next_payment_date: "",
      payment_amount: "",
      notes: "",
      won_date: "",
      lost_reason: "",
    }
  });
  useEffect(() => {
    if (open) {
      const defaultAssetsUrl = brand.assets_url || 
        (brand.brand_type === "DWY" ? "https://partners.virality.cc/template/assets" : "");
      
      // Fetch sales deal data
      const fetchDealData = async () => {
        const { data: dealData } = await supabase
          .from('sales_deals')
          .select('*')
          .eq('brand_id', brand.id)
          .maybeSingle();

        if (dealData) {
          setDealId(dealData.id);
          form.reset({
            name: brand.name,
            slug: brand.slug,
            description: brand.description || "",
            brand_type: brand.brand_type as "Lead" | "DWY" | "Client" || "Client",
            home_url: brand.home_url || "",
            account_url: brand.account_url || "",
            assets_url: defaultAssetsUrl,
            show_account_tab: brand.show_account_tab ?? true,
            deal_value: dealData.deal_value?.toString() || "",
            probability: dealData.probability?.toString() || "",
            close_date: dealData.close_date || "",
            next_payment_date: dealData.next_payment_date || "",
            payment_amount: dealData.payment_amount?.toString() || "",
            notes: dealData.notes || "",
            won_date: dealData.won_date || "",
            lost_reason: dealData.lost_reason || "",
          });
        } else {
          form.reset({
            name: brand.name,
            slug: brand.slug,
            description: brand.description || "",
            brand_type: brand.brand_type as "Lead" | "DWY" | "Client" || "Client",
            home_url: brand.home_url || "",
            account_url: brand.account_url || "",
            assets_url: defaultAssetsUrl,
            show_account_tab: brand.show_account_tab ?? true,
            deal_value: "",
            probability: "",
            close_date: "",
            next_payment_date: "",
            payment_amount: "",
            notes: "",
            won_date: "",
            lost_reason: "",
          });
        }
      };

      fetchDealData();
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
      
      // Update brand
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

      // Update or create sales deal
      if (dealId) {
        const { error: dealError } = await supabase
          .from('sales_deals')
          .update({
            deal_value: values.deal_value ? parseFloat(values.deal_value) : null,
            probability: values.probability ? parseInt(values.probability) : null,
            close_date: values.close_date || null,
            next_payment_date: values.next_payment_date || null,
            payment_amount: values.payment_amount ? parseFloat(values.payment_amount) : null,
            notes: values.notes || null,
            won_date: values.won_date || null,
            lost_reason: values.lost_reason || null,
          })
          .eq('id', dealId);

        if (dealError) throw dealError;
      }

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
                    <FormLabel>Home Embed HTML</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='<iframe src="https://example.com" width="100%" height="100%" frameborder="0" allowfullscreen />' 
                        className="resize-none font-mono text-xs"
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Paste the full iframe HTML code for the brand&apos;s home page embed
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

            <Separator className="my-6" />

            {/* Sales Deal Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Sales Deal Information</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="deal_value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Value ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="probability" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probability (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        max="100"
                        placeholder="50" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="close_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Close Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="next_payment_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="payment_amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add notes about this deal..." 
                      className="resize-none"
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="won_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Won Date (if applicable)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="lost_reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lost Reason (if applicable)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Why was this deal lost?" 
                        className="resize-none"
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              {reactivateButton && (
                <div className="mr-auto">
                  {reactivateButton}
                </div>
              )}
              <div className="flex gap-3 ml-auto">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Brand"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
}