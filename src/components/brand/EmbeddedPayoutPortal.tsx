import { useState, useEffect, useCallback } from 'react';
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  WithdrawButtonElement,
  WithdrawalsElement,
  usePayoutsSessionRef,
} from '@whop/embedded-components-react-js';
import { loadWhopElements } from '@whop/embedded-components-vanilla-js';
import type { WhopElementsOptions } from '@whop/embedded-components-vanilla-js/types';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Settings, Globe, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const elements = loadWhopElements();

// Dark mode appearance configuration using theme property
const appearance: WhopElementsOptions['appearance'] = {
  theme: {
    appearance: 'dark',
    accentColor: 'blue',
    grayColor: 'slate',
  },
  classes: {
    '.Button': { 
      height: '44px', 
      'border-radius': '10px',
      'font-weight': '500',
    },
  },
};

interface EmbeddedPayoutPortalProps {
  brandId: string;
  redirectUrl: string;
}

function PayoutPortalContent({ brandId, companyId, redirectUrl }: { brandId: string; companyId: string; redirectUrl: string }) {
  const sessionRef = usePayoutsSessionRef();
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const handleChangeCountry = () => {
    sessionRef.current?.payoutsSession?.showChangeAccountCountryModal((modal) => ({
      onClose: (ev) => {
        ev.preventDefault();
        modal.close();
      },
    }));
  };

  const handleResetAccount = () => {
    sessionRef.current?.payoutsSession?.showResetAccountModal((modal) => ({
      onClose: (ev) => {
        ev.preventDefault();
        modal.close();
      },
    }));
  };

  return (
    <PayoutsSession
      ref={sessionRef}
      token={getToken}
      companyId={companyId}
      redirectUrl={redirectUrl}
    >
      <div className="flex flex-col gap-4 p-4">
        {/* Balance Section */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="h-28 w-full relative">
            <BalanceElement fallback={<div className="animate-pulse bg-muted h-full rounded-lg" />} />
          </div>
          <div className="h-12 w-full relative mt-4">
            <WithdrawButtonElement fallback={<div className="animate-pulse bg-muted h-full rounded-lg" />} />
          </div>
        </div>

        {/* Account Settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <div className="rounded-xl border border-border bg-card">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Account Settings</p>
                    <p className="text-sm text-muted-foreground">Manage your payout account</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm">{settingsOpen ? 'Hide' : 'Show'}</span>
                  {settingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleChangeCountry}
                  className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-primary">Change Country</p>
                    <p className="text-sm text-muted-foreground">Update your payout region</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-primary -rotate-90" />
                </button>
                <button
                  onClick={handleResetAccount}
                  className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Reset Account</p>
                    <p className="text-sm text-muted-foreground">Start fresh with a new setup</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-destructive -rotate-90" />
                </button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </PayoutsSession>
  );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !companyId) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground p-4">
        <p>{error || 'Unable to load payout portal'}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <Elements appearance={appearance} elements={elements}>
        <PayoutPortalContent brandId={brandId} companyId={companyId} redirectUrl={redirectUrl} />
      </Elements>
    </div>
  );
}
