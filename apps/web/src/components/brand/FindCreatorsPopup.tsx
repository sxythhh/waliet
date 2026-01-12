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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@iconify/react";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";

interface FindCreatorsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onCreatorAdded?: () => void;
}

interface SearchResult {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
    follower_count: number | null;
  }[];
}

interface Campaign {
  id: string;
  title: string;
  type: "campaign" | "boost";
}

type InputType = "search" | "email" | "handle" | "ambiguous";
type ViewMode = "search" | "invite";

export function FindCreatorsPopup({
  open,
  onOpenChange,
  brandId,
  onCreatorAdded,
}: FindCreatorsPopupProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Input state
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<InputType>("search");
  const [viewMode, setViewMode] = useState<ViewMode>("search");

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingCreator, setAddingCreator] = useState<string | null>(null);
  const [existingCreatorIds, setExistingCreatorIds] = useState<Set<string>>(new Set());

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sendingInvite, setSendingInvite] = useState(false);

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

  const formatFollowerCount = (count: number | null) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Detect input type based on content
  const detectInputType = (value: string): InputType => {
    const trimmed = value.trim();
    if (!trimmed) return "search";

    // Email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(trimmed)) return "email";

    // Handle pattern (starts with @)
    if (trimmed.startsWith("@")) return "handle";

    // Looks like email but not complete
    if (trimmed.includes("@") && !emailRegex.test(trimmed)) return "ambiguous";

    return "search";
  };

  // Update input type when value changes
  useEffect(() => {
    const type = detectInputType(inputValue);
    setInputType(type);
  }, [inputValue]);

  // Fetch campaigns and existing creators when dialog opens
  useEffect(() => {
    if (open) {
      fetchCampaigns();
      fetchExistingCreators();
    }
  }, [open, brandId]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("bounty_campaigns")
        .select("id, title, type")
        .eq("brand_id", brandId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };

  const fetchExistingCreators = async () => {
    try {
      const { data, error } = await supabase
        .from("brand_creator_relationships")
        .select("user_id")
        .eq("brand_id", brandId);

      if (error) throw error;
      setExistingCreatorIds(new Set((data || []).map((r) => r.user_id)));
    } catch (error) {
      console.error("Error fetching existing creators:", error);
    }
  };

  // Search creators
  const searchCreators = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchTerm = query.startsWith("@") ? query.slice(1) : query;

      // Search profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio")
        .eq("onboarding_completed", true)
        .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      // Fetch social accounts for these profiles
      const { data: socialAccounts } = await supabase
        .from("social_accounts")
        .select("user_id, platform, username, account_link, follower_count")
        .in("user_id", profiles.map((p) => p.id))
        .eq("is_verified", true);

      // Build results with social data
      const results: SearchResult[] = profiles.map((profile) => ({
        ...profile,
        social_accounts: (socialAccounts || [])
          .filter((sa) => sa.user_id === profile.id)
          .map((sa) => ({
            platform: sa.platform,
            username: sa.username,
            account_link: sa.account_link,
            follower_count: sa.follower_count,
          })),
      }));

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching creators:", error);
      toast.error("Failed to search creators");
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (viewMode !== "search") return;
    if (inputType === "email") return; // Don't search for emails

    const timer = setTimeout(() => {
      searchCreators(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, inputType, viewMode]);

  // Add creator to database
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
        // Update local state to reflect this
        setExistingCreatorIds((prev) => new Set([...prev, creatorId]));
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

      // Update local state
      setExistingCreatorIds((prev) => new Set([...prev, creatorId]));
      toast.success("Creator added to your database");
      onCreatorAdded?.();
    } catch (error) {
      console.error("Error adding creator:", error);
      toast.error("Failed to add creator");
    } finally {
      setAddingCreator(null);
    }
  };

  // Send invite (stubbed for now)
  const sendInvite = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setSendingInvite(true);
    try {
      // TODO: Backend implementation
      // This is a UI shell only - the actual invite sending will be implemented later
      // The flow will:
      // 1. Create a phantom profile with the email
      // 2. Send a co-branded email invitation
      // 3. If campaign selected, pre-approve them for that campaign
      // 4. Auto-merge when they sign up

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(
        selectedCampaign
          ? "Invite sent! They'll be pre-approved for the campaign when they sign up."
          : "Invite sent! They'll appear in your database when they sign up."
      );

      // Reset form
      setInviteEmail("");
      setInviteName("");
      setSelectedCampaign("");
      setViewMode("search");
      setInputValue("");
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Failed to send invite");
    } finally {
      setSendingInvite(false);
    }
  };

  // Handle email action
  const handleEmailAction = () => {
    setInviteEmail(inputValue.trim());
    setViewMode("invite");
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue("");
      setSearchResults([]);
      setViewMode("search");
      setInviteEmail("");
      setInviteName("");
      setSelectedCampaign("");
    }
  }, [open]);

  // Get placeholder text based on input type
  const getPlaceholder = () => {
    return "Search by name, @handle, or enter email to invite...";
  };

  // Get hint text based on input type
  const getHintText = () => {
    switch (inputType) {
      case "email":
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Icon icon="material-symbols:mail-outline-rounded" className="h-3.5 w-3.5 text-primary" />
            <span>Press Enter to send an invite to this email</span>
          </div>
        );
      case "handle":
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Icon icon="material-symbols:alternate-email-rounded" className="h-3.5 w-3.5 text-primary" />
            <span>Searching for @{inputValue.slice(1)}...</span>
          </div>
        );
      case "ambiguous":
        return (
          <div className="flex items-center gap-2 text-xs text-amber-500 mt-2">
            <Icon icon="material-symbols:person-outline-rounded" className="h-3.5 w-3.5" />
            <span>Type a complete email to send an invite, or remove @ to search by name</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputType === "email") {
      e.preventDefault();
      handleEmailAction();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-card dark:bg-[#0e0e0e] border-border dark:border-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            {viewMode === "invite" ? "Invite Creator" : "Find Creators"}
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            {viewMode === "invite"
              ? "Send an invite to join your creator network"
              : "Search existing creators or invite new ones via email"
            }
          </DialogDescription>
        </DialogHeader>

        {viewMode === "search" ? (
          <>
            {/* Smart Search Input */}
            <div className="relative">
              <div className="relative">
                {inputType === "email" ? (
                  <Icon icon="material-symbols:mail-outline-rounded" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                ) : inputType === "handle" ? (
                  <Icon icon="material-symbols:alternate-email-rounded" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                ) : (
                  <Icon icon="material-symbols:search-rounded" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={getPlaceholder()}
                  className="pl-9 h-11 font-inter tracking-[-0.3px] bg-muted/30 dark:bg-muted/20 border-border/50"
                  autoFocus
                />
                {inputType === "email" && (
                  <Button
                    size="sm"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 gap-1.5 text-xs"
                    onClick={handleEmailAction}
                  >
                    <Icon icon="material-symbols:send-rounded" className="h-3.5 w-3.5" />
                    Invite
                  </Button>
                )}
              </div>
              {getHintText()}
            </div>

            {/* Results */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Icon icon="material-symbols:progress-activity" className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2 py-2">
                  {searchResults.map((creator) => (
                    <div
                      key={creator.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
                    >
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={creator.avatar_url || ""} />
                        <AvatarFallback className="text-sm bg-muted/80 dark:bg-muted text-foreground">
                          {creator.username?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm font-inter tracking-[-0.5px] truncate">
                            {creator.full_name || creator.username}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                          @{creator.username}
                        </p>
                        {creator.social_accounts.length > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            {creator.social_accounts.slice(0, 3).map((social) => {
                              const logo = getPlatformLogo(social.platform);
                              if (!logo) return null;
                              return (
                                <div
                                  key={social.platform}
                                  className="flex items-center gap-1"
                                >
                                  <img
                                    src={logo}
                                    alt={social.platform}
                                    className="w-3.5 h-3.5"
                                  />
                                  {social.follower_count != null && social.follower_count > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatFollowerCount(social.follower_count)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-border/50"
                          onClick={() => window.open(`/@${creator.username}`, "_blank")}
                        >
                          <Icon icon="material-symbols:open-in-new-rounded" className="h-3.5 w-3.5" />
                        </Button>
                        {existingCreatorIds.has(creator.id) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 px-3 border-green-500/30 text-green-600 dark:text-green-400"
                            disabled
                          >
                            <Icon icon="material-symbols:check-rounded" className="h-3.5 w-3.5" />
                            Added
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 px-3"
                            onClick={() => addCreatorToDatabase(creator.id)}
                            disabled={addingCreator === creator.id}
                          >
                            {addingCreator === creator.id ? (
                              <Icon icon="material-symbols:progress-activity" className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Icon icon="material-symbols:add-rounded" className="h-3.5 w-3.5" />
                                Add
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : inputValue.length >= 2 && inputType !== "email" ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Icon icon="material-symbols:person-outline-rounded" className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    No creators found for "{inputValue}"
                  </p>
                  <p className="text-xs text-muted-foreground/70 font-inter tracking-[-0.3px] mt-1">
                    Try a different search or invite them via email
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => {
                      setInputValue("");
                      setViewMode("invite");
                    }}
                  >
                    <Icon icon="material-symbols:mail-outline-rounded" className="h-3.5 w-3.5" />
                    Invite via email
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Icon icon="material-symbols:search-rounded" className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    Search for creators by name or @handle
                  </p>
                  <p className="text-xs text-muted-foreground/70 font-inter tracking-[-0.3px] mt-1">
                    Or enter an email address to send an invite
                  </p>
                </div>
              )}
            </ScrollArea>

            {/* Quick Invite Button */}
            <div className="pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11 text-sm font-inter tracking-[-0.3px] hover:bg-muted/30"
                onClick={() => setViewMode("invite")}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon icon="material-symbols:person-add-outline-rounded" className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <span className="block font-medium">Invite a new creator</span>
                  <span className="text-xs text-muted-foreground">
                    Send an email invite to join your network
                  </span>
                </div>
              </Button>
            </div>
          </>
        ) : (
          /* Invite Form */
          <div className="space-y-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setViewMode("search");
                setInviteEmail("");
                setInviteName("");
              }}
            >
              <Icon icon="material-symbols:arrow-back-rounded" className="h-4 w-4" />
              Back to search
            </Button>

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label className="text-xs font-medium font-inter tracking-[-0.3px]">
                  Email address <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="creator@example.com"
                  className="h-11 font-inter tracking-[-0.3px] bg-muted/30 dark:bg-muted/20 border-border/50"
                  autoFocus
                />
              </div>

              {/* Name Input (Optional) */}
              <div className="space-y-2">
                <Label className="text-xs font-medium font-inter tracking-[-0.3px]">
                  Name <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Their name for personalization"
                  className="h-11 font-inter tracking-[-0.3px] bg-muted/30 dark:bg-muted/20 border-border/50"
                />
              </div>

              {/* Campaign Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium font-inter tracking-[-0.3px]">
                  Pre-approve for campaign{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger className="h-11 font-inter tracking-[-0.3px] bg-muted/30 dark:bg-muted/20 border-border/50">
                    <SelectValue placeholder="No campaign (just invite to network)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No campaign (just invite to network)</span>
                    </SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex items-center gap-2">
                          <span>{campaign.title}</span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {campaign.type === "campaign" ? "Clipping" : "Boost"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground font-inter tracking-[-0.3px]">
                  {selectedCampaign && selectedCampaign !== "none"
                    ? "They'll skip the application and be auto-approved when they sign up"
                    : "They'll be added to your creator network when they sign up"
                  }
                </p>
              </div>
            </div>

            {/* Info Card */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon icon="material-symbols:mail-outline-rounded" className="h-4 w-4 text-primary" />
                </div>
                <div className="text-xs font-inter tracking-[-0.3px]">
                  <p className="font-medium text-foreground">What happens next?</p>
                  <p className="text-muted-foreground mt-1">
                    We'll send them a branded email invitation from Virality on your behalf.
                    When they sign up, they'll automatically appear in your creator database.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-11 gap-2"
              onClick={sendInvite}
              disabled={!inviteEmail || sendingInvite}
            >
              {sendingInvite ? (
                <Icon icon="material-symbols:progress-activity" className="h-4 w-4 animate-spin" />
              ) : (
                <Icon icon="material-symbols:send-rounded" className="h-4 w-4" />
              )}
              Send Invite
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
