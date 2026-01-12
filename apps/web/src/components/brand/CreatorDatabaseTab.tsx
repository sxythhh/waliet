import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Download, Upload, Filter, ExternalLink, Plus, X, Check, AlertCircle, Users, Trash2, UserX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UserPlus, FileSpreadsheet, GripVertical, Settings, Star, Copy, Tag, DollarSign, RotateCcw } from "lucide-react";
import { Icon } from "@iconify/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { SubscriptionGateDialog } from "@/components/brand/SubscriptionGateDialog";
import { LeaveTestimonialDialog } from "@/components/brand/LeaveTestimonialDialog";
import { FindCreatorsPopup } from "@/components/brand/FindCreatorsPopup";
import { ManualPayCreatorDialog } from "@/components/brand/ManualPayCreatorDialog";
import { BulkPitchDialog } from "@/components/brand/BulkPitchDialog";
import vpnKeyIcon from "@/assets/vpn-key-icon.svg";
import discordIconDark from "@/assets/tiktok-icon-dark.svg";
import removeCreatorIcon from "@/assets/remove-creator-icon.svg";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import xLogoBlack from "@/assets/x-logo.png";
import xLogoWhite from "@/assets/x-logo-light.png";
import discordWhiteIcon from "@/assets/discord-white-icon.webp";
interface Creator {
  id: string;
  relationship_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
  discord_username: string | null;
  country: string | null;
  city: string | null;
  is_external: boolean;
  external_name: string | null;
  external_email: string | null;
  external_platform: string | null;
  external_handle: string | null;
  source_type: string;
  source_campaign_title: string | null;
  first_interaction_at: string | null;
  social_accounts: {
    platform: string;
    username: string;
    account_link: string | null;
    follower_count?: number | null;
  }[];
  total_views: number;
  total_earnings: number;
  date_joined: string | null;
  campaigns: {
    id: string;
    title: string;
    type: 'campaign' | 'boost';
  }[];
  demographic_score: number | null;
  reliability_score: number | null;
}
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
interface Campaign {
  id: string;
  title: string;
}
interface CreatorDatabaseTabProps {
  brandId: string;
  onStartConversation?: (creatorId: string, creatorName: string) => void;
}
const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'x'] as const;
const FOLLOWER_RANGES = [{
  value: 'any',
  label: 'Any followers'
}, {
  value: '1k',
  label: '1K+'
}, {
  value: '10k',
  label: '10K+'
}, {
  value: '50k',
  label: '50K+'
}, {
  value: '100k',
  label: '100K+'
}, {
  value: '500k',
  label: '500K+'
}, {
  value: '1m',
  label: '1M+'
}];
const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'India', 'Germany', 'France', 'Australia', 'Brazil', 'Pakistan', 'Indonesia'];
const getPlatformLogos = (isDark: boolean): Record<string, string> => ({
  tiktok: isDark ? tiktokLogoWhite : tiktokLogoBlack,
  instagram: isDark ? instagramLogoWhite : instagramLogoBlack,
  youtube: isDark ? youtubeLogoWhite : youtubeLogoBlack,
  x: isDark ? xLogoWhite : xLogoBlack
});
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};
const formatFollowerCount = (count: number | null) => {
  if (!count) return null;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};
const getMinFollowers = (range: string): number => {
  switch (range) {
    case '1k':
      return 1000;
    case '10k':
      return 10000;
    case '50k':
      return 50000;
    case '100k':
      return 100000;
    case '500k':
      return 500000;
    case '1m':
      return 1000000;
    default:
      return 0;
  }
};
const getSourceLabel = (sourceType: string, hasCampaigns: boolean = false): string => {
  switch (sourceType) {
    case 'campaign_application':
    case 'boost_application':
      return hasCampaigns ? 'Member' : 'Application';
    case 'video_submission':
      return 'Submitted';
    case 'manual_add':
      return 'Added';
    case 'import':
      return 'Imported';
    default:
      return sourceType;
  }
};
const getSourceColor = (sourceType: string, hasCampaigns: boolean = false): string => {
  switch (sourceType) {
    case 'campaign_application':
    case 'boost_application':
      return hasCampaigns ? 'bg-emerald-500/25 text-emerald-500' : 'bg-blue-500/25 text-blue-500';
    case 'video_submission':
      return 'bg-purple-500/25 text-purple-500';
    case 'manual_add':
      return 'bg-amber-500/25 text-amber-500';
    case 'import':
      return 'bg-rose-500/25 text-rose-500';
    default:
      return 'bg-muted/25 text-muted-foreground';
  }
};

// Sortable column item for drag-and-drop reordering
interface SortableColumnItemProps {
  id: string;
  label: string;
  isVisible: boolean;
  isRequired: boolean;
  onToggle: () => void;
}
function SortableColumnItem({
  id,
  label,
  isVisible,
  isRequired,
  onToggle
}: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/50 transition-colors">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted/70">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <Checkbox id={`col-${id}`} checked={isVisible} onCheckedChange={onToggle} disabled={isRequired} className="h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
      <label htmlFor={`col-${id}`} className={`text-sm font-inter tracking-[-0.5px] cursor-pointer flex-1 ${isRequired ? 'text-muted-foreground' : 'text-foreground'}`}>
        {label}
      </label>
    </div>;
}

// Column configuration - defined outside component to avoid recreation on each render
const ALL_COLUMNS = [{
  id: 'creator',
  label: 'Creator',
  required: true
}, {
  id: 'source',
  label: 'Source',
  required: false
}, {
  id: 'socials',
  label: 'Socials',
  required: false
}, {
  id: 'contact',
  label: 'Contact',
  required: false
}, {
  id: 'views',
  label: 'Views',
  required: false
}, {
  id: 'earnings',
  label: 'Earnings',
  required: false
}, {
  id: 'joined',
  label: 'Joined',
  required: false
}, {
  id: 'email',
  label: 'Email',
  required: false
}, {
  id: 'phone',
  label: 'Phone',
  required: false
}, {
  id: 'country',
  label: 'Country',
  required: false
}] as const;

type ColumnId = typeof ALL_COLUMNS[number]['id'];

export function CreatorDatabaseTab({
  brandId,
  onStartConversation
}: CreatorDatabaseTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    resolvedTheme
  } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const PLATFORM_LOGOS = useMemo(() => getPlatformLogos(isDark), [isDark]);

  // Mode toggle
  const [showFindCreators, setShowFindCreators] = useState(false);
  const [discoveryWizardOpen, setDiscoveryWizardOpen] = useState(false);

  // Database state
  const [creators, setCreators] = useState<Creator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>("all");
  const [selectedCreators, setSelectedCreators] = useState<Set<string>>(new Set());
  const [addCreatorsDialogOpen, setAddCreatorsDialogOpen] = useState(false);
  const [addCreatorsMode, setAddCreatorsMode] = useState<'search' | 'import' | 'manual'>('search');
  const [importData, setImportData] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [manualCreator, setManualCreator] = useState({
    username: '',
    name: '',
    email: '',
    phone: ''
  });
  const [manualAddLoading, setManualAddLoading] = useState(false);
  const [addToCampaignDialogOpen, setAddToCampaignDialogOpen] = useState(false);
  const [selectedCampaignToAdd, setSelectedCampaignToAdd] = useState<string>("");
  const [addingToCampaign, setAddingToCampaign] = useState(false);

  // Bulk message state
  const [bulkMessageDialogOpen, setBulkMessageDialogOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [sendingBulkMessage, setSendingBulkMessage] = useState(false);

  // Remove creator state
  const [removeCreatorDialogOpen, setRemoveCreatorDialogOpen] = useState(false);
  const [creatorToRemove, setCreatorToRemove] = useState<Creator | null>(null);
  const [removingCreator, setRemovingCreator] = useState(false);
  const [kickFromCampaignDialogOpen, setKickFromCampaignDialogOpen] = useState(false);

  // Selected creator panel state
  const [selectedCreatorPanel, setSelectedCreatorPanel] = useState<Creator | null>(null);
  const [campaignToKickFrom, setCampaignToKickFrom] = useState<{
    creatorId: string;
    campaignId: string;
    campaignTitle: string;
    campaignType: 'campaign' | 'boost';
  } | null>(null);
  const [kickingFromCampaign, setKickingFromCampaign] = useState(false);

  // Find Creators state
  const [discoverableCreators, setDiscoverableCreators] = useState<DiscoverableCreator[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [debouncedDiscoverSearch, setDebouncedDiscoverSearch] = useState("");
  // Applied filter state (what's actually filtering the data)
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [followerFilter, setFollowerFilter] = useState<string>('any');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [demographicScoreFilter, setDemographicScoreFilter] = useState<string>('all');
  const [reliabilityScoreFilter, setReliabilityScoreFilter] = useState<string>('all');

  // Filter panel UI state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Pending filter state (what user is configuring before Apply)
  const [pendingCampaignFilter, setPendingCampaignFilter] = useState<string>('all');
  const [pendingPlatformFilter, setPendingPlatformFilter] = useState<string>('all');
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string>('all');
  const [pendingSourceFilter, setPendingSourceFilter] = useState<string>('all');
  const [pendingDemographicScoreFilter, setPendingDemographicScoreFilter] = useState<string>('all');
  const [pendingReliabilityScoreFilter, setPendingReliabilityScoreFilter] = useState<string>('all');
  const [pendingTagFilters, setPendingTagFilters] = useState<string[]>([]);

  // Track last applied filters for undo
  const [lastAppliedFilters, setLastAppliedFilters] = useState<{
    campaign: string;
    platform: string;
    status: string;
    source: string;
    demographic: string;
    reliability: string;
    tags: string[];
  } | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [subscriptionGateOpen, setSubscriptionGateOpen] = useState(false);

  // Testimonial dialog state
  const [testimonialDialogOpen, setTestimonialDialogOpen] = useState(false);
  const [testimonialCreator, setTestimonialCreator] = useState<Creator | null>(null);

  // Manual pay dialog state
  const [manualPayDialogOpen, setManualPayDialogOpen] = useState(false);
  const [creatorToPay, setCreatorToPay] = useState<{ id: string; username: string; full_name: string | null; avatar_url: string | null } | null>(null);

  // Bulk pitch dialog state
  const [bulkPitchDialogOpen, setBulkPitchDialogOpen] = useState(false);

  // Tag filter state
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [creatorTagsMap, setCreatorTagsMap] = useState<Map<string, string[]>>(new Map());

  // Column configuration state
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(new Set(['creator', 'source', 'socials', 'contact', 'views', 'earnings', 'joined']));
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(ALL_COLUMNS.map(c => c.id));

  // Sorting state
  const [sortBy, setSortBy] = useState<'views' | 'earnings' | 'joined' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

  // DnD sensors for column reordering
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleColumnDragEnd = useCallback((event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      setColumnOrder(items => {
        const oldIndex = items.indexOf(active.id as ColumnId);
        const newIndex = items.indexOf(over.id as ColumnId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);
  const toggleColumnVisibility = useCallback((columnId: ColumnId) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (column?.required) return;
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  // Get ordered visible columns
  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter(id => visibleColumns.has(id));
  }, [columnOrder, visibleColumns]);
  const handleSort = (column: 'views' | 'earnings' | 'joined') => {
    if (sortBy === column) {
      if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else {
        setSortBy(null);
        setSortOrder('desc');
      }
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Debounce discover search
  // localStorage key for filter persistence
  const FILTERS_STORAGE_KEY = `crm-filters-${brandId}`;

  // Load saved filters from localStorage on mount
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        if (parsed.campaign) setSelectedCampaignFilter(parsed.campaign);
        if (parsed.platform) setPlatformFilter(parsed.platform);
        if (parsed.status) setStatusFilter(parsed.status);
        if (parsed.source) setSourceFilter(parsed.source);
        if (parsed.demographic) setDemographicScoreFilter(parsed.demographic);
        if (parsed.reliability) setReliabilityScoreFilter(parsed.reliability);
        if (parsed.tags) setSelectedTagFilters(parsed.tags);
      }
    } catch (e) {
      // If parsing fails, just use defaults
      console.error('Failed to load saved filters:', e);
    }
  }, [brandId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDiscoverSearch(discoverSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [discoverSearch]);
  const checkSubscription = useCallback(async () => {
    const {
      data
    } = await supabase.from('brands').select('subscription_status').eq('id', brandId).single();
    setHasActivePlan(data?.subscription_status === 'active');
  }, [brandId]);

  // Fetch all unique tags from brand_creator_notes for this brand
  const fetchAvailableTags = useCallback(async () => {
    try {
      interface BrandCreatorNote {
        creator_id: string;
        tags: string[] | null;
      }

      const { data, error } = await supabase
        .from('brand_creator_notes')
        .select('creator_id, tags')
        .eq('brand_id', brandId) as { data: BrandCreatorNote[] | null; error: Error | null };

      if (error) throw error;

      // Build creator-to-tags mapping
      const tagsMap = new Map<string, string[]>();
      data?.forEach((note: BrandCreatorNote) => {
        if (note.tags && note.tags.length > 0) {
          tagsMap.set(note.creator_id, note.tags);
        }
      });
      setCreatorTagsMap(tagsMap);

      // Flatten all tags and get unique values
      const allTags = data?.flatMap((note: BrandCreatorNote) => note.tags || []) || [];
      const uniqueTags = [...new Set(allTags)].sort();
      setAvailableTags(uniqueTags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, [brandId]);

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    try {
      // First fetch campaigns to avoid race condition
      const [campaignsResult, boostsResult] = await Promise.all([supabase.from('campaigns').select('id, title').eq('brand_id', brandId), supabase.from('bounty_campaigns').select('id, title').eq('brand_id', brandId)]);
      const allCampaigns: Campaign[] = [...(campaignsResult.data || []), ...(boostsResult.data || [])];
      setCampaigns(allCampaigns);

      // Fetch all creator relationships for this brand
      const {
        data: relationships,
        error: relError
      } = await supabase.from('brand_creator_relationships').select('*').eq('brand_id', brandId);
      if (relError) throw relError;
      if (!relationships || relationships.length === 0) {
        setCreators([]);
        setLoading(false);
        return;
      }

      // Get platform creator IDs (non-external)
      const platformCreatorIds = relationships.filter(r => r.user_id).map(r => r.user_id as string);

      // Batch fetch helper to avoid URL length limits with large ID lists - runs batches in parallel
      const batchFetch = async <T,>(ids: string[], fetchFn: (batchIds: string[]) => Promise<T[]>, batchSize = 50): Promise<T[]> => {
        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += batchSize) {
          batches.push(ids.slice(i, i + batchSize));
        }
        const batchResults = await Promise.all(batches.map(fetchFn));
        return batchResults.flat();
      };

      // Fetch profiles and social accounts in parallel
      const [profiles, socialAccounts] = platformCreatorIds.length > 0 ? await Promise.all([batchFetch(platformCreatorIds, async batchIds => {
        const {
          data
        } = await supabase.from('profiles').select('id, username, full_name, avatar_url, email, phone_number, discord_username, country, city, created_at').in('id', batchIds);
        return data || [];
      }), batchFetch(platformCreatorIds, async batchIds => {
        const {
          data
        } = await supabase.from('social_accounts').select('user_id, platform, username, account_link, follower_count').in('user_id', batchIds);
        return data || [];
      })]) : [[], []];

      // Get video submissions for view counts
      const {
        data: submissions
      } = await supabase.from('video_submissions').select('creator_id, views, source_type, source_id').eq('brand_id', brandId);

      // Get earnings using the database function for accurate brand-specific calculation
      const {
        data: earnings
      } = await supabase.rpc('get_brand_creator_earnings', {
        p_brand_id: brandId
      });

      // Fetch demographic scores
      interface DemographicScore {
        user_id: string;
        score: number | null;
      }
      const { data: demographicScores } = await supabase
        .from('demographic_scores')
        .select('user_id, score')
        .in('user_id', platformCreatorIds) as { data: DemographicScore[] | null; error: Error | null };

      // Fetch reliability scores
      interface ReliabilityScore {
        creator_id: string;
        reliability_score: number | null;
      }
      const { data: reliabilityScores } = await supabase
        .from('creator_reliability_scores')
        .select('creator_id, reliability_score')
        .eq('brand_id', brandId) as { data: ReliabilityScore[] | null; error: Error | null };

      // Build creator objects from relationships
      const creatorsMap = new Map<string, Creator>();
      relationships.forEach(rel => {
        const profile = profiles?.find(p => p.id === rel.user_id);
        const isExternal = !rel.user_id;
        const sourceCampaign = allCampaigns.find(c => c.id === rel.source_id);
        const demoScore = demographicScores?.find(d => d.user_id === rel.user_id);
        const relScore = reliabilityScores?.find(r => r.creator_id === rel.user_id);

        // Use relationship id as key for external creators, user_id for platform creators
        const key = rel.user_id || rel.id;
        creatorsMap.set(key, {
          id: rel.user_id || rel.id,
          relationship_id: rel.id,
          username: profile?.username || rel.external_handle || '',
          full_name: profile?.full_name || rel.external_name || null,
          avatar_url: profile?.avatar_url || null,
          email: profile?.email || rel.external_email || null,
          phone_number: profile?.phone_number || null,
          discord_username: profile?.discord_username || null,
          country: profile?.country || null,
          city: profile?.city || null,
          is_external: isExternal,
          external_name: rel.external_name,
          external_email: rel.external_email,
          external_platform: rel.external_platform,
          external_handle: rel.external_handle,
          source_type: rel.source_type,
          source_campaign_title: sourceCampaign?.title || null,
          first_interaction_at: rel.first_interaction_at,
          social_accounts: [],
          total_views: 0,
          total_earnings: 0,
          date_joined: profile?.created_at || rel.created_at,
          campaigns: [],
          demographic_score: demoScore?.score ?? null,
          reliability_score: relScore?.reliability_score ?? null
        });
      });

      // Add social accounts for platform creators
      socialAccounts?.forEach(account => {
        const creator = creatorsMap.get(account.user_id);
        if (creator) {
          creator.social_accounts.push({
            platform: account.platform,
            username: account.username,
            account_link: account.account_link,
            follower_count: account.follower_count
          });
        }
      });

      // Add views and campaign associations from submissions
      submissions?.forEach(submission => {
        const creator = creatorsMap.get(submission.creator_id);
        if (creator) {
          creator.total_views += submission.views || 0;
          const campaignId = submission.source_id;
          if (campaignId && !creator.campaigns.find(c => c.id === campaignId)) {
            const campaign = allCampaigns.find(c => c.id === campaignId);
            if (campaign) {
              creator.campaigns.push({
                id: campaign.id,
                title: campaign.title,
                type: submission.source_type as 'campaign' | 'boost'
              });
            }
          }
        }
      });

      // Add earnings from the database function results
      earnings?.forEach((earning: {
        user_id: string;
        total_earnings: number;
      }) => {
        const creator = creatorsMap.get(earning.user_id);
        if (creator) {
          creator.total_earnings = Number(earning.total_earnings) || 0;
        }
      });
      setCreators(Array.from(creatorsMap.values()));
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchCreators();
    fetchAvailableTags();
    checkSubscription();
  }, [brandId, fetchCreators, fetchAvailableTags, checkSubscription]);

  // Auto-open creator panel from URL param
  useEffect(() => {
    const creatorId = searchParams.get('creator');
    if (creatorId && creators.length > 0 && !selectedCreatorPanel) {
      const creator = creators.find(c => c.id === creatorId);
      if (creator) {
        setSelectedCreatorPanel(creator);
        // Remove the param after opening
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('creator');
        setSearchParams(newParams, {
          replace: true
        });
      }
    }
  }, [searchParams, creators, selectedCreatorPanel, setSearchParams]);

  const fetchDiscoverableCreators = useCallback(async () => {
    setDiscoverLoading(true);
    try {
      let query = supabase.from("profiles").select("id, username, full_name, avatar_url, bio, city, country, content_niches").eq("onboarding_completed", true);
      if (debouncedDiscoverSearch) {
        query = query.or(`username.ilike.*${debouncedDiscoverSearch}*,full_name.ilike.*${debouncedDiscoverSearch}*,bio.ilike.*${debouncedDiscoverSearch}*`);
      }
      if (countryFilter !== 'all') {
        query = query.eq('country', countryFilter);
      }
      const {
        data: profiles,
        error
      } = await query.limit(100);
      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        setDiscoverableCreators([]);
        setDiscoverLoading(false);
        return;
      }
      let socialQuery = supabase.from("social_accounts").select("user_id, platform, username, account_link, follower_count").in("user_id", profiles.map(p => p.id)).eq("is_verified", true);
      if (platformFilter !== 'all') {
        socialQuery = socialQuery.eq('platform', platformFilter);
      }
      const {
        data: socialAccounts
      } = await socialQuery;
      const creatorsWithSocial: DiscoverableCreator[] = profiles.map(profile => ({
        ...profile,
        social_accounts: (socialAccounts || []).filter(sa => sa.user_id === profile.id).map(sa => ({
          platform: sa.platform,
          username: sa.username,
          account_link: sa.account_link,
          follower_count: sa.follower_count
        }))
      }));
      let filtered = debouncedDiscoverSearch ? creatorsWithSocial : creatorsWithSocial.filter(c => c.social_accounts.length > 0);
      if (followerFilter !== 'any' && !debouncedDiscoverSearch) {
        const minFollowers = getMinFollowers(followerFilter);
        filtered = filtered.filter(c => {
          const maxFollowers = Math.max(...c.social_accounts.map(a => a.follower_count || 0), 0);
          return maxFollowers >= minFollowers;
        });
      }
      setDiscoverableCreators(filtered);
    } catch (error) {
      console.error("Error fetching discoverable creators:", error);
    } finally {
      setDiscoverLoading(false);
    }
  }, [debouncedDiscoverSearch, countryFilter, platformFilter, followerFilter]);

  // Fetch discoverable creators when dialog opens with search tab or filters change
  useEffect(() => {
    if (addCreatorsDialogOpen && addCreatorsMode === 'search' && hasActivePlan) {
      fetchDiscoverableCreators();
    }
  }, [addCreatorsDialogOpen, addCreatorsMode, hasActivePlan, debouncedDiscoverSearch, platformFilter, followerFilter, countryFilter, fetchDiscoverableCreators]);

  const hasActiveFilters = platformFilter !== 'all' || followerFilter !== 'any' || countryFilter !== 'all';
  const clearDiscoverFilters = () => {
    setPlatformFilter('all');
    setFollowerFilter('any');
    setCountryFilter('all');
  };

  const filteredAndSortedCreators = useMemo(() => {
    let filtered = creators;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.username?.toLowerCase().includes(query) || c.full_name?.toLowerCase().includes(query) || c.email?.toLowerCase().includes(query) || c.social_accounts.some(s => s.username.toLowerCase().includes(query)));
    }
    if (selectedCampaignFilter !== 'all') {
      filtered = filtered.filter(c => c.campaigns.some(camp => camp.id === selectedCampaignFilter));
    }
    // Platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(c => c.social_accounts.some(s => s.platform === platformFilter));
    }
    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(c => {
        if (sourceFilter === 'campaign') return c.source_type === 'campaign_application' || c.source_type === 'video_submission';
        if (sourceFilter === 'boost') return c.source_type === 'boost_application';
        if (sourceFilter === 'manual') return c.source_type === 'manual_add';
        if (sourceFilter === 'import') return c.source_type === 'import';
        return true;
      });
    }
    // Status filter (active = has campaigns, inactive = no campaigns)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => {
        if (statusFilter === 'active') return c.campaigns.length > 0;
        if (statusFilter === 'inactive') return c.campaigns.length === 0;
        return true;
      });
    }
    // Demographic score filter
    if (demographicScoreFilter !== 'all') {
      filtered = filtered.filter(c => {
        const score = c.demographic_score;
        if (demographicScoreFilter === 'high') return score !== null && score >= 70;
        if (demographicScoreFilter === 'medium') return score !== null && score >= 40 && score < 70;
        if (demographicScoreFilter === 'low') return score !== null && score < 40;
        if (demographicScoreFilter === 'unrated') return score === null;
        return true;
      });
    }
    // Reliability score filter
    if (reliabilityScoreFilter !== 'all') {
      filtered = filtered.filter(c => {
        const score = c.reliability_score;
        if (reliabilityScoreFilter === 'high') return score !== null && score >= 80;
        if (reliabilityScoreFilter === 'medium') return score !== null && score >= 50 && score < 80;
        if (reliabilityScoreFilter === 'low') return score !== null && score < 50;
        if (reliabilityScoreFilter === 'new') return score === null;
        return true;
      });
    }
    // Tag filter (OR logic - show creators with ANY of the selected tags)
    if (selectedTagFilters.length > 0) {
      filtered = filtered.filter(c => {
        const creatorTags = creatorTagsMap.get(c.id) || [];
        return selectedTagFilters.some(tag => creatorTags.includes(tag));
      });
    }
    // Apply sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        if (sortBy === 'joined') {
          const aDate = new Date(a.first_interaction_at || a.date_joined || 0).getTime();
          const bDate = new Date(b.first_interaction_at || b.date_joined || 0).getTime();
          return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
        }
        const aVal = sortBy === 'views' ? a.total_views : a.total_earnings;
        const bVal = sortBy === 'views' ? b.total_views : b.total_earnings;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }
    return filtered;
  }, [creators, searchQuery, selectedCampaignFilter, platformFilter, sourceFilter, statusFilter, demographicScoreFilter, reliabilityScoreFilter, selectedTagFilters, creatorTagsMap, sortBy, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedCreators.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const filteredCreators = filteredAndSortedCreators.slice(startIndex, endIndex);
  const totalCreators = filteredAndSortedCreators.length;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCampaignFilter, platformFilter, sourceFilter, statusFilter, selectedTagFilters, sortBy, sortOrder, itemsPerPage]);

  // Sync pending filters when panel opens
  useEffect(() => {
    if (filtersExpanded) {
      setPendingCampaignFilter(selectedCampaignFilter);
      setPendingPlatformFilter(platformFilter);
      setPendingStatusFilter(statusFilter);
      setPendingSourceFilter(sourceFilter);
      setPendingDemographicScoreFilter(demographicScoreFilter);
      setPendingReliabilityScoreFilter(reliabilityScoreFilter);
      setPendingTagFilters([...selectedTagFilters]);
    }
  }, [filtersExpanded]);

  // Apply pending filters
  const applyFilters = () => {
    // Store current filters for undo
    setLastAppliedFilters({
      campaign: selectedCampaignFilter,
      platform: platformFilter,
      status: statusFilter,
      source: sourceFilter,
      demographic: demographicScoreFilter,
      reliability: reliabilityScoreFilter,
      tags: [...selectedTagFilters],
    });

    // Apply pending to actual
    setSelectedCampaignFilter(pendingCampaignFilter);
    setPlatformFilter(pendingPlatformFilter);
    setStatusFilter(pendingStatusFilter);
    setSourceFilter(pendingSourceFilter);
    setDemographicScoreFilter(pendingDemographicScoreFilter);
    setReliabilityScoreFilter(pendingReliabilityScoreFilter);
    setSelectedTagFilters([...pendingTagFilters]);

    // Save to localStorage for persistence
    try {
      const filtersToSave = {
        campaign: pendingCampaignFilter,
        platform: pendingPlatformFilter,
        status: pendingStatusFilter,
        source: pendingSourceFilter,
        demographic: pendingDemographicScoreFilter,
        reliability: pendingReliabilityScoreFilter,
        tags: pendingTagFilters,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (e) {
      console.error('Failed to save filters:', e);
    }

    setFiltersExpanded(false);
  };

  // Reset all filters with undo toast
  const resetAllFilters = () => {
    // Store for undo
    const previousFilters = {
      campaign: selectedCampaignFilter,
      platform: platformFilter,
      status: statusFilter,
      source: sourceFilter,
      demographic: demographicScoreFilter,
      reliability: reliabilityScoreFilter,
      tags: [...selectedTagFilters],
    };

    // Reset applied filters
    setSelectedCampaignFilter('all');
    setPlatformFilter('all');
    setStatusFilter('all');
    setSourceFilter('all');
    setDemographicScoreFilter('all');
    setReliabilityScoreFilter('all');
    setSelectedTagFilters([]);

    // Reset pending filters
    setPendingCampaignFilter('all');
    setPendingPlatformFilter('all');
    setPendingStatusFilter('all');
    setPendingSourceFilter('all');
    setPendingDemographicScoreFilter('all');
    setPendingReliabilityScoreFilter('all');
    setPendingTagFilters([]);

    // Clear localStorage
    try {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear saved filters:', e);
    }

    // Show undo toast
    toast('Filters cleared', {
      action: {
        label: 'Undo',
        onClick: () => {
          setSelectedCampaignFilter(previousFilters.campaign);
          setPlatformFilter(previousFilters.platform);
          setStatusFilter(previousFilters.status);
          setSourceFilter(previousFilters.source);
          setDemographicScoreFilter(previousFilters.demographic);
          setReliabilityScoreFilter(previousFilters.reliability);
          setSelectedTagFilters(previousFilters.tags);
          setPendingCampaignFilter(previousFilters.campaign);
          setPendingPlatformFilter(previousFilters.platform);
          setPendingStatusFilter(previousFilters.status);
          setPendingSourceFilter(previousFilters.source);
          setPendingDemographicScoreFilter(previousFilters.demographic);
          setPendingReliabilityScoreFilter(previousFilters.reliability);
          setPendingTagFilters(previousFilters.tags);
          // Restore localStorage on undo
          try {
            localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(previousFilters));
          } catch (e) {
            console.error('Failed to restore saved filters:', e);
          }
        },
      },
      duration: 5000,
    });
  };

  // Count active filters
  const activeFilterCount = [
    selectedCampaignFilter !== 'all',
    platformFilter !== 'all',
    statusFilter !== 'all',
    sourceFilter !== 'all',
    demographicScoreFilter !== 'all',
    reliabilityScoreFilter !== 'all',
    selectedTagFilters.length > 0
  ].filter(Boolean).length;

  // Check if pending filters differ from applied
  const hasPendingChanges =
    pendingCampaignFilter !== selectedCampaignFilter ||
    pendingPlatformFilter !== platformFilter ||
    pendingStatusFilter !== statusFilter ||
    pendingSourceFilter !== sourceFilter ||
    pendingDemographicScoreFilter !== demographicScoreFilter ||
    pendingReliabilityScoreFilter !== reliabilityScoreFilter ||
    JSON.stringify(pendingTagFilters.sort()) !== JSON.stringify([...selectedTagFilters].sort());

  const handleExportCSV = () => {
    // Export ALL rows that match the current filters/sort (not just the current page)
    const exportCreators = filteredAndSortedCreators;

    const headers = ['Username', 'Full Name', 'Email', 'Country', 'Total Views', 'Total Earnings', 'Social Accounts', 'Account URLs', 'Campaigns'];
    const rows = exportCreators.map(c => [
      c.username,
      c.full_name || '',
      c.email || '',
      c.country || '',
      c.total_views,
      c.total_earnings.toFixed(2),
      c.social_accounts.map(s => `${s.platform}:@${s.username}`).join('; '),
      c.social_accounts.map(s => s.account_link || '').filter(Boolean).join('; '),
      c.campaigns.map(camp => camp.title).join('; ')
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creators-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };
  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error('Please enter data to import');
      return;
    }
    setImportLoading(true);
    try {
      // Parse CSV data
      const lines = importData.trim().split('\n');
      const imported = [];
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2) {
          const [platform, username] = parts;
          if (platform && username) {
            imported.push({
              platform: platform.toLowerCase(),
              username: username.replace('@', '')
            });
          }
        }
      }
      if (imported.length === 0) {
        toast.error('No valid data found. Format: platform,username');
        return;
      }

      // Here you could add logic to track these accounts or invite them
      toast.success(`Parsed ${imported.length} creators. Import functionality coming soon.`);
      setAddCreatorsDialogOpen(false);
      setImportData('');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data');
    } finally {
      setImportLoading(false);
    }
  };
  const toggleSelectAll = () => {
    if (selectedCreators.size === filteredCreators.length) {
      setSelectedCreators(new Set());
    } else {
      setSelectedCreators(new Set(filteredCreators.map(c => c.id)));
    }
  };
  const toggleCreatorSelection = (id: string) => {
    const newSet = new Set(selectedCreators);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCreators(newSet);
  };
  const handleBulkMessage = () => {
    if (selectedCreators.size === 0) return;
    setBulkMessageDialogOpen(true);
  };
  const handleSendBulkMessage = async () => {
    if (!bulkMessage.trim() || selectedCreators.size === 0) {
      toast.error('Please enter a message');
      return;
    }
    setSendingBulkMessage(true);
    const selectedCreatorIds = Array.from(selectedCreators);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    for (const creatorId of selectedCreatorIds) {
      const creator = creators.find(c => c.id === creatorId);
      if (!creator) continue;
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('send-discord-dm', {
          body: {
            userId: creatorId,
            message: bulkMessage
          }
        });
        if (error) {
          failCount++;
          errors.push(`${creator.username}: ${error.message}`);
        } else if (data?.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${creator.username}: ${data?.error || 'Failed to send'}`);
        }
      } catch (err) {
        failCount++;
        errors.push(`${creator.username}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    setSendingBulkMessage(false);
    if (successCount > 0) {
      toast.success(`Message sent to ${successCount} creator${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to send to ${failCount} creator${failCount > 1 ? 's' : ''} (Discord not linked or error)`);
    }
    if (successCount > 0) {
      setBulkMessageDialogOpen(false);
      setBulkMessage("");
      setSelectedCreators(new Set());
    }
  };
  const handleAddToCampaign = async () => {
    if (!selectedCampaignToAdd || selectedCreators.size === 0) {
      toast.error('Please select a campaign');
      return;
    }
    setAddingToCampaign(true);
    try {
      // Check if it's a boost or campaign
      const isBoost = campaigns.find(c => c.id === selectedCampaignToAdd);
      const selectedCreatorIds = Array.from(selectedCreators);

      // For now, create invitations or applications
      for (const creatorId of selectedCreatorIds) {
        // Check if already in boost
        const {
          data: existingApp
        } = await supabase.from('bounty_applications').select('id').eq('bounty_campaign_id', selectedCampaignToAdd).eq('user_id', creatorId).single();
        if (!existingApp) {
          // Get creator's video URL if available
          const creator = creators.find(c => c.id === creatorId);
          const videoUrl = creator?.social_accounts[0]?.account_link || '';
          await supabase.from('bounty_applications').insert({
            bounty_campaign_id: selectedCampaignToAdd,
            user_id: creatorId,
            status: 'accepted',
            video_url: videoUrl
          });
        }
      }
      toast.success(`Added ${selectedCreatorIds.length} creator${selectedCreatorIds.length > 1 ? 's' : ''} to campaign`);
      setAddToCampaignDialogOpen(false);
      setSelectedCampaignToAdd('');
      setSelectedCreators(new Set());
      fetchCreators();
    } catch (error) {
      console.error('Error adding to campaign:', error);
      toast.error('Failed to add creators to campaign');
    } finally {
      setAddingToCampaign(false);
    }
  };
  const handleViewProfile = (creator: Creator) => {
    if (creator.is_external) {
      // For external creators, try to open their social profile
      if (creator.external_handle && creator.external_platform) {
        const platformUrls: Record<string, string> = {
          tiktok: `https://tiktok.com/@${creator.external_handle}`,
          instagram: `https://instagram.com/${creator.external_handle}`,
          youtube: `https://youtube.com/@${creator.external_handle}`,
          x: `https://x.com/${creator.external_handle}`
        };
        window.open(platformUrls[creator.external_platform] || `https://${creator.external_platform}.com/@${creator.external_handle}`, '_blank');
      } else {
        toast.info('No profile link available for this external creator');
      }
    } else {
      window.open(`/@${creator.username}`, '_blank');
    }
  };
  const handleSendMessage = async (creator: Creator) => {
    try {
      // Check if conversation already exists
      const {
        data: existingConversation
      } = await supabase.from('conversations').select('id').eq('brand_id', brandId).eq('creator_id', creator.id).maybeSingle();
      let conversationId: string;
      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const {
          data: newConversation,
          error
        } = await supabase.from('conversations').insert({
          brand_id: brandId,
          creator_id: creator.id
        }).select().single();
        if (error) throw error;
        conversationId = newConversation.id;
      }

      // Navigate to messages tab with conversation ID
      const newParams = new URLSearchParams(searchParams);
      newParams.set('subtab', 'messages');
      newParams.set('conversation', conversationId);
      setSearchParams(newParams);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };
  const handleKickFromCampaign = async () => {
    if (!campaignToKickFrom) return;
    setKickingFromCampaign(true);
    try {
      const {
        creatorId,
        campaignId,
        campaignType,
        campaignTitle
      } = campaignToKickFrom;
      if (campaignType === 'boost') {
        // Remove from bounty_applications
        const {
          error: appError
        } = await supabase.from('bounty_applications').delete().eq('bounty_campaign_id', campaignId).eq('user_id', creatorId);
        if (appError) throw appError;

        // Also remove any boost video submissions
        const {
          error: subError
        } = await supabase.from('boost_video_submissions').delete().eq('bounty_campaign_id', campaignId).eq('user_id', creatorId);
        if (subError) throw subError;

        // Remove from unified video_submissions (this is what powers the "Active Campaigns" list)
        const {
          error: vsBoostError
        } = await supabase.from('video_submissions').delete().eq('source_type', 'boost').eq('source_id', campaignId).eq('creator_id', creatorId);
        if (vsBoostError) throw vsBoostError;
      } else {
        // Remove from social_account_campaigns junction table
        const {
          data: socialAccounts
        } = await supabase.from('social_accounts').select('id').eq('user_id', creatorId);
        if (socialAccounts && socialAccounts.length > 0) {
          const {
            error: sacError
          } = await supabase.from('social_account_campaigns').delete().eq('campaign_id', campaignId).in('social_account_id', socialAccounts.map(sa => sa.id));
          if (sacError) throw sacError;
        }

        // Remove video submissions
        const {
          error: vsError
        } = await supabase.from('video_submissions').delete().eq('source_id', campaignId).eq('creator_id', creatorId);
        if (vsError) throw vsError;
      }
      toast.success(`Removed creator from ${campaignTitle}`);
      setKickFromCampaignDialogOpen(false);
      setCampaignToKickFrom(null);
      fetchCreators();
    } catch (error) {
      console.error('Error removing from campaign:', error);
      toast.error('Failed to remove creator from campaign');
    } finally {
      setKickingFromCampaign(false);
    }
  };
  const handleRemoveCreator = async () => {
    if (!creatorToRemove) return;

    // Check if creator is in any campaigns
    if (creatorToRemove.campaigns.length > 0) {
      toast.error('Please remove this creator from all campaigns first');
      setRemoveCreatorDialogOpen(false);
      return;
    }
    setRemovingCreator(true);
    try {
      // Remove all video submissions for this brand
      await supabase.from('video_submissions').delete().eq('brand_id', brandId).eq('creator_id', creatorToRemove.id);

      // Remove any conversations
      await supabase.from('conversations').delete().eq('brand_id', brandId).eq('creator_id', creatorToRemove.id);
      toast.success(`Removed ${creatorToRemove.full_name || creatorToRemove.username} from database`);
      setRemoveCreatorDialogOpen(false);
      setCreatorToRemove(null);
      fetchCreators();
    } catch (error) {
      console.error('Error removing creator:', error);
      toast.error('Failed to remove creator from database');
    } finally {
      setRemovingCreator(false);
    }
  };
  const initiateRemoveCreator = (creator: Creator) => {
    if (creator.campaigns.length > 0) {
      toast.error(`This creator is active in ${creator.campaigns.length} campaign(s). Remove them from campaigns first.`, {
        description: creator.campaigns.map(c => c.title).join(', ')
      });
      return;
    }
    setCreatorToRemove(creator);
    setRemoveCreatorDialogOpen(true);
  };
  return <div className="h-full flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white dark:bg-transparent border-b border-border px-[7px] py-[5px]">
        {/* Filters & Actions - Single Row */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Filter Toggle Button */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className={`h-8 px-2.5 gap-1.5 font-inter tracking-[-0.5px] text-xs rounded-md inline-flex items-center transition-colors border border-border dark:border-transparent ${
              activeFilterCount > 0
                ? 'bg-muted/50 text-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <Icon icon="material-symbols:filter-alt" className="h-3.5 w-3.5" />
            <span className="font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-medium">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 ml-0.5 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button size="sm" onClick={() => setDiscoveryWizardOpen(true)} className="h-8 px-3 gap-1.5 font-inter tracking-[-0.5px] text-xs border-t border-primary/70 bg-primary hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" />
              Find Creators
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportCSV} className="h-8 px-3 gap-1.5 font-inter tracking-[-0.5px] text-xs bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground border border-border dark:border-transparent">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-3 gap-1.5 font-inter tracking-[-0.5px] text-xs bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground border border-border dark:border-transparent">
                  <Settings className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-3 bg-background border border-border shadow-lg z-50" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-inter tracking-[-0.5px] text-xs font-medium text-foreground">Columns</span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
                    <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
                      <div className="space-y-0.5">
                        {columnOrder.map(colId => {
                        const col = ALL_COLUMNS.find(c => c.id === colId);
                        if (!col) return null;
                        return <SortableColumnItem key={col.id} id={col.id} label={col.label} isVisible={visibleColumns.has(col.id)} isRequired={col.required} onToggle={() => toggleColumnVisibility(col.id)} />;
                      })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Inline Collapsible Filter Panel */}
        <div
          className="grid transition-all duration-300 ease-out"
          style={{ gridTemplateRows: filtersExpanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="px-4 py-3">
              <div className="space-y-4">
              {/* Filter Groups */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Selection Group */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-foreground font-inter">Selection</span>
                  <div className="space-y-2">
                    {/* Campaign Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">Program</label>
                      <Select value={pendingCampaignFilter} onValueChange={setPendingCampaignFilter}>
                        <SelectTrigger className="h-8 text-xs bg-background border-border/50 font-inter tracking-[-0.3px]">
                          <SelectValue placeholder="All programs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All programs</SelectItem>
                          {campaigns.map(campaign => (
                            <SelectItem key={campaign.id} value={campaign.id}>{campaign.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Platform Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">Platform</label>
                      <Select value={pendingPlatformFilter} onValueChange={setPendingPlatformFilter}>
                        <SelectTrigger className="h-8 text-xs bg-background border-border/50 font-inter tracking-[-0.3px]">
                          <SelectValue placeholder="All platforms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All platforms</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="twitter">Twitter/X</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Source & Status Group */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-foreground font-inter">Source & Status</span>
                  <div className="space-y-2">
                    {/* Source Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">Source</label>
                      <Select value={pendingSourceFilter} onValueChange={setPendingSourceFilter}>
                        <SelectTrigger className="h-8 text-xs bg-background border-border/50 font-inter tracking-[-0.3px]">
                          <SelectValue placeholder="All sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All sources</SelectItem>
                          <SelectItem value="organic">Organic</SelectItem>
                          <SelectItem value="campaign">Campaign</SelectItem>
                          <SelectItem value="boost">Boost</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="import">Import</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Status Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">Status</label>
                      <Select value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
                        <SelectTrigger className="h-8 text-xs bg-background border-border/50 font-inter tracking-[-0.3px]">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Scores Group */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-foreground font-inter">Scores</span>
                  <div className="space-y-2">
                    {/* Demographic Score Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">Audience Quality</label>
                      <Select value={pendingDemographicScoreFilter} onValueChange={setPendingDemographicScoreFilter}>
                        <SelectTrigger className="h-8 text-xs bg-background border-border/50 font-inter tracking-[-0.3px]">
                          <SelectValue placeholder="Any score" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any score</SelectItem>
                          <SelectItem value="90+">90+ (Excellent)</SelectItem>
                          <SelectItem value="70+">70+ (Good)</SelectItem>
                          <SelectItem value="50+">50+ (Average)</SelectItem>
                          <SelectItem value="<50">&lt;50 (Below avg)</SelectItem>
                          <SelectItem value="none">Not scored</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Reliability Score Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">Reliability</label>
                      <Select value={pendingReliabilityScoreFilter} onValueChange={setPendingReliabilityScoreFilter}>
                        <SelectTrigger className="h-8 text-xs bg-background border-border/50 font-inter tracking-[-0.3px]">
                          <SelectValue placeholder="Any reliability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any reliability</SelectItem>
                          <SelectItem value="90+">90+ (Excellent)</SelectItem>
                          <SelectItem value="70+">70+ (Good)</SelectItem>
                          <SelectItem value="50+">50+ (Average)</SelectItem>
                          <SelectItem value="<50">&lt;50 (Below avg)</SelectItem>
                          <SelectItem value="none">Not scored</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Tags Group */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-foreground font-inter">Tags</span>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">Filter by tags</label>
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 bg-background border border-border/50 rounded-md">
                      {availableTags.length === 0 ? (
                        <span className="text-xs text-muted-foreground/60 font-inter tracking-[-0.3px] px-1 py-0.5">No tags yet</span>
                      ) : (
                        availableTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => {
                              setPendingTagFilters(prev =>
                                prev.includes(tag)
                                  ? prev.filter(t => t !== tag)
                                  : [...prev, tag]
                              );
                            }}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium font-inter tracking-[-0.3px] transition-colors ${
                              pendingTagFilters.includes(tag)
                                ? 'bg-primary text-white'
                                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            {tag}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-between pt-3">
                <button
                  onClick={resetAllFilters}
                  disabled={activeFilterCount === 0 && !hasPendingChanges}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground font-inter tracking-[-0.3px] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset filters
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFiltersExpanded(false)}
                    className="h-7 px-3 text-xs font-medium text-muted-foreground hover:text-foreground font-inter tracking-[-0.3px] transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    size="sm"
                    onClick={applyFilters}
                    disabled={!hasPendingChanges}
                    className="h-7 px-3 text-xs font-inter tracking-[-0.3px] border-t border-primary/70 bg-primary hover:bg-primary/90 disabled:opacity-40"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Native scrolling container (supports horizontal swipe on mobile) */}
        <div className="flex-1 overflow-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
          <div className="min-w-full">
            <TooltipProvider delayDuration={100}>
              <Table className="min-w-[800px]">
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="w-[32px] h-11">
                      <Checkbox
                        checked={selectedCreators.size === filteredCreators.length && filteredCreators.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableHead>
                    {orderedVisibleColumns.map(colId => {
                      if (colId === 'views') {
                        return (
                          <TableHead
                            key={colId}
                            className="font-inter tracking-[-0.5px] text-xs text-muted-foreground font-medium text-right h-11 cursor-pointer select-none group/sort"
                            onClick={() => handleSort('views')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Views
                              <span
                                className={`transition-opacity ${sortBy === 'views' ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}
                              >
                                {sortBy === 'views' && sortOrder === 'asc' ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </span>
                            </div>
                          </TableHead>
                        );
                      }
                      if (colId === 'earnings') {
                        return (
                          <TableHead
                            key={colId}
                            className="font-inter tracking-[-0.5px] text-xs text-muted-foreground font-medium text-right h-11 cursor-pointer select-none group/sort"
                            onClick={() => handleSort('earnings')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Earnings
                              <span
                                className={`transition-opacity ${sortBy === 'earnings' ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}
                              >
                                {sortBy === 'earnings' && sortOrder === 'asc' ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </span>
                            </div>
                          </TableHead>
                        );
                      }
                      if (colId === 'joined') {
                        return (
                          <TableHead
                            key={colId}
                            className="font-inter tracking-[-0.5px] text-xs text-muted-foreground font-medium h-11 cursor-pointer select-none group/sort"
                            onClick={() => handleSort('joined')}
                          >
                            <div className="flex items-center gap-1">
                              Joined
                              <span
                                className={`transition-opacity ${sortBy === 'joined' ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}
                              >
                                {sortBy === 'joined' && sortOrder === 'asc' ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </span>
                            </div>
                          </TableHead>
                        );
                      }
                      const col = ALL_COLUMNS.find(c => c.id === colId);
                      return (
                        <TableHead key={colId} className="font-inter tracking-[-0.5px] text-xs text-muted-foreground font-medium h-11">
                          {col?.label}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreators.length === 0 && (searchQuery || selectedCampaignFilter !== 'all') ? (
                    <TableRow>
                      <TableCell
                        colSpan={orderedVisibleColumns.length + 1}
                        className="text-center py-12 text-muted-foreground font-inter tracking-[-0.5px]"
                      >
                        No creators match your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCreators.map(creator => (
                      <TableRow
                        key={creator.id}
                        className={`bg-white hover:bg-muted/30 dark:bg-transparent dark:hover:bg-muted/20 border-b border-border/30 group cursor-pointer ${
                          selectedCreatorPanel?.id === creator.id ? 'bg-muted/30 dark:bg-muted/30' : ''
                        }`}
                        onClick={() =>
                          setSelectedCreatorPanel(selectedCreatorPanel?.id === creator.id ? null : creator)
                        }
                      >
                        <TableCell className="py-3 w-[32px]" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedCreators.has(creator.id)}
                            onCheckedChange={() => toggleCreatorSelection(creator.id)}
                            className={`h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-opacity ${
                              selectedCreators.has(creator.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          />
                        </TableCell>
                        {orderedVisibleColumns.map(colId => {
                          switch (colId) {
                            case 'creator':
                              return (
                                <TableCell key={colId} className="py-3">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={creator.avatar_url || undefined} />
                                      <AvatarFallback className="bg-slate-200 dark:bg-muted/60 text-slate-600 dark:text-foreground text-[11px] font-medium">
                                        {(creator.full_name || creator.username || creator.external_name)
                                          ?.charAt(0)
                                          .toUpperCase() || 'C'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className="font-medium text-[13px] font-inter tracking-[-0.5px] truncate group-hover:underline">
                                          {creator.full_name || creator.username || creator.external_name}
                                        </p>
                                        {creator.is_external && (
                                          <span className="text-[9px] font-inter tracking-[-0.5px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                            External
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground font-inter tracking-[-0.5px]">
                                        {creator.is_external
                                          ? creator.external_handle
                                            ? `@${creator.external_handle}`
                                            : creator.external_email || 'No handle'
                                          : `@${creator.username}`}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                              );
                            case 'source':
                              return (
                                <TableCell key={colId} className="py-3">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        className={`text-[11px] font-geist tracking-[-0.02em] px-2 py-0.5 rounded ${getSourceColor(
                                          creator.source_type,
                                          creator.campaigns.length > 0,
                                        )}`}
                                      >
                                        {getSourceLabel(creator.source_type, creator.campaigns.length > 0)}
                                      </span>
                                    </TooltipTrigger>
                                    {creator.source_campaign_title && (
                                      <TooltipContent side="top" className="font-inter tracking-[-0.5px] text-xs">
                                        <p>From: {creator.source_campaign_title}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TableCell>
                              );
                            case 'socials':
                              return (
                                <TableCell key={colId} className="py-3">
                                  <div className="flex items-center gap-1">
                                    {creator.social_accounts.slice(0, 4).map((account, idx) => (
                                      <Tooltip key={idx}>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={
                                              account.account_link || `https://${account.platform}.com/@${account.username}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted/70 border border-border/30 transition-colors"
                                          >
                                            <img
                                              src={PLATFORM_LOGOS[account.platform] || PLATFORM_LOGOS.tiktok}
                                              alt={account.platform}
                                              className="h-4 w-4"
                                            />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="font-inter tracking-[-0.5px] text-xs">
                                          <p className="font-medium">@{account.username}</p>
                                          {account.follower_count != null && Number(account.follower_count) > 0 && (
                                            <p className="text-muted-foreground">
                                              {formatNumber(account.follower_count)} followers
                                            </p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                    {creator.social_accounts.length > 4 && (
                                      <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px] ml-0.5">
                                        +{creator.social_accounts.length - 4}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            case 'contact':
                              return (
                                <TableCell key={colId} className="py-3">
                                  <div className="flex items-center gap-1.5">
                                    {/* Message - always visible (Material Icon: Forum filled) */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onStartConversation?.(creator.id);
                                          }}
                                          className="flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted/70 border border-border/30 transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
                                          </svg>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="font-inter tracking-[-0.5px] text-xs">
                                        <p>Send message</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    {/* Email - visible if has email (Material Icon: Mail filled) */}
                                    {(creator.email || creator.external_email) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={`mailto:${creator.email || creator.external_email}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted/70 border border-border/30 transition-colors text-muted-foreground hover:text-foreground"
                                          >
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                            </svg>
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="font-inter tracking-[-0.5px] text-xs">
                                          <p>{creator.email || creator.external_email}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {/* Phone - visible if has phone number (Material Icon: Phone filled) */}
                                    {creator.phone_number && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={`tel:${creator.phone_number}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted/70 border border-border/30 transition-colors text-muted-foreground hover:text-foreground"
                                          >
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                            </svg>
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="font-inter tracking-[-0.5px] text-xs">
                                          <p>{creator.phone_number}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {/* Discord - visible if has discord */}
                                    {creator.discord_username && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted/70 border border-border/30 transition-colors text-muted-foreground hover:text-foreground cursor-default">
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                                            </svg>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="font-inter tracking-[-0.5px] text-xs">
                                          <p>{creator.discord_username}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            case 'views':
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-right text-[13px] font-medium font-inter tracking-[-0.5px] py-3"
                                >
                                  {formatNumber(creator.total_views)}
                                </TableCell>
                              );
                            case 'earnings':
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-right text-[13px] font-medium font-inter tracking-[-0.5px] py-3 text-emerald-500"
                                >
                                  ${creator.total_earnings.toFixed(2)}
                                </TableCell>
                              );
                            case 'joined':
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-[12px] text-muted-foreground font-inter tracking-[-0.5px] py-3"
                                >
                                  {creator.date_joined
                                    ? format(new Date(creator.date_joined), 'MMM d, yyyy')
                                    : '-'}
                                </TableCell>
                              );
                            case 'email':
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-[12px] text-muted-foreground font-inter tracking-[-0.5px] py-3"
                                >
                                  {creator.email || creator.external_email || '-'}
                                </TableCell>
                              );
                            case 'phone':
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-[12px] text-muted-foreground font-inter tracking-[-0.5px] py-3"
                                >
                                  {creator.phone_number || '-'}
                                </TableCell>
                              );
                            case 'country':
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-[12px] text-muted-foreground font-inter tracking-[-0.5px] py-3"
                                >
                                  {creator.country || '-'}
                                </TableCell>
                              );
                            default:
                              return null;
                          }
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </div>

          {totalCreators > 0 && <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                <span>Show</span>
                <Select value={itemsPerPage.toString()} onValueChange={v => setItemsPerPage(Number(v))}>
                  <SelectTrigger className="h-7 w-[70px] text-xs border-0 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map(option => <SelectItem key={option} value={option.toString()} className="text-xs">
                        {option}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                <span>of {totalCreators.toLocaleString()} creators</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mr-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} aria-label="Go to first page">
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Go to previous page">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label="Go to next page">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} aria-label="Go to last page">
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>}
          </div>

      {/* Creator Details Panel - Floating Overlay */}
      {selectedCreatorPanel && <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40 animate-fade-in" onClick={() => setSelectedCreatorPanel(null)} />
          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-[420px] border-l border-border/50 bg-background flex flex-col z-50 shadow-2xl animate-slide-in-right">
          <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={selectedCreatorPanel.avatar_url || undefined} />
                <AvatarFallback className="bg-slate-200 dark:bg-muted/60 text-slate-600 dark:text-foreground text-xs font-medium">
                  {(selectedCreatorPanel.full_name || selectedCreatorPanel.username || selectedCreatorPanel.external_name)?.charAt(0).toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 -space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm font-inter tracking-[-0.5px] truncate leading-tight">
                    {selectedCreatorPanel.full_name || selectedCreatorPanel.username || selectedCreatorPanel.external_name}
                  </p>
                  {selectedCreatorPanel.is_external && <span className="text-[9px] font-inter tracking-[-0.5px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded flex-shrink-0">
                      External
                    </span>}
                </div>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate leading-tight">
                  {selectedCreatorPanel.is_external ? selectedCreatorPanel.external_handle ? `@${selectedCreatorPanel.external_handle}` : selectedCreatorPanel.external_email || 'No handle' : `@${selectedCreatorPanel.username}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button className="h-7 w-7 rounded-sm hover:bg-muted/50 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none" onClick={() => {
              const currentIndex = filteredCreators.findIndex(c => c.id === selectedCreatorPanel?.id);
              if (currentIndex > 0) {
                setSelectedCreatorPanel(filteredCreators[currentIndex - 1]);
              }
            }} disabled={filteredCreators.findIndex(c => c.id === selectedCreatorPanel?.id) <= 0} aria-label="Previous creator">
                <ChevronUp className="h-4 w-4 text-foreground" />
              </button>
              <button className="h-7 w-7 rounded-sm hover:bg-muted/50 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none" onClick={() => {
              const currentIndex = filteredCreators.findIndex(c => c.id === selectedCreatorPanel?.id);
              if (currentIndex < filteredCreators.length - 1) {
                setSelectedCreatorPanel(filteredCreators[currentIndex + 1]);
              }
            }} disabled={filteredCreators.findIndex(c => c.id === selectedCreatorPanel?.id) >= filteredCreators.length - 1} aria-label="Next creator">
                <ChevronDown className="h-4 w-4 text-foreground" />
              </button>
              <button className="h-7 w-7 rounded-sm hover:bg-muted/50 flex items-center justify-center" onClick={() => setSelectedCreatorPanel(null)} aria-label="Close panel">
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Details */}
              <div className="space-y-4">
                {/* Source - Full width */}
                <div className="p-3 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/50 dark:border-transparent">
                  <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.03em] mb-1.5">Source</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-geist tracking-[-0.02em] px-2 py-0.5 rounded ${getSourceColor(selectedCreatorPanel.source_type, selectedCreatorPanel.campaigns.length > 0)}`}>
                      {getSourceLabel(selectedCreatorPanel.source_type, selectedCreatorPanel.campaigns.length > 0)}
                    </span>
                    {selectedCreatorPanel.source_campaign_title && <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                        {selectedCreatorPanel.source_campaign_title}
                      </span>}
                  </div>
                </div>

                {/* Contact Info - 2 column grid */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedCreatorPanel.email && <div>
                      <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.03em] mb-1">Email</p>
                      <button onClick={() => {
                    navigator.clipboard.writeText(selectedCreatorPanel.email || '');
                    toast.success('Email copied to clipboard');
                  }} className="group flex items-center gap-1.5 text-xs font-inter tracking-[-0.5px] hover:text-foreground/80 transition-colors cursor-pointer">
                        <span className="truncate">{selectedCreatorPanel.email}</span>
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground flex-shrink-0" />
                      </button>
                    </div>}
                  {selectedCreatorPanel.phone_number && <div>
                      <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.03em] mb-1">Phone</p>
                      <button onClick={() => {
                    navigator.clipboard.writeText(selectedCreatorPanel.phone_number || '');
                    toast.success('Phone number copied to clipboard');
                  }} className="group flex items-center gap-1.5 text-xs font-inter tracking-[-0.5px] hover:text-foreground/80 transition-colors cursor-pointer">
                        <span>{selectedCreatorPanel.phone_number}</span>
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground flex-shrink-0" />
                      </button>
                    </div>}
                  {selectedCreatorPanel.discord_username && <div>
                      <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.03em] mb-1">Discord</p>
                      <div className="flex items-center gap-1.5">
                        <img alt="Discord" className="h-3.5 w-3.5 dark:hidden" src={discordIconDark} />
                        <img alt="Discord" className="h-3.5 w-3.5 hidden dark:block" src="/lovable-uploads/de420cc8-50b3-487b-acbf-885797de1c29.webp" />
                        <p className="text-xs font-inter tracking-[-0.5px] truncate">{selectedCreatorPanel.discord_username}</p>
                      </div>
                    </div>}
                  {(selectedCreatorPanel.city || selectedCreatorPanel.country) && <div>
                      <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.03em] mb-1">Location</p>
                      <p className="text-xs font-inter tracking-[-0.5px]">
                        {[selectedCreatorPanel.city, selectedCreatorPanel.country].filter(Boolean).join(', ')}
                      </p>
                    </div>}
                  {selectedCreatorPanel.first_interaction_at && <div>
                      <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.03em] mb-1">First Interaction</p>
                      <p className="text-xs font-inter tracking-[-0.5px]">{format(new Date(selectedCreatorPanel.first_interaction_at), 'MMM d, yyyy')}</p>
                    </div>}
                  {selectedCreatorPanel.date_joined && <div>
                      <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.03em] mb-1">Joined Platform</p>
                      <p className="text-xs font-inter tracking-[-0.5px]">{format(new Date(selectedCreatorPanel.date_joined), 'MMM d, yyyy')}</p>
                    </div>}
                </div>
              </div>

              {/* Social Accounts */}
              {selectedCreatorPanel.social_accounts.length > 0 && <div>
                  <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.03em] mb-2">Social Accounts</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCreatorPanel.social_accounts.map((account, idx) => <a key={idx} href={account.account_link || `https://${account.platform}.com/@${account.username}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2.5 p-2.5 rounded-lg transition-colors bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/30 border border-border/50 dark:border-transparent">
                        <img src={PLATFORM_LOGOS[account.platform] || PLATFORM_LOGOS.tiktok} alt={account.platform} className="h-5 w-5" />
                        <span className="text-xs font-medium font-inter tracking-[-0.5px] truncate">{account.username}</span>
                      </a>)}
                  </div>
                </div>}

              {/* Campaigns */}
              {selectedCreatorPanel.campaigns.length > 0 && <div>
                  <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-2">Active Campaigns</p>
                  <div className="space-y-1">
                    {selectedCreatorPanel.campaigns.map(campaign => <div key={campaign.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs font-inter tracking-[-0.5px]">{campaign.title}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md bg-red-500/10 hover:bg-red-500/10" onClick={e => {
                    e.stopPropagation();
                    setCampaignToKickFrom({
                      creatorId: selectedCreatorPanel.id,
                      campaignId: campaign.id,
                      campaignTitle: campaign.title,
                      campaignType: campaign.type
                    });
                    setKickFromCampaignDialogOpen(true);
                  }} aria-label="Remove creator from campaign">
                          <img src={removeCreatorIcon} alt="Remove" className="h-4 w-4" />
                        </Button>
                      </div>)}
                  </div>
                </div>}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="p-4 border-t border-border/50 flex flex-col gap-3">
            {/* Primary Actions */}
            {!selectedCreatorPanel.is_external && selectedCreatorPanel.id && (
              <div className="flex flex-col gap-2">
                {/* Message - Full width primary */}
                <button
                  className="w-full py-2.5 text-xs font-medium font-inter tracking-[-0.3px] bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5"
                  onClick={e => {
                    e.stopPropagation();
                    handleSendMessage(selectedCreatorPanel);
                  }}
                >
                  <span className="material-symbols-rounded text-[16px]">mail</span>
                  Message
                </button>
                {/* Pay & Review side by side */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="py-2.5 text-xs font-medium font-inter tracking-[-0.3px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                    onClick={e => {
                      e.stopPropagation();
                      setCreatorToPay({
                        id: selectedCreatorPanel.id,
                        username: selectedCreatorPanel.username,
                        full_name: selectedCreatorPanel.full_name,
                        avatar_url: selectedCreatorPanel.avatar_url
                      });
                      setManualPayDialogOpen(true);
                    }}
                  >
                    <span className="material-symbols-rounded text-[16px]">approval_delegation</span>
                    Pay
                  </button>
                  <button
                    className="py-2.5 text-xs font-medium font-inter tracking-[-0.3px] bg-muted/50 text-foreground rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5 border border-border/50 dark:border-transparent"
                    onClick={e => {
                      e.stopPropagation();
                      setTestimonialCreator(selectedCreatorPanel);
                      setTestimonialDialogOpen(true);
                    }}
                  >
                    <Star className="h-3.5 w-3.5" />
                    Review
                  </button>
                </div>
              </div>
            )}
            {/* Remove Button */}
            <button
              className="w-full py-2 text-xs font-medium font-inter tracking-[-0.3px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              onClick={e => {
                e.stopPropagation();
                initiateRemoveCreator(selectedCreatorPanel);
              }}
              disabled={selectedCreatorPanel.campaigns.length > 0}
            >
              <span className="material-symbols-rounded text-[16px]">person_remove</span>
              Remove from database
            </button>
          </div>
        </div>
        </>}

      {/* Bulk Actions Bar */}
      {selectedCreators.size > 0 && <div className="border-t border-border/50 px-4 py-3 bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            
            <span className="text-sm font-inter tracking-[-0.3px] text-foreground/80">
              <span className="font-medium text-foreground">{selectedCreators.size}</span> creator{selectedCreators.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSelectedCreators(new Set())} className="px-3 py-1.5 text-xs font-inter tracking-[-0.3px] text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50">
              Clear
            </button>
            <button onClick={handleBulkMessage} className="px-3.5 py-1.5 text-xs font-inter tracking-[-0.3px] text-black bg-white rounded-md hover:bg-gray-50 transition-all flex items-center shadow-sm">
              Message
            </button>
            <button onClick={() => setAddToCampaignDialogOpen(true)} className="px-3.5 py-1.5 text-xs font-inter tracking-[-0.3px] text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm">
              <Plus className="h-3 w-3" />
              Add to Campaign
            </button>
            <button onClick={() => setBulkPitchDialogOpen(true)} className="px-3.5 py-1.5 text-xs font-inter tracking-[-0.3px] text-primary-foreground bg-emerald-600 rounded-md hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm">
              <MessageSquare className="h-3 w-3" />
              Invite to Campaign
            </button>
          </div>
        </div>}

      {/* Add to Campaign Dialog */}
      <Dialog open={addToCampaignDialogOpen} onOpenChange={setAddToCampaignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-instrument tracking-tight">Add to Campaign</DialogTitle>
            <DialogDescription className="font-inter tracking-[-0.3px]">
              Add {selectedCreators.size} selected creator{selectedCreators.size > 1 ? 's' : ''} to a campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.3px] text-sm">Select Campaign</Label>
              <Select value={selectedCampaignToAdd} onValueChange={setSelectedCampaignToAdd}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(campaign => <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {campaigns.length === 0 && <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                  No campaigns available. Create a campaign first to add creators.
                </p>
              </div>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddToCampaignDialogOpen(false)} className="font-inter tracking-[-0.3px]">
              Cancel
            </Button>
            <Button onClick={handleAddToCampaign} disabled={addingToCampaign || !selectedCampaignToAdd} className="font-inter tracking-[-0.3px]">
              {addingToCampaign ? 'Adding...' : 'Add to Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Message Dialog */}
      <Dialog open={bulkMessageDialogOpen} onOpenChange={setBulkMessageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-instrument tracking-tight">Send Message</DialogTitle>
            <DialogDescription className="font-inter tracking-[-0.3px]">
              Send a Discord DM to {selectedCreators.size} selected creator{selectedCreators.size > 1 ? 's' : ''}. Only creators with linked Discord accounts will receive the message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.3px] text-sm">Message</Label>
              <Textarea placeholder="Type your message here..." value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} className="min-h-[120px] font-inter tracking-[-0.3px] text-sm resize-none" />
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/30 border border-border/40 rounded-lg">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Messages are sent via Discord. Creators without a linked Discord account will not receive the message.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBulkMessageDialogOpen(false)} className="font-inter tracking-[-0.3px]">
              Cancel
            </Button>
            <Button onClick={handleSendBulkMessage} disabled={sendingBulkMessage || !bulkMessage.trim()} className="font-inter tracking-[-0.3px]">
              {sendingBulkMessage ? 'Sending...' : `Send to ${selectedCreators.size} Creator${selectedCreators.size > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addCreatorsDialogOpen} onOpenChange={setAddCreatorsDialogOpen}>
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden bg-background border border-border">
          {/* Header */}
          
          
          <Tabs value={addCreatorsMode} onValueChange={v => setAddCreatorsMode(v as 'search' | 'import' | 'manual')} className="flex-1 flex flex-col">
            {/* Tab Pills */}
            <div className="px-6 border-b border-border">
              <div className="flex gap-6">
                <button onClick={() => setAddCreatorsMode('search')} className={`px-1 py-3 text-sm font-inter tracking-[-0.5px] transition-all border-b-2 ${addCreatorsMode === 'search' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  Find
                </button>
                <button onClick={() => setAddCreatorsMode('manual')} className={`px-1 py-3 text-sm font-inter tracking-[-0.5px] transition-all border-b-2 ${addCreatorsMode === 'manual' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  Manual
                </button>
                <button onClick={() => setAddCreatorsMode('import')} className={`px-1 py-3 text-sm font-inter tracking-[-0.5px] transition-all border-b-2 ${addCreatorsMode === 'import' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  Import
                </button>
              </div>
            </div>
            
            {/* Find Creators Tab */}
            <TabsContent value="search" className="flex-1 mt-0 px-6 py-4">
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input placeholder="Search creators..." value={discoverSearch} onChange={e => setDiscoverSearch(e.target.value)} className="pl-10 h-11 bg-muted/30 border-0 font-inter text-sm focus-visible:ring-1 focus-visible:ring-primary/20" />
                </div>
                
                {/* Filters Row */}
                <div className="flex gap-2">
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="h-9 text-xs bg-muted/30 border-0 w-auto min-w-[110px]">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">All Platforms</SelectItem>
                      {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={followerFilter} onValueChange={setFollowerFilter}>
                    <SelectTrigger className="h-9 text-xs bg-muted/30 border-0 w-auto min-w-[90px]">
                      <SelectValue placeholder="Followers" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {FOLLOWER_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="h-9 text-xs bg-muted/30 border-0 w-auto min-w-[110px]">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">All Countries</SelectItem>
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Results */}
                <ScrollArea className="h-[300px]">
                  {hasActivePlan === false ? <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                        <img src={vpnKeyIcon} alt="Key" className="h-6 w-6 opacity-60" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1 font-inter">Upgrade to Access</h3>
                      <p className="text-xs text-muted-foreground mb-5 font-inter">Subscribe to browse creators</p>
                      <Button size="sm" onClick={() => {
                    setAddCreatorsDialogOpen(false);
                    setSubscriptionGateOpen(true);
                  }}>
                        Upgrade Plan
                      </Button>
                    </div> : discoverLoading ? <div className="space-y-2">
                      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
                    </div> : discoverableCreators.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-inter">No creators found</p>
                    </div> : <div className="space-y-1">
                      {discoverableCreators.slice(0, 10).map(creator => <div key={creator.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors group">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={creator.avatar_url || undefined} />
                            <AvatarFallback className="text-xs font-medium bg-slate-200 dark:bg-muted/60 text-slate-600 dark:text-foreground">
                              {creator.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate font-inter">{creator.full_name || creator.username}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground truncate font-inter">@{creator.username}</p>
                              <div className="flex gap-1">
                                {creator.social_accounts.slice(0, 2).map(acc => <img key={acc.platform} src={PLATFORM_LOGOS[acc.platform]} alt={acc.platform} className="h-3 w-3 opacity-50" />)}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-8 px-3 text-xs font-inter opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" onClick={async () => {
                      try {
                        await supabase.from('brand_creator_relationships').insert({
                          brand_id: brandId,
                          user_id: creator.id,
                          source_type: 'manual_add'
                        });
                        toast.success(`Added ${creator.full_name || creator.username}`);
                        fetchCreators();
                      } catch (e) {
                        toast.error('Failed to add creator');
                      }
                    }}>
                            Add
                          </Button>
                        </div>)}
                    </div>}
                </ScrollArea>
              </div>
            </TabsContent>
            
            {/* Manual Add Tab */}
            <TabsContent value="manual" className="mt-0 px-6 py-4">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-inter tracking-[-0.5px] text-muted-foreground">Username</Label>
                    <Input placeholder="@username" value={manualCreator.username} onChange={e => setManualCreator(prev => ({
                    ...prev,
                    username: e.target.value
                  }))} className="h-11 bg-muted/30 border-0 font-inter tracking-[-0.5px]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-inter tracking-[-0.5px] text-muted-foreground">Full Name</Label>
                    <Input placeholder="John Doe" value={manualCreator.name} onChange={e => setManualCreator(prev => ({
                    ...prev,
                    name: e.target.value
                  }))} className="h-11 bg-muted/30 border-0 font-inter tracking-[-0.5px]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-inter tracking-[-0.5px] text-muted-foreground">Email</Label>
                    <Input type="email" placeholder="email@example.com" value={manualCreator.email} onChange={e => setManualCreator(prev => ({
                    ...prev,
                    email: e.target.value
                  }))} className="h-11 bg-muted/30 border-0 font-inter tracking-[-0.5px]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-inter tracking-[-0.5px] text-muted-foreground">Phone</Label>
                    <Input placeholder="+1 234 567 8900" value={manualCreator.phone} onChange={e => setManualCreator(prev => ({
                    ...prev,
                    phone: e.target.value
                  }))} className="h-11 bg-muted/30 border-0 font-inter tracking-[-0.5px]" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  Manually added creators are marked as external until they join.
                </p>
                <button className="w-fit py-2 px-4 bg-primary border-t border-primary/70 rounded-lg font-inter text-[14px] font-medium tracking-[-0.5px] text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={manualAddLoading || !manualCreator.username && !manualCreator.email} onClick={async () => {
                setManualAddLoading(true);
                try {
                  await supabase.from('brand_creator_relationships').insert({
                    brand_id: brandId,
                    external_name: manualCreator.name || null,
                    external_email: manualCreator.email || null,
                    external_handle: manualCreator.username.replace('@', '') || null,
                    source_type: 'manual_add'
                  });
                  toast.success('Creator added');
                  setManualCreator({
                    username: '',
                    name: '',
                    email: '',
                    phone: ''
                  });
                  fetchCreators();
                  setAddCreatorsDialogOpen(false);
                } catch (e) {
                  toast.error('Failed to add creator');
                } finally {
                  setManualAddLoading(false);
                }
              }}>
                  {manualAddLoading ? 'Adding...' : 'Add Creator'}
                </button>
              </div>
            </TabsContent>
            
            {/* Import CSV Tab */}
            <TabsContent value="import" className="mt-0 px-6 py-4">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-inter text-muted-foreground">Paste CSV Data</Label>
                  <Textarea placeholder="tiktok,@username&#10;instagram,@creator&#10;youtube,@channel" value={importData} onChange={e => setImportData(e.target.value)} className="min-h-[180px] font-mono text-sm bg-muted/30 border-0 resize-none" />
                </div>
                <p className="text-xs text-muted-foreground font-inter">
                  Format: <code className="bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">platform,username</code> per line
                </p>
                <Button onClick={handleImport} disabled={importLoading || !importData.trim()} className="w-full h-11">
                  {importLoading ? 'Importing...' : 'Import Creators'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Footer spacing */}
          <div className="h-4" />
        </DialogContent>
      </Dialog>

      <SubscriptionGateDialog brandId={brandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />

      {/* Remove from Campaign Confirmation */}
      <AlertDialog open={kickFromCampaignDialogOpen} onOpenChange={setKickFromCampaignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-instrument tracking-tight">Remove from Campaign</AlertDialogTitle>
            <AlertDialogDescription className="font-inter tracking-[-0.3px]">
              Are you sure you want to remove this creator from <span className="font-medium text-foreground">{campaignToKickFrom?.campaignTitle}</span>? 
              This will remove all their submissions and data associated with this campaign.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-inter tracking-[-0.3px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleKickFromCampaign} disabled={kickingFromCampaign} className="bg-amber-600 hover:bg-amber-700 font-inter tracking-[-0.3px]">
              {kickingFromCampaign ? 'Removing...' : 'Remove from Campaign'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove from Database Confirmation */}
      <AlertDialog open={removeCreatorDialogOpen} onOpenChange={setRemoveCreatorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-instrument tracking-tight">Remove from Database</AlertDialogTitle>
            <AlertDialogDescription className="font-inter tracking-[-0.3px]">
              Are you sure you want to remove <span className="font-medium text-foreground">{creatorToRemove?.full_name || creatorToRemove?.username}</span> from your database? 
              This will delete all their submission history and conversations with your brand.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-inter tracking-[-0.3px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveCreator} disabled={removingCreator} className="bg-destructive hover:bg-destructive/90 font-inter tracking-[-0.3px]">
              {removingCreator ? 'Removing...' : 'Remove from Database'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Testimonial Dialog */}
      {testimonialCreator && <LeaveTestimonialDialog open={testimonialDialogOpen} onOpenChange={setTestimonialDialogOpen} brandId={brandId} creatorId={testimonialCreator.id} creatorName={testimonialCreator.full_name || testimonialCreator.username || 'Creator'} creatorAvatarUrl={testimonialCreator.avatar_url} onSuccess={() => {
      setTestimonialCreator(null);
    }} />}


      {/* Find Creators Popup */}
      <FindCreatorsPopup
        open={discoveryWizardOpen}
        onOpenChange={setDiscoveryWizardOpen}
        brandId={brandId}
        onCreatorAdded={() => {
          fetchCreators();
          fetchAvailableTags();
        }}
      />

      {/* Manual Pay Creator Dialog */}
      <ManualPayCreatorDialog
        open={manualPayDialogOpen}
        onOpenChange={setManualPayDialogOpen}
        brandId={brandId}
        creator={creatorToPay}
        onSuccess={() => {
          setCreatorToPay(null);
        }}
      />

      {/* Bulk Pitch Dialog */}
      <BulkPitchDialog
        open={bulkPitchDialogOpen}
        onOpenChange={setBulkPitchDialogOpen}
        brandId={brandId}
        selectedCreators={creators
          .filter((c) => selectedCreators.has(c.relationship_id) && !c.is_external)
          .map((c) => ({
            id: c.id,
            username: c.username,
            full_name: c.full_name,
            avatar_url: c.avatar_url,
          }))}
        onSuccess={() => {
          setSelectedCreators(new Set());
        }}
      />
    </div>;
}