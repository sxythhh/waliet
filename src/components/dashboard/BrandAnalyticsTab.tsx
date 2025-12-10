import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CampaignAnalyticsTable } from "@/components/CampaignAnalyticsTable";
import { DashboardHeader } from "@/components/manage/DashboardHeader";
import { UsersPanel } from "@/components/manage/UsersPanel";
import { PayoutsPanel } from "@/components/manage/PayoutsPanel";
import { VideosPanel } from "@/components/manage/VideosPanel";
import { VideoHistoryDialog } from "@/components/VideoHistoryDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BarChart3, Users, DollarSign, Video } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
}

interface BrandAnalyticsTabProps {
  brandId: string;
}

export function BrandAnalyticsTab({ brandId }: BrandAnalyticsTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAdminCheck();
  
  const campaignId = searchParams.get("campaign");
  const subTab = searchParams.get("subtab") || "analytics";
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Submissions state
  const [submissions, setSubmissions] = useState<any[]>([]);
  
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

  useEffect(() => {
    fetchCampaigns();
  }, [brandId]);

  useEffect(() => {
    if (campaignId && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        setSelectedCampaign(campaign);
        fetchCampaignData(campaignId);
      }
    }
  }, [campaignId, campaigns]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, budget, budget_used, rpm_rate, status")
        .eq("brand_id", brandId)
        .order("title");
      
      if (error) throw error;
      setCampaigns(data || []);
      
      // If campaign param exists, select it
      if (campaignId && data) {
        const campaign = data.find(c => c.id === campaignId);
        if (campaign) setSelectedCampaign(campaign);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignData = async (campId: string) => {
    fetchSubmissions(campId);
    fetchCampaignTransactions(campId);
  };

  const fetchSubmissions = async (campId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaign_submissions")
        .select(`
          id, status, views, earnings, submitted_at, reviewed_at, creator_id,
          profiles!campaign_submissions_creator_id_fkey (username, avatar_url)
        `)
        .eq("campaign_id", campId);
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const fetchCampaignTransactions = async (campId: string) => {
    setLoadingTransactions(true);
    try {
      const { data: transactions, error } = await supabase
        .from("wallet_transactions")
        .select('*')
        .contains('metadata', { campaign_id: campId })
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

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      setCampaignTransactions(transactions.map(tx => ({
        ...tx,
        profiles: profileMap.get(tx.user_id) || null
      })));
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchCampaignUsers = async () => {
    if (!campaignId) return;
    setLoadingCampaignUsers(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-campaign-users?campaign_id=${campaignId}`,
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
    a.download = `campaign-users-${campaignId}.csv`;
    a.click();
    toast.success('Exported users to CSV');
  };

  const handleEditBudgetUsed = async () => {
    if (!campaignId) return;
    setLoadingBudget(true);
    setEditBudgetDialogOpen(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("budget_used")
        .eq("id", campaignId)
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
    if (!campaignId) return;
    const newValue = parseFloat(editingBudgetUsed);
    if (isNaN(newValue) || newValue < 0) {
      toast.error('Enter a valid positive number');
      return;
    }
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ budget_used: newValue })
        .eq("id", campaignId);
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
            campaign_id: campaignId,
            adjustment_type: 'manual_budget_update',
            campaign_budget_before: currentBudgetUsed,
            campaign_budget_after: newValue,
            adjustment_amount: adjustment
          }
        });
      }
      
      toast.success('Budget updated');
      setEditBudgetDialogOpen(false);
      fetchCampaigns();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update budget');
    }
  };

  const handleBackToCampaigns = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("campaign");
    newParams.delete("subtab");
    newParams.set("tab", "campaigns");
    setSearchParams(newParams);
  };

  const handleSubTabChange = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("subtab", tab);
    setSearchParams(newParams);
    
    if (tab === 'users' && campaignUsers.length === 0 && !loadingCampaignUsers) {
      fetchCampaignUsers();
    }
  };

  const approvedSubmissions = submissions.filter(s => s.status === 'approved');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!campaignId || !selectedCampaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Select a Campaign</h2>
        <p className="text-muted-foreground mb-4">Click on a campaign in the Campaigns tab to view analytics</p>
        <Button variant="outline" onClick={handleBackToCampaigns}>
          Go to Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBackToCampaigns}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <Select value={campaignId} onValueChange={(id) => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set("campaign", id);
            setSearchParams(newParams);
          }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Campaign Stats */}
      <DashboardHeader 
        campaign={selectedCampaign}
        creatorCount={approvedSubmissions.length}
        isAdmin={isAdmin}
        onEditBudget={handleEditBudgetUsed}
      />

      {/* Sub Navigation */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {[
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'payouts', label: 'Payouts', icon: DollarSign },
          { id: 'videos', label: 'Videos', icon: Video },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleSubTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              subTab === tab.id 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {subTab === 'analytics' && (
          <CampaignAnalyticsTable 
            campaignId={campaignId}
            onPaymentComplete={() => fetchCampaignTransactions(campaignId)}
          />
        )}

        {subTab === 'videos' && (
          <VideosPanel
            videos={videos}
            loading={loadingVideos}
            collectionName={collectionName}
            lastFetch={lastVideosFetch}
            rpmRate={selectedCampaign.rpm_rate}
            onCollectionChange={setCollectionName}
            onFetch={(force) => {/* fetchVideos logic */}}
            onVideoClick={(video) => {/* fetchVideoHistory logic */}}
          />
        )}

        {subTab === 'users' && (
          <UsersPanel
            users={campaignUsers}
            loading={loadingCampaignUsers}
            onRefresh={fetchCampaignUsers}
            onExport={exportCampaignUsers}
          />
        )}

        {subTab === 'payouts' && (
          <PayoutsPanel
            transactions={campaignTransactions}
            loading={loadingTransactions}
          />
        )}
      </div>

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
