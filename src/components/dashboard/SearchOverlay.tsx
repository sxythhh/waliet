import { useState, useEffect, useRef } from "react";
import { X, Sparkles, TrendingUp, Flame, Clock, DollarSign, Gamepad2, Heart, Cpu, Palette, Music, Camera, BookOpen, Globe, Dumbbell, UtensilsCrossed, Shirt, Baby, Dog, Home, Car, Gem, Coins, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";

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
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 border-0 bg-transparent text-lg placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 font-['Inter'] tracking-[-0.5px]"
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
                  onClick={() => onTypeFilter(type.id as 'all' | 'campaigns' | 'boosts')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all font-['Inter'] tracking-[-0.5px] ${
                    activeTypeFilter === type.id
                      ? 'bg-foreground text-background'
                      : 'bg-muted/50 hover:bg-muted text-foreground'
                  }`}
                >
                  {type.label}
                </button>
              ))}
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
                    onClick={() => onBrowseFilter(activeBrowseFilter === filter.id ? null : filter.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all font-['Inter'] tracking-[-0.5px] ${
                      activeBrowseFilter === filter.id
                        ? 'bg-foreground text-background'
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

          {/* Niches/Topics */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground font-['Inter'] tracking-[-0.5px]">
              Topics
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {NICHES.map((niche) => {
                const Icon = niche.icon;
                const isActive = activeNicheFilter === niche.id;
                return (
                  <button
                    key={niche.id}
                    onClick={() => onNicheFilter(isActive ? null : niche.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all font-['Inter'] tracking-[-0.5px] ${
                      isActive
                        ? 'bg-foreground text-background'
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-background/20' : niche.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{niche.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">ESC</kbd> to close
            </span>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  onSearchChange('');
                  onTypeFilter('all');
                  onNicheFilter(null);
                  onBrowseFilter(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-['Inter'] tracking-[-0.5px]"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
