import { useState, useEffect, useRef } from "react";
import { Search, Sparkles, TrendingUp, Flame, Clock, DollarSign, Gamepad2, Heart, Cpu, Palette, Music, Camera, BookOpen, Globe, Dumbbell, UtensilsCrossed, Shirt, Baby, Dog, Home, Car, Gem, Coins, ShoppingBag } from "lucide-react";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onTypeFilter: (type: 'all' | 'campaigns' | 'boosts') => void;
  onNicheFilter: (niche: string | null) => void;
  onBrowseFilter: (filter: string | null) => void;
  activeTypeFilter: 'all' | 'campaigns' | 'boosts';
  activeNicheFilter: string | null;
  activeBrowseFilter: string | null;
}

const BROWSE_FILTERS = [
  { id: 'new', label: 'New', icon: Sparkles },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'popular', label: 'Popular', icon: Flame },
  { id: 'ending-soon', label: 'Ending Soon', icon: Clock },
  { id: 'high-paying', label: 'High Paying', icon: DollarSign },
];

const NICHES = [
  { id: 'tech', label: 'Tech & Software', icon: Cpu },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'lifestyle', label: 'Lifestyle', icon: Heart },
  { id: 'fashion', label: 'Fashion & Beauty', icon: Shirt },
  { id: 'finance', label: 'Finance & Crypto', icon: Coins },
  { id: 'creative', label: 'Art & Creative', icon: Palette },
  { id: 'music', label: 'Music & Audio', icon: Music },
  { id: 'photography', label: 'Photography', icon: Camera },
  { id: 'education', label: 'Education', icon: BookOpen },
  { id: 'travel', label: 'Travel', icon: Globe },
  { id: 'fitness', label: 'Health & Fitness', icon: Dumbbell },
  { id: 'food', label: 'Food & Drink', icon: UtensilsCrossed },
  { id: 'parenting', label: 'Parenting & Family', icon: Baby },
  { id: 'pets', label: 'Pets & Animals', icon: Dog },
  { id: 'home', label: 'Home & Garden', icon: Home },
  { id: 'auto', label: 'Automotive', icon: Car },
  { id: 'luxury', label: 'Luxury & Premium', icon: Gem },
  { id: 'ecommerce', label: 'E-commerce & Retail', icon: ShoppingBag },
];

export function SearchOverlay({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  onTypeFilter,
  onNicheFilter,
  onBrowseFilter,
  activeTypeFilter,
  activeNicheFilter,
  activeBrowseFilter,
}: SearchOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const hasActiveFilters = searchQuery || activeTypeFilter !== 'all' || activeNicheFilter || activeBrowseFilter;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 font-['Inter'] tracking-[-0.5px]">
      <div 
        ref={overlayRef}
        className="w-full max-w-xl mx-auto mt-24 bg-background rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300"
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Search className="h-5 w-5 text-muted-foreground/50" />
          <input
            ref={inputRef}
            placeholder="Search campaigns & boosts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-base placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-muted/30 mx-5" />

        {/* Content */}
        <div className="px-5 py-5 space-y-5 max-h-[55vh] overflow-y-auto">
          {/* Type Filter */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] font-medium text-muted-foreground/70">
              Type
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'campaigns', label: 'Campaigns' },
                { id: 'boosts', label: 'Boosts' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => onTypeFilter(type.id as 'all' | 'campaigns' | 'boosts')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTypeFilter === type.id
                      ? 'bg-foreground text-background'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Browse Filters */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] font-medium text-muted-foreground/70">
              Browse
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {BROWSE_FILTERS.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => onBrowseFilter(activeBrowseFilter === filter.id ? null : filter.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeBrowseFilter === filter.id
                        ? 'bg-foreground text-background'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Niches/Topics */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] font-medium text-muted-foreground/70">
              Topics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {NICHES.map((niche) => {
                const Icon = niche.icon;
                const isActive = activeNicheFilter === niche.id;
                return (
                  <button
                    key={niche.id}
                    onClick={() => onNicheFilter(isActive ? null : niche.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-foreground text-background'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium truncate">{niche.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/60">
              Press <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">ESC</kbd> to close
            </span>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  onSearchChange('');
                  onTypeFilter('all');
                  onNicheFilter(null);
                  onBrowseFilter(null);
                }}
                className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
