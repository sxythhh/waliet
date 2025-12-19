import { useState, useEffect, useCallback } from 'react';
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  WithdrawButtonElement,
  WithdrawalsElement,
} from '@whop/embedded-components-react-js';
import { loadWhopElements } from '@whop/embedded-components-vanilla-js';
import type { WhopElementsOptions } from '@whop/embedded-components-vanilla-js/types';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const elements = loadWhopElements();

const appearance: WhopElementsOptions['appearance'] = {
  classes: {
    '.Button': { height: '40px', 'border-radius': '8px' },
    '.Button:disabled': { 'background-color': '#333' },
    '.Container': { 'border-radius': '12px', 'background-color': '#111' },
  },
};

interface EmbeddedPayoutPortalProps {
  brandId: string;
  redirectUrl: string;
}

export function EmbeddedPayoutPortal({ brandId, redirectUrl }: EmbeddedPayoutPortalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyId = async () => {
      try {
        const { data: brand, error: brandError } = await supabase
          .from('brands')
          .select('whop_company_id')
          .eq('id', brandId)
          .single();

        if (brandError || !brand?.whop_company_id) {
          setError('Brand not configured for payouts');
          return;
        }

        setCompanyId(brand.whop_company_id);
      } catch (err) {
        setError('Failed to load payout configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyId();
  }, [brandId]);

  const getToken = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('get-brand-payout-token', {
      body: { brand_id: brandId },
    });

    if (error || !data?.token) {
      console.error('Failed to get payout token:', error);
      throw new Error('Failed to authenticate');
    }

    return data.token;
  }, [brandId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (error || !companyId) {
    return (
      <div className="flex items-center justify-center h-[500px] text-neutral-400">
        <p>{error || 'Unable to load payout portal'}</p>
      </div>
    );
  }

  return (
    <div className="h-[550px] w-full">
      <Elements appearance={appearance} elements={elements}>
        <PayoutsSession
          token={getToken}
          companyId={companyId}
          redirectUrl={redirectUrl}
        >
          <section className="flex flex-col gap-4 p-4">
            <div className="h-24 w-full relative">
              <BalanceElement fallback={<div className="animate-pulse bg-neutral-800 h-full rounded-lg" />} />
            </div>
            <div className="h-10 w-full relative">
              <WithdrawButtonElement fallback={<div className="animate-pulse bg-neutral-800 h-full rounded-lg" />} />
            </div>
            <div className="w-full">
              <WithdrawalsElement fallback={<div className="animate-pulse bg-neutral-800 h-32 rounded-lg" />} />
            </div>
          </section>
        </PayoutsSession>
      </Elements>
    </div>
  );
}
