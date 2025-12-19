import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Wallet, Plus, ArrowUpRight, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { AddBrandFundsDialog } from "./AddBrandFundsDialog";
import { AllocateBudgetDialog } from "./AllocateBudgetDialog";
import { BrandOnboardingCard } from "./BrandOnboardingCard";

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
        body: { brand_id: brandId },
      });

      if (error) throw error;

      toast.success('Wallet set up successfully!');
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
          return_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=account`
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
        <Card className="bg-[#0f0f0f] border-[#1f1f1f]">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#2060df]/10 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-[#2060df]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Set Up Your Brand Wallet</h3>
              <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                Create a dedicated wallet for your brand to manage campaign budgets, 
                receive funds, and process withdrawals.
              </p>
              <Button 
                onClick={handleSetupWallet} 
                disabled={settingUp}
                className="bg-[#2060df] hover:bg-[#1a50c0]"
              >
                {settingUp ? 'Setting up...' : 'Set Up Wallet'}
              </Button>
            </div>
          </CardContent>
        </Card>
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
      <Card className="bg-[#0f0f0f] border-[#1f1f1f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#2060df]" />
            Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-4xl font-bold text-white">
                {formatCurrency(walletData?.balance || 0)}
              </p>
              {(walletData?.pending_balance || 0) > 0 && (
                <p className="text-sm text-neutral-400 mt-1">
                  + {formatCurrency(walletData.pending_balance)} pending
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleOpenPayoutPortal}
                disabled={openingPortal}
                className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {openingPortal ? 'Opening...' : 'Withdraw'}
              </Button>
              <Button
                onClick={() => setAllocateOpen(true)}
                disabled={(walletData?.balance || 0) <= 0}
                variant="outline"
                className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a]"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Fund Campaign
              </Button>
              <Button
                onClick={() => setAddFundsOpen(true)}
                className="bg-[#2060df] hover:bg-[#1a50c0]"
              >
                <Plus className="w-4 h-4 mr-2" />
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
