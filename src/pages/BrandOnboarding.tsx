import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingProgress } from "@/components/brand/onboarding/OnboardingProgress";
import { BrandDetailsStep } from "@/components/brand/onboarding/BrandDetailsStep";
import { BrandingStep } from "@/components/brand/onboarding/BrandingStep";
import { TeamInviteStep } from "@/components/brand/onboarding/TeamInviteStep";
import { PaymentSetupStep } from "@/components/brand/onboarding/PaymentSetupStep";
import { FirstCampaignStep } from "@/components/brand/onboarding/FirstCampaignStep";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  brand_color: string | null;
  onboarding_step: number;
  onboarding_completed: boolean;
}

const ONBOARDING_STEPS = [
  { title: "Details", description: "About your brand" },
  { title: "Branding", description: "Logo & colors" },
  { title: "Team", description: "Invite members" },
  { title: "Payment", description: "Connect Whop" },
  { title: "Launch", description: "Get started" },
];

export default function BrandOnboarding() {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!brandSlug || !user) return;

    const fetchBrand = async () => {
      try {
        const { data, error } = await supabase
          .from("brands")
          .select("id, name, slug, description, website, logo_url, brand_color, onboarding_step, onboarding_completed")
          .eq("slug", brandSlug)
          .single();

        if (error) throw error;

        // Check if user has access to this brand
        const { data: membership, error: memberError } = await supabase
          .from("brand_members")
          .select("role")
          .eq("brand_id", data.id)
          .eq("user_id", user.id)
          .single();

        if (memberError || !membership) {
          toast.error("You don't have access to this brand");
          navigate("/dashboard");
          return;
        }

        setBrand(data);
        setCurrentStep(data.onboarding_step || 0);

        // If onboarding is already completed, redirect to dashboard
        if (data.onboarding_completed) {
          navigate(`/dashboard?workspace=${brandSlug}`);
        }
      } catch (error) {
        console.error("Error fetching brand:", error);
        toast.error("Failed to load brand");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [brandSlug, user, navigate]);

  const updateBrandAndStep = async (
    updates: Partial<Brand>,
    nextStep?: number
  ) => {
    if (!brand) return;

    try {
      const updateData: any = { ...updates };
      if (nextStep !== undefined) {
        updateData.onboarding_step = nextStep;
      }

      const { error } = await supabase
        .from("brands")
        .update(updateData)
        .eq("id", brand.id);

      if (error) throw error;

      setBrand({ ...brand, ...updateData });
      if (nextStep !== undefined) {
        setCurrentStep(nextStep);
      }
    } catch (error) {
      console.error("Error updating brand:", error);
      toast.error("Failed to save changes");
      throw error;
    }
  };

  const goToNextStep = () => {
    const nextStep = Math.min(currentStep + 1, ONBOARDING_STEPS.length - 1);
    updateBrandAndStep({}, nextStep);
  };

  const skipStep = () => {
    goToNextStep();
  };

  const completeOnboarding = async () => {
    if (!brand) return;

    try {
      const { error } = await supabase
        .from("brands")
        .update({
          onboarding_completed: true,
          onboarding_step: ONBOARDING_STEPS.length,
        })
        .eq("id", brand.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error completing onboarding:", error);
      throw error;
    }
  };

  const handleSkipAll = () => {
    navigate(`/dashboard?workspace=${brandSlug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!brand) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {brand.name[0]}
                </span>
              </div>
            )}
            <span className="font-medium">{brand.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkipAll}>
            <X className="h-4 w-4 mr-2" />
            Skip Setup
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <OnboardingProgress currentStep={currentStep} steps={ONBOARDING_STEPS} />
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 pb-12">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            {currentStep === 0 && (
              <BrandDetailsStep
                brandName={brand.name}
                brandDescription={brand.description}
                brandWebsite={brand.website}
                onUpdate={async (data) => {
                  await updateBrandAndStep(data);
                }}
                onNext={goToNextStep}
                onSkip={skipStep}
              />
            )}

            {currentStep === 1 && (
              <BrandingStep
                brandId={brand.id}
                brandSlug={brand.slug}
                currentLogo={brand.logo_url}
                currentColor={brand.brand_color}
                onUpdate={async (data) => {
                  await updateBrandAndStep(data);
                }}
                onNext={goToNextStep}
                onSkip={skipStep}
              />
            )}

            {currentStep === 2 && (
              <TeamInviteStep
                brandId={brand.id}
                onNext={goToNextStep}
                onSkip={skipStep}
              />
            )}

            {currentStep === 3 && (
              <PaymentSetupStep
                whopConnected={false}
                onNext={goToNextStep}
                onSkip={skipStep}
              />
            )}

            {currentStep === 4 && (
              <FirstCampaignStep
                brandSlug={brand.slug}
                onComplete={completeOnboarding}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
