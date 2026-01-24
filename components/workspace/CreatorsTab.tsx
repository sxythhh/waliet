"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Download,
  Filter,
  Plus,
  X,
  Check,
  AlertCircle,
  Users,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Settings,
  Star,
  Copy,
  RotateCcw,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";

interface Creator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
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
    type: "campaign" | "boost";
  }[];
}

interface Campaign {
  id: string;
  title: string;
}

interface CreatorsTabProps {
  workspaceSlug: string;
}

const PLATFORMS = ["tiktok", "instagram", "youtube", "x"] as const;

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
};

const getSourceLabel = (sourceType: string, hasCampaigns: boolean = false): string => {
  switch (sourceType) {
    case "campaign_application":
    case "boost_application":
      return hasCampaigns ? "Member" : "Application";
    case "video_submission":
      return "Submitted";
    case "manual_add":
      return "Added";
    case "import":
      return "Imported";
    default:
      return sourceType;
  }
};

const getSourceColor = (sourceType: string, hasCampaigns: boolean = false): string => {
  switch (sourceType) {
    case "campaign_application":
    case "boost_application":
      return hasCampaigns
        ? "bg-emerald-500/25 text-emerald-500"
        : "bg-blue-500/25 text-blue-500";
    case "video_submission":
      return "bg-purple-500/25 text-purple-500";
    case "manual_add":
      return "bg-amber-500/25 text-amber-500";
    case "import":
      return "bg-rose-500/25 text-rose-500";
    default:
      return "bg-muted/25 text-muted-foreground";
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
  onToggle,
}: SortableColumnItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted/70"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <Checkbox
        id={`col-${id}`}
        checked={isVisible}
        onCheckedChange={onToggle}
        disabled={isRequired}
        className="h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <label
        htmlFor={`col-${id}`}
        className={`text-sm tracking-[-0.5px] cursor-pointer flex-1 ${
          isRequired ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

// Column configuration
const ALL_COLUMNS = [
  { id: "creator", label: "Creator", required: true },
  { id: "source", label: "Source", required: false },
  { id: "socials", label: "Socials", required: false },
  { id: "contact", label: "Contact", required: false },
  { id: "views", label: "Views", required: false },
  { id: "earnings", label: "Earnings", required: false },
  { id: "joined", label: "Joined", required: false },
  { id: "email", label: "Email", required: false },
  { id: "phone", label: "Phone", required: false },
  { id: "country", label: "Country", required: false },
] as const;

type ColumnId = (typeof ALL_COLUMNS)[number]["id"];

// Platform icons as SVG paths
const PlatformIcon = ({ platform, className }: { platform: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    tiktok: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
      </svg>
    ),
    instagram: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    youtube: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    x: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  };

  return icons[platform] || icons.tiktok;
};

export function CreatorsTab({ workspaceSlug }: CreatorsTabProps) {
  // Database state
  const [creators, setCreators] = useState<Creator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>("all");
  const [selectedCreators, setSelectedCreators] = useState<Set<string>>(new Set());
  const [addCreatorsDialogOpen, setAddCreatorsDialogOpen] = useState(false);
  const [addCreatorsMode, setAddCreatorsMode] = useState<"search" | "import" | "manual">(
    "manual"
  );
  const [importData, setImportData] = useState("");
  const [manualCreator, setManualCreator] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
  });
  const [addToCampaignDialogOpen, setAddToCampaignDialogOpen] = useState(false);
  const [selectedCampaignToAdd, setSelectedCampaignToAdd] = useState<string>("");

  // Bulk message state
  const [bulkMessageDialogOpen, setBulkMessageDialogOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");

  // Remove creator state
  const [removeCreatorDialogOpen, setRemoveCreatorDialogOpen] = useState(false);
  const [creatorToRemove, setCreatorToRemove] = useState<Creator | null>(null);

  // Selected creator panel state
  const [selectedCreatorPanel, setSelectedCreatorPanel] = useState<Creator | null>(null);

  // Filter state
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Pending filter state
  const [pendingCampaignFilter, setPendingCampaignFilter] = useState<string>("all");
  const [pendingPlatformFilter, setPendingPlatformFilter] = useState<string>("all");
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string>("all");
  const [pendingSourceFilter, setPendingSourceFilter] = useState<string>("all");

  // Column configuration state
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    new Set(["creator", "source", "socials", "contact", "views", "earnings", "joined"])
  );
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(ALL_COLUMNS.map((c) => c.id));

  // Sorting state
  const [sortBy, setSortBy] = useState<"views" | "earnings" | "joined" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

  // DnD sensors for column reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleColumnDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as ColumnId);
        const newIndex = items.indexOf(over.id as ColumnId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const toggleColumnVisibility = useCallback((columnId: ColumnId) => {
    const column = ALL_COLUMNS.find((c) => c.id === columnId);
    if (column?.required) return;
    setVisibleColumns((prev) => {
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
    return columnOrder.filter((id) => visibleColumns.has(id));
  }, [columnOrder, visibleColumns]);

  const handleSort = (column: "views" | "earnings" | "joined") => {
    if (sortBy === column) {
      if (sortOrder === "desc") {
        setSortOrder("asc");
      } else {
        setSortBy(null);
        setSortOrder("desc");
      }
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Load data from localStorage
  useEffect(() => {
    const storageKey = `creators-${workspaceSlug}`;
    const campaignsKey = `campaigns-${workspaceSlug}`;

    try {
      const savedCreators = localStorage.getItem(storageKey);
      const savedCampaigns = localStorage.getItem(campaignsKey);

      if (savedCreators) {
        setCreators(JSON.parse(savedCreators));
      }
      if (savedCampaigns) {
        setCampaigns(JSON.parse(savedCampaigns));
      }
    } catch (e) {
      console.error("Failed to load creators:", e);
    }
    setLoading(false);
  }, [workspaceSlug]);

  // Save creators to localStorage
  const saveCreators = useCallback(
    (newCreators: Creator[]) => {
      const storageKey = `creators-${workspaceSlug}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(newCreators));
        setCreators(newCreators);
      } catch (e) {
        console.error("Failed to save creators:", e);
      }
    },
    [workspaceSlug]
  );

  // Count active filters
  const activeFilterCount = [
    selectedCampaignFilter !== "all",
    platformFilter !== "all",
    statusFilter !== "all",
    sourceFilter !== "all",
  ].filter(Boolean).length;

  // Check if pending filters differ from applied
  const hasPendingChanges =
    pendingCampaignFilter !== selectedCampaignFilter ||
    pendingPlatformFilter !== platformFilter ||
    pendingStatusFilter !== statusFilter ||
    pendingSourceFilter !== sourceFilter;

  // Sync pending filters when panel opens
  useEffect(() => {
    if (filtersExpanded) {
      setPendingCampaignFilter(selectedCampaignFilter);
      setPendingPlatformFilter(platformFilter);
      setPendingStatusFilter(statusFilter);
      setPendingSourceFilter(sourceFilter);
    }
  }, [filtersExpanded, selectedCampaignFilter, platformFilter, statusFilter, sourceFilter]);

  // Apply pending filters
  const applyFilters = () => {
    setSelectedCampaignFilter(pendingCampaignFilter);
    setPlatformFilter(pendingPlatformFilter);
    setStatusFilter(pendingStatusFilter);
    setSourceFilter(pendingSourceFilter);
    setFiltersExpanded(false);
  };

  // Reset all filters
  const resetAllFilters = () => {
    setSelectedCampaignFilter("all");
    setPlatformFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setPendingCampaignFilter("all");
    setPendingPlatformFilter("all");
    setPendingStatusFilter("all");
    setPendingSourceFilter("all");
  };

  const filteredAndSortedCreators = useMemo(() => {
    let filtered = creators;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.username?.toLowerCase().includes(query) ||
          c.full_name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.social_accounts.some((s) => s.username.toLowerCase().includes(query))
      );
    }

    if (selectedCampaignFilter !== "all") {
      filtered = filtered.filter((c) =>
        c.campaigns.some((camp) => camp.id === selectedCampaignFilter)
      );
    }

    // Platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter((c) =>
        c.social_accounts.some((s) => s.platform === platformFilter)
      );
    }

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter((c) => {
        if (sourceFilter === "campaign")
          return (
            c.source_type === "campaign_application" || c.source_type === "video_submission"
          );
        if (sourceFilter === "boost") return c.source_type === "boost_application";
        if (sourceFilter === "manual") return c.source_type === "manual_add";
        if (sourceFilter === "import") return c.source_type === "import";
        return true;
      });
    }

    // Status filter (active = has campaigns, inactive = no campaigns)
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => {
        if (statusFilter === "active") return c.campaigns.length > 0;
        if (statusFilter === "inactive") return c.campaigns.length === 0;
        return true;
      });
    }

    // Apply sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        if (sortBy === "joined") {
          const aDate = new Date(a.first_interaction_at || a.date_joined || 0).getTime();
          const bDate = new Date(b.first_interaction_at || b.date_joined || 0).getTime();
          return sortOrder === "desc" ? bDate - aDate : aDate - bDate;
        }
        const aVal = sortBy === "views" ? a.total_views : a.total_earnings;
        const bVal = sortBy === "views" ? b.total_views : b.total_earnings;
        return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
      });
    }

    return filtered;
  }, [
    creators,
    searchQuery,
    selectedCampaignFilter,
    platformFilter,
    sourceFilter,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedCreators.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const filteredCreators = filteredAndSortedCreators.slice(startIndex, endIndex);
  const totalCreators = filteredAndSortedCreators.length;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCampaignFilter,
    platformFilter,
    sourceFilter,
    statusFilter,
    sortBy,
    sortOrder,
    itemsPerPage,
  ]);

  const handleExportCSV = () => {
    const exportCreators = filteredAndSortedCreators;
    const headers = [
      "Username",
      "Full Name",
      "Email",
      "Country",
      "Total Views",
      "Total Earnings",
      "Social Accounts",
      "Account URLs",
      "Campaigns",
    ];
    const rows = exportCreators.map((c) => [
      c.username,
      c.full_name || "",
      c.email || "",
      c.country || "",
      c.total_views,
      c.total_earnings.toFixed(2),
      c.social_accounts.map((s) => `${s.platform}:@${s.username}`).join("; "),
      c.social_accounts
        .map((s) => s.account_link || "")
        .filter(Boolean)
        .join("; "),
      c.campaigns.map((camp) => camp.title).join("; "),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creators-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = () => {
    if (selectedCreators.size === filteredCreators.length) {
      setSelectedCreators(new Set());
    } else {
      setSelectedCreators(new Set(filteredCreators.map((c) => c.id)));
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

  const handleAddManualCreator = () => {
    if (!manualCreator.username && !manualCreator.email) return;

    const newCreator: Creator = {
      id: `creator-${Date.now()}`,
      username: manualCreator.username.replace("@", "") || manualCreator.email?.split("@")[0] || "",
      full_name: manualCreator.name || null,
      avatar_url: null,
      email: manualCreator.email || null,
      phone_number: manualCreator.phone || null,
      country: null,
      city: null,
      is_external: true,
      external_name: manualCreator.name || null,
      external_email: manualCreator.email || null,
      external_platform: null,
      external_handle: manualCreator.username.replace("@", "") || null,
      source_type: "manual_add",
      source_campaign_title: null,
      first_interaction_at: new Date().toISOString(),
      social_accounts: [],
      total_views: 0,
      total_earnings: 0,
      date_joined: new Date().toISOString(),
      campaigns: [],
    };

    saveCreators([...creators, newCreator]);
    setManualCreator({ username: "", name: "", email: "", phone: "" });
    setAddCreatorsDialogOpen(false);
  };

  const handleRemoveCreator = () => {
    if (!creatorToRemove) return;
    const newCreators = creators.filter((c) => c.id !== creatorToRemove.id);
    saveCreators(newCreators);
    setRemoveCreatorDialogOpen(false);
    setCreatorToRemove(null);
    setSelectedCreatorPanel(null);
  };

  const initiateRemoveCreator = (creator: Creator) => {
    if (creator.campaigns.length > 0) {
      return;
    }
    setCreatorToRemove(creator);
    setRemoveCreatorDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-transparent border-b border-border px-4 sm:px-6 md:px-8 py-2">
        {/* Filters & Actions - Single Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Toggle Button */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className={`h-8 px-2.5 gap-1.5 tracking-[-0.5px] text-xs rounded-md inline-flex items-center transition-colors border border-border dark:border-transparent ${
              activeFilterCount > 0
                ? "bg-muted/50 text-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-medium">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-3 w-3 ml-0.5 transition-transform duration-200 ${
                filtersExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-[11px] bg-muted/30 border border-border dark:border-transparent rounded-md tracking-[-0.5px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              size="sm"
              onClick={() => setAddCreatorsDialogOpen(true)}
              className="h-8 px-3 gap-1.5 tracking-[-0.5px] text-xs border-t border-primary/70 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Creator
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 px-3 gap-1.5 tracking-[-0.5px] text-xs bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground border border-border dark:border-transparent"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 gap-1.5 tracking-[-0.5px] text-xs bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground border border-border dark:border-transparent"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[220px] p-3 bg-background border border-border shadow-lg z-50"
                align="end"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="tracking-[-0.5px] text-xs font-medium text-foreground">
                      Columns
                    </span>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleColumnDragEnd}
                  >
                    <SortableContext
                      items={columnOrder}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-0.5">
                        {columnOrder.map((colId) => {
                          const col = ALL_COLUMNS.find((c) => c.id === colId);
                          if (!col) return null;
                          return (
                            <SortableColumnItem
                              key={col.id}
                              id={col.id}
                              label={col.label}
                              isVisible={visibleColumns.has(col.id)}
                              isRequired={col.required}
                              onToggle={() => toggleColumnVisibility(col.id)}
                            />
                          );
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
          style={{ gridTemplateRows: filtersExpanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="px-4 py-3">
              <div className="space-y-4">
                {/* Filter Groups */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Selection Group */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-foreground">Selection</span>
                    <div className="space-y-2">
                      {/* Campaign Filter */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">
                          Program
                        </label>
                        <Select
                          value={pendingCampaignFilter}
                          onValueChange={setPendingCampaignFilter}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background border-border/50 tracking-[-0.3px]">
                            <SelectValue placeholder="All programs" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All programs</SelectItem>
                            {campaigns.map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                {campaign.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Platform Filter */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">
                          Platform
                        </label>
                        <Select
                          value={pendingPlatformFilter}
                          onValueChange={setPendingPlatformFilter}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background border-border/50 tracking-[-0.3px]">
                            <SelectValue placeholder="All platforms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All platforms</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="x">Twitter/X</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Source & Status Group */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-foreground">
                      Source & Status
                    </span>
                    <div className="space-y-2">
                      {/* Source Filter */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">
                          Source
                        </label>
                        <Select
                          value={pendingSourceFilter}
                          onValueChange={setPendingSourceFilter}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background border-border/50 tracking-[-0.3px]">
                            <SelectValue placeholder="All sources" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All sources</SelectItem>
                            <SelectItem value="campaign">Campaign</SelectItem>
                            <SelectItem value="boost">Boost</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="import">Import</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Status Filter */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">
                          Status
                        </label>
                        <Select
                          value={pendingStatusFilter}
                          onValueChange={setPendingStatusFilter}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background border-border/50 tracking-[-0.3px]">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between pt-3">
                  <button
                    onClick={resetAllFilters}
                    disabled={activeFilterCount === 0 && !hasPendingChanges}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground tracking-[-0.3px] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset filters
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFiltersExpanded(false)}
                      className="h-7 px-3 text-xs font-medium text-muted-foreground hover:text-foreground tracking-[-0.3px] transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      size="sm"
                      onClick={applyFilters}
                      disabled={!hasPendingChanges}
                      className="h-7 px-3 text-xs tracking-[-0.3px] border-t border-primary/70 bg-primary hover:bg-primary/90 disabled:opacity-40"
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
        <div className="flex-1 overflow-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
          <div className="min-w-full">
            <TooltipProvider delayDuration={100}>
              <Table className="min-w-[800px]">
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="w-[32px] h-11">
                      <Checkbox
                        checked={
                          selectedCreators.size === filteredCreators.length &&
                          filteredCreators.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                        className="h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableHead>
                    {orderedVisibleColumns.map((colId) => {
                      if (colId === "views") {
                        return (
                          <TableHead
                            key={colId}
                            className="tracking-[-0.5px] text-xs text-muted-foreground font-medium text-right h-11 cursor-pointer select-none group/sort"
                            onClick={() => handleSort("views")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Views
                              <span
                                className={`transition-opacity ${
                                  sortBy === "views"
                                    ? "opacity-100"
                                    : "opacity-0 group-hover/sort:opacity-50"
                                }`}
                              >
                                {sortBy === "views" && sortOrder === "asc" ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </span>
                            </div>
                          </TableHead>
                        );
                      }
                      if (colId === "earnings") {
                        return (
                          <TableHead
                            key={colId}
                            className="tracking-[-0.5px] text-xs text-muted-foreground font-medium text-right h-11 cursor-pointer select-none group/sort"
                            onClick={() => handleSort("earnings")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Earnings
                              <span
                                className={`transition-opacity ${
                                  sortBy === "earnings"
                                    ? "opacity-100"
                                    : "opacity-0 group-hover/sort:opacity-50"
                                }`}
                              >
                                {sortBy === "earnings" && sortOrder === "asc" ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </span>
                            </div>
                          </TableHead>
                        );
                      }
                      if (colId === "joined") {
                        return (
                          <TableHead
                            key={colId}
                            className="tracking-[-0.5px] text-xs text-muted-foreground font-medium h-11 cursor-pointer select-none group/sort"
                            onClick={() => handleSort("joined")}
                          >
                            <div className="flex items-center gap-1">
                              Joined
                              <span
                                className={`transition-opacity ${
                                  sortBy === "joined"
                                    ? "opacity-100"
                                    : "opacity-0 group-hover/sort:opacity-50"
                                }`}
                              >
                                {sortBy === "joined" && sortOrder === "asc" ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </span>
                            </div>
                          </TableHead>
                        );
                      }
                      const col = ALL_COLUMNS.find((c) => c.id === colId);
                      return (
                        <TableHead
                          key={colId}
                          className="tracking-[-0.5px] text-xs text-muted-foreground font-medium h-11"
                        >
                          {col?.label}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreators.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={orderedVisibleColumns.length + 1}
                        className="h-[400px]"
                      >
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                            <Users className="text-muted-foreground/50 h-6 w-6" />
                          </div>
                          <h3 className="text-sm font-medium tracking-[-0.5px] text-foreground mb-1">
                            {searchQuery || selectedCampaignFilter !== "all"
                              ? "No results"
                              : "No creators yet"}
                          </h3>
                          <p className="text-xs text-muted-foreground tracking-[-0.3px] text-center max-w-[240px] mb-4">
                            {searchQuery || selectedCampaignFilter !== "all"
                              ? "No creators match your filters"
                              : "Add creators manually or invite them to apply to your campaigns"}
                          </p>
                          {!searchQuery && selectedCampaignFilter === "all" && (
                            <button
                              onClick={() => setAddCreatorsDialogOpen(true)}
                              className="h-8 px-4 text-xs tracking-[-0.5px] rounded-lg bg-foreground text-background hover:bg-foreground/90 dark:bg-muted/50 dark:text-foreground dark:hover:bg-muted transition-colors"
                            >
                              Add Creator
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCreators.map((creator) => (
                      <TableRow
                        key={creator.id}
                        className={`bg-white hover:bg-muted/30 dark:bg-transparent dark:hover:bg-muted/20 border-b border-border/30 group cursor-pointer ${
                          selectedCreatorPanel?.id === creator.id
                            ? "bg-muted/30 dark:bg-muted/30"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedCreatorPanel(
                            selectedCreatorPanel?.id === creator.id ? null : creator
                          )
                        }
                      >
                        <TableCell
                          className="py-3 w-[32px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedCreators.has(creator.id)}
                            onCheckedChange={() => toggleCreatorSelection(creator.id)}
                            className={`h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-opacity ${
                              selectedCreators.has(creator.id)
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                          />
                        </TableCell>
                        {orderedVisibleColumns.map((colId) => {
                          switch (colId) {
                            case "creator":
                              return (
                                <TableCell key={colId} className="py-3">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage
                                        src={creator.avatar_url || undefined}
                                      />
                                      <AvatarFallback className="bg-slate-200 dark:bg-muted/60 text-slate-600 dark:text-foreground text-[11px] font-medium">
                                        {(
                                          creator.full_name ||
                                          creator.username ||
                                          creator.external_name
                                        )
                                          ?.charAt(0)
                                          .toUpperCase() || "C"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className="font-medium text-[13px] tracking-[-0.5px] truncate group-hover:underline">
                                          {creator.full_name ||
                                            creator.username ||
                                            creator.external_name}
                                        </p>
                                        {creator.is_external && (
                                          <span className="text-[9px] tracking-[-0.5px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                            External
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground tracking-[-0.5px]">
                                        {creator.is_external
                                          ? creator.external_handle
                                            ? `@${creator.external_handle}`
                                            : creator.external_email || "No handle"
                                          : `@${creator.username}`}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                              );
                            case "source":
                              return (
                                <TableCell key={colId} className="py-3">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        className={`text-[11px] tracking-[-0.02em] px-2 py-0.5 rounded ${getSourceColor(
                                          creator.source_type,
                                          creator.campaigns.length > 0
                                        )}`}
                                      >
                                        {getSourceLabel(
                                          creator.source_type,
                                          creator.campaigns.length > 0
                                        )}
                                      </span>
                                    </TooltipTrigger>
                                    {creator.source_campaign_title && (
                                      <TooltipContent
                                        side="top"
                                        className="tracking-[-0.5px] text-xs"
                                      >
                                        <p>From: {creator.source_campaign_title}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TableCell>
                              );
                            case "socials":
                              return (
                                <TableCell key={colId} className="py-3">
                                  <div className="flex items-center gap-1">
                                    {creator.social_accounts.slice(0, 4).map((account, idx) => (
                                      <Tooltip key={idx}>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={
                                              account.account_link ||
                                              `https://${account.platform}.com/@${account.username}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted/70 border border-border/30 transition-colors"
                                          >
                                            <PlatformIcon
                                              platform={account.platform}
                                              className="h-4 w-4"
                                            />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="tracking-[-0.5px] text-xs"
                                        >
                                          <p className="font-medium">
                                            @{account.username}
                                          </p>
                                          {account.follower_count != null &&
                                            Number(account.follower_count) > 0 && (
                                              <p className="text-muted-foreground">
                                                {formatNumber(account.follower_count)}{" "}
                                                followers
                                              </p>
                                            )}
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                    {creator.social_accounts.length > 4 && (
                                      <span className="text-[10px] text-muted-foreground tracking-[-0.5px] ml-0.5">
                                        +{creator.social_accounts.length - 4}
                                      </span>
                                    )}
                                    {creator.social_accounts.length === 0 && (
                                      <span className="text-[11px] text-muted-foreground">
                                        -
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            case "contact":
                              return (
                                <TableCell key={colId} className="py-3">
                                  <div className="flex items-center gap-1.5">
                                    {(creator.email || creator.external_email) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={`mailto:${
                                              creator.email || creator.external_email
                                            }`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted/70 border border-border/30 transition-colors text-muted-foreground hover:text-foreground"
                                          >
                                            <Mail className="h-4 w-4" />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="tracking-[-0.5px] text-xs"
                                        >
                                          <p>
                                            {creator.email || creator.external_email}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {creator.phone_number && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={`tel:${creator.phone_number}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted/70 border border-border/30 transition-colors text-muted-foreground hover:text-foreground"
                                          >
                                            <Phone className="h-4 w-4" />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="tracking-[-0.5px] text-xs"
                                        >
                                          <p>{creator.phone_number}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {!creator.email &&
                                      !creator.external_email &&
                                      !creator.phone_number && (
                                        <span className="text-[11px] text-muted-foreground">
                                          -
                                        </span>
                                      )}
                                  </div>
                                </TableCell>
                              );
                            case "views":
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-right text-[13px] font-medium tracking-[-0.5px] py-3"
                                >
                                  {formatNumber(creator.total_views)}
                                </TableCell>
                              );
                            case "earnings":
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-right text-[13px] font-medium tracking-[-0.5px] py-3 text-emerald-500"
                                >
                                  ${creator.total_earnings.toFixed(2)}
                                </TableCell>
                              );
                            case "joined":
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-[12px] text-muted-foreground tracking-[-0.5px] py-3"
                                >
                                  {creator.date_joined
                                    ? format(new Date(creator.date_joined), "MMM d, yyyy")
                                    : "-"}
                                </TableCell>
                              );
                            case "email":
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-[12px] text-muted-foreground tracking-[-0.5px] py-3"
                                >
                                  {creator.email || creator.external_email || "-"}
                                </TableCell>
                              );
                            case "phone":
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-[12px] text-muted-foreground tracking-[-0.5px] py-3"
                                >
                                  {creator.phone_number || "-"}
                                </TableCell>
                              );
                            case "country":
                              return (
                                <TableCell
                                  key={colId}
                                  className="text-[12px] text-muted-foreground tracking-[-0.5px] py-3"
                                >
                                  {creator.country || "-"}
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

        {totalCreators > 0 && (
          <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground tracking-[-0.5px]">
              <span>Show</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(v) => setItemsPerPage(Number(v))}
              >
                <SelectTrigger className="h-7 w-[70px] text-xs border-0 bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option}
                      value={option.toString()}
                      className="text-xs"
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>of {totalCreators.toLocaleString()} creators</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground tracking-[-0.5px] mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-muted"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                aria-label="Go to first page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-muted"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Go to previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-muted"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Go to next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-muted"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="Go to last page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Creator Details Panel - Floating Overlay */}
      {selectedCreatorPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 animate-fade-in"
            onClick={() => setSelectedCreatorPanel(null)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-[420px] border-l border-border/50 bg-background flex flex-col z-50 shadow-2xl animate-slide-in-right">
            <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={selectedCreatorPanel.avatar_url || undefined} />
                  <AvatarFallback className="bg-slate-200 dark:bg-muted/60 text-slate-600 dark:text-foreground text-xs font-medium">
                    {(
                      selectedCreatorPanel.full_name ||
                      selectedCreatorPanel.username ||
                      selectedCreatorPanel.external_name
                    )
                      ?.charAt(0)
                      .toUpperCase() || "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 -space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm tracking-[-0.5px] truncate leading-tight">
                      {selectedCreatorPanel.full_name ||
                        selectedCreatorPanel.username ||
                        selectedCreatorPanel.external_name}
                    </p>
                    {selectedCreatorPanel.is_external && (
                      <span className="text-[9px] tracking-[-0.5px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded flex-shrink-0">
                        External
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground tracking-[-0.5px] truncate leading-tight">
                    {selectedCreatorPanel.is_external
                      ? selectedCreatorPanel.external_handle
                        ? `@${selectedCreatorPanel.external_handle}`
                        : selectedCreatorPanel.external_email || "No handle"
                      : `@${selectedCreatorPanel.username}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  className="h-7 w-7 rounded-sm hover:bg-muted/50 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                  onClick={() => {
                    const currentIndex = filteredCreators.findIndex(
                      (c) => c.id === selectedCreatorPanel?.id
                    );
                    if (currentIndex > 0) {
                      setSelectedCreatorPanel(filteredCreators[currentIndex - 1]);
                    }
                  }}
                  disabled={
                    filteredCreators.findIndex((c) => c.id === selectedCreatorPanel?.id) <=
                    0
                  }
                  aria-label="Previous creator"
                >
                  <ChevronUp className="h-4 w-4 text-foreground" />
                </button>
                <button
                  className="h-7 w-7 rounded-sm hover:bg-muted/50 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                  onClick={() => {
                    const currentIndex = filteredCreators.findIndex(
                      (c) => c.id === selectedCreatorPanel?.id
                    );
                    if (currentIndex < filteredCreators.length - 1) {
                      setSelectedCreatorPanel(filteredCreators[currentIndex + 1]);
                    }
                  }}
                  disabled={
                    filteredCreators.findIndex((c) => c.id === selectedCreatorPanel?.id) >=
                    filteredCreators.length - 1
                  }
                  aria-label="Next creator"
                >
                  <ChevronDown className="h-4 w-4 text-foreground" />
                </button>
                <button
                  className="h-7 w-7 rounded-sm hover:bg-muted/50 flex items-center justify-center"
                  onClick={() => setSelectedCreatorPanel(null)}
                  aria-label="Close panel"
                >
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
                    <p className="text-[10px] text-muted-foreground tracking-[-0.03em] mb-1.5">
                      Source
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] tracking-[-0.02em] px-2 py-0.5 rounded ${getSourceColor(
                          selectedCreatorPanel.source_type,
                          selectedCreatorPanel.campaigns.length > 0
                        )}`}
                      >
                        {getSourceLabel(
                          selectedCreatorPanel.source_type,
                          selectedCreatorPanel.campaigns.length > 0
                        )}
                      </span>
                      {selectedCreatorPanel.source_campaign_title && (
                        <span className="text-xs text-muted-foreground tracking-[-0.5px]">
                          {selectedCreatorPanel.source_campaign_title}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact Info - 2 column grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedCreatorPanel.email && (
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[-0.03em] mb-1">
                          Email
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedCreatorPanel.email || ""
                            );
                          }}
                          className="group flex items-center gap-1.5 text-xs tracking-[-0.5px] hover:text-foreground/80 transition-colors cursor-pointer"
                        >
                          <span className="truncate">{selectedCreatorPanel.email}</span>
                          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground flex-shrink-0" />
                        </button>
                      </div>
                    )}
                    {selectedCreatorPanel.phone_number && (
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[-0.03em] mb-1">
                          Phone
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedCreatorPanel.phone_number || ""
                            );
                          }}
                          className="group flex items-center gap-1.5 text-xs tracking-[-0.5px] hover:text-foreground/80 transition-colors cursor-pointer"
                        >
                          <span>{selectedCreatorPanel.phone_number}</span>
                          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground flex-shrink-0" />
                        </button>
                      </div>
                    )}
                    {(selectedCreatorPanel.city || selectedCreatorPanel.country) && (
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[-0.03em] mb-1">
                          Location
                        </p>
                        <p className="text-xs tracking-[-0.5px]">
                          {[selectedCreatorPanel.city, selectedCreatorPanel.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    )}
                    {selectedCreatorPanel.first_interaction_at && (
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[-0.03em] mb-1">
                          First Interaction
                        </p>
                        <p className="text-xs tracking-[-0.5px]">
                          {format(
                            new Date(selectedCreatorPanel.first_interaction_at),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                    )}
                    {selectedCreatorPanel.date_joined && (
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-[-0.03em] mb-1">
                          Joined Platform
                        </p>
                        <p className="text-xs tracking-[-0.5px]">
                          {format(
                            new Date(selectedCreatorPanel.date_joined),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Social Accounts */}
                {selectedCreatorPanel.social_accounts.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground tracking-[-0.03em] mb-2">
                      Social Accounts
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCreatorPanel.social_accounts.map((account, idx) => (
                        <a
                          key={idx}
                          href={
                            account.account_link ||
                            `https://${account.platform}.com/@${account.username}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg transition-colors bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/30 border border-border/50 dark:border-transparent"
                        >
                          <PlatformIcon platform={account.platform} className="h-5 w-5" />
                          <span className="text-xs font-medium tracking-[-0.5px] truncate">
                            {account.username}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campaigns */}
                {selectedCreatorPanel.campaigns.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground tracking-[-0.5px] uppercase mb-2">
                      Active Campaigns
                    </p>
                    <div className="space-y-1">
                      {selectedCreatorPanel.campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                        >
                          <span className="text-xs tracking-[-0.5px]">
                            {campaign.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="p-4 border-t border-border/50 flex flex-col gap-3">
              {/* Primary Actions */}
              {!selectedCreatorPanel.is_external && selectedCreatorPanel.id && (
                <div className="flex flex-col gap-2">
                  {/* Message - Full width primary */}
                  <button className="w-full py-2.5 text-xs font-medium tracking-[-0.3px] bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    Message
                  </button>
                  {/* Pay & Review side by side */}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2.5 text-xs font-medium tracking-[-0.3px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5">
                      Pay
                    </button>
                    <button className="py-2.5 text-xs font-medium tracking-[-0.3px] bg-muted/50 text-foreground rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5 border border-border/50 dark:border-transparent">
                      <Star className="h-3.5 w-3.5" />
                      Review
                    </button>
                  </div>
                </div>
              )}
              {/* Remove Button */}
              <button
                className="w-full py-2 text-xs font-medium tracking-[-0.3px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  initiateRemoveCreator(selectedCreatorPanel);
                }}
                disabled={selectedCreatorPanel.campaigns.length > 0}
              >
                <Users className="h-4 w-4" />
                Remove from database
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bulk Actions Bar */}
      {selectedCreators.size > 0 && (
        <div className="border-t border-border/50 px-4 py-3 bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm tracking-[-0.3px] text-foreground/80">
              <span className="font-medium text-foreground">{selectedCreators.size}</span>{" "}
              creator{selectedCreators.size > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCreators(new Set())}
              className="px-3 py-1.5 text-xs tracking-[-0.3px] text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
            >
              Clear
            </button>
            <button
              onClick={() => setBulkMessageDialogOpen(true)}
              className="px-3.5 py-1.5 text-xs tracking-[-0.3px] text-black bg-white rounded-md hover:bg-gray-50 transition-all flex items-center shadow-sm"
            >
              Message
            </button>
            <button
              onClick={() => setAddToCampaignDialogOpen(true)}
              className="px-3.5 py-1.5 text-xs tracking-[-0.3px] text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-3 w-3" />
              Add to Campaign
            </button>
          </div>
        </div>
      )}

      {/* Add to Campaign Dialog */}
      <Dialog open={addToCampaignDialogOpen} onOpenChange={setAddToCampaignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tight">Add to Campaign</DialogTitle>
            <DialogDescription className="tracking-[-0.3px]">
              Add {selectedCreators.size} selected creator
              {selectedCreators.size > 1 ? "s" : ""} to a campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="tracking-[-0.3px] text-sm">Select Campaign</Label>
              <Select
                value={selectedCampaignToAdd}
                onValueChange={setSelectedCampaignToAdd}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {campaigns.length === 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground tracking-[-0.3px]">
                  No campaigns available. Create a campaign first to add creators.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAddToCampaignDialogOpen(false)}
              className="tracking-[-0.3px]"
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedCampaignToAdd}
              className="tracking-[-0.3px]"
            >
              Add to Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Message Dialog */}
      <Dialog open={bulkMessageDialogOpen} onOpenChange={setBulkMessageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tight">Send Message</DialogTitle>
            <DialogDescription className="tracking-[-0.3px]">
              Send a message to {selectedCreators.size} selected creator
              {selectedCreators.size > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="tracking-[-0.3px] text-sm">Message</Label>
              <Textarea
                placeholder="Type your message here..."
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                className="min-h-[120px] tracking-[-0.3px] text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBulkMessageDialogOpen(false)}
              className="tracking-[-0.3px]"
            >
              Cancel
            </Button>
            <Button disabled={!bulkMessage.trim()} className="tracking-[-0.3px]">
              Send to {selectedCreators.size} Creator{selectedCreators.size > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Creators Dialog */}
      <Dialog open={addCreatorsDialogOpen} onOpenChange={setAddCreatorsDialogOpen}>
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden bg-background border border-border">
          <Tabs
            value={addCreatorsMode}
            onValueChange={(v) => setAddCreatorsMode(v as "search" | "import" | "manual")}
            className="flex-1 flex flex-col"
          >
            {/* Tab Pills */}
            <div className="px-6 border-b border-border">
              <div className="flex gap-6">
                <button
                  onClick={() => setAddCreatorsMode("manual")}
                  className={`px-1 py-3 text-sm tracking-[-0.5px] transition-all border-b-2 ${
                    addCreatorsMode === "manual"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setAddCreatorsMode("import")}
                  className={`px-1 py-3 text-sm tracking-[-0.5px] transition-all border-b-2 ${
                    addCreatorsMode === "import"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Import
                </button>
              </div>
            </div>

            {/* Manual Add Tab */}
            <TabsContent value="manual" className="mt-0 px-6 py-4">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs tracking-[-0.5px] text-muted-foreground">
                      Username
                    </Label>
                    <Input
                      placeholder="@username"
                      value={manualCreator.username}
                      onChange={(e) =>
                        setManualCreator((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      className="h-11 bg-muted/30 border-0 tracking-[-0.5px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs tracking-[-0.5px] text-muted-foreground">
                      Full Name
                    </Label>
                    <Input
                      placeholder="John Doe"
                      value={manualCreator.name}
                      onChange={(e) =>
                        setManualCreator((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="h-11 bg-muted/30 border-0 tracking-[-0.5px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs tracking-[-0.5px] text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={manualCreator.email}
                      onChange={(e) =>
                        setManualCreator((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="h-11 bg-muted/30 border-0 tracking-[-0.5px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs tracking-[-0.5px] text-muted-foreground">
                      Phone
                    </Label>
                    <Input
                      placeholder="+1 234 567 8900"
                      value={manualCreator.phone}
                      onChange={(e) =>
                        setManualCreator((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="h-11 bg-muted/30 border-0 tracking-[-0.5px]"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                  Manually added creators are marked as external until they join.
                </p>
                <button
                  className="w-fit py-2 px-4 bg-primary border-t border-primary/70 rounded-lg text-[14px] font-medium tracking-[-0.5px] text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!manualCreator.username && !manualCreator.email}
                  onClick={handleAddManualCreator}
                >
                  Add Creator
                </button>
              </div>
            </TabsContent>

            {/* Import CSV Tab */}
            <TabsContent value="import" className="mt-0 px-6 py-4">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Paste CSV Data</Label>
                  <Textarea
                    placeholder="tiktok,@username&#10;instagram,@creator&#10;youtube,@channel"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    className="min-h-[180px] font-mono text-sm bg-muted/30 border-0 resize-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Format:{" "}
                  <code className="bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">
                    platform,username
                  </code>{" "}
                  per line
                </p>
                <Button disabled={!importData.trim()} className="w-full h-11">
                  Import Creators
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer spacing */}
          <div className="h-4" />
        </DialogContent>
      </Dialog>

      {/* Remove from Database Confirmation */}
      <AlertDialog
        open={removeCreatorDialogOpen}
        onOpenChange={setRemoveCreatorDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="tracking-tight">
              Remove from Database
            </AlertDialogTitle>
            <AlertDialogDescription className="tracking-[-0.3px]">
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {creatorToRemove?.full_name || creatorToRemove?.username}
              </span>{" "}
              from your database? This will delete all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="tracking-[-0.3px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCreator}
              className="bg-destructive hover:bg-destructive/90 tracking-[-0.3px]"
            >
              Remove from Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
