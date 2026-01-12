import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@iconify/react";
import { Loader2, Check, X, ArrowLeft, Camera, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateBrandDialog } from "./CreateBrandDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatorSkillSelector } from "./onboarding/CreatorSkillSelector";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

type Step = "select-type" | "profile-basics" | "bio" | "content-niches" | "creator-skills" | "location";

const STEPS: Step[] = ["select-type", "profile-basics", "bio", "content-niches", "creator-skills", "location"];

const CONTENT_NICHES = [
  "Tech & Gadgets",
  "Fashion & Style",
  "Beauty & Skincare",
  "Health & Fitness",
  "Food & Cooking",
  "Travel & Adventure",
  "Gaming",
  "Music & Dance",
  "Comedy & Memes",
  "Education",
  "Finance & Business",
  "Parenting & Family",
  "Pets & Animals",
  "Sports",
  "Art & Design",
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "Spain", "Italy", "Netherlands", "Belgium", "Sweden", "Norway", "Denmark",
  "Finland", "Ireland", "Switzerland", "Austria", "Poland", "Portugal", "Greece",
  "Brazil", "Mexico", "Argentina", "Colombia", "Chile", "Peru",
  "Japan", "South Korea", "China", "India", "Singapore", "Malaysia", "Thailand",
  "Indonesia", "Philippines", "Vietnam", "Taiwan", "Hong Kong",
  "South Africa", "Nigeria", "Egypt", "Kenya", "Morocco",
  "United Arab Emirates", "Saudi Arabia", "Israel", "Turkey",
  "Russia", "Ukraine", "Czech Republic", "Romania", "Hungary",
  "New Zealand", "Other"
];

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function OnboardingDialog({
  open,
  onOpenChange,
  userId,
}: OnboardingDialogProps) {
  const [step, setStep] = useState<Step>("select-type");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [countrySearch, setCountrySearch] = useState("");

  // Creator skills
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [editingSoftware, setEditingSoftware] = useState<string[]>([]);

  // Username availability
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const debouncedUsername = useDebounce(username, 300);

  // Brand dialog state
  const [createBrandDialogOpen, setCreateBrandDialogOpen] = useState(false);

  // Location auto-detection
  const [locationDetected, setLocationDetected] = useState(false);

  // Pre-populate name from profile
  useEffect(() => {
    const loadProfileData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, username")
        .eq("id", userId)
        .single();
      if (profile?.full_name) {
        const nameParts = profile.full_name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
      if (profile?.username) {
        setUsername(profile.username);
      }
    };
    if (open && userId) {
      loadProfileData();
    }
  }, [open, userId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("select-type");
      setUsername("");
      setUsernameAvailable(null);
      setBio("");
      setSelectedNiches([]);
      setCountry("");
      setCity("");
      setCountrySearch("");
      setLocationDetected(false);
      setSelectedSkillId(null);
      setEditingSoftware([]);
    }
  }, [open]);

  // Auto-detect location from IP
  useEffect(() => {
    if (!open || locationDetected) return;

    const detectLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) return;

        const data = await response.json();
        if (data.country_name && !country) {
          // Map to our country list or use the name directly
          const matchedCountry = COUNTRIES.find(
            c => c.toLowerCase() === data.country_name.toLowerCase()
          );
          setCountry(matchedCountry || data.country_name);
        }
        if (data.city && !city) {
          setCity(data.city);
        }
        setLocationDetected(true);
      } catch (err) {
        // Silently fail - location detection is optional
        console.log("Location detection failed:", err);
      }
    };

    detectLocation();
  }, [open, locationDetected, country, city]);

  // Check username availability
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const checkAvailability = async () => {
      setCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", debouncedUsername)
          .neq("id", userId)
          .maybeSingle();

        if (error) throw error;
        setUsernameAvailable(!data);
      } catch (err) {
        console.error("Error checking username:", err);
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    };

    checkAvailability();
  }, [debouncedUsername, userId]);

  const handleSelectType = (type: "creator" | "brand") => {
    if (type === "brand") {
      onOpenChange(false);
      setCreateBrandDialogOpen(true);
    } else {
      setStep("profile-basics");
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(value);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image under 5MB",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Please try again",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleNiche = (niche: string) => {
    setSelectedNiches(prev =>
      prev.includes(niche)
        ? prev.filter(n => n !== niche)
        : [...prev, niche]
    );
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const updateData: Record<string, any> = {
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        username: username,
        account_type: "creator",
        onboarding_completed: true,
      };

      if (avatarUrl) updateData.avatar_url = avatarUrl;
      if (bio.trim()) updateData.bio = bio.trim();
      if (selectedNiches.length > 0) updateData.content_niches = selectedNiches;
      if (country) updateData.country = country;
      if (city.trim()) updateData.city = city.trim();

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;

      // Save creator skills to portfolio if selected
      if (selectedSkillId || editingSoftware.length > 0) {
        const portfolioData: Record<string, any> = {
          user_id: userId,
        };
        if (selectedSkillId) portfolioData.primary_skill_type_id = selectedSkillId;
        if (editingSoftware.length > 0) portfolioData.editing_software = editingSoftware;

        // Upsert portfolio (create or update)
        const { error: portfolioError } = await supabase
          .from("creator_portfolios")
          .upsert(portfolioData, { onConflict: "user_id" });

        if (portfolioError) {
          console.error("Error saving portfolio:", portfolioError);
          // Non-fatal - continue with onboarding
        }
      }

      toast({
        title: "Welcome to Virality!",
        description: "Your profile has been set up successfully.",
      });

      onOpenChange(false);
      // Reload to refresh dashboard state
      window.location.reload();
    } catch (err: any) {
      console.error("Error saving profile:", err);
      if (err.code === "23505" && err.message?.includes("username")) {
        toast({
          variant: "destructive",
          title: "Username already taken",
          description: "Please choose a different username.",
        });
        setStep("profile-basics");
      } else {
        toast({
          variant: "destructive",
          title: "Failed to save profile",
          description: "Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const isProfileBasicsValid =
    firstName.trim() &&
    username.length >= 3 &&
    usernameAvailable === true;

  const currentStepIndex = STEPS.indexOf(step);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  if (!open) return null;

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Card container */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6 sm:p-8">
            {/* Step 1: Account Type Selection */}
            {step === "select-type" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-semibold font-inter tracking-[-0.5px]">
                    Welcome to Virality
                  </h1>
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    How would you like to use Virality?
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => handleSelectType("creator")}
                    className="p-5 rounded-xl border-2 border-border/50 hover:border-primary/50 hover:bg-muted/20 transition-all text-left"
                  >
                    <p className="font-semibold text-foreground font-inter tracking-[-0.5px]">I'm a Creator</p>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Create content & earn money
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectType("brand")}
                    className="p-5 rounded-xl border-2 border-border/50 hover:border-primary/50 hover:bg-muted/20 transition-all text-left"
                  >
                    <p className="font-semibold text-foreground font-inter tracking-[-0.5px]">I'm a Brand</p>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Hire creators for campaigns
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Profile Basics */}
            {step === "profile-basics" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold font-inter tracking-[-0.5px]">
                      Set up your profile
                    </h1>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Tell us a bit about yourself
                    </p>
                  </div>
                </div>

                {/* Avatar upload */}
                <div className="flex justify-center">
                  <label className="relative cursor-pointer group">
                    <Avatar className="h-24 w-24 ring-4 ring-muted/50 group-hover:ring-primary/30 transition-all">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-2xl font-medium">
                        {firstName ? firstName.charAt(0).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium font-inter tracking-[-0.5px]">First name</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="h-11 bg-muted/30 border-0 font-inter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium font-inter tracking-[-0.5px]">Last name</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="h-11 bg-muted/30 border-0 font-inter"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium font-inter tracking-[-0.5px]">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground select-none">
                      @
                    </span>
                    <Input
                      value={username}
                      onChange={handleUsernameChange}
                      className="pl-8 pr-10 h-11 bg-muted/30 border-0 font-inter"
                      placeholder="johndoe"
                    />
                    {username.length >= 3 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : usernameAvailable ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  {username.length >= 3 && !checkingUsername && usernameAvailable !== null && (
                    <p className={cn(
                      "text-xs font-inter tracking-[-0.3px]",
                      usernameAvailable ? "text-green-500" : "text-destructive"
                    )}>
                      {usernameAvailable ? "Username is available" : "Username is already taken"}
                    </p>
                  )}
                  {username.length > 0 && username.length < 3 && (
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      Username must be at least 3 characters
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleNext}
                  disabled={!isProfileBasicsValid}
                  className="w-full h-11 font-inter font-medium tracking-[-0.5px]"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 3: Bio */}
            {step === "bio" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold font-inter tracking-[-0.5px]">
                      About you
                    </h1>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Tell brands what makes you unique
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium font-inter tracking-[-0.5px]">Bio</Label>
                    <span className={cn(
                      "text-xs font-inter tracking-[-0.3px]",
                      bio.length > 180 ? "text-orange-500" : "text-muted-foreground"
                    )}>
                      {bio.length}/200
                    </span>
                  </div>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    placeholder="I create engaging content about..."
                    className="h-32 bg-muted/30 border-0 font-inter resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="flex-1 h-11 font-inter font-medium tracking-[-0.5px] text-muted-foreground hover:text-foreground"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 h-11 font-inter font-medium tracking-[-0.5px]"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Content Niches */}
            {step === "content-niches" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold font-inter tracking-[-0.5px]">
                      Content focus
                    </h1>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Select your content categories
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {CONTENT_NICHES.map((niche) => (
                    <button
                      key={niche}
                      onClick={() => toggleNiche(niche)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-inter tracking-[-0.3px] transition-all",
                        selectedNiches.includes(niche)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {niche}
                    </button>
                  ))}
                </div>

                {selectedNiches.length > 0 && (
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                    {selectedNiches.length} selected
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="flex-1 h-11 font-inter font-medium tracking-[-0.5px] text-muted-foreground hover:text-foreground"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 h-11 font-inter font-medium tracking-[-0.5px]"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Creator Skills */}
            {step === "creator-skills" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold font-inter tracking-[-0.5px]">
                      Your skills
                    </h1>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Help brands find the right fit
                    </p>
                  </div>
                </div>

                <CreatorSkillSelector
                  selectedSkillId={selectedSkillId}
                  onSkillSelect={setSelectedSkillId}
                  selectedSoftware={editingSoftware}
                  onSoftwareChange={setEditingSoftware}
                />

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="flex-1 h-11 font-inter font-medium tracking-[-0.5px] text-muted-foreground hover:text-foreground"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 h-11 font-inter font-medium tracking-[-0.5px]"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Location */}
            {step === "location" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold font-inter tracking-[-0.5px]">
                      Your location
                    </h1>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                      Help brands find local creators
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium font-inter tracking-[-0.5px]">Country</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={countrySearch || country}
                        onChange={(e) => {
                          setCountrySearch(e.target.value);
                          if (!e.target.value) setCountry("");
                        }}
                        placeholder="Search country..."
                        className="pl-10 h-11 bg-muted/30 border-0 font-inter"
                      />
                    </div>
                    {countrySearch && filteredCountries.length > 0 && (
                      <div className="max-h-40 overflow-y-auto bg-muted/30 rounded-lg p-1">
                        {filteredCountries.slice(0, 8).map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              setCountry(c);
                              setCountrySearch("");
                            }}
                            className="w-full text-left px-3 py-2 text-sm font-inter tracking-[-0.3px] rounded-md hover:bg-muted transition-colors"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium font-inter tracking-[-0.5px]">City</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                      className="h-11 bg-muted/30 border-0 font-inter"
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] flex items-center gap-1.5">
                  <Icon icon="ph:eye-slash" className="w-3.5 h-3.5" />
                  You can hide your location from your profile later
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex-1 h-11 font-inter font-medium tracking-[-0.5px] text-muted-foreground hover:text-foreground"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex-1 h-11 font-inter font-medium tracking-[-0.5px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Finishing...
                      </>
                    ) : (
                      "Finish"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar - below card */}
          <div className="mt-6">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-inter tracking-[-0.3px] text-center">
              Step {currentStepIndex + 1} of {STEPS.length}
            </p>
          </div>
        </div>
      </div>

      {/* CreateBrandDialog for brand path */}
      <CreateBrandDialog
        open={createBrandDialogOpen}
        onOpenChange={setCreateBrandDialogOpen}
        onSuccess={() => setCreateBrandDialogOpen(false)}
        hideTrigger
      />
    </>
  );
}
