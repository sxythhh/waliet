import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaxForm, TaxFormRequirement, TaxFormStatus } from '@/types/tax-forms';

interface UseTaxFormRequirementResult {
  isLoading: boolean;
  requirement: TaxFormRequirement | null;
  currentForm: TaxForm | null;
  refetch: () => Promise<void>;
  error: string | null;
}

export function useTaxFormRequirement(userId: string | undefined, payoutAmount: number = 0): UseTaxFormRequirementResult {
  const [isLoading, setIsLoading] = useState(true);
  const [requirement, setRequirement] = useState<TaxFormRequirement | null>(null);
  const [currentForm, setCurrentForm] = useState<TaxForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirement = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the check_tax_form_required function
      const { data: reqData, error: reqError } = await supabase
        .rpc('check_tax_form_required', {
          p_user_id: userId,
          p_payout_amount: payoutAmount
        });

      if (reqError) {
        console.error('Error checking tax form requirement:', reqError);
        setError(reqError.message);
        setIsLoading(false);
        return;
      }

      if (reqData && reqData.length > 0) {
        const req = reqData[0];
        setRequirement({
          required: req.required,
          form_type: req.form_type,
          reason: req.reason,
          existing_form_id: req.existing_form_id,
          existing_form_status: req.existing_form_status as TaxFormStatus | undefined,
          cumulative_payouts: req.cumulative_payouts,
          threshold: req.threshold
        });

        // Fetch the current form if there's an existing one
        if (req.existing_form_id) {
          const { data: formData, error: formError } = await supabase
            .from('tax_forms')
            .select('*')
            .eq('id', req.existing_form_id)
            .single();

          if (!formError && formData) {
            setCurrentForm(formData as unknown as TaxForm);
          }
        } else {
          setCurrentForm(null);
        }
      } else {
        // Default to not required if no data returned
        setRequirement({
          required: false,
          form_type: null,
          reason: 'not_required'
        });
        setCurrentForm(null);
      }
    } catch (err) {
      console.error('Error in useTaxFormRequirement:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, payoutAmount]);

  useEffect(() => {
    fetchRequirement();
  }, [fetchRequirement]);

  return {
    isLoading,
    requirement,
    currentForm,
    refetch: fetchRequirement,
    error
  };
}

// Hook to get the latest tax form for a user
export function useLatestTaxForm(userId: string | undefined) {
  const [isLoading, setIsLoading] = useState(true);
  const [taxForm, setTaxForm] = useState<TaxForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTaxForm = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tax_forms')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['verified', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching tax form:', fetchError);
        setError(fetchError.message);
      } else {
        setTaxForm(data as unknown as TaxForm | null);
      }
    } catch (err) {
      console.error('Error in useLatestTaxForm:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTaxForm();
  }, [fetchTaxForm]);

  return {
    isLoading,
    taxForm,
    refetch: fetchTaxForm,
    error
  };
}

// Hook to submit a tax form
export function useSubmitTaxForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitForm = async (
    userId: string,
    formType: 'w9' | 'w8ben' | 'w8bene',
    formData: Record<string, unknown>,
    signatureName: string
  ): Promise<{ success: boolean; formId?: string; error?: string }> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('tax_forms')
        .insert({
          user_id: userId,
          form_type: formType,
          form_data: formData,
          signature_name: signatureName,
          signature_date: new Date().toISOString(),
          electronic_signature_consent: true,
          status: 'pending'
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error submitting tax form:', insertError);
        setError(insertError.message);
        return { success: false, error: insertError.message };
      }

      return { success: true, formId: data.id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error in useSubmitTaxForm:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitForm,
    isSubmitting,
    error
  };
}
