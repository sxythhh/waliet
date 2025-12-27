import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Video, Users, FileText, Megaphone } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

interface SearchResult {
  id: string;
  type: 'video' | 'creator' | 'blueprint' | 'campaign';
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

interface GlobalBrandSearchProps {
  brandId: string;
}

export function GlobalBrandSearch({ brandId }: GlobalBrandSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setOpen(true);
      }
      // "/" to open search when not in an input
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setOpen(true);
      }
      // Escape to close
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search campaigns/boosts
      const { data: campaigns } = await supabase
        .from("bounty_campaigns")
        .select("id, title, status")
        .eq("brand_id", brandId)
        .ilike("title", `%${searchQuery}%`)
        .limit(5);

      if (campaigns) {
        searchResults.push(...campaigns.map(c => ({
          id: c.id,
          type: 'campaign' as const,
          title: c.title,
          subtitle: c.status
        })));
      }

      // Search clipping campaigns
      const { data: clippingCampaigns } = await supabase
        .from("campaigns")
        .select("id, title, status")
        .eq("brand_id", brandId)
        .ilike("title", `%${searchQuery}%`)
        .limit(5);

      if (clippingCampaigns) {
        searchResults.push(...clippingCampaigns.map(c => ({
          id: c.id,
          type: 'campaign' as const,
          title: c.title,
          subtitle: c.status || 'Clipping Campaign'
        })));
      }

      // Search blueprints
      const { data: blueprints } = await supabase
        .from("blueprints")
        .select("id, title, status")
        .eq("brand_id", brandId)
        .ilike("title", `%${searchQuery}%`)
        .limit(5);

      if (blueprints) {
        searchResults.push(...blueprints.map(b => ({
          id: b.id,
          type: 'blueprint' as const,
          title: b.title,
          subtitle: b.status
        })));
      }

      // Search creators from relationships
      const { data: relationships } = await supabase
        .from("brand_creator_relationships")
        .select(`
          id,
          external_name,
          external_handle,
          user_id,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("brand_id", brandId)
        .limit(10);

      if (relationships) {
        const creatorResults = relationships
          .filter(r => {
            const name = r.profiles?.full_name || r.profiles?.username || r.external_name || r.external_handle || '';
            return name.toLowerCase().includes(searchQuery.toLowerCase());
          })
          .slice(0, 5)
          .map(r => ({
            id: r.id,
            type: 'creator' as const,
            title: r.profiles?.full_name || r.profiles?.username || r.external_name || 'Unknown Creator',
            subtitle: r.external_handle || r.profiles?.username,
            imageUrl: r.profiles?.avatar_url || undefined
          }));
        searchResults.push(...creatorResults);
      }

      // Search videos
      const { data: videos } = await supabase
        .from("cached_campaign_videos")
        .select("id, title, username, thumbnail_url, views, platform")
        .eq("brand_id", brandId)
        .or(`title.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(5);

      if (videos) {
        searchResults.push(...videos.map(v => ({
          id: v.id,
          type: 'video' as const,
          title: v.title || v.username,
          subtitle: `${v.platform} • ${v.views?.toLocaleString() || 0} views`,
          imageUrl: v.thumbnail_url || undefined
        })));
      }

      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  // Handle result selection
  const handleSelect = (result: SearchResult) => {
    const newParams = new URLSearchParams(searchParams);
    
    switch (result.type) {
      case 'campaign':
        newParams.set("tab", "campaigns");
        newParams.set("boost", result.id);
        break;
      case 'blueprint':
        newParams.set("tab", "blueprints");
        newParams.set("blueprint", result.id);
        break;
      case 'creator':
        newParams.set("tab", "creators");
        newParams.set("subtab", "database");
        break;
      case 'video':
        newParams.set("tab", "campaigns");
        break;
    }
    
    setSearchParams(newParams);
    setOpen(false);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'video': return Video;
      case 'creator': return Users;
      case 'blueprint': return FileText;
      case 'campaign': return Megaphone;
    }
  };

  const getCategoryLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'video': return 'Videos';
      case 'creator': return 'Creators';
      case 'blueprint': return 'Blueprints';
      case 'campaign': return 'Campaigns';
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      {/* Search Trigger Bar */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full max-w-md h-10 px-4 rounded-lg transition-colors bg-[#f0f0f0] dark:bg-[#0e0e0e]"
      >
        <Search className="h-4 w-4 text-[#6b6b6b] dark:text-[#616161]" />
        <span className="flex-1 text-left text-sm font-inter tracking-[-0.5px] text-[#6b6b6b] dark:text-[#616161]">
          Filter by campaign name, budget
        </span>
        <div className="flex items-center justify-center h-5 w-5 rounded text-xs font-medium bg-[#e0e0e0] dark:bg-[#1f1f1f] text-[#6b6b6b] dark:text-[#616161]">
          /
        </div>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 overflow-hidden max-w-2xl border-0 bg-white dark:bg-[#0e0e0e]">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e0e0e0] dark:border-[#1f1f1f]">
            <Search className="h-5 w-5 flex-shrink-0 text-[#6b6b6b] dark:text-[#616161]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search campaigns, creators, blueprints, videos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-0 outline-none text-sm font-inter tracking-[-0.5px] text-black dark:text-white placeholder:text-[#6b6b6b] dark:placeholder:text-[#616161]"
            />
            {query && (
              <button onClick={() => setQuery("")} className="p-1 hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] rounded">
                <X className="h-4 w-4 text-[#6b6b6b] dark:text-[#616161]" />
              </button>
            )}
            <div className="flex items-center justify-center h-6 px-1.5 rounded text-xs font-medium bg-[#e0e0e0] dark:bg-[#1f1f1f] text-[#6b6b6b] dark:text-[#616161]">
              ESC
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="p-8 text-center text-[#6b6b6b] dark:text-[#616161]">
                <span className="text-sm font-inter">Searching...</span>
              </div>
            ) : results.length === 0 && query.length >= 2 ? (
              <div className="p-8 text-center text-[#6b6b6b] dark:text-[#616161]">
                <span className="text-sm font-inter">No results found for "{query}"</span>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-[#6b6b6b] dark:text-[#616161]">
                <span className="text-sm font-inter">Start typing to search...</span>
              </div>
            ) : (
              <div className="py-2">
                {Object.entries(groupedResults).map(([type, items]) => (
                  <div key={type}>
                    <div className="px-4 py-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#6b6b6b] dark:text-[#616161]">
                        {getCategoryLabel(type as SearchResult['type'])}
                      </span>
                    </div>
                    {items.map((result, idx) => {
                      const Icon = getIcon(result.type);
                      const globalIndex = results.indexOf(result);
                      const isSelected = globalIndex === selectedIndex;
                      
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-[#f0f0f0] dark:bg-[#1f1f1f]' : 'hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f]/50'
                          }`}
                        >
                          {result.imageUrl ? (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={result.imageUrl} />
                              <AvatarFallback className="bg-[#e0e0e0] dark:bg-[#1f1f1f]">
                                <Icon className="h-4 w-4 text-[#6b6b6b] dark:text-[#616161]" />
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#e0e0e0] dark:bg-[#1f1f1f]">
                              <Icon className="h-4 w-4 text-[#6b6b6b] dark:text-[#616161]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate font-inter tracking-[-0.5px]">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs truncate font-inter text-[#6b6b6b] dark:text-[#616161]">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-[#e0e0e0] dark:border-[#1f1f1f] flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-[#e0e0e0] dark:bg-[#1f1f1f] text-[#6b6b6b] dark:text-[#616161]">↑↓</span>
              <span className="text-xs font-inter text-[#6b6b6b] dark:text-[#616161]">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-[#e0e0e0] dark:bg-[#1f1f1f] text-[#6b6b6b] dark:text-[#616161]">↵</span>
              <span className="text-xs font-inter text-[#6b6b6b] dark:text-[#616161]">Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-[#e0e0e0] dark:bg-[#1f1f1f] text-[#6b6b6b] dark:text-[#616161]">⌘F</span>
              <span className="text-xs font-inter text-[#6b6b6b] dark:text-[#616161]">Open</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
