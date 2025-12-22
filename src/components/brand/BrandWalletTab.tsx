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
  stripe_balance: number;
  pending_balance: number;
  currency: string;
  has_stripe_account: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
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
      } = await supabase.functions.invoke('get-stripe-connect-balance', {
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

  // Check for Stripe onboarding completion from URL params
  useEffect(() => {
    const stripeOnboarding = searchParams.get('stripe_onboarding');
    if (stripeOnboarding === 'complete') {
      // Refresh wallet data to check if onboarding is complete
      const checkOnboardingStatus = async () => {
        toast.success('Stripe Connect setup completed!');

        // Clean up URL params
        searchParams.delete('stripe_onboarding');
        setSearchParams(searchParams, {
          replace: true
        });

        // Refresh wallet data - this will update the brand's stripe status
        await fetchWalletData();
      };
      checkOnboardingStatus();
    } else if (stripeOnboarding === 'refresh') {
      // User needs to restart onboarding
      searchParams.delete('stripe_onboarding');
      setSearchParams(searchParams, {
        replace: true
      });
      toast.info('Please complete your Stripe Connect setup');
    }
  }, [searchParams, brandId]);

  // Handle returning from Stripe deposit checkout
  useEffect(() => {
    const depositStatus = searchParams.get('deposit');
    
    if (depositStatus === 'success') {
      // Clean up URL params
      searchParams.delete('deposit');
      setSearchParams(searchParams, {
        replace: true
      });
      
      toast.success('Deposit successful! Funds will be available shortly.');
      fetchWalletData();
      fetchTransactions();
    } else if (depositStatus === 'cancelled') {
      searchParams.delete('deposit');
      setSearchParams(searchParams, {
        replace: true
      });
      toast.info('Deposit cancelled');
    }
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
      } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: {
          brand_id: brandId,
          return_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile&stripe_onboarding=complete`,
          refresh_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile&stripe_onboarding=refresh`
        }
      });
      if (error) throw error;

      // If account is already complete, show success
      if (data?.already_complete) {
        toast.success('Stripe Connect already set up!');
        await fetchWalletData();
        return;
      }

      // If we get an onboarding URL, redirect the user there
      if (data?.onboarding_url) {
        window.open(data.onboarding_url, '_blank');
        toast.success('Opening Stripe Connect setup...');
      } else if (data?.stripe_account_id) {
        toast.success('Stripe Connect account created!');
      }
      await fetchWalletData();
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      toast.error('Failed to set up Stripe Connect');
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