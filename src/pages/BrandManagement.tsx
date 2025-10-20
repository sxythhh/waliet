import { useParams } from "react-router-dom";
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
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import { Skeleton } from "@/components/ui/skeleton";
interface Campaign {
  id: string;
  title: string;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  preview_url: string | null;
  analytics_url: string | null;
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
export default function BrandManagement() {
  const {
    slug
  } = useParams();
  const {
    isAdmin,
    loading: adminLoading
  } = useAdminCheck();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandId, setBrandId] = useState<string>("");
  const [brandType, setBrandType] = useState<string>("");
  const [assetsUrl, setAssetsUrl] = useState("");
  const [homeUrl, setHomeUrl] = useState("");
  const [accountUrl, setAccountUrl] = useState("");
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
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [userToKick, setUserToKick] = useState<Submission | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const sidebar = useSidebar();
  const isMobile = useIsMobile();
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
  useEffect(() => {
    fetchCampaigns();
  }, [slug]);
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
      const {
        data,
        error
      } = await supabase.from("wallet_transactions").select("*").contains('metadata', {
        campaign_id: selectedCampaignId
      }).eq('type', 'earning').order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((t: any) => t.user_id))];
        const {
          data: profiles
        } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
        const transactionsWithProfiles = data.map((txn: any) => ({
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
  const fetchCampaigns = async () => {
    if (!slug) return;
    try {
      const {
        data: brandData,
        error: brandError
      } = await supabase.from("brands").select("id, assets_url, home_url, account_url, brand_type").eq("slug", slug).maybeSingle();
      if (brandError) throw brandError;
      if (!brandData) return;
      setBrandId(brandData.id);
      setAssetsUrl(brandData.assets_url || "");
      setHomeUrl(brandData.home_url || "");
      setAccountUrl(brandData.account_url || "");
      setBrandType(brandData.brand_type || "");
      const {
        data,
        error
      } = await supabase.from("campaigns").select("id, title, budget, budget_used, rpm_rate, status, banner_url, preview_url, analytics_url").eq("brand_id", brandData.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setCampaigns(data || []);
      if (data && data.length > 0) {
        setSelectedCampaignId(data[0].id);
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

      // Show all pending and approved submissions
      // Filter out only rejected and withdrawn submissions
      const filteredData = (data || []).filter(submission => {
        return submission.status === 'approved' || submission.status === 'pending';
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
        brand_type: brandType || null
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get current budget_used before update
      const { data: currentCampaign } = await supabase
        .from("campaigns")
        .select("budget_used, title")
        .eq("id", selectedCampaignId)
        .single();

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
      const { error: txnError } = await supabase.from("wallet_transactions").insert({
        user_id: session.user.id, // Admin who made the change
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
      const { data: campaignBefore } = await supabase
        .from("campaigns")
        .select("budget_used, budget")
        .eq("id", selectedCampaignId)
        .single();

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
      const { error } = await supabase
        .from("campaign_submissions")
        .update({ status: "withdrawn" })
        .eq("id", userToKick.id);
      
      if (error) throw error;
      
      toast.success(`Removed ${userToKick.profiles?.username} from campaign`);
      setKickDialogOpen(false);
      setUserToKick(null);
      fetchSubmissions();
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Failed to remove user from campaign");
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
    
    if (sortOrder) {
      return [...filtered].sort((a, b) => {
        const aPaid = transactions
          .filter(txn => txn.user_id === a.creator_id)
          .reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
        const bPaid = transactions
          .filter(txn => txn.user_id === b.creator_id)
          .reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
        
        return sortOrder === 'desc' ? bPaid - aPaid : aPaid - bPaid;
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
  if (loading || adminLoading) {
    return <div className="min-h-screen p-8 bg-[#0C0C0C]">
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
    return <div className="min-h-screen p-8 bg-background flex items-center justify-center">
        <div className="text-foreground">No campaigns found</div>
      </div>;
  }
  return <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={() => isMobile ? sidebar.setOpenMobile(true) : sidebar.toggleSidebar()} className="text-muted-foreground hover:text-foreground hover:bg-accent">
            {isMobile ? <Menu className="h-6 w-6" /> : <PanelLeft className="h-6 w-6" />}
          </Button>
        </div>
        {/* Campaign Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 font-instrument tracking-tight">{selectedCampaign?.title}</h1>
            {campaigns.length > 1 && <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {isAdmin && <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Campaign
              </Button>}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="bg-[#0C0C0C] border">
            <TabsTrigger value="analytics" className="data-[state=active]:bg-card">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="creators" className="data-[state=active]:bg-card">
              Creators
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-card">
              Applications
              {pendingSubmissions.length > 0 && <Badge className="ml-2 bg-primary">{pendingSubmissions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-card">
              Videos
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-card">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {/* Campaign Performance Overview */}
            <Card className="bg-card border">
              <CardHeader className="flex flex-row items-center justify-between py-[9px]">
                <CardTitle className="text-2xl">Performance Overview</CardTitle>
                {selectedCampaign?.analytics_url && <Button variant="ghost" size="sm" onClick={() => window.open(selectedCampaign.analytics_url!, '_blank')} className="group bg-muted">
                    <span className="relative">
                      View Analytics
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    </span>
                  </Button>}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-[#0d0d0d]">
                    <div className="text-2xl font-bold font-chakra">
                      {(() => {
                      // Group by account and sum views across all date ranges
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
                      // Get unique accounts
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
                      {isAdmin && <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground hover:bg-accent p-0" onClick={handleEditBudgetUsed} title="Edit budget used">
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

            <div className="flex justify-end gap-2">
              <ImportCampaignStatsDialog campaignId={selectedCampaignId} onImportComplete={fetchSubmissions} onMatchingRequired={() => setMatchDialogOpen(true)} />
            </div>
            
            {/* Imported Analytics Data */}
            <CampaignAnalyticsTable campaignId={selectedCampaignId} onPaymentComplete={handleRefresh} />
            
            {/* Matching Dialog */}
            <MatchAccountsDialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen} campaignId={selectedCampaignId} onMatchComplete={fetchSubmissions} />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              {/* Views by Platform - Pie Chart */}
              <Card className="bg-[#202020] border-transparent">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Views by Platform</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {(() => {
                    const platformData = analytics.reduce((acc: any[], account) => {
                      const existing = acc.find(item => item.platform === account.platform);
                      if (existing) {
                        existing.views += account.total_views;
                      } else {
                        acc.push({
                          platform: account.platform,
                          views: account.total_views
                        });
                      }
                      return acc;
                    }, []);
                    const COLORS: Record<string, string> = {
                      tiktok: '#EF4444',
                      instagram: '#A855F7',
                      youtube: '#EF4444'
                    };
                    if (platformData.length === 0) {
                      return <div className="h-full flex items-center justify-center text-white/40 text-sm">
                            No platform data available
                          </div>;
                    }
                    const totalViews = platformData.reduce((sum, item) => sum + item.views, 0);
                    return <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={platformData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="views" nameKey="platform" stroke="none">
                              {platformData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.platform.toLowerCase()] || '#22C55E'} className="transition-opacity hover:opacity-80" />)}
                            </Pie>
                            <Tooltip contentStyle={{
                          backgroundColor: "#0C0C0C",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 12px"
                        }} labelStyle={{
                          color: "#ffffff",
                          fontFamily: "Inter, sans-serif",
                          fontSize: "12px",
                          fontWeight: 500,
                          textTransform: "capitalize"
                        }} itemStyle={{
                          color: "#ffffff",
                          fontFamily: "Inter, sans-serif",
                          fontSize: "12px"
                        }} formatter={(value: number) => [`${value.toLocaleString()} views (${(value / totalViews * 100).toFixed(1)}%)`, '']} />
                            <Legend verticalAlign="bottom" height={36} formatter={value => <span className="text-white/70 text-xs capitalize">{value}</span>} iconType="circle" iconSize={8} />
                          </PieChart>
                        </ResponsiveContainer>;
                  })()}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Spend - Bar Chart */}
              <Card className="bg-[#0C0C0C] border-transparent">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Daily Spend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {(() => {
                    // Generate last 7 days
                    const last7Days = Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - i));
                      return {
                        date: date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        }),
                        spend: 0
                      };
                    });

                    // Map transaction data to the 7 days
                    transactions.forEach(txn => {
                      const txnDate = new Date(txn.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      });
                      const dayData = last7Days.find(day => day.date === txnDate);
                      if (dayData) {
                        dayData.spend += Number(txn.amount);
                      }
                    });

                    const sortedData = last7Days;
                    if (sortedData.length === 0) {
                      return <div className="h-full flex items-center justify-center text-white/40 text-sm">
                            No spending data available
                          </div>;
                    }
                    return <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sortedData}>
                            <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.4)" fontSize={12} tickLine={false} axisLine={false} style={{
                          opacity: 0.6
                        }} />
                            <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `$${value}`} style={{
                          opacity: 0.6
                        }} />
                            <Tooltip contentStyle={{
                          backgroundColor: "#0C0C0C",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          padding: "8px 12px"
                        }} labelStyle={{
                          color: "#ffffff",
                          fontFamily: "Inter, sans-serif",
                          fontSize: "12px",
                          fontWeight: 500
                        }} itemStyle={{
                          color: "#ffffff",
                          fontFamily: "Inter, sans-serif",
                          fontSize: "12px"
                        }} formatter={(value: number) => `$${value.toFixed(2)}`} cursor={{
                          fill: "rgba(255, 255, 255, 0.05)"
                        }} />
                            <Bar dataKey="spend" fill="#22C55E" radius={[8, 8, 0, 0]} name="Spent" />
                          </BarChart>
                        </ResponsiveContainer>;
                  })()}
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Creators Tab */}
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
                  <Input
                    type="text"
                    placeholder="Search by name or account username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {approvedSubmissions.length === 0 ? <div className="text-center py-12">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-sm">No active creators yet</p>
                  </div> : <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground font-medium">Creator</TableHead>
                          <TableHead className="text-muted-foreground font-medium">Linked Accounts</TableHead>
                          <TableHead className="text-muted-foreground font-medium">
                            <button
                              onClick={() => {
                                if (sortOrder === null) setSortOrder('desc');
                                else if (sortOrder === 'desc') setSortOrder('asc');
                                else setSortOrder(null);
                              }}
                              className="flex items-center gap-2 hover:text-foreground transition-colors"
                            >
                              Total Paid
                              {sortOrder === null && <ArrowUpDown className="h-4 w-4" />}
                              {sortOrder === 'desc' && <ArrowDown className="h-4 w-4" />}
                              {sortOrder === 'asc' && <ArrowUp className="h-4 w-4" />}
                            </button>
                          </TableHead>
                          <TableHead className="text-muted-foreground font-medium text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedSubmissions.map(submission => {
                      const getPlatformIcon = (platform: string) => {
                        switch (platform.toLowerCase()) {
                          case 'tiktok':
                            return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />;
                          case 'instagram':
                            return <img src={instagramLogo} alt="Instagram" className="w-4 h-4" />;
                          case 'youtube':
                            return <img src={youtubeLogo} alt="YouTube" className="w-4 h-4" />;
                          default:
                            return null;
                        }
                      };
                      return <TableRow key={submission.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              {/* Creator Column */}
                              <TableCell className="py-4">
                                <div 
                                  className="flex items-center gap-3 cursor-pointer group" 
                                  onClick={() => {
                                    setSelectedUser(submission);
                                    setIsUserDialogOpen(true);
                                  }}
                                >
                                  {submission.profiles?.avatar_url ? <img src={submission.profiles.avatar_url} alt={submission.profiles.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-border" /> : <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-border">
                                      <span className="text-primary font-semibold text-lg">
                                        {submission.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                                      </span>
                                    </div>}
                                  <div className="space-y-1">
                                    <p className="font-semibold text-foreground group-hover:underline transition-all">
                                      {submission.profiles?.username || "Unknown"}
                                    </p>
                                    {/* Trust Score */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground tracking-[-0.5px]">Trust:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-foreground tracking-[-0.5px]">100%</span>
                                        <div className="flex items-center gap-0.5">
                                          {[...Array(5)].map((_, i) => (
                                            <Diamond
                                              key={i}
                                              className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500"
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Linked Accounts Column */}
                              <TableCell className="py-4">
                                {submission.profiles?.social_accounts && submission.profiles.social_accounts.length > 0 ? <div className="flex flex-wrap gap-1.5">
                                    {submission.profiles.social_accounts.map(account => <a key={account.id} href={account.account_link || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0d0d0d] hover:bg-[#1a1a1a] transition-colors text-xs group">
                                        {getPlatformIcon(account.platform)}
                                        <span className="font-medium text-foreground group-hover:underline transition-all">
                                          {account.username}
                                        </span>
                                        {account.follower_count > 0 && <span className="text-muted-foreground">
                                            {account.follower_count.toLocaleString()}
                                          </span>}
                                      </a>)}
                                  </div> : <span className="text-muted-foreground text-sm">No accounts</span>}
                              </TableCell>

                              {/* Total Paid Column */}
                              <TableCell className="py-4">
                                {(() => {
                                  const creatorTransactions = transactions.filter(
                                    txn => txn.user_id === submission.creator_id
                                  );
                                  const totalPaid = creatorTransactions.reduce(
                                    (sum, txn) => sum + Number(txn.amount || 0),
                                    0
                                  );
                                  return (
                                    <div className="font-semibold text-foreground">
                                      ${totalPaid.toFixed(2)}
                                    </div>
                                  );
                                })()}
                              </TableCell>

                              {/* Actions Column */}
                              <TableCell className="py-4">
                                <div className="flex justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setUserToKick(submission);
                                      setKickDialogOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                                  >
                                    <Hammer className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>;
                    })}
                      </TableBody>
                    </Table>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card className="bg-[#0C0C0C] border-0">
              <CardHeader className="pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    Pending Applications
                    <Badge variant="secondary" className="ml-2 bg-white/10 text-white">
                      {pendingSubmissions.length}
                    </Badge>
                  </CardTitle>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type="text"
                    placeholder="Search by name or account username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#1C1C1C] border-0 text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingSubmissions.length === 0 ? <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-3 text-white/20" />
                    <p className="text-white/40 text-sm">No pending applications</p>
                  </div> : <div className="space-y-3">
                    {pendingSubmissions.map(submission => {
                  const getPlatformIcon = (platform: string) => {
                    switch (platform.toLowerCase()) {
                      case 'tiktok':
                        return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />;
                      case 'instagram':
                        return <img src={instagramLogo} alt="Instagram" className="w-4 h-4" />;
                      case 'youtube':
                        return <img src={youtubeLogo} alt="YouTube" className="w-4 h-4" />;
                      default:
                        return null;
                    }
                  };
                  return <Card key={submission.id} className="bg-[#1C1C1C] border-0 hover:bg-[#242424] transition-colors">
                          <CardContent className="p-0">
                            <div className="p-5">
                              {/* Application Q&A Section */}
                              {submission.application_answers && submission.application_answers.length > 0 && <div className="mb-4 space-y-3">
                                  {submission.application_answers.map((qa, index) => <div key={index} className="bg-[#0C0C0C] rounded-lg p-3 border border-white/5">
                                      <p className="text-xs font-medium text-white/60 mb-1.5">{qa.question}</p>
                                      <p className="text-sm text-white">{qa.answer}</p>
                                    </div>)}
                                </div>}

                              {/* Header Section */}
                              <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-start gap-3 flex-1">
                                  {/* Avatar */}
                                  <div className="flex-shrink-0">
                                    {submission.profiles?.avatar_url ? <img src={submission.profiles.avatar_url} alt={submission.profiles.username} className="w-14 h-14 rounded-full object-cover" /> : <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Users className="h-7 w-7 text-primary" />
                                      </div>}
                                  </div>

                                  {/* Creator Info */}
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-white text-lg mb-1">
                                      {submission.profiles?.username || "Unknown"}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                      <span>Applied {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}</span>
                                      
                                    
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 flex-shrink-0">
                                  <Button size="sm" onClick={() => handleApplicationAction(submission.id, "approved")} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 h-9 px-4" disabled={processingSubmissionId === submission.id}>
                                    {processingSubmissionId === submission.id ? <>
                                        <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                                        Processing...
                                      </> : <>
                                        <Check className="h-4 w-4 mr-1.5" />
                                        Approve
                                      </>}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleApplicationAction(submission.id, "rejected")} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-0 h-9 px-4" disabled={processingSubmissionId === submission.id}>
                                    <X className="h-4 w-4 mr-1.5" />
                                    Reject
                                  </Button>
                                </div>
                              </div>

                              {/* Social Accounts */}
                              {submission.profiles?.social_accounts && submission.profiles.social_accounts.length > 0 && <div className="mb-4">
                                  <h4 className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Linked Accounts</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {submission.profiles.social_accounts.map(account => <a key={account.id} href={account.account_link || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0C0C0C] hover:bg-[#2a2a2a] transition-all group border border-white/5">
                                        {getPlatformIcon(account.platform)}
                                        <span className="text-sm font-medium text-white group-hover:underline">
                                          @{account.username}
                                        </span>
                                        {account.follower_count > 0 && <Badge variant="secondary" className="ml-1 bg-white/5 text-white/70 text-xs border-0">
                                            {account.follower_count.toLocaleString()}
                                          </Badge>}
                                      </a>)}
                                  </div>
                                </div>}

                            </div>
                          </CardContent>
                        </Card>;
                })}
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-[#202020] ">
              <CardHeader>
                <CardTitle className="text-white">Brand Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isAdmin && <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-500 text-sm">
                      Only administrators can edit brand settings
                    </p>
                  </div>}

                <div className="space-y-2">
                  <Label htmlFor="brand-type" className="text-white">
                    Brand Type
                  </Label>
                  <Select value={brandType} onValueChange={setBrandType} disabled={!isAdmin}>
                    <SelectTrigger className="bg-[#191919] border-white/10 text-white">
                      <SelectValue placeholder="Select brand type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-white/10">
                      <SelectItem value="Standard" className="text-white hover:bg-white/10">
                        Standard
                      </SelectItem>
                      <SelectItem value="DWY" className="text-white hover:bg-white/10">
                        DWY (Do With You)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-white/60">
                    DWY brands have access to the Training portal
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assets-url" className="text-white">
                    Assets Page URL
                  </Label>
                  <Input id="assets-url" type="url" placeholder="https://example.com/assets" value={assetsUrl} onChange={e => setAssetsUrl(e.target.value)} className="bg-[#191919] border-white/10 text-white" disabled={!isAdmin} />
                  <p className="text-sm text-white/60">
                    This URL will be embedded when users visit the Assets page
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="home-url" className="text-white">
                    Home Page HTML (DWY Brands Only)
                  </Label>
                  <Textarea id="home-url" placeholder='<iframe src="https://example.com" width="100%" height="100%" frameborder="0" allowfullscreen />' value={homeUrl} onChange={e => setHomeUrl(e.target.value)} className="bg-[#191919] border-white/10 text-white font-mono min-h-[120px]" disabled={!isAdmin} />
                  <p className="text-sm text-white/60">
                    For DWY brands, paste HTML code (like iframe) to embed on the Home page instead of the default dashboard
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-url" className="text-white">
                    Invoice Page URL
                  </Label>
                  <Input id="account-url" type="url" placeholder="https://example.com/invoices" value={accountUrl} onChange={e => setAccountUrl(e.target.value)} className="bg-[#191919] border-white/10 text-white" disabled={!isAdmin} />
                  <p className="text-sm text-white/60">
                    This URL will be embedded in the Invoices tab
                  </p>
                </div>

                <Button onClick={handleSaveUrls} disabled={savingUrls || !isAdmin} className="bg-primary hover:bg-primary/90">
                  {savingUrls ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos">
            <VideosTab 
              campaignId={selectedCampaignId}
              isAdmin={isAdmin}
              approvedCreators={approvedSubmissions}
            />
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-[#202020] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Campaign?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete <strong className="text-white">{selectedCampaign?.title}</strong> and
                all associated submissions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Budget Used Dialog */}
        <AlertDialog open={editBudgetDialogOpen} onOpenChange={setEditBudgetDialogOpen}>
          <AlertDialogContent className="bg-[#2a2a2a] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Edit Budget Used</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                Update the used budget for this campaign.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="budget-used" className="text-white">
                  Budget Used ($)
                </Label>
                <Input id="budget-used" type="number" step="0.01" min="0" value={editingBudgetUsed} onChange={e => setEditingBudgetUsed(e.target.value)} className="bg-[#191919] border-white/10 text-white" placeholder="0.00" />
                <p className="text-sm text-white/40">
                  Total budget: ${selectedCampaign?.budget || 0}
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleSaveBudgetUsed} className="bg-primary hover:bg-primary/90">
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete All Analytics Dialog */}
        <AlertDialog open={deleteAnalyticsDialogOpen} onOpenChange={setDeleteAnalyticsDialogOpen}>
          <AlertDialogContent className="bg-[#202020] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete All Analytics?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete all analytics data for this campaign. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAllAnalytics} className="bg-destructive hover:bg-destructive/90">
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="bg-[#202020] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Pay Creator</DialogTitle>
              <DialogDescription className="text-white/60">
                Enter the amount to pay to {selectedUserForPayment?.profiles?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount" className="text-white">Amount ($)</Label>
                <Input id="payment-amount" type="number" step="0.01" min="0" placeholder="0.00" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="bg-[#191919] border-white/10 text-white" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePayCreator} className="bg-green-500 hover:bg-green-600">
                Confirm Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Kick User Confirmation Dialog */}
        <AlertDialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
          <AlertDialogContent className="bg-[#202020] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Remove User from Campaign?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                Are you sure you want to remove {userToKick?.profiles?.username} from this campaign? This action will mark their submission as withdrawn.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleKickUser} className="bg-destructive hover:bg-destructive/90">
                Remove User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* User Details Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Creator Details</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6 mt-4">
              {/* User Profile Section */}
              <div className="flex items-center gap-4 pb-6">
                {selectedUser.profiles?.avatar_url ? (
                  <img 
                    src={selectedUser.profiles.avatar_url} 
                    alt={selectedUser.profiles.username} 
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-primary"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary">
                    <span className="text-primary font-semibold text-3xl">
                      {selectedUser.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {selectedUser.profiles?.username || "Unknown User"}
                  </h3>
                  {selectedUser.profiles?.email && (
                    <p className="text-sm text-muted-foreground">{selectedUser.profiles.email}</p>
                  )}
                  
                  {/* Trust Score */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground tracking-[-0.5px]">Trust Score:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white tracking-[-0.5px]">100%</span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Diamond
                            key={i}
                            className="w-3 h-3 fill-emerald-500 text-emerald-500"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Accounts Section */}
              {selectedUser.profiles?.social_accounts && selectedUser.profiles.social_accounts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Connected Accounts</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedUser.profiles.social_accounts.map((account: any) => (
                      <a
                        key={account.id}
                        href={account.account_link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-[#111111] hover:bg-[#1a1a1a] transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          {(() => {
                            switch (account.platform.toLowerCase()) {
                              case 'tiktok':
                                return <img src={tiktokLogo} alt="TikTok" className="w-5 h-5" />;
                              case 'instagram':
                                return <img src={instagramLogo} alt="Instagram" className="w-5 h-5" />;
                              case 'youtube':
                                return <img src={youtubeLogo} alt="YouTube" className="w-5 h-5" />;
                              default:
                                return null;
                            }
                          })()}
                          <div>
                            <p className="font-medium text-white group-hover:underline">
                              @{account.username}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                          </div>
                        </div>
                        {account.follower_count > 0 && (
                          <span className="text-sm font-semibold text-white">
                            {account.follower_count.toLocaleString()} followers
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Campaign Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#111111]">
                  <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                  <p className="text-xl font-bold text-white">
                    ${selectedUser.total_paid?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[#111111]">
                  <p className="text-xs text-muted-foreground mb-1">Videos Submitted</p>
                  <p className="text-xl font-bold text-white">
                    {selectedUser.video_count || 0}
                  </p>
                </div>
              </div>

              {/* Application Status */}
              {selectedUser.status && (
                <div className="p-4 rounded-lg bg-[#111111]">
                  <p className="text-xs text-muted-foreground mb-2">Application Status</p>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize"
                      style={{
                        backgroundColor: selectedUser.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 
                                       selectedUser.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 
                                       'rgba(234, 179, 8, 0.1)',
                        color: selectedUser.status === 'approved' ? 'rgb(34, 197, 94)' : 
                             selectedUser.status === 'rejected' ? 'rgb(239, 68, 68)' : 
                             'rgb(234, 179, 8)'
                      }}
                    >
                      {selectedUser.status}
                    </div>
                    {selectedUser.status === 'approved' && selectedUser.submitted_at && (
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(selectedUser.submitted_at), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>;
}