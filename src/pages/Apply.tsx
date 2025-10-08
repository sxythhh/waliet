import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Upload, X, ArrowLeft, ArrowRight } from "lucide-react";

const applicationSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  business_description: z.string().min(10, "Please provide at least 10 characters"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  current_mrr: z.string().min(1, "Please select your current MRR"),
  monthly_budget: z.string().min(1, "Please select your budget"),
  timeline_commitment: z.string().min(1, "Please select your timeline"),
  desired_outcome: z.string().min(1, "Please select your desired outcome"),
  has_content_library: z.string().min(1, "Please select an option"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

const STEPS = [
  "Business Details",
  "Budget & Goals",
  "Objectives",
  "Content Library",
  "Contact Info",
];

export default function Apply() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      business_name: "",
      business_description: "",
      website: "",
      current_mrr: "",
      monthly_budget: "",
      timeline_commitment: "",
      desired_outcome: "",
      has_content_library: "",
      name: "",
      email: "",
      phone: "",
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
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
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;

    setUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("brand-application-logos")
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("brand-application-logos").getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const nextStep = async () => {
    const fields = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fields);
    
    if (isValid) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): (keyof ApplicationFormValues)[] => {
    switch (step) {
      case 0:
        return ["business_name", "business_description", "website"];
      case 1:
        return ["current_mrr", "monthly_budget"];
      case 2:
        return ["timeline_commitment", "desired_outcome"];
      case 3:
        return ["has_content_library"];
      case 4:
        return ["name", "email", "phone"];
      default:
        return [];
    }
  };

  const onSubmit = async (values: ApplicationFormValues) => {
    setIsSubmitting(true);
    try {
      const logoUrl = await uploadLogo();

      const { error } = await supabase.from("brand_applications").insert([
        {
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          business_name: values.business_name,
          business_description: values.business_description,
          website: values.website || null,
          current_mrr: values.current_mrr,
          monthly_budget: values.monthly_budget,
          timeline_commitment: values.timeline_commitment,
          desired_outcome: values.desired_outcome,
          has_content_library: values.has_content_library,
          logo_url: logoUrl,
        },
      ]);

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Application submitted successfully!");
      form.reset();
      setLogoFile(null);
      setLogoPreview(null);
      setCurrentStep(0);
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-none shadow-none">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-6 w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl mb-3">Application Submitted!</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Thank you for your interest. We'll review your application and get back to you within 24-48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button onClick={() => setIsSubmitted(false)} className="w-full" size="lg">
              Submit Another Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 sm:py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Apply for Virality Campaign</h1>
          <p className="text-muted-foreground">
            Join our content campaign and scale your brand
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-3">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-xs font-medium transition-all ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className={`text-xs text-center ${isActive ? "font-medium text-foreground" : "text-muted-foreground"} hidden sm:block`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">{STEPS[currentStep]}</CardTitle>
            <CardDescription>Step {currentStep + 1} of {STEPS.length}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {currentStep === 0 && (
                  <div className="space-y-5">
                    {/* Logo Upload */}
                    <div className="space-y-3">
                      <FormLabel>Brand Logo (Optional)</FormLabel>
                      <div className="flex flex-col items-center gap-3">
                        {logoPreview ? (
                          <div className="relative">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="w-24 h-24 object-contain rounded-lg border border-border"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border"
                              onClick={removeLogo}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="w-full cursor-pointer">
                            <div className="border border-dashed border-border rounded-lg py-6 px-4 text-center hover:border-primary/50 transition-colors">
                              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm font-medium mb-0.5">Click to upload logo</p>
                              <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoChange}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="business_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Inc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="business_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Describe your business *</FormLabel>
                          <FormDescription>
                            Tell us what you sell or offer in 1-2 sentences
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              placeholder="We help businesses..."
                              className="min-h-[80px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input type="url" placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="current_mrr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What is your company's current MRR? *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select MRR range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Pre-Revenue">Pre-Revenue</SelectItem>
                              <SelectItem value="$0 - $10,000 / month">$0 - $10,000 / month</SelectItem>
                              <SelectItem value="$10,000 - $50,000 / month">$10,000 - $50,000 / month</SelectItem>
                              <SelectItem value="$50,000 - $100,000 / month">$50,000 - $100,000 / month</SelectItem>
                              <SelectItem value="$100,000+ / month">$100,000+ / month</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="monthly_budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly budget for content campaign *</FormLabel>
                          <FormDescription>
                            Include retainer + media spend
                          </FormDescription>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select budget range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="$1,000 - $5,000">$1,000 - $5,000</SelectItem>
                              <SelectItem value="$5,000 - $10,000">$5,000 - $10,000</SelectItem>
                              <SelectItem value="$10,000 - $30,000">$10,000 - $30,000</SelectItem>
                              <SelectItem value="$30,000+">$30,000+</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="timeline_commitment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeline and commitment level *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select commitment level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="We're just testing the waters and exploring options.">
                                Testing the waters
                              </SelectItem>
                              <SelectItem value="We have a budget approved, ready to commit to a multi-month run to see results.">
                                Ready for multi-month commitment
                              </SelectItem>
                              <SelectItem value="We're actively running campaigns and want to scale/expand.">
                                Actively scaling
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="desired_outcome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What is the #1 outcome you want to achieve? *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select desired outcome" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Massive Brand Awareness / View Volume">
                                Massive Brand Awareness / View Volume
                              </SelectItem>
                              <SelectItem value="Direct Conversions (App Installs, Sign-ups, Sales)">
                                Direct Conversions (App Installs, Sign-ups, Sales)
                              </SelectItem>
                              <SelectItem value="Community Building / Engagement">
                                Community Building / Engagement
                              </SelectItem>
                              <SelectItem value="Thought Leadership / Credibility">
                                Thought Leadership / Credibility
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="has_content_library"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Do you have an existing library of long-form content ready for clipping? *
                          </FormLabel>
                          <FormDescription>
                            This includes podcasts, interviews, webinars, or other video content
                          </FormDescription>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes, we have hours of content ready to go">
                                Yes, we have hours of content ready to go
                              </SelectItem>
                              <SelectItem value="We have some content, but not a ton">
                                We have some content, but not a ton
                              </SelectItem>
                              <SelectItem value="No, we'd need to discuss a strategy for content creation.">
                                No, we'd need to discuss a strategy for content creation
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-5">
                    <div className="bg-muted/30 rounded-lg p-3 mb-4">
                      <p className="text-sm text-muted-foreground">
                        Almost done! We just need your contact information.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+1 234 567 8900" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex justify-between pt-4 mt-2 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  {currentStep < STEPS.length - 1 ? (
                    <Button type="button" onClick={nextStep} size="sm">
                      Next
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting || uploadingLogo} size="sm">
                      {isSubmitting || uploadingLogo ? "Submitting..." : "Submit Application"}
                      <CheckCircle2 className="w-4 h-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
