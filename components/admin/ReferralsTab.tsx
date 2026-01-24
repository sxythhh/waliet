import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ReferralsTab() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    pendingReferrals: 0,
    completedReferrals: 0,
    totalEarnings: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    const { data } = await supabase
      .from("referrals")
      .select(`
        *,
        referrer:referrer_id (
          username,
          avatar_url,
          full_name,
          referral_earnings
        ),
        referred:referred_id (
          username,
          avatar_url,
          full_name,
          total_earnings
        )
      `)
      .order("created_at", { ascending: false });
    
    if (data) {
      setReferrals(data);
      
      // Calculate stats
      const pending = data.filter(r => r.status === 'pending').length;
      const completed = data.filter(r => r.status === 'completed').length;
      const totalEarnings = data.reduce((sum, r) => sum + (Number(r.reward_earned) || 0), 0);
      
      setStats({
        totalReferrals: data.length,
        pendingReferrals: pending,
        completedReferrals: completed,
        totalEarnings,
      });
    }
  };

  const markAsCompleted = async (referralId: string) => {
    const { error } = await supabase
      .from("referrals")
      .update({ 
        status: 'completed',
        reward_earned: 10, // Default reward amount
      })
      .eq("id", referralId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update referral status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Referral marked as completed",
      });
      fetchReferrals();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Referral System</h2>
        <p className="text-muted-foreground">Monitor and manage all referrals across the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle>All Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No referrals yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-6 flex-1">
                    {/* Referrer */}
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar>
                        <AvatarImage src={referral.referrer?.avatar_url} />
                        <AvatarFallback>
                          {referral.referrer?.username?.[0]?.toUpperCase() || "R"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{referral.referrer?.full_name || referral.referrer?.username}</p>
                        <p className="text-xs text-muted-foreground">Referrer</p>
                      </div>
                    </div>

                    <div className="text-muted-foreground">→</div>

                    {/* Referred */}
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar>
                        <AvatarImage src={referral.referred?.avatar_url} />
                        <AvatarFallback>
                          {referral.referred?.username?.[0]?.toUpperCase() || "R"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{referral.referred?.full_name || referral.referred?.username}</p>
                        <p className="text-xs text-muted-foreground">Referred User</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'}>
                        {referral.status}
                      </Badge>
                      {referral.status === 'completed' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reward: ${referral.reward_earned || 0}
                        </p>
                      )}
                    </div>
                    {referral.status === 'pending' && (
                      <Button 
                        size="sm" 
                        onClick={() => markAsCompleted(referral.id)}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
