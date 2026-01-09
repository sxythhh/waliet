import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { W9Form } from './W9Form';
import { W8BENForm } from './W8BENForm';
import { SignatureCapture } from './SignatureCapture';
import { useSubmitTaxForm } from '@/hooks/useTaxFormRequirement';
import {
  COUNTRIES,
  TaxFormWizardStep,
  W9FormData,
  W8BENFormData,
} from '@/types/tax-forms';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface TaxFormWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = ['Country', 'Tax Form', 'Signature', 'Complete'] as const;

export function TaxFormWizard({
  open,
  onOpenChange,
  onSuccess,
}: TaxFormWizardProps) {
  const [step, setStep] = useState<TaxFormWizardStep>('country');
  const [taxCountry, setTaxCountry] = useState<string>('');
  const [isUSPerson, setIsUSPerson] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<W9FormData | W8BENFormData | null>(null);
  const [signatureName, setSignatureName] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const { submitForm, isSubmitting } = useSubmitTaxForm();

  const formType = isUSPerson ? 'w9' : 'w8ben';

  const stepIndex = step === 'country' ? 0 : step === 'form' ? 1 : step === 'signature' ? 2 : 3;

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  const resetWizard = useCallback(() => {
    setStep('country');
    setTaxCountry('');
    setIsUSPerson(null);
    setFormData(null);
    setSignatureName('');
    setSignatureData(null);
  }, []);

  const handleClose = () => {
    if (step !== 'complete') {
      resetWizard();
    }
    onOpenChange(false);
  };

  const handleCountryNext = () => {
    if (!taxCountry) {
      toast.error('Please select your country of tax residence');
      return;
    }

    if (taxCountry === 'US') {
      setIsUSPerson(true);
      setStep('form');
    } else if (isUSPerson === null) {
      setIsUSPerson(false);
      setStep('form');
    } else {
      setStep('form');
    }
  };

  const handleFormSubmit = (data: W9FormData | W8BENFormData) => {
    setFormData(data);
    setSignatureName(data.name);
    setStep('signature');
  };

  const handleSignatureChange = (signature: string | null, name: string) => {
    setSignatureData(signature);
    setSignatureName(name);
  };

  const handleFinalSubmit = async () => {
    if (!formData || !signatureName || !userId) {
      toast.error('Please complete all required fields');
      return;
    }

    const result = await submitForm(userId, formType, formData, signatureName);

    if (result.success) {
      setStep('complete');
      toast.success('Tax form submitted successfully!');
    } else {
      toast.error(result.error || 'Failed to submit tax form');
    }
  };

  const handleComplete = () => {
    resetWizard();
    onSuccess?.();
    onOpenChange(false);
  };

  const goBack = () => {
    if (step === 'form') {
      setStep('country');
    } else if (step === 'signature') {
      setStep('form');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-[-0.3px]">
              Tax Information
            </DialogTitle>
          </DialogHeader>

          {/* Progress */}
          <div className="flex items-center gap-1 mt-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                      i < stepIndex && "bg-foreground text-background",
                      i === stepIndex && "bg-foreground text-background",
                      i > stepIndex && "bg-muted text-muted-foreground"
                    )}
                  >
                    {i < stepIndex ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium hidden sm:block",
                      i <= stepIndex ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1 mx-2",
                      i < stepIndex ? "bg-foreground" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Step 1: Country Selection */}
          {step === 'country' && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium">
                  Country of tax residence
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Select the country where you pay taxes
                </p>
                <Select value={taxCountry} onValueChange={setTaxCountry}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {taxCountry && taxCountry !== 'US' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Are you a US citizen or resident alien?
                  </Label>
                  <RadioGroup
                    value={isUSPerson === true ? 'yes' : isUSPerson === false ? 'no' : ''}
                    onValueChange={(v) => setIsUSPerson(v === 'yes')}
                    className="space-y-2"
                  >
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-foreground/20 cursor-pointer transition-colors">
                      <RadioGroupItem value="no" className="mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">No</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          You'll complete Form W-8BEN
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-foreground/20 cursor-pointer transition-colors">
                      <RadioGroupItem value="yes" className="mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">Yes</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          You'll complete Form W-9
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
              )}

              {taxCountry === 'US' && (
                <p className="text-sm text-muted-foreground">
                  As a US tax resident, you'll complete Form W-9.
                </p>
              )}
            </div>
          )}

          {/* Step 2: Form */}
          {step === 'form' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-border">
                <span className="text-sm font-medium">
                  {isUSPerson ? 'Form W-9' : 'Form W-8BEN'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isUSPerson
                    ? 'Request for Taxpayer Identification Number'
                    : 'Certificate of Foreign Status'}
                </span>
              </div>

              {isUSPerson ? (
                <W9Form
                  onSubmit={handleFormSubmit}
                  defaultValues={formData as W9FormData | undefined}
                />
              ) : (
                <W8BENForm
                  onSubmit={handleFormSubmit}
                  defaultValues={formData as W8BENFormData | undefined}
                />
              )}
            </div>
          )}

          {/* Step 3: Signature */}
          {step === 'signature' && (
            <SignatureCapture
              onSignatureChange={handleSignatureChange}
              defaultName={signatureName}
              disabled={isSubmitting}
            />
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-background" />
              </div>
              <h3 className="text-lg font-semibold tracking-[-0.3px]">
                Form Submitted
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Your {isUSPerson ? 'W-9' : 'W-8BEN'} form has been submitted and is pending review.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex items-center justify-between">
          {step === 'complete' ? (
            <div className="w-full flex justify-end">
              <Button onClick={handleComplete}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={step === 'country' ? handleClose : goBack}
                disabled={isSubmitting}
              >
                {step === 'country' ? 'Cancel' : (
                  <>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </>
                )}
              </Button>

              {step === 'country' && (
                <Button
                  onClick={handleCountryNext}
                  disabled={!taxCountry || (taxCountry !== 'US' && isUSPerson === null)}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}

              {step === 'form' && (
                <Button
                  onClick={() => {
                    const form = document.querySelector('form');
                    if (form) {
                      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    }
                  }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}

              {step === 'signature' && (
                <Button
                  onClick={handleFinalSubmit}
                  disabled={!signatureName || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Form'
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
