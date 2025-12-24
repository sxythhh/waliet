import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Gift, TrendingUp, Plus, X, DollarSign, Eye, Users, Video, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ViewBonusTier {
  id: string;
  view_threshold: number;
  bonus_amount: number;
  is_active: boolean;
}

interface BonusPayout {
  id: string;
  amount_paid: number;
  views_at_payout: number;
  paid_at: string;
  creator_id: string;
  bonus: {
    view_threshold: number;
  };
  video_submission: {
    video_url: string;
  };
  creator?: {
    username: string;
    avatar_url: string | null;
  };
}

interface ViewBonusesTabProps {
  boostId: string;
  brandId: string;
}

export function ViewBonusesTab({ boostId, brandId }: ViewBonusesTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [tiers, setTiers] = useState<ViewBonusTier[]>([]);
  const [payouts, setPayouts] = useState<BonusPayout[]>([]);
  const [stats, setStats] = useState({ totalPaid: 0, uniqueCreators: 0, videosPaid: 0 });
  const [newThreshold, setNewThreshold] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [boostId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch boost settings
      const { data: boost } = await supabase
        .from('bounty_campaigns')
        .select('view_bonuses_enabled')
        .eq('id', boostId)
        .single();
      
      setEnabled(boost?.view_bonuses_enabled || false);

      // Fetch tiers
      const { data: tiersData } = await supabase
        .from('boost_view_bonuses')
        .select('*')
        .eq('bounty_campaign_id', boostId)
        .order('view_threshold', { ascending: true });
      
      setTiers(tiersData || []);

      // Fetch bonus IDs for this boost first
      const bonusIds = tiersData?.map(t => t.id) || [];
      
      // Fetch payouts with creator info
      const { data: payoutsData } = await supabase
        .from('view_bonus_payouts')
        .select(`
          id,
          amount_paid,
          views_at_payout,
          paid_at,
          creator_id,
          bonus_id,
          video_submission_id
        `)
        .in('bonus_id', bonusIds.length > 0 ? bonusIds : [''])
        .order('paid_at', { ascending: false })
        .limit(50);

      if (payoutsData && payoutsData.length > 0) {
        // Fetch creator profiles
        const creatorIds = [...new Set(payoutsData.map(p => p.creator_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', creatorIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const tierMap = new Map(tiersData?.map(t => [t.id, t]) || []);
        
        const enrichedPayouts = payoutsData.map(p => ({
          ...p,
          creator: profileMap.get(p.creator_id),
          bonus: tierMap.get(p.bonus_id)
        }));
        
        setPayouts(enrichedPayouts as any);

        // Calculate stats
        const totalPaid = payoutsData.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const uniqueCreators = new Set(payoutsData.map(p => p.creator_id)).size;
        const videosPaid = new Set(payoutsData.map(p => p.video_submission_id)).size;
        
        setStats({ totalPaid, uniqueCreators, videosPaid });
      }
    } catch (error) {
      console.error('Error fetching view bonuses data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (value: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bounty_campaigns')
        .update({ view_bonuses_enabled: value })
        .eq('id', boostId);
      
      if (error) throw error;
      setEnabled(value);
      toast.success(value ? 'View bonuses enabled' : 'View bonuses disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const addTier = async () => {
    const threshold = parseInt(newThreshold);
    const amount = parseFloat(newAmount);
    
    if (isNaN(threshold) || threshold <= 0) {
      toast.error('Please enter a valid view threshold');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bonus amount');
      return;
    }
    
    if (tiers.some(t => t.view_threshold === threshold)) {
      toast.error('A tier with this view threshold already exists');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('boost_view_bonuses')
        .insert({
          bounty_campaign_id: boostId,
          view_threshold: threshold,
          bonus_amount: amount
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setTiers([...tiers, data].sort((a, b) => a.view_threshold - b.view_threshold));
      setNewThreshold("");
      setNewAmount("");
      toast.success('Bonus tier added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add tier');
    } finally {
      setSaving(false);
    }
  };

  const removeTier = async (tierId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('boost_view_bonuses')
        .delete()
        .eq('id', tierId);
      
      if (error) throw error;
      
      setTiers(tiers.filter(t => t.id !== tierId));
      toast.success('Tier removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove tier');
    } finally {
      setSaving(false);
    }
  };

  const processViewBonuses = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-view-bonuses', {
        body: { bounty_campaign_id: boostId }
      });
      
      if (error) throw error;
      
      if (data.bonuses_paid > 0) {
        toast.success(`Processed ${data.bonuses_paid} bonuses totaling $${data.total_amount}`);
        fetchData();
      } else {
        toast.info('No new bonuses to process');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process bonuses');
    } finally {
      setProcessing(false);
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">View Bonuses</h2>
          <p className="text-sm text-muted-foreground">
            Reward creators when their videos hit view milestones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={processViewBonuses}
            disabled={processing || !enabled}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
            Process Now
          </Button>
          <Switch
            checked={enabled}
            onCheckedChange={toggleEnabled}
            disabled={saving}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/30 border-0">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-geist tracking-[-0.5px]">
                ${stats.totalPaid.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Bonuses Paid</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-0">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-geist tracking-[-0.5px]">
                {stats.uniqueCreators}
              </p>
              <p className="text-xs text-muted-foreground">Creators Earned</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-0">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Video className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-geist tracking-[-0.5px]">
                {stats.videosPaid}
              </p>
              <p className="text-xs text-muted-foreground">Videos with Bonuses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bonus Tiers Configuration */}
      <Card className="border-0 bg-muted/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-inter tracking-[-0.5px] flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Bonus Tiers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Tiers */}
          {tiers.length > 0 ? (
            <div className="space-y-2">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium font-inter tracking-[-0.5px]">
                      {formatViews(tier.view_threshold)} views
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-sm font-semibold text-green-500 font-inter tracking-[-0.5px]">
                      +${tier.bonus_amount.toFixed(0)} bonus
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTier(tier.id)}
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bonus tiers configured yet
            </p>
          )}

          {/* Add New Tier */}
          <div className="flex items-end gap-2 pt-2 border-t border-border/50">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">View Threshold</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g., 10000"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
                className="h-10 bg-background border-0"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Bonus Amount ($)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g., 25"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="h-10 bg-background border-0"
              />
            </div>
            <Button
              onClick={addTier}
              disabled={saving || !newThreshold || !newAmount}
              className="h-10"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Bonuses are cumulative — creators earn all tiers their videos cross.
          </p>
        </CardContent>
      </Card>

      {/* Recent Payouts */}
      {payouts.length > 0 && (
        <Card className="border-0 bg-muted/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-inter tracking-[-0.5px]">
              Recent Bonus Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Creator</TableHead>
                  <TableHead className="text-xs">Milestone</TableHead>
                  <TableHead className="text-xs">Views</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id} className="border-border/50">
                    <TableCell className="font-medium">
                      {payout.creator?.username || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {formatViews(payout.bonus?.view_threshold || 0)} views
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatViews(payout.views_at_payout)}
                    </TableCell>
                    <TableCell className="font-semibold text-green-500">
                      +${payout.amount_paid.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {format(new Date(payout.paid_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
