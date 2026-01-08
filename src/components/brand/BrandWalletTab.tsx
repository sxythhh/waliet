import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, ChevronDown, CreditCard, ChevronLeft, ChevronRight, Wallet, Building2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AddBrandFundsDialog } from "./AddBrandFundsDialog";
import { AllocateBudgetDialog } from "./AllocateBudgetDialog";
import { BrandToPersonalTransferDialog } from "./BrandToPersonalTransferDialog";
import { TransferToWithdrawDialog } from "./TransferToWithdrawDialog";
import { PersonalToBrandTransferDialog } from "./PersonalToBrandTransferDialog";
import { BrandDepositInfoDialog } from "./BrandDepositInfoDialog";
import { CryptoDepositDialog } from "./CryptoDepositDialog";
import { CoinbaseOnrampWidget } from "./CoinbaseOnrampWidget";
import { useAdminCheck } from "@/hooks/useAdminCheck";

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
}
interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  metadata?: {
    checkout_url?: string;
    whop_checkout_id?: string;
  } | null;
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
  const [brandToPersonalOpen, setBrandToPersonalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [personalTransferOpen, setPersonalTransferOpen] = useState(false);
  const [depositInfoOpen, setDepositInfoOpen] = useState(false);
  const [cryptoDepositOpen, setCryptoDepositOpen] = useState(false);
  const [coinbaseOnrampOpen, setCoinbaseOnrampOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const {
    isAdmin
  } = useAdminCheck();

  useEffect(() => {
    const fetchBrandName = async () => {
      const { data } = await supabase.from('brands').select('name').eq('id', brandId).single();
      if (data) setBrandName(data.name);
    };
    fetchBrandName();
  }, [brandId]);
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
      });
      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

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
  const handleOpenBrandToPersonal = () => {
    setBrandToPersonalOpen(true);
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
      case 'deposit':
        return 'Deposit';
      case 'deposit_intent':
        return 'Deposit Intent';
      case 'transfer_in':
        return 'Transfer In';
      case 'transfer_out':
        return 'Transfer Out';
      case 'crypto_deposit':
        return 'Crypto Deposit';
      case 'coinbase_onramp':
        return 'Coinbase Purchase';
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

  const handleCompletePayment = async (tx: Transaction) => {
    // Try to resume the checkout
    const returnUrl = `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile`;
    
    try {
      const { data, error } = await supabase.functions.invoke('create-brand-wallet-topup', {
        body: {
          brand_id: brandId,
          amount: tx.amount,
          return_url: returnUrl,
          transaction_id: tx.id
        }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        sessionStorage.setItem(
          `pending_topup_${brandId}`,
          JSON.stringify({ amount: tx.amount, transactionId: tx.id })
        );
        window.location.href = data.checkout_url;
      } else {
        toast.error('Could not create checkout. Please try again.');
      }
    } catch (err) {
      console.error('Error resuming payment:', err);
      toast.error('Failed to resume payment');
    }
  };
  return <div className="space-y-6">
      {/* Balance Card */}
      <Card className="border-border overflow-hidden bg-black/0">
        <CardHeader className="pb-2 px-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Virality Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-semibold text-foreground tracking-tight">
                {formatCurrency(walletData?.virality_balance || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Available for campaigns
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleOpenBrandToPersonal} disabled={(walletData?.virality_balance || 0) <= 0} className="justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 font-normal tracking-[-0.5px]" style={{
                fontFamily: 'Inter, sans-serif'
              }}>
                To Personal Wallet
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="justify-center bg-primary hover:bg-[#1850b8] text-white font-medium px-5 tracking-[-0.5px] border-t border-primary/70" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Funds
                    <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border">
                  <DropdownMenuItem onClick={() => setAddFundsOpen(true)}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay with Card
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPersonalTransferOpen(true)}>
                    <Wallet className="w-4 h-4 mr-2" />
                    From Personal Wallet
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCryptoDepositOpen(true)}>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3" />
                    </svg>
                    Crypto Deposit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDepositInfoOpen(true)}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Wire Transfer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Payments */}
      {transactions.filter(tx => tx.status === 'pending' && tx.type === 'deposit_intent').length > 0 && (
        <Card className="border-border bg-black/0">
          <CardHeader className="px-0">
            <CardTitle className="text-lg text-foreground">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-0">
            <div className="space-y-0">
              {transactions.filter(tx => tx.status === 'pending' && tx.type === 'deposit_intent').map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-foreground font-inter text-sm font-medium tracking-[-0.5px]">
                      {tx.description || 'Deposit Intent'}
                    </p>
                    <p className="font-inter text-xs text-muted-foreground tracking-[-0.5px] mt-0.5">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-inter text-sm font-medium tracking-[-0.5px] text-yellow-500">
                      {formatCurrency(tx.amount)}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleCompletePayment(tx)}
                      className="h-8 px-3 text-xs bg-primary hover:bg-[#1850b8] text-white border-t border-primary/70"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                      Complete Payment
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card className="border-border bg-black/0">
        <CardHeader className="px-0">
          <CardTitle className="text-lg text-foreground">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-0">
          {(() => {
            const filteredTx = transactions.filter(tx => tx.status === 'completed' || (tx.status === 'pending' && tx.type !== 'deposit_intent'));
            const totalPages = Math.ceil(filteredTx.length / itemsPerPage);
            const paginatedTx = filteredTx.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            
            if (filteredTx.length === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-muted-foreground font-inter text-sm tracking-[-0.5px]">No transactions yet</p>
                </div>
              );
            }
            
            return (
              <>
                <div className="space-y-0">
                  {paginatedTx.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-foreground font-inter text-sm font-medium tracking-[-0.5px]">
                          {tx.description || getTransactionTypeLabel(tx.type)}
                        </p>
                        <p className="font-inter text-xs text-muted-foreground tracking-[-0.5px] mt-0.5">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                      <p className={`font-inter text-sm font-medium tracking-[-0.5px] ${tx.amount > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTx.length)}-{Math.min(currentPage * itemsPerPage, filteredTx.length)} of {filteredTx.length}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddBrandFundsDialog open={addFundsOpen} onOpenChange={setAddFundsOpen} brandId={brandId} currentBalance={walletData?.balance || 0} onSuccess={() => {
      fetchWalletData();
      fetchTransactions();
    }} />

      <AllocateBudgetDialog open={allocateOpen} onOpenChange={setAllocateOpen} brandId={brandId} onSuccess={() => {
      fetchWalletData();
      fetchTransactions();
    }} />

      <BrandToPersonalTransferDialog open={brandToPersonalOpen} onOpenChange={setBrandToPersonalOpen} brandId={brandId} brandName={brandName} viralityBalance={walletData?.virality_balance || 0} onSuccess={() => { fetchWalletData(); fetchTransactions(); }} />

      {isAdmin && <TransferToWithdrawDialog open={transferOpen} onOpenChange={setTransferOpen} brandId={brandId} viralityBalance={walletData?.virality_balance || 0} onSuccess={() => {
      fetchWalletData();
      fetchTransactions();
    }} />}

      <PersonalToBrandTransferDialog 
        open={personalTransferOpen} 
        onOpenChange={setPersonalTransferOpen} 
        brandId={brandId} 
        brandName={brandName}
        onSuccess={() => {
          fetchWalletData();
          fetchTransactions();
        }} 
      />

      <BrandDepositInfoDialog
        open={depositInfoOpen}
        onOpenChange={setDepositInfoOpen}
        brandId={brandId}
        brandName={brandName}
      />

      <CryptoDepositDialog
        open={cryptoDepositOpen}
        onOpenChange={setCryptoDepositOpen}
        brandId={brandId}
        brandName={brandName}
        onCoinbaseOnramp={() => {
          setCryptoDepositOpen(false);
          setCoinbaseOnrampOpen(true);
        }}
      />

      <CoinbaseOnrampWidget
        open={coinbaseOnrampOpen}
        onOpenChange={setCoinbaseOnrampOpen}
        brandId={brandId}
        brandName={brandName}
        onSuccess={() => {
          fetchWalletData();
          fetchTransactions();
        }}
      />
    </div>;
}