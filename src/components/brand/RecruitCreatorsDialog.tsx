import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MessageSquare, Users, Check, ArrowRight, X } from "lucide-react";
import vpnKeyIcon from "@/assets/vpn-key-icon.svg";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionGateDialog } from "@/components/brand/SubscriptionGateDialog";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import xLogoBlack from "@/assets/x-logo.png";
import xLogoWhite from "@/assets/x-logo-light.png";

interface DiscoverableCreator {
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
}

interface RecruitCreatorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onStartConversation?: (creatorId: string, creatorName: string) => void;
}

const STEPS = [
  { id: 1, label: "Niche" },
  { id: 2, label: "Platform" },
  { id: 3, label: "Followers" },
  { id: 4, label: "Country" },
  { id: 5, label: "Style" },
  { id: 6, label: "Results" },
];

const NICHES = [
  "Gaming", "Tech", "Lifestyle", "Fashion", "Beauty", "Fitness", "Food",
  "Travel", "Music", "Education", "Finance", "Entertainment", "Sports",
  "Health", "Comedy", "Vlog", "DIY", "Automotive", "Art", "Photography"
];

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X (Twitter)' },
];

const FOLLOWER_RANGES = [
  { value: 'any', label: 'Any size', description: 'All creators' },
  { value: '1k', label: '1K+', description: 'Nano influencers' },
  { value: '10k', label: '10K+', description: 'Micro influencers' },
  { value: '50k', label: '50K+', description: 'Mid-tier creators' },
  { value: '100k', label: '100K+', description: 'Macro influencers' },
  { value: '500k', label: '500K+', description: 'Top creators' },
  { value: '1m', label: '1M+', description: 'Celebrity level' },
];

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Brazil', 'India', 'Indonesia', 'Mexico', 'Spain', 'Italy',
  'Netherlands', 'Japan', 'South Korea', 'Philippines', 'Pakistan'
];

const CONTENT_STYLES = [
  "Educational", "Entertainment", "Reviews", "Tutorials", "Vlogs",
  "Comedy/Humor", "Lifestyle", "Behind-the-scenes", "Challenges",
  "Storytelling", "ASMR", "Live Streams", "Shorts/Reels", "Long-form"
];

const getPlatformLogos = (isDark: boolean): Record<string, string> => ({
  tiktok: isDark ? tiktokLogoWhite : tiktokLogoBlack,
  instagram: isDark ? instagramLogoWhite : instagramLogoBlack,
  youtube: isDark ? youtubeLogoWhite : youtubeLogoBlack,
  x: isDark ? xLogoWhite : xLogoBlack
});

export function RecruitCreatorsDialog({
  open,
  onOpenChange,
  brandId,
  onStartConversation
}: RecruitCreatorsDialogProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const PLATFORM_LOGOS = useMemo(() => getPlatformLogos(isDark), [isDark]);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedFollowerRange, setSelectedFollowerRange] = useState<string>('any');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // Data state
  const [creators, setCreators] = useState<DiscoverableCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [subscriptionGateOpen, setSubscriptionGateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      checkSubscription();
    } else {
      // Reset wizard when dialog closes
      setCurrentStep(1);
      setSelectedNiches([]);
      setSelectedPlatforms([]);
      setSelectedFollowerRange('any');
      setSelectedCountries([]);
      setSelectedStyles([]);
      setCreators([]);
    }
  }, [open, brandId]);

  // Fetch creators when reaching results step
  useEffect(() => {
    if (open && hasActivePlan && currentStep === 6) {
      fetchDiscoverableCreators();
    }
  }, [open, hasActivePlan, currentStep]);

  const checkSubscription = async () => {
    const { data } = await supabase.from('brands').select('subscription_status').eq('id', brandId).single();
    setHasActivePlan(data?.subscription_status === 'active');
  };

  const fetchDiscoverableCreators = async () => {
    setLoading(true);
    try {
      let query = supabase.from("profiles").select("id, username, full_name, avatar_url, bio, city, country, content_niches").eq("onboarding_completed", true);

      // Apply country filter
      if (selectedCountries.length > 0) {
        query = query.in('country', selectedCountries);
      }

      const { data: profiles, error } = await query.limit(100);
      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        setCreators([]);
        setLoading(false);
        return;
      }

      // Fetch social accounts with platform filter
      let socialQuery = supabase.from("social_accounts").select("user_id, platform, username, account_link, follower_count").in("user_id", profiles.map(p => p.id)).eq("is_verified", true);

      if (selectedPlatforms.length > 0) {
        socialQuery = socialQuery.in('platform', selectedPlatforms);
      }

      const { data: socialAccounts } = await socialQuery;
      let creatorsWithSocial: DiscoverableCreator[] = profiles.map(profile => ({
        ...profile,
        social_accounts: (socialAccounts || []).filter(sa => sa.user_id === profile.id).map(sa => ({
          platform: sa.platform,
          username: sa.username,
          account_link: sa.account_link,
          follower_count: sa.follower_count
        }))
      }));

      // Filter by social accounts
      creatorsWithSocial = creatorsWithSocial.filter(c => c.social_accounts.length > 0);

      // Filter by niches
      if (selectedNiches.length > 0) {
        creatorsWithSocial = creatorsWithSocial.filter(c =>
          c.content_niches?.some(niche => selectedNiches.includes(niche))
        );
      }

      // Filter by follower count
      if (selectedFollowerRange !== 'any') {
        const minFollowers = getMinFollowers(selectedFollowerRange);
        creatorsWithSocial = creatorsWithSocial.filter(c => {
          const maxFollowers = Math.max(...c.social_accounts.map(a => a.follower_count || 0), 0);
          return maxFollowers >= minFollowers;
        });
      }

      setCreators(creatorsWithSocial);
    } catch (error) {
      console.error("Error fetching discoverable creators:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMinFollowers = (range: string): number => {
    switch (range) {
      case '1k': return 1000;
      case '10k': return 10000;
      case '50k': return 50000;
      case '100k': return 100000;
      case '500k': return 500000;
      case '1m': return 1000000;
      default: return 0;
    }
  };

  const formatFollowerCount = (count: number | null) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const toggleSelection = (item: string, selected: string[], setSelected: (items: string[]) => void) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(i => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedNiches.length > 0) count++;
    if (selectedPlatforms.length > 0) count++;
    if (selectedFollowerRange !== 'any') count++;
    if (selectedCountries.length > 0) count++;
    if (selectedStyles.length > 0) count++;
    return count;
  };

  // Subscription gate check
  if (hasActivePlan === false) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-5">
              <img src={vpnKeyIcon} alt="Key" className="h-8 w-8" />
            </div>
            <h3 className="font-semibold text-lg mb-2 tracking-[-0.5px]">
              Upgrade to Access
            </h3>
            <p className="text-sm text-muted-foreground mb-5 font-inter tracking-[-0.5px]">
              Subscribe to browse and message creators for your campaigns
            </p>
            <button
              onClick={() => setSubscriptionGateOpen(true)}
              className="py-2 px-4 bg-[#1f60dd] border-t border-[#4b85f7] rounded-lg font-['Inter'] text-[14px] font-medium tracking-[-0.5px] text-white hover:bg-[#1a50c8] transition-colors flex items-center justify-center gap-2"
            >
              <img src={vpnKeyIcon} alt="" className="h-4 w-4" />
              Upgrade Plan
            </button>
          </div>
          <SubscriptionGateDialog brandId={brandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] w-[95vw] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Stepper Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {currentStep > step.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={cn(
                    "text-[9px] mt-1 font-medium font-inter tracking-[-0.3px]",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-1.5 transition-colors",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Niche Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold font-geist tracking-[-0.5px]">What niches are you looking for?</h3>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">Select one or more content categories</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {NICHES.map((niche) => (
                  <button
                    key={niche}
                    type="button"
                    onClick={() => toggleSelection(niche, selectedNiches, setSelectedNiches)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                      selectedNiches.includes(niche)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-muted-foreground border-border/50 hover:border-border hover:bg-muted/50"
                    )}
                  >
                    {niche}
                  </button>
                ))}
              </div>
              {selectedNiches.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {selectedNiches.length} selected
                </p>
              )}
            </div>
          )}

          {/* Step 2: Platform Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold font-geist tracking-[-0.5px]">Which platforms?</h3>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">Select the platforms you want creators on</p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => toggleSelection(platform.id, selectedPlatforms, setSelectedPlatforms)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                      selectedPlatforms.includes(platform.id)
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    )}
                  >
                    <img src={PLATFORM_LOGOS[platform.id]} alt={platform.label} className="h-6 w-6 object-contain" />
                    <span className="font-medium text-sm">{platform.label}</span>
                    {selectedPlatforms.includes(platform.id) && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Follower Range */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold font-geist tracking-[-0.5px]">Minimum follower count?</h3>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">Choose the creator size that fits your needs</p>
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                {FOLLOWER_RANGES.map((range) => (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => setSelectedFollowerRange(range.value)}
                    className={cn(
                      "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between",
                      selectedFollowerRange === range.value
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">{range.label}</p>
                      <p className="text-xs text-muted-foreground">{range.description}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedFollowerRange === range.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {selectedFollowerRange === range.value && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Country Selection */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold font-geist tracking-[-0.5px]">Target countries?</h3>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">Select where your target audience is (optional)</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {COUNTRIES.map((country) => (
                  <button
                    key={country}
                    type="button"
                    onClick={() => toggleSelection(country, selectedCountries, setSelectedCountries)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      selectedCountries.includes(country)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-muted-foreground border-border/50 hover:border-border hover:bg-muted/50"
                    )}
                  >
                    {country}
                  </button>
                ))}
              </div>
              {selectedCountries.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {selectedCountries.length} selected
                </p>
              )}
            </div>
          )}

          {/* Step 5: Content Style */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold font-geist tracking-[-0.5px]">Content style preferences?</h3>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">What type of content works best for you (optional)</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {CONTENT_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleSelection(style, selectedStyles, setSelectedStyles)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      selectedStyles.includes(style)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-muted-foreground border-border/50 hover:border-border hover:bg-muted/50"
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
              {selectedStyles.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {selectedStyles.length} selected
                </p>
              )}
            </div>
          )}

          {/* Step 6: Results */}
          {currentStep === 6 && (
            <div className="space-y-4">
              {/* Filter Summary */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold font-geist tracking-[-0.5px]">
                    {loading ? 'Searching...' : `${creators.length} creators found`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {getActiveFiltersCount()} filters applied
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                  Modify Filters
                </Button>
              </div>

              {/* Loading */}
              {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/50 bg-card/30 p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-1.5" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && creators.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Users className="h-7 w-7 text-muted-foreground/60" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">No creators found</h3>
                  <p className="text-xs text-muted-foreground max-w-[240px] mb-4">
                    Try adjusting your filters to find more creators
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                    Modify Filters
                  </Button>
                </div>
              )}

              {/* Results Grid */}
              {!loading && creators.length > 0 && (
                <ScrollArea className="h-[350px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-2">
                    {creators.map(creator => (
                      <div key={creator.id} className="rounded-xl border border-border/50 bg-card/30 hover:bg-muted/30 transition-all p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-10 w-10 ring-1 ring-border">
                            <AvatarImage src={creator.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                              {creator.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm truncate">
                                {creator.full_name || creator.username}
                              </h4>
                              <div className="flex items-center gap-1">
                                {creator.social_accounts.slice(0, 2).map(account => (
                                  <img key={account.platform} src={PLATFORM_LOGOS[account.platform]} alt={account.platform} className="h-3 w-3 object-contain opacity-60" />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {[creator.city, creator.country].filter(Boolean).join(" • ") || `@${creator.username}`}
                            </p>
                          </div>
                        </div>

                        {/* Niches */}
                        {creator.content_niches && creator.content_niches.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {creator.content_niches.slice(0, 2).map(niche => (
                              <Badge key={niche} variant="secondary" className="text-[10px] px-2 py-0 rounded-full bg-muted/50">
                                {niche}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Follower counts */}
                        {creator.social_accounts.some(a => a.follower_count) && (
                          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                            {creator.social_accounts.filter(a => a.follower_count).slice(0, 2).map(account => (
                              <span key={account.platform} className="flex items-center gap-1">
                                <img src={PLATFORM_LOGOS[account.platform]} alt={account.platform} className="h-3 w-3 object-contain" />
                                {formatFollowerCount(account.follower_count)}
                              </span>
                            ))}
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full h-8 rounded-full text-xs bg-foreground text-background hover:bg-foreground/90"
                          onClick={() => {
                            if (onStartConversation) {
                              onStartConversation(creator.id, creator.full_name || creator.username);
                              onOpenChange(false);
                            }
                          }}
                        >
                          <MessageSquare className="h-3 w-3 mr-1.5" />
                          Message
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between bg-background border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
            className="font-inter tracking-[-0.5px]"
          >
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          {currentStep < 6 && (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="min-w-[100px] gap-2 font-inter tracking-[-0.5px]"
            >
              {currentStep === 5 ? 'Find Creators' : 'Continue'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>

      <SubscriptionGateDialog brandId={brandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />
    </Dialog>
  );
}
