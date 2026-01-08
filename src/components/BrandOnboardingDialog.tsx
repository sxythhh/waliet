import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  brand_color: string | null;
}

interface BrandOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand;
}

interface TeamInvite {
  email: string;
  role: string;
}

const ONBOARDING_STEPS = [
  { title: "Description" },
  { title: "Team" },
  { title: "Payment" },
  { title: "Launch" },
];

export function BrandOnboardingDialog({
  open,
  onOpenChange,
  brand,
}: BrandOnboardingDialogProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Description
  const [description, setDescription] = useState(brand.description || "");

  // Step 2: Team invites
  const [invites, setInvites] = useState<TeamInvite[]>([{ email: "", role: "member" }]);

  const handleNext = async () => {
    setIsSubmitting(true);
    try {
      if (currentStep === 0) {
        // Save description
        if (description.trim()) {
          const { error } = await supabase
            .from("brands")
            .update({ description: description.trim() })
            .eq("id", brand.id);
          if (error) throw error;
        }
      } else if (currentStep === 1) {
        // Send team invites
        const validInvites = invites.filter((inv) => inv.email.trim());
        if (validInvites.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          for (const invite of validInvites) {
            const { error } = await supabase.from("brand_invitations").insert({
              brand_id: brand.id,
              email: invite.email.toLowerCase().trim(),
              role: invite.role,
              invited_by: user?.id || "",
            } as any);
            if (error && error.code !== "23505") {
              throw error;
            }
          }
          toast.success(`Sent ${validInvites.length} invitation(s)`);
        }
      }

      if (currentStep < ONBOARDING_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = async (createCampaign: boolean) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({
          onboarding_completed: true,
          onboarding_step: ONBOARDING_STEPS.length,
        } as any)
        .eq("id", brand.id);

      if (error) throw error;

      onOpenChange(false);

      if (createCampaign) {
        navigate(`/dashboard?workspace=${brand.slug}&createCampaign=true`);
      } else {
        navigate(`/dashboard?workspace=${brand.slug}`);
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to complete setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipAll = () => {
    onOpenChange(false);
    navigate(`/dashboard?workspace=${brand.slug}`);
  };

  const addInvite = () => {
    if (invites.length < 5) {
      setInvites([...invites, { email: "", role: "member" }]);
    }
  };

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: keyof TeamInvite, value: string) => {
    const updated = [...invites];
    updated[index][field] = value;
    setInvites(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-card border-0 p-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-6 pt-6">
            <DialogHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold tracking-tight font-inter">
                  Set Up {brand.name}
                </DialogTitle>
                <button
                  onClick={handleSkipAll}
                  className="text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.3px]"
                >
                  Skip Setup
                </button>
              </div>
            </DialogHeader>

            {/* Progress indicator */}
            <div className="flex gap-1.5 mt-4">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    index <= currentStep ? "bg-foreground" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Step 0: Description */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium font-inter tracking-[-0.5px]">
                    Tell us about your brand
                  </h3>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                    Help creators understand what you do
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-foreground font-inter tracking-[-0.5px]">
                    Description
                  </label>
                  <Textarea
                    placeholder="What does your brand do? What kind of creators are you looking for?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="bg-transparent border-border text-sm font-inter tracking-[-0.3px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/80 rounded-lg transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Team */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium font-inter tracking-[-0.5px]">
                    Invite your team
                  </h3>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                    Add team members to help manage your brand
                  </p>
                </div>

                <div className="space-y-2">
                  {invites.map((invite, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="teammate@company.com"
                        value={invite.email}
                        onChange={(e) => updateInvite(index, "email", e.target.value)}
                        className="flex-1 h-10 bg-transparent border-border text-sm font-inter tracking-[-0.3px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/80 rounded-lg transition-colors"
                      />
                      <Select
                        value={invite.role}
                        onValueChange={(value) => updateInvite(index, "role", value)}
                      >
                        <SelectTrigger className="w-[100px] h-10 bg-transparent border-border text-sm font-inter tracking-[-0.3px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      {invites.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInvite(index)}
                          className="h-10 px-3 text-muted-foreground hover:text-foreground"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}

                  {invites.length < 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addInvite}
                      className="h-8 text-xs font-inter tracking-[-0.3px] text-muted-foreground hover:text-foreground"
                    >
                      + Add another
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium font-inter tracking-[-0.5px]">
                    Payment setup
                  </h3>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                    Connect your payment method to pay creators
                  </p>
                </div>

                <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                  <p className="text-sm font-inter tracking-[-0.3px]">
                    You'll be able to:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm font-inter tracking-[-0.3px]">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        1
                      </div>
                      <span className="text-muted-foreground">Pay creators for completed campaigns</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-inter tracking-[-0.3px]">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        2
                      </div>
                      <span className="text-muted-foreground">Manage your subscription plan</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-inter tracking-[-0.3px]">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        3
                      </div>
                      <span className="text-muted-foreground">Track all payments in one place</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                    You can set this up later from your brand settings
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Launch */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium font-inter tracking-[-0.5px]">
                    You're all set!
                  </h3>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                    Your brand is ready. What would you like to do next?
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleComplete(true)}
                    disabled={isSubmitting}
                    className="w-full p-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors text-left border-t border-primary/80"
                  >
                    <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                      Create Your First Campaign
                    </p>
                    <p className="text-xs text-white/70 font-inter tracking-[-0.3px] mt-0.5">
                      Launch a campaign and start working with creators
                    </p>
                  </button>

                  <button
                    onClick={() => handleComplete(false)}
                    disabled={isSubmitting}
                    className="w-full p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                      Go to Dashboard
                    </p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mt-0.5">
                      Explore your brand dashboard first
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer - not shown on last step */}
          {currentStep < ONBOARDING_STEPS.length - 1 && (
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.3px] hover:bg-transparent"
              >
                Skip
              </Button>
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
                className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.5px] bg-primary text-white hover:bg-primary/90 border-t border-primary/80 rounded-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
