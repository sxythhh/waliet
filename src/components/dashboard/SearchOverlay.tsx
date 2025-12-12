import { useState, useEffect, useRef } from "react";
import { Search, X, Sparkles, TrendingUp, Flame, Clock, Zap, Briefcase, Gamepad2, Heart, Cpu, Palette, Music, Camera, BookOpen, Globe, Dumbbell, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onTypeFilter: (type: 'all' | 'campaigns' | 'boosts') => void;
  onNicheFilter: (niche: string | null) => void;
  activeTypeFilter: 'all' | 'campaigns' | 'boosts';
  activeNicheFilter: string | null;
}

const BROWSE_FILTERS = [
  { id: 'new', label: 'New', icon: Sparkles },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'popular', label: 'Popular', icon: Flame },
  { id: 'ending-soon', label: 'Ending Soon', icon: Clock },
  { id: 'high-paying', label: 'High Paying', icon: Zap },
];

const NICHES = [
  { id: 'tech', label: 'Tech', icon: Cpu, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, color: 'bg-purple-500/20 text-purple-400' },
  { id: 'lifestyle', label: 'Lifestyle', icon: Heart, color: 'bg-pink-500/20 text-pink-400' },
  { id: 'business', label: 'Business', icon: Briefcase, color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'creative', label: 'Creative', icon: Palette, color: 'bg-orange-500/20 text-orange-400' },
  { id: 'music', label: 'Music', icon: Music, color: 'bg-red-500/20 text-red-400' },
  { id: 'photography', label: 'Photography', icon: Camera, color: 'bg-amber-500/20 text-amber-400' },
  { id: 'education', label: 'Education', icon: BookOpen, color: 'bg-cyan-500/20 text-cyan-400' },
  { id: 'travel', label: 'Travel', icon: Globe, color: 'bg-teal-500/20 text-teal-400' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, color: 'bg-lime-500/20 text-lime-400' },
  { id: 'food', label: 'Food', icon: UtensilsCrossed, color: 'bg-yellow-500/20 text-yellow-400' },
];

export function SearchOverlay({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  onTypeFilter,
  onNicheFilter,
  activeTypeFilter,
  activeNicheFilter,
}: SearchOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeBrowseFilter, setActiveBrowseFilter] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={overlayRef}
        className="w-full max-w-2xl mx-auto mt-20 bg-card border border-[#dce1eb] dark:border-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300"
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search campaigns & boosts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 border-0 bg-transparent text-lg placeholder:text-muted-foreground/50 focus-visible:ring-0 font-['Inter'] tracking-[-0.5px]"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Type Filter */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-['Inter']">
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
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all font-['Inter'] tracking-[-0.5px] ${
                    activeTypeFilter === type.id
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent border-border hover:bg-muted/50 text-foreground'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Browse Filters */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-['Inter']">
              Browse
            </h3>
            <div className="flex flex-wrap gap-2">
              {BROWSE_FILTERS.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveBrowseFilter(activeBrowseFilter === filter.id ? null : filter.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all font-['Inter'] tracking-[-0.5px] ${
                      activeBrowseFilter === filter.id
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-transparent border-border hover:bg-muted/50 text-foreground'
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
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-['Inter']">
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
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all font-['Inter'] tracking-[-0.5px] ${
                      isActive
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-background/20' : niche.color}`}>
                      <Icon className={`h-5 w-5 ${isActive ? '' : ''}`} />
                    </div>
                    <span className="text-sm font-medium">{niche.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">ESC</kbd> to close
            </span>
            <button
              onClick={() => {
                onSearchChange('');
                onTypeFilter('all');
                onNicheFilter(null);
                setActiveBrowseFilter(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-['Inter'] tracking-[-0.5px]"
            >
              Clear all filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
