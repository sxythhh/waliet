import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Search,
  Users,
  MapPin,
  Sparkles,
  Send,
  ExternalLink,
  X,
  Mail,
} from "lucide-react";
import { BrandPitchToCreatorDialog } from "./BrandPitchToCreatorDialog";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import { FLAGS } from "@/assets/flags";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";

interface CreatorDiscoveryWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onCreatorAdded?: () => void;
}

interface DiscoveredCreator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  content_niches: string[] | null;
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
    follower_count: number | null;
  }[];
  matchScore: number;
}

type Stage = "platform" | "followers" | "location" | "niche" | "results";

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", icon: "tiktok" },
  { id: "instagram", label: "Instagram", icon: "instagram" },
  { id: "youtube", label: "YouTube", icon: "youtube" },
] as const;

const FOLLOWER_RANGES = [
  { id: "any", label: "Any size", description: "All creators regardless of audience size" },
  { id: "nano", label: "Nano (1K-10K)", description: "High engagement, niche audiences", min: 1000, max: 10000 },
  { id: "micro", label: "Micro (10K-50K)", description: "Growing influence, authentic reach", min: 10000, max: 50000 },
  { id: "mid", label: "Mid-tier (50K-500K)", description: "Established presence, broader reach", min: 50000, max: 500000 },
  { id: "macro", label: "Macro (500K+)", description: "Large audiences, mass appeal", min: 500000, max: Infinity },
] as const;

const LOCATIONS = [
  { id: "any", label: "Worldwide", description: "Creators from anywhere" },
  { id: "us", label: "United States", country: "United States", flag: FLAGS.US },
  { id: "ca", label: "Canada", country: "Canada", flag: FLAGS.CA },
  { id: "gb", label: "United Kingdom", country: "United Kingdom", flag: FLAGS.GB },
  { id: "ie", label: "Ireland", country: "Ireland", flag: FLAGS.IE },
  { id: "au", label: "Australia", country: "Australia", flag: FLAGS.AU },
  { id: "nz", label: "New Zealand", country: "New Zealand", flag: FLAGS.NZ },
  { id: "de", label: "Germany", country: "Germany", flag: FLAGS.DE },
  { id: "fr", label: "France", country: "France", flag: FLAGS.FR },
  { id: "it", label: "Italy", country: "Italy", flag: FLAGS.IT },
  { id: "es", label: "Spain", country: "Spain", flag: FLAGS.ES },
  { id: "nl", label: "Netherlands", country: "Netherlands", flag: FLAGS.NL },
  { id: "ch", label: "Switzerland", country: "Switzerland", flag: FLAGS.CH },
  { id: "at", label: "Austria", country: "Austria", flag: FLAGS.AT },
  { id: "be", label: "Belgium", country: "Belgium", flag: FLAGS.BE },
  { id: "dk", label: "Denmark", country: "Denmark", flag: FLAGS.DK },
  { id: "no", label: "Norway", country: "Norway", flag: FLAGS.NO },
  { id: "se", label: "Sweden", country: "Sweden", flag: FLAGS.SE },
  { id: "fi", label: "Finland", country: "Finland", flag: FLAGS.FI },
] as const;

const NICHES = [
  { id: "any", label: "All niches", description: "Any content type" },
  { id: "lifestyle", label: "Lifestyle", description: "Daily life, vlogs, personal" },
  { id: "fitness", label: "Fitness & Health", description: "Workouts, wellness, nutrition" },
  { id: "beauty", label: "Beauty & Fashion", description: "Makeup, skincare, style" },
  { id: "tech", label: "Tech & Gaming", description: "Reviews, gaming, gadgets" },
  { id: "food", label: "Food & Cooking", description: "Recipes, restaurants, foodie" },
  { id: "travel", label: "Travel", description: "Adventures, destinations, tips" },
  { id: "business", label: "Business & Finance", description: "Entrepreneurship, investing" },
  { id: "comedy", label: "Comedy & Entertainment", description: "Humor, skits, entertainment" },
] as const;

const STAGES: Stage[] = ["platform", "followers", "location", "niche", "results"];

export function CreatorDiscoveryWizard({
  open,
  onOpenChange,
  brandId,
  onCreatorAdded,
}: CreatorDiscoveryWizardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [currentStage, setCurrentStage] = useState<Stage>("platform");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedFollowerRange, setSelectedFollowerRange] = useState<string>("any");
  const [selectedLocation, setSelectedLocation] = useState<string>("any");
  const [selectedNiche, setSelectedNiche] = useState<string>("any");
  const [creators, setCreators] = useState<DiscoveredCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [pitchDialogOpen, setPitchDialogOpen] = useState(false);
  const [addingCreator, setAddingCreator] = useState<string | null>(null);
  const [creatorToPitch, setCreatorToPitch] = useState<DiscoveredCreator | null>(null);

  const getPlatformLogo = (platform: string) => {
    switch (platform) {
      case "tiktok":
        return isDark ? tiktokLogoWhite : tiktokLogoBlack;
      case "instagram":
        return isDark ? instagramLogoWhite : instagramLogoBlack;
      case "youtube":
        return isDark ? youtubeLogoWhite : youtubeLogoBlack;
      default:
        return null;
    }
  };

  const currentStageIndex = STAGES.indexOf(currentStage);
  const progress = ((currentStageIndex) / (STAGES.length - 1)) * 100;

  const canProceed = useMemo(() => {
    switch (currentStage) {
      case "platform":
        return selectedPlatforms.length > 0;
      case "followers":
        return selectedFollowerRange !== "";
      case "location":
        return selectedLocation !== "";
      case "niche":
        return selectedNiche !== "";
      default:
        return true;
    }
  }, [currentStage, selectedPlatforms, selectedFollowerRange, selectedLocation, selectedNiche]);

  const goToNextStage = () => {
    const nextIndex = currentStageIndex + 1;
    if (nextIndex < STAGES.length) {
      setCurrentStage(STAGES[nextIndex]);
      if (STAGES[nextIndex] === "results") {
        fetchCreators();
      }
    }
  };

  const goToPrevStage = () => {
    const prevIndex = currentStageIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStage(STAGES[prevIndex]);
    }
  };

  const resetWizard = () => {
    setCurrentStage("platform");
    setSelectedPlatforms([]);
    setSelectedFollowerRange("any");
    setSelectedLocation("any");
    setSelectedNiche("any");
    setCreators([]);
    setSearchQuery("");
  };

  useEffect(() => {
    if (!open) {
      resetWizard();
    }
  }, [open]);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, city, country, content_niches")
        .eq("onboarding_completed", true);

      // Apply location filter
      const locationOption = LOCATIONS.find(l => l.id === selectedLocation);
      if (locationOption && "country" in locationOption) {
        query = query.eq("country", locationOption.country);
      }

      // Apply niche filter
      if (selectedNiche !== "any") {
        query = query.contains("content_niches", [selectedNiche]);
      }

      const { data: profiles, error } = await query.limit(200);
      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        setCreators([]);
        setLoading(false);
        return;
      }

      // Fetch social accounts for these profiles
      let socialQuery = supabase
        .from("social_accounts")
        .select("user_id, platform, username, account_link, follower_count")
        .in("user_id", profiles.map(p => p.id))
        .eq("is_verified", true);

      // Filter by selected platforms
      if (selectedPlatforms.length > 0) {
        socialQuery = socialQuery.in("platform", selectedPlatforms);
      }

      const { data: socialAccounts } = await socialQuery;

      // Build creators with social data and calculate match score
      const creatorsWithSocial: DiscoveredCreator[] = profiles
        .map(profile => {
          const socials = (socialAccounts || [])
            .filter(sa => sa.user_id === profile.id)
            .map(sa => ({
              platform: sa.platform,
              username: sa.username,
              account_link: sa.account_link,
              follower_count: sa.follower_count,
            }));

          // Calculate match score based on criteria
          let matchScore = 0;

          // Platform match
          const hasMatchingPlatform = socials.some(s =>
            selectedPlatforms.length === 0 || selectedPlatforms.includes(s.platform)
          );
          if (hasMatchingPlatform) matchScore += 25;

          // Follower range match
          const followerOption = FOLLOWER_RANGES.find(f => f.id === selectedFollowerRange);
          if (followerOption && socials.length > 0) {
            const maxFollowers = Math.max(...socials.map(s => s.follower_count || 0));
            if (selectedFollowerRange === "any") {
              matchScore += 25;
            } else if (
              "min" in followerOption &&
              "max" in followerOption &&
              maxFollowers >= followerOption.min &&
              maxFollowers <= followerOption.max
            ) {
              matchScore += 25;
            }
          }

          // Location match
          if (selectedLocation === "any" || profile.country === locationOption?.country) {
            matchScore += 25;
          }

          // Niche match
          if (selectedNiche === "any" || profile.content_niches?.includes(selectedNiche)) {
            matchScore += 25;
          }

          return {
            ...profile,
            social_accounts: socials,
            matchScore,
          };
        })
        .filter(c => c.social_accounts.length > 0 && c.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);

      setCreators(creatorsWithSocial);
    } catch (error) {
      console.error("Error fetching creators:", error);
      toast.error("Failed to fetch creators");
    } finally {
      setLoading(false);
    }
  };

  const filteredCreators = useMemo(() => {
    if (!searchQuery) return creators;
    const q = searchQuery.toLowerCase();
    return creators.filter(
      c =>
        c.username.toLowerCase().includes(q) ||
        c.full_name?.toLowerCase().includes(q) ||
        c.bio?.toLowerCase().includes(q)
    );
  }, [creators, searchQuery]);

  const addCreatorToDatabase = async (creatorId: string) => {
    setAddingCreator(creatorId);
    try {
      // Check if relationship already exists
      const { data: existing } = await supabase
        .from("brand_creator_relationships")
        .select("id")
        .eq("brand_id", brandId)
        .eq("user_id", creatorId)
        .maybeSingle();

      if (existing) {
        toast.info("Creator is already in your database");
        setAddingCreator(null);
        return;
      }

      // Create relationship
      const { error } = await supabase.from("brand_creator_relationships").insert({
        brand_id: brandId,
        user_id: creatorId,
        source_type: "manual_add",
        first_interaction_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Creator added to your database");
      onCreatorAdded?.();
    } catch (error) {
      console.error("Error adding creator:", error);
      toast.error("Failed to add creator");
    } finally {
      setAddingCreator(null);
    }
  };

  const formatFollowerCount = (count: number | null) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const renderStageContent = () => {
    switch (currentStage) {
      case "platform":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold tracking-[-0.5px]">Which platforms?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select the platforms where you want to find creators
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => {
                      setSelectedPlatforms(prev =>
                        isSelected
                          ? prev.filter(p => p !== platform.id)
                          : [...prev, platform.id]
                      );
                    }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                      <img
                        src={getPlatformLogo(platform.id)}
                        alt={platform.label}
                        className="w-6 h-6"
                      />
                    </div>
                    <span className="font-medium flex-1 text-left">{platform.label}</span>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "followers":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold tracking-[-0.5px]">What audience size?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose the creator tier that fits your goals
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {FOLLOWER_RANGES.map(range => {
                const isSelected = selectedFollowerRange === range.id;
                return (
                  <button
                    key={range.id}
                    onClick={() => setSelectedFollowerRange(range.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium block">{range.label}</span>
                      <span className="text-xs text-muted-foreground">{range.description}</span>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "location":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold tracking-[-0.5px]">Where should they be based?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Target creators in specific regions
              </p>
            </div>
            <ScrollArea className="h-[320px] pr-4">
              <div className="grid grid-cols-2 gap-3">
                {LOCATIONS.map(location => {
                  const isSelected = selectedLocation === location.id;
                  const hasFlag = "flag" in location;
                  return (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-border/80 hover:bg-muted/30",
                        location.id === "any" && "col-span-2"
                      )}
                    >
                      {hasFlag ? (
                        <img
                          src={location.flag}
                          alt={location.label}
                          className="w-5 h-5 rounded-sm object-cover flex-shrink-0"
                        />
                      ) : (
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm">{location.label}</span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center ml-auto flex-shrink-0">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        );

      case "niche":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold tracking-[-0.5px]">What content niche?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Find creators who specialize in your area
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {NICHES.map(niche => {
                const isSelected = selectedNiche === niche.id;
                return (
                  <button
                    key={niche.id}
                    onClick={() => setSelectedNiche(niche.id)}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-muted/30",
                      niche.id === "any" && "col-span-2 flex-row items-center gap-3"
                    )}
                  >
                    {niche.id === "any" ? (
                      <>
                        <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm">{niche.label}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center ml-auto flex-shrink-0">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-medium text-sm">{niche.label}</span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{niche.description}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "results":
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold tracking-[-0.5px]">
                {loading ? "Finding creators..." : `${filteredCreators.length} creators found`}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Based on your criteria
              </p>
            </div>

            {!loading && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search results..."
                  className="pl-9"
                />
              </div>
            )}

            <ScrollArea className="h-[350px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCreators.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No creators match your criteria</p>
                  <Button
                    variant="link"
                    onClick={() => setCurrentStage("platform")}
                    className="mt-2"
                  >
                    Adjust your filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredCreators.map(creator => (
                    <div
                      key={creator.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-border hover:bg-muted/30 transition-all"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={creator.avatar_url || ""} />
                        <AvatarFallback className="text-sm bg-muted">
                          {creator.username?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {creator.full_name || creator.username}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              creator.matchScore >= 75 && "bg-emerald-500/10 text-emerald-500",
                              creator.matchScore >= 50 && creator.matchScore < 75 && "bg-amber-500/10 text-amber-500",
                              creator.matchScore < 50 && "bg-muted text-muted-foreground"
                            )}
                          >
                            {creator.matchScore}% match
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">@{creator.username}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {creator.social_accounts.slice(0, 3).map(social => (
                            <div
                              key={social.platform}
                              className="flex items-center gap-1"
                            >
                              <img
                                src={getPlatformLogo(social.platform)}
                                alt={social.platform}
                                className="w-3.5 h-3.5"
                              />
                              {social.follower_count && (
                                <span className="text-[10px] text-muted-foreground">
                                  {formatFollowerCount(social.follower_count)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => window.open(`/@${creator.username}`, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => {
                            setCreatorToPitch(creator);
                            setPitchDialogOpen(true);
                          }}
                        >
                          <Mail className="h-3 w-3" />
                          Pitch
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => addCreatorToDatabase(creator.id)}
                          disabled={addingCreator === creator.id}
                        >
                          {addingCreator === creator.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-3 w-3" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Find Creators</DialogTitle>
          <DialogDescription>
            Answer a few questions to discover the perfect creators for your brand
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stage content */}
        <div className="py-4 flex-1 overflow-y-auto">{renderStageContent()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={goToPrevStage}
            disabled={currentStageIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStage === "results" ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <Button onClick={goToNextStage} disabled={!canProceed} className="gap-2">
              {currentStage === "niche" ? "Find Creators" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Brand Pitch to Creator Dialog */}
      {creatorToPitch && (
        <BrandPitchToCreatorDialog
          open={pitchDialogOpen}
          onOpenChange={(open) => {
            setPitchDialogOpen(open);
            if (!open) setCreatorToPitch(null);
          }}
          brandId={brandId}
          creatorId={creatorToPitch.id}
          creatorName={creatorToPitch.full_name || creatorToPitch.username}
          creatorUsername={creatorToPitch.username}
          creatorAvatarUrl={creatorToPitch.avatar_url}
          onSuccess={() => {
            // Also add them to the database when pitching
            addCreatorToDatabase(creatorToPitch.id);
          }}
        />
      )}
    </Dialog>
  );
}
