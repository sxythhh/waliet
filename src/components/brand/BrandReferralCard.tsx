import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface BrandReferral {
  id: string;
  brand_id: string;
  status: string;
  reward_earned: number;
  created_at: string;
  brand?: {
    name: string;
    logo_url: string | null;
    subscription_plan: string | null;
  };
}

export function BrandReferralCard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [brandReferrals, setBrandReferrals] = useState<BrandReferral[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch profile with brand referral code
      const { data: profileData } = await supabase
        .from("profiles")
        .select("brand_referral_code")
        .eq("id", user?.id)
        .single();

      setProfile(profileData);

      // Fetch brand referrals
      const { data: referralsData } = await supabase
        .from("brand_referrals")
        .select(`
          id,
          brand_id,
          status,
          reward_earned,
          created_at
        `)
        .eq("referrer_id", user?.id)
        .order("created_at", { ascending: false });

      if (referralsData && referralsData.length > 0) {
        // Fetch brand details
        const brandIds = referralsData.map((r) => r.brand_id);
        const { data: brandsData } = await supabase
          .from("brands")
          .select("id, name, logo_url, subscription_plan")
          .in("id", brandIds);

        const referralsWithBrands = referralsData.map((referral) => ({
          ...referral,
          brand: brandsData?.find((b) => b.id === referral.brand_id),
        }));

        setBrandReferrals(referralsWithBrands);
      }
    } catch (error) {
      console.error("Error fetching brand referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  const brandReferralLink = profile?.brand_referral_code
    ? `${window.location.origin}/new?ref=${profile.brand_referral_code}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(brandReferralLink);
    setCopied(true);
    toast.success("Brand referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEarned = brandReferrals.reduce(
    (sum, r) => sum + (r.reward_earned || 0),
    0
  );
  const completedReferrals = brandReferrals.filter(
    (r) => r.status === "completed"
  ).length;

  return (
    <Card className="bg-card border-0">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Brand Referrals</h3>
              <p className="text-xs text-muted-foreground">
                Earn 10% of first subscription
              </p>
            </div>
          </div>
          <Link
            to="/affiliate"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            How it works
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold">{brandReferrals.length}</p>
            <p className="text-[10px] text-muted-foreground">Referred</p>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold">{completedReferrals}</p>
            <p className="text-[10px] text-muted-foreground">Subscribed</p>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold">${totalEarned.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Earned</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="flex gap-2">
          <Input
            value={brandReferralLink || "No referral code yet"}
            readOnly
            className="text-sm bg-muted/30 border-0 h-10"
          />
          <Button
            onClick={copyLink}
            variant="ghost"
            className="gap-2 shrink-0 h-10 bg-foreground text-background"
            disabled={!brandReferralLink}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {/* Recent Brand Referrals */}
        {brandReferrals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-3">Recent Referrals</p>
            <div className="space-y-2">
              {brandReferrals.slice(0, 3).map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    {referral.brand?.logo_url ? (
                      <img
                        src={referral.brand.logo_url}
                        alt={referral.brand.name}
                        className="w-6 h-6 rounded object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-medium">
                        {referral.brand?.name?.[0] || "B"}
                      </div>
                    )}
                    <span className="text-sm font-medium">
                      {referral.brand?.name || "Unknown Brand"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        referral.status === "completed"
                          ? "bg-green-500/10 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {referral.status === "completed" ? "Subscribed" : "Pending"}
                    </span>
                    {referral.reward_earned > 0 && (
                      <span className="text-xs font-medium text-primary">
                        +${referral.reward_earned.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
