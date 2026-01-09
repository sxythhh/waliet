import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  Building2,
  DollarSign,
  Gift,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

export default function AffiliateHowItWorks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [copiedCreator, setCopiedCreator] = useState(false);
  const [copiedBrand, setCopiedBrand] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, brand_referral_code")
        .eq("id", user?.id)
        .single();

      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const creatorReferralLink = profile?.referral_code
    ? `${window.location.origin}/?ref=${profile.referral_code}`
    : "";

  const brandReferralLink = profile?.brand_referral_code
    ? `${window.location.origin}/new?ref=${profile.brand_referral_code}`
    : "";

  const copyLink = (link: string, type: "creator" | "brand") => {
    navigator.clipboard.writeText(link);
    if (type === "creator") {
      setCopiedCreator(true);
      setTimeout(() => setCopiedCreator(false), 2000);
    } else {
      setCopiedBrand(true);
      setTimeout(() => setCopiedBrand(false), 2000);
    }
    toast.success("Link copied to clipboard!");
  };

  const steps = [
    {
      icon: Users,
      title: "Share Your Link",
      description: "Share your unique referral link with creators or brands who might benefit from Virality.",
    },
    {
      icon: Sparkles,
      title: "They Sign Up",
      description: "When someone signs up using your link, they're tracked as your referral.",
    },
    {
      icon: TrendingUp,
      title: "They Succeed",
      description: "As your referrals complete campaigns and earn, you hit milestones.",
    },
    {
      icon: DollarSign,
      title: "You Earn",
      description: "Earn rewards for each milestone your referrals achieve.",
    },
  ];

  const rewards = [
    {
      milestone: "Sign Up",
      reward: "$5",
      description: "When your referral creates an account",
    },
    {
      milestone: "$100 Earned",
      reward: "$10",
      description: "When they earn their first $100",
    },
    {
      milestone: "$500 Earned",
      reward: "$25",
      description: "When they reach $500 in earnings",
    },
    {
      milestone: "$1,000 Earned",
      reward: "$50",
      description: "When they hit $1,000 in earnings",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b">
        <div className="container max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Gift className="h-4 w-4" />
            Affiliate Program
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Earn by Sharing Virality
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Invite creators and brands to join Virality and earn rewards when they succeed.
          </p>
          {!user && (
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="container max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Step {index + 1}
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rewards Section */}
      <div className="bg-muted/30 border-y">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">Creator Referral Rewards</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Earn up to $90 for each creator you refer as they hit earnings milestones.
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            {rewards.map((reward, index) => (
              <Card key={index} className="bg-card">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {reward.reward}
                  </div>
                  <div className="font-medium mb-1">{reward.milestone}</div>
                  <p className="text-xs text-muted-foreground">
                    {reward.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Brand Referrals */}
      <div className="container max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-sm font-medium mb-4">
              <Building2 className="h-4 w-4" />
              Brand Referrals
            </div>
            <h2 className="text-2xl font-bold mb-4">Refer Brands, Earn More</h2>
            <p className="text-muted-foreground mb-6">
              Know a brand that could benefit from Virality's creator network? Refer them
              and earn a percentage of their first subscription payment.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm">10% of first subscription payment</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm">Paid out after brand's first month</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm">No limit on referrals</span>
              </div>
            </div>
          </div>
          <Card className="bg-muted/30 border-0">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-primary mb-2">10%</div>
                <p className="text-muted-foreground">
                  of first subscription payment
                </p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between p-3 bg-background rounded-lg">
                  <span>Starter Plan ($99/mo)</span>
                  <span className="font-medium text-foreground">$9.90</span>
                </div>
                <div className="flex justify-between p-3 bg-background rounded-lg">
                  <span>Growth Plan ($249/mo)</span>
                  <span className="font-medium text-foreground">$24.90</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Your Links Section */}
      {user && (
        <div className="bg-muted/30 border-t">
          <div className="container max-w-5xl mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold text-center mb-12">Your Referral Links</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Creator Referral */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Creator Referral</h3>
                      <p className="text-xs text-muted-foreground">Invite creators to join</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={creatorReferralLink || "No referral code yet"}
                      readOnly
                      className="text-sm bg-muted/50 border-0"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyLink(creatorReferralLink, "creator")}
                      disabled={!creatorReferralLink}
                    >
                      {copiedCreator ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Brand Referral */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Brand Referral</h3>
                      <p className="text-xs text-muted-foreground">Invite brands to join</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={brandReferralLink || "No referral code yet"}
                      readOnly
                      className="text-sm bg-muted/50 border-0"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyLink(brandReferralLink, "brand")}
                      disabled={!brandReferralLink}
                    >
                      {copiedBrand ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Button variant="outline" onClick={() => navigate("/dashboard?tab=referrals")}>
                View Your Referrals
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="container max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">How do I get paid?</h3>
            <p className="text-sm text-muted-foreground">
              Referral rewards are added to your Virality wallet balance. You can withdraw
              your earnings once you reach the minimum payout threshold.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Is there a limit to how many people I can refer?</h3>
            <p className="text-sm text-muted-foreground">
              No! You can refer as many creators and brands as you want. The more successful
              referrals, the more you earn.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">How long does the referral tracking last?</h3>
            <p className="text-sm text-muted-foreground">
              Referral tracking is permanent. Once someone signs up with your link, they're
              always tracked as your referral, and you'll earn rewards as they hit milestones.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can I refer myself?</h3>
            <p className="text-sm text-muted-foreground">
              No, self-referrals are not allowed and will not be rewarded. Focus on sharing
              with friends, colleagues, and your network.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="bg-primary text-primary-foreground">
          <div className="container max-w-5xl mx-auto px-4 py-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Start Earning?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Create your free account and get your referral links to start earning today.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/auth")}
            >
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
