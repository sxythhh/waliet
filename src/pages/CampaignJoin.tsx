import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  guidelines: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  allowed_platforms: string[];
  slug: string;
}
interface ApplicationForm {
  platform: string;
}
interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number;
  is_verified: boolean;
  campaign_id: string | null;
}
export default function CampaignJoin() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAccounts, setSelectedAccounts] = useState<SocialAccount[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  useEffect(() => {
    fetchCampaign();
    fetchSocialAccounts();
  }, [slug]);
  const fetchSocialAccounts = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from('social_accounts').select('*').eq('user_id', user.id); // Show all accounts

      if (error) throw error;
      setSocialAccounts(data || []);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    }
  };
  const fetchCampaign = async () => {
    if (!slug) return;
    try {
      const {
        data,
        error
      } = await supabase.from("campaigns").select(`
          *,
          brands (
            logo_url
          )
        `).eq("slug", slug).eq("status", "active").maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Campaign not found or inactive");
        return;
      }

      // Add brand logo
      const parsedData = {
        ...data,
        brand_logo_url: data.brands?.logo_url || data.brand_logo_url
      };
      setCampaign(parsedData as Campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };
  const onSubmit = async () => {
    if (!campaign || selectedAccounts.length === 0) return;
    setSubmitting(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to apply");
        navigate("/auth");
        return;
      }

      // Submit application for each selected account
      const submissions = selectedAccounts.map(account => ({
        campaign_id: campaign.id,
        creator_id: user.id,
        platform: account.platform,
        content_url: "pending",
        status: "pending"
      }));
      const {
        data,
        error
      } = await supabase.from("campaign_submissions").insert(submissions);
      if (error) {
        console.error("Submission error details:", error);
        throw error;
      }
      toast.success(`Application${selectedAccounts.length > 1 ? 's' : ''} submitted successfully!`);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };
  const handleAddAccount = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to connect an account");
      navigate("/auth");
      return;
    }
    setShowAddAccountDialog(true);
  };
  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-5 w-5";
    switch (platform) {
      case 'tiktok':
        return <img src={tiktokLogo} alt="TikTok" className={iconClass} />;
      case 'instagram':
        return <img src={instagramLogo} alt="Instagram" className={iconClass} />;
      case 'youtube':
        return <img src={youtubeLogo} alt="YouTube" className={iconClass} />;
      default:
        return null;
    }
  };
  if (loading) {
    return <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading campaign...</div>
      </div>;
  }
  if (!campaign) {
    return <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4">Campaign not found</div>
          <Button onClick={() => navigate("/dashboard?tab=discover")}>
            Browse Campaigns
          </Button>
        </div>
      </div>;
  }
  return <div className="min-h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-background">
        <Button variant="ghost" onClick={() => navigate("/dashboard?tab=discover")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Button>
      </div>

      {/* Campaign Banner with Logo */}
      <div className="max-w-2xl mx-auto px-6 mb-12">
        {/* Banner */}
        <div className="relative rounded-2xl bg-gradient-to-br from-primary to-primary/80 h-48">
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            {campaign.banner_url ? <img src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
                  <div className="text-4xl font-bold text-primary-foreground">{campaign.brand_name}</div>
                </div>}
          </div>
          
          {/* Logo Badge - Overlapping bottom left */}
          <div className="absolute -bottom-10 left-8 z-10">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center border-4 border-background overflow-hidden shadow-xl">
              {campaign.brand_logo_url ? <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-full h-full object-cover" /> : <div className="text-2xl font-bold text-primary-foreground">
                  {campaign.brand_name.charAt(0)}
                </div>}
            </div>
          </div>
        </div>
      </div>

      {/* Account Selection */}
      <div className="max-w-2xl mx-auto px-6">
        <div className="relative flex gap-6 mb-8">
            {/* Step Content */}
            <div className="flex-1 pb-8">
              <h2 className="text-xl font-bold mb-4">Select An Account For This Campaign</h2>
              
              {socialAccounts.length === 0 ? <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You don't have any connected accounts yet</p>
                  <Button onClick={handleAddAccount} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Connect Your First Account
                  </Button>
                </div> : <>
                  <div className="space-y-3 mb-4">
                    {socialAccounts.map(account => {
                const isLinkedToCampaign = account.campaign_id !== null;
                const isCompatible = campaign.allowed_platforms.includes(account.platform);
                const isDisabled = isLinkedToCampaign || !isCompatible;
                const isSelected = selectedAccounts.some(acc => acc.id === account.id);
                return <div key={account.id} onClick={() => {
                  if (isDisabled) return;

                  // Toggle selection
                  if (isSelected) {
                    setSelectedAccounts(selectedAccounts.filter(acc => acc.id !== account.id));
                  } else {
                    setSelectedAccounts([...selectedAccounts, account]);
                  }
                }} className={`p-4 rounded-xl border transition-all ${isDisabled ? 'bg-muted/50 cursor-not-allowed opacity-60' : isSelected ? 'bg-primary/10 ring-2 ring-primary cursor-pointer' : 'bg-card hover:bg-card/80 cursor-pointer'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getPlatformIcon(account.platform)}
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  @{account.username}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {isLinkedToCampaign && "Already linked to a campaign"}
                                  {!isCompatible && !isLinkedToCampaign && `${account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} is not allowed for this campaign`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>;
              })}
                  </div>

                  <Button onClick={handleAddAccount} variant="outline" className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Connect Another Account
                  </Button>

                  {selectedAccounts.length > 0 && <Button onClick={onSubmit} disabled={submitting} className="w-full mt-4">
                      {submitting ? "Submitting..." : `Submit Application${selectedAccounts.length > 1 ? 's' : ''} (${selectedAccounts.length})`}
                    </Button>}
                 </>}
            </div>
          </div>

      </div>

      <AddSocialAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} onSuccess={() => {
      fetchSocialAccounts();
      setShowAddAccountDialog(false);
    }} />
    </div>;
}