import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { DollarSign, Search, Users as UsersIcon, Wallet, Upload, FileDown, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, TrendingUp, Image as ImageIcon, BadgeCheck, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import { AddReferralDialog } from "@/components/admin/AddReferralDialog";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

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
interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number;
  is_verified: boolean;
  account_link: string;
  campaign_id: string | null;
  campaigns?: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string;
    brands?: {
      logo_url: string;
    } | null;
  };
  demographic_submissions?: Array<{
    status: string;
    tier1_percentage: number;
    submitted_at: string;
  }>;
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
export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [campaignPopoverOpen, setCampaignPopoverOpen] = useState(false);
  
  // Advanced filters
  const [minEarnings, setMinEarnings] = useState<string>("");
  const [earningsTimeframe, setEarningsTimeframe] = useState<string>("all");
  const [hasDiscord, setHasDiscord] = useState<boolean | null>(null);
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);
  const [hasSocialAccount, setHasSocialAccount] = useState<boolean | null>(null);
  const [signupTimeframe, setSignupTimeframe] = useState<string>("all");
  const [hasApprovedDemographics, setHasApprovedDemographics] = useState<boolean | null>(null);
  const [hasBrandRole, setHasBrandRole] = useState<boolean | null>(null);
  const [minBalance, setMinBalance] = useState<string>("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(50);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [approvedSortOrder, setApprovedSortOrder] = useState<'asc' | 'desc'>('asc'); // asc = soonest first, desc = latest first
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [userSocialAccounts, setUserSocialAccounts] = useState<SocialAccount[]>([]);
  const [loadingSocialAccounts, setLoadingSocialAccounts] = useState(false);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [userPaymentMethods, setUserPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [socialAccountsOpen, setSocialAccountsOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Demographics state
  const [submissions, setSubmissions] = useState<DemographicSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<DemographicSubmission | null>(null);
  const [score, setScore] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved");
  const [updating, setUpdating] = useState(false);
  const [editScoreDialogOpen, setEditScoreDialogOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<DemographicSubmission | null>(null);
  const [editScore, setEditScore] = useState("");
  const [sortField, setSortField] = useState<"balance" | "totalEarned" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [addToCampaignDialogOpen, setAddToCampaignDialogOpen] = useState(false);
  const [selectedCampaignForAdd, setSelectedCampaignForAdd] = useState<string>("");
  const [selectedSocialAccountForAdd, setSelectedSocialAccountForAdd] = useState<string>("");
  const [addingToCampaign, setAddingToCampaign] = useState(false);
  const [addReferralDialogOpen, setAddReferralDialogOpen] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchData();
    fetchSubmissions();
  }, []);
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  useEffect(() => {
    if (initialLoadComplete) {
      filterUsers();
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [debouncedSearchQuery, selectedCampaign, sortField, sortOrder, minEarnings, earningsTimeframe, hasDiscord, hasPhone, hasSocialAccount, signupTimeframe, hasApprovedDemographics, hasBrandRole, minBalance, initialLoadComplete]);
  const fetchData = async () => {
    setLoading(true);

    // Fetch total user count
    const { count: totalCount } = await supabase
      .from("profiles")
      .select("*", { count: 'exact', head: true });
    
    if (totalCount) {
      setTotalUserCount(totalCount);
    }

    // Fetch users with wallets and social accounts
    const {
      data: usersData,
      error: usersError
    } = await supabase.from("profiles").select(`
        *,
        wallets (
          balance,
          total_earned,
          total_withdrawn
        ),
        social_accounts (
          id,
          platform,
          username,
          follower_count,
          demographic_submissions (
            status
          )
        )
      `).order("created_at", {
      ascending: false
    }).limit(1000);
    if (usersError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users"
      });
    } else {
      setUsers(usersData as any || []);
      setFilteredUsers(usersData as any || []);
    }

    // Fetch campaigns
    const {
      data: campaignsData,
      error: campaignsError
    } = await supabase.from("campaigns").select("id, title").order("title");
    if (!campaignsError) {
      setCampaigns(campaignsData || []);
    }
    setLoading(false);
    setInitialLoadComplete(true);
  };
  const filterUsers = async () => {
    setLoading(true);

    // Build database query with all filters
    let query = supabase.from("profiles").select(`
      *,
      wallets (
        balance,
        total_earned,
        total_withdrawn
      ),
      social_accounts (
        id,
        platform,
        username,
        follower_count,
        demographic_submissions (
          status
        )
      )
    `, { count: 'exact' });

    // Search filter - searches across all users in database (profile fields only, social accounts filtered post-query)
    if (debouncedSearchQuery) {
      const searchTerm = debouncedSearchQuery.toLowerCase();
      // Note: we also do post-query filter for social_accounts.username
      query = query.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // Discord filter
    if (hasDiscord === true) {
      query = query.not('discord_id', 'is', null);
    } else if (hasDiscord === false) {
      query = query.is('discord_id', null);
    }

    // Phone filter
    if (hasPhone === true) {
      query = query.not('phone_number', 'is', null);
    } else if (hasPhone === false) {
      query = query.is('phone_number', null);
    }

    // Signup timeframe filter
    if (signupTimeframe !== "all" && signupTimeframe) {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (signupTimeframe) {
        case "24h":
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }
      query = query.gte('created_at', cutoffDate.toISOString());
    }

    // Order by created_at desc
    // Remove limit when filtering by balance or earnings to ensure all users are checked
    const hasPostQueryFilters = (minBalance && parseFloat(minBalance) > 0) || 
                                 (minEarnings && parseFloat(minEarnings) > 0) ||
                                 hasSocialAccount !== null ||
                                 hasApprovedDemographics !== null ||
                                 hasBrandRole !== null ||
                                 selectedCampaign !== "all";
    
    query = query.order("created_at", { ascending: false });
    if (!hasPostQueryFilters) {
      query = query.limit(1000);
    }

    const { data: usersData, error, count } = await query;

    if (error) {
      console.error('Filter error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to filter users"
      });
      setLoading(false);
      return;
    }

    let filtered = usersData as User[] || [];

    // If searching, also include users whose social accounts match the search term
    if (debouncedSearchQuery) {
      const searchTerm = debouncedSearchQuery.toLowerCase();
      
      // Search for social accounts matching the query
      const { data: matchingSocialAccounts } = await supabase
        .from("social_accounts")
        .select("user_id")
        .ilike("username", `%${searchTerm}%`);
      
      if (matchingSocialAccounts && matchingSocialAccounts.length > 0) {
        const socialAccountUserIds = new Set(matchingSocialAccounts.map(sa => sa.user_id));
        
        // Fetch additional users whose social accounts match but weren't in the original query
        const existingUserIds = new Set(filtered.map(u => u.id));
        const missingUserIds = [...socialAccountUserIds].filter(id => !existingUserIds.has(id));
        
        if (missingUserIds.length > 0) {
          const { data: additionalUsers } = await supabase
            .from("profiles")
            .select(`
              *,
              wallets (
                balance,
                total_earned,
                total_withdrawn
              ),
              social_accounts (
                id,
                platform,
                username,
                follower_count,
                demographic_submissions (
                  status
                )
              )
            `)
            .in("id", missingUserIds);
          
          if (additionalUsers) {
            filtered = [...filtered, ...(additionalUsers as User[])];
          }
        }
      }
    }

    // Campaign filter (requires separate query)
    if (selectedCampaign !== "all") {
      const { data: submissions } = await supabase
        .from("campaign_submissions")
        .select("creator_id")
        .eq("campaign_id", selectedCampaign);
      if (submissions) {
        const creatorIds = submissions.map(s => s.creator_id);
        filtered = filtered.filter(user => creatorIds.includes(user.id));
      }
    }

    // Social account filter (post-query filter since it's a relation)
    if (hasSocialAccount === true) {
      filtered = filtered.filter(user => user.social_accounts && user.social_accounts.length > 0);
    } else if (hasSocialAccount === false) {
      filtered = filtered.filter(user => !user.social_accounts || user.social_accounts.length === 0);
    }

    // Approved demographics filter (post-query filter)
    if (hasApprovedDemographics === true) {
      filtered = filtered.filter(user => 
        user.social_accounts?.some(account => 
          account.demographic_submissions?.some(sub => sub.status === 'approved')
        )
      );
    } else if (hasApprovedDemographics === false) {
      filtered = filtered.filter(user => 
        !user.social_accounts?.some(account => 
          account.demographic_submissions?.some(sub => sub.status === 'approved')
        )
      );
    }

    // Brand role filter (post-query filter)
    if (hasBrandRole !== null) {
      // Get users with brand role or brand membership
      const { data: brandRoleUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "brand");
      
      const { data: brandMemberUsers } = await supabase
        .from("brand_members")
        .select("user_id");
      
      const brandUserIds = new Set([
        ...(brandRoleUsers?.map(r => r.user_id) || []),
        ...(brandMemberUsers?.map(m => m.user_id) || [])
      ]);
      
      if (hasBrandRole === true) {
        filtered = filtered.filter(user => brandUserIds.has(user.id));
      } else {
        filtered = filtered.filter(user => !brandUserIds.has(user.id));
      }
    }

    // Minimum earnings filter (post-query filter since wallets is a relation)
    if (minEarnings && parseFloat(minEarnings) > 0) {
      const minEarningsValue = parseFloat(minEarnings);
      filtered = filtered.filter(user => (user.wallets?.total_earned || 0) >= minEarningsValue);
    }

    // Minimum balance filter (post-query filter)
    if (minBalance && parseFloat(minBalance) > 0) {
      const minBalanceValue = parseFloat(minBalance);
      filtered = filtered.filter(user => (user.wallets?.balance || 0) >= minBalanceValue);
    }

    // Sort users
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = 0;
        let bValue = 0;

        if (sortField === "balance") {
          aValue = a.wallets?.balance || 0;
          bValue = b.wallets?.balance || 0;
        } else if (sortField === "totalEarned") {
          aValue = a.wallets?.total_earned || 0;
          bValue = b.wallets?.total_earned || 0;
        }

        if (sortOrder === "asc") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

    // Update the total count if we got it from the query
    if (count !== null) {
      setTotalUserCount(count);
    }

    setFilteredUsers(filtered);
    setLoading(false);
  };

  const applyFiltersAcrossAllUsers = async () => {
    setLoading(true);

    try {
      const pageSize = 1000;
      let offset = 0;
      let allUsers: User[] = [];
      let totalCount: number | null = null;

      while (true) {
        let query = supabase.from("profiles").select(`
          *,
          wallets (
            balance,
            total_earned,
            total_withdrawn
          ),
          social_accounts (
            id,
            platform,
            username,
            follower_count,
            demographic_submissions (
              status
            )
          )
        `, { count: 'exact' });

        // Reuse the same base filters as filterUsers
        if (debouncedSearchQuery) {
          const searchTerm = debouncedSearchQuery.toLowerCase();
          query = query.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        if (hasDiscord === true) {
          query = query.not('discord_id', 'is', null);
        } else if (hasDiscord === false) {
          query = query.is('discord_id', null);
        }

        if (hasPhone === true) {
          query = query.not('phone_number', 'is', null);
        } else if (hasPhone === false) {
          query = query.is('phone_number', null);
        }

        if (signupTimeframe !== "all" && signupTimeframe) {
          const now = new Date();
          let cutoffDate: Date;

          switch (signupTimeframe) {
            case "24h":
              cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case "7d":
              cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "30d":
              cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case "90d":
              cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            default:
              cutoffDate = new Date(0);
          }
          query = query.gte('created_at', cutoffDate.toISOString());
        }

        query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

        const { data, error, count } = await query;

        if (error) {
          console.error('Filter all users error:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to filter all users"
          });
          return;
        }

        if (data && data.length > 0) {
          allUsers = allUsers.concat(data as User[]);
        }

        if (totalCount === null && typeof count === 'number') {
          totalCount = count;
        }

        if (!data || data.length < pageSize) {
          break;
        }

        offset += pageSize;
      }

      let filtered = allUsers;

      // Apply the same client-side filters as filterUsers
      if (selectedCampaign !== "all") {
        const { data: submissions } = await supabase
          .from("campaign_submissions")
          .select("creator_id")
          .eq("campaign_id", selectedCampaign);
        if (submissions) {
          const creatorIds = submissions.map(s => s.creator_id);
          filtered = filtered.filter(user => creatorIds.includes(user.id));
        }
      }

      if (hasSocialAccount === true) {
        filtered = filtered.filter(user => user.social_accounts && user.social_accounts.length > 0);
      } else if (hasSocialAccount === false) {
        filtered = filtered.filter(user => !user.social_accounts || user.social_accounts.length === 0);
      }

      if (hasApprovedDemographics === true) {
        filtered = filtered.filter(user =>
          user.social_accounts?.some(account =>
            account.demographic_submissions?.some(sub => sub.status === 'approved')
          )
        );
      } else if (hasApprovedDemographics === false) {
        filtered = filtered.filter(user =>
          !user.social_accounts?.some(account =>
            account.demographic_submissions?.some(sub => sub.status === 'approved')
          )
        );
      }

      if (minEarnings && parseFloat(minEarnings) > 0) {
        const minEarningsValue = parseFloat(minEarnings);
        filtered = filtered.filter(user => (user.wallets?.total_earned || 0) >= minEarningsValue);
      }

      if (minBalance && parseFloat(minBalance) > 0) {
        const minBalanceValue = parseFloat(minBalance);
        filtered = filtered.filter(user => (user.wallets?.balance || 0) >= minBalanceValue);
      }

      if (sortField) {
        filtered = [...filtered].sort((a, b) => {
          let aValue = 0;
          let bValue = 0;

          if (sortField === "balance") {
            aValue = a.wallets?.balance || 0;
            bValue = b.wallets?.balance || 0;
          } else if (sortField === "totalEarned") {
            aValue = a.wallets?.total_earned || 0;
            bValue = b.wallets?.total_earned || 0;
          }

          if (sortOrder === "asc") {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        });
      }

      if (totalCount !== null) {
        setTotalUserCount(totalCount);
      } else {
        setTotalUserCount(filtered.length);
      }

      setFilteredUsers(filtered);
    } finally {
      setLoading(false);
    }
  };

  const openPayDialog = (user: User) => {
    setSelectedUser(user);
    setPaymentAmount("");
    setPaymentNotes("");
    setPayDialogOpen(true);
  };
  const fetchUserSocialAccounts = async (userId: string) => {
    setLoadingSocialAccounts(true);
    const {
      data,
      error
    } = await supabase.from("social_accounts").select(`
        *,
        social_account_campaigns (
          campaigns (
            id,
            title,
            brand_name,
            brand_logo_url,
            brands:brand_id (
              logo_url
            )
          )
        ),
        demographic_submissions (
          status,
          tier1_percentage,
          submitted_at
        )
      `).eq("user_id", userId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch social accounts"
      });
      setUserSocialAccounts([]);
    } else {
      setUserSocialAccounts(data || []);
    }
    setLoadingSocialAccounts(false);
  };
  const fetchUserTransactions = async (userId: string) => {
    setLoadingTransactions(true);
    const {
      data: txData,
      error
    } = await supabase.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", {
      ascending: false
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch transactions"
      });
      setUserTransactions([]);
    } else {
      // Enrich transactions with campaign and account data
      const enrichedTransactions = await Promise.all((txData || []).map(async (tx) => {
        const metadata = (tx.metadata || {}) as any;
        
        console.log('=== Transaction Debug ===');
        console.log('ID:', tx.id);
        console.log('Type:', tx.type);
        console.log('Description:', tx.description);
        console.log('Metadata before enrichment:', JSON.stringify(metadata, null, 2));
        
        // If metadata has campaign_id, fetch campaign details
        if (metadata.campaign_id) {
          const { data: campaignData, error } = await supabase
            .from("campaigns")
            .select("title, brand_name")
            .eq("id", metadata.campaign_id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching campaign:', error);
          }
          
          if (campaignData) {
            metadata.campaign_name = campaignData.title;
            console.log('Campaign fetched:', campaignData.title);
          }
        }
        
        console.log('Metadata after enrichment:', JSON.stringify(metadata, null, 2));
        console.log('=========================');
        
        return {
          ...tx,
          metadata
        };
      }));
      
      setUserTransactions(enrichedTransactions);
    }
    setLoadingTransactions(false);
  };
  const fetchUserPaymentMethods = async (userId: string) => {
    setLoadingPaymentMethods(true);
    const {
      data,
      error
    } = await supabase.from("wallets").select("payout_method, payout_details").eq("user_id", userId).maybeSingle();
    if (error) {
      console.error("Error fetching payment methods:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payment methods"
      });
      setUserPaymentMethods([]);
    } else if (data && data.payout_details && Array.isArray(data.payout_details)) {
      // payout_details is an array of payment methods
      setUserPaymentMethods(data.payout_details);
    } else if (data && data.payout_method) {
      // Fallback for old format
      setUserPaymentMethods([{
        method: data.payout_method,
        details: {}
      }]);
    } else {
      setUserPaymentMethods([]);
    }
    setLoadingPaymentMethods(false);
  };
  const openUserDetailsDialog = (user: User) => {
    setSelectedUser(user);
    setUserDetailsDialogOpen(true);
    fetchUserSocialAccounts(user.id);
    fetchUserTransactions(user.id);
    fetchUserPaymentMethods(user.id);
  };
  const openAddToCampaignDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedCampaignForAdd("");
    setSelectedSocialAccountForAdd("");
    fetchUserSocialAccounts(user.id);
    setAddToCampaignDialogOpen(true);
  };
  const handleAddToCampaign = async () => {
    if (!selectedUser || !selectedCampaignForAdd || !selectedSocialAccountForAdd) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select both a campaign and a social account"
      });
      return;
    }

    setAddingToCampaign(true);

    try {
      // Get the selected social account details
      const selectedAccount = userSocialAccounts.find(acc => acc.id === selectedSocialAccountForAdd);
      if (!selectedAccount) {
        throw new Error("Selected social account not found");
      }

      // Check if already has a submission for this campaign
      const { data: existingSubmission } = await supabase
        .from("campaign_submissions")
        .select("id, status")
        .eq("campaign_id", selectedCampaignForAdd)
        .eq("creator_id", selectedUser.id)
        .eq("platform", selectedAccount.platform)
        .maybeSingle();

      if (existingSubmission && existingSubmission.status !== "withdrawn") {
        toast({
          variant: "destructive",
          title: "Already Applied",
          description: "This user already has an active application for this campaign on this platform"
        });
        setAddingToCampaign(false);
        return;
      }

      // Create campaign submission
      const { error: submissionError } = await supabase
        .from("campaign_submissions")
        .insert({
          campaign_id: selectedCampaignForAdd,
          creator_id: selectedUser.id,
          platform: selectedAccount.platform,
          content_url: "",
          status: "approved"
        });

      if (submissionError) throw submissionError;

      // Link social account to campaign
      const { error: linkError } = await supabase
        .from("social_account_campaigns")
        .insert({
          social_account_id: selectedSocialAccountForAdd,
          campaign_id: selectedCampaignForAdd,
          user_id: selectedUser.id
        });

      if (linkError) throw linkError;

      const campaign = campaigns.find(c => c.id === selectedCampaignForAdd);
      toast({
        title: "Success",
        description: `${selectedUser.username} has been added to ${campaign?.title || "the campaign"}`
      });

      setAddToCampaignDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error adding user to campaign:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add user to campaign"
      });
    } finally {
      setAddingToCampaign(false);
    }
  };
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return <img src={tiktokLogo} alt="TikTok" className="h-5 w-5" />;
      case 'instagram':
        return <img src={instagramLogo} alt="Instagram" className="h-5 w-5" />;
      case 'youtube':
        return <img src={youtubeLogo} alt="YouTube" className="h-5 w-5" />;
      default:
        return <UsersIcon className="h-5 w-5" />;
    }
  };
  const handlePayUser = async () => {
    if (!selectedUser || !paymentAmount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a payment amount"
      });
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid amount"
      });
      return;
    }
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;

    // Get the current wallet balance from database to ensure accuracy
    const { data: currentWallet, error: fetchError } = await supabase
      .from("wallets")
      .select("balance, total_earned")
      .eq("user_id", selectedUser.id)
      .maybeSingle();

    if (fetchError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch wallet"
      });
      return;
    }

    // Create wallet if it doesn't exist
    if (!currentWallet) {
      const { error: createError } = await supabase
        .from("wallets")
        .insert({ user_id: selectedUser.id, balance: 0, total_earned: 0 });
      
      if (createError) {
        console.error("Failed to create wallet:", createError);
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to create wallet: ${createError.message}`
        });
        return;
      }
    }

    const currentBalance = currentWallet?.balance || 0;
    const currentEarned = currentWallet?.total_earned || 0;

    // Update wallet balance with fresh data
    const {
      error: walletError
    } = await supabase.from("wallets").update({
      balance: currentBalance + amount,
      total_earned: currentEarned + amount
    }).eq("user_id", selectedUser.id);
    if (walletError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process payment"
      });
      return;
    }

    // Create transaction record
    const {
      error: transactionError
    } = await supabase.from("wallet_transactions").insert({
      user_id: selectedUser.id,
      type: "earning",
      amount: amount,
      status: "completed",
      description: paymentNotes || "Manual payment from admin",
      created_by: session.user.id,
      metadata: {
        source: "admin_payment",
        recipient: selectedUser.username,
        notes: paymentNotes
      }
    });
    
    if (transactionError) {
      console.error("Failed to create transaction:", transactionError);
      // Still show success as wallet was updated, but log the error
    }

    // Create audit log
    await supabase.from("security_audit_log").insert({
      user_id: session.user.id,
      action: "MANUAL_PAYMENT",
      table_name: "wallets",
      record_id: selectedUser.id,
      new_data: {
        amount,
        recipient: selectedUser.username,
        notes: paymentNotes
      }
    });
    toast({
      title: "Success",
      description: `Payment of $${amount.toFixed(2)} sent to ${selectedUser.username}`
    });
    setPayDialogOpen(false);
    
    // Refresh data and update the selected user with new wallet balance
    await fetchData();
    
    // If user details dialog is open, update the selected user with new data
    if (userDetailsDialogOpen) {
      const { data: updatedUserData } = await supabase
        .from("profiles")
        .select(`
          *,
          wallets(balance, total_earned, total_withdrawn)
        `)
        .eq("id", selectedUser.id)
        .single();
      
      if (updatedUserData) {
        setSelectedUser(updatedUserData);
        // Also refresh transactions to show the new payment
        fetchUserTransactions(selectedUser.id);
      }
    }
  };
  const handleCsvImport = async () => {
    if (!csvFile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a CSV file"
      });
      return;
    }
    setIsImporting(true);
    setImportResults(null);
    try {
      const fileContent = await csvFile.text();
      const {
        data,
        error
      } = await supabase.functions.invoke('import-transactions', {
        body: {
          csvContent: fileContent
        }
      });
      if (error) throw error;
      setImportResults(data);
      if (data.successful > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${data.successful} of ${data.processed} transactions`
        });
        fetchData(); // Refresh user data
      } else {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: `Failed to import any transactions. Check the results for details.`
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import transactions"
      });
    } finally {
      setIsImporting(false);
    }
  };
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
      setImportResults(null);
    }
  };
  const downloadCsvTemplate = () => {
    const template = 'account_username;payout amount;date\ntiktok_user123;100.50;2025-10-02\ninsta_creator;250.00;2025-10-01';
    const blob = new Blob([template], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transaction_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Demographics functions
  const fetchSubmissions = async () => {
    console.log('Fetching demographic submissions...');
    const {
      data,
      error
    } = await supabase.from("demographic_submissions").select(`
        *,
        social_accounts (
          id,
          platform,
          username,
          user_id,
          avatar_url,
          follower_count,
          bio,
          account_link
        )
      `).order("submitted_at", {
      ascending: false
    });
    
    if (error) {
      console.error('Error fetching demographic submissions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch submissions"
      });
    } else {
      console.log('Fetched demographic submissions:', data?.length || 0, 'submissions');
      // Filter out any submissions where social_accounts is null (orphaned records)
      const validSubmissions = (data || []).filter(sub => sub.social_accounts !== null);
      if (validSubmissions.length !== (data || []).length) {
        console.warn('Filtered out', (data || []).length - validSubmissions.length, 'orphaned submissions');
      }
      setSubmissions(validSubmissions);
    }
  };
  const handleReview = async (status?: "approved" | "rejected") => {
    if (!selectedSubmission) return;
    
    const finalStatus = status || reviewStatus;
    const scoreValue = parseInt(score);
    
    // Only validate score if approving
    if (finalStatus === "approved" && (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100)) {
      toast({
        variant: "destructive",
        title: "Invalid Score",
        description: "Score must be between 0 and 100"
      });
      return;
    }
    
    setUpdating(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const updateData: any = {
        status: finalStatus,
        score: finalStatus === "approved" ? scoreValue : null,
        admin_notes: adminNotes.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id
      };
      
      // Only update tier1_percentage when approving (it's required, so don't null it on reject)
      if (finalStatus === "approved") {
        updateData.tier1_percentage = scoreValue;
      }
      
      const {
        error: updateError
      } = await supabase.from("demographic_submissions").update(updateData).eq("id", selectedSubmission.id);
      if (updateError) throw updateError;
      if (finalStatus === "approved") {
        const {
          error: profileError
        } = await supabase.from("profiles").update({
          demographics_score: scoreValue
        }).eq("id", selectedSubmission.social_accounts.user_id);
        if (profileError) throw profileError;
      }
      toast({
        title: "Success",
        description: "Submission reviewed successfully"
      });
      setSelectedSubmission(null);
      setScore("");
      setAdminNotes("");
      fetchSubmissions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update submission"
      });
    } finally {
      setUpdating(false);
    }
  };
  const openReviewDialog = (submission: DemographicSubmission) => {
    setSelectedSubmission(submission);
    setScore(submission.score?.toString() || "");
    setAdminNotes(submission.admin_notes || "");
    setReviewStatus(submission.status as "approved" | "rejected" || "approved");
  };
  const openEditScoreDialog = (submission: DemographicSubmission) => {
    setEditingSubmission(submission);
    setEditScore(submission.score?.toString() || "");
    setEditScoreDialogOpen(true);
  };

  const openEditScoreFromSocialAccount = async (account: SocialAccount) => {
    // Fetch the latest demographic submission for this account
    const { data, error } = await supabase
      .from("demographic_submissions")
      .select("*")
      .eq("social_account_id", account.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .single();
    
    if (!error && data) {
      setEditingSubmission({
        ...data,
        social_accounts: {
          id: account.id,
          platform: account.platform,
          username: account.username,
          user_id: selectedUser?.id || ""
        }
      });
      setEditScore(data.score?.toString() || "");
      setEditScoreDialogOpen(true);
    }
  };
  const handleUpdateScore = async () => {
    if (!editingSubmission) return;
    const scoreValue = parseInt(editScore);
    if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
      toast({
        variant: "destructive",
        title: "Invalid Score",
        description: "Score must be between 0 and 100"
      });
      return;
    }
    setUpdating(true);
    try {
      const {
        error: updateError
      } = await supabase.from("demographic_submissions").update({
        score: scoreValue,
        tier1_percentage: scoreValue
      }).eq("id", editingSubmission.id);
      if (updateError) throw updateError;

      // Also update the profile's demographics score
      const {
        error: profileError
      } = await supabase.from("profiles").update({
        demographics_score: scoreValue
      }).eq("id", editingSubmission.social_accounts.user_id);
      if (profileError) throw profileError;
      toast({
        title: "Success",
        description: "Demographics score updated successfully"
      });
      setEditScoreDialogOpen(false);
      setEditingSubmission(null);
      setEditScore("");
      fetchSubmissions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update score"
      });
    } finally {
      setUpdating(false);
    }
  };
  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        variant: "secondary" as const,
        icon: Clock,
        color: "text-warning"
      },
      approved: {
        variant: "default" as const,
        icon: CheckCircle2,
        color: "text-success"
      },
      rejected: {
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-destructive"
      }
    };
    const {
      variant,
      icon: Icon,
      color
    } = config[status as keyof typeof config] || config.pending;
    return <Badge variant={variant} className="gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {status}
      </Badge>;
  };
  const pendingSubmissions = submissions.filter(s => s.status === "pending" && s.social_accounts);
  const approvedSubmissions = submissions.filter(s => s.status === "approved" && s.social_accounts).sort((a, b) => {
    const dateA = new Date(a.submitted_at).getTime() + 7 * 24 * 60 * 60 * 1000;
    const dateB = new Date(b.submitted_at).getTime() + 7 * 24 * 60 * 60 * 1000;
    return approvedSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });
  const rejectedSubmissions = submissions.filter(s => s.status === "rejected" && s.social_accounts);
  const avgTier1 = submissions.length > 0 ? submissions.reduce((sum, s) => sum + s.tier1_percentage, 0) / submissions.length : 0;
  const stats = {
    totalUsers: totalUserCount,
    totalBalance: users.reduce((sum, u) => sum + (u.wallets?.balance || 0), 0),
    totalEarned: users.reduce((sum, u) => sum + (u.wallets?.total_earned || 0), 0)
  };

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  if (false && loading) {
    return <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground font-inter tracking-[-0.5px]">Loading users...</p>
      </div>;
  }
  return <div className="p-6 space-y-4">
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-muted/30 border-0 p-1 h-auto">
          <TabsTrigger value="users" className="text-sm font-inter tracking-[-0.5px] data-[state=active]:bg-card data-[state=active]:text-foreground px-4 py-2">
            Users ({stats.totalUsers})
          </TabsTrigger>
          <TabsTrigger value="demographics" className="text-sm font-inter tracking-[-0.5px] data-[state=active]:bg-card data-[state=active]:text-foreground px-4 py-2">
            Demographics ({pendingSubmissions.length} pending)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          
          {/* Filters Row */}
          <div className="space-y-3">
            {/* Search bar and actions */}
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username, name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-card/50 border-0 font-inter tracking-[-0.5px]"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddReferralDialogOpen(true)}
                className="h-10 gap-2 bg-card/50 font-inter tracking-[-0.5px]"
              >
                <UserPlus className="h-4 w-4" />
                Add Referral
              </Button>
            </div>
            {/* Main filter row */}
            <div className="flex gap-3 items-center flex-wrap">
              {/* Campaign filter */}
              <Popover open={campaignPopoverOpen} onOpenChange={setCampaignPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="h-9 px-3 bg-card/50 text-sm font-inter tracking-[-0.5px] gap-2">
                    {selectedCampaign === "all" ? "All Campaigns" : campaigns.find(c => c.id === selectedCampaign)?.title}
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 bg-popover z-50" align="start">
                  <Command>
                    <CommandInput placeholder="Search campaigns..." className="font-inter tracking-[-0.5px]" />
                    <CommandList>
                      <CommandEmpty className="font-inter tracking-[-0.5px]">No campaign found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => {
                            setSelectedCampaign("all");
                            setCampaignPopoverOpen(false);
                          }} className="font-inter tracking-[-0.5px]">
                          <Check className={cn("mr-2 h-4 w-4", selectedCampaign === "all" ? "opacity-100" : "opacity-0")} />
                          All Campaigns
                        </CommandItem>
                        {campaigns.map(campaign => <CommandItem key={campaign.id} value={campaign.title} onSelect={() => {
                            setSelectedCampaign(campaign.id);
                            setCampaignPopoverOpen(false);
                          }} className="font-inter tracking-[-0.5px]">
                          <Check className={cn("mr-2 h-4 w-4", selectedCampaign === campaign.id ? "opacity-100" : "opacity-0")} />
                          {campaign.title}
                        </CommandItem>)}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Signup timeframe */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className={cn(
                    "h-9 px-3 text-sm font-inter tracking-[-0.5px] gap-2",
                    signupTimeframe !== "all" ? "bg-primary/10 text-primary" : "bg-card/50"
                  )}>
                    {signupTimeframe === "all" ? "All Time" : 
                     signupTimeframe === "24h" ? "Last 24h" :
                     signupTimeframe === "7d" ? "Last 7 days" :
                     signupTimeframe === "30d" ? "Last 30 days" :
                     signupTimeframe === "90d" ? "Last 90 days" : "All Time"}
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1 bg-popover" align="start">
                  <div className="space-y-0.5">
                    {[
                      { value: "all", label: "All Time" },
                      { value: "24h", label: "Last 24 hours" },
                      { value: "7d", label: "Last 7 days" },
                      { value: "30d", label: "Last 30 days" },
                      { value: "90d", label: "Last 90 days" },
                    ].map(option => (
                      <Button
                        key={option.value}
                        variant={signupTimeframe === option.value ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-xs font-inter tracking-[-0.5px]"
                        onClick={() => setSignupTimeframe(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Toggle filters */}
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-3 text-xs font-inter tracking-[-0.5px] hover:bg-muted",
                    hasDiscord === true ? "bg-[#5865F2]/20 text-[#5865F2]" : 
                    hasDiscord === false ? "bg-muted/50 text-muted-foreground" : "bg-card/50"
                  )}
                  onClick={() => setHasDiscord(hasDiscord === true ? false : hasDiscord === false ? null : true)}
                >
                  Discord {hasDiscord === true ? "Yes" : hasDiscord === false ? "No" : ""}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-3 text-xs font-inter tracking-[-0.5px] hover:bg-muted",
                    hasPhone === true ? "bg-green-500/20 text-green-400" : 
                    hasPhone === false ? "bg-muted/50 text-muted-foreground" : "bg-card/50"
                  )}
                  onClick={() => setHasPhone(hasPhone === true ? false : hasPhone === false ? null : true)}
                >
                  Phone {hasPhone === true ? "Yes" : hasPhone === false ? "No" : ""}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-3 text-xs font-inter tracking-[-0.5px] hover:bg-muted",
                    hasSocialAccount === true ? "bg-blue-500/20 text-blue-400" : 
                    hasSocialAccount === false ? "bg-muted/50 text-muted-foreground" : "bg-card/50"
                  )}
                  onClick={() => setHasSocialAccount(hasSocialAccount === true ? false : hasSocialAccount === false ? null : true)}
                >
                  Social {hasSocialAccount === true ? "Yes" : hasSocialAccount === false ? "No" : ""}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-3 text-xs font-inter tracking-[-0.5px] hover:bg-muted",
                    hasApprovedDemographics === true ? "bg-emerald-500/20 text-emerald-400" : 
                    hasApprovedDemographics === false ? "bg-muted/50 text-muted-foreground" : "bg-card/50"
                  )}
                  onClick={() => setHasApprovedDemographics(hasApprovedDemographics === true ? false : hasApprovedDemographics === false ? null : true)}
                >
                  Demographics {hasApprovedDemographics === true ? "Yes" : hasApprovedDemographics === false ? "No" : ""}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-3 text-xs font-inter tracking-[-0.5px] hover:bg-muted",
                    hasBrandRole === true ? "bg-purple-500/20 text-purple-400" : 
                    hasBrandRole === false ? "bg-muted/50 text-muted-foreground" : "bg-card/50"
                  )}
                  onClick={() => setHasBrandRole(hasBrandRole === true ? false : hasBrandRole === false ? null : true)}
                >
                  Brand {hasBrandRole === true ? "Yes" : hasBrandRole === false ? "No" : ""}
                </Button>
              </div>

              {/* Expand/Collapse more filters */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-xs font-inter tracking-[-0.5px] bg-card/50 ml-auto gap-1.5 hover:bg-muted"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
              >
                {filtersExpanded ? "Less filters" : "More filters"}
                {filtersExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>

              {/* Sort button */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn(
                    "h-9 w-9",
                    sortField ? "bg-primary/10" : "bg-card/50"
                  )}>
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 bg-popover" align="end">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-2 font-inter tracking-[-0.5px]">Sort by</p>
                    <Button
                      variant={sortField === "balance" ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-xs font-inter tracking-[-0.5px]"
                      onClick={() => {
                        if (sortField === "balance") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("balance");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      Balance
                      {sortField === "balance" && (
                        sortOrder === "desc" ? <ArrowDown className="h-3 w-3 ml-auto" /> : <ArrowUp className="h-3 w-3 ml-auto" />
                      )}
                    </Button>
                    <Button
                      variant={sortField === "totalEarned" ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-xs font-inter tracking-[-0.5px]"
                      onClick={() => {
                        if (sortField === "totalEarned") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("totalEarned");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      Total Earned
                      {sortField === "totalEarned" && (
                        sortOrder === "desc" ? <ArrowDown className="h-3 w-3 ml-auto" /> : <ArrowUp className="h-3 w-3 ml-auto" />
                      )}
                    </Button>
                    {sortField && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs text-muted-foreground font-inter tracking-[-0.5px]"
                        onClick={() => {
                          setSortField(null);
                          setSortOrder("desc");
                        }}
                      >
                        Clear sort
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Expanded filters */}
            {filtersExpanded && (
              <div className="flex gap-3 items-center flex-wrap p-4 bg-card/30 rounded-lg">
                {/* Min earnings */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px] whitespace-nowrap">
                    Min Earned $
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minEarnings}
                    onChange={e => setMinEarnings(e.target.value)}
                    className="w-20 h-8 bg-card/50 border-0 text-sm font-inter tracking-[-0.5px]"
                  />
                </div>

                {/* Min balance */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px] whitespace-nowrap">
                    Min Balance $
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minBalance}
                    onChange={e => setMinBalance(e.target.value)}
                    className="w-20 h-8 bg-card/50 border-0 text-sm font-inter tracking-[-0.5px]"
                  />
                </div>

                {/* Clear all filters & apply to all users */}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs font-inter tracking-[-0.5px]"
                    onClick={applyFiltersAcrossAllUsers}
                    disabled={loading}
                  >
                    Apply to all users
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px]"
                    onClick={() => {
                      setSelectedCampaign("all");
                      setMinEarnings("");
                      setMinBalance("");
                      setHasDiscord(null);
                      setHasPhone(null);
                      setHasSocialAccount(null);
                      setHasApprovedDemographics(null);
                      setSignupTimeframe("all");
                      setSortField(null);
                    }}
                    disabled={loading}
                  >
                    Clear all filters
                  </Button>
                </div>
              </div>
            )}

            {/* Active filter count & results */}
            <div className="flex items-center justify-between text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              <span>
                {loading ? "Loading..." : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}`}
                {!loading && totalUserCount > 0 && <span className="text-muted-foreground/60 ml-1">of {totalUserCount} total</span>}
              </span>
              {(selectedCampaign !== "all" || minEarnings || minBalance || hasDiscord !== null || hasPhone !== null || hasSocialAccount !== null || hasApprovedDemographics !== null || signupTimeframe !== "all" || debouncedSearchQuery) && (
                <span className="text-primary">
                  Filters active
                </span>
              )}
            </div>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                <div className="col-span-3">User</div>
                <div className="col-span-4">Accounts</div>
                <div className="col-span-1 text-right">Balance</div>
                <div className="col-span-1 text-right">Earned</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>
              {[...Array(10)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 bg-card/50 rounded-lg items-center">
                  <div className="col-span-3 flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="col-span-4 flex gap-1.5">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <div className="col-span-3 flex justify-end gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                <div className="col-span-3">User</div>
                <div className="col-span-4">Accounts</div>
                <div className="col-span-1 text-right">Balance</div>
                <div className="col-span-1 text-right">Earned</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {/* User Rows */}
              {currentUsers.map(user => {
                const balance = user.wallets?.balance || 0;
                const totalEarned = user.wallets?.total_earned || 0;
                return (
                  <div 
                    key={user.id} 
                    onClick={() => openUserDetailsDialog(user)}
                    className="grid grid-cols-12 gap-4 px-4 py-3 bg-card/50 rounded-lg hover:bg-card/80 cursor-pointer transition-colors items-center"
                  >
                    <div className="col-span-3 flex items-center gap-3 min-w-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="h-8 w-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium font-inter tracking-[-0.5px]">
                            {(user.full_name || user.username || '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">{user.username}</p>
                        {user.full_name && <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate">{user.full_name}</p>}
                      </div>
                    </div>

                    <div className="col-span-4">
                      {user.social_accounts && user.social_accounts.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {user.social_accounts.slice(0, 3).map(account => {
                            const demographicStatus = account.demographic_submissions?.[0]?.status;
                            return (
                              <div 
                                key={account.id} 
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-muted/30 font-inter tracking-[-0.5px]"
                              >
                                {getPlatformIcon(account.platform)}
                                <span className="max-w-[80px] truncate">{account.username}</span>
                                {demographicStatus === 'approved' && <BadgeCheck className="h-3 w-3 text-emerald-500 shrink-0" />}
                                {demographicStatus === 'pending' && <Clock className="h-3 w-3 text-amber-500 shrink-0" />}
                                {demographicStatus === 'rejected' && <XCircle className="h-3 w-3 text-destructive shrink-0" />}
                                {!demographicStatus && <AlertCircle className="h-3 w-3 text-muted-foreground shrink-0" />}
                              </div>
                            );
                          })}
                          {user.social_accounts.length > 3 && (
                            <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">+{user.social_accounts.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 font-inter tracking-[-0.5px]">No accounts</span>
                      )}
                    </div>

                    <div className="col-span-1 text-right">
                      <span className="text-sm font-medium font-inter tracking-[-0.5px]">${balance.toFixed(2)}</span>
                    </div>

                    <div className="col-span-1 text-right">
                      <span className="text-sm font-medium font-inter tracking-[-0.5px] text-emerald-500">${totalEarned.toFixed(2)}</span>
                    </div>

                    <div className="col-span-3 flex gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation();
                          openAddToCampaignDialog(user);
                        }} 
                        className="h-7 px-2.5 text-xs font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground"
                      >
                        Add
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={e => {
                          e.stopPropagation();
                          openPayDialog(user);
                        }} 
                        className="h-7 px-2.5 text-xs font-inter tracking-[-0.5px] bg-emerald-600 hover:bg-emerald-700"
                      >
                        Pay
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {filteredUsers.length > usersPerPage && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-7 px-2 text-xs font-inter tracking-[-0.5px]"
                >
                  Prev
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="h-7 w-7 p-0 text-xs font-inter tracking-[-0.5px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 text-xs font-inter tracking-[-0.5px]"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

      {/* Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay User</DialogTitle>
            <DialogDescription>
              {selectedUser && `Send payment to @${selectedUser.username}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD) *</Label>
              <Input id="amount" type="number" step="0.01" min="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Add payment notes..." rows={3} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePayUser}>
                Send Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvImportDialogOpen} onOpenChange={setCsvImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Transactions from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with format: account_username ; payout amount ; date
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="csv-file">CSV File</Label>
                <Button variant="ghost" size="sm" onClick={downloadCsvTemplate} className="gap-2 h-8">
                  <FileDown className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
              <Input id="csv-file" type="file" accept=".csv" onChange={handleCsvFileChange} disabled={isImporting} />
              {csvFile && <p className="text-sm text-muted-foreground">
                  Selected: {csvFile.name}
                </p>}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">CSV Format:</p>
              <code className="text-xs block bg-background p-2 rounded">
                account_username;payout amount;date<br />
                tiktok_user123;150.00;2025-10-02<br />
                insta_creator;200.50;2025-10-01
              </code>
              <p className="text-xs text-muted-foreground">
                • Use semicolons (;) as separators<br />
                • <strong>Username must match their connected social account username</strong> (TikTok, Instagram, YouTube)<br />
                • Amount should be in USD (e.g., 150.00)<br />
                • Date is optional, defaults to today
              </p>
            </div>

            {importResults && <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-background">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Processed</p>
                      <p className="text-2xl font-bold">{importResults.processed}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-success/10">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Successful</p>
                      <p className="text-2xl font-bold text-success">{importResults.successful}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-destructive/10">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-2xl font-bold text-destructive">{importResults.failed}</p>
                    </CardContent>
                  </Card>
                </div>

                {importResults.errors && importResults.errors.length > 0 && <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Errors:</p>
                    <div className="bg-destructive/10 p-3 rounded-lg max-h-40 overflow-y-auto">
                      {importResults.errors.map((error: any, idx: number) => <p key={idx} className="text-xs text-destructive mb-1">
                          Row {error.row} ({error.username}): {error.error}
                        </p>)}
                    </div>
                  </div>}

                {importResults.details && importResults.details.length > 0 && <div className="space-y-2">
                    <p className="text-sm font-medium">Transaction Details:</p>
                    <div className="bg-muted/50 p-3 rounded-lg max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResults.details.map((detail: any, idx: number) => <TableRow key={idx}>
                              <TableCell className="font-medium">{detail.username}</TableCell>
                              <TableCell className="text-right">${detail.amount.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                {detail.status === 'success' ? <span className="text-success">✓ Success</span> : <span className="text-destructive">✗ Failed</span>}
                              </TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>
                    </div>
                  </div>}
              </div>}

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => {
                  setCsvImportDialogOpen(false);
                  setCsvFile(null);
                  setImportResults(null);
                }} disabled={isImporting}>
                Close
              </Button>
              <Button onClick={handleCsvImport} disabled={!csvFile || isImporting} className="gap-2">
                {isImporting ? <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Importing...
                  </> : <>
                    <Upload className="h-4 w-4" />
                    Import Transactions
                  </>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <UserDetailsDialog open={userDetailsDialogOpen} onOpenChange={setUserDetailsDialogOpen} user={selectedUser} socialAccounts={userSocialAccounts} transactions={userTransactions} paymentMethods={userPaymentMethods} loadingSocialAccounts={loadingSocialAccounts} loadingTransactions={loadingTransactions} loadingPaymentMethods={loadingPaymentMethods} socialAccountsOpen={socialAccountsOpen} onSocialAccountsOpenChange={setSocialAccountsOpen} transactionsOpen={transactionsOpen} onTransactionsOpenChange={setTransactionsOpen} paymentMethodsOpen={paymentMethodsOpen} onPaymentMethodsOpenChange={setPaymentMethodsOpen} onEditScore={openEditScoreFromSocialAccount} />
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          {/* Demographics Tabs */}
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="bg-muted/30 border-0 p-1 h-auto">
              <TabsTrigger value="pending" className="text-sm font-inter tracking-[-0.5px] data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500 px-4 py-2 gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Pending ({pendingSubmissions.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-sm font-inter tracking-[-0.5px] data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-500 px-4 py-2 gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approved ({approvedSubmissions.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-sm font-inter tracking-[-0.5px] data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive px-4 py-2 gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Rejected ({rejectedSubmissions.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending Submissions */}
            <TabsContent value="pending" className="space-y-4">
              {pendingSubmissions.length === 0 ? <div className="py-16 text-center text-muted-foreground font-inter tracking-[-0.5px]">
                  No pending submissions
                </div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {pendingSubmissions.map(submission => {
                    const account = submission.social_accounts;
                    const followerCount = account.follower_count || 0;
                    const hasAvatar = !!account.avatar_url;
                    
                    return (
                      <div 
                        key={submission.id} 
                        className="group bg-card/50 hover:bg-card rounded-xl p-4 transition-all cursor-pointer"
                        onClick={() => openReviewDialog(submission)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {hasAvatar ? (
                              <img 
                                src={account.avatar_url!} 
                                alt={account.username}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-lg font-semibold text-muted-foreground">
                                  {account.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
                              {getPlatformIcon(account.platform)}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm font-inter tracking-[-0.5px] truncate">
                              @{account.username}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                                {followerCount > 0 ? `${followerCount.toLocaleString()} followers` : 'No follower data'}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 font-inter tracking-[-0.5px]">
                              {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>

                          {/* Review Button */}
                          <Button 
                            size="sm" 
                            className="h-8 text-xs font-inter tracking-[-0.5px] opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => {
                              e.stopPropagation();
                              openReviewDialog(submission);
                            }}
                          >
                            Review
                          </Button>
                        </div>

                        {/* Bio preview */}
                        {account.bio && (
                          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 font-inter tracking-[-0.5px]">
                            {account.bio}
                          </p>
                        )}

                        {/* Tier 1 percentage badge */}
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] font-inter tracking-[-0.5px]">
                            Tier 1: {submission.tier1_percentage}%
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-inter tracking-[-0.5px] text-amber-500 border-amber-500/30">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>}
            </TabsContent>

            {/* Approved Submissions */}
            <TabsContent value="approved" className="space-y-4">
              {approvedSubmissions.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground font-inter tracking-[-0.5px]">
                  No approved submissions
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setApprovedSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="gap-2 text-xs font-inter tracking-[-0.5px]"
                    >
                      {approvedSortOrder === 'asc' ? (
                        <>
                          <ArrowUp className="h-3.5 w-3.5" />
                          Soonest First
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-3.5 w-3.5" />
                          Latest First
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {approvedSubmissions.map(submission => {
                      const account = submission.social_accounts;
                      const hasAvatar = !!account.avatar_url;
                      const followerCount = account.follower_count || 0;
                      const reviewedDate = submission.reviewed_at ? new Date(submission.reviewed_at) : new Date(submission.submitted_at);
                      const nextSubmissionDate = new Date(reviewedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                      const daysUntilNext = Math.ceil((nextSubmissionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysUntilNext < 0;
                      const isDueSoon = daysUntilNext <= 7 && daysUntilNext >= 0;
                      
                      return (
                        <div 
                          key={submission.id} 
                          className="group bg-card/50 hover:bg-card rounded-xl p-4 transition-all"
                        >
                          {/* Header with avatar and account info */}
                          <a 
                            href={account.account_link || `https://${account.platform}.com/@${account.username}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-start gap-3 hover:opacity-80 transition-opacity"
                          >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              {hasAvatar ? (
                                <img 
                                  src={account.avatar_url!} 
                                  alt={account.username}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-lg font-semibold text-muted-foreground">
                                    {account.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
                                {getPlatformIcon(account.platform)}
                              </div>
                            </div>

                            {/* Account Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm font-inter tracking-[-0.5px] truncate group-hover:underline">
                                @{account.username}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                                  {followerCount > 0 ? `${followerCount.toLocaleString()} followers` : 'No data'}
                                </span>
                              </div>
                            </div>
                          </a>

                          {/* Score Display */}
                          <div 
                            className="mt-4 bg-emerald-500/10 rounded-lg p-3 cursor-pointer hover:bg-emerald-500/15 transition-colors"
                            onClick={() => openEditScoreDialog(submission)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Demographics Score</p>
                                <p className="text-2xl font-bold font-inter tracking-[-0.5px] text-emerald-500">{submission.score}</p>
                              </div>
                              <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 text-[10px] font-inter tracking-[-0.5px]">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-inter tracking-[-0.5px]">
                            <div className="bg-muted/30 rounded-lg p-2">
                              <p className="text-muted-foreground text-[10px]">Reviewed</p>
                              <p className="font-medium">
                                {reviewedDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className={`rounded-lg p-2 ${isOverdue ? 'bg-destructive/10' : isDueSoon ? 'bg-amber-500/10' : 'bg-muted/30'}`}>
                              <p className="text-muted-foreground text-[10px]">Next Update</p>
                              <p className={`font-medium ${isOverdue ? 'text-destructive' : isDueSoon ? 'text-amber-500' : ''}`}>
                                {isOverdue ? 'Overdue' : daysUntilNext === 0 ? 'Today' : `${daysUntilNext}d`}
                              </p>
                            </div>
                          </div>

                          {/* Bio Preview */}
                          {account.bio && (
                            <p className="text-[11px] text-muted-foreground mt-3 line-clamp-2 font-inter tracking-[-0.5px]">
                              {account.bio}
                            </p>
                          )}

                          {/* Admin Notes */}
                          {submission.admin_notes && (
                            <p className="text-[11px] text-muted-foreground/70 mt-2 line-clamp-1 italic font-inter tracking-[-0.5px]">
                              Note: {submission.admin_notes}
                            </p>
                          )}
                          
                          {/* Actions */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-3 text-xs font-inter tracking-[-0.5px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={async () => {
                              if (!confirm(`Require new demographic submission for @${submission.social_accounts.username}? This will:\n\n• Reset their demographics score to 0\n• Archive current submission as 'rejected'\n• Require them to submit new demographics\n\nContinue?`)) return;
                              
                              try {
                                const { error: updateError } = await supabase
                                  .from('demographic_submissions')
                                  .update({ 
                                    status: 'rejected',
                                    admin_notes: 'Submission reset - new demographics required',
                                    reviewed_at: new Date().toISOString(),
                                    reviewed_by: (await supabase.auth.getUser()).data.user?.id
                                  })
                                  .eq('id', submission.id);

                                if (updateError) throw updateError;

                                const { error: profileError } = await supabase
                                  .from('profiles')
                                  .update({ demographics_score: 0 })
                                  .eq('id', submission.social_accounts.user_id);

                                if (profileError) throw profileError;

                                toast({
                                  title: "Success",
                                  description: "Demographics reset successfully"
                                });
                                fetchSubmissions();
                              } catch (error: any) {
                                console.error('Error resetting demographics:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to reset demographics",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Require New Submission
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Rejected Submissions */}
            <TabsContent value="rejected" className="space-y-4">
              {rejectedSubmissions.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground font-inter tracking-[-0.5px]">
                  No rejected submissions
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {rejectedSubmissions.map(submission => {
                    const account = submission.social_accounts;
                    const hasAvatar = !!account.avatar_url;
                    const followerCount = account.follower_count || 0;
                    
                    return (
                      <div 
                        key={submission.id} 
                        className="group bg-card/50 hover:bg-card rounded-xl p-4 transition-all opacity-75 hover:opacity-100"
                      >
                        {/* Header with avatar and account info */}
                        <a 
                          href={account.account_link || `https://${account.platform}.com/@${account.username}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-start gap-3 hover:opacity-80 transition-opacity"
                        >
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {hasAvatar ? (
                              <img 
                                src={account.avatar_url!} 
                                alt={account.username}
                                className="w-12 h-12 rounded-full object-cover grayscale"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-lg font-semibold text-muted-foreground">
                                  {account.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
                              {getPlatformIcon(account.platform)}
                            </div>
                          </div>

                          {/* Account Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm font-inter tracking-[-0.5px] truncate group-hover:underline">
                              @{account.username}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                                {followerCount > 0 ? `${followerCount.toLocaleString()} followers` : 'No data'}
                              </span>
                            </div>
                          </div>
                        </a>

                        {/* Rejected Status */}
                        <div className="mt-4 bg-destructive/10 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Status</p>
                              <p className="text-sm font-medium font-inter tracking-[-0.5px] text-destructive">Rejected</p>
                            </div>
                            <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 text-[10px] font-inter tracking-[-0.5px]">
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </Badge>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-inter tracking-[-0.5px]">
                          <div className="bg-muted/30 rounded-lg p-2">
                            <p className="text-muted-foreground text-[10px]">Submitted</p>
                            <p className="font-medium">
                              {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2">
                            <p className="text-muted-foreground text-[10px]">Tier 1</p>
                            <p className="font-medium">{submission.tier1_percentage}%</p>
                          </div>
                        </div>

                        {/* Admin Notes */}
                        {submission.admin_notes && (
                          <p className="text-[11px] text-muted-foreground/70 mt-3 line-clamp-2 italic font-inter tracking-[-0.5px]">
                            Reason: {submission.admin_notes}
                          </p>
                        )}

                        {/* View Submission Button */}
                        {submission.screenshot_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-3 text-xs font-inter tracking-[-0.5px]"
                            onClick={() => openReviewDialog(submission)}
                          >
                            View Submission
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Review Dialog */}
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="max-w-md bg-card border-0">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-inter tracking-[-0.5px]">Review Demographic Submission</DialogTitle>
              </DialogHeader>

              {selectedSubmission && (
                <div className="space-y-4">
                  {/* Account Info in Dialog */}
                  <a 
                    href={selectedSubmission.social_accounts.account_link || `https://${selectedSubmission.social_accounts.platform}.com/@${selectedSubmission.social_accounts.username}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors group"
                  >
                    {/* Avatar in dialog */}
                    <div className="relative flex-shrink-0">
                      {selectedSubmission.social_accounts.avatar_url ? (
                        <img 
                          src={selectedSubmission.social_accounts.avatar_url} 
                          alt={selectedSubmission.social_accounts.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-base font-semibold text-muted-foreground">
                            {selectedSubmission.social_accounts.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background flex items-center justify-center">
                        {getPlatformIcon(selectedSubmission.social_accounts.platform)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold group-hover:underline font-inter tracking-[-0.5px]">@{selectedSubmission.social_accounts.username}</p>
                      {selectedSubmission.social_accounts.follower_count && (
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                          {selectedSubmission.social_accounts.follower_count.toLocaleString()} followers
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-inter tracking-[-0.5px]">
                      Tier 1: {selectedSubmission.tier1_percentage}%
                    </Badge>
                  </a>

                  {selectedSubmission.screenshot_url && (
                    <div>
                      <Label className="text-xs mb-2 block font-inter tracking-[-0.5px]">Demographics Video</Label>
                      <div className="rounded-lg overflow-hidden border bg-black flex items-center justify-center">
                        <video 
                          src={selectedSubmission.screenshot_url} 
                          controls 
                          className="w-full max-h-[60vh] object-contain"
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="score" className="text-xs font-inter tracking-[-0.5px]">Score (0-100)</Label>
                    <Input id="score" type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} placeholder="Enter score" className="h-9 text-sm font-inter tracking-[-0.5px]" />
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button variant="destructive" size="sm" onClick={() => handleReview("rejected")} disabled={updating} className="flex-1 font-inter tracking-[-0.5px]">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleReview("approved")} disabled={updating} size="sm" className="flex-1 font-inter tracking-[-0.5px]">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {updating ? "Accepting..." : "Accept"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Edit Score Dialog */}
      <Dialog open={editScoreDialogOpen} onOpenChange={setEditScoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Demographics Score</DialogTitle>
            <DialogDescription>
              Update the demographics score for @{editingSubmission?.social_accounts.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-score">Score (0-100)</Label>
              <Input id="edit-score" type="number" min="0" max="100" value={editScore} onChange={e => setEditScore(e.target.value)} placeholder="Enter score" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditScoreDialogOpen(false)} disabled={updating} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateScore} disabled={updating} className="flex-1">
                {updating ? "Updating..." : "Update Score"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Campaign Dialog */}
      <Dialog open={addToCampaignDialogOpen} onOpenChange={setAddToCampaignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User to Campaign</DialogTitle>
            <DialogDescription>
              Assign {selectedUser?.username} to a campaign with one of their social accounts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Campaign</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedCampaignForAdd
                      ? campaigns.find(c => c.id === selectedCampaignForAdd)?.title
                      : "Select campaign..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search campaigns..." />
                    <CommandList>
                      <CommandEmpty>No campaign found.</CommandEmpty>
                      <CommandGroup>
                        {campaigns.map(campaign => (
                          <CommandItem
                            key={campaign.id}
                            value={campaign.title}
                            onSelect={() => setSelectedCampaignForAdd(campaign.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCampaignForAdd === campaign.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {campaign.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Select Social Account</Label>
              {loadingSocialAccounts ? (
                <div className="text-sm text-muted-foreground">Loading accounts...</div>
              ) : userSocialAccounts.length === 0 ? (
                <div className="text-sm text-muted-foreground">No social accounts found</div>
              ) : (
                <div className="space-y-2">
                  {userSocialAccounts.map(account => (
                    <Button
                      key={account.id}
                      variant={selectedSocialAccountForAdd === account.id ? "default" : "outline"}
                      className="w-full justify-start gap-2"
                      onClick={() => setSelectedSocialAccountForAdd(account.id)}
                    >
                      {getPlatformIcon(account.platform)}
                      <span>{account.username}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {typeof account.follower_count === "number" && account.follower_count > 0
                          ? `${account.follower_count.toLocaleString()} followers`
                          : "No follower data"}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAddToCampaignDialogOpen(false)}
                disabled={addingToCampaign}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToCampaign}
                disabled={addingToCampaign || !selectedCampaignForAdd || !selectedSocialAccountForAdd}
                className="flex-1"
              >
                {addingToCampaign ? "Adding..." : "Add to Campaign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Referral Dialog */}
      <AddReferralDialog
        open={addReferralDialogOpen}
        onOpenChange={setAddReferralDialogOpen}
        onSuccess={() => fetchData()}
      />
    </div>;
}