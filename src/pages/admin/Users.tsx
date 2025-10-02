import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Search, Users as UsersIcon, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
}

interface Campaign {
  id: string;
  title: string;
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
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedCampaign, users]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch users with wallets
    const { data: usersData, error: usersError } = await supabase
      .from("profiles")
      .select(`
        *,
        wallets (
          balance,
          total_earned,
          total_withdrawn
        )
      `)
      .order("created_at", { ascending: false });

    if (usersError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users",
      });
    } else {
      setUsers(usersData as any || []);
      setFilteredUsers(usersData as any || []);
    }

    // Fetch campaigns
    const { data: campaignsData, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id, title")
      .order("title");

    if (!campaignsError) {
      setCampaigns(campaignsData || []);
    }

    setLoading(false);
  };

  const filterUsers = async () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Campaign filter
    if (selectedCampaign !== "all") {
      const { data: submissions } = await supabase
        .from("campaign_submissions")
        .select("creator_id")
        .eq("campaign_id", selectedCampaign);

      if (submissions) {
        const creatorIds = submissions.map((s) => s.creator_id);
        filtered = filtered.filter((user) => creatorIds.includes(user.id));
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

  const handlePayUser = async () => {
    if (!selectedUser || !paymentAmount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a payment amount",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid amount",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Update wallet balance
    const currentBalance = selectedUser.wallets?.balance || 0;
    const currentEarned = selectedUser.wallets?.total_earned || 0;

    const { error: walletError } = await supabase
      .from("wallets")
      .update({
        balance: currentBalance + amount,
        total_earned: currentEarned + amount,
      })
      .eq("user_id", selectedUser.id);

    if (walletError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process payment",
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
        notes: paymentNotes,
      },
    });

    toast({
      title: "Success",
      description: `Payment of $${amount.toFixed(2)} sent to ${selectedUser.username}`,
    });

    setPayDialogOpen(false);
    fetchData();
  };

  const stats = {
    totalUsers: users.length,
    totalBalance: users.reduce((sum, u) => sum + (u.wallets?.balance || 0), 0),
    totalEarned: users.reduce((sum, u) => sum + (u.wallets?.total_earned || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">View and manage creator accounts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <UsersIcon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <Wallet className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold">${stats.totalBalance.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold">${stats.totalEarned.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-0">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-64">
              <Label htmlFor="campaign">Filter by Campaign</Label>
              <Popover open={campaignPopoverOpen} onOpenChange={setCampaignPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={campaignPopoverOpen}
                    className="w-full justify-between mt-2"
                  >
                    {selectedCampaign === "all"
                      ? "All Campaigns"
                      : campaigns.find((c) => c.id === selectedCampaign)?.title}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 bg-popover z-50" align="start">
                  <Command>
                    <CommandInput placeholder="Search campaigns..." />
                    <CommandList>
                      <CommandEmpty>No campaign found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedCampaign("all");
                            setCampaignPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCampaign === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Campaigns
                        </CommandItem>
                        {campaigns.map((campaign) => (
                          <CommandItem
                            key={campaign.id}
                            value={campaign.title}
                            onSelect={() => {
                              setSelectedCampaign(campaign.id);
                              setCampaignPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCampaign === campaign.id ? "opacity-100" : "opacity-0"
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
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-card border-0">
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Total Earned</TableHead>
                <TableHead className="text-right">Total Withdrawn</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.full_name || "-"}</TableCell>
                    <TableCell className="text-right font-medium text-success">
                      ${(user.wallets?.balance || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(user.wallets?.total_earned || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(user.wallets?.total_withdrawn || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => openPayDialog(user)}
                        className="gap-1"
                      >
                        <DollarSign className="h-4 w-4" />
                        Pay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add payment notes..."
                rows={3}
              />
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
    </div>
  );
}
