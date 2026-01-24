import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopUpBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boostId: string;
  boostTitle: string;
  currentBalance: number;
  onSuccess?: () => void;
}

interface FundingItem {
  id: string;
  title: string;
  budget: number;
  type: 'campaign' | 'boost';
}

const QUICK_AMOUNTS = [100, 250, 500, 1000];

export function TopUpBalanceDialog({
  open,
  onOpenChange,
  boostId,
  boostTitle,
  currentBalance,
  onSuccess,
}: TopUpBalanceDialogProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [items, setItems] = useState<FundingItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(boostId);
  const [fetchingData, setFetchingData] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  useEffect(() => {
    if (open && user) {
      fetchBoostAndBrandData();
    }
  }, [open, user, boostId]);

  useEffect(() => {
    if (brandId) {
      fetchWalletBalance();
      fetchAllItems();
    }
  }, [brandId]);

  // Pre-select the boost when items are loaded
  useEffect(() => {
    if (boostId && items.length > 0) {
      const exists = items.some(item => item.id === boostId);
      if (exists) {
        setSelectedId(boostId);
      }
    }
  }, [boostId, items]);

  const fetchBoostAndBrandData = async () => {
    try {
      const { data: boostData, error } = await supabase
        .from("bounty_campaigns")
        .select("brand_id")
        .eq("id", boostId)
        .single();

      if (error || !boostData) {
        throw new Error("Failed to fetch boost data");
      }

      setBrandId(boostData.brand_id);
    } catch (error) {
      console.error("Error fetching boost data:", error);
    }
  };

  const fetchWalletBalance = async () => {
    if (!brandId) return;
    setLoadingBalance(true);
    try {
      const { data: walletData } = await supabase
        .from("brand_wallets")
        .select("balance")
        .eq("brand_id", brandId)
        .single();

      setWalletBalance(walletData?.balance || 0);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchAllItems = async () => {
    if (!brandId) return;
    setFetchingData(true);
    try {
      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title, budget, status')
        .eq('brand_id', brandId)
        .neq('status', 'deleted');

      // Fetch boosts
      const { data: boostsData } = await supabase
        .from('bounty_campaigns')
        .select('id, title, budget, status')
        .eq('brand_id', brandId)
        .neq('status', 'deleted');

      const allItems: FundingItem[] = [
        ...(campaignsData || []).map(c => ({ ...c, type: 'campaign' as const })),
        ...(boostsData || []).map(b => ({ ...b, budget: b.budget || 0, type: 'boost' as const })),
      ];

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const getSelectedItem = () => {
    return items.find(item => item.id === selectedId);
  };

  const handleTransfer = async () => {
    const parsedAmount = parseFloat(amount);
    const selectedItem = getSelectedItem();

    if (!selectedId || !selectedItem) {
      toast.error('Please select a campaign or boost');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Re-fetch balance to ensure it's current
    const { data: currentWallet } = await supabase
      .from("brand_wallets")
      .select("balance")
      .eq("brand_id", brandId)
      .single();

    const currentWalletBalance = currentWallet?.balance || 0;

    if (parsedAmount > currentWalletBalance) {
      setWalletBalance(currentWalletBalance);
      toast.error(`Insufficient balance. Available: ${formatCurrency(currentWalletBalance)}`);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('allocate-brand-budget', {
        body: {
          brand_id: brandId,
          [selectedItem.type === 'campaign' ? 'campaign_id' : 'boost_id']: selectedId,
          amount: parsedAmount,
        },
      });

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (error) {
        const errorMessage = error.context?.body?.error || error.message || 'Failed to allocate budget';
        toast.error(errorMessage);
        return;
      }

      toast.success(`${formatCurrency(parsedAmount)} allocated successfully`);
      onOpenChange(false);
      setAmount("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error transferring funds:", error);
      let errorMessage = 'Failed to allocate budget';
      try {
        if (error.context) {
          const body = await error.context.json();
          errorMessage = body?.error || errorMessage;
        }
      } catch {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setSelectedId(boostId);
      setAmount("");
    }
    onOpenChange(openState);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const parsedAmount = parseFloat(amount) || 0;
  const selectedItem = getSelectedItem();
  const insufficientBalance = parsedAmount > walletBalance && parsedAmount > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px] bg-card border-0 p-0 overflow-hidden rounded-2xl font-inter tracking-[-0.5px]">
        {/* Header */}
        <div className="px-6 pt-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Fund Campaign
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-left">
              Transfer funds from your brand wallet to a campaign or boost.
            </p>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Campaign/Boost Selector */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground">Select Destination</Label>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-between px-4 bg-transparent border-border hover:bg-muted/30 text-left font-normal rounded-xl transition-colors",
                    !selectedItem && "text-muted-foreground"
                  )}
                >
                  {fetchingData ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </span>
                  ) : selectedItem ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">{selectedItem.title}</span>
                    </div>
                  ) : (
                    <span>Choose a campaign or boost</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[392px] bg-popover border-border p-1 max-h-[300px] overflow-y-auto"
              >
                {items.length === 0 && !fetchingData ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No active campaigns or boosts
                  </div>
                ) : (
                  <>
                    {items.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => {
                          setSelectedId(item.id);
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">Budget: {formatCurrency(item.budget)}</p>
                        </div>
                        {selectedId === item.id && (
                          <Check className="w-4 h-4 text-emerald-500" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 h-14 bg-transparent border-border text-2xl font-semibold placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/80 rounded-xl transition-colors"
              />
            </div>
            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickAmount(value)}
                  className={cn(
                    "flex-1 h-9 text-sm font-medium rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors",
                    parseFloat(amount) === value && "bg-primary text-white hover:bg-primary/90"
                  )}
                >
                  ${value}
                </Button>
              ))}
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {insufficientBalance && (
            <div className="flex items-center gap-2.5 text-destructive text-sm bg-destructive/10 rounded-xl p-3.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <div>
                <span>Insufficient balance. </span>
                <span className="text-destructive/70">
                  Available: {loadingBalance ? "..." : formatCurrency(walletBalance)}
                </span>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedItem && parsedAmount > 0 && !insufficientBalance && (
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Funding</span>
                <span className="text-foreground font-medium">{selectedItem.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current budget</span>
                <span className="text-muted-foreground">
                  {formatCurrency(selectedItem.budget)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New budget</span>
                <span className="text-emerald-500 font-medium">
                  {formatCurrency(selectedItem.budget + parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining balance</span>
                <span className="text-muted-foreground">
                  {formatCurrency(walletBalance - parsedAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleClose(false)}
            className="h-10 px-5 text-sm font-medium text-muted-foreground hover:text-muted-foreground hover:bg-muted/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={loading || !selectedId || parsedAmount <= 0 || insufficientBalance || loadingBalance}
            className="h-10 px-6 text-sm font-medium bg-primary text-white hover:bg-primary/90 border-t border-white/30 rounded-lg disabled:opacity-30"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Funding...
              </span>
            ) : 'Fund Campaign'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
