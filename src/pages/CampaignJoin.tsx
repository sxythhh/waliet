import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronRight, Instagram, Youtube, CheckCircle2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
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
  application_questions: string[];
  slug: string;
}

interface ApplicationForm {
  platform: string;
  content_url: string;
  answers: Record<number, string>;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number;
  is_verified: boolean;
}

export default function CampaignJoin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<SocialAccount | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ApplicationForm>();

  useEffect(() => {
    fetchCampaign();
    fetchSocialAccounts();
  }, [slug]);

  const fetchSocialAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user.id)
        .is('campaign_id', null); // Only show accounts not yet linked to a campaign

      if (error) throw error;
      setSocialAccounts(data || []);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    }
  };

  const fetchCampaign = async () => {
    if (!slug) return;

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Campaign not found or inactive");
        return;
      }

      // Parse application_questions from JSON to array
      const parsedData = {
        ...data,
        application_questions: Array.isArray(data.application_questions) 
          ? data.application_questions 
          : []
      };

      setCampaign(parsedData as Campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ApplicationForm) => {
    if (!campaign || !selectedAccount) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to apply");
        navigate("/auth");
        return;
      }

      // Prepare answers as JSON
      const answersJson = campaign.application_questions.map((question, index) => ({
        question,
        answer: data.answers[index] || ""
      }));

      const { error } = await supabase
        .from("campaign_submissions")
        .insert({
          campaign_id: campaign.id,
          creator_id: user.id,
          platform: selectedAccount.platform,
          content_url: data.content_url,
          status: "pending",
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4">Campaign not found</div>
          <Button onClick={() => navigate("/dashboard?tab=discover")}>
            Browse Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-background">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard?tab=campaigns")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Button>
      </div>

      {/* Campaign Banner with Logo */}
      <div className="max-w-3xl mx-auto px-6 mb-12">
        {/* Banner */}
        <div className="relative rounded-2xl bg-gradient-to-br from-primary to-primary/80 h-48">
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            {campaign.banner_url ? (
              <img
                src={campaign.banner_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-4xl font-bold text-primary-foreground">{campaign.brand_name}</div>
                </div>
            )}
          </div>
          
          {/* Logo Badge - Overlapping bottom left */}
          <div className="absolute -bottom-10 left-8 z-10">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center border-4 border-background overflow-hidden shadow-xl">
              {campaign.brand_logo_url ? (
                <img
                  src={campaign.brand_logo_url}
                  alt={campaign.brand_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-2xl font-bold text-primary-foreground">
                  {campaign.brand_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step Process */}
      <div className="max-w-3xl mx-auto px-6">
        {/* Step 1: Campaign Requirements */}
        <div className="relative flex gap-6 mb-8">
          {/* Step Indicator */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              1
            </div>
            {currentStep === 1 && <div className="w-0.5 h-full bg-primary/30 mt-2" />}
          </div>

          {/* Step Content */}
          <div className="flex-1 pb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold">{campaign.brand_name}</h2>
            </div>
            
            <Card className="bg-card border hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => setCurrentStep(currentStep === 1 ? 2 : 1)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold mb-1">Campaign Requirements</div>
                    <div className="text-sm text-muted-foreground">
                      Please ensure you have gone through all campaign details
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                
                {currentStep === 1 && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {campaign.description && (
                      <div>
                        <div className="text-sm font-medium mb-2">Description</div>
                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      </div>
                    )}
                    
                    {campaign.guidelines && (
                      <div>
                        <div className="text-sm font-medium mb-2">Guidelines</div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaign.guidelines}</p>
                      </div>
                    )}
                    
                    <div>
                      <div className="text-sm font-medium mb-2">Platforms</div>
                      <div className="flex gap-2">
                        {campaign.allowed_platforms.map((platform) => (
                          <div key={platform} className="px-3 py-1 bg-muted rounded-full text-xs">
                            {platform === "tiktok" ? "TikTok" : "Instagram"}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">RPM Rate</div>
                      <div className="text-2xl font-bold text-primary">${campaign.rpm_rate}</div>
                    </div>

                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentStep(2);
                      }}
                      className="w-full"
                    >
                      Continue to Account Selection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Step 2: Select Account */}
        {currentStep >= 2 && (
          <div className="relative flex gap-6 mb-8">
            {/* Step Indicator */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              {currentStep === 2 && campaign.application_questions.length > 0 && (
                <div className="w-0.5 h-full bg-primary/30 mt-2" />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 pb-8">
              <h2 className="text-xl font-bold mb-4">Select An Account For This Campaign</h2>
              
              {socialAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You don't have any connected accounts yet</p>
                  <Button
                    onClick={handleAddAccount}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Connect Your First Account
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {socialAccounts
                      .filter(account => campaign.allowed_platforms.includes(account.platform))
                      .map((account) => (
                        <div
                          key={account.id}
                          onClick={() => {
                            setSelectedAccount(account);
                            setValue("platform", account.platform);
                          }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedAccount?.id === account.id
                              ? 'bg-primary/10 ring-2 ring-primary'
                              : 'bg-card hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getPlatformIcon(account.platform)}
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  @{account.username}
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {account.follower_count.toLocaleString()} followers
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  <Button
                    onClick={handleAddAccount}
                    variant="outline"
                    className="w-full gap-2 mb-4"
                  >
                    <Plus className="h-4 w-4" />
                    Connect Another Account
                  </Button>

                  {selectedAccount && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Content URL</label>
                        <Input
                          {...register("content_url", { required: "Content URL is required" })}
                          placeholder="https://..."
                          className="bg-background"
                        />
                        {errors.content_url && (
                          <p className="text-destructive text-sm mt-1">{errors.content_url.message}</p>
                        )}
                      </div>

                      {campaign.application_questions.length === 0 && (
                        <Button 
                          onClick={handleSubmit(onSubmit)}
                          disabled={submitting}
                          className="w-full"
                        >
                          {submitting ? "Submitting..." : "Submit Application"}
                        </Button>
                      )}
                      
                      {campaign.application_questions.length > 0 && (
                        <Button 
                          onClick={() => setCurrentStep(3)}
                          className="w-full"
                        >
                          Continue to Application Questions
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Application Questions */}
        {currentStep >= 3 && campaign.application_questions.length > 0 && (
          <div className="relative flex gap-6 mb-8">
            {/* Step Indicator */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                3
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 pb-8">
              <h2 className="text-xl font-bold mb-4">Application Questions</h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {campaign.application_questions.map((question, index) => (
                  <div key={index}>
                    <label className="text-sm font-medium mb-2 block">{question}</label>
                    <Textarea
                      {...register(`answers.${index}` as any, { required: "This answer is required" })}
                      placeholder="Your answer..."
                      rows={3}
                      className="bg-background resize-none"
                    />
                    {errors.answers?.[index] && (
                      <p className="text-destructive text-sm mt-1">{errors.answers[index].message}</p>
                    )}
                  </div>
                ))}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-6 text-lg"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      <AddSocialAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onSuccess={() => {
          fetchSocialAccounts();
          setShowAddAccountDialog(false);
        }}
      />
    </div>
  );
}
