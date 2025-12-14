import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
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
  const {
    resolvedTheme
  } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const PLATFORM_LOGOS = useMemo(() => getPlatformLogos(isDark), [isDark]);
  const [creators, setCreators] = useState<DiscoverableCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    if (open) {
      fetchDiscoverableCreators();
    }
  }, [open, brandId]);
  const fetchDiscoverableCreators = async () => {
    setLoading(true);
    try {
      // Fetch creators with social accounts who have verified their accounts
      const {
        data: profiles,
        error
      } = await supabase.from("profiles").select("id, username, full_name, avatar_url, bio, city, country, content_niches").eq("onboarding_completed", true).limit(50);
      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        setCreators([]);
        setLoading(false);
        return;
      }

      // Fetch social accounts for these profiles
      const {
        data: socialAccounts
      } = await supabase.from("social_accounts").select("user_id, platform, username, account_link, follower_count").in("user_id", profiles.map(p => p.id)).eq("is_verified", true);

      // Map social accounts to creators
      const creatorsWithSocial: DiscoverableCreator[] = profiles.map(profile => ({
        ...profile,
        social_accounts: (socialAccounts || []).filter(sa => sa.user_id === profile.id).map(sa => ({
          platform: sa.platform,
          username: sa.username,
          account_link: sa.account_link,
          follower_count: sa.follower_count
        }))
      }));

      // Filter to only show creators with at least one social account
      setCreators(creatorsWithSocial.filter(c => c.social_accounts.length > 0));
    } catch (error) {
      console.error("Error fetching discoverable creators:", error);
    } finally {
      setLoading(false);
    }
  };
  const filteredCreators = creators.filter(creator => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return creator.username.toLowerCase().includes(query) || creator.full_name?.toLowerCase().includes(query) || creator.bio?.toLowerCase().includes(query) || creator.content_niches?.some(n => n.toLowerCase().includes(query));
  });
  const formatFollowerCount = (count: number | null) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#141414]/0">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-[-0.5px]">
              Recruit Creators
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1 font-inter tracking-[-0.5px]">
            Discover and reach out to creators for your campaigns
          </p>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, niche, or username..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-11 bg-muted/30 border-0 font-inter tracking-[-0.5px]" />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 h-full">
          <div className="p-6">
            {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <div key={i} className="rounded-xl border border-border/50 bg-card/30 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <Skeleton className="h-4 w-20 rounded-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-5 w-5 rounded" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 mb-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-28 mb-1.5 rounded" />
                        <Skeleton className="h-3 w-36 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-12 w-full mb-4 rounded" />
                    <div className="flex gap-2 mb-4">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-full" />
                  </div>)}
              </div> : filteredCreators.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
                  <Users className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="font-semibold text-base mb-2">No creators found</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] font-inter tracking-[-0.5px]">
                  {searchQuery ? "Try adjusting your search criteria" : "No verified creators are available yet"}
                </p>
              </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCreators.map(creator => <div key={creator.id} className="rounded-xl border border-border/50 bg-card/30 hover:bg-muted/30 transition-all duration-200 overflow-hidden">
                    {/* Status & Platforms Row */}
                    <div className="px-5 pt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                        Active now
                      </span>
                      <div className="flex items-center gap-2">
                        {creator.social_accounts.slice(0, 3).map(account => <a key={`${account.platform}-${account.username}`} href={account.account_link || "#"} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <img src={PLATFORM_LOGOS[account.platform]} alt={account.platform} className="h-4 w-4 object-contain" />
                          </a>)}
                      </div>
                    </div>

                    {/* Creator Info */}
                    <div className="px-5 py-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-12 w-12 ring-1 ring-border">
                          <AvatarImage src={creator.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                            {creator.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {creator.full_name || creator.username}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate font-inter tracking-[-0.5px]">
                            {[creator.city, creator.country].filter(Boolean).join(" • ") || `@${creator.username}`}
                          </p>
                        </div>
                      </div>

                      {/* Bio */}
                      {creator.bio && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3 font-inter tracking-[-0.5px]">
                          {creator.bio}
                        </p>}

                      {/* Niches/Tags */}
                      {creator.content_niches && creator.content_niches.length > 0 && <div className="flex flex-wrap gap-1.5 mb-4">
                          {creator.content_niches.slice(0, 2).map(niche => <Badge key={niche} variant="secondary" className="text-[10px] px-2.5 py-0.5 rounded-full bg-muted/50 text-foreground font-inter tracking-[-0.5px]">
                              {niche}
                            </Badge>)}
                        </div>}

                      {/* Follower Count Summary */}
                      {creator.social_accounts.some(a => a.follower_count) && <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                          {creator.social_accounts.filter(a => a.follower_count).slice(0, 2).map(account => <span key={account.platform} className="flex items-center gap-1">
                                <img src={PLATFORM_LOGOS[account.platform]} alt={account.platform} className="h-3 w-3 object-contain" />
                                {formatFollowerCount(account.follower_count)}
                              </span>)}
                        </div>}

                      {/* CTA Button */}
                      <Button variant="outline" size="sm" className="w-full h-9 rounded-full text-xs font-inter tracking-[-0.5px] border-border/50 hover:bg-muted/50" onClick={() => {
                  if (onStartConversation) {
                    onStartConversation(creator.id, creator.full_name || creator.username);
                    onOpenChange(false);
                  }
                }}>
                        <MessageSquare className="h-3.5 w-3.5 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </div>)}
              </div>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>;
}