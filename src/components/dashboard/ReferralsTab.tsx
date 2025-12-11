import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, DollarSign, TrendingUp, Copy, Check, Gift, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function ReferralsTab() {
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
    fetchReferrals();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data);
    if (data?.referral_code) {
      setNewReferralCode(data.referral_code);
    }
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

  const handleSaveReferralCode = async () => {
    if (!newReferralCode.trim()) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid referral code.",
        variant: "destructive"
      });
      return;
    }

    const sanitizedCode = newReferralCode.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    
    if (sanitizedCode.length < 3) {
      toast({
        title: "Code too short",
        description: "Referral code must be at least 3 characters.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if code is already taken
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", sanitizedCode)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      toast({
        title: "Code taken",
        description: "This referral code is already in use. Please choose another.",
        variant: "destructive"
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ referral_code: sanitizedCode })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update referral code.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Updated!",
        description: "Your referral code has been updated."
      });
      setProfile({ ...profile, referral_code: sanitizedCode });
      setIsEditing(false);
    }
    setSaving(false);
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
          <p className="text-2xl font-semibold tracking-tight">{profile?.total_referrals || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
        </div>

        <div className="p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
          <p className="text-2xl font-semibold tracking-tight">{profile?.successful_referrals || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Successful</p>
        </div>

        <div className="p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
          <p className="text-2xl font-semibold tracking-tight">${profile?.referral_earnings?.toFixed(2) || "0.00"}</p>
          <p className="text-xs text-muted-foreground mt-1">Earnings</p>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="p-5 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2060df]/10 flex items-center justify-center">
              <Gift className="w-5 h-5 text-[#2060df]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Your Referral Link</h3>
              <p className="text-xs text-muted-foreground">Share this link to earn rewards</p>
            </div>
          </div>
          {!isEditing && (
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="ghost" 
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Tag
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground shrink-0">{window.location.origin}/?ref=</span>
              <Input 
                value={newReferralCode} 
                onChange={(e) => setNewReferralCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                placeholder="your-code"
                className="font-mono text-sm bg-background/50 border-0" 
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveReferralCode} 
                size="sm"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button 
                onClick={() => {
                  setIsEditing(false);
                  setNewReferralCode(profile?.referral_code || "");
                }} 
                variant="ghost" 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="font-mono text-sm bg-background/50 border-0" 
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
        )}
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