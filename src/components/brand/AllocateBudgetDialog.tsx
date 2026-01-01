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

  const insufficientBalance = parsedAmount > walletBalance && parsedAmount > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] bg-gradient-to-b from-card to-card/95 border border-border/50 p-0 overflow-hidden rounded-3xl shadow-2xl">
        {/* Decorative top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#1f60dd] via-[#3672ea] to-[#1f60dd]" />
        
        {/* Header */}
        <div className="px-7 pt-6 pb-2">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Fund Campaign
            </DialogTitle>
            <p className="text-sm text-muted-foreground/80">
              Transfer funds from your brand wallet to a campaign or boost
            </p>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-7 py-5 space-y-6">
          {/* Campaign/Boost Selector */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Destination
            </Label>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-14 justify-between px-4 bg-muted/20 border-border/50 hover:bg-muted/40 hover:border-border text-left font-normal rounded-2xl transition-all duration-200",
                    !selectedItem && "text-muted-foreground",
                    selectedItem && "border-[#3672ea]/30 bg-[#3672ea]/5"
                  )}
                >
                  {fetchingData ? (
                    <span className="flex items-center gap-2.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </span>
                  ) : selectedItem ? (
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center",
                        selectedItem.type === 'campaign' ? "bg-[#3672ea]/10" : "bg-amber-500/10"
                      )}>
                        {selectedItem.type === 'campaign' ? (
                          <Megaphone className="w-4 h-4 text-[#3672ea]" />
                        ) : (
                          <Zap className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{selectedItem.title}</span>
                        <span className="text-xs text-muted-foreground">
                          Current: {formatCurrency(selectedItem.budget)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm">Choose a campaign or boost</span>
                  )}
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    dropdownOpen && "rotate-180"
                  )} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-[424px] bg-popover/95 backdrop-blur-xl border-border/50 p-2 max-h-[320px] overflow-y-auto rounded-2xl"
              >
                {items.length === 0 && !fetchingData ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    No active campaigns or boosts
                  </div>
                ) : (
                  <>
                    {campaigns.length > 0 && (
                      <>
                        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 px-2 py-1.5">
                          Campaigns
                        </DropdownMenuLabel>
                        {campaigns.map((item) => (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() => {
                              setSelectedId(item.id);
                              setDropdownOpen(false);
                            }}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                              selectedId === item.id && "bg-[#3672ea]/10"
                            )}
                          >
                            <div className="w-8 h-8 rounded-xl bg-[#3672ea]/10 flex items-center justify-center">
                              <Megaphone className="w-4 h-4 text-[#3672ea]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground">Budget: {formatCurrency(item.budget)}</p>
                            </div>
                            {selectedId === item.id && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                    {campaigns.length > 0 && boosts.length > 0 && (
                      <DropdownMenuSeparator className="my-2" />
                    )}
                    {boosts.length > 0 && (
                      <>
                        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 px-2 py-1.5">
                          Boosts
                        </DropdownMenuLabel>
                        {boosts.map((item) => (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() => {
                              setSelectedId(item.id);
                              setDropdownOpen(false);
                            }}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                              selectedId === item.id && "bg-amber-500/10"
                            )}
                          >
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                              <Zap className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground">Budget: {formatCurrency(item.budget)}</p>
                            </div>
                            {selectedId === item.id && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
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
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Amount
            </Label>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#3672ea]/20 to-[#1f60dd]/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center">
                <span className="absolute left-5 text-2xl font-semibold text-muted-foreground/50">$</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-12 pr-5 h-16 bg-muted/20 border-border/50 text-3xl font-bold tracking-tight placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#3672ea] focus-visible:bg-muted/30 rounded-2xl transition-all duration-200"
                />
              </div>
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
                    "flex-1 h-10 text-sm font-medium rounded-xl bg-muted/30 border border-transparent hover:bg-muted/50 transition-all duration-200",
                    parseFloat(amount) === value && "bg-[#3672ea]/10 border-[#3672ea]/30 text-[#3672ea] hover:bg-[#3672ea]/15"
                  )}
                >
                  ${value}
                </Button>
              ))}
            </div>
          </div>

          {/* Insufficient Balance Warning - Only shows when amount exceeds balance */}
          {insufficientBalance && (
            <div className="flex items-center gap-3 text-sm bg-destructive/10 border border-destructive/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="w-8 h-8 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-destructive">Insufficient balance</p>
                <p className="text-xs text-destructive/70">
                  Available: {loadingBalance ? "..." : formatCurrency(walletBalance)}
                </p>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedItem && parsedAmount > 0 && !insufficientBalance && (
            <div className="bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Funding</span>
                <span className="text-foreground font-medium">{selectedItem.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current budget</span>
                <span className="text-muted-foreground">{formatCurrency(selectedItem.budget)}</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New budget</span>
                <span className="text-emerald-500 font-semibold">{formatCurrency(selectedItem.budget + parsedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining balance</span>
                <span className="text-muted-foreground">{formatCurrency(walletBalance - parsedAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 pb-7 flex items-center justify-end gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => handleClose(false)} 
            className="h-11 px-6 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAllocate}
            disabled={loading || !selectedId || parsedAmount <= 0 || insufficientBalance || loadingBalance}
            className="h-11 px-8 text-sm font-semibold bg-gradient-to-r from-[#1f60dd] to-[#3672ea] text-white hover:from-[#1a52c2] hover:to-[#2d62d4] shadow-lg shadow-[#1f60dd]/25 rounded-xl disabled:opacity-40 disabled:shadow-none transition-all duration-200"
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
