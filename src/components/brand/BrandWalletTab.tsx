import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, ArrowUpRight, Wallet as WalletIcon, ArrowRight } from "lucide-react";
import { AddBrandFundsDialog } from "./AddBrandFundsDialog";
import { AllocateBudgetDialog } from "./AllocateBudgetDialog";
import { BrandOnboardingCard } from "./BrandOnboardingCard";
import { WithdrawDialog } from "./WithdrawDialog";
import { TransferToWithdrawDialog } from "./TransferToWithdrawDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import creditCardIcon from "@/assets/credit-card-filled-icon.svg";
interface BrandWalletTabProps {
  brandId: string;
  brandSlug: string;
}
interface WalletData {
  balance: number;
  virality_balance: number;
  withdraw_balance: number;
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
export function BrandWalletTab({
  brandId,
  brandSlug
}: BrandWalletTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const { isAdmin } = useAdminCheck();
  const fetchWalletData = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;
      const {
        data,
        error
      } = await supabase.functions.invoke('get-brand-balance', {
        body: {
          brand_id: brandId
        }
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
      const {
        data,
        error
      } = await supabase.from('brand_wallet_transactions').select('*').eq('brand_id', brandId).order('created_at', {
        ascending: false
      }).limit(20);
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
          await supabase.from('brands').update({
            whop_onboarding_complete: true
          }).eq('id', brandId);
          toast.success('Verification completed successfully!');

          // Clean up URL params
          searchParams.delete('onboarding');
          searchParams.delete('status');
          setSearchParams(searchParams, {
            replace: true
          });

          // Refresh wallet data
          await fetchWalletData();
        } catch (error) {
          console.error('Error updating onboarding status:', error);
        }
      };
      updateOnboardingStatus();
    }
  }, [searchParams, brandId]);

  // Handle returning from checkout
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout_status');
    const status = searchParams.get('status');

    // Different Whop flows return different identifiers
    const setupIntentId = searchParams.get('setup_intent_id');
    const membershipId = searchParams.get('membership_id');
    const paymentId = searchParams.get('payment_id');
    const receiptId = searchParams.get('receipt_id');
    const isSuccess = checkoutStatus === 'success' || status === 'success';
    const hasReturnId = setupIntentId || membershipId || paymentId || receiptId;
    if (!isSuccess || !hasReturnId) return;

    // Clean up URL params first
    searchParams.delete('checkout_status');
    searchParams.delete('status');
    searchParams.delete('setup_intent_id');
    searchParams.delete('membership_id');
    searchParams.delete('payment_id');
    searchParams.delete('receipt_id');
    searchParams.delete('state_id');
    setSearchParams(searchParams, {
      replace: true
    });
    const pendingTopupData = sessionStorage.getItem(`pending_topup_${brandId}`);
    if (!pendingTopupData) {
      toast.success('Checkout completed.');
      fetchWalletData();
      fetchTransactions();
      return;
    }
    const {
      amount,
      transactionId
    } = JSON.parse(pendingTopupData) as {
      amount: number;
      transactionId?: string;
    };
    sessionStorage.removeItem(`pending_topup_${brandId}`);
    const finalizeTopup = async () => {
      toast.loading('Finalizing top-up...', {
        id: 'topup-finalize'
      });
      try {
        const returnUrl = `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile`;
        const {
          data,
          error
        } = await supabase.functions.invoke('create-brand-wallet-topup', {
          body: {
            brand_id: brandId,
            amount,
            return_url: returnUrl,
            transaction_id: transactionId
          }
        });
        if (error) throw error;
        if (data?.success && !data?.needs_payment_method) {
          toast.success(`Added $${amount} to your wallet!`, {
            id: 'topup-finalize'
          });
          fetchWalletData();
          fetchTransactions();
          return;
        }
        toast.error('Could not finalize top-up. Please try again.', {
          id: 'topup-finalize'
        });
      } catch (e) {
        console.error('Error finalizing top-up:', e);
        toast.error('Failed to finalize top-up.', {
          id: 'topup-finalize'
        });
      }
    };
    finalizeTopup();
  }, [searchParams, setSearchParams, brandId, brandSlug]);
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
      const {
        data,
        error
      } = await supabase.functions.invoke('create-brand-company', {
        body: {
          brand_id: brandId,
          return_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile&onboarding=complete`,
          refresh_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile&onboarding=refresh`
        }
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
  const handleOpenWithdraw = () => {
    setWithdrawOpen(true);
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'topup':
        return 'Top Up';
      case 'withdrawal':
        return 'Withdrawal';
      case 'campaign_allocation':
        return 'Campaign Funding';
      case 'boost_allocation':
        return 'Boost Funding';
      case 'refund':
        return 'Refund';
      default:
        return type;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-neutral-400';
    }
  };
  if (loading) {
    return <div className="space-y-6">
        <Skeleton className="h-40 w-full bg-[#1a1a1a]" />
        <Skeleton className="h-64 w-full bg-[#1a1a1a]" />
      </div>;
  }

  // Show setup prompt if no Whop company
  if (!walletData?.has_whop_company) {
    return <div className="space-y-6">
        <div className="pt-6">
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-[#1f60dd]/10 flex items-center justify-center mx-auto mb-4">
              <img src={creditCardIcon} alt="" className="w-6 h-6 invert-0 brightness-0 opacity-60" style={{
              filter: 'invert(36%) sepia(85%) saturate(1500%) hue-rotate(210deg) brightness(95%)'
            }} />
            </div>
            <h3 className="text-lg font-semibold tracking-[-0.5px] mb-1.5">Set Up Your Brand Wallet</h3>
            <p className="text-sm text-muted-foreground tracking-[-0.5px] mb-6 max-w-sm mx-auto">
              Create a dedicated wallet for your brand to manage campaign budgets, 
              receive funds, and process withdrawals.
            </p>
            <button onClick={handleSetupWallet} disabled={settingUp} className="px-5 py-2.5 bg-[#1f60dd] border-t border-[#4b85f7] rounded-lg font-['Inter'] text-sm font-medium tracking-[-0.5px] text-white hover:bg-[#1a50c8] transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
              <img src={creditCardIcon} alt="" className="w-4 h-4" />
              {settingUp ? 'Setting up...' : 'Set Up Wallet'}
            </button>
          </div>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Onboarding Card - Show if not complete */}
      {!walletData.onboarding_complete && <BrandOnboardingCard brandId={brandId} brandSlug={brandSlug} onComplete={fetchWalletData} />}

      {/* Balance Card */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="pb-2 px-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Virality Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <p className="text-3xl font-semibold text-foreground tracking-tight">
            {formatCurrency(walletData?.virality_balance || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Available for campaigns
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <Button variant="ghost" onClick={handleOpenWithdraw} className="justify-center sm:justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 font-normal tracking-[-0.5px]" style={{
          fontFamily: 'Inter, sans-serif'
        }}>
          <WalletIcon className="w-4 h-4 mr-1.5" />
          Withdraw
        </Button>
        <Button onClick={() => setAllocateOpen(true)} disabled={(walletData?.virality_balance || 0) <= 0} variant="ghost" className="justify-center sm:justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 font-normal tracking-[-0.5px]" style={{
          fontFamily: 'Inter, sans-serif'
        }}>
          <ArrowUpRight className="w-4 h-4 mr-1.5" />
          Fund Campaign
        </Button>
        {isAdmin && (
          <Button onClick={() => setTransferOpen(true)} disabled={(walletData?.virality_balance || 0) <= 0} variant="ghost" className="justify-center sm:justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 font-normal tracking-[-0.5px]" style={{
            fontFamily: 'Inter, sans-serif'
          }}>
            <ArrowRight className="w-4 h-4 mr-1.5" />
            Transfer to Withdraw
          </Button>
        )}
        <Button onClick={() => setAddFundsOpen(true)} className="justify-center bg-[#2060df] hover:bg-[#1850b8] text-white font-medium px-5 tracking-[-0.5px]" style={{
          fontFamily: 'Inter, sans-serif'
        }}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Funds
        </Button>
      </div>

      {/* Transaction History */}
      <Card className="border-border">
        <CardHeader className="px-0">
          <CardTitle className="text-lg text-foreground">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-0">
          {transactions.length === 0 ? <div className="text-center py-8">
              <p className="text-neutral-400">No transactions yet</p>
            </div> : <div className="space-y-3">
              {transactions.map(tx => <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0 border-[#1f1f1f]/0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {tx.amount > 0 ? <Plus className="w-4 h-4 text-green-400" /> : <ArrowUpRight className="w-4 h-4 text-red-400" />}
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
                </div>)}
            </div>}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddBrandFundsDialog open={addFundsOpen} onOpenChange={setAddFundsOpen} brandId={brandId} currentBalance={walletData?.balance || 0} onSuccess={() => {
      fetchWalletData();
      fetchTransactions();
    }} />

      <AllocateBudgetDialog open={allocateOpen} onOpenChange={setAllocateOpen} brandId={brandId} availableBalance={walletData?.virality_balance || 0} onSuccess={() => {
      fetchWalletData();
      fetchTransactions();
    }} />

      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} brandId={brandId} brandSlug={brandSlug} />

      {isAdmin && (
        <TransferToWithdrawDialog 
          open={transferOpen} 
          onOpenChange={setTransferOpen} 
          brandId={brandId} 
          viralityBalance={walletData?.virality_balance || 0} 
          onSuccess={() => {
            fetchWalletData();
            fetchTransactions();
          }} 
        />
      )}
    </div>;
}