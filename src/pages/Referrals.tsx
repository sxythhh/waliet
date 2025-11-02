import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DollarSign, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import voteIconLight from "@/assets/vote-icon-light.svg";
import voteIconDark from "@/assets/vote-icon-dark.svg";

interface ReferredUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  total_earnings: number;
  created_at: string;
}

interface Profile {
  referral_code: string | null;
}

export default function Referrals() {
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const authResponse = await supabase.auth.getUser();
      const user = authResponse.data.user;
      if (!user) return;

      // Fetch current user's profile to get referral code
      const profileResponse = await (supabase as any)
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();

      setProfile(profileResponse.data);

      // Fetch users referred by current user
      const referralsResponse = await (supabase as any)
        .from("profiles")
        .select("id, username, full_name, avatar_url, total_earnings, created_at")
        .eq("referred_by", user.id)
        .order("created_at", { ascending: false });

      if (referralsResponse.error) throw referralsResponse.error;

      setReferredUsers(referralsResponse.data || []);
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast({
        title: "Error",
        description: "Failed to load referral data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopiedCode(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const totalReferralEarnings = referredUsers.reduce(
    (sum, user) => sum + (user.total_earnings || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Your Referrals</h1>
          <p className="text-muted-foreground">
            Track users who joined using your referral code
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referredUsers.length}</div>
              <p className="text-xs text-muted-foreground">
                Users joined via your link
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Referral Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalReferralEarnings.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total earnings from referrals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Your Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <p className="text-lg font-geist font-semibold tracking-tighter-custom">
                  {profile?.referral_code || "N/A"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyReferralCode}
                  className="h-7 px-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with others
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referred Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Referred Users</CardTitle>
          </CardHeader>
          <CardContent>
            {referredUsers.length === 0 ? (
              <div className="text-center py-12">
                <img 
                  src={theme === "dark" ? voteIconDark : voteIconLight}
                  alt=""
                  className="mx-auto h-12 w-12 mb-4"
                />
                <p className="text-muted-foreground font-medium">
                  No referrals yet
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Share your referral code to start earning
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {referredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{user.full_name || "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${user.total_earnings.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{" "}
                        {new Date(user.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
