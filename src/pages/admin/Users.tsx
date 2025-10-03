import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Search, Users as UsersIcon, Wallet, Upload, FileDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
interface User {
  id: string;
  username: string;
  full_name: string;
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
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchData();
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
          follower_count
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

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user => user.username?.toLowerCase().includes(searchQuery.toLowerCase()) || user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
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
  const openUserDetailsDialog = (user: User) => {
    setSelectedUser(user);
    setUserDetailsDialogOpen(true);
    fetchUserSocialAccounts(user.id);
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
  return <div className="p-8 space-y-6 py-0 px-[23px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">View and manage creator accounts</p>
        </div>
        <Button onClick={() => setCsvImportDialogOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </div>

      {/* Stats */}
      

      {/* Filters */}
      <Card className="bg-card border-0">
        <CardContent className="pt-6 bg-[#000a00] py-0">
          <div className="flex gap-4">
            
            <div className="w-64">
              <Label htmlFor="campaign">Filter by Campaign</Label>
              <Popover open={campaignPopoverOpen} onOpenChange={setCampaignPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={campaignPopoverOpen} className="w-full justify-between mt-2">
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
      {filteredUsers.length === 0 ? (
        <Card className="bg-card border-0">
          <CardContent className="text-center py-12 text-muted-foreground">
            No users found
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => {
            const balance = user.wallets?.balance || 0;
            const totalEarned = user.wallets?.total_earned || 0;
            const totalWithdrawn = user.wallets?.total_withdrawn || 0;
            const earningsPercentage = totalEarned > 0 ? ((totalEarned - totalWithdrawn) / totalEarned) * 100 : 0;

            return (
              <Card 
                key={user.id} 
                className="bg-card border-0 overflow-hidden cursor-pointer transition-all hover:bg-muted/50"
                onClick={() => openUserDetailsDialog(user)}
              >
                <CardContent className="p-6">
                  {/* User Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <UsersIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold truncate">
                          {user.username}
                        </h3>
                        {user.full_name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {user.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        openPayDialog(user);
                      }} 
                      className="gap-1 shrink-0"
                    >
                      <DollarSign className="h-4 w-4" />
                      Pay
                    </Button>
                  </div>

                  {/* Connected Accounts */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Connected Accounts</p>
                    {user.social_accounts && user.social_accounts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.social_accounts.map(account => (
                          <div 
                            key={account.id} 
                            className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded-md text-xs"
                            title={`${account.username} - ${account.follower_count.toLocaleString()} followers`}
                          >
                            {getPlatformIcon(account.platform)}
                            <span className="font-medium">{account.username}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No accounts</span>
                    )}
                  </div>

                  {/* Wallet Progress Bar */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-medium text-success">
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(earningsPercentage, 100)}%` }}
                      />
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
              </Card>
            );
          })}
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
      <Dialog open={userDetailsDialogOpen} onOpenChange={setUserDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details - {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              View connected social accounts and linked campaigns
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingSocialAccounts ? <div className="text-center py-8 text-muted-foreground">
                Loading social accounts...
              </div> : userSocialAccounts.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                No social accounts connected
              </div> : <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Connected Accounts ({userSocialAccounts.length})
                </h3>
                {userSocialAccounts.map(account => <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3 flex-1">
                      {getPlatformIcon(account.platform)}
                      <div className="flex flex-col">
                        <a href={account.account_link} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" onClick={e => e.stopPropagation()}>
                          @{account.username}
                        </a>
                        <span className="text-xs text-muted-foreground">
                          {account.follower_count.toLocaleString()} followers
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {account.campaigns ? <div className="flex items-center gap-2">
                          {account.campaigns.brand_logo_url && <img src={account.campaigns.brand_logo_url} alt={account.campaigns.brand_name} className="h-6 w-6 rounded object-cover" />}
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-sm">{account.campaigns.title}</span>
                            <span className="text-xs text-muted-foreground">{account.campaigns.brand_name}</span>
                          </div>
                        </div> : <span className="text-xs text-muted-foreground italic">Not linked</span>}
                    </div>
                  </div>)}
              </div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}