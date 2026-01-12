import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BrandToPersonalTransferDialog } from "./BrandToPersonalTransferDialog";
import { TransferToWithdrawDialog } from "./TransferToWithdrawDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";

// New wallet components
import {
  PaymentMethodsGrid,
  DepositDrawer,
  DepositAmountStep,
  DepositConfirmStep,
  CryptoNetworkStep,
  CryptoAddressStep,
  WireTransferStep,
  TransactionRow,
  PendingDepositsSection,
  useDepositFlow,
  WalletTransaction,
  PendingDeposit,
  PaymentMethod,
  CryptoNetwork,
} from "./wallet";

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

export function BrandWalletTab({ brandId, brandSlug }: BrandWalletTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [brandToPersonalOpen, setBrandToPersonalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [personalBalance, setPersonalBalance] = useState(0);
  const [cryptoAddress, setCryptoAddress] = useState("");
  const itemsPerPage = 10;
  const { isAdmin } = useAdminCheck();

  // Deposit flow state machine
  const depositFlow = useDepositFlow();

  // Fetch brand name
  useEffect(() => {
    const fetchBrandName = async () => {
      const { data } = await supabase
        .from("brands")
        .select("name")
        .eq("id", brandId)
        .single();
      if (data) setBrandName(data.name);
    };
    fetchBrandName();
  }, [brandId]);

  // Fetch personal wallet balance for transfers
  useEffect(() => {
    const fetchPersonalBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", session.user.id)
        .single();

      if (data) setPersonalBalance(data.balance);
    };
    fetchPersonalBalance();
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("get-brand-balance", {
        body: { brand_id: brandId },
      });

      if (error) throw error;
      setWalletData(data);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast.error("Failed to load wallet data");
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("brand_wallet_transactions")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as WalletTransaction[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  // Handle checkout return
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout_status");
    const status = searchParams.get("status");
    const hasSuccess = checkoutStatus === "success" || status === "success";
    const hasReturnId =
      searchParams.get("setup_intent_id") ||
      searchParams.get("membership_id") ||
      searchParams.get("payment_id") ||
      searchParams.get("receipt_id");

    if (!hasSuccess || !hasReturnId) return;

    // Clean up URL params
    ["checkout_status", "status", "setup_intent_id", "membership_id", "payment_id", "receipt_id", "state_id"].forEach(
      (p) => searchParams.delete(p)
    );
    setSearchParams(searchParams, { replace: true });

    const pendingTopupData = localStorage.getItem(`pending_topup_${brandId}`);
    if (!pendingTopupData) {
      toast.success("Checkout completed.");
      fetchWalletData();
      fetchTransactions();
      return;
    }

    const { amount, transactionId } = JSON.parse(pendingTopupData);
    localStorage.removeItem(`pending_topup_${brandId}`);

    const finalizeTopup = async () => {
      toast.loading("Finalizing top-up...", { id: "topup-finalize" });
      try {
        const returnUrl = `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile`;
        const { data, error } = await supabase.functions.invoke("create-brand-wallet-topup", {
          body: { brand_id: brandId, amount, return_url: returnUrl, transaction_id: transactionId },
        });

        if (error) throw error;
        if (data?.success && !data?.needs_payment_method) {
          toast.success(`Added $${amount} to your wallet!`, { id: "topup-finalize" });
          fetchWalletData();
          fetchTransactions();
          return;
        }
        toast.error("Could not finalize top-up. Please try again.", { id: "topup-finalize" });
      } catch (e) {
        console.error("Error finalizing top-up:", e);
        toast.error("Failed to finalize top-up.", { id: "topup-finalize" });
      }
    };
    finalizeTopup();
  }, [searchParams, setSearchParams, brandId, brandSlug]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWalletData(), fetchTransactions()]);
      setLoading(false);
    };
    loadData();
  }, [brandId]);

  // Real-time subscription for deposit confirmations
  useEffect(() => {
    const channel = supabase
      .channel(`brand-wallet-${brandId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "brand_wallet_transactions",
        filter: `brand_id=eq.${brandId}`,
      }, (payload) => {
        const newStatus = payload.new?.status;
        const oldStatus = payload.old?.status;
        const amount = payload.new?.amount;
        const type = payload.new?.type;

        if (oldStatus === "pending" && newStatus === "completed") {
          const typeLabel =
            type === "crypto_deposit" ? "Crypto deposit" :
            type === "deposit" ? "Wire deposit" :
            type === "topup" ? "Card payment" : "Deposit";
          toast.success(`${typeLabel} of $${Number(amount).toFixed(2)} confirmed!`, { duration: 5000 });
          fetchWalletData();
          fetchTransactions();
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "brand_wallet_transactions",
        filter: `brand_id=eq.${brandId}`,
      }, (payload) => {
        const status = payload.new?.status;
        const amount = payload.new?.amount;
        const type = payload.new?.type;

        if (status === "completed" && (type === "crypto_deposit" || type === "deposit")) {
          const typeLabel = type === "crypto_deposit" ? "Crypto deposit" : "Wire deposit";
          toast.success(`${typeLabel} of $${Number(amount).toFixed(2)} received!`, { duration: 5000 });
          fetchWalletData();
          fetchTransactions();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId]);

  // Pending deposits (filter pending transactions)
  const pendingDeposits = useMemo<PendingDeposit[]>(() => {
    return transactions
      .filter((tx) => tx.status === "pending" && ["crypto_deposit", "deposit", "topup"].includes(tx.type))
      .map((tx) => ({
        id: tx.id,
        type: tx.type as "crypto_deposit" | "deposit" | "topup",
        amount: tx.amount,
        status: "pending" as const,
        created_at: tx.created_at,
        network: tx.metadata?.network,
        tx_signature: tx.metadata?.tx_signature,
      }));
  }, [transactions]);

  // Completed/processing transactions for history
  const historyTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.status === "completed" || (tx.status === "pending" && tx.type !== "deposit_intent")
    );
  }, [transactions]);

  // Pagination
  const totalPages = Math.ceil(historyTransactions.length / itemsPerPage);
  const paginatedTransactions = historyTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle payment method selection
  const handleSelectMethod = (method: PaymentMethod) => {
    depositFlow.selectMethod(method);
  };

  // Handle network selection for crypto - fetch address for selected network
  const handleNetworkSelect = async (network: CryptoNetwork) => {
    depositFlow.setNetwork(network);
    depositFlow.setLoading(true);

    try {
      // Get current session to ensure auth token is fresh
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Please sign in to continue");
        depositFlow.setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-deposit-address", {
        body: { brand_id: brandId, network },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      console.log("generate-deposit-address response:", { data, error });

      if (error) {
        // Try to get more details from the error
        const errorContext = (error as any).context;
        let errorMessage = "Failed to generate deposit address";

        if (errorContext) {
          try {
            const errorBody = await errorContext.json();
            console.error("Edge function error details:", errorBody);
            errorMessage = errorBody.error || errorMessage;
          } catch {
            console.error("Edge function error:", error);
          }
        }

        toast.error(errorMessage);
        return;
      }

      if (data?.error) {
        console.error("Function returned error:", data.error);
        toast.error(data.error);
        return;
      }

      if (data?.address) {
        setCryptoAddress(data.address);
        depositFlow.nextStep();
      } else {
        toast.error("No address returned from server");
      }
    } catch (error) {
      console.error("Error fetching deposit address:", error);
      toast.error("Failed to generate deposit address");
    } finally {
      depositFlow.setLoading(false);
    }
  };

  // Handle card deposit
  const handleCardDeposit = async () => {
    depositFlow.setLoading(true);
    try {
      const returnUrl = `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile`;
      const { data, error } = await supabase.functions.invoke("create-brand-wallet-topup", {
        body: { brand_id: brandId, amount: depositFlow.amount, return_url: returnUrl },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        localStorage.setItem(
          `pending_topup_${brandId}`,
          JSON.stringify({ amount: depositFlow.amount, transactionId: data.transaction_id })
        );
        window.location.href = data.checkout_url;
      } else {
        toast.error("Could not create checkout. Please try again.");
        depositFlow.setLoading(false);
      }
    } catch (err) {
      console.error("Error creating card deposit:", err);
      toast.error("Failed to create deposit");
      depositFlow.setLoading(false);
    }
  };

  // Handle personal wallet transfer
  const handlePersonalTransfer = async () => {
    depositFlow.setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("personal-to-brand-transfer", {
        body: { brand_id: brandId, amount: depositFlow.amount },
      });

      if (error) throw error;

      toast.success(`Transferred $${depositFlow.amount.toFixed(2)} to ${brandName}`);
      depositFlow.success();
      fetchWalletData();
      fetchTransactions();

      // Reset after success
      setTimeout(() => depositFlow.reset(), 2000);
    } catch (err) {
      console.error("Error transferring funds:", err);
      toast.error("Failed to transfer funds");
      depositFlow.setLoading(false);
    }
  };

  // Handle confirm based on method
  const handleConfirm = () => {
    if (depositFlow.method === "card") {
      handleCardDeposit();
    } else if (depositFlow.method === "personal") {
      handlePersonalTransfer();
    }
  };

  // Render current drawer step
  const renderDrawerContent = () => {
    switch (depositFlow.step) {
      case "network":
        return (
          <CryptoNetworkStep
            selectedNetwork={depositFlow.network}
            onSelectNetwork={handleNetworkSelect}
            isLoading={depositFlow.isLoading}
          />
        );

      case "address":
        if (depositFlow.method === "crypto" && depositFlow.network) {
          return (
            <CryptoAddressStep
              network={depositFlow.network}
              address={cryptoAddress}
            />
          );
        }
        if (depositFlow.method === "wire") {
          return (
            <WireTransferStep
              accountName="Virality Inc."
              accountNumber="123456789"
              routingNumber="021000021"
              bankName="Chase Bank"
              reference={brandId.slice(0, 8).toUpperCase()}
              onDone={depositFlow.reset}
            />
          );
        }
        return null;

      case "amount":
        return (
          <DepositAmountStep
            method={depositFlow.method!}
            amount={depositFlow.amount}
            onAmountChange={depositFlow.setAmount}
            onContinue={depositFlow.nextStep}
            personalBalance={personalBalance}
          />
        );

      case "confirm":
        return depositFlow.fees ? (
          <DepositConfirmStep
            method={depositFlow.method!}
            amount={depositFlow.amount}
            fees={depositFlow.fees}
            isLoading={depositFlow.isLoading}
            onConfirm={handleConfirm}
            onCancel={depositFlow.prevStep}
          />
        ) : null;

      case "success":
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Transfer Complete</h3>
            <p className="text-sm text-muted-foreground mt-1">
              ${depositFlow.amount.toFixed(2)} has been added to your wallet
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
          Virality Balance
        </p>
        <p className="text-4xl font-semibold text-foreground font-inter tracking-[-1.5px]">
          {formatCurrency(walletData?.virality_balance || 0)}
        </p>
        <div className="flex items-center gap-3 pt-1">
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            Available for campaigns
          </p>
          {(walletData?.virality_balance || 0) > 0 && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={() => setBrandToPersonalOpen(true)}
                className="text-sm text-primary hover:text-primary/80 font-inter tracking-[-0.3px] transition-colors"
              >
                Withdraw to personal
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment Methods Grid */}
      <PaymentMethodsGrid
        onSelectMethod={handleSelectMethod}
        personalBalance={personalBalance}
      />

      {/* Pending Deposits */}
      <PendingDepositsSection deposits={pendingDeposits} />

      {/* Transaction History */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold font-inter tracking-[-0.5px]">
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {historyTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <span
                  className="material-symbols-rounded text-[24px] text-muted-foreground/60"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
                >
                  local_atm
                </span>
              </div>
              <h3 className="font-inter tracking-[-0.5px] font-medium text-foreground">
                No transactions yet
              </h3>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1 max-w-[280px]">
                Add funds to your wallet to start funding campaigns
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {paginatedTransactions.map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, historyTransactions.length)}-
                    {Math.min(currentPage * itemsPerPage, historyTransactions.length)} of{" "}
                    {historyTransactions.length}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Deposit Drawer */}
      <DepositDrawer
        state={depositFlow}
        isOpen={depositFlow.isOpen}
        onClose={depositFlow.reset}
      >
        {renderDrawerContent()}
      </DepositDrawer>

      {/* Transfer Dialogs (keep these for now) */}
      <BrandToPersonalTransferDialog
        open={brandToPersonalOpen}
        onOpenChange={setBrandToPersonalOpen}
        brandId={brandId}
        brandName={brandName}
        viralityBalance={walletData?.virality_balance || 0}
        onSuccess={() => {
          fetchWalletData();
          fetchTransactions();
        }}
      />

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
    </div>
  );
}
