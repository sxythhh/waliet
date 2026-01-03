import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check,
  X,
  Loader2,
  Camera,
  Copy,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import xLogo from "@/assets/x-logo.png";

interface UserOnboardingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentStep?: number;
  onComplete?: () => void;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "too_short";

type Platform = "tiktok" | "instagram" | "youtube" | "twitter";

const TOTAL_STEPS = 4;

export function UserOnboardingFlow({
  open,
  onOpenChange,
  userId,
  currentStep: initialStep = 1,
  onComplete,
}: UserOnboardingFlowProps) {
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);

  // Step 1: Username
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debouncedUsername = useDebounce(username, 400);

  // Step 2: Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Step 3: Social accounts
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [socialUsername, setSocialUsername] = useState("");
  const [socialLink, setSocialLink] = useState("");

  // Load existing profile data
  useEffect(() => {
    if (!open || !userId) return;

    const loadProfile = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url, onboarding_step")
        .eq("id", userId)
        .single();

      if (profile) {
        // If username is already set and not auto-generated, skip to next step
        if (profile.username && !profile.username.startsWith("user_")) {
          setUsername(profile.username);
          setUsernameStatus("available");
        }
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
        if (profile.onboarding_step && profile.onboarding_step > 1) {
          setStep(profile.onboarding_step);
        }
      }
    };

    loadProfile();
  }, [open, userId]);

  // Check username availability
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      if (debouncedUsername.length > 0 && debouncedUsername.length < 3) {
        setUsernameStatus("too_short");
      } else {
        setUsernameStatus("idle");
      }
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(debouncedUsername)) {
      setUsernameStatus("invalid");
      return;
    }

    const checkUsername = async () => {
      setUsernameStatus("checking");

      try {
        const { data, error } = await supabase.rpc("check_username_available", {
          desired_username: debouncedUsername,
        });

        if (error) throw error;
        setUsernameStatus(data ? "available" : "taken");
      } catch (error) {
        console.error("Error checking username:", error);
        // Fallback to direct query
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", debouncedUsername)
          .neq("id", userId)
          .maybeSingle();

        setUsernameStatus(existingUser ? "taken" : "available");
      }
    };

    checkUsername();
  }, [debouncedUsername, userId]);

  const copyProfileLink = useCallback(() => {
    const link = `virality.gg/@${username}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  }, [username]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl + `?t=${Date.now()}`);
      toast.success("Avatar uploaded!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveUsername = async () => {
    if (usernameStatus !== "available") return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.toLowerCase(),
          username_set_at: new Date().toISOString(),
          onboarding_step: 2
        })
        .eq("id", userId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to save username");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveAvatar = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
          onboarding_step: 3
        })
        .eq("id", userId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to save avatar");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveSocialAccount = async () => {
    if (!selectedPlatform || !socialUsername) {
      // Skip if not adding social account
      await supabase
        .from("profiles")
        .update({ onboarding_step: 4 })
        .eq("id", userId);
      return true;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("social_accounts")
        .upsert({
          user_id: userId,
          platform: selectedPlatform,
          username: socialUsername.replace("@", ""),
          account_link: socialLink || null,
          is_verified: false,
        }, { onConflict: "user_id,platform" });

      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ onboarding_step: 4 })
        .eq("id", userId);

      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to save social account");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_step: TOTAL_STEPS + 1
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Welcome to Virality!");
      onOpenChange(false);
      onComplete?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    switch (step) {
      case 1:
        const usernameSaved = await saveUsername();
        if (usernameSaved) setStep(2);
        break;
      case 2:
        const avatarSaved = await saveAvatar();
        if (avatarSaved) setStep(3);
        break;
      case 3:
        const socialSaved = await saveSocialAccount();
        if (socialSaved) setStep(4);
        break;
      case 4:
        await completeOnboarding();
        break;
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return usernameStatus === "available";
      case 2:
        return true; // Avatar is optional
      case 3:
        return true; // Social account is optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  const getStatusIcon = () => {
    switch (usernameStatus) {
      case "checking":
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
      case "available":
        return (
          <div className="h-6 w-6 rounded-full border-2 border-emerald-500 flex items-center justify-center">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          </div>
        );
      case "taken":
      case "invalid":
        return (
          <div className="h-6 w-6 rounded-full border-2 border-red-500 flex items-center justify-center">
            <X className="h-3.5 w-3.5 text-red-500" />
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (usernameStatus) {
      case "too_short":
        return <span className="text-muted-foreground">Username must be at least 3 characters</span>;
      case "invalid":
        return <span className="text-red-500">Only letters, numbers, and underscores allowed</span>;
      case "taken":
        return <span className="text-red-500">This username is already taken</span>;
      case "available":
        return <span className="text-emerald-500">Username is available!</span>;
      default:
        return null;
    }
  };

  const getPlatformIcon = (platform: Platform) => {
    const iconClass = "h-7 w-7 object-contain";
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
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[440px] border-0 bg-[#0a0a0a] p-0 [&>button]:hidden overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6 space-y-6">
          {/* Step 1: Username */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold font-inter tracking-[-0.5px]">
                  Choose your username
                </h2>
                <p className="text-muted-foreground text-sm font-inter tracking-[-0.3px]">
                  This will be your unique identity on Virality
                </p>
              </div>

              {/* Username Input - Lute style */}
              <div className="space-y-3">
                <Label className="text-sm font-medium font-inter tracking-[-0.3px]">
                  Username
                </Label>
                <div className={cn(
                  "relative flex items-center rounded-xl border-2 transition-all duration-200",
                  "bg-background/50",
                  usernameStatus === "available" && "border-emerald-500/50 focus-within:border-emerald-500",
                  usernameStatus === "taken" || usernameStatus === "invalid" ? "border-red-500/50 focus-within:border-red-500" : "",
                  usernameStatus === "idle" || usernameStatus === "checking" || usernameStatus === "too_short"
                    ? "border-muted focus-within:border-primary" : ""
                )}>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="yourname"
                    className="border-0 bg-transparent h-14 text-lg font-medium font-inter tracking-[-0.5px] focus-visible:ring-0 focus-visible:ring-offset-0 pr-12"
                    maxLength={20}
                    autoFocus
                  />
                  <div className="absolute right-4">
                    {getStatusIcon()}
                  </div>
                </div>

                {/* Status message */}
                <div className="text-xs font-inter tracking-[-0.3px] h-4">
                  {getStatusMessage()}
                </div>

                {/* Profile link preview */}
                {username.length >= 3 && usernameStatus === "available" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    <span>Your profile link:</span>
                    <span className="text-foreground font-medium">virality.gg/@{username}</span>
                    <button
                      onClick={copyProfileLink}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Profile Picture */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold font-inter tracking-[-0.5px]">
                  Add a profile picture
                </h2>
                <p className="text-muted-foreground text-sm font-inter tracking-[-0.3px]">
                  Help brands recognize you with a photo
                </p>
              </div>

              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <Avatar className="h-32 w-32 border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 transition-colors">
                    <AvatarImage src={avatarUrl || ""} />
                    <AvatarFallback className="bg-muted text-2xl font-bold">
                      {username.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                    {uploadingAvatar ? (
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    ) : (
                      <Camera className="h-8 w-8 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>

                <div className="text-center">
                  <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline font-inter tracking-[-0.3px]">
                    <Upload className="h-4 w-4" />
                    Upload profile picture
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 font-inter tracking-[-0.3px]">
                    JPG, PNG or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Connect Social Account */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold font-inter tracking-[-0.5px]">
                  Connect your socials
                </h2>
                <p className="text-muted-foreground text-sm font-inter tracking-[-0.3px]">
                  Link your primary platform to get discovered
                </p>
              </div>

              {/* Platform Selection */}
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {(["tiktok", "instagram", "youtube", "twitter"] as Platform[]).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setSelectedPlatform(platform === selectedPlatform ? null : platform)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                        selectedPlatform === platform
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      {getPlatformIcon(platform)}
                      <span className="text-[10px] font-medium capitalize font-inter">
                        {platform === "twitter" ? "X" : platform}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedPlatform && (
                  <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium font-inter tracking-[-0.3px]">
                        Username on {selectedPlatform === "twitter" ? "X" : selectedPlatform}
                      </Label>
                      <Input
                        value={socialUsername}
                        onChange={(e) => setSocialUsername(e.target.value.replace("@", ""))}
                        placeholder="username"
                        className="h-12 font-inter tracking-[-0.3px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium font-inter tracking-[-0.3px]">
                        Profile link <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        value={socialLink}
                        onChange={(e) => setSocialLink(e.target.value)}
                        placeholder={`https://${selectedPlatform}.com/@${socialUsername || "username"}`}
                        className="h-12 font-inter tracking-[-0.3px]"
                      />
                    </div>
                  </div>
                )}

                {!selectedPlatform && (
                  <p className="text-xs text-muted-foreground text-center font-inter tracking-[-0.3px]">
                    You can skip this step and add accounts later
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-primary/20 rounded-full flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-inter tracking-[-0.5px]">
                  You're all set!
                </h2>
                <p className="text-muted-foreground text-sm font-inter tracking-[-0.3px]">
                  Start discovering campaigns and earning money
                </p>
              </div>

              {/* Quick tips */}
              <div className="space-y-3 bg-muted/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium font-inter tracking-[-0.3px]">Browse campaigns</p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      Find campaigns that match your content style
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium font-inter tracking-[-0.3px]">Apply & create</p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      Get approved and start creating content
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium font-inter tracking-[-0.3px]">Earn & grow</p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      Get paid based on your performance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {step > 1 && step < 4 && (
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 h-12 font-inter tracking-[-0.5px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={loading || !canProceed()}
              className={cn(
                "h-12 font-inter tracking-[-0.5px]",
                step === 1 || step === 4 ? "w-full" : "flex-1"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === 4 ? (
                "Go to Dashboard"
              ) : step === 2 || step === 3 ? (
                <>
                  {step === 2 && !avatarUrl ? "Skip" : step === 3 && !selectedPlatform ? "Skip" : "Continue"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i + 1 === step
                    ? "w-6 bg-primary"
                    : i + 1 < step
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
