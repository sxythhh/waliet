import { useState } from 'react';
import { SettingsCard } from '@/components/dashboard/settings/SettingsCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLatestTaxForm } from '@/hooks/useTaxFormRequirement';
import { TaxFormWizard } from './TaxFormWizard';
import {
  TaxFormStatus,
  isExpiringSoon,
  getDaysUntilExpiry,
  formatTINForDisplay,
  W9FormData,
  W8BENFormData
} from '@/types/tax-forms';
import {
  FileCheck,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
  HelpCircle,
  Calendar
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TaxSettingsSectionProps {
  userId: string;
  taxCountry?: string;
  onFormSubmitted?: () => void;
}

function getStatusBadge(status: TaxFormStatus | undefined, expiresAt?: string) {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Required
      </Badge>
    );
  }

  if (status === 'verified') {
    if (isExpiringSoon(expiresAt)) {
      const days = getDaysUntilExpiry(expiresAt);
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Expires in {days} days
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
        <FileCheck className="h-3 w-3 mr-1" />
        Verified
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
        <Clock className="h-3 w-3 mr-1" />
        Pending Review
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Rejected
      </Badge>
    );
  }

  if (status === 'expired') {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Expired
      </Badge>
    );
  }

  return null;
}

function getFormTypeLabel(formType: string | undefined) {
  if (formType === 'w9') return 'W-9';
  if (formType === 'w8ben') return 'W-8BEN';
  if (formType === 'w8bene') return 'W-8BEN-E';
  return 'Tax Form';
}

export function TaxSettingsSection({ userId, onFormSubmitted }: TaxSettingsSectionProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { isLoading, taxForm, refetch } = useLatestTaxForm(userId);

  const handleFormSubmitted = () => {
    refetch();
    onFormSubmitted?.();
    setWizardOpen(false);
  };

  const needsNewForm = !taxForm ||
    taxForm.status === 'rejected' ||
    taxForm.status === 'expired' ||
    isExpiringSoon(taxForm.expires_at);

  const canSubmitNewForm = !taxForm ||
    taxForm.status === 'rejected' ||
    taxForm.status === 'expired' ||
    isExpiringSoon(taxForm.expires_at);

  return (
    <>
      <SettingsCard
        title="Tax Information"
        description="Submit your tax form (W-9 or W-8BEN) for payout compliance. Required for receiving payments."
        footerContent={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                    <span>Why is this required?</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>
                    Tax forms are required by the IRS for payments. US persons need a W-9
                    when total payments reach $600. Non-US persons need a W-8BEN before any payout.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        saveButton={
          canSubmitNewForm
            ? {
                label: taxForm ? 'Update Tax Form' : 'Submit Tax Form',
                onClick: () => setWizardOpen(true),
                disabled: isLoading,
              }
            : undefined
        }
      >
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Loading tax information...</span>
            </div>
          ) : taxForm ? (
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getFormTypeLabel(taxForm.form_type)}</span>
                      {getStatusBadge(taxForm.status as TaxFormStatus, taxForm.expires_at)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {taxForm.form_type === 'w9' ? (
                        <>
                          Name: {(taxForm.form_data as W9FormData).name}
                          {(taxForm.form_data as W9FormData).tin && (
                            <> &middot; TIN: {formatTINForDisplay(
                              (taxForm.form_data as W9FormData).tin,
                              (taxForm.form_data as W9FormData).tinType
                            )}</>
                          )}
                        </>
                      ) : (
                        <>
                          Name: {(taxForm.form_data as W8BENFormData).name}
                          {(taxForm.form_data as W8BENFormData).countryOfCitizenship && (
                            <> &middot; Country: {(taxForm.form_data as W8BENFormData).countryOfCitizenship}</>
                          )}
                        </>
                      )}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Submitted {new Date(taxForm.created_at).toLocaleDateString()}
                      </span>
                      {taxForm.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {new Date(taxForm.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {taxForm.status === 'rejected' && taxForm.rejection_reason && (
                      <p className="text-sm text-red-600 mt-2">
                        Reason: {taxForm.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
                {canSubmitNewForm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWizardOpen(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {taxForm.status === 'rejected' ? 'Resubmit' : 'Update'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-600">Tax Form Required</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Submit your tax information to receive payouts. This is a one-time requirement
                    for US creators (at $600 threshold) or non-US creators (before first payout).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      <TaxFormWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        userId={userId}
        onSuccess={handleFormSubmitted}
        existingFormType={taxForm?.form_type as 'w9' | 'w8ben' | undefined}
      />
    </>
  );
}
