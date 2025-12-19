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
      <DialogContent className="bg-[#0f0f0f] border-[#1f1f1f] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-[#2060df]" />
            Allocate Budget
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Available Balance */}
          <div className="bg-[#1a1a1a] rounded-lg p-4">
            <p className="text-sm text-neutral-400 mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(availableBalance)}</p>
          </div>

          {/* Type Selection */}
          <Tabs value={type} onValueChange={(v) => { setType(v as 'campaign' | 'boost'); setSelectedId(""); }}>
            <TabsList className="grid w-full grid-cols-2 bg-[#1a1a1a]">
              <TabsTrigger value="campaign" className="data-[state=active]:bg-[#2060df]">
                Campaign
              </TabsTrigger>
              <TabsTrigger value="boost" className="data-[state=active]:bg-[#2060df]">
                Boost
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaign" className="mt-4">
              <Label className="text-neutral-300 mb-2 block">Select Campaign</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Choose a campaign" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                  {campaigns.length === 0 ? (
                    <div className="p-3 text-sm text-neutral-400 text-center">
                      No active campaigns
                    </div>
                  ) : (
                    campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id} className="text-white">
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{campaign.title}</span>
                          <span className="text-neutral-400 text-sm">
                            {formatCurrency(campaign.budget)} budget
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="boost" className="mt-4">
              <Label className="text-neutral-300 mb-2 block">Select Boost</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Choose a boost" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                  {boosts.length === 0 ? (
                    <div className="p-3 text-sm text-neutral-400 text-center">
                      No active boosts
                    </div>
                  ) : (
                    boosts.map((boost) => (
                      <SelectItem key={boost.id} value={boost.id} className="text-white">
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{boost.title}</span>
                          <span className="text-neutral-400 text-sm">
                            {formatCurrency(boost.budget || 0)} budget
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
            <Label className="text-neutral-300 mb-2 block">Amount to Allocate</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 bg-[#1a1a1a] border-[#2a2a2a] text-white text-lg"
              />
            </div>
          </div>

          {/* Validation Warning */}
          {parsedAmount > availableBalance && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4" />
              <span>Amount exceeds available balance</span>
            </div>
          )}

          {/* Summary */}
          {selectedItem && parsedAmount > 0 && parsedAmount <= availableBalance && (
            <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Allocating to</span>
                <span className="text-white font-medium">{selectedItem.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Current {type} budget</span>
                <span className="text-white">
                  {formatCurrency('budget' in selectedItem ? selectedItem.budget || 0 : 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-[#2a2a2a] pt-2 mt-2">
                <span className="text-neutral-400">New {type} budget</span>
                <span className="text-green-400 font-medium">
                  {formatCurrency(('budget' in selectedItem ? selectedItem.budget || 0 : 0) + parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Remaining wallet balance</span>
                <span className="text-white">
                  {formatCurrency(availableBalance - parsedAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-[#2a2a2a] text-white hover:bg-[#1a1a1a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAllocate}
              disabled={loading || !selectedId || parsedAmount <= 0 || parsedAmount > availableBalance}
              className="flex-1 bg-[#2060df] hover:bg-[#1a50c0]"
            >
              <Wallet className="w-4 h-4 mr-2" />
              {loading ? 'Allocating...' : `Allocate ${parsedAmount > 0 ? formatCurrency(parsedAmount) : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
