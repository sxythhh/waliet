import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CampaignAnalyticsTable } from "@/components/CampaignAnalyticsTable";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { VideoHistoryDialog } from "@/components/VideoHistoryDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ManageSidebar } from "@/components/manage/ManageSidebar";
import { DashboardHeader } from "@/components/manage/DashboardHeader";
import { UsersPanel } from "@/components/manage/UsersPanel";
import { PayoutsPanel } from "@/components/manage/PayoutsPanel";
import { VideosPanel } from "@/components/manage/VideosPanel";

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
  application_answers?: any;
  profiles: {
    username: string;
    avatar_url: string | null;
    trust_score: number;
    demographics_score: number;
    views_score: number;
  };
}

export default function BrandManagement() {
  const { campaignSlug } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  
  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Array<{ id: string; title: string; slug: string }>>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [currentBrandName, setCurrentBrandName] = useState<string>("");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Brand state
  const [brandId, setBrandId] = useState<string>("");
  
  // Tab state
  const [activeTab, setActiveTab] = useState("analytics");
  
  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  // Budget edit state
  const [editBudgetDialogOpen, setEditBudgetDialogOpen] = useState(false);
  const [editingBudgetUsed, setEditingBudgetUsed] = useState("");
  const [currentBudgetUsed, setCurrentBudgetUsed] = useState<number>(0);
  const [loadingBudget, setLoadingBudget] = useState(false);
  
  // Users state
  const [campaignUsers, setCampaignUsers] = useState<any[]>([]);
  const [loadingCampaignUsers, setLoadingCampaignUsers] = useState(false);
  
  // Transactions state
  const [campaignTransactions, setCampaignTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Videos state
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [lastVideosFetch, setLastVideosFetch] = useState<Date | null>(null);
  
  // Video history state
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [videoHistoryOpen, setVideoHistoryOpen] = useState(false);
  const [videoHistory, setVideoHistory] = useState<any[] | null>(null);
  const [loadingVideoHistory, setLoadingVideoHistory] = useState(false);
  
  // Cache
  const CACHE_DURATION_MS = 2 * 60 * 60 * 1000;
  const VIDEOS_CACHE_KEY = `shortimize_videos_${brandId}`;

  const isCacheValid = (timestamp: string | null) => {
    if (!timestamp) return false;
    const cacheTime = new Date(timestamp).getTime();
    return (Date.now() - cacheTime) < CACHE_DURATION_MS;
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const approvedSubmissions = submissions.filter(s => s.status === 'approved');

  // Listen for tab changes from sidebar
  useEffect(() => {
    const handleTabChange = (e: CustomEvent) => {
      setActiveTab(e.detail);
      if (e.detail === 'users' && campaignUsers.length === 0 && !loadingCampaignUsers) {
        fetchCampaignUsers();
      }
    };
    window.addEventListener('manage-tab-change', handleTabChange as EventListener);
    return () => window.removeEventListener('manage-tab-change', handleTabChange as EventListener);
  }, [campaignUsers.length, loadingCampaignUsers]);

  // Load cached videos
  useEffect(() => {
    if (brandId) {
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
    }
  }, [brandId]);

  useEffect(() => {
    fetchAllCampaigns();
  }, []);

  useEffect(() => {
    fetchCampaign();
  }, [campaignSlug]);

  useEffect(() => {
    if (selectedCampaignId) {
      fetchCampaignTransactions();
      fetchSubmissions(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  const fetchAllCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, slug")
        .order("title");
      if (error) throw error;
      setAllCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaign = async () => {
    if (!campaignSlug) return;
    try {
      const { data: campaignData, error } = await supabase
        .from("campaigns")
        .select(`
          id, title, description, budget, budget_used, rpm_rate, status, 
          banner_url, preview_url, analytics_url, guidelines, allowed_platforms, 
          application_questions, slug, embed_url, is_private, access_code, 
          requires_application, is_infinite_budget, is_featured, brand_id,
          brands!campaigns_brand_id_fkey (id, name, logo_url, shortimize_api_key, collection_name)
        `)
        .eq("slug", campaignSlug)
        .maybeSingle();

      if (error) throw error;
      if (!campaignData) return;

      const brandData = campaignData.brands;
      setBrandId(brandData.id);
      setCurrentBrandName(brandData.name);
      setBrandLogo(brandData.logo_url);

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

  const fetchSubmissions = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaign_submissions")
        .select(`
          id, status, views, earnings, submitted_at, reviewed_at, creator_id, platform, content_url, application_answers,
          profiles!campaign_submissions_creator_id_fkey (username, avatar_url, trust_score, demographics_score, views_score)
        `)
        .eq("campaign_id", campaignId);
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const fetchCampaignTransactions = async () => {
    if (!selectedCampaignId) return;
    setLoadingTransactions(true);
    try {
      const { data: transactions, error } = await supabase
        .from("wallet_transactions")
        .select('*')
        .contains('metadata', { campaign_id: selectedCampaignId })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!transactions || transactions.length === 0) {
        setCampaignTransactions([]);
        return;
      }

      const userIds = [...new Set(transactions.map(t => t.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select('id, username, avatar_url')
        .in('id', userIds);

      const { data: analyticsData } = await supabase
        .from("campaign_account_analytics")
        .select('user_id, account_username, platform')
        .eq('campaign_id', selectedCampaignId)
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const analyticsMap = new Map(analyticsData?.map(a => [a.user_id, a]) || []);
      
      setCampaignTransactions(transactions.map(tx => ({
        ...tx,
        profiles: profileMap.get(tx.user_id) || null,
        shortimize_account: analyticsMap.get(tx.user_id) || null
      })));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchCampaignUsers = async () => {
    if (!selectedCampaignId) return;
    setLoadingCampaignUsers(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-campaign-users?campaign_id=${selectedCampaignId}`,
        { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      setCampaignUsers(result.users || []);
      toast.success(`Loaded ${result.users?.length || 0} users`);
    } catch (error: any) {
      console.error('Error fetching users:', error);
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
      const accounts = user.social_accounts || [];
      if (accounts.length === 0) {
        rows.push([
          user.profile?.username || '', user.profile?.email || '', user.profile?.full_name || '',
          user.profile?.phone_number || '', user.status || '',
          user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '',
          '', '', '', '', user.campaign_earnings || '0'
        ]);
      } else {
        accounts.forEach((account: any) => {
          rows.push([
            user.profile?.username || '', user.profile?.email || '', user.profile?.full_name || '',
            user.profile?.phone_number || '', user.status || '',
            user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '',
            account.platform || '', account.username || '', account.account_link || '',
            account.follower_count || '', user.campaign_earnings || '0'
          ]);
        });
      }
    });
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `campaign-users-${selectedCampaignId}.csv`;
    a.click();
    toast.success('Exported users to CSV');
  };

  const fetchVideos = async (collection: string, forceRefresh = false) => {
    if (!brandId || !collection.trim()) {
      toast.error('Please enter a collection name');
      return;
    }
    if (!forceRefresh) {
      const cached = localStorage.getItem(VIDEOS_CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp, collection: c } = JSON.parse(cached);
          if (c === collection && isCacheValid(timestamp)) {
            setVideos(data);
            setLastVideosFetch(new Date(timestamp));
            toast.info('Loaded from cache');
            return;
          }
        } catch (e) {}
      }
    }
    setLoadingVideos(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-shortimize-videos', {
        body: { brandId, collectionName: collection }
      });
      if (error) throw new Error(error.message);
      if (!data || data.error) throw new Error(data?.error || 'Failed to fetch');
      
      const videosData = Array.isArray(data) ? data : [];
      setVideos(videosData);
      const timestamp = new Date().toISOString();
      setLastVideosFetch(new Date(timestamp));
      localStorage.setItem(VIDEOS_CACHE_KEY, JSON.stringify({ data: videosData, timestamp, collection }));
      toast.success(`Loaded ${videosData.length} videos`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to load videos');
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchVideoHistory = async (video: any) => {
    setSelectedVideo(video);
    setVideoHistoryOpen(true);
    setLoadingVideoHistory(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-video-history', {
        body: { brandId, adId: video.ad_id }
      });
      if (error) throw error;
      setVideoHistory(data?.history || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load history');
      setVideoHistory([]);
    } finally {
      setLoadingVideoHistory(false);
    }
  };

  const handleEditBudgetUsed = async () => {
    setLoadingBudget(true);
    setEditBudgetDialogOpen(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("budget_used")
        .eq("id", selectedCampaignId)
        .single();
      if (error) throw error;
      setCurrentBudgetUsed(data?.budget_used || 0);
      setEditingBudgetUsed(String(data?.budget_used || 0));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch budget');
    } finally {
      setLoadingBudget(false);
    }
  };

  const handleSaveBudgetUsed = async () => {
    const newValue = parseFloat(editingBudgetUsed);
    if (isNaN(newValue) || newValue < 0) {
      toast.error('Enter a valid positive number');
      return;
    }
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ budget_used: newValue })
        .eq("id", selectedCampaignId);
      if (error) throw error;
      
      const adjustment = newValue - currentBudgetUsed;
      if (adjustment !== 0) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("wallet_transactions").insert({
          user_id: user?.id || '',
          type: 'balance_correction',
          amount: Math.abs(adjustment),
          status: 'completed',
          description: `Manual budget adjustment for campaign`,
          metadata: {
            campaign_id: selectedCampaignId,
            adjustment_type: 'manual_budget_update',
            campaign_budget_before: currentBudgetUsed,
            campaign_budget_after: newValue,
            adjustment_amount: adjustment
          }
        });
      }
      
      toast.success('Budget updated');
      setEditBudgetDialogOpen(false);
      fetchCampaign();
      fetchCampaignTransactions();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update budget');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-background">
        <div className="hidden md:block w-64 h-screen bg-card/30 p-4 space-y-4 shrink-0">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
        <div className="flex-1 p-6 md:p-8">
          <Skeleton className="h-8 w-48 mb-6 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCampaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Campaign not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <ManageSidebar 
        campaigns={allCampaigns}
        currentCampaign={selectedCampaign}
        brandName={currentBrandName}
        brandLogo={brandLogo}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 pt-16 md:pt-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          {/* Header with Stats */}
          <DashboardHeader 
            campaign={selectedCampaign}
            creatorCount={approvedSubmissions.length}
            isAdmin={isAdmin}
            onEditBudget={handleEditBudgetUsed}
          />

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'analytics' && (
              <CampaignAnalyticsTable 
                campaignId={selectedCampaign.id}
                onPaymentComplete={() => fetchCampaignTransactions()}
              />
            )}

            {activeTab === 'videos' && (
              <VideosPanel
                videos={videos}
                loading={loadingVideos}
                collectionName={collectionName}
                lastFetch={lastVideosFetch}
                rpmRate={selectedCampaign.rpm_rate}
                onCollectionChange={setCollectionName}
                onFetch={(force) => fetchVideos(collectionName, force)}
                onVideoClick={fetchVideoHistory}
              />
            )}

            {activeTab === 'users' && (
              <UsersPanel
                users={campaignUsers}
                loading={loadingCampaignUsers}
                onRefresh={fetchCampaignUsers}
                onExport={exportCampaignUsers}
              />
            )}

            {activeTab === 'payouts' && (
              <PayoutsPanel
                transactions={campaignTransactions}
                loading={loadingTransactions}
              />
            )}
          </div>
        </div>
      </main>

      {/* Edit Budget Dialog */}
      <Dialog open={editBudgetDialogOpen} onOpenChange={setEditBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget Used</DialogTitle>
            <DialogDescription>Update the budget used for this campaign</DialogDescription>
          </DialogHeader>
          {loadingBudget ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
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
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Change: </span>
                    <span className={parseFloat(editingBudgetUsed) - currentBudgetUsed >= 0 ? "text-green-500" : "text-red-500"}>
                      {parseFloat(editingBudgetUsed) - currentBudgetUsed >= 0 ? "+" : ""}
                      ${(parseFloat(editingBudgetUsed) - currentBudgetUsed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBudgetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBudgetUsed} disabled={loadingBudget}>Save</Button>
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
