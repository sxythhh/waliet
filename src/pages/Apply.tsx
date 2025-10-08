import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const applicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  business_name: z.string().min(2, "Business name is required"),
  business_description: z.string().min(10, "Please provide at least 10 characters"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  current_mrr: z.string().min(1, "Please select your current MRR"),
  monthly_budget: z.string().min(1, "Please select your budget"),
  timeline_commitment: z.string().min(1, "Please select your timeline"),
  desired_outcome: z.string().min(1, "Please select your desired outcome"),
  has_content_library: z.string().min(1, "Please select an option"),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

export default function Apply() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      business_name: "",
      business_description: "",
      website: "",
      current_mrr: "",
      monthly_budget: "",
      timeline_commitment: "",
      desired_outcome: "",
      has_content_library: "",
    },
  });

  const onSubmit = async (values: ApplicationFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("brand_applications").insert([{
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
      }]);

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Application submitted successfully!");
      form.reset();
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
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Application Submitted!</CardTitle>
            <CardDescription>
              Thank you for your interest. We'll review your application and get back to you within 24-48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsSubmitted(false)} className="w-full">
              Submit Another Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Apply for Virality Campaign</h1>
          <p className="text-muted-foreground">
            Fill out the form below to get started with your content campaign
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Brand Application</CardTitle>
            <CardDescription>Tell us about your business and campaign goals</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+1 234 567 8900" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="business_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="business_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe your business in 1-2 sentences</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What do you sell or offer?"
                          className="min-h-[80px]"
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
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="current_mrr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What is your company's current MRR?</FormLabel>
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
                      <FormLabel>Monthly budget for content campaign</FormLabel>
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

                <FormField
                  control={form.control}
                  name="timeline_commitment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeline and commitment level</FormLabel>
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
                      <FormLabel>What is the #1 outcome you want to achieve?</FormLabel>
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

                <FormField
                  control={form.control}
                  name="has_content_library"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Do you have an existing library of long-form content ready for clipping?
                      </FormLabel>
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

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
