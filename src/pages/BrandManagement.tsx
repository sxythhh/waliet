import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { CampaignAnalyticsTable } from "@/components/CampaignAnalyticsTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Check, X, TrendingUp, Users, Eye, DollarSign, Trash2, Edit, RefreshCw, Menu, PanelLeft, Download, Diamond, ArrowUpDown, ArrowUp, ArrowDown, Hammer, Search } from "lucide-react";
import { PieChart, Pie, Cell, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { ManageTrainingDialog } from "@/components/ManageTrainingDialog";
import { ImportCampaignStatsDialog } from "@/components/ImportCampaignStatsDialog";
import { MatchAccountsDialog } from "@/components/MatchAccountsDialog";
import { VideosTab } from "@/components/brand/VideosTab";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { VideoHistoryDialog } from "@/components/VideoHistoryDialog";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import { Skeleton } from "@/components/ui/skeleton";
  const getTrustScoreDiamonds = (score: number) => {
  if (score < 20) {
    return {
      count: 1,
      color: 'fill-red-500 text-red-500'
    };
  } else if (score < 40) {
    return {
      count: 2,
      color: 'fill-red-500 text-red-500'
    };
  } else if (score < 60) {
    return {
      count: 3,
      color: 'fill-yellow-500 text-yellow-500'
    };
  } else if (score < 80) {
    return {
      count: 4,
      color: 'fill-yellow-500 text-yellow-500'
    };
  } else if (score < 100) {
    return {
      count: 4,
      color: 'fill-emerald-500 text-emerald-500'
    };
  } else {
    return {
      count: 5,
      color: 'fill-emerald-500 text-emerald-500'
    };
  }
};

const getPlatformIcon = (platform: string) => {
  const platformLower = platform.toLowerCase();
  if (platformLower === 'tiktok') return tiktokLogo;
  if (platformLower === 'instagram') return instagramLogo;
  if (platformLower === 'youtube') return youtubeLogo;
  return null;
};
interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  preview_url: string | null;
  analytics_url: string | null;
  guidelines: string | null;
  allowed_platforms: string[];
  application_questions: any[];
  slug?: string;
  embed_url?: string | null;
  is_private?: boolean;
  access_code?: string | null;
  requires_application?: boolean;
  is_infinite_budget?: boolean;
  is_featured?: boolean;
}
interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number;
  account_link: string | null;
}
interface Submission {
  id: string;
  status: string;
  views: number;
  earnings: number;
  submitted_at: string;
  reviewed_at: string | null;
  creator_id: string;
  platform: string;
  content_url: string;
  application_answers?: any; // JSON field from database
  profiles: {
    username: string;
    avatar_url: string | null;
    trust_score: number;
    demographics_score: number;
    views_score: number;
    social_accounts: SocialAccount[];
  };
}
export default function BrandManagement() {
  const { campaignSlug } = useParams();
  const navigate = useNavigate();
  const {
    isAdmin,
    loading: adminLoading
  } = useAdminCheck();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Array<{ id: string; title: string; slug: string }>>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [currentBrandName, setCurrentBrandName] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [campaignTransactions, setCampaignTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandId, setBrandId] = useState<string>("");
  const [brandType, setBrandType] = useState<string>("");
  const [assetsUrl, setAssetsUrl] = useState("");
  const [homeUrl, setHomeUrl] = useState("");
  const [accountUrl, setAccountUrl] = useState("");
  const [shortimizeApiKey, setShortimizeApiKey] = useState("");
  const [brandCollectionId, setBrandCollectionId] = useState("");
  const [brandCollectionName, setBrandCollectionName] = useState("");
  const [savingUrls, setSavingUrls] = useState(false);
  const [editBudgetDialogOpen, setEditBudgetDialogOpen] = useState(false);
  const [editingBudgetUsed, setEditingBudgetUsed] = useState("");
  const [currentBudgetUsed, setCurrentBudgetUsed] = useState<number>(0);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [deleteAnalyticsDialogOpen, setDeleteAnalyticsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedUserForPayment, setSelectedUserForPayment] = useState<Submission | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [processingSubmissionId, setProcessingSubmissionId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [accountSortOrder, setAccountSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [userToKick, setUserToKick] = useState<Submission | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [manageCampaignOpen, setManageCampaignOpen] = useState(false);
  const [shortimizeAccounts, setShortimizeAccounts] = useState<any[]>([]);
  const [loadingShortimize, setLoadingShortimize] = useState(false);
  const [campaignUsers, setCampaignUsers] = useState<any[]>([]);
  const [loadingCampaignUsers, setLoadingCampaignUsers] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [accountsCollectionName, setAccountsCollectionName] = useState("");
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [lastVideosFetch, setLastVideosFetch] = useState<Date | null>(null);
  const [lastAccountsFetch, setLastAccountsFetch] = useState<Date | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [videoHistoryOpen, setVideoHistoryOpen] = useState(false);
  const [videoHistory, setVideoHistory] = useState<any[] | null>(null);
  const [loadingVideoHistory, setLoadingVideoHistory] = useState(false);
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  // Cache management constants
  const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
  const ACCOUNTS_CACHE_KEY = `shortimize_accounts_${brandId}`;
  const VIDEOS_CACHE_KEY = `shortimize_videos_${brandId}`;

  // Helper to check if cache is still valid
  const isCacheValid = (timestamp: string | null) => {
    if (!timestamp) return false;
    const cacheTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - cacheTime) < CACHE_DURATION_MS;
  };

  // Load cached data on mount
  useEffect(() => {
    if (brandId) {
      // Load cached videos
      const cachedVideos = localStorage.getItem(VIDEOS_CACHE_KEY);
      if (cachedVideos) {
        try {
          const { data, timestamp, collection } = JSON.parse(cachedVideos);
          if (isCacheValid(timestamp)) {
            setVideos(data);
            setCollectionName(collection);
            setLastVideosFetch(new Date(timestamp));
          }
        } catch (e) {
          console.error('Error loading cached videos:', e);
        }
      }

      // Load cached accounts
      const cachedAccounts = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      if (cachedAccounts) {
        try {
          const { data, timestamp, collection } = JSON.parse(cachedAccounts);
          if (isCacheValid(timestamp)) {
            setShortimizeAccounts(data);
            setAccountsCollectionName(collection);
            setLastAccountsFetch(new Date(timestamp));
          }
        } catch (e) {
          console.error('Error loading cached accounts:', e);
        }
      }
    }
  }, [brandId]);
  const fetchShortimizeAccounts = async (forceRefresh = false) => {
    if (!brandId) {
      toast.error("Brand not loaded");
      return;
    }

    if (!accountsCollectionName?.trim()) {
      toast.error("Please enter a collection name");
      return;
    }

    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cachedAccounts = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      if (cachedAccounts) {
        try {
          const { data, timestamp, collection } = JSON.parse(cachedAccounts);
          if (collection === accountsCollectionName && isCacheValid(timestamp)) {
            setShortimizeAccounts(data);
            setLastAccountsFetch(new Date(timestamp));
            toast.info('Loaded accounts from cache');
            return;
          }
        } catch (e) {
          console.error('Error loading cached accounts:', e);
        }
      }
    }

    setLoadingShortimize(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-shortimize-accounts', {
        body: { brandId, collectionName: accountsCollectionName }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || 'Failed to call edge function');
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Failed to fetch accounts');
      }

      const accountsData = Array.isArray(data) ? data : [];
      
      // If we have a selected campaign, match accounts with campaign participants
      if (selectedCampaignId && accountsData.length > 0) {
        // Fetch social accounts connected to this campaign
        const { data: socialAccounts, error: socialError } = await supabase
          .from('social_account_campaigns')
          .select(`
            social_accounts!inner (
              id,
              username,
              platform,
              user_id,
              profiles!inner (
                id,
                username,
                avatar_url
              )
            )
          `)
          .eq('campaign_id', selectedCampaignId)
          .eq('status', 'active');

        if (socialError) {
          console.error('Error fetching social accounts:', socialError);
        }

        // Create a map for matching
        const socialAccountMap = new Map();
        socialAccounts?.forEach((item: any) => {
          const sa = item.social_accounts;
          const key = `${sa.username.toLowerCase()}_${sa.platform.toLowerCase()}`;
          socialAccountMap.set(key, sa.profiles);
        });

        // Match Shortimize accounts with social accounts
        const matchedAccounts = accountsData.map(account => {
          const key = `${account.username.toLowerCase()}_${account.platform.toLowerCase()}`;
          const matchedProfile = socialAccountMap.get(key);
          return {
            ...account,
            matched_user: matchedProfile || null
          };
        });

        setShortimizeAccounts(matchedAccounts);
        
        // Cache the matched data
        const timestamp = new Date().toISOString();
        setLastAccountsFetch(new Date(timestamp));
        localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify({
          data: matchedAccounts,
          timestamp,
          collection: accountsCollectionName
        }));
      } else {
        setShortimizeAccounts(accountsData);
        
        // Cache the data
        const timestamp = new Date().toISOString();
        setLastAccountsFetch(new Date(timestamp));
        localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify({
          data: accountsData,
          timestamp,
          collection: accountsCollectionName
        }));
      }
      
      toast.success(`Loaded ${accountsData.length} accounts`);
    } catch (error: any) {
      console.error('Error fetching Shortimize accounts:', error);
      toast.error(error.message || 'Failed to load accounts');
    } finally {
      setLoadingShortimize(false);
    }
  };

  const fetchCampaignUsers = async () => {
    if (!selectedCampaignId) {
      toast.error("No campaign selected");
      return;
    }
    setLoadingCampaignUsers(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-campaign-users?campaign_id=${selectedCampaignId}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaign users');
      }
      
      const result = await response.json();
      setCampaignUsers(result.users || []);
      toast.success(`Loaded ${result.users?.length || 0} users`);
    } catch (error: any) {
      console.error('Error fetching campaign users:', error);
      toast.error(error.message || 'Failed to load users');
    } finally {
      setLoadingCampaignUsers(false);
    }
  };

  const exportCampaignUsers = () => {
    if (campaignUsers.length === 0) {
      toast.error('No users to export');
      return;
    }
    
    const headers = ['Username', 'Email', 'Full Name', 'Phone', 'Status', 'Joined At', 'Platform', 'Social Username', 'Account URL', 'Follower Count', 'Campaign Earnings'];
    const rows: string[][] = [];
    
    campaignUsers.forEach(user => {
      const socialAccounts = user.social_accounts || [];
      
      if (socialAccounts.length === 0) {
        // User has no linked accounts - still export their profile info
        rows.push([
          user.profile?.username || '',
          user.profile?.email || '',
          user.profile?.full_name || '',
          user.profile?.phone_number || '',
          user.status || '',
          user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '',
          '',
          '',
          '',
          '',
          user.campaign_earnings || '0'
        ]);
      } else {
        // Create a row for each linked account
        socialAccounts.forEach((account: any) => {
          rows.push([
            user.profile?.username || '',
            user.profile?.email || '',
            user.profile?.full_name || '',
            user.profile?.phone_number || '',
            user.status || '',
            user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '',
            account.platform || '',
            account.username || '',
            account.account_link || '',
            account.follower_count || '',
            user.campaign_earnings || '0'
          ]);
        });
      }
    });
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-users-${selectedCampaignId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported users to CSV');
  };

  const fetchVideos = async (collection: string, forceRefresh = false) => {
    if (!brandId || !collection.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cachedVideos = localStorage.getItem(VIDEOS_CACHE_KEY);
      if (cachedVideos) {
        try {
          const { data, timestamp, collection: cachedCollection } = JSON.parse(cachedVideos);
          if (cachedCollection === collection && isCacheValid(timestamp)) {
            setVideos(data);
            setLastVideosFetch(new Date(timestamp));
            toast.info('Loaded videos from cache');
            return;
          }
        } catch (e) {
          console.error('Error loading cached videos:', e);
        }
      }
    }

    setLoadingVideos(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-shortimize-videos', {
        body: { brandId, collectionName: collection }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || 'Failed to call edge function');
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        setVideos([]);
        toast.info('No videos found for this collection');
        return;
      }

      const videosData = Array.isArray(data) ? data : [];
      setVideos(videosData);
      
      // Cache the data
      const timestamp = new Date().toISOString();
      setLastVideosFetch(new Date(timestamp));
      localStorage.setItem(VIDEOS_CACHE_KEY, JSON.stringify({
        data: videosData,
        timestamp,
        collection
      }));

      toast.success(`Loaded ${videosData.length} videos`);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      toast.error(error.message || 'Failed to load videos');
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchVideoHistory = async (video: any) => {
    if (!brandId || !video.ad_id) {
      toast.error('Unable to fetch video history');
      return;
    }

    setSelectedVideo(video);
    setVideoHistoryOpen(true);
    setLoadingVideoHistory(true);
    setVideoHistory(null);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-video-history', {
        body: { 
          brandId, 
          adId: video.ad_id,
          // Optional: Add date range if needed
          // startDate: '2024-01-01',
          // endDate: '2024-12-31'
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || 'Failed to call edge function');
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Failed to fetch video history');
      }

      setVideoHistory(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching video history:', error);
      toast.error(error.message || 'Failed to load video history');
    } finally {
      setLoadingVideoHistory(false);
    }
  };

  const exportToCSV = () => {
    const csvData = approvedSubmissions.map(submission => {
      const linkedAccounts = submission.profiles?.social_accounts?.map(acc => `${acc.platform}:@${acc.username}`).join('; ') || 'None';
      const accountUrls = submission.profiles?.social_accounts?.map(acc => acc.account_link || '').filter(url => url).join('; ') || 'None';
      const demographicStatus = submission.profiles?.social_accounts?.map(acc => `${acc.platform}:${submission.profiles.demographics_score || 0}`).join('; ') || 'None';
      return {
        'Virality Username': submission.profiles?.username || 'Unknown',
        'Linked Accounts': linkedAccounts,
        'Demographic Status': demographicStatus,
        'Account URLs': accountUrls
      };
    });
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [headers.join(','), ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `active-creators-${selectedCampaign?.title || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };
  const fetchCampaignTransactions = async () => {
    if (!selectedCampaignId) return;
    
    setLoadingTransactions(true);
    try {
      // First fetch transactions
      const { data: transactions, error: txError } = await supabase
        .from("wallet_transactions")
        .select('*')
        .contains('metadata', { campaign_id: selectedCampaignId })
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      if (!transactions || transactions.length === 0) {
        setCampaignTransactions([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(transactions.map(t => t.user_id).filter(Boolean))];

      // Fetch profiles for those users
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profileError) throw profileError;

      // Fetch analytics to get Shortimize account info
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("campaign_account_analytics")
        .select('user_id, account_username, platform')
        .eq('campaign_id', selectedCampaignId)
        .in('user_id', userIds);

      if (analyticsError) console.error('Error fetching analytics:', analyticsError);

      // Map profiles and analytics to transactions
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const analyticsMap = new Map(analyticsData?.map(a => [a.user_id, a]) || []);
      
      const enrichedTransactions = transactions.map(tx => ({
        ...tx,
        profiles: profileMap.get(tx.user_id) || null,
        shortimize_account: analyticsMap.get(tx.user_id) || null
      }));

      setCampaignTransactions(enrichedTransactions);
    } catch (error) {
      console.error("Error fetching campaign transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchAllCampaigns();
  }, []);

  useEffect(() => {
    fetchCampaign();
  }, [campaignSlug]);

  useEffect(() => {
    if (selectedCampaignId) {
      fetchCampaignTransactions();
    }
  }, [selectedCampaignId]);
  useEffect(() => {
    if (selectedCampaignId) {
      fetchSubmissions(selectedCampaignId);
      fetchAnalytics(selectedCampaignId);
      fetchTransactions(selectedCampaignId);

      // Set up real-time subscription for campaign submissions and social account connections
      const submissionsChannel = supabase.channel('campaign-submissions-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_submissions',
        filter: `campaign_id=eq.${selectedCampaignId}`
      }, payload => {
        console.log('Submission changed:', payload);
        fetchSubmissions(selectedCampaignId);
      }).subscribe();
      const accountConnectionsChannel = supabase.channel('social-account-campaigns-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'social_account_campaigns',
        filter: `campaign_id=eq.${selectedCampaignId}`
      }, payload => {
        console.log('Social account connection changed:', payload);
        fetchSubmissions(selectedCampaignId);
      }).subscribe();
      return () => {
        supabase.removeChannel(submissionsChannel);
        supabase.removeChannel(accountConnectionsChannel);
      };
    }
  }, [selectedCampaignId]);
  const fetchAnalytics = async (campaignId?: string) => {
    const targetCampaignId = campaignId || selectedCampaignId;
    if (!targetCampaignId) return;
    try {
      const {
        data,
        error
      } = await supabase.from("campaign_account_analytics").select("*").eq("campaign_id", targetCampaignId).order("total_views", {
        ascending: false
      });
      if (error) throw error;
      setAnalytics(data || []);

      // Refresh campaign data to get updated budget_used
      fetchCampaign();
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };
  const fetchTransactions = async (campaignId?: string) => {
    const targetCampaignId = campaignId || selectedCampaignId;
    if (!targetCampaignId) return;
    try {
      // Fetch all earning and balance_correction transactions
      const {
        data,
        error
      } = await supabase.from("wallet_transactions").select("*").in('type', ['earning', 'balance_correction']).order('created_at', {
        ascending: false
      });
      if (error) throw error;

      console.log('Selected campaign ID:', targetCampaignId);

      // Filter by campaign_id in metadata (handle both formats)
      const campaignTransactions = data?.filter((txn: any) => {
        const metadata = txn.metadata || {};
        return metadata.campaign_id === targetCampaignId;
      }) || [];

      console.log('Campaign transactions after filter:', campaignTransactions.length);
      console.log('Balance corrections:', campaignTransactions.filter(t => t.type === 'balance_correction').length);

      // Fetch user profiles separately
      if (campaignTransactions.length > 0) {
        const userIds = [...new Set(campaignTransactions.map((t: any) => t.user_id).filter(Boolean))];
        
        let profiles = [];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds);
          profiles = profilesData || [];
        }
        
        const transactionsWithProfiles = campaignTransactions.map((txn: any) => ({
          ...txn,
          profiles: profiles?.find((p: any) => p.id === txn.user_id)
        }));
        setTransactions(transactionsWithProfiles);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };
  const fetchAllCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, slug")
        .order("title");

      if (error) throw error;
      setAllCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching all campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaign = async () => {
    if (!campaignSlug) return;
    
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select(`
          id, 
          title, 
          description, 
          budget, 
          budget_used, 
          rpm_rate, 
          status, 
          banner_url, 
          preview_url, 
          analytics_url, 
          guidelines, 
          allowed_platforms, 
          application_questions, 
          slug, 
          embed_url, 
          is_private, 
          access_code, 
          requires_application, 
          is_infinite_budget, 
          is_featured,
          brand_id,
          brands!campaigns_brand_id_fkey (
            id,
            name,
            assets_url, 
            home_url, 
            account_url, 
            brand_type, 
            shortimize_api_key,
            collection_id,
            collection_name
          )
        `)
        .eq("slug", campaignSlug)
        .maybeSingle();

      if (campaignError) throw campaignError;
      if (!campaignData) return;

      const brandData = campaignData.brands;
      setBrandId(brandData.id);
      setCurrentBrandName(brandData.name);
      setAssetsUrl(brandData.assets_url || "");
      setHomeUrl(brandData.home_url || "");
      setAccountUrl(brandData.account_url || "");
      setBrandType(brandData.brand_type || "");
      setShortimizeApiKey(brandData.shortimize_api_key || "");
      setBrandCollectionId(brandData.collection_id || "");
      setBrandCollectionName(brandData.collection_name || "");

      setCampaigns([{
        ...campaignData,
        application_questions: Array.isArray(campaignData.application_questions) ? campaignData.application_questions : []
      }]);
      setSelectedCampaignId(campaignData.id);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };
  const fetchSubmissions = async (campaignId?: string) => {
    const targetCampaignId = campaignId || selectedCampaignId;
    if (!targetCampaignId) return;
    try {
      const {
        data,
        error
      } = await supabase.from("campaign_submissions").select(`
          id,
          status,
          views,
          earnings,
          submitted_at,
          reviewed_at,
          creator_id,
          platform,
          content_url,
          application_answers,
          profiles!campaign_submissions_creator_id_fkey (
            username, 
            avatar_url, 
            trust_score, 
            demographics_score, 
            views_score
          )
        `).eq("campaign_id", targetCampaignId).order("submitted_at", {
        ascending: false
      });
      if (error) throw error;

      // Filter out pending applications from users who already have approved submissions
      const approvedCreatorIds = new Set((data || []).filter(s => s.status === 'approved').map(s => s.creator_id));
      const filteredData = (data || []).filter(submission => {
        // Keep approved submissions
        if (submission.status === 'approved') return true;
        // Keep pending submissions only if user doesn't have an approved one
        if (submission.status === 'pending') return !approvedCreatorIds.has(submission.creator_id);
        // Filter out rejected and withdrawn submissions
        return false;
      });

      // Fetch social accounts via junction table
      const submissionsWithAccounts = await Promise.all(filteredData.map(async submission => {
        const {
          data: accountLinks
        } = await supabase.from("social_account_campaigns").select(`
            social_accounts!inner (
              id,
              platform,
              username,
              follower_count,
              account_link,
              user_id
            )
          `).eq("campaign_id", targetCampaignId).eq("status", "active").eq("social_accounts.user_id", submission.creator_id);
        const accounts = accountLinks?.map((link: any) => link.social_accounts).filter(Boolean) || [];
        return {
          ...submission,
          profiles: {
            ...submission.profiles,
            social_accounts: accounts
          }
        };
      }));
      setSubmissions(submissionsWithAccounts);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load submissions");
    }
  };
  const handleApplicationAction = async (submissionId: string, action: "approved" | "rejected") => {
    setProcessingSubmissionId(submissionId);
    try {
      const {
        error
      } = await supabase.from("campaign_submissions").update({
        status: action,
        reviewed_at: new Date().toISOString()
      }).eq("id", submissionId);
      if (error) throw error;

      // Send approval email if approved
      if (action === "approved") {
        try {
          await supabase.functions.invoke("send-application-approval", {
            body: {
              submissionId
            }
          });
          
          // Track user's accounts in Shortimize
          const submission = submissions.find(s => s.id === submissionId);
          if (submission && selectedCampaignId) {
            try {
              await supabase.functions.invoke("track-campaign-user", {
                body: {
                  campaignId: selectedCampaignId,
                  userId: submission.creator_id
                }
              });
              console.log("Account tracked in Shortimize");
            } catch (trackError) {
              console.error("Error tracking account in Shortimize:", trackError);
              // Don't fail the approval if tracking fails
            }
          }
        } catch (emailError) {
          console.error("Error sending approval email:", emailError);
          // Don't fail the whole operation if email fails
        }
      }
      toast.success(`Application ${action}`);
      fetchSubmissions();
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application");
    } finally {
      setProcessingSubmissionId(null);
    }
  };
  const handleDeleteCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      const {
        error
      } = await supabase.from("campaigns").delete().eq("id", selectedCampaignId);
      if (error) throw error;
      toast.success("Campaign deleted successfully");
      fetchCampaign();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };
  const handleSaveUrls = async () => {
    if (!brandId) return;
    setSavingUrls(true);
    try {
      const {
        error
      } = await supabase.from("brands").update({
        assets_url: assetsUrl || null,
        home_url: homeUrl || null,
        account_url: accountUrl || null,
        brand_type: brandType || null,
        shortimize_api_key: shortimizeApiKey || null,
        collection_id: brandCollectionId || null,
        collection_name: brandCollectionName || null
      }).eq("id", brandId);
      if (error) throw error;
      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSavingUrls(false);
    }
  };
  const handleEditBudgetUsed = async () => {
    if (!selectedCampaignId) return;
    setLoadingBudget(true);
    setEditBudgetDialogOpen(true);
    try {
      // Fetch fresh budget data from database to avoid stale data issues
      const { data: freshCampaign, error } = await supabase
        .from("campaigns")
        .select("budget_used")
        .eq("id", selectedCampaignId)
        .single();
      
      if (error) throw error;
      
      const freshBudgetUsed = freshCampaign?.budget_used || 0;
      setCurrentBudgetUsed(freshBudgetUsed);
      setEditingBudgetUsed(freshBudgetUsed.toString());
    } catch (error) {
      console.error("Error fetching budget:", error);
      toast.error("Failed to fetch current budget");
      setEditBudgetDialogOpen(false);
    } finally {
      setLoadingBudget(false);
    }
  };
  const handleSaveBudgetUsed = async () => {
    if (!selectedCampaignId) return;
    const budgetUsedValue = parseFloat(editingBudgetUsed);
    if (isNaN(budgetUsedValue) || budgetUsedValue < 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get current budget_used before update
      const {
        data: currentCampaign
      } = await supabase.from("campaigns").select("budget_used, title").eq("id", selectedCampaignId).single();
      const oldBudgetUsed = currentCampaign?.budget_used || 0;
      const budgetChange = budgetUsedValue - oldBudgetUsed;

      // Update campaign budget
      const {
        error
      } = await supabase.from("campaigns").update({
        budget_used: budgetUsedValue
      }).eq("id", selectedCampaignId);
      if (error) throw error;

      // Create a transaction record for this manual budget adjustment
      const {
        error: txnError
      } = await supabase.from("wallet_transactions").insert({
        user_id: session.user.id,
        // Admin who made the change
        amount: budgetChange,
        type: "balance_correction",
        status: "completed",
        description: `Manual budget adjustment for campaign: ${currentCampaign?.title || 'Unknown'}`,
        metadata: {
          campaign_id: selectedCampaignId,
          campaign_name: currentCampaign?.title,
          campaign_budget_before: oldBudgetUsed,
          campaign_budget_after: budgetUsedValue,
          adjustment_type: "manual_budget_update",
          admin_id: session.user.id
        }
      });
      if (txnError) {
        console.error("Transaction logging error:", txnError);
        // Don't fail the budget update if transaction logging fails
      }
      toast.success("Budget updated successfully");
      setEditBudgetDialogOpen(false);
      fetchCampaign();
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget");
    }
  };
  const handleDeleteAllAnalytics = async () => {
    if (!selectedCampaignId) return;
    try {
      const {
        error
      } = await supabase.from("campaign_account_analytics").delete().eq("campaign_id", selectedCampaignId);
      if (error) throw error;
      toast.success("All analytics deleted successfully");
      setDeleteAnalyticsDialogOpen(false);
    } catch (error) {
      console.error("Error deleting analytics:", error);
      toast.error("Failed to delete analytics");
    }
  };
  const handleRefresh = () => {
    fetchCampaign();
    fetchSubmissions();
    fetchAnalytics();
    fetchTransactions();
    toast.success("Data refreshed");
  };
  const handlePayCreator = async () => {
    if (!selectedUserForPayment?.creator_id) {
      toast.error("No user selected");
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      // Update wallet balance
      const {
        data: currentWallet,
        error: walletFetchError
      } = await supabase.from("wallets").select("balance, total_earned").eq("user_id", selectedUserForPayment.creator_id).single();
      if (walletFetchError) throw walletFetchError;
      const balance_before = currentWallet.balance || 0;
      const balance_after = balance_before + amount;
      const {
        error: walletUpdateError
      } = await supabase.from("wallets").update({
        balance: balance_after,
        total_earned: (currentWallet.total_earned || 0) + amount
      }).eq("user_id", selectedUserForPayment.creator_id);
      if (walletUpdateError) throw walletUpdateError;

      // Get current campaign budget before update
      const {
        data: campaignBefore
      } = await supabase.from("campaigns").select("budget_used, budget").eq("id", selectedCampaignId).single();

      // Create wallet transaction
      const {
        error: transactionError
      } = await supabase.from("wallet_transactions").insert({
        user_id: selectedUserForPayment.creator_id,
        amount: amount,
        type: "earning",
        description: `Payment for ${selectedUserForPayment.platform} content`,
        status: "completed",
        metadata: {
          campaign_id: selectedCampaignId,
          submission_id: selectedUserForPayment.id,
          platform: selectedUserForPayment.platform,
          balance_before: balance_before,
          balance_after: balance_after,
          campaign_budget_before: campaignBefore?.budget_used || 0,
          campaign_budget_after: (campaignBefore?.budget_used || 0) + amount,
          campaign_total_budget: campaignBefore?.budget || 0
        }
      });
      if (transactionError) throw transactionError;

      // Update campaign budget - fetch current value from database to avoid stale state
      const {
        data: currentCampaign,
        error: fetchError
      } = await supabase.from("campaigns").select("budget_used").eq("id", selectedCampaignId).single();
      if (fetchError) throw fetchError;
      const currentBudgetUsed = Number(currentCampaign?.budget_used || 0);
      const {
        error: budgetError
      } = await supabase.from("campaigns").update({
        budget_used: currentBudgetUsed + amount
      }).eq("id", selectedCampaignId);
      if (budgetError) throw budgetError;

      // Update campaign analytics
      const {
        data: socialAccount
      } = await supabase.from("social_accounts").select("username, account_link").eq("user_id", selectedUserForPayment.creator_id).eq("platform", selectedUserForPayment.platform).single();
      if (socialAccount) {
        const {
          data: existingAnalytics
        } = await supabase.from("campaign_account_analytics").select("*").eq("campaign_id", selectedCampaignId).eq("user_id", selectedUserForPayment.creator_id).eq("platform", selectedUserForPayment.platform).eq("account_username", socialAccount.username).maybeSingle();
        if (existingAnalytics) {
          // Update existing analytics record
          await supabase.from("campaign_account_analytics").update({
            paid_views: (existingAnalytics.paid_views || 0) + (selectedUserForPayment.views || 0),
            last_payment_amount: amount,
            last_payment_date: new Date().toISOString()
          }).eq("id", existingAnalytics.id);
        } else {
          // Create new analytics record
          await supabase.from("campaign_account_analytics").insert({
            campaign_id: selectedCampaignId,
            user_id: selectedUserForPayment.creator_id,
            platform: selectedUserForPayment.platform,
            account_username: socialAccount.username,
            account_link: socialAccount.account_link,
            paid_views: selectedUserForPayment.views || 0,
            last_payment_amount: amount,
            last_payment_date: new Date().toISOString(),
            total_views: 0,
            total_videos: 0
          });
        }
      }
      toast.success(`Successfully paid $${amount.toFixed(2)} to ${selectedUserForPayment.profiles?.username}`);
      setPaymentDialogOpen(false);
      setSelectedUserForPayment(null);
      setPaymentAmount("");
      fetchCampaign();
      fetchTransactions();
      fetchAnalytics();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    }
  };
  const handleKickUser = async () => {
    if (!userToKick) return;
    try {
      // Update ALL submission statuses to withdrawn for this user and campaign
      const {
        error: submissionError
      } = await supabase.from("campaign_submissions").update({
        status: "withdrawn"
      }).eq("creator_id", userToKick.creator_id).eq("campaign_id", selectedCampaignId);
      if (submissionError) throw submissionError;

      // Get user's social accounts
      const {
        data: socialAccounts,
        error: accountsError
      } = await supabase.from("social_accounts").select("id").eq("user_id", userToKick.creator_id);
      if (accountsError) throw accountsError;

      // Disconnect all their accounts from this campaign
      if (socialAccounts && socialAccounts.length > 0) {
        const accountIds = socialAccounts.map(acc => acc.id);
        const {
          error: unlinkError
        } = await supabase.from("social_account_campaigns").update({ 
          status: 'disconnected',
          disconnected_at: new Date().toISOString()
        }).eq("campaign_id", selectedCampaignId).in("social_account_id", accountIds);
        if (unlinkError) throw unlinkError;
      }
      toast.success(`Removed ${userToKick.profiles?.username} from campaign`);
      setKickDialogOpen(false);
      setUserToKick(null);
      fetchSubmissions();
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Failed to remove user from campaign");
    }
  };

  const handleApproveSubmission = async (submissionId: string) => {
    setProcessingSubmissionId(submissionId);
    try {
      const { error } = await supabase
        .from("campaign_submissions")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", submissionId);

      if (error) throw error;

      toast.success("Application approved");
      fetchSubmissions();
    } catch (error) {
      console.error("Error approving submission:", error);
      toast.error("Failed to approve application");
    } finally {
      setProcessingSubmissionId(null);
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    setProcessingSubmissionId(submissionId);
    try {
      const { error } = await supabase
        .from("campaign_submissions")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", submissionId);

      if (error) throw error;

      toast.success("Application rejected");
      fetchSubmissions();
    } catch (error) {
      console.error("Error rejecting submission:", error);
      toast.error("Failed to reject application");
    } finally {
      setProcessingSubmissionId(null);
    }
  };
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Filter and sort approved submissions
  const approvedSubmissions = (() => {
    let filtered = submissions.filter(s => {
      if (s.status !== "approved") return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const username = s.profiles?.username?.toLowerCase() || "";
        const accountUsernames = s.profiles?.social_accounts?.map((acc: any) => acc.username?.toLowerCase() || "").join(" ") || "";
        return username.includes(query) || accountUsernames.includes(query);
      }
      return true;
    });

    // Remove duplicates by keeping only the latest submission per creator
    const uniqueByCreator = new Map();
    filtered.forEach(submission => {
      const existing = uniqueByCreator.get(submission.creator_id);
      if (!existing || new Date(submission.submitted_at) > new Date(existing.submitted_at)) {
        uniqueByCreator.set(submission.creator_id, submission);
      }
    });
    filtered = Array.from(uniqueByCreator.values());

    // Sort by total paid if sortOrder is active
    if (sortOrder) {
      return [...filtered].sort((a, b) => {
        const aPaid = transactions.filter(txn => txn.user_id === a.creator_id).reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
        const bPaid = transactions.filter(txn => txn.user_id === b.creator_id).reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
        return sortOrder === 'desc' ? bPaid - aPaid : aPaid - bPaid;
      });
    }

    // Sort by number of linked accounts if accountSortOrder is active
    if (accountSortOrder) {
      return [...filtered].sort((a, b) => {
        const aAccountCount = a.profiles?.social_accounts?.length || 0;
        const bAccountCount = b.profiles?.social_accounts?.length || 0;
        return accountSortOrder === 'desc' ? bAccountCount - aAccountCount : aAccountCount - bAccountCount;
      });
    }
    return filtered;
  })();
  const pendingSubmissions = submissions.filter(s => {
    if (s.status !== "pending") return false;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const username = s.profiles?.username?.toLowerCase() || "";
      const accountUsernames = s.profiles?.social_accounts?.map((acc: any) => acc.username?.toLowerCase() || "").join(" ") || "";
      return username.includes(query) || accountUsernames.includes(query);
    }
    return true;
  });

  // Filter historical (approved/rejected/withdrawn) submissions
  const historicalSubmissions = submissions.filter(s => {
    if (s.status === "pending") return false;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const username = s.profiles?.username?.toLowerCase() || "";
      const accountUsernames = s.profiles?.social_accounts?.map((acc: any) => acc.username?.toLowerCase() || "").join(" ") || "";
      return username.includes(query) || accountUsernames.includes(query);
    }
    return true;
  });

  // Group by account and sum views across all date ranges to avoid counting duplicates
  const accountViews = analytics.reduce((acc: Record<string, number>, a: any) => {
    const key = `${a.platform}-${a.account_username}`;
    acc[key] = (acc[key] || 0) + (Number(a.total_views) || 0);
    return acc;
  }, {} as Record<string, number>);
  const totalViews = (Object.values(accountViews) as number[]).reduce((sum, views) => sum + views, 0);
  const budgetUsed = Number(selectedCampaign?.budget_used || 0);
  const effectiveCPM = totalViews > 0 ? budgetUsed / totalViews * 1000 : 0;
  if (loading) {
    return <div className="min-h-screen p-8 bg-[#060605]">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64 bg-[#1a1a1a]" />
          <Skeleton className="h-12 w-full max-w-xs bg-[#1a1a1a]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-lg bg-[#1a1a1a]" />
            <Skeleton className="h-24 rounded-lg bg-[#1a1a1a]" />
            <Skeleton className="h-24 rounded-lg bg-[#1a1a1a]" />
          </div>
          <Skeleton className="h-96 rounded-lg bg-[#1a1a1a]" />
        </div>
      </div>;
  }
  
  // No campaign slug - show campaign selector
  if (!campaignSlug) {
    return <div className="min-h-screen p-8 bg-[#060605] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Select a Campaign</h1>
          <Select onValueChange={(newSlug) => navigate(`/manage/${newSlug}`)}>
            <SelectTrigger className="w-[320px] bg-card border">
              <SelectValue placeholder="Choose a campaign to manage" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              {allCampaigns.map(campaign => (
                <SelectItem 
                  key={campaign.id} 
                  value={campaign.slug} 
                  className="hover:bg-accent focus:bg-accent"
                >
                  {campaign.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>;
  }
  
  if (campaigns.length === 0) {
    return <div className="min-h-screen p-8 bg-[#060605] flex items-center justify-center">
        <div className="text-foreground">No campaigns found</div>
      </div>;
  }
  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#060605]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={() => isMobile ? sidebar.setOpenMobile(true) : sidebar.toggleSidebar()} className="text-muted-foreground hover:text-foreground hover:bg-accent">
            {isMobile ? <Menu className="h-6 w-6" /> : <PanelLeft className="h-6 w-6" />}
          </Button>
        </div>
        {/* Campaign Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground font-instrument tracking-tight">
                {selectedCampaign?.title || 'Campaign Management'}
              </h1>
              {allCampaigns.length > 1 && (
                <Select 
                  value={campaignSlug} 
                  onValueChange={(newSlug) => navigate(`/manage/${newSlug}`)}
                >
                  <SelectTrigger className="w-[280px] bg-card border">
                    <SelectValue placeholder="Switch campaign" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border z-50">
                    {allCampaigns.map(campaign => (
                      <SelectItem 
                        key={campaign.id} 
                        value={campaign.slug} 
                        className="hover:bg-accent focus:bg-accent"
                      >
                        {campaign.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {currentBrandName && (
              <p className="text-sm text-muted-foreground">{currentBrandName}</p>
            )}
          </div>
        </div>

        {/* Campaign Metrics Cards */}
        {selectedCampaign && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Combined Budget Card */}
            <Card className="border">
              <div className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-muted-foreground">Budget Overview</p>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleEditBudgetUsed}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-lg font-semibold">${selectedCampaign.budget?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Used</span>
                    <span className="text-lg font-semibold">${selectedCampaign.budget_used?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Remaining</span>
                    <span className="text-lg font-semibold">${((selectedCampaign.budget || 0) - (selectedCampaign.budget_used || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* RPM Rate Card */}
            <Card className="border">
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-2">RPM Rate</p>
                <p className="text-lg font-semibold">
                  ${selectedCampaign.rpm_rate?.toFixed(2) || '0.00'}
                </p>
              </div>
            </Card>

            {/* Creators Card */}
            <Card className="border">
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-2">Creators</p>
                <p className="text-lg font-semibold">
                  {approvedSubmissions.length}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Main Content */}
        {selectedCampaign && (
          // Management Page: Tabs with Analytics, Videos, Users, Payouts
          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="bg-card border">
              <TabsTrigger value="analytics" className="data-[state=active]:bg-accent">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="videos" className="data-[state=active]:bg-accent">
                Videos
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-accent">
                Users
              </TabsTrigger>
              <TabsTrigger value="payouts" className="data-[state=active]:bg-accent">
                Payouts
              </TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              {videos.length > 0 && (
                <Card className="bg-card border mb-6">
                  <CardHeader>
                    <CardTitle className="font-instrument tracking-tight">Video Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="bg-accent/50 border-accent">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Eye className="h-8 w-8 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Total Views</p>
                              <p className="text-2xl font-bold">
                                {videos.reduce((sum, v) => sum + (Number(v.latest_views) || 0), 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-accent/50 border-accent">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Total Likes</p>
                              <p className="text-2xl font-bold">
                                {videos.reduce((sum, v) => sum + (Number(v.latest_likes) || 0), 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-accent/50 border-accent">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Users className="h-8 w-8 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Total Videos</p>
                              <p className="text-2xl font-bold">{videos.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-accent/50 border-accent">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-8 w-8 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Avg Engagement</p>
                              <p className="text-2xl font-bold">
                                {videos.length > 0 ? (
                                  ((videos.reduce((sum, v) => sum + (Number(v.latest_likes) || 0) + (Number(v.latest_comments) || 0) + (Number(v.latest_shares) || 0), 0) / videos.length)).toFixed(1)
                                ) : 0}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {selectedCampaign && (
                <CampaignAnalyticsTable 
                  campaignId={selectedCampaign.id}
                  onPaymentComplete={() => fetchTransactions()}
                />
              )}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos">
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="font-instrument tracking-tight">Campaign Videos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter collection name"
                      value={collectionName}
                      onChange={(e) => setCollectionName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && fetchVideos(collectionName, false)}
                      className="bg-background border"
                    />
                    <Button onClick={() => fetchVideos(collectionName, false)} disabled={loadingVideos}>
                      {loadingVideos ? "Loading..." : "Fetch Videos"}
                    </Button>
                    {videos.length > 0 && (
                      <Button 
                        onClick={() => fetchVideos(collectionName, true)} 
                        disabled={loadingVideos}
                        variant="outline"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingVideos ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    )}
                  </div>
                  
                  {lastVideosFetch && (
                    <p className="text-xs text-muted-foreground">
                      Last updated: {lastVideosFetch.toLocaleString()}
                    </p>
                  )}

                  {videos.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table className="min-w-[800px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[120px]">Username</TableHead>
                              <TableHead className="min-w-[100px]">Platform</TableHead>
                              <TableHead className="min-w-[200px]">Title</TableHead>
                              <TableHead className="min-w-[100px]">Uploaded</TableHead>
                              <TableHead className="text-right min-w-[80px]">Views</TableHead>
                              <TableHead className="text-right min-w-[80px]">Likes</TableHead>
                              <TableHead className="text-right min-w-[100px]">Comments</TableHead>
                              <TableHead className="text-right min-w-[80px]">Shares</TableHead>
                              <TableHead className="text-right min-w-[100px]">Est. Payout</TableHead>
                              <TableHead className="min-w-[80px]">Link</TableHead>
                            </TableRow>
                          </TableHeader>
                        <TableBody>
                          {videos.map((video, index) => (
                            <TableRow 
                              key={video.ad_id || index}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => fetchVideoHistory(video)}
                            >
                              <TableCell className="font-medium">{video.username}</TableCell>
                              <TableCell className="capitalize">{video.platform}</TableCell>
                              <TableCell className="max-w-xs truncate">{video.title || '-'}</TableCell>
                              <TableCell>{video.uploaded_at ? new Date(video.uploaded_at).toLocaleDateString() : '-'}</TableCell>
                              <TableCell className="text-right">{video.latest_views?.toLocaleString() || 0}</TableCell>
                              <TableCell className="text-right">{video.latest_likes?.toLocaleString() || 0}</TableCell>
                              <TableCell className="text-right">{video.latest_comments?.toLocaleString() || 0}</TableCell>
                              <TableCell className="text-right">{video.latest_shares?.toLocaleString() || 0}</TableCell>
                              <TableCell className="text-right font-medium text-primary">
                                ${(((video.latest_views || 0) / 1000) * (selectedCampaign?.rpm_rate || 0)).toFixed(2)}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                {video.ad_link && (
                                  <a href={video.ad_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    View
                                  </a>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </div>
                  )}

                  {videos.length === 0 && !loadingVideos && collectionName && (
                    <p className="text-muted-foreground text-center py-8">No videos found for this collection</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab - Campaign Users */}
            <TabsContent value="users">
              <Card className="bg-card border">
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="font-instrument tracking-tight">Campaign Users</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {campaignUsers.length} users in this campaign
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={fetchCampaignUsers} 
                        disabled={loadingCampaignUsers}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingCampaignUsers ? 'animate-spin' : ''}`} />
                        {loadingCampaignUsers ? 'Loading...' : 'Load Users'}
                      </Button>
                      <Button 
                        onClick={exportCampaignUsers} 
                        disabled={campaignUsers.length === 0}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {campaignUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground text-sm mb-4">
                        {loadingCampaignUsers ? 'Loading users...' : 'No users loaded'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click "Load Users" to fetch users who joined this campaign
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-medium">User</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Email</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Phone</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Social Accounts</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Campaign Earnings</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaignUsers.map((user) => (
                            <TableRow key={user.user_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                  {user.profile?.avatar_url && (
                                    <img 
                                      src={user.profile.avatar_url} 
                                      alt={user.profile?.username}
                                      className="w-6 h-6 rounded-full"
                                    />
                                  )}
                                  <span className="font-medium">{user.profile?.username || 'Unknown'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-muted-foreground">
                                {user.profile?.email || '-'}
                              </TableCell>
                              <TableCell className="py-4 text-muted-foreground">
                                {user.profile?.phone_number || '-'}
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant={user.status === 'approved' ? 'default' : 'secondary'}>
                                  {user.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-wrap gap-1">
                                  {user.social_accounts?.map((account: any) => (
                                    <Badge key={account.id} variant="outline" className="text-xs">
                                      {account.platform}: @{account.username}
                                    </Badge>
                                  ))}
                                  {(!user.social_accounts || user.social_accounts.length === 0) && (
                                    <span className="text-muted-foreground text-sm">None</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-foreground font-medium">
                                ${user.campaign_earnings?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className="py-4 text-muted-foreground text-sm">
                                {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts">
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="font-instrument tracking-tight">Campaign Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTransactions ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-sm">Loading transactions...</p>
                    </div>
                  ) : campaignTransactions.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Shortimize Account</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaignTransactions.map((txn) => (
                            <TableRow key={txn.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {txn.profiles?.avatar_url && (
                                    <img 
                                      src={txn.profiles.avatar_url} 
                                      alt={txn.profiles.username}
                                      className="w-8 h-8 rounded-full"
                                    />
                                  )}
                                  <span className="font-medium">{txn.profiles?.username || 'Unknown'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {txn.shortimize_account ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="font-medium">@{txn.shortimize_account.account_username}</span>
                                    <Badge variant="secondary" className="capitalize w-fit">
                                      {txn.shortimize_account.platform}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Not matched</span>
                                )}
                              </TableCell>
                              <TableCell className="capitalize">{txn.type}</TableCell>
                              <TableCell className="font-semibold">
                                ${Number(txn.amount).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'}>
                                  {txn.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {txn.description || '-'}
                              </TableCell>
                              <TableCell>
                                {new Date(txn.created_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <DollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground text-sm">No transactions found for this campaign</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

      </div>

      {/* Edit Budget Dialog */}
      <Dialog open={editBudgetDialogOpen} onOpenChange={setEditBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget Used</DialogTitle>
            <DialogDescription>
              Update the budget used for this campaign
            </DialogDescription>
          </DialogHeader>
          {loadingBudget ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Current Budget Used</label>
                <p className="text-lg font-semibold text-muted-foreground">
                  ${currentBudgetUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">New Budget Used ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingBudgetUsed}
                  onChange={(e) => setEditingBudgetUsed(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {editingBudgetUsed && !isNaN(parseFloat(editingBudgetUsed)) && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Change: </span>
                    <span className={parseFloat(editingBudgetUsed) - currentBudgetUsed >= 0 ? "text-green-600" : "text-red-600"}>
                      {parseFloat(editingBudgetUsed) - currentBudgetUsed >= 0 ? "+" : ""}
                      ${(parseFloat(editingBudgetUsed) - currentBudgetUsed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBudgetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBudgetUsed} disabled={loadingBudget}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video History Dialog */}
      <VideoHistoryDialog
        open={videoHistoryOpen}
        onOpenChange={setVideoHistoryOpen}
        video={selectedVideo}
        historyData={videoHistory}
        loading={loadingVideoHistory}
      />
    </div>
  );
}