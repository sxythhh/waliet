import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const STORAGE_KEY = 'brand-application-progress';

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

  // Load saved progress on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.formData) {
          form.reset(parsed.formData);
        }
        if (parsed.currentStep !== undefined) {
          setCurrentStep(parsed.currentStep);
        }
        if (parsed.logoPreview) {
          setLogoPreview(parsed.logoPreview);
        }
        toast.success("Progress restored");
      } catch (error) {
        console.error("Error loading saved progress:", error);
      }
    }
  }, []);

  // Auto-save form data when it changes
  useEffect(() => {
    const subscription = form.watch((formData) => {
      const dataToSave = {
        formData,
        currentStep,
        logoPreview,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    });
    return () => subscription.unsubscribe();
  }, [form, currentStep, logoPreview]);

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

      // Clear saved progress after successful submission
      localStorage.removeItem(STORAGE_KEY);
      
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
                    {/* Logo and Business Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-[160px,1fr] gap-6">
                      {/* Logo Upload */}
                      <div className="space-y-2">
                        <FormLabel>Logo</FormLabel>
                        <div className="flex flex-col items-center">
                          {logoPreview ? (
                            <div className="relative">
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="w-32 h-32 object-contain rounded-lg border border-border"
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
                            <label className="w-32 h-32 cursor-pointer">
                              <div className="w-full h-full border border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                                <Upload className="w-7 h-7 text-muted-foreground mb-1.5" />
                                <p className="text-xs text-muted-foreground">Upload</p>
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

                      {/* Business Name and Website */}
                      <div className="space-y-3">
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
                    </div>

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
                            <Input
                              placeholder="We help businesses scale through content marketing..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="current_mrr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What is your company's current MRR? *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid gap-3"
                            >
                              {[
                                "Pre-Revenue",
                                "$0 - $10,000 / month",
                                "$10,000 - $50,000 / month",
                                "$50,000 - $100,000 / month",
                                "$100,000+ / month"
                              ].map((option) => (
                                 <label
                                  key={option}
                                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                                    field.value === option
                                      ? "bg-primary text-white"
                                      : "bg-muted/30 hover:bg-muted/50"
                                  }`}
                                >
                                  <RadioGroupItem value={option} className="shrink-0" />
                                  <span className="text-sm font-medium">{option}</span>
                                </label>
                              ))}
                            </RadioGroup>
                          </FormControl>
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
                          <FormDescription>Include retainer + media spend</FormDescription>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid gap-3"
                            >
                              {[
                                "$1,000 - $5,000",
                                "$5,000 - $10,000",
                                "$10,000 - $30,000",
                                "$30,000+"
                              ].map((option) => (
                                 <label
                                  key={option}
                                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                                    field.value === option
                                      ? "bg-primary text-white"
                                      : "bg-muted/30 hover:bg-muted/50"
                                  }`}
                                >
                                  <RadioGroupItem value={option} className="shrink-0" />
                                  <span className="text-sm font-medium">{option}</span>
                                </label>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="timeline_commitment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeline and commitment level *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid gap-3"
                            >
                              {[
                                { value: "We're just testing the waters and exploring options.", label: "Testing the waters" },
                                { value: "We have a budget approved, ready to commit to a multi-month run to see results.", label: "Ready for multi-month commitment" },
                                { value: "We're actively running campaigns and want to scale/expand.", label: "Actively scaling" }
                              ].map((option) => (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                                    field.value === option.value
                                      ? "bg-primary text-white"
                                      : "bg-muted/30 hover:bg-muted/50"
                                  }`}
                                >
                                  <RadioGroupItem value={option.value} className="shrink-0" />
                                  <span className="text-sm font-medium">{option.label}</span>
                                </label>
                              ))}
                            </RadioGroup>
                          </FormControl>
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
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid gap-3"
                            >
                              {[
                                "Massive Brand Awareness / View Volume",
                                "Direct Conversions (App Installs, Sign-ups, Sales)",
                                "Community Building / Engagement",
                                "Thought Leadership / Credibility"
                              ].map((option) => (
                                <label
                                  key={option}
                                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                                    field.value === option
                                      ? "bg-primary text-white"
                                      : "bg-muted/30 hover:bg-muted/50"
                                  }`}
                                >
                                  <RadioGroupItem value={option} className="shrink-0" />
                                  <span className="text-sm font-medium">{option}</span>
                                </label>
                              ))}
                            </RadioGroup>
                          </FormControl>
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
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid gap-3"
                            >
                              {[
                                "Yes, we have hours of content ready to go",
                                "We have some content, but not a ton",
                                "No, we'd need to discuss a strategy for content creation."
                              ].map((option) => (
                                <label
                                  key={option}
                                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                                    field.value === option
                                      ? "bg-primary text-white"
                                      : "bg-muted/30 hover:bg-muted/50"
                                  }`}
                                >
                                  <RadioGroupItem value={option} className="shrink-0" />
                                  <span className="text-sm font-medium">{option}</span>
                                </label>
                              ))}
                            </RadioGroup>
                          </FormControl>
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
