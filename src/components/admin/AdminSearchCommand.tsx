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

  const groupedResults = {
    users: results.filter(r => r.type === 'user'),
    brands: results.filter(r => r.type === 'brand'),
    campaigns: results.filter(r => r.type === 'campaign'),
    accounts: results.filter(r => r.type === 'account'),
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search users, brands, campaigns, accounts..."
        value={query}
        onValueChange={setQuery}
        className="font-inter tracking-[-0.5px]"
      />
      <CommandList>
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground font-inter tracking-[-0.5px]">
          {loading ? "Searching..." : "No results found."}
        </CommandEmpty>

        {groupedResults.users.length > 0 && (
          <CommandGroup heading="Users">
            {groupedResults.users.map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={result.image || ''} />
                  <AvatarFallback className="text-xs bg-muted">
                    <MaterialIcon name={getIcon(result.type)} className="text-base" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate">{result.subtitle}</p>
                  )}
                </div>
                <MaterialIcon name={getIcon(result.type)} className="text-lg text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {groupedResults.users.length > 0 && groupedResults.brands.length > 0 && <CommandSeparator />}

        {groupedResults.brands.length > 0 && (
          <CommandGroup heading="Brands">
            {groupedResults.brands.map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={result.image || ''} />
                  <AvatarFallback className="text-xs bg-muted">
                    <MaterialIcon name={getIcon(result.type)} className="text-base" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate capitalize">{result.subtitle}</p>
                  )}
                </div>
                <MaterialIcon name={getIcon(result.type)} className="text-lg text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {groupedResults.brands.length > 0 && groupedResults.campaigns.length > 0 && <CommandSeparator />}

        {groupedResults.campaigns.length > 0 && (
          <CommandGroup heading="Campaigns">
            {groupedResults.campaigns.map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={result.image || ''} />
                  <AvatarFallback className="text-xs bg-muted">
                    <MaterialIcon name={getIcon(result.type)} className="text-base" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate">{result.subtitle}</p>
                  )}
                </div>
                <MaterialIcon name={getIcon(result.type)} className="text-lg text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {groupedResults.campaigns.length > 0 && groupedResults.accounts.length > 0 && <CommandSeparator />}

        {groupedResults.accounts.length > 0 && (
          <CommandGroup heading="Social Accounts">
            {groupedResults.accounts.map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={result.image || ''} />
                  <AvatarFallback className="text-xs bg-muted">
                    <MaterialIcon name={getIcon(result.type)} className="text-base" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate capitalize">{result.subtitle}</p>
                  )}
                </div>
                <MaterialIcon name={getIcon(result.type)} className="text-lg text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
