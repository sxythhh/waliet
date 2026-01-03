import { useState, useEffect, useRef } from "react";
import { Search, X, Sparkles, TrendingUp, Flame, Clock, DollarSign, Gamepad2, Heart, Cpu, Palette, Music, Camera, BookOpen, Globe, Dumbbell, UtensilsCrossed, Shirt, Baby, Dog, Home, Car, Gem, Coins, ShoppingBag, Layers, RotateCcw, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onTypeFilter: (type: 'all' | 'campaigns' | 'boosts') => void;
  onNicheFilter: (niche: string | null) => void;
  onBrowseFilter: (filter: string | null) => void;
  onPlatformFilter: (platform: string | null) => void;
  onSortFilter: (sort: string) => void;
  onStatusFilter: (status: string) => void;
  onSavedFilter: (saved: boolean) => void;
  activeTypeFilter: 'all' | 'campaigns' | 'boosts';
  activeNicheFilter: string | null;
  activeBrowseFilter: string | null;
  activePlatformFilter: string | null;
  activeSortFilter: string;
  activeStatusFilter: string;
  activeSavedFilter: boolean;
}

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'budget-high', label: 'Highest Budget' },
  { id: 'budget-low', label: 'Lowest Budget' },
  { id: 'rpm-high', label: 'Highest RPM' },
  { id: 'rpm-low', label: 'Lowest RPM' },
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'ended', label: 'Ended' },
];

const BROWSE_FILTERS = [
  { id: 'new', label: 'New', icon: Sparkles },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'popular', label: 'Popular', icon: Flame },
  { id: 'ending-soon', label: 'Ending Soon', icon: Clock },
  { id: 'high-paying', label: 'High Paying', icon: DollarSign },
];

const PLATFORM_FILTERS = [
  { id: 'all', label: 'All Platforms', iconLight: null, iconDark: null },
  { id: 'tiktok', label: 'TikTok', iconLight: tiktokLogoBlack, iconDark: tiktokLogoWhite },
  { id: 'instagram', label: 'Instagram', iconLight: instagramLogoBlack, iconDark: instagramLogoWhite },
  { id: 'youtube', label: 'YouTube', iconLight: youtubeLogoBlack, iconDark: youtubeLogoWhite },
];

const NICHES = [
  { id: 'tech', label: 'Tech & Software', icon: Cpu, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, color: 'bg-purple-500/20 text-purple-400' },
  { id: 'lifestyle', label: 'Lifestyle', icon: Heart, color: 'bg-pink-500/20 text-pink-400' },
  { id: 'fashion', label: 'Fashion & Beauty', icon: Shirt, color: 'bg-rose-500/20 text-rose-400' },
  { id: 'finance', label: 'Finance & Crypto', icon: Coins, color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'creative', label: 'Art & Creative', icon: Palette, color: 'bg-orange-500/20 text-orange-400' },
  { id: 'music', label: 'Music & Audio', icon: Music, color: 'bg-red-500/20 text-red-400' },
  { id: 'photography', label: 'Photography', icon: Camera, color: 'bg-amber-500/20 text-amber-400' },
  { id: 'education', label: 'Education', icon: BookOpen, color: 'bg-cyan-500/20 text-cyan-400' },
  { id: 'travel', label: 'Travel', icon: Globe, color: 'bg-teal-500/20 text-teal-400' },
  { id: 'fitness', label: 'Health & Fitness', icon: Dumbbell, color: 'bg-lime-500/20 text-lime-400' },
  { id: 'food', label: 'Food & Drink', icon: UtensilsCrossed, color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'parenting', label: 'Parenting & Family', icon: Baby, color: 'bg-sky-500/20 text-sky-400' },
  { id: 'pets', label: 'Pets & Animals', icon: Dog, color: 'bg-amber-600/20 text-amber-500' },
  { id: 'home', label: 'Home & Garden', icon: Home, color: 'bg-green-500/20 text-green-400' },
  { id: 'auto', label: 'Automotive', icon: Car, color: 'bg-slate-500/20 text-slate-400' },
  { id: 'luxury', label: 'Luxury & Premium', icon: Gem, color: 'bg-violet-500/20 text-violet-400' },
  { id: 'ecommerce', label: 'E-commerce & Retail', icon: ShoppingBag, color: 'bg-indigo-500/20 text-indigo-400' },
];

export function SearchOverlay({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  onTypeFilter,
  onNicheFilter,
  onBrowseFilter,
  onPlatformFilter,
  onSortFilter,
  onStatusFilter,
  onSavedFilter,
  activeTypeFilter,
  activeNicheFilter,
  activeBrowseFilter,
  activePlatformFilter,
  activeSortFilter,
  activeStatusFilter,
  activeSavedFilter,
}: SearchOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Local state for filters (only applied on submit)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [localTypeFilter, setLocalTypeFilter] = useState(activeTypeFilter);
  const [localNicheFilter, setLocalNicheFilter] = useState(activeNicheFilter);
  const [localBrowseFilter, setLocalBrowseFilter] = useState(activeBrowseFilter);
  const [localPlatformFilter, setLocalPlatformFilter] = useState(activePlatformFilter);
  const [localSortFilter, setLocalSortFilter] = useState(activeSortFilter);
  const [localStatusFilter, setLocalStatusFilter] = useState(activeStatusFilter);
  const [localSavedFilter, setLocalSavedFilter] = useState(activeSavedFilter);

  // Sync local state when overlay opens
  useEffect(() => {
    if (isOpen) {
      setLocalSearchQuery(searchQuery);
      setLocalTypeFilter(activeTypeFilter);
      setLocalNicheFilter(activeNicheFilter);
      setLocalBrowseFilter(activeBrowseFilter);
      setLocalPlatformFilter(activePlatformFilter);
      setLocalSortFilter(activeSortFilter);
      setLocalStatusFilter(activeStatusFilter);
      setLocalSavedFilter(activeSavedFilter);
    }
  }, [isOpen, searchQuery, activeTypeFilter, activeNicheFilter, activeBrowseFilter, activePlatformFilter, activeSortFilter, activeStatusFilter, activeSavedFilter]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasLocalFilters = localSearchQuery || localTypeFilter !== 'all' || localNicheFilter || localBrowseFilter || localPlatformFilter || localSortFilter !== 'newest' || localStatusFilter !== 'all' || localSavedFilter;

  const handleSearch = () => {
    onSearchChange(localSearchQuery);
    onTypeFilter(localTypeFilter);
    onNicheFilter(localNicheFilter);
    onBrowseFilter(localBrowseFilter);
    onPlatformFilter(localPlatformFilter);
    onSortFilter(localSortFilter);
    onStatusFilter(localStatusFilter);
    onSavedFilter(localSavedFilter);
    onClose();
  };

  const handleReset = () => {
    setLocalSearchQuery('');
    setLocalTypeFilter('all');
    setLocalNicheFilter(null);
    setLocalBrowseFilter(null);
    setLocalPlatformFilter(null);
    setLocalSortFilter('newest');
    setLocalStatusFilter('all');
    setLocalSavedFilter(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={overlayRef}
        className="w-full max-w-2xl mx-auto mt-20 bg-card rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300"
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4">
          <Input
            ref={inputRef}
            placeholder="Search campaigns & boosts..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="flex-1 border-0 bg-transparent text-lg placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:border-transparent font-['Inter'] tracking-[-0.5px]"
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Type Filter */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground font-['Inter'] tracking-[-0.5px]">
              Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'campaigns', label: 'Campaigns' },
                { id: 'boosts', label: 'Boosts' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setLocalTypeFilter(type.id as 'all' | 'campaigns' | 'boosts')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all font-['Inter'] tracking-[-0.5px] ${
                    localTypeFilter === type.id
                      ? 'bg-black text-white dark:bg-blue-600 dark:text-white'
                      : 'bg-muted/50 hover:bg-muted text-foreground'
                  }`}
                >
                  {type.label}
                </button>
              ))}
              {/* Saved Toggle */}
              <button
                onClick={() => setLocalSavedFilter(!localSavedFilter)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all font-['Inter'] tracking-[-0.5px] ${
                  localSavedFilter
                    ? 'bg-black text-white dark:bg-blue-600 dark:text-white'
                    : 'bg-muted/50 hover:bg-muted text-foreground'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${localSavedFilter ? 'fill-current' : ''}`} />
                Saved
              </button>
            </div>
          </div>

          {/* Platform Filter */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground font-['Inter'] tracking-[-0.5px]">
              Platform
            </h3>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_FILTERS.map((platform) => {
                const isActive = (localPlatformFilter === null && platform.id === 'all') || localPlatformFilter === platform.id;
                return (
                  <button
                    key={platform.id}
                    onClick={() => setLocalPlatformFilter(platform.id === 'all' ? null : (localPlatformFilter === platform.id ? null : platform.id))}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all font-['Inter'] tracking-[-0.5px] ${
                      isActive
                        ? 'bg-black text-white dark:bg-blue-600 dark:text-white'
                        : 'bg-muted/50 hover:bg-muted text-foreground'
                    }`}
                  >
                    {platform.id !== 'all' && platform.iconLight && (
                      <img
                        src={isActive ? platform.iconDark : platform.iconLight}
                        alt={platform.label}
                        className={`h-4 w-4 ${!isActive ? 'dark:invert' : 'dark:invert-0'}`}
                      />
                    )}
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Browse Filters */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground font-['Inter'] tracking-[-0.5px]">
              Browse
            </h3>
            <div className="flex flex-wrap gap-2">
              {BROWSE_FILTERS.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setLocalBrowseFilter(localBrowseFilter === filter.id ? null : filter.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all font-['Inter'] tracking-[-0.5px] ${
                      localBrowseFilter === filter.id
                        ? 'bg-black text-white dark:bg-blue-600 dark:text-white'
                        : 'bg-muted/50 hover:bg-muted text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Filter */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground font-['Inter'] tracking-[-0.5px]">
              Sort By
            </h3>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setLocalSortFilter(option.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all font-['Inter'] tracking-[-0.5px] ${
                    localSortFilter === option.id
                      ? 'bg-black text-white dark:bg-blue-600 dark:text-white'
                      : 'bg-muted/50 hover:bg-muted text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground font-['Inter'] tracking-[-0.5px]">
              Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setLocalStatusFilter(option.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all font-['Inter'] tracking-[-0.5px] ${
                    localStatusFilter === option.id
                      ? 'bg-black text-white dark:bg-blue-600 dark:text-white'
                      : 'bg-muted/50 hover:bg-muted text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/20 border-t border-border/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">ESC</kbd> to close
              </span>
              {hasLocalFilters && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-['Inter'] tracking-[-0.5px]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>
            <Button
              onClick={handleSearch}
              size="sm"
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
