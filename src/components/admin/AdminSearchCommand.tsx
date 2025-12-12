import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";
import xLogoLight from "@/assets/x-logo-light.png";
import xLogoDark from "@/assets/x-logo.png";

interface SearchResult {
  id: string;
  type: 'user' | 'brand' | 'campaign' | 'account';
  title: string;
  subtitle?: string;
  image?: string | null;
  path: string;
  platform?: string;
}

function MaterialIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("material-symbols-rounded", className)} style={{ fontSize: 'inherit' }}>
      {name}
    </span>
  );
}

interface AdminSearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SearchFilter = 'all' | 'user' | 'brand' | 'campaign' | 'account';

export function AdminSearchCommand({ open, onOpenChange }: AdminSearchCommandProps) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>('all');

  const getPlatformLogo = (platform: string) => {
    const isDark = resolvedTheme === 'dark';
    switch (platform?.toLowerCase()) {
      case 'tiktok':
        return isDark ? tiktokLogoWhite : tiktokLogoBlack;
      case 'instagram':
        return isDark ? instagramLogoWhite : instagramLogoBlack;
      case 'youtube':
        return isDark ? youtubeLogoWhite : youtubeLogoBlack;
      case 'x':
      case 'twitter':
        return isDark ? xLogoLight : xLogoDark;
      default:
        return null;
    }
  };

  const filterOptions: { value: SearchFilter; label: string; icon: string; color: string }[] = [
    { value: 'all', label: 'All', icon: 'apps', color: 'text-muted-foreground' },
    { value: 'user', label: 'Users', icon: 'person', color: 'text-blue-500' },
    { value: 'brand', label: 'Brands', icon: 'inventory_2', color: 'text-purple-500' },
    { value: 'campaign', label: 'Campaigns', icon: 'campaign', color: 'text-emerald-500' },
    { value: 'account', label: 'Accounts', icon: 'alternate_email', color: 'text-orange-500' },
  ];

  const search = useCallback(async (searchQuery: string, activeFilter: SearchFilter) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search users
      if (activeFilter === 'all' || activeFilter === 'user') {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, email')
          .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(activeFilter === 'user' ? 20 : 5);

        if (users) {
          searchResults.push(...users.map(user => ({
            id: user.id,
            type: 'user' as const,
            title: user.full_name || user.username,
            subtitle: user.email || `@${user.username}`,
            image: user.avatar_url,
            path: `/admin/users?search=${user.username}`,
          })));
        }
      }

      // Search brands
      if (activeFilter === 'all' || activeFilter === 'brand') {
        const { data: brands } = await supabase
          .from('brands')
          .select('id, name, slug, logo_url, brand_type')
          .or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`)
          .limit(activeFilter === 'brand' ? 20 : 5);

        if (brands) {
          searchResults.push(...brands.map(brand => ({
            id: brand.id,
            type: 'brand' as const,
            title: brand.name,
            subtitle: brand.brand_type || brand.slug,
            image: brand.logo_url,
            path: `/admin/brands`,
          })));
        }
      }

      // Search campaigns
      if (activeFilter === 'all' || activeFilter === 'campaign') {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, title, slug, brand_name, brand_logo_url')
          .or(`title.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,brand_name.ilike.%${searchQuery}%`)
          .limit(activeFilter === 'campaign' ? 20 : 5);

        if (campaigns) {
          searchResults.push(...campaigns.map(campaign => ({
            id: campaign.id,
            type: 'campaign' as const,
            title: campaign.title,
            subtitle: campaign.brand_name,
            image: campaign.brand_logo_url,
            path: `/admin/campaigns`,
          })));
        }
      }

      // Search social accounts
      if (activeFilter === 'all' || activeFilter === 'account') {
        const { data: accounts } = await supabase
          .from('social_accounts')
          .select('id, username, platform, avatar_url, user_id')
          .ilike('username', `%${searchQuery}%`)
          .limit(activeFilter === 'account' ? 20 : 5);

        if (accounts) {
          searchResults.push(...accounts.map(account => ({
            id: account.id,
            type: 'account' as const,
            title: `@${account.username}`,
            subtitle: account.platform,
            image: account.avatar_url,
            path: `/admin/users?search=${account.username}`,
            platform: account.platform,
          })));
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query, filter);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filter, search]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    setQuery("");
    navigate(result.path);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return 'person';
      case 'brand': return 'inventory_2';
      case 'campaign': return 'campaign';
      case 'account': return 'alternate_email';
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'brand': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'campaign': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'account': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return 'User';
      case 'brand': return 'Brand';
      case 'campaign': return 'Campaign';
      case 'account': return 'Account';
    }
  };

  const groupedResults = {
    users: results.filter(r => r.type === 'user'),
    brands: results.filter(r => r.type === 'brand'),
    campaigns: results.filter(r => r.type === 'campaign'),
    accounts: results.filter(r => r.type === 'account'),
  };

  const ResultItem = ({ result }: { result: SearchResult }) => {
    const platformLogo = result.type === 'account' && result.platform ? getPlatformLogo(result.platform) : null;
    
    return (
      <CommandItem
        key={result.id}
        value={result.title}
        onSelect={() => handleSelect(result)}
        className="flex items-center gap-3 px-3 py-3 cursor-pointer rounded-lg mx-2 mb-1 data-[selected=true]:bg-white/5 border-0 transition-all"
      >
        <div className="relative">
          <Avatar className="h-10 w-10 shrink-0 shadow-sm">
            <AvatarImage src={result.image || ''} className="object-cover" />
            <AvatarFallback className="text-xs bg-white/10 font-inter text-white">
              {result.title.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]",
            result.type === 'user' && "bg-blue-500",
            result.type === 'brand' && "bg-purple-500",
            result.type === 'campaign' && "bg-emerald-500",
            result.type === 'account' && "bg-orange-500"
          )}>
            {result.type === 'account' && platformLogo ? (
              <img src={platformLogo} alt={result.platform} className="w-3 h-3 object-contain" />
            ) : (
              <MaterialIcon name={getIcon(result.type)} className="text-[10px] text-white" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate text-white">{result.title}</p>
            <span className={cn(
              "text-[10px] font-medium font-inter tracking-[-0.5px] px-1.5 py-0.5 rounded border-0 shrink-0",
              getTypeColor(result.type)
            )}>
              {getTypeLabel(result.type)}
            </span>
          </div>
          {result.subtitle && (
            <p className="text-xs text-white/50 font-inter tracking-[-0.5px] truncate mt-0.5 capitalize">{result.subtitle}</p>
          )}
        </div>
        <MaterialIcon name="arrow_forward" className="text-base text-white/30" />
      </CommandItem>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <MaterialIcon name="search" className="text-base text-white" />
        </div>
        <CommandInput
          placeholder="Search users, brands, campaigns, accounts..."
          value={query}
          onValueChange={setQuery}
          className="font-inter tracking-[-0.5px] border-0 focus:ring-0 px-0 text-white placeholder:text-white/40"
        />
      </div>
      
      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium font-inter tracking-[-0.5px] transition-all",
              filter === opt.value
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70 hover:bg-white/5"
            )}
          >
            <MaterialIcon name={opt.icon} className={cn("text-sm", filter === opt.value ? opt.color : "")} />
            {opt.label}
          </button>
        ))}
      </div>
      
      <CommandList className="max-h-[350px] py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin" />
            <p className="text-sm text-white/50 font-inter tracking-[-0.5px]">Searching...</p>
          </div>
        ) : results.length === 0 && query ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <MaterialIcon name="search_off" className="text-2xl text-white/30" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium font-inter tracking-[-0.5px] text-white">No results found</p>
              <p className="text-xs text-white/50 font-inter tracking-[-0.5px] mt-1">Try a different search term</p>
            </div>
          </div>
        ) : !query ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <MaterialIcon name="keyboard" className="text-2xl text-white/30" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium font-inter tracking-[-0.5px] text-white">Start typing to search</p>
              <p className="text-xs text-white/50 font-inter tracking-[-0.5px] mt-1">Search across users, brands, campaigns & accounts</p>
            </div>
          </div>
        ) : (
          <>
            {groupedResults.users.length > 0 && (
              <CommandGroup>
                <div className="flex items-center gap-2 px-4 py-2">
                  <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <MaterialIcon name="person" className="text-xs text-blue-500" />
                  </div>
                  <span className="text-xs font-medium text-white/50 font-inter tracking-[-0.5px] uppercase">Users</span>
                  <span className="text-[10px] text-white/30 font-inter">{groupedResults.users.length}</span>
                </div>
                {groupedResults.users.map((result) => (
                  <ResultItem key={result.id} result={result} />
                ))}
              </CommandGroup>
            )}

            {groupedResults.brands.length > 0 && (
              <CommandGroup>
                <div className="flex items-center gap-2 px-4 py-2 mt-2">
                  <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                    <MaterialIcon name="inventory_2" className="text-xs text-purple-500" />
                  </div>
                  <span className="text-xs font-medium text-white/50 font-inter tracking-[-0.5px] uppercase">Brands</span>
                  <span className="text-[10px] text-white/30 font-inter">{groupedResults.brands.length}</span>
                </div>
                {groupedResults.brands.map((result) => (
                  <ResultItem key={result.id} result={result} />
                ))}
              </CommandGroup>
            )}

            {groupedResults.campaigns.length > 0 && (
              <CommandGroup>
                <div className="flex items-center gap-2 px-4 py-2 mt-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                    <MaterialIcon name="campaign" className="text-xs text-emerald-500" />
                  </div>
                  <span className="text-xs font-medium text-white/50 font-inter tracking-[-0.5px] uppercase">Campaigns</span>
                  <span className="text-[10px] text-white/30 font-inter">{groupedResults.campaigns.length}</span>
                </div>
                {groupedResults.campaigns.map((result) => (
                  <ResultItem key={result.id} result={result} />
                ))}
              </CommandGroup>
            )}

            {groupedResults.accounts.length > 0 && (
              <CommandGroup>
                <div className="flex items-center gap-2 px-4 py-2 mt-2">
                  <div className="w-6 h-6 rounded-md bg-orange-500/10 flex items-center justify-center">
                    <MaterialIcon name="alternate_email" className="text-xs text-orange-500" />
                  </div>
                  <span className="text-xs font-medium text-white/50 font-inter tracking-[-0.5px] uppercase">Social Accounts</span>
                  <span className="text-[10px] text-white/30 font-inter">{groupedResults.accounts.length}</span>
                </div>
                {groupedResults.accounts.map((result) => (
                  <ResultItem key={result.id} result={result} />
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
