import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const parsedAmount = parseFloat(amount) || 0;
  const selectedItem = getSelectedItem();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] bg-card border-0 p-0 overflow-hidden rounded-2xl">
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
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">Brand Wallet Balance</span>
            {loadingBalance ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-lg font-semibold text-foreground tracking-tight font-inter">{formatCurrency(walletBalance)}</span>
            )}
          </div>

          {/* Combined Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground font-inter tracking-[-0.5px]">Select Campaign or Boost</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-10 bg-transparent border-border text-sm font-inter tracking-[-0.3px] focus:ring-0 focus:ring-offset-0 focus:border-[#3672ea] rounded-lg transition-colors">
                <SelectValue placeholder="Choose a campaign or boost" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {fetchingData ? (
                  <div className="p-4 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No active campaigns or boosts
                  </div>
                ) : (
                  <>
                    {items.filter(i => i.type === 'campaign').length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Campaigns
                        </div>
                        {items.filter(i => i.type === 'campaign').map((item) => (
                          <SelectItem key={item.id} value={item.id} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                            <div className="flex justify-between items-center w-full gap-4">
                              <span>{item.title}</span>
                              <span className="text-muted-foreground text-sm">
                                {formatCurrency(item.budget)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {items.filter(i => i.type === 'boost').length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">
                          Boosts
                        </div>
                        {items.filter(i => i.type === 'boost').map((item) => (
                          <SelectItem key={item.id} value={item.id} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                            <div className="flex justify-between items-center w-full gap-4">
                              <span>{item.title}</span>
                              <span className="text-muted-foreground text-sm">
                                {formatCurrency(item.budget)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground font-inter tracking-[-0.5px]">Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-inter">$</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 h-10 bg-transparent border-border text-sm font-inter tracking-[-0.3px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#3672ea] rounded-lg transition-colors"
              />
            </div>
          </div>

          {/* Validation Warning */}
          {parsedAmount > walletBalance && (
            <div className="flex items-center gap-2.5 text-destructive text-sm bg-destructive/10 rounded-lg p-3.5 font-inter tracking-[-0.3px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Amount exceeds your brand wallet balance</span>
            </div>
          )}

          {/* Summary */}
          {selectedItem && parsedAmount > 0 && parsedAmount <= walletBalance && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm font-inter tracking-[-0.3px]">
                <span className="text-muted-foreground">Funding</span>
                <span className="text-foreground">{selectedItem.title}</span>
              </div>
              <div className="flex justify-between text-sm font-inter tracking-[-0.3px]">
                <span className="text-muted-foreground">Current budget</span>
                <span className="text-muted-foreground">
                  {formatCurrency(selectedItem.budget)}
                </span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between text-sm font-inter tracking-[-0.3px]">
                <span className="text-muted-foreground">New budget</span>
                <span className="text-emerald-500 font-medium">
                  {formatCurrency(selectedItem.budget + parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-inter tracking-[-0.3px]">
                <span className="text-muted-foreground">Remaining wallet balance</span>
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
            className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.3px] hover:bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAllocate}
            disabled={loading || !selectedId || parsedAmount <= 0 || parsedAmount > walletBalance || loadingBalance}
            className="h-9 px-4 text-sm font-medium font-inter tracking-[-0.5px] bg-[#1f60dd] text-white hover:bg-[#1a52c2] border-t border-[#3672ea] rounded-lg disabled:opacity-30"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Funding...
              </span>
            ) : 'Fund'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
