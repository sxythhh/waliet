import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentLedger } from "@/hooks/usePaymentLedger";
import { CreatorWithdrawDialog } from "@/components/dashboard/CreatorWithdrawDialog";

interface WalletDropdownProps {
  variant?: "sidebar" | "header";
  isCollapsed?: boolean;
}

export function WalletDropdown({ variant = "sidebar", isCollapsed = false }: WalletDropdownProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<number>(0);
  const [pendingBoostEarnings, setPendingBoostEarnings] = useState<number>(0);
  const { summary: ledgerSummary } = usePaymentLedger(user?.id);

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;

    // Fetch wallet balance
    const { data: walletData } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (walletData) {
      setBalance(walletData.balance || 0);
    }

    // Fetch pending withdrawals (in transit)
    const { data: payoutRequests } = await supabase
      .from("payout_requests")
      .select("amount")
      .eq("user_id", user.id)
      .in("status", ["pending", "in_transit"]);

    if (payoutRequests) {
      const totalPending = payoutRequests.reduce((sum, req) => sum + (req.amount || 0), 0);
      setPendingWithdrawals(totalPending);
    }

    // Fetch pending boost earnings
    const { data: boostSubmissions } = await supabase
      .from("boost_video_submissions")
      .select("payout_amount")
      .eq("user_id", user.id)
      .eq("status", "approved");

    if (boostSubmissions) {
      const totalBoost = boostSubmissions.reduce((sum, sub) => sum + (sub.payout_amount || 0), 0);
      setPendingBoostEarnings(totalBoost);
    }
  };

  const handleWithdraw = () => {
    setOpen(false);
    setWithdrawDialogOpen(true);
  };

  const totalPending = (ledgerSummary?.totalPending || 0) + pendingBoostEarnings;

  if (isCollapsed) {
    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
              <Wallet className="w-5 h-5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-64 p-3 bg-background border border-border rounded-xl shadow-2xl"
            side="right"
            align="center"
            sideOffset={8}
          >
            <WalletDropdownContent 
              balance={balance}
              totalPending={totalPending}
              pendingWithdrawals={pendingWithdrawals}
              onWithdraw={handleWithdraw}
            />
          </PopoverContent>
        </Popover>
        <CreatorWithdrawDialog 
          open={withdrawDialogOpen} 
          onOpenChange={setWithdrawDialogOpen}
          onSuccess={fetchWalletData}
        />
      </>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors w-full ${variant === "header" ? "h-9" : ""}`}>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-base font-semibold font-inter tracking-[-0.5px]">
                ${balance.toFixed(2)}
              </span>
            </div>
            {variant === "sidebar" ? (
              <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            ) : (
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            )}
            <Button 
              size="sm" 
              className="h-7 px-3 text-xs font-medium font-inter tracking-[-0.5px]"
              onClick={(e) => {
                e.stopPropagation();
                handleWithdraw();
              }}
            >
              Wallet
            </Button>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-3 bg-background border border-border rounded-xl shadow-2xl"
          side={variant === "sidebar" ? "top" : "bottom"}
          align="start"
          sideOffset={8}
        >
          <WalletDropdownContent 
            balance={balance}
            totalPending={totalPending}
            pendingWithdrawals={pendingWithdrawals}
            onWithdraw={handleWithdraw}
          />
        </PopoverContent>
      </Popover>
      <CreatorWithdrawDialog 
        open={withdrawDialogOpen} 
        onOpenChange={setWithdrawDialogOpen}
        onSuccess={fetchWalletData}
      />
    </>
  );
}

interface WalletDropdownContentProps {
  balance: number;
  totalPending: number;
  pendingWithdrawals: number;
  onWithdraw: () => void;
}

function WalletDropdownContent({ balance, totalPending, pendingWithdrawals, onWithdraw }: WalletDropdownContentProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Current Balance</span>
          <span className="text-sm font-semibold font-inter tracking-[-0.5px]">${balance.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Pending Balance</span>
          <span className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.5px]">${totalPending.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">In Transit</span>
          <span className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.5px]">${pendingWithdrawals.toFixed(2)}</span>
        </div>
      </div>
      <Button 
        className="w-full font-inter tracking-[-0.5px]" 
        size="sm"
        onClick={onWithdraw}
      >
        Withdraw
      </Button>
    </div>
  );
}
