import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Loader2, ChevronDown, Megaphone, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

    if (parsedAmount > walletBalance) {
      toast.error('Insufficient brand wallet balance');
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

      if (error) throw error;

      toast.success(`${formatCurrency(parsedAmount)} allocated successfully`);
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setSelectedId("");
      setAmount("");
    } catch (error: any) {
      console.error('Error allocating budget:', error);
      toast.error(error.message || 'Failed to allocate budget');
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
  const campaigns = items.filter(i => i.type === 'campaign');
  const boosts = items.filter(i => i.type === 'boost');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px] bg-card border-0 p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="px-6 pt-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight font-inter">
              Fund Campaign
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] text-left">
              Transfer funds from your brand wallet to a campaign or boost.
            </p>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Wallet Balance */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">Available Balance</span>
            {loadingBalance ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-xl font-semibold text-foreground tracking-tight font-inter">{formatCurrency(walletBalance)}</span>
            )}
          </div>

          {/* Campaign/Boost Selector */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground font-inter tracking-[-0.5px]">Select Destination</Label>
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
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedItem.type === 'campaign' ? "bg-blue-500/20" : "bg-orange-500/20"
                      )}>
                        {selectedItem.type === 'campaign' ? (
                          <Megaphone className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Zap className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{selectedItem.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedItem.type === 'campaign' ? 'Campaign' : 'Boost'} • {formatCurrency(selectedItem.budget)}
                        </span>
                      </div>
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
                    {campaigns.length > 0 && (
                      <>
                        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                          Campaigns
                        </DropdownMenuLabel>
                        {campaigns.map((item) => (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() => {
                              setSelectedId(item.id);
                              setDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                              <Megaphone className="w-4 h-4 text-blue-500" />
                            </div>
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
                    {campaigns.length > 0 && boosts.length > 0 && (
                      <DropdownMenuSeparator className="my-1" />
                    )}
                    {boosts.length > 0 && (
                      <>
                        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                          Boosts
                        </DropdownMenuLabel>
                        {boosts.map((item) => (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() => {
                              setSelectedId(item.id);
                              setDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                              <Zap className="w-4 h-4 text-orange-500" />
                            </div>
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
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground font-inter tracking-[-0.5px]">Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-inter">$</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 h-14 bg-transparent border-border text-2xl font-semibold font-inter tracking-[-0.5px] placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#3672ea] rounded-xl transition-colors"
              />
            </div>
            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(value)}
                  className={cn(
                    "flex-1 h-9 text-sm font-medium rounded-lg border-border hover:bg-muted/50 transition-colors",
                    parseFloat(amount) === value && "bg-muted border-foreground/20"
                  )}
                >
                  ${value}
                </Button>
              ))}
            </div>
          </div>

          {/* Validation Warning */}
          {parsedAmount > walletBalance && (
            <div className="flex items-center gap-2.5 text-destructive text-sm bg-destructive/10 rounded-xl p-3.5 font-inter tracking-[-0.3px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Amount exceeds your brand wallet balance</span>
            </div>
          )}

          {/* Summary */}
          {selectedItem && parsedAmount > 0 && parsedAmount <= walletBalance && (
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm font-inter tracking-[-0.3px]">
                <span className="text-muted-foreground">Funding</span>
                <span className="text-foreground font-medium">{selectedItem.title}</span>
              </div>
              <div className="flex justify-between text-sm font-inter tracking-[-0.3px]">
                <span className="text-muted-foreground">Current budget</span>
                <span className="text-muted-foreground">
                  {formatCurrency(selectedItem.budget)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-sm font-inter tracking-[-0.3px]">
                <span className="text-muted-foreground">New budget</span>
                <span className="text-emerald-500 font-medium">
                  {formatCurrency(selectedItem.budget + parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-inter tracking-[-0.3px]">
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
            className="h-10 px-5 text-sm font-medium font-inter tracking-[-0.3px] hover:bg-muted/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAllocate}
            disabled={loading || !selectedId || parsedAmount <= 0 || parsedAmount > walletBalance || loadingBalance}
            className="h-10 px-6 text-sm font-medium font-inter tracking-[-0.5px] bg-[#1f60dd] text-white hover:bg-[#1a52c2] border-t border-[#3672ea] rounded-xl disabled:opacity-30"
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
