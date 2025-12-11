import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, DollarSign, TrendingUp, Copy, Check, Gift, Share2, Twitter, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function ReferralsTab() {
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
    fetchReferrals();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data);
  };

  const fetchReferrals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("referrals")
      .select(`
        *,
        profiles:referred_id (
          username,
          avatar_url,
          full_name,
          total_earnings
        )
      `)
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });
    setReferrals(data || []);
  };

  const referralLink = profile?.referral_code 
    ? `${window.location.origin}/?ref=${profile.referral_code}` 
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Your referral link has been copied to clipboard."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent("Join me on Virality and start earning from your content! 🚀");
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToDiscord = () => {
    navigator.clipboard.writeText(`Join me on Virality and start earning from your content! 🚀\n${referralLink}`);
    toast({
      title: "Ready to share!",
      description: "Message copied. Paste it in Discord!"
    });
  };

  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const completedReferrals = referrals.filter(r => r.status === 'completed').length;

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-2 sm:pt-3 md:pt-4 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
        <p className="text-muted-foreground text-sm">
          Invite creators and earn rewards when they start earning on Virality.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#e0e0e0] dark:bg-[#1a1a1a] flex items-center justify-center">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{profile?.total_referrals || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
        </div>

        <div className="p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#e0e0e0] dark:bg-[#1a1a1a] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{profile?.successful_referrals || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Successful</p>
        </div>

        <div className="p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#e0e0e0] dark:bg-[#1a1a1a] flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight">${profile?.referral_earnings?.toFixed(2) || "0.00"}</p>
          <p className="text-xs text-muted-foreground mt-1">Earnings</p>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="p-5 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2060df]/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#2060df]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Your Referral Link</h3>
            <p className="text-xs text-muted-foreground">Share this link to earn rewards</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input 
            value={referralLink} 
            readOnly 
            className="font-mono text-sm bg-background/50 border-border/50" 
          />
          <Button 
            onClick={copyReferralLink} 
            variant="outline" 
            className="gap-2 shrink-0"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={shareToTwitter} 
            variant="ghost" 
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Twitter className="w-4 h-4" />
            Share on X
          </Button>
          <Button 
            onClick={shareToDiscord} 
            variant="ghost" 
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="w-4 h-4" />
            Share on Discord
          </Button>
        </div>
      </div>

      {/* How it Works */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
            <div className="w-6 h-6 rounded-full bg-[#2060df] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              1
            </div>
            <div>
              <p className="text-sm font-medium">Share your link</p>
              <p className="text-xs text-muted-foreground mt-0.5">Send it to creators you know</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
            <div className="w-6 h-6 rounded-full bg-[#2060df] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              2
            </div>
            <div>
              <p className="text-sm font-medium">They sign up</p>
              <p className="text-xs text-muted-foreground mt-0.5">And join campaigns</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
            <div className="w-6 h-6 rounded-full bg-[#2060df] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              3
            </div>
            <div>
              <p className="text-sm font-medium">You earn rewards</p>
              <p className="text-xs text-muted-foreground mt-0.5">When they start earning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Your Referrals</h3>
          <span className="text-xs text-muted-foreground">{referrals.length} total</span>
        </div>

        {referrals.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
            <div className="w-12 h-12 rounded-full bg-[#e0e0e0] dark:bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No referrals yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Start sharing your referral link to invite creators and earn rewards
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map(referral => (
              <div 
                key={referral.id} 
                className="flex items-center justify-between p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={referral.profiles?.avatar_url} />
                    <AvatarFallback className="bg-[#e0e0e0] dark:bg-[#1a1a1a] text-sm">
                      {referral.profiles?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {referral.profiles?.full_name || referral.profiles?.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{referral.profiles?.username}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  {referral.status === 'completed' && (
                    <span className="text-sm text-muted-foreground">
                      ${referral.profiles?.total_earnings?.toFixed(2) || "0.00"} earned
                    </span>
                  )}
                  <Badge 
                    variant={referral.status === 'completed' ? 'default' : 'secondary'}
                    className={referral.status === 'completed' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0' 
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0'
                    }
                  >
                    {referral.status === 'completed' ? 'Active' : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
