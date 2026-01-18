import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, Phone, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PublicFormHeader } from "@/components/public-form/PublicFormHeader";
import { PublicFormSuccess } from "@/components/public-form/PublicFormSuccess";
import { ApplicationQuestionsRenderer, validateApplicationAnswers } from "@/components/ApplicationQuestionsRenderer";
import { ApplicationAnswer, parseApplicationQuestions } from "@/types/applicationQuestions";
import { PublicFormSettings, parsePublicFormSettings } from "@/types/publicFormSettings";
import discordIcon from "@/assets/discord-icon.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

interface BoostData {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  status: string;
  public_application_enabled: boolean;
  public_form_settings: PublicFormSettings;
  application_questions: unknown;
  max_accepted_creators: number;
  accepted_creators_count: number;
  brands: {
    id: string;
    name: string;
    logo_url: string | null;
    brand_color: string | null;
    is_verified: boolean;
  };
}

interface SocialAccountInput {
  platform: string;
  username: string;
}

const DEFAULT_BRAND_COLOR = "#2061de";

export default function PublicBoostApplication() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isWaitlisted, setIsWaitlisted] = useState(false);
  const [boost, setBoost] = useState<BoostData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountInput[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, ApplicationAnswer>>({});

  useEffect(() => {
    fetchBoost();
  }, [slug]);

  const fetchBoost = async () => {
    if (!slug) {
      setError("Invalid application link");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("bounty_campaigns")
      .select(`
        id, title, description, slug, status,
        public_application_enabled, public_form_settings,
        application_questions, max_accepted_creators, accepted_creators_count,
        brands!inner (id, name, logo_url, brand_color, is_verified)
      `)
      .eq("slug", slug)
      .maybeSingle();

    if (fetchError || !data) {
      setError("Application not found");
      setLoading(false);
      return;
    }

    const boostData = data as unknown as BoostData;

    if (!boostData.public_application_enabled) {
      setError("Public applications are not enabled for this opportunity");
      setLoading(false);
      return;
    }

    setBoost(boostData);
    initializeSocialAccounts(boostData.public_form_settings);
    setLoading(false);
  };

  const initializeSocialAccounts = (settings: PublicFormSettings) => {
    const formSettings = parsePublicFormSettings(settings);
    if (formSettings.require_social_account && formSettings.social_platforms) {
      setSocialAccounts(
        formSettings.social_platforms.map(platform => ({ platform, username: "" }))
      );
    }
  };

  const brandColor = boost?.brands?.brand_color || DEFAULT_BRAND_COLOR;
  const formSettings = parsePublicFormSettings(boost?.public_form_settings);
  const questions = parseApplicationQuestions(boost?.application_questions);
  const isFull = boost ? (boost.max_accepted_creators > 0 && boost.accepted_creators_count >= boost.max_accepted_creators) : false;
  const isPaused = boost?.status === "paused";

  const validateForm = (): boolean => {
    if (!email.trim()) {
      toast.error("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    if (formSettings.require_phone && !phoneNumber.trim()) {
      toast.error("Phone number is required");
      return false;
    }

    if (formSettings.require_discord && !discordUsername.trim()) {
      toast.error("Discord username is required");
      return false;
    }

    if (formSettings.require_social_account) {
      const hasAnySocial = socialAccounts.some(acc => acc.username.trim());
      if (!hasAnySocial) {
        toast.error("At least one social account is required");
        return false;
      }
    }

    const questionValidation = validateApplicationAnswers(
      boost?.application_questions,
      questionAnswers
    );
    if (!questionValidation.valid) {
      toast.error(`Please answer: ${questionValidation.missingRequired.join(", ")}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boost || !validateForm()) return;

    setSubmitting(true);

    try {
      const socialAccountsToStore = socialAccounts
        .filter(acc => acc.username.trim())
        .map(acc => ({
          platform: acc.platform,
          username: acc.username.trim(),
        }));

      const { error: insertError } = await supabase
        .from("public_boost_applications")
        .insert({
          bounty_campaign_id: boost.id,
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim() || null,
          discord_username: discordUsername.trim() || null,
          social_accounts: socialAccountsToStore,
          application_answers: Object.keys(questionAnswers).length > 0 ? questionAnswers : null,
          status: isFull ? "waitlisted" : "pending",
        });

      if (insertError) {
        if (insertError.message.includes("already exists")) {
          toast.error("You've already applied to this opportunity");
        } else {
          throw insertError;
        }
        return;
      }

      setIsWaitlisted(isFull);
      setSubmitted(true);
      toast.success(isFull ? "Added to waitlist!" : "Application submitted!");
    } catch (err: unknown) {
      console.error("Submit error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to submit application";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const updateSocialAccount = (index: number, username: string) => {
    setSocialAccounts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], username };
      return updated;
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "tiktok":
        return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />;
      case "instagram":
        return <img src={instagramLogo} alt="Instagram" className="w-4 h-4" />;
      case "youtube":
        return <img src={youtubeLogo} alt="YouTube" className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !boost) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-foreground font-inter tracking-[-0.5px]">
            {error || "Something went wrong"}
          </h1>
          <p className="text-muted-foreground font-inter tracking-[-0.5px]">
            This application link may be invalid or expired.
          </p>
          <Link to="/discover">
            <Button variant="outline" className="font-inter tracking-[-0.5px]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Opportunities
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Paused state
  if (isPaused) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <PublicFormHeader
            brandName={boost.brands.name}
            brandLogo={boost.brands.logo_url}
            brandColor={brandColor}
            isVerified={boost.brands.is_verified}
            boostTitle={boost.title}
          />
          <div className="py-8">
            <p className="text-muted-foreground font-inter tracking-[-0.5px]">
              Applications are currently paused for this opportunity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header
        className="h-1 w-full"
        style={{ backgroundColor: brandColor }}
      />

      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        {submitted ? (
          <PublicFormSuccess
            brandName={boost.brands.name}
            brandColor={brandColor}
            successMessage={formSettings.success_message}
            isWaitlisted={isWaitlisted}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <PublicFormHeader
              brandName={boost.brands.name}
              brandLogo={boost.brands.logo_url}
              brandColor={brandColor}
              isVerified={boost.brands.is_verified}
              boostTitle={boost.title}
            />

            {/* Custom intro text */}
            {formSettings.custom_intro_text && (
              <p className="text-muted-foreground font-inter tracking-[-0.5px] text-center">
                {formSettings.custom_intro_text}
              </p>
            )}

            {/* Form fields */}
            <div className="space-y-6">
              {/* Email (always required) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 font-inter tracking-[-0.5px]"
                    required
                  />
                </div>
              </div>

              {/* Phone (conditional) */}
              {formSettings.require_phone && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="pl-10 font-inter tracking-[-0.5px]"
                    />
                  </div>
                </div>
              )}

              {/* Discord (conditional) */}
              {formSettings.require_discord && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
                    Discord Username <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <img
                      src={discordIcon}
                      alt="Discord"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    />
                    <Input
                      type="text"
                      value={discordUsername}
                      onChange={(e) => setDiscordUsername(e.target.value)}
                      placeholder="username#0000 or username"
                      className="pl-10 font-inter tracking-[-0.5px]"
                    />
                  </div>
                </div>
              )}

              {/* Social Accounts (conditional) */}
              {formSettings.require_social_account && socialAccounts.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
                    Social Media Accounts <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    Provide at least one social media username
                  </p>
                  {socialAccounts.map((account, index) => (
                    <div key={account.platform} className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {getPlatformIcon(account.platform)}
                      </div>
                      <Input
                        type="text"
                        value={account.username}
                        onChange={(e) => updateSocialAccount(index, e.target.value)}
                        placeholder={`${account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} username`}
                        className="pl-10 font-inter tracking-[-0.5px]"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Application Questions */}
              {questions.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <ApplicationQuestionsRenderer
                    questions={boost.application_questions}
                    answers={questionAnswers}
                    onChange={setQuestionAnswers}
                    campaignId={boost.id}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 text-base font-inter tracking-[-0.5px]"
                style={{ backgroundColor: brandColor }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : isFull ? (
                  "Join Waitlist"
                ) : (
                  "Submit Application"
                )}
              </Button>

              {isFull && (
                <p className="text-xs text-muted-foreground text-center mt-2 font-inter tracking-[-0.5px]">
                  All spots are filled. You'll be added to the waitlist.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Already have an account?{" "}
                <Link
                  to={`/join/${boost.slug}`}
                  className="underline hover:text-foreground"
                  style={{ color: brandColor }}
                >
                  Sign in to apply
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>

      {/* Powered by footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-3 text-center bg-background/80 backdrop-blur-sm border-t border-border/30">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-inter tracking-[-0.5px]"
        >
          <ExternalLink className="w-3 h-3" />
          Powered by Virality
        </Link>
      </footer>
    </div>
  );
}
