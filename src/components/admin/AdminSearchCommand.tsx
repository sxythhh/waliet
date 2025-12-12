import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

interface SearchResult {
  id: string;
  type: 'user' | 'brand' | 'campaign' | 'account';
  title: string;
  subtitle?: string;
  image?: string | null;
  path: string;
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

export function AdminSearchCommand({ open, onOpenChange }: AdminSearchCommandProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, email')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(5);

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

      // Search brands
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, slug, logo_url, brand_type')
        .or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`)
        .limit(5);

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

      // Search campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, slug, brand_name, brand_logo_url')
        .or(`title.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,brand_name.ilike.%${searchQuery}%`)
        .limit(5);

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

      // Search social accounts
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('id, username, platform, avatar_url, user_id')
        .ilike('username', `%${searchQuery}%`)
        .limit(5);

      if (accounts) {
        searchResults.push(...accounts.map(account => ({
          id: account.id,
          type: 'account' as const,
          title: `@${account.username}`,
          subtitle: account.platform,
          image: account.avatar_url,
          path: `/admin/users?search=${account.username}`,
        })));
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
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

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

  const ResultItem = ({ result }: { result: SearchResult }) => (
    <CommandItem
      key={result.id}
      value={result.title}
      onSelect={() => handleSelect(result)}
      className="flex items-center gap-3 px-3 py-3 cursor-pointer rounded-lg mx-2 mb-1 data-[selected=true]:bg-muted/50 border border-transparent data-[selected=true]:border-border/50 transition-all"
    >
      <div className="relative">
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background shadow-sm">
          <AvatarImage src={result.image || ''} className="object-cover" />
          <AvatarFallback className="text-xs bg-muted font-inter">
            {result.title.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background",
          result.type === 'user' && "bg-blue-500",
          result.type === 'brand' && "bg-purple-500",
          result.type === 'campaign' && "bg-emerald-500",
          result.type === 'account' && "bg-orange-500"
        )}>
          <MaterialIcon name={getIcon(result.type)} className="text-[10px] text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">{result.title}</p>
          <span className={cn(
            "text-[10px] font-medium font-inter tracking-[-0.5px] px-1.5 py-0.5 rounded border shrink-0",
            getTypeColor(result.type)
          )}>
            {getTypeLabel(result.type)}
          </span>
        </div>
        {result.subtitle && (
          <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate mt-0.5">{result.subtitle}</p>
        )}
      </div>
      <MaterialIcon name="arrow_forward" className="text-base text-muted-foreground/50" />
    </CommandItem>
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <MaterialIcon name="search" className="text-base text-primary" />
        </div>
        <CommandInput
          placeholder="Search users, brands, campaigns, accounts..."
          value={query}
          onValueChange={setQuery}
          className="font-inter tracking-[-0.5px] border-0 focus:ring-0 px-0"
        />
      </div>
      <CommandList className="max-h-[400px] py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Searching...</p>
          </div>
        ) : results.length === 0 && query ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
              <MaterialIcon name="search_off" className="text-2xl text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium font-inter tracking-[-0.5px]">No results found</p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-1">Try a different search term</p>
            </div>
          </div>
        ) : !query ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
              <MaterialIcon name="keyboard" className="text-2xl text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium font-inter tracking-[-0.5px]">Start typing to search</p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-1">Search across users, brands, campaigns & accounts</p>
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
                  <span className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">Users</span>
                  <span className="text-[10px] text-muted-foreground/60 font-inter">{groupedResults.users.length}</span>
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
                  <span className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">Brands</span>
                  <span className="text-[10px] text-muted-foreground/60 font-inter">{groupedResults.brands.length}</span>
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
                  <span className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">Campaigns</span>
                  <span className="text-[10px] text-muted-foreground/60 font-inter">{groupedResults.campaigns.length}</span>
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
                  <span className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">Social Accounts</span>
                  <span className="text-[10px] text-muted-foreground/60 font-inter">{groupedResults.accounts.length}</span>
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
