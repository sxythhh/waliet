import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/PhoneInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Building2, ArrowRight, Check } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import xLogo from "@/assets/x-logo.png";
import paypalLogo from "@/assets/paypal-logo-grey.svg";
import usdcLogo from "@/assets/usdc-logo.png";
import ethereumLogo from "@/assets/ethereum-logo.png";
import optimismLogo from "@/assets/optimism-logo.png";
import solanaLogo from "@/assets/solana-logo.png";
import polygonLogo from "@/assets/polygon-logo.png";
import { useNavigate } from "react-router-dom";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

type Platform = "tiktok" | "instagram" | "youtube" | "twitter";

const cryptoNetworks = [
  { id: "ethereum", name: "Ethereum", logo: ethereumLogo },
  { id: "optimism", name: "Optimism", logo: optimismLogo },
  { id: "solana", name: "Solana", logo: solanaLogo },
  { id: "polygon", name: "Polygon", logo: polygonLogo }
];

export function OnboardingDialog({ open, onOpenChange, userId }: OnboardingDialogProps) {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<"creator" | "brand" | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Common
  const [phoneNumber, setPhoneNumber] = useState("");

  // Creator fields
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("tiktok");
  const [username, setUsername] = useState("");
  const [accountLink, setAccountLink] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"crypto" | "paypal">("paypal");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState(cryptoNetworks[0].id);
  const [walletAddress, setWalletAddress] = useState("");

  // Brand fields
  const [website, setWebsite] = useState("");
  const [mrr, setMrr] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [companyName, setCompanyName] = useState("");

  const totalSteps = accountType === "creator" ? 5 : 3;

  const handleNext = async () => {
    if (step === 1 && !accountType) {
      toast({
        variant: "destructive",
        title: "Please select an account type"
      });
      return;
    }

    if (step === 2) {
      if (!phoneNumber) {
        toast({
          variant: "destructive",
          title: "Please enter your phone number"
        });
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ 
            phone_number: phoneNumber,
            account_type: accountType 
          })
          .eq("id", userId);

        if (error) throw error;
        setStep(step + 1);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (accountType === "creator") {
      if (step === 3) {
        if (!username || !accountLink) {
          toast({
            variant: "destructive",
            title: "Please fill in all fields"
          });
          return;
        }

        setLoading(true);
        try {
          const { error } = await supabase.from("social_accounts").insert({
            user_id: userId,
            platform: selectedPlatform,
            username,
            account_link: accountLink,
            is_verified: true
          });

          if (error) throw error;
          setStep(step + 1);
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      if (step === 4) {
        const payoutDetails = payoutMethod === "paypal" 
          ? { email: paypalEmail }
          : { currency: "usdc", network: cryptoNetwork, address: walletAddress };

        if (payoutMethod === "paypal" && !paypalEmail) {
          toast({
            variant: "destructive",
            title: "Please enter your PayPal email"
          });
          return;
        }

        if (payoutMethod === "crypto" && !walletAddress) {
          toast({
            variant: "destructive",
            title: "Please enter your wallet address"
          });
          return;
        }

        setLoading(true);
        try {
          const { error } = await supabase
            .from("wallets")
            .update({
              payout_method: payoutMethod,
              payout_details: payoutDetails
            })
            .eq("user_id", userId);

          if (error) throw error;
          setStep(step + 1);
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      if (step === 5) {
        onOpenChange(false);
        navigate("/dashboard");
        toast({
          title: "Welcome to Virality!",
          description: "You're all set up. Start discovering campaigns!"
        });
        return;
      }
    } else {
      // Brand flow
      if (step === 3) {
        if (!companyName || !website || !mrr || !businessType) {
          toast({
            variant: "destructive",
            title: "Please fill in all fields"
          });
          return;
        }

        setLoading(true);
        try {
          // Create brand
          const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const { data: brand, error } = await supabase.from("brands").insert({
            name: companyName,
            slug,
            business_details: {
              website,
              mrr,
              businessType
            }
          }).select().single();

          if (error) throw error;

          // Add user as brand owner
          if (brand) {
            await supabase.from("brand_members").insert({
              brand_id: brand.id,
              user_id: userId,
              role: "owner"
            });
          }

          onOpenChange(false);
          navigate("/dashboard");
          toast({
            title: "Welcome to Virality!",
            description: "Your brand account has been created successfully."
          });
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message
          });
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    setStep(step + 1);
  };

  const getPlatformIcon = (platform: Platform) => {
    const iconClass = "h-6 w-6";
    switch (platform) {
      case "tiktok":
        return <img src={tiktokLogo} alt="TikTok" className={iconClass} />;
      case "instagram":
        return <img src={instagramLogo} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={youtubeLogo} alt="YouTube" className={iconClass} />;
      case "twitter":
        return <img src={xLogo} alt="X" className={iconClass} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] border-0 bg-[#0a0a0a]/98 backdrop-blur-xl p-0">
        <div className="p-8 space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i + 1 <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Choose account type */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Welcome to Virality</h2>
                <p className="text-muted-foreground">Choose your account type to get started</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setAccountType("creator")}
                  className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
                    accountType === "creator"
                      ? "border-primary bg-primary/10"
                      : "border-muted bg-muted/20"
                  }`}
                >
                  <User className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Creator</h3>
                  <p className="text-sm text-muted-foreground">
                    Join campaigns and earn money
                  </p>
                </button>

                <button
                  onClick={() => setAccountType("brand")}
                  className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
                    accountType === "brand"
                      ? "border-primary bg-primary/10"
                      : "border-muted bg-muted/20"
                  }`}
                >
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Brand</h3>
                  <p className="text-sm text-muted-foreground">
                    Create campaigns and find creators
                  </p>
                </button>
              </div>

              <Button
                onClick={handleNext}
                disabled={!accountType}
                className="w-full h-12"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Phone number */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Add Your Phone Number</h2>
                <p className="text-muted-foreground">We'll use this to keep you updated</p>
              </div>

              <div className="space-y-3">
                <Label>Phone Number</Label>
                <PhoneInput value={phoneNumber} onChange={setPhoneNumber} />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading || !phoneNumber}
                  className="flex-1"
                >
                  {loading ? "Saving..." : "Continue"}
                </Button>
              </div>
            </div>
          )}

          {/* Creator Step 3: Add social account */}
          {accountType === "creator" && step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Connect Your Account</h2>
                <p className="text-muted-foreground">Link your social media profile</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Platform</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["tiktok", "instagram", "youtube", "twitter"] as Platform[]).map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => setSelectedPlatform(platform)}
                        className={`p-3 rounded-lg transition-all ${
                          selectedPlatform === platform
                            ? "bg-primary"
                            : "bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        {getPlatformIcon(platform)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Username</Label>
                  <Input
                    placeholder="mrbeast"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/@/g, ""))}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Profile Link</Label>
                  <Input
                    type="url"
                    placeholder={`https://${selectedPlatform}.com/@${username || "username"}`}
                    value={accountLink}
                    onChange={(e) => setAccountLink(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading || !username || !accountLink}
                  className="flex-1"
                >
                  {loading ? "Connecting..." : "Continue"}
                </Button>
              </div>
            </div>
          )}

          {/* Creator Step 4: Payment method */}
          {accountType === "creator" && step === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Set Up Payouts</h2>
                <p className="text-muted-foreground">Choose how you'd like to receive payments</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPayoutMethod("paypal")}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        payoutMethod === "paypal"
                          ? "border-primary bg-primary/10"
                          : "border-muted"
                      }`}
                    >
                      <img src={paypalLogo} alt="PayPal" className="h-5 mx-auto mb-2" />
                      <span className="text-sm font-medium">PayPal</span>
                    </button>
                    <button
                      onClick={() => setPayoutMethod("crypto")}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        payoutMethod === "crypto"
                          ? "border-primary bg-primary/10"
                          : "border-muted"
                      }`}
                    >
                      <img src={usdcLogo} alt="Crypto" className="h-5 mx-auto mb-2" />
                      <span className="text-sm font-medium">Crypto</span>
                    </button>
                  </div>
                </div>

                {payoutMethod === "paypal" && (
                  <div className="space-y-3">
                    <Label>PayPal Email</Label>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                    />
                  </div>
                )}

                {payoutMethod === "crypto" && (
                  <>
                    <div className="space-y-3">
                      <Label>Network</Label>
                      <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                        <SelectTrigger>
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <img
                                src={cryptoNetworks.find((n) => n.id === cryptoNetwork)?.logo}
                                alt=""
                                className="h-5 w-5"
                              />
                              {cryptoNetworks.find((n) => n.id === cryptoNetwork)?.name}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {cryptoNetworks.map((network) => (
                            <SelectItem key={network.id} value={network.id}>
                              <div className="flex items-center gap-2">
                                <img src={network.logo} alt="" className="h-5 w-5" />
                                {network.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Wallet Address</Label>
                      <Input
                        placeholder="0x..."
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={
                    loading ||
                    (payoutMethod === "paypal" && !paypalEmail) ||
                    (payoutMethod === "crypto" && !walletAddress)
                  }
                  className="flex-1"
                >
                  {loading ? "Saving..." : "Continue"}
                </Button>
              </div>
            </div>
          )}

          {/* Creator Step 5: Final instructions */}
          {accountType === "creator" && step === 5 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">You're All Set!</h2>
                <p className="text-muted-foreground">Here's how to join your first campaign</p>
              </div>

              <div className="space-y-4 bg-muted/20 rounded-lg p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Browse Campaigns</h3>
                    <p className="text-sm text-muted-foreground">
                      Check out the Discover tab to find campaigns that match your content style
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Apply to Campaigns</h3>
                    <p className="text-sm text-muted-foreground">
                      Click on a campaign to view details and apply if you're interested
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Start Creating</h3>
                    <p className="text-sm text-muted-foreground">
                      Once approved, create content and earn money for your views
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleNext} className="w-full h-12">
                Go to Dashboard
              </Button>
            </div>
          )}

          {/* Brand Step 3: Brand details */}
          {accountType === "brand" && step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Tell Us About Your Brand</h2>
                <p className="text-muted-foreground">We'll use this to create your brand profile</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Company Name</Label>
                  <Input
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Website</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Monthly Recurring Revenue (MRR)</Label>
                  <Select value={mrr} onValueChange={setMrr}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-10k">$0 - $10k</SelectItem>
                      <SelectItem value="10k-50k">$10k - $50k</SelectItem>
                      <SelectItem value="50k-100k">$50k - $100k</SelectItem>
                      <SelectItem value="100k-500k">$100k - $500k</SelectItem>
                      <SelectItem value="500k+">$500k+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Business Type</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="consumer">Consumer Brand</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading || !companyName || !website || !mrr || !businessType}
                  className="flex-1"
                >
                  {loading ? "Creating..." : "Complete Setup"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
