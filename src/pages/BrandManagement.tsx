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
import instagramLogo from "@/assets/instagram-logo.png";
import youtubeLogo from "@/assets/youtube-logo.png";
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
export default function BrandManagement({
  showVideosTab = true,
  showImportButton = true,
  showAnalyticsTable = false,
  isManagementPage = false
}: {
  showVideosTab?: boolean;
  showImportButton?: boolean;
  showAnalyticsTable?: boolean;
  isManagementPage?: boolean;
}) {
  const params = useParams();
  const navigate = useNavigate();
  const slug = isManagementPage ? params.campaignSlug : params.slug;
  const {
    isAdmin,
    loading: adminLoading
  } = useAdminCheck();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [allBrands, setAllBrands] = useState<Array<{ id: string; name: string; slug: string }>>([]);
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
          .eq('campaign_id', selectedCampaignId);

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
    fetchAllBrands();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [slug]);

  useEffect(() => {
    if (isManagementPage && selectedCampaignId) {
      fetchCampaignTransactions();
    }
  }, [isManagementPage, selectedCampaignId]);

  useEffect(() => {
    // Removed auto-fetch on mount - users should manually load with collection name
  }, [isManagementPage, brandId, shortimizeApiKey]);
  useEffect(() => {
    if (selectedCampaignId) {
      fetchSubmissions();
      fetchAnalytics();
      fetchTransactions();

      // Set up real-time subscription for campaign submissions and social account connections
      const submissionsChannel = supabase.channel('campaign-submissions-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_submissions',
        filter: `campaign_id=eq.${selectedCampaignId}`
      }, payload => {
        console.log('Submission changed:', payload);
        fetchSubmissions();
      }).subscribe();
      const accountConnectionsChannel = supabase.channel('social-account-campaigns-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'social_account_campaigns',
        filter: `campaign_id=eq.${selectedCampaignId}`
      }, payload => {
        console.log('Social account connection changed:', payload);
        fetchSubmissions();
      }).subscribe();
      return () => {
        supabase.removeChannel(submissionsChannel);
        supabase.removeChannel(accountConnectionsChannel);
      };
    }
  }, [selectedCampaignId]);
  const fetchAnalytics = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("campaign_account_analytics").select("*").eq("campaign_id", selectedCampaignId).order("total_views", {
        ascending: false
      });
      if (error) throw error;
      setAnalytics(data || []);

      // Refresh campaign data to get updated budget_used
      fetchCampaigns();
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };
  const fetchTransactions = async () => {
    try {
      // Fetch all earning and balance_correction transactions
      const {
        data,
        error
      } = await supabase.from("wallet_transactions").select("*").in('type', ['earning', 'balance_correction']).order('created_at', {
        ascending: false
      });
      if (error) throw error;

      console.log('Selected campaign ID:', selectedCampaignId);

      // Filter by campaign_id in metadata (handle both formats)
      const campaignTransactions = data?.filter((txn: any) => {
        const metadata = txn.metadata || {};
        return metadata.campaign_id === selectedCampaignId;
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
  const fetchAllBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setAllBrands(data || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  const fetchCampaigns = async () => {
    if (!slug && !isManagementPage) return;
    
    try {
      if (isManagementPage && slug) {
        // Management page: fetch by campaign slug
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
          .eq("slug", slug)
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
      } else {
        // Regular brand dashboard: fetch by brand slug
        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .select("id, name, assets_url, home_url, account_url, brand_type, shortimize_api_key")
          .eq("slug", slug)
          .maybeSingle();

        if (brandError) throw brandError;
        if (!brandData) return;

        setBrandId(brandData.id);
        setCurrentBrandName(brandData.name);
        setAssetsUrl(brandData.assets_url || "");
        setHomeUrl(brandData.home_url || "");
        setAccountUrl(brandData.account_url || "");
        setBrandType(brandData.brand_type || "");
        setShortimizeApiKey(brandData.shortimize_api_key || "");

        const { data, error } = await supabase
          .from("campaigns")
          .select("id, title, description, budget, budget_used, rpm_rate, status, banner_url, preview_url, analytics_url, guidelines, allowed_platforms, application_questions, slug, embed_url, is_private, access_code, requires_application, is_infinite_budget, is_featured")
          .eq("brand_id", brandData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCampaigns((data || []).map(c => ({
          ...c,
          application_questions: Array.isArray(c.application_questions) ? c.application_questions : []
        })));
        if (data && data.length > 0) {
          setSelectedCampaignId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };
  const fetchSubmissions = async () => {
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
        `).eq("campaign_id", selectedCampaignId).order("submitted_at", {
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
          `).eq("campaign_id", selectedCampaignId).eq("social_accounts.user_id", submission.creator_id);
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
      fetchCampaigns();
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
  const handleEditBudgetUsed = () => {
    setEditingBudgetUsed(selectedCampaign?.budget_used?.toString() || "0");
    setEditBudgetDialogOpen(true);
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
      fetchCampaigns();
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
    fetchCampaigns();
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
      fetchCampaigns();
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

      // Unlink all their accounts from this campaign
      if (socialAccounts && socialAccounts.length > 0) {
        const accountIds = socialAccounts.map(acc => acc.id);
        const {
          error: unlinkError
        } = await supabase.from("social_account_campaigns").delete().eq("campaign_id", selectedCampaignId).in("social_account_id", accountIds);
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
        .update({ status: "approved" })
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
        .update({ status: "rejected" })
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
                {isManagementPage ? 'Brand Management' : currentBrandName}
              </h1>
              {!isManagementPage && allBrands.length > 1 && (
                <Select 
                  value={slug} 
                  onValueChange={(newSlug) => navigate(`/brand/${newSlug}`)}
                >
                  <SelectTrigger className="w-[200px] bg-card border">
                    <SelectValue placeholder="Switch brand" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border z-50">
                    {allBrands.map(brand => (
                      <SelectItem 
                        key={brand.id} 
                        value={brand.slug} 
                        className="hover:bg-accent focus:bg-accent"
                      >
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {!isManagementPage && campaigns.length > 1 && <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="w-[280px] bg-card border">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent className="bg-card border z-50">
                  {campaigns.map(campaign => <SelectItem key={campaign.id} value={campaign.id} className="hover:bg-accent focus:bg-accent">
                      {campaign.title}
                    </SelectItem>)}
                </SelectContent>
              </Select>}
          </div>
        </div>

        {/* Campaign Metrics Cards */}
        {selectedCampaign && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Combined Budget Card */}
            <Card className="border">
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-2">Budget Overview</p>
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

        {/* Conditional Content Based on Page Type */}
        {isManagementPage ? (
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
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="font-instrument tracking-tight">Campaign Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {videos.length > 0 ? (
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
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-sm">Fetch videos from the Videos tab to see analytics</p>
                    </div>
                  )}
                </CardContent>
              </Card>
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

            {/* Users Tab - Shortimize Accounts */}
            <TabsContent value="users">
              <Card className="bg-card border">
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="font-instrument tracking-tight">Shortimize Accounts</CardTitle>
                      {lastAccountsFetch && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last updated: {lastAccountsFetch.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Collection name..."
                        value={accountsCollectionName}
                        onChange={(e) => setAccountsCollectionName(e.target.value)}
                        className="w-64"
                      />
                      <Button 
                        onClick={() => fetchShortimizeAccounts(true)} 
                        disabled={!shortimizeApiKey || loadingShortimize || !accountsCollectionName?.trim()}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingShortimize ? 'animate-spin' : ''}`} />
                        {loadingShortimize ? 'Loading...' : 'Load Accounts'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {!shortimizeApiKey ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-sm">Please configure Shortimize API key in Brand Settings</p>
                    </div>
                  ) : shortimizeAccounts.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground text-sm">
                        {loadingShortimize ? 'Loading accounts...' : 'No accounts found'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-medium">Username</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Matched User</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Platform</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Followers</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Total Views</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Total Likes</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Videos</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Median Views</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Last Upload</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shortimizeAccounts.map((account) => (
                            <TableRow key={account.account_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <TableCell className="py-4">
                                <a 
                                  href={account.account_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-foreground hover:underline font-medium"
                                >
                                  @{account.username}
                                </a>
                              </TableCell>
                              <TableCell className="py-4">
                                {account.matched_user ? (
                                  <div className="flex items-center gap-2">
                                    {account.matched_user.avatar_url && (
                                      <img 
                                        src={account.matched_user.avatar_url} 
                                        alt={account.matched_user.username}
                                        className="w-6 h-6 rounded-full"
                                      />
                                    )}
                                    <span className="font-medium text-sm">{account.matched_user.username}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Not matched</span>
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant="secondary" className="capitalize">
                                  {account.platform}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4 text-foreground">
                                {account.latest_followers_count?.toLocaleString() || 'N/A'}
                              </TableCell>
                              <TableCell className="py-4 text-foreground">
                                {account.total_views?.toLocaleString() || '0'}
                              </TableCell>
                              <TableCell className="py-4 text-foreground">
                                {account.total_likes?.toLocaleString() || '0'}
                              </TableCell>
                              <TableCell className="py-4 text-foreground">
                                {account.total_videos_tracked || '0'}
                              </TableCell>
                              <TableCell className="py-4 text-foreground">
                                {account.median_views?.toLocaleString() || '0'}
                              </TableCell>
                              <TableCell className="py-4 text-muted-foreground text-sm">
                                {account.last_uploaded_at ? new Date(account.last_uploaded_at).toLocaleDateString() : 'N/A'}
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
        ) : (
          // Brand Page: Full Tabs with All Features
          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="bg-card border">
              <TabsTrigger value="analytics" className="data-[state=active]:bg-accent">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="creators" className="data-[state=active]:bg-accent">
                Users
                <Badge variant="secondary" className="ml-2">
                  {approvedSubmissions.length}
                </Badge>
              </TabsTrigger>
              {showVideosTab && <TabsTrigger value="videos" className="data-[state=active]:bg-accent">
                  Videos
                </TabsTrigger>}
              <TabsTrigger value="applications" className="data-[state=active]:bg-accent">
                Applications
                {pendingSubmissions.length > 0 && <Badge className="ml-2 bg-primary">{pendingSubmissions.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-accent">
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <Card className="bg-card border">
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-[#0d0d0d]">
                      <div className="text-2xl font-bold font-chakra">
                        {(() => {
                        const accountViews = analytics.reduce((acc, a) => {
                          const key = `${a.platform}-${a.account_username}`;
                          acc[key] = (acc[key] || 0) + (Number(a.total_views) || 0);
                          return acc;
                        }, {} as Record<string, number>);
                        return Object.values(accountViews).reduce((sum: number, views: number) => sum + views, 0).toLocaleString();
                      })()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Total Views</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-[#0d0d0d]">
                      <div className="text-2xl font-bold font-chakra">
                        {(() => {
                        const uniqueAccounts = new Set(analytics.map(a => `${a.platform}-${a.account_username}`));
                        return uniqueAccounts.size;
                      })()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Total Accounts</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-[#0d0d0d]">
                      <div className="text-2xl font-bold font-chakra">
                        ${Number(selectedCampaign?.budget_used || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                        Budget Used
                        {isAdmin && <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent" onClick={handleEditBudgetUsed} title="Edit budget used">
                            <Edit className="h-3 w-3" />
                          </Button>}
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-[#0d0d0d]">
                      <div className="text-2xl font-bold font-chakra">
                        ${effectiveCPM.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Effective CPM</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {showImportButton && <div className="flex justify-end gap-2">
                  <ImportCampaignStatsDialog campaignId={selectedCampaignId} onImportComplete={fetchSubmissions} onMatchingRequired={() => setMatchDialogOpen(true)} />
                </div>}
              
              {showAnalyticsTable && <CampaignAnalyticsTable campaignId={selectedCampaignId} onPaymentComplete={fetchSubmissions} />}
              
              <MatchAccountsDialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen} campaignId={selectedCampaignId} onMatchComplete={fetchSubmissions} />
            </TabsContent>

            {/* Creators Tab - Keeping all existing code */}
            <TabsContent value="creators">
              <Card className="bg-card border">
                <CardHeader className="pb-4 border-b border-border space-y-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-instrument tracking-tight">
                      Active Creators
                      <Badge variant="secondary" className="ml-2">
                        {approvedSubmissions.length}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportToCSV} disabled={approvedSubmissions.length === 0} className="flex items-center gap-2 border-0">
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="text" placeholder="Search by name or account username..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {approvedSubmissions.length === 0 ? <div className="text-center py-12">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground text-sm">No active creators yet</p>
                    </div> : <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="font-medium text-muted-foreground">Creator</TableHead>
                            <TableHead className="font-medium text-muted-foreground">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAccountSortOrder(accountSortOrder === 'desc' ? 'asc' : accountSortOrder === 'asc' ? null : 'desc')}
                                className="h-auto p-0 hover:bg-transparent"
                              >
                                Linked Accounts
                                {accountSortOrder && <span className="ml-1">{accountSortOrder === 'desc' ? '↓' : '↑'}</span>}
                              </Button>
                            </TableHead>
                            <TableHead className="font-medium text-muted-foreground">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : sortOrder === 'asc' ? null : 'desc')}
                                className="h-auto p-0 hover:bg-transparent"
                              >
                                Total Paid
                                {sortOrder && <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>}
                              </Button>
                            </TableHead>
                            <TableHead className="font-medium text-muted-foreground">Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {approvedSubmissions.map((submission) => {
                            const totalPaid = transactions.filter(txn => txn.user_id === submission.creator_id).reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
                            const linkedAccounts = submission.profiles?.social_accounts || [];
                            
                            return (
                              <TableRow key={submission.id} className="border-b border-border hover:bg-accent/50">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                      {submission.profiles?.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <span className="font-medium">
                                      {submission.profiles?.username || 'Unknown'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {linkedAccounts.length > 0 ? (
                                    <div className="flex flex-wrap gap-3">
                                      {linkedAccounts.map((account: any, idx: number) => {
                                        const platformIcon = getPlatformIcon(account.platform);
                                        return (
                                          <a
                                            key={idx}
                                            href={account.account_link || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 group"
                                          >
                                            {platformIcon && (
                                              <img 
                                                src={platformIcon} 
                                                alt={account.platform}
                                                className="w-4 h-4 object-contain"
                                              />
                                            )}
                                            <span className="text-sm group-hover:underline">
                                              {account.username}
                                            </span>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">No accounts</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">${totalPaid.toFixed(2)}</span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(submission.submitted_at), 'MMM dd, yyyy')}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Applications Tab */}
            <TabsContent value="applications">
              <Card className="bg-card border">
                <CardHeader className="pb-4 border-b border-border">
                  <CardTitle className="flex items-center gap-2 font-instrument tracking-tight">
                    Pending Applications
                    <Badge variant="secondary" className="ml-2">
                      {pendingSubmissions.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {pendingSubmissions.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground text-sm">No pending applications</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="font-medium text-muted-foreground">Creator</TableHead>
                            <TableHead className="font-medium text-muted-foreground">Linked Accounts</TableHead>
                            <TableHead className="font-medium text-muted-foreground">Submitted</TableHead>
                            <TableHead className="font-medium text-muted-foreground">Application</TableHead>
                            <TableHead className="text-right font-medium text-muted-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingSubmissions.map((submission) => (
                            <TableRow key={submission.id} className="border-b border-border hover:bg-accent/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                    {submission.profiles?.username?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <span className="font-medium">
                                    {submission.profiles?.username || 'Unknown'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-2">
                                  {submission.profiles?.social_accounts && submission.profiles.social_accounts.length > 0 ? (
                                    submission.profiles.social_accounts.map((account: any) => (
                                      <div key={account.id} className="flex items-center gap-2">
                                        {getPlatformIcon(account.platform) && (
                                          <img 
                                            src={getPlatformIcon(account.platform)!} 
                                            alt={account.platform} 
                                            className="h-4 w-4 object-contain"
                                          />
                                        )}
                                        <span className="text-sm font-medium">@{account.username}</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {account.follower_count?.toLocaleString() || 0} followers
                                        </Badge>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground text-sm">No accounts linked</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(submission.submitted_at), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>
                                {submission.application_answers && Object.keys(submission.application_answers).length > 0 ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(submission);
                                      setIsUserDialogOpen(true);
                                    }}
                                  >
                                    View Answers
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No answers</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveSubmission(submission.id)}
                                    disabled={processingSubmissionId === submission.id}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectSubmission(submission.id)}
                                    disabled={processingSubmissionId === submission.id}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
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

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-xl font-instrument">Campaign Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="shortimize-key">Shortimize API Key</Label>
                      <Input
                        id="shortimize-key"
                        type="password"
                        value={shortimizeApiKey}
                        onChange={(e) => setShortimizeApiKey(e.target.value)}
                        placeholder="Enter your Shortimize API key"
                        className="mt-2 bg-card border"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        This API key is used to fetch analytics data from Shortimize for this brand.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="collection-id">Collection ID</Label>
                      <Input
                        id="collection-id"
                        value={brandCollectionId}
                        onChange={(e) => setBrandCollectionId(e.target.value)}
                        placeholder="Enter collection ID"
                        className="mt-2 bg-card border"
                      />
                    </div>

                    <div>
                      <Label htmlFor="collection-name">Collection Name</Label>
                      <Input
                        id="collection-name"
                        value={brandCollectionName}
                        onChange={(e) => setBrandCollectionName(e.target.value)}
                        placeholder="Enter collection name"
                        className="mt-2 bg-card border"
                      />
                    </div>

                    <div>
                      <Label htmlFor="assets-url">Assets URL</Label>
                      <Input
                        id="assets-url"
                        value={assetsUrl}
                        onChange={(e) => setAssetsUrl(e.target.value)}
                        placeholder="https://..."
                        className="mt-2 bg-card border"
                      />
                    </div>

                    <div>
                      <Label htmlFor="home-url">Home URL</Label>
                      <Input
                        id="home-url"
                        value={homeUrl}
                        onChange={(e) => setHomeUrl(e.target.value)}
                        placeholder="https://..."
                        className="mt-2 bg-card border"
                      />
                    </div>

                    <div>
                      <Label htmlFor="account-url">Account URL</Label>
                      <Input
                        id="account-url"
                        value={accountUrl}
                        onChange={(e) => setAccountUrl(e.target.value)}
                        placeholder="https://..."
                        className="mt-2 bg-card border"
                      />
                    </div>

                    <div>
                      <Label htmlFor="brand-type">Brand Type</Label>
                      <Select value={brandType} onValueChange={setBrandType}>
                        <SelectTrigger id="brand-type" className="mt-2 bg-card border">
                          <SelectValue placeholder="Select brand type" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border z-50">
                          <SelectItem value="dwy">DWY (Done With You)</SelectItem>
                          <SelectItem value="dfy">DFY (Done For You)</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleSaveUrls} 
                      disabled={savingUrls}
                      className="w-full md:w-auto"
                    >
                      {savingUrls ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Videos Tab */}
            {showVideosTab && <TabsContent value="videos">
                <VideosTab campaignId={selectedCampaignId} isAdmin={isAdmin} approvedCreators={approvedSubmissions} />
              </TabsContent>}
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
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Budget Used ($)</label>
              <Input
                type="number"
                step="0.01"
                value={editingBudgetUsed}
                onChange={(e) => setEditingBudgetUsed(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBudgetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBudgetUsed}>
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