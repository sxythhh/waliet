import { useState, useEffect } from "react";
import { X, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLatestTaxForm, useTaxFormRequirement } from "@/hooks/useTaxFormRequirement";
import { TaxFormWizard } from "./TaxFormWizard";
import { isExpiringSoon, getDaysUntilExpiry } from "@/types/tax-forms";
import { supabase } from "@/integrations/supabase/client";

interface TaxFormNotificationBannerProps {
  className?: string;
}

export function TaxFormNotificationBanner({ className }: TaxFormNotificationBannerProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  const { taxForm, isLoading: taxFormLoading } = useLatestTaxForm(userId);
  const { requirement, isLoading: requirementLoading } = useTaxFormRequirement(userId, 0);

  if (dismissed || taxFormLoading || requirementLoading || !userId) {
    return null;
  }

  // Check for rejected tax form
  if (taxForm?.status === "rejected") {
    return (
      <div className={className}>
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <div className="flex items-center justify-between gap-4">
            <AlertDescription className="text-sm text-foreground">
                <span className="font-medium">Your tax form was rejected.</span>{" "}
                {taxForm.admin_notes && (
                  <span className="text-muted-foreground">Reason: {taxForm.admin_notes}</span>
                )}
                {!taxForm.admin_notes && (
                  <span className="text-muted-foreground">Please submit a new form to continue receiving payouts.</span>
                )}
              </AlertDescription>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWizardOpen(true)}
                className="h-8 px-3 text-xs font-medium"
              >
                Resubmit
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDismissed(true)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Alert>
        <TaxFormWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      </div>
    );
  }

  // Check for expiring tax form (W-8BEN expires after 3 years)
  if (taxForm?.status === "verified" && taxForm.form_type === "w8ben" && taxForm.expires_at) {
    const expiresAt = new Date(taxForm.expires_at);
    if (isExpiringSoon(expiresAt)) {
      const daysLeft = getDaysUntilExpiry(expiresAt);
      return (
        <div className={className}>
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <div className="flex items-center justify-between gap-4">
              <AlertDescription className="text-sm text-foreground">
                <span className="font-medium">Your W-8BEN tax form expires in {daysLeft} days.</span>{" "}
                <span className="text-muted-foreground">Submit a new form to avoid payout delays.</span>
              </AlertDescription>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWizardOpen(true)}
                  className="h-8 px-3 text-xs font-medium"
                >
                  Update Form
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDismissed(true)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Alert>
          <TaxFormWizard open={wizardOpen} onOpenChange={setWizardOpen} />
        </div>
      );
    }
  }

  // Check if user needs to submit a tax form (approaching threshold)
  // Only show this if they don't already have a verified form
  if (requirement?.required && (!taxForm || taxForm.status !== "verified")) {
    const formTypeLabel = requirement.form_type === "w9" ? "W-9" : "W-8BEN";
    const currentPayouts = requirement.cumulative_payouts || 0;
    const isAtThreshold = currentPayouts >= 600;

    return (
      <div className={className}>
        <Alert className={isAtThreshold ? "border-amber-500/50 bg-amber-500/10" : "border-blue-500/50 bg-blue-500/10"}>
          <div className="flex items-center justify-between gap-4">
            <AlertDescription className="text-sm text-foreground">
              {isAtThreshold ? (
                <>
                  <span className="font-medium">Tax form required.</span>{" "}
                  <span className="text-muted-foreground">
                    Submit a {formTypeLabel} form to request payouts.
                  </span>
                </>
              ) : (
                <>
                  <span className="font-medium">You're approaching the tax reporting threshold.</span>{" "}
                  <span className="text-muted-foreground">
                    Submit a {formTypeLabel} form now to avoid payout delays later.
                  </span>
                </>
              )}
            </AlertDescription>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={isAtThreshold ? "default" : "outline"}
                onClick={() => setWizardOpen(true)}
                className="h-8 px-3 text-xs font-medium"
              >
                Submit Form
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              {!isAtThreshold && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDismissed(true)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Alert>
        <TaxFormWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      </div>
    );
  }

  // No notification needed
  return null;
}
