import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, ArrowUpRight, Wallet as WalletIcon } from "lucide-react";
import { AddBrandFundsDialog } from "./AddBrandFundsDialog";
import { AllocateBudgetDialog } from "./AllocateBudgetDialog";
import { BrandOnboardingCard } from "./BrandOnboardingCard";
import creditCardIcon from "@/assets/credit-card-filled-icon.svg";

interface BrandWalletTabProps {
  brandId: string;
  brandSlug: string;
}

interface WalletData {
  balance: number;
  pending_balance: number;
  currency: string;
  has_whop_company: boolean;
  onboarding_complete: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
}

export function BrandWalletTab({ brandId, brandSlug }: BrandWalletTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const fetchWalletData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('get-brand-balance', {
        body: { brand_id: brandId },
      });

      if (error) throw error;
      setWalletData(data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load wallet data');
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_wallet_transactions')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Check for onboarding completion from URL params
  useEffect(() => {
    const onboardingStatus = searchParams.get('onboarding');
    const status = searchParams.get('status');

    if (onboardingStatus === 'complete' && (status === 'submitted' || status === 'success')) {
      // Update the brand's onboarding status
      const updateOnboardingStatus = async () => {
        try {
          await supabase
            .from('brands')
            .update({ whop_onboarding_complete: true })
            .eq('id', brandId);

          toast.success('Verification completed successfully!');

          // Clean up URL params
          searchParams.delete('onboarding');
          searchParams.delete('status');
          setSearchParams(searchParams, { replace: true });

          // Refresh wallet data
          await fetchWalletData();
        } catch (error) {
          console.error('Error updating onboarding status:', error);
        }
      };

      updateOnboardingStatus();
    }
  }, [searchParams, brandId]);

  // Handle returning from payment method setup / checkout
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout_status');
    const setupIntentId = searchParams.get('setup_intent_id');
    const status = searchParams.get('status');

    // Whop redirects back with checkout_status/status params after saving payment method
    if ((checkoutStatus === 'success' || status === 'success') && setupIntentId) {
      // Clean up URL params first
      searchParams.delete('checkout_status');
      searchParams.delete('status');
      searchParams.delete('setup_intent_id');
      searchParams.delete('state_id');
      setSearchParams(searchParams, { replace: true });

      // Check if there's a pending top-up amount to charge
      const pendingTopupData = sessionStorage.getItem(`pending_topup_${brandId}`);
      if (pendingTopupData) {
        const { amount } = JSON.parse(pendingTopupData);
        sessionStorage.removeItem(`pending_topup_${brandId}`);
        
        // Auto-charge the saved payment method using the setup_intent_id to get the payment method
        const chargeTopup = async () => {
          toast.loading('Charging your saved payment method...', { id: 'topup-charge' });
          try {
            const { data, error } = await supabase.functions.invoke('create-brand-wallet-topup', {
              body: { brand_id: brandId, amount, return_url: window.location.href, setup_intent_id: setupIntentId },
            });
            
            if (error) throw error;
            
            if (data?.success && !data?.needs_payment_method) {
              toast.success(`Successfully added $${amount} to your wallet!`, { id: 'topup-charge' });
              fetchWalletData();
              fetchTransactions();
            } else if (data?.error) {
              throw new Error(data.error);
            } else {
              toast.error('Payment method not found. Please try again.', { id: 'topup-charge' });
              setAddFundsOpen(true);
            }
          } catch (error) {
            console.error('Error charging top-up:', error);
            toast.error('Failed to charge. Please try again.', { id: 'topup-charge' });
            setAddFundsOpen(true);
          }
        };
        
        chargeTopup();
      } else {
        toast.success('Payment method saved. You can add funds now.');
        setAddFundsOpen(true);
      }
    }
  }, [searchParams, setSearchParams, brandId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWalletData(), fetchTransactions()]);
      setLoading(false);
    };
    loadData();
  }, [brandId]);

  const handleSetupWallet = async () => {
    setSettingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-brand-company', {
        body: { 
          brand_id: brandId,
          return_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile&onboarding=complete`,
          refresh_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile&onboarding=refresh`
        },
      });

      if (error) throw error;

      // If we get an onboarding URL, redirect the user there
      if (data?.onboarding_url) {
        window.open(data.onboarding_url, '_blank');
        toast.success('Opening wallet setup...');
      } else if (data?.company_id) {
        toast.success('Wallet set up successfully!');
      }
      
      await fetchWalletData();
    } catch (error) {
      console.error('Error setting up wallet:', error);
      toast.error('Failed to set up wallet');
    } finally {
      setSettingUp(false);
    }
  };

  const handleOpenPayoutPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-brand-payout-portal', {
        body: {
          brand_id: brandId,
          return_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile`,
          refresh_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening payout portal:', error);
      toast.error('Failed to open payout portal');
    } finally {
      setOpeningPortal(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'topup': return 'Top Up';
      case 'withdrawal': return 'Withdrawal';
      case 'campaign_allocation': return 'Campaign Funding';
      case 'boost_allocation': return 'Boost Funding';
      case 'refund': return 'Refund';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-neutral-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full bg-[#1a1a1a]" />
        <Skeleton className="h-64 w-full bg-[#1a1a1a]" />
      </div>
    );
  }

  // Show setup prompt if no Whop company
  if (!walletData?.has_whop_company) {
    return (
      <div className="space-y-6">
        <div className="pt-6">
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-[#1f60dd]/10 flex items-center justify-center mx-auto mb-4">
              <img src={creditCardIcon} alt="" className="w-6 h-6 invert-0 brightness-0 opacity-60" style={{ filter: 'invert(36%) sepia(85%) saturate(1500%) hue-rotate(210deg) brightness(95%)' }} />
            </div>
            <h3 className="text-lg font-semibold tracking-[-0.5px] mb-1.5">Set Up Your Brand Wallet</h3>
            <p className="text-sm text-muted-foreground tracking-[-0.5px] mb-6 max-w-sm mx-auto">
              Create a dedicated wallet for your brand to manage campaign budgets, 
              receive funds, and process withdrawals.
            </p>
            <button 
              onClick={handleSetupWallet} 
              disabled={settingUp}
              className="px-5 py-2.5 bg-[#1f60dd] border-t border-[#4b85f7] rounded-lg font-['Inter'] text-sm font-medium tracking-[-0.5px] text-white hover:bg-[#1a50c8] transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <img src={creditCardIcon} alt="" className="w-4 h-4" />
              {settingUp ? 'Setting up...' : 'Set Up Wallet'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Card - Show if not complete */}
      {!walletData.onboarding_complete && (
        <BrandOnboardingCard brandId={brandId} brandSlug={brandSlug} onComplete={fetchWalletData} />
      )}

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border-[#1a1a1a] overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-neutral-400 flex items-center gap-2">
            <img src="/src/assets/credit-card-filled-icon.svg" alt="" className="w-5 h-5 opacity-60" />
            Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-5xl font-semibold text-white tracking-tight">
                {formatCurrency(walletData?.balance || 0)}
              </p>
              {(walletData?.pending_balance || 0) > 0 && (
                <p className="text-sm text-neutral-500 mt-2">
                  + {formatCurrency(walletData.pending_balance)} pending
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={handleOpenPayoutPortal}
                disabled={openingPortal}
                className="text-neutral-400 hover:text-white hover:bg-white/5 font-normal tracking-[-0.5px]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <WalletIcon className="w-4 h-4 mr-1.5" />
                {openingPortal ? 'Opening...' : 'Withdraw'}
              </Button>
              <Button
                onClick={() => setAllocateOpen(true)}
                disabled={(walletData?.balance || 0) <= 0}
                variant="ghost"
                className="text-neutral-400 hover:text-white hover:bg-white/5 font-normal tracking-[-0.5px]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <ArrowUpRight className="w-4 h-4 mr-1.5" />
                Fund Campaign
              </Button>
              <Button
                onClick={() => setAddFundsOpen(true)}
                className="bg-[#2060df] hover:bg-[#1850b8] text-white font-medium px-5 tracking-[-0.5px] ml-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Funds
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="bg-[#0f0f0f] border-[#1f1f1f]">
        <CardHeader>
          <CardTitle className="text-lg text-white">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-400">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b border-[#1f1f1f] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {tx.amount > 0 ? (
                        <Plus className="w-4 h-4 text-green-400" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {tx.description || getTransactionTypeLabel(tx.type)}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </p>
                    <p className={`text-xs ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddBrandFundsDialog
        open={addFundsOpen}
        onOpenChange={setAddFundsOpen}
        brandId={brandId}
        currentBalance={walletData?.balance || 0}
        onSuccess={() => {
          fetchWalletData();
          fetchTransactions();
        }}
      />

      <AllocateBudgetDialog
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        brandId={brandId}
        availableBalance={walletData?.balance || 0}
        onSuccess={() => {
          fetchWalletData();
          fetchTransactions();
        }}
      />
    </div>
  );
}
