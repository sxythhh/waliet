import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { Search, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, BadgeCheck, ArrowUpDown, ArrowUp, ArrowDown, Phone, X, Filter, RefreshCw, Download, DollarSign, Ban, UserCheck, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/admin/bulk-operations/BulkActionBar";
import { BulkConfirmationDialog } from "@/components/admin/bulk-operations/BulkConfirmationDialog";
import { BulkProgressDialog } from "@/components/admin/bulk-operations/BulkProgressDialog";
import { PageLoading, LoadingBar } from "@/components/ui/loading-bar";
import { formatDistanceToNow, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserContextSheet } from "@/components/admin/UserContextSheet";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import discordIcon from "@/assets/discord-white-icon.webp";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { AudienceInsightsReviewDialog } from "@/components/admin/AudienceInsightsReviewDialog";
import {
  AdminSearchInput,
  AdminButton,
  AdminTabs,
  AdminTabContent,
  AdminToolbar,
  AdminEmptyState,
  AdminBadge,
  AdminStatusBadge,
  AdminFilterTabs,
  TYPOGRAPHY,
  PADDING,
  BORDERS,
  BACKGROUNDS,
  TRANSITIONS,
  TABLE,
} from "@/components/admin/design-system";

// Types
interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  total_earnings: number;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_avatar?: string | null;
  phone_number?: string | null;
  created_at?: string | null;
  email?: string | null;
  trust_score?: number | null;
  wallets: {
    balance: number;
    total_earned: number;
    total_withdrawn: number;
  };
  social_accounts?: Array<{
    id: string;
    platform: string;
    username: string;
    follower_count: number;
    demographic_submissions?: Array<{
      status: string;
    }>;
  }>;
}

interface Campaign {
  id: string;
  title: string;
}

interface DemographicSubmission {
  id: string;
  tier1_percentage: number;
  screenshot_url: string | null;
  submitted_at: string;
  status: string;
  score: number | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  social_accounts: {
    id: string;
    platform: string;
    username: string;
    user_id: string;
    avatar_url?: string | null;
    follower_count?: number | null;
    bio?: string | null;
    account_link?: string | null;
  };
}

interface FilterState {
  search: string;
  campaign: string;
  signupTimeframe: string;
  hasDiscord: boolean | null;
  hasPhone: boolean | null;
  hasSocialAccount: boolean | null;
  hasApprovedDemographics: boolean | null;
  hasBrandRole: boolean | null;
  minEarnings: string;
  minBalance: string;
  platform: string;
  sortField: "balance" | "totalEarned" | "created_at" | "trust_score" | null;
  sortOrder: "asc" | "desc";
}

const USERS_PER_PAGE = 50;
const BATCH_SIZE = 1000;

// Platform icon helper
const getPlatformIcon = (platform: string) => {
  switch (platform?.toLowerCase()) {
    case "tiktok":
      return <img src={tiktokLogo} alt="TikTok" className="w-3.5 h-3.5" />;
    case "instagram":
      return <img src={instagramLogo} alt="Instagram" className="w-3.5 h-3.5" />;
    case "youtube":
      return <img src={youtubeLogo} alt="YouTube" className="w-3.5 h-3.5" />;
    default:
      return null;
  }
};

export default function AdminUsers() {
  // Core state
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    campaign: "all",
    signupTimeframe: "all",
    hasDiscord: null,
    hasPhone: null,
    hasSocialAccount: null,
    hasApprovedDemographics: null,
    hasBrandRole: null,
    minEarnings: "",
    minBalance: "",
    platform: "all",
    sortField: "created_at",
    sortOrder: "desc",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // UI state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userContextSheetOpen, setUserContextSheetOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [campaignPopoverOpen, setCampaignPopoverOpen] = useState(false);

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<{ title: string; description: string; action: () => void; variant?: "default" | "destructive" } | null>(null);
  const [bulkProgressOpen, setBulkProgressOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ total: 0, completed: 0, failed: 0, errors: [] as string[] });

  // Demographics state
  const [submissions, setSubmissions] = useState<DemographicSubmission[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState<DemographicSubmission | null>(null);
  const [processingSubmission, setProcessingSubmission] = useState<string | null>(null);

  const { toast: toastHook } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Initial data fetch
  useEffect(() => {
    fetchCampaigns();
    fetchSubmissions();
  }, []);

  // Fetch users when filters or page changes
  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, filters.campaign, filters.signupTimeframe, filters.hasDiscord, filters.hasPhone,
      filters.hasSocialAccount, filters.hasApprovedDemographics, filters.hasBrandRole,
      filters.minEarnings, filters.minBalance, filters.platform, filters.sortField, filters.sortOrder, currentPage]);

  const fetchCampaigns = async () => {
    const { data } = await supabase.from("campaigns").select("id, title").order("title");
    if (data) setCampaigns(data);
  };

  const fetchUsers = async () => {
    setLoading(true);

    try {
      // Check if we need to search across ALL users (for post-query filters)
      // Include search in needsFullScan because we need to search social account usernames client-side
      const needsFullScan = debouncedSearch ||
                           filters.hasSocialAccount !== null ||
                           filters.hasApprovedDemographics !== null ||
                           filters.hasBrandRole !== null ||
                           filters.campaign !== "all" ||
                           (filters.minBalance && parseFloat(filters.minBalance) > 0) ||
                           (filters.minEarnings && parseFloat(filters.minEarnings) > 0);

      if (needsFullScan) {
        await fetchAllUsersWithFilters();
      } else {
        await fetchPaginatedUsers();
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toastHook({ variant: "destructive", title: "Error", description: "Failed to fetch users" });
    } finally {
      setLoading(false);
    }
  };

  // Paginated fetch for simple filters (fast)
  const fetchPaginatedUsers = async () => {
    let query = supabase.from("profiles").select(`
      *,
      wallets (balance, total_earned, total_withdrawn),
      social_accounts (id, platform, username, follower_count, demographic_submissions (status))
    `, { count: "exact" });

    // Apply database-level filters
    query = applyDatabaseFilters(query);

    // Apply sorting
    if (filters.sortField === "created_at") {
      query = query.order("created_at", { ascending: filters.sortOrder === "asc" });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    const from = (currentPage - 1) * USERS_PER_PAGE;
    const to = from + USERS_PER_PAGE - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) throw error;

    let filtered = data as User[] || [];

    // Client-side sorting for wallet fields
    if (filters.sortField === "balance" || filters.sortField === "totalEarned" || filters.sortField === "trust_score") {
      filtered = sortUsers(filtered);
    }

    setUsers(filtered);
    setTotalCount(count || 0);
  };

  // Full scan for complex filters (bypasses 1000 limit)
  const fetchAllUsersWithFilters = async () => {
    let allUsers: User[] = [];
    let offset = 0;
    let totalCount: number | null = null;

    // Fetch in batches to bypass 1000 limit
    while (true) {
      let query = supabase.from("profiles").select(`
        *,
        wallets (balance, total_earned, total_withdrawn),
        social_accounts (id, platform, username, follower_count, demographic_submissions (status))
      `, { count: "exact" });

      query = applyDatabaseFilters(query, true); // Skip search - will be applied client-side to include social accounts
      query = query.order("created_at", { ascending: false });
      query = query.range(offset, offset + BATCH_SIZE - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      if (totalCount === null && count !== null) {
        totalCount = count;
      }

      if (data && data.length > 0) {
        allUsers = allUsers.concat(data as User[]);
      }

      if (!data || data.length < BATCH_SIZE) {
        break;
      }

      offset += BATCH_SIZE;
    }

    // Apply client-side filters
    let filtered = allUsers;

    // Search filter - check profile fields AND social account usernames
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      filtered = filtered.filter(u =>
        u.username?.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.social_accounts?.some(acc => acc.username?.toLowerCase().includes(term))
      );
    }

    // Social account filter
    if (filters.hasSocialAccount === true) {
      filtered = filtered.filter(u => u.social_accounts && u.social_accounts.length > 0);
    } else if (filters.hasSocialAccount === false) {
      filtered = filtered.filter(u => !u.social_accounts || u.social_accounts.length === 0);
    }

    // Platform filter
    if (filters.platform !== "all") {
      filtered = filtered.filter(u =>
        u.social_accounts?.some(acc => acc.platform.toLowerCase() === filters.platform.toLowerCase())
      );
    }

    // Approved demographics filter
    if (filters.hasApprovedDemographics === true) {
      filtered = filtered.filter(u =>
        u.social_accounts?.some(acc => acc.demographic_submissions?.some(sub => sub.status === "approved"))
      );
    } else if (filters.hasApprovedDemographics === false) {
      filtered = filtered.filter(u =>
        !u.social_accounts?.some(acc => acc.demographic_submissions?.some(sub => sub.status === "approved"))
      );
    }

    // Brand role filter
    if (filters.hasBrandRole !== null) {
      const { data: brandRoleUsers } = await supabase.from("user_roles").select("user_id").eq("role", "brand");
      const { data: brandMemberUsers } = await supabase.from("brand_members").select("user_id");

      const brandUserIds = new Set([
        ...(brandRoleUsers?.map(r => r.user_id) || []),
        ...(brandMemberUsers?.map(m => m.user_id) || [])
      ]);

      if (filters.hasBrandRole === true) {
        filtered = filtered.filter(u => brandUserIds.has(u.id));
      } else {
        filtered = filtered.filter(u => !brandUserIds.has(u.id));
      }
    }

    // Campaign filter
    if (filters.campaign !== "all") {
      const { data: subs } = await supabase.from("campaign_submissions").select("creator_id").eq("campaign_id", filters.campaign);
      if (subs) {
        const creatorIds = new Set(subs.map(s => s.creator_id));
        filtered = filtered.filter(u => creatorIds.has(u.id));
      }
    }

    // Min earnings filter
    if (filters.minEarnings && parseFloat(filters.minEarnings) > 0) {
      const min = parseFloat(filters.minEarnings);
      filtered = filtered.filter(u => (u.wallets?.total_earned || 0) >= min);
    }

    // Min balance filter
    if (filters.minBalance && parseFloat(filters.minBalance) > 0) {
      const min = parseFloat(filters.minBalance);
      filtered = filtered.filter(u => (u.wallets?.balance || 0) >= min);
    }

    // Sort
    filtered = sortUsers(filtered);

    // Paginate results
    const from = (currentPage - 1) * USERS_PER_PAGE;
    const paginated = filtered.slice(from, from + USERS_PER_PAGE);

    setUsers(paginated);
    setTotalCount(filtered.length);
  };

  const applyDatabaseFilters = (query: any, skipSearch = false) => {
    // Search filter - skip when doing full scan (search will be applied client-side to include social accounts)
    if (debouncedSearch && !skipSearch) {
      const term = debouncedSearch.toLowerCase();
      query = query.or(`username.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`);
    }

    // Discord filter
    if (filters.hasDiscord === true) {
      query = query.not("discord_id", "is", null);
    } else if (filters.hasDiscord === false) {
      query = query.is("discord_id", null);
    }

    // Phone filter
    if (filters.hasPhone === true) {
      query = query.not("phone_number", "is", null);
    } else if (filters.hasPhone === false) {
      query = query.is("phone_number", null);
    }

    // Signup timeframe filter
    if (filters.signupTimeframe !== "all") {
      const now = new Date();
      let cutoff: Date;
      switch (filters.signupTimeframe) {
        case "24h": cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case "7d": cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case "30d": cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case "90d": cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        default: cutoff = new Date(0);
      }
      query = query.gte("created_at", cutoff.toISOString());
    }

    return query;
  };

  const sortUsers = (users: User[]) => {
    if (!filters.sortField) return users;

    return [...users].sort((a, b) => {
      let aVal = 0, bVal = 0;

      switch (filters.sortField) {
        case "balance":
          aVal = a.wallets?.balance || 0;
          bVal = b.wallets?.balance || 0;
          break;
        case "totalEarned":
          aVal = a.wallets?.total_earned || 0;
          bVal = b.wallets?.total_earned || 0;
          break;
        case "trust_score":
          aVal = a.trust_score || 0;
          bVal = b.trust_score || 0;
          break;
        case "created_at":
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
      }

      return filters.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  };

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key !== "search") setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      campaign: "all",
      signupTimeframe: "all",
      hasDiscord: null,
      hasPhone: null,
      hasSocialAccount: null,
      hasApprovedDemographics: null,
      hasBrandRole: null,
      minEarnings: "",
      minBalance: "",
      platform: "all",
      sortField: "created_at",
      sortOrder: "desc",
    });
    setCurrentPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.campaign !== "all") count++;
    if (filters.signupTimeframe !== "all") count++;
    if (filters.hasDiscord !== null) count++;
    if (filters.hasPhone !== null) count++;
    if (filters.hasSocialAccount !== null) count++;
    if (filters.hasApprovedDemographics !== null) count++;
    if (filters.hasBrandRole !== null) count++;
    if (filters.minEarnings) count++;
    if (filters.minBalance) count++;
    if (filters.platform !== "all") count++;
    return count;
  }, [filters]);

  // Demographics
  const fetchSubmissions = async () => {
    const { data, error } = await supabase.from("demographic_submissions").select(`
      *,
      social_accounts (
        id, platform, username, user_id, avatar_url, follower_count, bio, account_link,
        profiles:user_id (id, username, full_name, avatar_url, email, trust_score, demographics_score, total_earnings, country, created_at)
      )
    `).order("submitted_at", { ascending: false });

    if (!error && data) {
      setSubmissions(data.filter(s => s.social_accounts !== null) as DemographicSubmission[]);
    }
  };

  const handleDialogApprove = async (submission: DemographicSubmission, score: number) => {
    setProcessingSubmission(submission.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      await supabase.from("demographic_submissions").update({
        status: "approved",
        score: score,
        tier1_percentage: score,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id
      }).eq("id", submission.id);

      await supabase.from("profiles").update({ demographics_score: score }).eq("id", submission.social_accounts.user_id);

      toast.success(`Approved with score ${score}%`);
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    } finally {
      setProcessingSubmission(null);
    }
  };

  const handleDialogReject = async (submission: DemographicSubmission, reason: string) => {
    setProcessingSubmission(submission.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      await supabase.from("demographic_submissions").update({
        status: "rejected",
        score: null,
        admin_notes: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id
      }).eq("id", submission.id);

      toast.success("Rejected");
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject");
    } finally {
      setProcessingSubmission(null);
    }
  };

  // User actions
  const openUserDetails = (user: User) => {
    setSelectedUser(user);
    setUserContextSheetOpen(true);
  };

  const openPayDialog = (user: User) => {
    setSelectedUser(user);
    setPaymentAmount("");
    setPaymentNotes("");
    setPayDialogOpen(true);
  };

  const handlePayUser = async () => {
    if (!selectedUser || !paymentAmount) return;

    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        toastHook({ variant: "destructive", title: "Invalid amount" });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Update wallet balance
      const { error: walletError } = await supabase.rpc("add_to_wallet", {
        p_user_id: selectedUser.id,
        p_amount: amount,
      });

      if (walletError) throw walletError;

      // Create transaction record
      await supabase.from("wallet_transactions").insert({
        user_id: selectedUser.id,
        type: "earning",
        amount: amount,
        description: paymentNotes || "Manual payment from admin",
        metadata: { admin_id: session.user.id, manual_payment: true }
      });

      toast.success(`Paid $${amount.toFixed(2)} to @${selectedUser.username}`);
      setPayDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toastHook({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  // Bulk selection handlers
  const toggleUserSelection = (userId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  };

  const clearSelection = () => setSelectedUserIds(new Set());

  const getSelectedUsers = () => users.filter(u => selectedUserIds.has(u.id));

  // Bulk action: Export to CSV
  const handleBulkExport = () => {
    const selectedUsers = getSelectedUsers();
    if (selectedUsers.length === 0) return;

    const headers = ["Username", "Full Name", "Email", "Phone", "Balance", "Total Earned", "Trust Score", "Joined"];
    const rows = selectedUsers.map(u => [
      u.username,
      u.full_name || "",
      u.email || "",
      u.phone_number || "",
      u.wallets?.balance?.toFixed(2) || "0.00",
      u.wallets?.total_earned?.toFixed(2) || "0.00",
      u.trust_score?.toString() || "0",
      u.created_at ? format(new Date(u.created_at), "yyyy-MM-dd") : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedUsers.length} users to CSV`);
    clearSelection();
  };

  // Bulk action: Send bulk payment
  const handleBulkPayment = async () => {
    const selectedUsers = getSelectedUsers();
    if (selectedUsers.length === 0) return;

    setBulkConfirmAction({
      title: "Bulk Payment",
      description: `Send payment to ${selectedUsers.length} selected users. You'll be prompted to enter the amount.`,
      action: async () => {
        const amountStr = prompt("Enter payment amount (USD) per user:");
        if (!amountStr) return;

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
          toast.error("Invalid amount");
          return;
        }

        setBulkConfirmOpen(false);
        setBulkProgress({ total: selectedUsers.length, completed: 0, failed: 0, errors: [] });
        setBulkProgressOpen(true);
        setBulkActionLoading(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Not authenticated");
          setBulkActionLoading(false);
          return;
        }

        for (const user of selectedUsers) {
          try {
            await supabase.rpc("add_to_wallet", {
              p_user_id: user.id,
              p_amount: amount,
            });
            await supabase.from("wallet_transactions").insert({
              user_id: user.id,
              type: "earning",
              amount: amount,
              description: "Bulk payment from admin",
              metadata: { admin_id: session.user.id, bulk_payment: true }
            });
            setBulkProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
          } catch (error: any) {
            setBulkProgress(prev => ({
              ...prev,
              failed: prev.failed + 1,
              errors: [...prev.errors, `${user.username}: ${error.message}`]
            }));
          }
        }

        setBulkActionLoading(false);
        fetchUsers();
      },
    });
    setBulkConfirmOpen(true);
  };

  // Bulk action definitions
  const bulkActions = [
    {
      id: "export",
      label: "Export CSV",
      icon: <Download className="h-4 w-4" />,
      onClick: handleBulkExport,
    },
    {
      id: "pay",
      label: "Bulk Pay",
      icon: <DollarSign className="h-4 w-4" />,
      onClick: handleBulkPayment,
    },
  ];

  // Computed values
  const pendingSubmissions = useMemo(() => submissions.filter(s => s.status === "pending"), [submissions]);
  const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);

  return (
    <AdminPermissionGuard resource="users">
      <div className="h-full flex flex-col">
        {/* Page Header */}
        <div className={cn("border-b", BORDERS.default, PADDING.page, "flex-shrink-0")}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={TYPOGRAPHY.pageTitle}>Users</h1>
              <p className={cn(TYPOGRAPHY.caption, "mt-1")}>
                Manage {totalCount.toLocaleString()} registered users
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AdminButton
                variant="ghost"
                onClick={fetchUsers}
                disabled={loading}
                leftIcon={loading ? <LoadingBar size="sm" /> : <RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </AdminButton>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          <Tabs defaultValue="users" className="space-y-5">
            <TabsList className="p-1 h-auto bg-muted/30 rounded-xl border border-border/30">
              <TabsTrigger
                value="users"
                className="text-sm px-5 py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/40 font-medium tracking-tight transition-all"
              >
                <Users className="h-4 w-4 mr-2 opacity-60" />
                Users
                <span className="ml-2 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                  {totalCount.toLocaleString()}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="demographics"
                className="text-sm px-5 py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/40 font-medium tracking-tight transition-all"
              >
                <BadgeCheck className="h-4 w-4 mr-2 opacity-60" />
                Audience Insights
                {pendingSubmissions.length > 0 && (
                  <span className="ml-2 text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-medium">
                    {pendingSubmissions.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              {/* Search & Filters Toolbar */}
              <div className="bg-card border border-border/40 rounded-xl p-4 shadow-sm">
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search users..."
                      value={filters.search}
                      onChange={(e) => updateFilter("search", e.target.value)}
                      className="pl-10 h-9 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                    />
                    {filters.search && (
                      <button
                        onClick={() => updateFilter("search", "")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="h-6 w-px bg-border/40" />

                  <AdminButton
                    variant={showFilters || activeFilterCount > 0 ? "primary" : "secondary"}
                    onClick={() => setShowFilters(!showFilters)}
                    leftIcon={<Filter className="h-4 w-4" />}
                  >
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1.5 bg-white/20 text-xs px-2 py-0.5 rounded-full font-medium">
                        {activeFilterCount}
                      </span>
                    )}
                  </AdminButton>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {loading ? "Loading..." : `${totalCount.toLocaleString()} users`}
                    </span>
                  </div>
                </div>
              </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-card border border-border/40 rounded-xl p-4 space-y-4 shadow-sm">
                {/* Quick Filters Row */}
                <div className="flex flex-wrap gap-2">
                  {/* Campaign */}
                  <Popover open={campaignPopoverOpen} onOpenChange={setCampaignPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-8 px-3 text-xs font-inter tracking-[-0.3px] gap-1.5",
                          filters.campaign !== "all" ? "bg-primary/10 text-primary" : "bg-muted/50"
                        )}
                      >
                        {filters.campaign === "all" ? "Campaign" : campaigns.find(c => c.id === filters.campaign)?.title?.slice(0, 20)}
                        <ChevronsUpDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search campaigns..." />
                        <CommandList>
                          <CommandEmpty>No campaign found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => { updateFilter("campaign", "all"); setCampaignPopoverOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", filters.campaign === "all" ? "opacity-100" : "opacity-0")} />
                              All Campaigns
                            </CommandItem>
                            {campaigns.map(c => (
                              <CommandItem key={c.id} onSelect={() => { updateFilter("campaign", c.id); setCampaignPopoverOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", filters.campaign === c.id ? "opacity-100" : "opacity-0")} />
                                {c.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Time Period */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-8 px-3 text-xs font-inter tracking-[-0.3px] gap-1.5",
                          filters.signupTimeframe !== "all" ? "bg-primary/10 text-primary" : "bg-muted/50"
                        )}
                      >
                        {filters.signupTimeframe === "all" ? "Joined" :
                          filters.signupTimeframe === "24h" ? "Last 24h" :
                          filters.signupTimeframe === "7d" ? "Last 7d" :
                          filters.signupTimeframe === "30d" ? "Last 30d" : "Last 90d"}
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-36 p-1" align="start">
                      {["all", "24h", "7d", "30d", "90d"].map(v => (
                        <Button
                          key={v}
                          variant={filters.signupTimeframe === v ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => updateFilter("signupTimeframe", v)}
                        >
                          {v === "all" ? "All Time" : v === "24h" ? "Last 24 hours" : `Last ${v.replace("d", " days")}`}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>

                  {/* Platform */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-8 px-3 text-xs font-inter tracking-[-0.3px] gap-1.5",
                          filters.platform !== "all" ? "bg-primary/10 text-primary" : "bg-muted/50"
                        )}
                      >
                        {filters.platform === "all" ? "Platform" : filters.platform}
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-36 p-1" align="start">
                      {["all", "tiktok", "instagram", "youtube"].map(v => (
                        <Button
                          key={v}
                          variant={filters.platform === v ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-xs gap-2"
                          onClick={() => updateFilter("platform", v)}
                        >
                          {v !== "all" && getPlatformIcon(v)}
                          {v === "all" ? "All Platforms" : v.charAt(0).toUpperCase() + v.slice(1)}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>

                  {/* Toggle Filters */}
                  <div className="flex gap-1">
                    {[
                      { key: "hasDiscord" as const, label: "Discord", activeColor: "bg-[#5865F2]/20 text-[#5865F2]" },
                      { key: "hasPhone" as const, label: "Phone", activeColor: "bg-emerald-500/20 text-emerald-400" },
                      { key: "hasSocialAccount" as const, label: "Social", activeColor: "bg-blue-500/20 text-blue-400" },
                      { key: "hasApprovedDemographics" as const, label: "Demographics", activeColor: "bg-amber-500/20 text-amber-400" },
                      { key: "hasBrandRole" as const, label: "Brand", activeColor: "bg-purple-500/20 text-purple-400" },
                    ].map(({ key, label, activeColor }) => (
                      <Button
                        key={key}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-2.5 text-xs font-inter tracking-[-0.3px]",
                          filters[key] === true ? activeColor :
                          filters[key] === false ? "bg-muted/80 text-muted-foreground line-through" : "bg-muted/50"
                        )}
                        onClick={() => {
                          const current = filters[key];
                          updateFilter(key, current === true ? false : current === false ? null : true);
                        }}
                      >
                        {label}
                        {filters[key] !== null && (
                          <span className="ml-1 opacity-70">{filters[key] ? "✓" : "✗"}</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Advanced Filters Row */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Min Earned</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.minEarnings}
                        onChange={e => updateFilter("minEarnings", e.target.value)}
                        className="w-24 h-8 pl-6 bg-muted/50 border-0 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Min Balance</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.minBalance}
                        onChange={e => updateFilter("minBalance", e.target.value)}
                        className="w-24 h-8 pl-6 bg-muted/50 border-0 text-xs"
                      />
                    </div>
                  </div>

                  {/* Sort */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className={cn("h-8 gap-1.5 text-xs ml-auto", filters.sortField ? "bg-muted/80" : "bg-muted/50")}>
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        Sort: {filters.sortField === "created_at" ? "Recent" : filters.sortField === "balance" ? "Balance" : filters.sortField === "totalEarned" ? "Earned" : filters.sortField === "trust_score" ? "Trust" : "None"}
                        {filters.sortField && (filters.sortOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1" align="end">
                      {[
                        { field: "created_at" as const, label: "Join Date" },
                        { field: "balance" as const, label: "Balance" },
                        { field: "totalEarned" as const, label: "Total Earned" },
                        { field: "trust_score" as const, label: "Trust Score" },
                      ].map(({ field, label }) => (
                        <Button
                          key={field}
                          variant={filters.sortField === field ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-between text-xs"
                          onClick={() => {
                            if (filters.sortField === field) {
                              updateFilter("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc");
                            } else {
                              setFilters(prev => ({ ...prev, sortField: field, sortOrder: "desc" }));
                              setCurrentPage(1);
                            }
                          }}
                        >
                          {label}
                          {filters.sortField === field && (
                            filters.sortOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                          )}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>

                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                      Clear all
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-8"><PageLoading /></div>
            ) : users.length === 0 ? (
              <div className="p-8">
                <AdminEmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="No users found"
                  description={activeFilterCount > 0 ? "Try adjusting your filters" : undefined}
                  action={activeFilterCount > 0 ? (
                    <AdminButton variant="ghost" onClick={clearFilters}>
                      Clear filters
                    </AdminButton>
                  ) : undefined}
                />
              </div>
            ) : (
              <div>
                {/* Table Header */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-3 px-4 py-3 bg-muted/30 border-b border-border/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="w-8 flex items-center">
                    <Checkbox
                      checked={users.length > 0 && selectedUserIds.size === users.length}
                      onCheckedChange={toggleSelectAll}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <div className="min-w-[200px]">User</div>
                  <div className="w-[120px]">Accounts</div>
                  <div className="w-[60px] text-center">Trust</div>
                  <div className="w-[100px]">Joined</div>
                  <div className="w-[80px] text-right">Balance</div>
                  <div className="w-[80px] text-right">Earned</div>
                  <div className="w-[60px]"></div>
                </div>

                {/* User Rows */}
                <div className="divide-y divide-border/20">
                {users.map(user => {
                  const balance = user.wallets?.balance || 0;
                  const totalEarned = user.wallets?.total_earned || 0;
                  const trustScore = user.trust_score ?? 0;
                  const trustColor = trustScore >= 70 ? "text-emerald-500" : trustScore >= 40 ? "text-amber-500" : "text-red-400";
                  const isSelected = selectedUserIds.has(user.id);

                  return (
                    <div
                      key={user.id}
                      onClick={() => openUserDetails(user)}
                      className={cn(
                        "grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-3 cursor-pointer transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                      )}
                    >
                      {/* Checkbox */}
                      <div className="w-8 flex items-center" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                      {/* User */}
                      <div className="min-w-[200px] flex items-center gap-3 min-w-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-sm font-medium">{(user.full_name || user.username || "?")[0].toUpperCase()}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{user.username}</span>
                            {user.discord_id && <img src={discordIcon} alt="" className="w-3.5 h-3.5 opacity-60" />}
                            {user.phone_number && <Phone className="w-3.5 h-3.5 text-muted-foreground/60" />}
                          </div>
                          {user.full_name && <p className="text-xs text-muted-foreground truncate">{user.full_name}</p>}
                        </div>
                      </div>

                      {/* Accounts */}
                      <div className="w-[120px]">
                        {user.social_accounts && user.social_accounts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.social_accounts.slice(0, 3).map(acc => {
                              const status = acc.demographic_submissions?.[0]?.status;
                              return (
                                <div key={acc.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 text-xs">
                                  {getPlatformIcon(acc.platform)}
                                  {status === "approved" && <BadgeCheck className="h-3 w-3 text-emerald-500" />}
                                  {status === "pending" && <Clock className="h-3 w-3 text-amber-500" />}
                                </div>
                              );
                            })}
                            {user.social_accounts.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{user.social_accounts.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </div>

                      {/* Trust */}
                      <div className="w-[60px] text-center">
                        <span className={cn("text-sm font-medium", trustColor)}>{trustScore}</span>
                      </div>

                      {/* Joined */}
                      <div className="w-[100px]">
                        <span className="text-xs text-muted-foreground">
                          {user.created_at ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) : "—"}
                        </span>
                      </div>

                      {/* Balance */}
                      <div className="w-[80px] text-right">
                        <span className="text-sm font-medium">${balance.toFixed(2)}</span>
                      </div>

                      {/* Earned */}
                      <div className="w-[80px] text-right">
                        <span className="text-sm font-medium text-emerald-500">${totalEarned.toFixed(2)}</span>
                      </div>

                      {/* Actions */}
                      <div className="w-[60px] flex justify-end">
                        <Button
                          size="sm"
                          onClick={e => { e.stopPropagation(); openPayDialog(user); }}
                          className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          Pay
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="h-8 px-3 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="h-8 w-8 p-0 text-xs"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="h-8 px-3 text-xs"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-4">
            <div className="grid grid-cols-3 gap-5">
              {/* Pending */}
              <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
                  <h3 className="text-sm font-semibold tracking-tight">Pending Review</h3>
                  <Badge variant="secondary" className="text-xs">{pendingSubmissions.length}</Badge>
                </div>
                <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                  {pendingSubmissions.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => { setReviewingSubmission(sub); setReviewDialogOpen(true); }}
                      className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/30"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getPlatformIcon(sub.social_accounts.platform)}
                        <span className="text-sm font-medium truncate">@{sub.social_accounts.username}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{sub.tier1_percentage}% Tier 1</span>
                        <span>{formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  ))}
                  {pendingSubmissions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No pending submissions</p>
                  )}
                </div>
              </div>

              {/* Approved */}
              <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
                  <h3 className="text-sm font-semibold tracking-tight">Approved</h3>
                  <Badge className="text-xs bg-emerald-500/20 text-emerald-400">
                    {submissions.filter(s => s.status === "approved").length}
                  </Badge>
                </div>
                <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                  {submissions.filter(s => s.status === "approved").slice(0, 20).map(sub => (
                    <div key={sub.id} className="p-3 bg-muted/30 rounded-lg border border-transparent">
                      <div className="flex items-center gap-2 mb-2">
                        {getPlatformIcon(sub.social_accounts.platform)}
                        <span className="text-sm font-medium truncate">@{sub.social_accounts.username}</span>
                        <Badge className="ml-auto text-xs bg-emerald-500/20 text-emerald-400">{sub.score}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {sub.reviewed_at && format(new Date(sub.reviewed_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
                  <h3 className="text-sm font-semibold tracking-tight">Rejected</h3>
                  <Badge variant="destructive" className="text-xs">
                    {submissions.filter(s => s.status === "rejected").length}
                  </Badge>
                </div>
                <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                  {submissions.filter(s => s.status === "rejected").slice(0, 20).map(sub => (
                    <div key={sub.id} className="p-3 bg-muted/30 rounded-lg border border-transparent">
                      <div className="flex items-center gap-2 mb-2">
                        {getPlatformIcon(sub.social_accounts.platform)}
                        <span className="text-sm font-medium truncate">@{sub.social_accounts.username}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {sub.reviewed_at && format(new Date(sub.reviewed_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>

        {/* Payment Dialog */}
        <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-inter tracking-[-0.3px]">Pay User</DialogTitle>
              <DialogDescription>
                {selectedUser && `Send payment to @${selectedUser.username}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-muted/30 border-0"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="Payment notes..."
                  className="bg-muted/30 border-0"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
                <Button onClick={handlePayUser} className="bg-emerald-600 hover:bg-emerald-700">
                  Send Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Context Sheet */}
        <UserContextSheet
          user={selectedUser}
          open={userContextSheetOpen}
          onOpenChange={setUserContextSheetOpen}
          onUserUpdated={fetchUsers}
          onPayUser={openPayDialog}
        />

        {/* Demographic Review Dialog */}
        {reviewingSubmission && (
          <AudienceInsightsReviewDialog
            submission={reviewingSubmission}
            submissions={pendingSubmissions}
            open={reviewDialogOpen}
            onOpenChange={(open) => {
              setReviewDialogOpen(open);
              if (!open) setReviewingSubmission(null);
            }}
            onApprove={handleDialogApprove}
            onReject={handleDialogReject}
            onNavigate={setReviewingSubmission}
            isProcessing={processingSubmission === reviewingSubmission.id}
          />
        )}

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedUserIds.size}
          actions={bulkActions}
          onClearSelection={clearSelection}
          loading={bulkActionLoading}
        />

        {/* Bulk Confirmation Dialog */}
        {bulkConfirmAction && (
          <BulkConfirmationDialog
            open={bulkConfirmOpen}
            onOpenChange={setBulkConfirmOpen}
            title={bulkConfirmAction.title}
            description={bulkConfirmAction.description}
            actionLabel="Confirm"
            onConfirm={bulkConfirmAction.action}
            variant={bulkConfirmAction.variant}
          />
        )}

        {/* Bulk Progress Dialog */}
        <BulkProgressDialog
          open={bulkProgressOpen}
          onOpenChange={setBulkProgressOpen}
          title="Processing Bulk Action"
          total={bulkProgress.total}
          completed={bulkProgress.completed}
          failed={bulkProgress.failed}
          isComplete={!bulkActionLoading && bulkProgress.total > 0 && (bulkProgress.completed + bulkProgress.failed) === bulkProgress.total}
          onClose={() => {
            setBulkProgressOpen(false);
            clearSelection();
          }}
          errors={bulkProgress.errors}
        />
      </div>
    </AdminPermissionGuard>
  );
}
