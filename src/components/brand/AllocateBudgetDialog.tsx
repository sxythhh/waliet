import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowUpRight, Wallet, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AllocateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  availableBalance: number;
  onSuccess?: () => void;
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

export function AllocateBudgetDialog({
  open,
  onOpenChange,
  brandId,
  availableBalance,
  onSuccess,
}: AllocateBudgetDialogProps) {
  const [type, setType] = useState<'campaign' | 'boost'>('campaign');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, brandId]);

  const fetchData = async () => {
    setFetchingData(true);
    try {
      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title, budget')
        .eq('brand_id', brandId)
        .eq('status', 'active');

      setCampaigns(campaignsData || []);

      // Fetch boosts
      const { data: boostsData } = await supabase
        .from('bounty_campaigns')
        .select('id, title, budget')
        .eq('brand_id', brandId)
        .eq('status', 'active');

      setBoosts(boostsData || []);
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
    if (type === 'campaign') {
      return campaigns.find(c => c.id === selectedId);
    }
    return boosts.find(b => b.id === selectedId);
  };

  const handleAllocate = async () => {
    const parsedAmount = parseFloat(amount);

    if (!selectedId) {
      toast.error(`Please select a ${type}`);
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parsedAmount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('allocate-brand-budget', {
        body: {
          brand_id: brandId,
          [type === 'campaign' ? 'campaign_id' : 'boost_id']: selectedId,
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

  const parsedAmount = parseFloat(amount) || 0;
  const selectedItem = getSelectedItem();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] text-white max-w-md p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium tracking-tight">
              Allocate Budget
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Virality Balance */}
          <div className="bg-white/[0.03] rounded-xl p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Virality Balance</p>
            <p className="text-3xl font-semibold text-white tracking-tight">{formatCurrency(availableBalance)}</p>
          </div>

          {/* Type Selection */}
          <Tabs value={type} onValueChange={(v) => { setType(v as 'campaign' | 'boost'); setSelectedId(""); }}>
            <TabsList className="grid w-full grid-cols-2 bg-white/[0.03] p-1 rounded-lg h-11">
              <TabsTrigger 
                value="campaign" 
                className="rounded-md data-[state=active]:bg-white data-[state=active]:text-black text-neutral-400 transition-all"
              >
                Campaign
              </TabsTrigger>
              <TabsTrigger 
                value="boost" 
                className="rounded-md data-[state=active]:bg-white data-[state=active]:text-black text-neutral-400 transition-all"
              >
                Boost
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaign" className="mt-4">
              <Label className="text-neutral-400 text-sm mb-2 block">Select Campaign</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="bg-white/[0.03] border-0 text-white h-12 rounded-lg">
                  <SelectValue placeholder="Choose a campaign" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-0">
                  {campaigns.length === 0 ? (
                    <div className="p-4 text-sm text-neutral-500 text-center">
                      No active campaigns
                    </div>
                  ) : (
                    campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id} className="text-white focus:bg-white/[0.05] focus:text-white">
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{campaign.title}</span>
                          <span className="text-neutral-500 text-sm">
                            {formatCurrency(campaign.budget)}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="boost" className="mt-4">
              <Label className="text-neutral-400 text-sm mb-2 block">Select Boost</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="bg-white/[0.03] border-0 text-white h-12 rounded-lg">
                  <SelectValue placeholder="Choose a boost" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-0">
                  {boosts.length === 0 ? (
                    <div className="p-4 text-sm text-neutral-500 text-center">
                      No active boosts
                    </div>
                  ) : (
                    boosts.map((boost) => (
                      <SelectItem key={boost.id} value={boost.id} className="text-white focus:bg-white/[0.05] focus:text-white">
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{boost.title}</span>
                          <span className="text-neutral-500 text-sm">
                            {formatCurrency(boost.budget || 0)}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </TabsContent>
          </Tabs>

          {/* Amount Input */}
          <div>
            <Label className="text-neutral-400 text-sm mb-2 block">Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg">$</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 bg-white/[0.03] border-0 text-white text-xl h-14 rounded-lg font-medium"
              />
            </div>
          </div>

          {/* Validation Warning */}
          {parsedAmount > availableBalance && (
            <div className="flex items-center gap-2.5 text-red-400 text-sm bg-red-500/10 rounded-lg p-3.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Amount exceeds available balance</span>
            </div>
          )}

          {/* Summary */}
          {selectedItem && parsedAmount > 0 && parsedAmount <= availableBalance && (
            <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Allocating to</span>
                <span className="text-white">{selectedItem.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Current budget</span>
                <span className="text-neutral-300">
                  {formatCurrency('budget' in selectedItem ? selectedItem.budget || 0 : 0)}
                </span>
              </div>
              <div className="h-px bg-white/[0.06] my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">New budget</span>
                <span className="text-emerald-400 font-medium">
                  {formatCurrency(('budget' in selectedItem ? selectedItem.budget || 0 : 0) + parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Remaining balance</span>
                <span className="text-neutral-300">
                  {formatCurrency(availableBalance - parsedAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-neutral-400 hover:text-white hover:bg-white/[0.05] h-12 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAllocate}
              disabled={loading || !selectedId || parsedAmount <= 0 || parsedAmount > availableBalance}
              className="flex-1 bg-white text-black hover:bg-neutral-200 h-12 rounded-lg font-medium disabled:opacity-30"
            >
              {loading ? 'Allocating...' : 'Allocate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
