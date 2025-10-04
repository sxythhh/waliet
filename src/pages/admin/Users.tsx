import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Search, Users as UsersIcon, Wallet, Upload, FileDown, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, TrendingUp, Image as ImageIcon, BadgeCheck, AlertCircle } from "lucide-react";
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
  };
  demographic_submissions?: Array<{
    status: string;
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
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [userSocialAccounts, setUserSocialAccounts] = useState<SocialAccount[]>([]);
  const [loadingSocialAccounts, setLoadingSocialAccounts] = useState(false);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [socialAccountsOpen, setSocialAccountsOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
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
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchData();
    fetchSubmissions();
  }, []);
  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedCampaign, users]);
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
        campaigns:campaign_id (
          id,
          title,
          brand_name,
          brand_logo_url
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
      data,
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
      setUserTransactions(data || []);
    }
    setLoadingTransactions(false);
  };
  const openUserDetailsDialog = (user: User) => {
    setSelectedUser(user);
    setUserDetailsDialogOpen(true);
    fetchUserSocialAccounts(user.id);
    fetchUserTransactions(user.id);
  };
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return <img src="/src/assets/tiktok-logo.svg" alt="TikTok" className="h-5 w-5" />;
      case 'instagram':
        return <img src="/src/assets/instagram-logo.svg" alt="Instagram" className="h-5 w-5" />;
      case 'youtube':
        return <img src="/src/assets/youtube-logo.svg" alt="YouTube" className="h-5 w-5" />;
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

    // Update wallet balance
    const currentBalance = selectedUser.wallets?.balance || 0;
    const currentEarned = selectedUser.wallets?.total_earned || 0;
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
    fetchData();
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
  const handleReview = async () => {
    if (!selectedSubmission) return;
    const scoreValue = parseInt(score);
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
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const {
        error: updateError
      } = await supabase.from("demographic_submissions").update({
        status: reviewStatus,
        score: scoreValue,
        admin_notes: adminNotes.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id
      }).eq("id", selectedSubmission.id);
      if (updateError) throw updateError;
      if (reviewStatus === "approved") {
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
    return;
  };
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  const approvedSubmissions = submissions.filter(s => s.status === "approved");
  const rejectedSubmissions = submissions.filter(s => s.status === "rejected");
  const avgTier1 = submissions.length > 0 ? submissions.reduce((sum, s) => sum + s.tier1_percentage, 0) / submissions.length : 0;
  const stats = {
    totalUsers: users.length,
    totalBalance: users.reduce((sum, u) => sum + (u.wallets?.balance || 0), 0),
    totalEarned: users.reduce((sum, u) => sum + (u.wallets?.total_earned || 0), 0)
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
              <Label htmlFor="search">Search Users</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="search" type="text" placeholder="Search by Virality username or account username..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-[#1a1a1a] border-0 h-10" />
              </div>
            </div>
            
            <div className="w-64">
              <Label htmlFor="campaign">Filter by Campaign</Label>
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
          </div>
        </CardContent>
      </Card>

      {/* Users Gallery */}
      {filteredUsers.length === 0 ? <Card className="bg-card border-0">
          <CardContent className="text-center py-12 text-muted-foreground">
            No users found
          </CardContent>
        </Card> : <div className="grid grid-cols-2 gap-6 w-full">
          {filteredUsers.map(user => {
            const balance = user.wallets?.balance || 0;
            const totalEarned = user.wallets?.total_earned || 0;
            const totalWithdrawn = user.wallets?.total_withdrawn || 0;
            return <Card key={user.id} className="bg-card border-0 overflow-hidden cursor-pointer transition-all hover:bg-[#1D1D1D]" onClick={() => openUserDetailsDialog(user)}>
                <CardContent className="p-6">
                  {/* User Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UsersIcon className="h-5 w-5 text-primary" />
                        </div>}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold truncate">
                          {user.username}
                        </h3>
                        {user.full_name && <p className="text-sm text-muted-foreground truncate">
                            {user.full_name}
                          </p>}
                      </div>
                    </div>
                    <Button size="sm" onClick={e => {
                    e.stopPropagation();
                    openPayDialog(user);
                  }} className="gap-1 shrink-0">
                      <DollarSign className="h-4 w-4" />
                      Pay
                    </Button>
                  </div>

                  {/* Connected Accounts */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Connected Accounts</p>
                    {user.social_accounts && user.social_accounts.length > 0 ? <div className="flex flex-wrap gap-2">
                        {user.social_accounts.map(account => {
                      const demographicStatus = account.demographic_submissions?.[0]?.status;
                      return <div key={account.id} title={`${account.username} - ${account.follower_count.toLocaleString()} followers`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-[#282828]/50">
                            {getPlatformIcon(account.platform)}
                            <span className="font-medium">{account.username}</span>
                            {demographicStatus === 'approved' && <BadgeCheck className="h-3.5 w-3.5 text-success fill-success/20" />}
                            {demographicStatus === 'pending' && <Clock className="h-3.5 w-3.5 text-warning fill-warning/20" />}
                            {demographicStatus === 'rejected' && <XCircle className="h-3.5 w-3.5 text-destructive fill-destructive/20" />}
                            {!demographicStatus && <AlertCircle className="h-3.5 w-3.5 text-destructive fill-destructive/20" />}
                          </div>;
                    })}
                      </div> : <span className="text-muted-foreground text-sm">No accounts</span>}
                  </div>

                  {/* Balance */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-medium text-success">
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Earnings Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Earned</p>
                      <p className="text-sm font-semibold">
                        ${totalEarned.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Withdrawn</p>
                      <p className="text-sm font-semibold">
                        ${totalWithdrawn.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>;
          })}
        </div>}

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
      <Dialog open={userDetailsDialogOpen} onOpenChange={setUserDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          {selectedUser && <>
              {/* User Header */}
              <div className="flex items-start gap-4 pb-6 border-b">
                {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt={selectedUser.username} className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <UsersIcon className="h-8 w-8 text-primary" />
                  </div>}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-semibold mb-1">
                    {selectedUser.username}
                  </h2>
                  {selectedUser.full_name && <p className="text-sm text-muted-foreground mb-3">
                      {selectedUser.full_name}
                    </p>}
                  
                  {/* Wallet Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-card/50 px-3 py-2 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Balance</p>
                      <p className="text-lg font-semibold text-success">
                        ${(selectedUser.wallets?.balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-card/50 px-3 py-2 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                      <p className="text-lg font-semibold">
                        ${(selectedUser.wallets?.total_earned || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-card/50 px-3 py-2 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Withdrawn</p>
                      <p className="text-lg font-semibold">
                        ${(selectedUser.wallets?.total_withdrawn || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Accounts Section - Collapsible */}
              <Collapsible open={socialAccountsOpen} onOpenChange={setSocialAccountsOpen} className="pt-6 border-t">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between hover:bg-card/30 p-3 rounded-lg transition-colors">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Connected Accounts ({userSocialAccounts.length})
                    </h3>
                    {socialAccountsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  {loadingSocialAccounts ? <div className="text-center py-8 text-muted-foreground">
                      Loading social accounts...
                    </div> : userSocialAccounts.length === 0 ? <div className="text-center py-8 text-muted-foreground bg-card/30 rounded-lg mt-2">
                      No social accounts connected
                    </div> : <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 mt-2">
                      {userSocialAccounts.map(account => <div key={account.id} className="p-4 rounded-lg bg-card/50 hover:bg-[#1D1D1D] transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            {/* Account Info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="shrink-0">
                                {getPlatformIcon(account.platform)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <a href={account.account_link} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary transition-colors block truncate" onClick={e => e.stopPropagation()}>
                                  @{account.username}
                                </a>
                              </div>
                            </div>
                            
                            {/* Campaign Link */}
                            <div className="shrink-0">
                              {account.campaigns ? <div className="flex items-center gap-2">
                                  {account.campaigns.brand_logo_url && <img src={account.campaigns.brand_logo_url} alt={account.campaigns.brand_name} className="h-6 w-6 rounded object-cover" />}
                                  <span className="font-medium text-sm">
                                    {account.campaigns.title}
                                  </span>
                                </div> : <span className="text-xs text-muted-foreground italic">
                                  Not linked
                                </span>}
                            </div>
                          </div>
                        </div>)}
                    </div>}
                </CollapsibleContent>
              </Collapsible>

              {/* Recent Transactions Section - Collapsible */}
              <Collapsible open={transactionsOpen} onOpenChange={setTransactionsOpen} className="pt-6 border-t">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between hover:bg-card/30 p-3 rounded-lg transition-colors">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Recent Transactions ({userTransactions.length})
                    </h3>
                    {transactionsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  {loadingTransactions ? <div className="text-center py-8 text-muted-foreground">
                      Loading transactions...
                    </div> : userTransactions.length === 0 ? <div className="text-center py-8 text-muted-foreground bg-card/30 rounded-lg mt-2">
                      No transactions yet
                    </div> : <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 mt-2">
                      {userTransactions.map(transaction => <div key={transaction.id} className="p-4 rounded-lg bg-card/50 hover:bg-[#1D1D1D] transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            {/* Transaction Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium capitalize">{transaction.type}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${transaction.status === 'completed' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                  {transaction.status}
                                </span>
                              </div>
                              {transaction.description && <p className="text-sm text-muted-foreground truncate">
                                  {transaction.description}
                                </p>}
                            </div>
                            
                            {/* Amount & Date */}
                            
                          </div>
                        </div>)}
                    </div>}
                </CollapsibleContent>
              </Collapsible>
            </>}
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold mt-1">{pendingSubmissions.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold mt-1">{approvedSubmissions.length}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold mt-1">{rejectedSubmissions.length}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Tier 1</p>
                    <p className="text-2xl font-bold mt-1">{avgTier1.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

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
                        

                        <div className="bg-[#0d0d0d] rounded-lg p-4 mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Tier 1 Audience</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold font-chakra text-primary">{submission.tier1_percentage}%</p>
                            <p className="text-xs text-muted-foreground">of total audience</p>
                          </div>
                        </div>

                        {submission.screenshot_url ? <div className="mb-3 rounded-lg overflow-hidden border border-border/50 group-hover:border-primary/30 transition-all">
                            <img src={submission.screenshot_url} alt="Demographics screenshot" className="w-full h-32 object-cover" />
                          </div> : <div className="mb-3 rounded-lg overflow-hidden border border-dashed border-border/50 h-32 flex items-center justify-center bg-muted/20">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                          </div>}

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                          </span>
                          <Button size="sm" className="h-7 text-xs" onClick={e => {
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
                </Card> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {approvedSubmissions.map(submission => <Card key={submission.id} className="bg-card border-0 overflow-hidden hover:border-success/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(submission.social_accounts.platform)}
                            <div>
                              <h3 className="font-semibold text-sm">@{submission.social_accounts.username}</h3>
                            </div>
                          </div>
                          {getStatusBadge(submission.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-[#0d0d0d] rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Tier 1</p>
                            <p className="text-lg font-bold font-chakra">{submission.tier1_percentage}%</p>
                          </div>
                          <div className="bg-[#0d0d0d] rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Score</p>
                            <p className="text-lg font-bold font-chakra text-success">{submission.score}</p>
                          </div>
                        </div>

                        {submission.admin_notes && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{submission.admin_notes}</p>}

                        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => openReviewDialog(submission)}>
                          View Details
                        </Button>
                      </CardContent>
                    </Card>)}
                </div>}
            </TabsContent>

            {/* Rejected Submissions */}
            <TabsContent value="rejected" className="space-y-4">
              {rejectedSubmissions.length === 0 ? <Card className="bg-card border-0">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No rejected submissions
                  </CardContent>
                </Card> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {rejectedSubmissions.map(submission => <Card key={submission.id} className="bg-card border-0 overflow-hidden hover:border-destructive/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(submission.social_accounts.platform)}
                            <div>
                              <h3 className="font-semibold text-sm">@{submission.social_accounts.username}</h3>
                            </div>
                          </div>
                          {getStatusBadge(submission.status)}
                        </div>

                        <div className="bg-[#0d0d0d] rounded-lg p-2 mb-3">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Tier 1 Percentage</p>
                          <p className="text-lg font-bold font-chakra">{submission.tier1_percentage}%</p>
                        </div>

                        {submission.admin_notes && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{submission.admin_notes}</p>}

                        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => openReviewDialog(submission)}>
                          View Details
                        </Button>
                      </CardContent>
                    </Card>)}
                </div>}
            </TabsContent>
          </Tabs>

          {/* Review Dialog */}
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="max-w-2xl bg-card border-0">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg">Review Demographic Submission</DialogTitle>
              </DialogHeader>

              {selectedSubmission && <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    {getPlatformIcon(selectedSubmission.social_accounts.platform)}
                    <div>
                      <p className="font-semibold">@{selectedSubmission.social_accounts.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedSubmission.social_accounts.platform}</p>
                    </div>
                  </div>

                  <div className="bg-[#0d0d0d] rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Tier 1 Audience Percentage</p>
                    <p className="text-4xl font-bold font-chakra text-primary">{selectedSubmission.tier1_percentage}%</p>
                  </div>

                  {selectedSubmission.screenshot_url && <div>
                      <Label className="text-xs mb-2 block">Demographics Screenshot</Label>
                      <div className="rounded-lg overflow-hidden border">
                        <img src={selectedSubmission.screenshot_url} alt="Demographics screenshot" className="w-full" />
                      </div>
                    </div>}

                  <div className="space-y-2">
                    <Label className="text-xs">Review Decision</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant={reviewStatus === "approved" ? "default" : "outline"} onClick={() => setReviewStatus("approved")} className="h-9 text-sm">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant={reviewStatus === "rejected" ? "destructive" : "outline"} onClick={() => setReviewStatus("rejected")} className="h-9 text-sm">
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="score" className="text-xs">Score (0-100)</Label>
                    <Input id="score" type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} placeholder="Enter score" className="h-9 text-sm" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs">Admin Notes</Label>
                    <Textarea id="notes" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Optional notes about this submission..." rows={3} className="text-sm min-h-[70px]" />
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(null)} disabled={updating} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleReview} disabled={updating} size="sm" className="flex-1">
                      {updating ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                </div>}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>;
}