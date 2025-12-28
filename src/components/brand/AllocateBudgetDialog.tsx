import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
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
  }, [open, brandId, user]);

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
    if (!user) return;
    setLoadingBalance(true);
    try {
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      setWalletBalance(walletData?.balance || 0);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchData = async () => {
    setFetchingData(true);
    try {
      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title, budget')
        .eq('brand_id', brandId)
        .eq('status', 'active');

      // Fetch boosts
      const { data: boostsData } = await supabase
        .from('bounty_campaigns')
        .select('id, title, budget')
        .eq('brand_id', brandId)
        .eq('status', 'active');

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
      toast.error('Insufficient wallet balance');
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
      <DialogContent className="bg-background text-foreground max-w-md p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-6 pb-0 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium tracking-tight">
              Fund Campaign
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">
              Transfer funds from your Virality wallet
            </p>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Wallet Balance */}
          <div className="bg-muted/50 rounded-xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your Wallet Balance</p>
            {loadingBalance ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <p className="text-3xl font-semibold text-foreground tracking-tight">{formatCurrency(walletBalance)}</p>
            )}
          </div>

          {/* Combined Dropdown */}
          <div>
            <Label className="text-muted-foreground text-sm mb-2 block">Select Campaign or Boost</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="bg-muted/50 border-border text-foreground h-12 rounded-lg">
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
          <div>
            <Label className="text-muted-foreground text-sm mb-2 block">Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 bg-muted/50 border-border text-foreground text-xl h-14 rounded-lg font-medium"
              />
            </div>
          </div>

          {/* Validation Warning */}
          {parsedAmount > walletBalance && (
            <div className="flex items-center gap-2.5 text-destructive text-sm bg-destructive/10 rounded-lg p-3.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Amount exceeds your wallet balance</span>
            </div>
          )}

          {/* Summary */}
          {selectedItem && parsedAmount > 0 && parsedAmount <= walletBalance && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Funding</span>
                <span className="text-foreground">{selectedItem.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current budget</span>
                <span className="text-muted-foreground">
                  {formatCurrency(selectedItem.budget)}
                </span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New budget</span>
                <span className="text-emerald-500 font-medium">
                  {formatCurrency(selectedItem.budget + parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining wallet balance</span>
                <span className="text-muted-foreground">
                  {formatCurrency(walletBalance - parsedAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => handleClose(false)}
              className="flex-1 text-muted-foreground hover:text-foreground hover:bg-muted h-12 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAllocate}
              disabled={loading || !selectedId || parsedAmount <= 0 || parsedAmount > walletBalance || loadingBalance}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-lg font-medium disabled:opacity-30"
            >
              {loading ? 'Funding...' : 'Fund'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
