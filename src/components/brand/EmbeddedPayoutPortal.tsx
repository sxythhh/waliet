import { useState, useEffect, useCallback } from 'react';
import { PayoutsSession } from '@whop/embedded-components-react-js';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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
    <div className="h-[600px] w-full">
      <PayoutsSession
        token={getToken}
        companyId={companyId}
        redirectUrl={redirectUrl}
        currency="USD"
      />
    </div>
  );
}
