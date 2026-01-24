import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ChevronDown, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AllocateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onSuccess?: () => void;
  preselectedCampaignId?: string;
  preselectedType?: 'campaign' | 'boost';
}

interface Campaign {
  id: string;
  title: string;
  budget: number;
}

interface Boost {
  id: string;
  title: string;
  budget: number | null;
}

type FundingItem = {
  id: string;
  title: string;
  budget: number;
  type: 'campaign' | 'boost';
};

const QUICK_AMOUNTS = [100, 250, 500, 1000];

export function AllocateBudgetDialog({
  open,
  onOpenChange,
  brandId,
  onSuccess,
  preselectedCampaignId,
  preselectedType = 'campaign',
}: AllocateBudgetDialogProps) {
  const [items, setItems] = useState<FundingItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
      fetchWalletBalance();
    }
  }, [open, brandId]);

  // Handle preselection when data is loaded
  useEffect(() => {
    if (preselectedCampaignId && items.length > 0) {
      const exists = items.some(item => item.id === preselectedCampaignId);
      if (exists) {
        setSelectedId(preselectedCampaignId);
      }
    }
  }, [preselectedCampaignId, items]);

  const fetchWalletBalance = async () => {
    setLoadingBalance(true);
    try {
      const { data: walletData } = await supabase
        .from("brand_wallets")
        .select("balance")
        .eq("brand_id", brandId)
        .single();

      setWalletBalance(walletData?.balance || 0);
    } catch (error) {
      console.error("Error fetching brand wallet balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchData = async () => {
    setFetchingData(true);
    try {
      // Fetch campaigns (all non-deleted campaigns can be funded)
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title, budget, status')
        .eq('brand_id', brandId)
        .neq('status', 'deleted');

      // Fetch boosts (all non-deleted boosts can be funded)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSelectedItem = () => {
    return items.find(item => item.id === selectedId);
  };

  const handleAllocate = async () => {
    const parsedAmount = parseFloat(amount);
    const selectedItem = getSelectedItem();

    if (!selectedId || !selectedItem) {
      toast.error('Please select a campaign or boost');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Re-fetch balance to ensure it's current before allocating
    const { data: currentWallet } = await supabase
      .from("brand_wallets")
      .select("balance")
      .eq("brand_id", brandId)
      .single();

    const currentBalance = currentWallet?.balance || 0;

    if (parsedAmount > currentBalance) {
      setWalletBalance(currentBalance);
      toast.error(`Insufficient balance. Available: ${formatCurrency(currentBalance)}`);
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

      // Check for error in response data (edge function returns { error: '...' } on failure)
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (error) {
        // Try to extract error message from the response context
        const errorMessage = error.context?.body?.error || error.message || 'Failed to allocate budget';
        toast.error(errorMessage);
        return;
      }

      toast.success(`${formatCurrency(parsedAmount)} allocated successfully`);
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setSelectedId("");
      setAmount("");
    } catch (error: any) {
      console.error('Error allocating budget:', error);
      // Try to parse error context if available
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
      setSelectedId("");
      setAmount("");
    }
    onOpenChange(openState);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const parsedAmount = parseFloat(amount) || 0;
  const selectedItem = getSelectedItem();
  const insufficientBalance = !loadingBalance && parsedAmount > walletBalance && parsedAmount > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#0a0a0a] border border-border/40 p-0 overflow-hidden rounded-2xl font-inter gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/40">
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.3px] text-foreground">
            Fund Campaign
          </DialogTitle>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Transfer from your brand wallet
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Campaign/Boost Selector */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              Destination
            </label>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 justify-between px-3.5 bg-transparent border-border/60 hover:bg-muted/30 hover:border-border text-left font-normal rounded-xl transition-all",
                    !selectedItem && "text-muted-foreground"
                  )}
                >
                  {fetchingData ? (
                    <span className="flex items-center gap-2 text-[13px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading...
                    </span>
                  ) : selectedItem ? (
                    <span className="text-[13px] font-medium text-foreground truncate">
                      {selectedItem.title}
                    </span>
                  ) : (
                    <span className="text-[13px]">Select campaign or boost</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[calc(100vw-40px)] sm:w-[360px] bg-popover border-border/60 p-1.5 max-h-[280px] overflow-y-auto rounded-xl"
              >
                {items.length === 0 && !fetchingData ? (
                  <div className="p-4 text-[13px] text-muted-foreground text-center">
                    No campaigns or boosts found
                  </div>
                ) : (
                  items.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                        setDropdownOpen(false);
                      }}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.type === 'boost' ? 'Boost' : 'Campaign'} · {formatCurrency(item.budget)} budget
                        </p>
                      </div>
                      {selectedId === item.id && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] font-medium text-muted-foreground/60">$</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 h-12 bg-transparent border-border/60 text-[22px] font-semibold placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary rounded-xl transition-colors tabular-nums"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleQuickAmount(value)}
                  className={cn(
                    "h-8 text-[12px] font-medium rounded-lg transition-all",
                    parseFloat(amount) === value
                      ? "bg-primary text-white"
                      : "bg-muted/50 dark:bg-muted/30 text-foreground hover:bg-muted dark:hover:bg-muted/50"
                  )}
                >
                  ${value}
                </button>
              ))}
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {insufficientBalance && (
            <div className="flex items-center gap-2 text-[12px] text-red-500 dark:text-red-400 bg-red-500/10 rounded-lg p-2.5">
              <span className="font-medium">Insufficient balance</span>
              <span className="text-red-500/70 dark:text-red-400/70">
                · Need {formatCurrency(parsedAmount - walletBalance)} more
              </span>
            </div>
          )}

          {/* Transfer Summary */}
          {selectedItem && parsedAmount > 0 && !insufficientBalance && (
            <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-background flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                    {formatCurrency(selectedItem.budget).replace('$', '')}
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedItem.budget + parsedAmount).replace('$', '')}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(parsedAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">{selectedItem.title}</span>
                <span className="text-muted-foreground">
                  Balance after: {formatCurrency(walletBalance - parsedAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleClose(false)}
            className="flex-1 h-10 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAllocate}
            disabled={loading || !selectedId || parsedAmount <= 0 || insufficientBalance || loadingBalance}
            className="flex-1 h-10 text-[13px] font-medium bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Funding...
              </span>
            ) : (
              `Fund ${parsedAmount > 0 ? formatCurrency(parsedAmount) : 'Campaign'}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
