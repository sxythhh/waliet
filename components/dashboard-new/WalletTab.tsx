"use client";

import { useState } from "react";
import {
  DollarSign,
  ArrowUpRight,
  Clock,
  Check,
  Filter,
  ChevronDown,
  Loader2,
  Building2,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import wallet deposit components
import {
  PaymentMethodsGrid,
  DepositDrawer,
  DepositAmountStep,
  DepositConfirmStep,
  CryptoNetworkStep,
  CryptoAddressStep,
  WireTransferStep,
  TransactionRow,
  TransactionDetailSheet,
  PendingDepositsSection,
  useDepositFlow,
  WalletTransaction,
  PendingDeposit,
} from "./wallet";

// Default empty wallet data - replace with real API data
const defaultWallet = {
  balance: 0,
  totalSpent: 0,
  pendingBalance: 0,
  personalBalance: 0,
};

// Default empty transactions - replace with real API data
const defaultTransactions: WalletTransaction[] = [];

// Default empty pending deposits - replace with real API data
const defaultPendingDeposits: PendingDeposit[] = [];

// Crypto deposit addresses - will be fetched from API
const cryptoAddresses: Record<string, string> = {
  solana: "",
  base: "",
  ethereum: "",
  polygon: "",
  arbitrum: "",
  optimism: "",
};

// Wire transfer details - will be fetched from API
const wireDetails = {
  accountName: "",
  accountNumber: "",
  routingNumber: "",
  bankName: "",
  bankAddress: "",
  reference: "",
};

type WithdrawMethod = "bank" | "crypto" | "";
type WithdrawStep = "form" | "confirm" | "success";

export function WalletTab() {
  const [wallet] = useState(defaultWallet);
  const [transactions] = useState(defaultTransactions);
  const [pendingDeposits] = useState(defaultPendingDeposits);
  const [filterType, setFilterType] = useState("all");

  // Transaction detail sheet state
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);

  // Deposit flow state
  const depositFlow = useDepositFlow();

  // Withdraw dialog state
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<WithdrawStep>("form");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Handle transaction click
  const handleTransactionClick = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction);
    setTransactionSheetOpen(true);
  };

  // Handle withdraw dialog open
  const handleOpenWithdrawDialog = () => {
    setWithdrawStep("form");
    setWithdrawAmount("");
    setWithdrawMethod("");
    setWithdrawError(null);
    setWithdrawDialogOpen(true);
  };

  // Handle withdraw dialog close
  const handleCloseWithdrawDialog = () => {
    setWithdrawDialogOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setWithdrawStep("form");
      setWithdrawAmount("");
      setWithdrawMethod("");
      setWithdrawError(null);
      setWithdrawLoading(false);
    }, 200);
  };

  // Handle withdraw form submission
  const handleWithdrawContinue = () => {
    setWithdrawError(null);

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError("Please enter a valid amount");
      return;
    }

    if (amount > wallet.balance) {
      setWithdrawError("Insufficient balance");
      return;
    }

    if (!withdrawMethod) {
      setWithdrawError("Please select a withdrawal method");
      return;
    }

    setWithdrawStep("confirm");
  };

  // Handle withdraw confirmation
  const handleWithdrawConfirm = async () => {
    setWithdrawLoading(true);
    try {
      // TODO: Call API to process withdrawal
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setWithdrawStep("success");
    } catch (err) {
      setWithdrawError("Failed to process withdrawal. Please try again.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Get method label
  const getMethodLabel = (method: WithdrawMethod) => {
    switch (method) {
      case "bank":
        return "Bank Transfer";
      case "crypto":
        return "Crypto Wallet";
      default:
        return "";
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === "all") return true;
    return tx.type === filterType;
  });

  // Handle deposit confirmation
  const handleConfirmDeposit = async () => {
    depositFlow.setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    depositFlow.success();
    // In real app, refresh wallet data here
    setTimeout(() => {
      depositFlow.reset();
    }, 2000);
  };

  // Handle network selection and move to address step
  const handleNetworkSelect = async (network: typeof depositFlow.network) => {
    if (!network) return;
    depositFlow.setNetwork(network);
    depositFlow.setLoading(true);
    // Simulate fetching address
    await new Promise((resolve) => setTimeout(resolve, 500));
    depositFlow.setLoading(false);
    depositFlow.nextStep();
  };

  // Render current deposit step content
  const renderDepositContent = () => {
    switch (depositFlow.step) {
      case "network":
        return (
          <CryptoNetworkStep
            selectedNetwork={depositFlow.network}
            onSelectNetwork={handleNetworkSelect}
            isLoading={depositFlow.isLoading}
          />
        );

      case "amount":
        return (
          <DepositAmountStep
            method={depositFlow.method!}
            amount={depositFlow.amount}
            onAmountChange={depositFlow.setAmount}
            personalBalance={wallet.personalBalance}
            onContinue={depositFlow.nextStep}
            isLoading={depositFlow.isLoading}
          />
        );

      case "confirm":
        return depositFlow.fees ? (
          <DepositConfirmStep
            method={depositFlow.method!}
            amount={depositFlow.amount}
            fees={depositFlow.fees}
            isLoading={depositFlow.isLoading}
            onConfirm={handleConfirmDeposit}
            onCancel={depositFlow.reset}
          />
        ) : null;

      case "address":
        if (depositFlow.method === "crypto" && depositFlow.network) {
          return (
            <CryptoAddressStep
              network={depositFlow.network}
              address={cryptoAddresses[depositFlow.network] || ""}
            />
          );
        }
        if (depositFlow.method === "wire") {
          return (
            <WireTransferStep
              accountName={wireDetails.accountName}
              accountNumber={wireDetails.accountNumber}
              routingNumber={wireDetails.routingNumber}
              bankName={wireDetails.bankName}
              bankAddress={wireDetails.bankAddress}
              reference={wireDetails.reference}
            />
          );
        }
        return null;

      case "success":
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Deposit Initiated</h3>
            <p className="text-sm text-muted-foreground">
              Your deposit is being processed.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your funds and transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleOpenWithdrawDialog}>
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground font-medium">
                Available Balance
              </p>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              ${wallet.balance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground font-medium">
                Total Spent
              </p>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              ${wallet.totalSpent.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground font-medium">
                Pending
              </p>
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              ${wallet.pendingBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Deposits */}
      <PendingDepositsSection deposits={pendingDeposits} />

      {/* Payment Methods Grid - Deposit Options */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <PaymentMethodsGrid
            onSelectMethod={depositFlow.selectMethod}
            personalBalance={wallet.personalBalance}
          />
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transaction History</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-3 h-3" />
                  {filterType === "all" ? "All" : filterType}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterType("all")}>
                  All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("deposit")}>
                  Deposits
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("crypto_deposit")}>
                  Crypto Deposits
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("payout")}>
                  Payouts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("withdrawal")}>
                  Withdrawals
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("refund")}>
                  Refunds
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-border">
            {filteredTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                onClick={() => handleTransactionClick(tx)}
              />
            ))}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                No transactions found
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit Drawer */}
      <DepositDrawer
        state={depositFlow}
        isOpen={depositFlow.isOpen}
        onClose={depositFlow.reset}
      >
        {renderDepositContent()}
      </DepositDrawer>

      {/* Transaction Detail Sheet */}
      <TransactionDetailSheet
        transaction={selectedTransaction}
        open={transactionSheetOpen}
        onOpenChange={setTransactionSheetOpen}
      />

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {withdrawStep === "form" && (
            <>
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
                <DialogDescription>
                  Enter the amount you want to withdraw and select a method.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Available Balance */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                  <p className="text-lg font-bold">${wallet.balance.toLocaleString()}</p>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pl-7"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {wallet.balance > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-auto p-0 text-primary"
                      onClick={() => setWithdrawAmount(wallet.balance.toString())}
                    >
                      Withdraw max
                    </Button>
                  )}
                </div>

                {/* Method Selection */}
                <div className="space-y-2">
                  <Label>Withdrawal Method</Label>
                  <Select
                    value={withdrawMethod}
                    onValueChange={(value) => setWithdrawMethod(value as WithdrawMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>Bank Transfer</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="crypto">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          <span>Crypto Wallet</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Error Message */}
                {withdrawError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{withdrawError}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseWithdrawDialog}>
                  Cancel
                </Button>
                <Button onClick={handleWithdrawContinue}>
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {withdrawStep === "confirm" && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Withdrawal</DialogTitle>
                <DialogDescription>
                  Please review your withdrawal details.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-sm font-medium">
                      ${parseFloat(withdrawAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Method</span>
                    <span className="text-sm font-medium">{getMethodLabel(withdrawMethod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fee</span>
                    <span className="text-sm font-medium">$0.00</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="text-sm font-medium">You will receive</span>
                    <span className="text-sm font-bold">
                      ${parseFloat(withdrawAmount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {withdrawError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{withdrawError}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setWithdrawStep("form")}
                  disabled={withdrawLoading}
                >
                  Back
                </Button>
                <Button onClick={handleWithdrawConfirm} disabled={withdrawLoading}>
                  {withdrawLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Withdrawal"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {withdrawStep === "success" && (
            <>
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Withdrawal Initiated</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Your withdrawal of ${parseFloat(withdrawAmount).toLocaleString()} is being processed.
                </p>
                <p className="text-xs text-muted-foreground">
                  {withdrawMethod === "bank"
                    ? "Funds will arrive in 1-3 business days."
                    : "Funds will arrive within 30 minutes."}
                </p>
              </div>

              <DialogFooter>
                <Button onClick={handleCloseWithdrawDialog} className="w-full">
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
