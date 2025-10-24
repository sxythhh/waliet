import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { DollarSign, Search, Users as UsersIcon, Wallet, Upload, FileDown, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, TrendingUp, Image as ImageIcon, BadgeCheck, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  total_earnings: number;
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
  };
}
export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [campaignPopoverOpen, setCampaignPopoverOpen] = useState(false);
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
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchData();
    fetchSubmissions();
  }, []);
  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, selectedCampaign, users, sortField, sortOrder]);
  const fetchData = async () => {
    setLoading(true);

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
    });
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
  };
  const filterUsers = async () => {
    let filtered = users;

    // Search filter - search by Virality username, full name, or social account username
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        // Search in profile username and full name
        const matchesProfile = user.username?.toLowerCase().includes(query) || user.full_name?.toLowerCase().includes(query);

        // Search in social account usernames
        const matchesSocialAccount = user.social_accounts?.some(account => account.username?.toLowerCase().includes(query));
        return matchesProfile || matchesSocialAccount;
      });
    }

    // Campaign filter
    if (selectedCampaign !== "all") {
      const {
        data: submissions
      } = await supabase.from("campaign_submissions").select("creator_id").eq("campaign_id", selectedCampaign);
      if (submissions) {
        const creatorIds = submissions.map(s => s.creator_id);
        filtered = filtered.filter(user => creatorIds.includes(user.id));
      }
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

    setFilteredUsers(filtered);
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
    }).limit(10);
    
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
          campaign_id: selectedCampaignForAdd
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
    const {
      data,
      error
    } = await supabase.from("demographic_submissions").select(`
        *,
        social_accounts (
          id,
          platform,
          username,
          user_id
        )
      `).order("submitted_at", {
      ascending: false
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch submissions"
      });
    } else {
      setSubmissions(data || []);
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
    totalUsers: users.length,
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
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading users...</p>
      </div>;
  }
  return <div className="p-8 space-y-6 px-[20px] py-px">
      <Tabs defaultValue="users" className="space-y-6 py-[7px]">
        <TabsList className="bg-card border-0">
          <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Users ({stats.totalUsers})
          </TabsTrigger>
          <TabsTrigger value="demographics" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Demographics ({pendingSubmissions.length} pending)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          
      {/* Stats */}
      

      {/* Filters */}
      <Card className="bg-card border-0 mt-6">
        <CardContent className="pt-6 px-[10px] bg-[#080808] py-0">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="search" type="text" placeholder="Search by Virality username or account username..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-[#1a1a1a] border-0 h-10" />
              </div>
            </div>
            
            <div className="w-64">
              
              <Popover open={campaignPopoverOpen} onOpenChange={setCampaignPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={campaignPopoverOpen} className="w-full justify-between mt-2 border-0 bg-[#1a1a1a]">
                    {selectedCampaign === "all" ? "All Campaigns" : campaigns.find(c => c.id === selectedCampaign)?.title}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 bg-popover z-50" align="start">
                  <Command>
                    <CommandInput placeholder="Search campaigns..." />
                    <CommandList>
                      <CommandEmpty>No campaign found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => {
                            setSelectedCampaign("all");
                            setCampaignPopoverOpen(false);
                          }}>
                          <Check className={cn("mr-2 h-4 w-4", selectedCampaign === "all" ? "opacity-100" : "opacity-0")} />
                          All Campaigns
                        </CommandItem>
                        {campaigns.map(campaign => <CommandItem key={campaign.id} value={campaign.title} onSelect={() => {
                            setSelectedCampaign(campaign.id);
                            setCampaignPopoverOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedCampaign === campaign.id ? "opacity-100" : "opacity-0")} />
                            {campaign.title}
                          </CommandItem>)}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-1 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-popover" align="end">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold mb-2 px-2">Sort by</p>
                    <Button
                      variant={sortField === "balance" ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-xs"
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
                      className="w-full justify-start text-xs"
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
                        className="w-full justify-start text-xs text-muted-foreground"
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
          </div>
        </CardContent>
      </Card>

      {/* Users Display */}
      {filteredUsers.length === 0 ? <Card className="bg-card border-0">
          <CardContent className="text-center py-12 text-muted-foreground">
            No users found
          </CardContent>
        </Card> : <Card className="bg-card border-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Connected Accounts</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map(user => {
                  const balance = user.wallets?.balance || 0;
                  const totalEarned = user.wallets?.total_earned || 0;
                  return <TableRow key={user.id} className="border-b border-border hover:bg-[#1D1D1D] cursor-pointer" onClick={() => openUserDetailsDialog(user)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <UsersIcon className="h-4 w-4 text-primary" />
                          </div>}
                        <div>
                          <p className="font-semibold">{user.username}</p>
                          {user.full_name && <p className="text-xs text-muted-foreground">{user.full_name}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.social_accounts && user.social_accounts.length > 0 ? <div className="flex flex-wrap gap-1.5">
                          {user.social_accounts.map(account => {
                            const demographicStatus = account.demographic_submissions?.[0]?.status;
                            return <div key={account.id} title={`${account.username} - ${account.follower_count.toLocaleString()} followers`} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-[#282828]/50">
                              {getPlatformIcon(account.platform)}
                              <span className="font-medium">{account.username}</span>
                              {demographicStatus === 'approved' && <BadgeCheck className="h-3 w-3 text-success fill-success/20" />}
                              {demographicStatus === 'pending' && <Clock className="h-3 w-3 text-warning fill-warning/20" />}
                              {demographicStatus === 'rejected' && <XCircle className="h-3 w-3 text-destructive fill-destructive/20" />}
                              {!demographicStatus && <AlertCircle className="h-3 w-3 text-destructive fill-destructive/20" />}
                            </div>;
                          })}
                        </div> : <span className="text-muted-foreground text-sm">No accounts</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${balance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      ${totalEarned.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={e => {
                          e.stopPropagation();
                          openAddToCampaignDialog(user);
                        }} variant="outline" className="gap-1">
                          Add to Campaign
                        </Button>
                        <Button size="sm" onClick={e => {
                          e.stopPropagation();
                          openPayDialog(user);
                        }} className="gap-1">
                          <DollarSign className="h-4 w-4" />
                          Pay
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>;
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>}

      {/* Pagination */}
      {filteredUsers.length > usersPerPage && (
        <Card className="bg-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex gap-1">
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
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
            <TabsList className="bg-card border-0">
              <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Pending ({pendingSubmissions.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Approved ({approvedSubmissions.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Rejected ({rejectedSubmissions.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending Submissions */}
            <TabsContent value="pending" className="space-y-4">
              {pendingSubmissions.length === 0 ? <Card className="bg-card border-0">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No pending submissions
                  </CardContent>
                </Card> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingSubmissions.map(submission => <Card key={submission.id} className="bg-card border-0 overflow-hidden hover:border-primary/50 transition-all cursor-pointer group" onClick={() => openReviewDialog(submission)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(submission.social_accounts.platform)}
                            <div>
                              <h3 className="font-semibold text-sm">@{submission.social_accounts.username}</h3>
                              <p className="text-xs text-muted-foreground">
                                {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })} • {new Date(submission.submitted_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" className="h-8 text-xs" onClick={e => {
                      e.stopPropagation();
                      openReviewDialog(submission);
                    }}>
                            Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>)}
                </div>}
            </TabsContent>

            {/* Approved Submissions */}
            <TabsContent value="approved" className="space-y-4">
              {approvedSubmissions.length === 0 ? <Card className="bg-card border-0">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No approved submissions
                  </CardContent>
                </Card> : <>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApprovedSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="gap-2"
                    >
                      {approvedSortOrder === 'asc' ? (
                        <>
                          <ArrowUp className="h-4 w-4" />
                          Soonest First
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-4 w-4" />
                          Latest First
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {approvedSubmissions.map(submission => {
                const submittedDate = new Date(submission.submitted_at);
                const nextSubmissionDate = new Date(submittedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                return <Card key={submission.id} className="bg-card border-0 overflow-hidden hover:border-success/50 transition-all">
                      <CardContent className="p-4">
                        <a href={`https://${submission.social_accounts.platform}.com/${submission.social_accounts.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-3 hover:bg-muted/20 p-2 -m-2 rounded-lg transition-colors group">
                          {getPlatformIcon(submission.social_accounts.platform)}
                          <div>
                            <h3 className="font-semibold text-sm group-hover:underline">@{submission.social_accounts.username}</h3>
                          </div>
                        </a>

                        <div className="bg-[#0d0d0d] rounded-lg p-3 mb-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors" onClick={() => openEditScoreDialog(submission)}>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Demographics Score</p>
                          <p className="text-2xl font-bold font-chakra text-success">{submission.score}</p>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Submitted</span>
                            <span className="font-medium">
                              {submittedDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Next Update</span>
                            <span className="font-medium">
                              {nextSubmissionDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                            </span>
                          </div>
                         </div>

                        {submission.admin_notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{submission.admin_notes}</p>}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3 text-xs border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={async () => {
                            if (!confirm(`Require new demographic submission for @${submission.social_accounts.username}? This will:\n\n• Reset their demographics score to 0\n• Archive current submission as 'rejected'\n• Require them to submit new demographics\n\nContinue?`)) return;
                            
                            try {
                              // Archive current submission
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

                              // Reset demographics score on profile
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
                      </CardContent>
                    </Card>;
              })}
                </div>
              </>}
            </TabsContent>
          </Tabs>

          {/* Review Dialog */}
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="max-w-md bg-card border-0">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg">Review Demographic Submission</DialogTitle>
              </DialogHeader>

              {selectedSubmission && <div className="space-y-4">
                  <a href={`https://${selectedSubmission.social_accounts.platform}.com/${selectedSubmission.social_accounts.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors group">
                    {getPlatformIcon(selectedSubmission.social_accounts.platform)}
                    <div>
                      <p className="font-semibold group-hover:underline">@{selectedSubmission.social_accounts.username}</p>
                    </div>
                  </a>

                  {selectedSubmission.screenshot_url && <div>
                      <Label className="text-xs mb-2 block">Demographics Video</Label>
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
                    </div>}

                  <div className="space-y-1.5">
                    <Label htmlFor="score" className="text-xs">Score (0-100)</Label>
                    <Input id="score" type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} placeholder="Enter score" className="h-9 text-sm" />
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button variant="destructive" size="sm" onClick={() => handleReview("rejected")} disabled={updating} className="flex-1">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleReview("approved")} disabled={updating} size="sm" className="flex-1">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {updating ? "Accepting..." : "Accept"}
                    </Button>
                  </div>
                </div>}
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
                        {account.follower_count.toLocaleString()} followers
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
    </div>;
}