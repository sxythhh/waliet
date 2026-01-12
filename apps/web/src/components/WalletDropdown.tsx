import { useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentLedger } from "@/hooks/usePaymentLedger";
import { CreatorWithdrawDialog } from "@/components/dashboard/CreatorWithdrawDialog";
import { TransferDialog } from "@/components/dashboard/TransferDialog";
import { LocalCurrencyAmount } from "@/components/LocalCurrencyAmount";
import walletIconWhite from "@/assets/wallet-icon-white.svg";
import walletIcon from "@/assets/wallet-icon.png";
interface WalletDropdownProps {
  variant?: "sidebar" | "header";
  isCollapsed?: boolean;
}
export function WalletDropdown({
  variant = "sidebar",
  isCollapsed = false
}: WalletDropdownProps) {
  const {
    user
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<number>(0);
  const [pendingBoostEarnings, setPendingBoostEarnings] = useState<number>(0);
  const {
    summary: ledgerSummary
  } = usePaymentLedger(user?.id);

  const fetchWalletData = useCallback(async () => {
    if (!user) return;

    // Fetch wallet balance
    const {
      data: walletData
    } = await supabase.from("wallets").select("balance").eq("user_id", user.id).single();
    if (walletData) {
      setBalance(walletData.balance || 0);
    }

    // Fetch pending withdrawals (in transit)
    const {
      data: payoutRequests
    } = await supabase.from("payout_requests").select("amount").eq("user_id", user.id).in("status", ["pending", "in_transit"]);
    if (payoutRequests) {
      const totalPending = payoutRequests.reduce((sum, req) => sum + (req.amount || 0), 0);
      setPendingWithdrawals(totalPending);
    }

    // Fetch pending boost earnings
    const {
      data: boostSubmissions
    } = await supabase.from("boost_video_submissions").select("payout_amount").eq("user_id", user.id).eq("status", "approved");
    if (boostSubmissions) {
      const totalBoost = boostSubmissions.reduce((sum, sub) => sum + (sub.payout_amount || 0), 0);
      setPendingBoostEarnings(totalBoost);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user, fetchWalletData]);
  const handleWithdraw = () => {
    setOpen(false);
    setWithdrawDialogOpen(true);
  };
  const totalPending = (ledgerSummary?.totalPending || 0) + pendingBoostEarnings;
  if (isCollapsed) {
    return <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 transition-colors">
              <img alt="Wallet" className="w-5 h-5" src={walletIcon} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 bg-background border border-border rounded-xl shadow-2xl" side="right" align="center" sideOffset={8}>
            <WalletDropdownContent balance={balance} totalPending={totalPending} pendingWithdrawals={pendingWithdrawals} onWithdraw={handleWithdraw} onTransfer={() => {
            setOpen(false);
            setTransferDialogOpen(true);
          }} />
          </PopoverContent>
        </Popover>
        <CreatorWithdrawDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen} onSuccess={fetchWalletData} />
        <TransferDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} onSuccess={fetchWalletData} currentBalance={balance} />
      </>;
  }
  return <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={`flex items-center gap-2 pl-3 pr-1.5 py-2 rounded-lg bg-muted/50 w-full ${variant === "header" ? "h-9" : ""}`}>
            <div className="flex items-center gap-2 flex-1">
              {variant === "sidebar" && <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
              <span className="font-semibold font-inter tracking-[-0.5px] text-sm">
                <LocalCurrencyAmount amount={balance} tooltipMode />
              </span>
            </div>
            <Button size="sm" className="h-7 px-3 text-xs font-medium font-inter tracking-[-0.5px]" onClick={e => {
            e.stopPropagation();
            handleWithdraw();
          }}>
              Wallet
            </Button>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-background border border-border rounded-xl shadow-2xl" side={variant === "sidebar" ? "top" : "bottom"} align="start" sideOffset={8}>
          <WalletDropdownContent balance={balance} totalPending={totalPending} pendingWithdrawals={pendingWithdrawals} onWithdraw={handleWithdraw} onTransfer={() => {
          setOpen(false);
          setTransferDialogOpen(true);
        }} />
        </PopoverContent>
      </Popover>
      <CreatorWithdrawDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen} onSuccess={fetchWalletData} />
      <TransferDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} onSuccess={fetchWalletData} currentBalance={balance} />
    </>;
}
interface WalletDropdownContentProps {
  balance: number;
  totalPending: number;
  pendingWithdrawals: number;
  onWithdraw: () => void;
  onTransfer: () => void;
}
function WalletDropdownContent({
  balance,
  totalPending,
  pendingWithdrawals,
  onWithdraw,
  onTransfer
}: WalletDropdownContentProps) {
  return <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Current Balance</span>
          <span className="text-sm font-semibold font-inter tracking-[-0.5px]"><LocalCurrencyAmount amount={balance} /></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Pending Balance</span>
          <span className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.5px]"><LocalCurrencyAmount amount={totalPending} /></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">In Transit</span>
          <span className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.5px]"><LocalCurrencyAmount amount={pendingWithdrawals} /></span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button className="w-full font-inter tracking-[-0.5px] btn-shimmer" size="sm" onClick={onWithdraw}>
          Withdraw
        </Button>
      </div>
    </div>;
}