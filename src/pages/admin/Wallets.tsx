import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface UserWallet {
  user_id: string;
  username: string;
  email: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface Transaction {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  created_at: string;
}

export default function Wallets() {
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWallet | null>(null);
  const [transactionType, setTransactionType] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWallets();
    fetchTransactions();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    
    const { data: walletsData, error: walletsError } = await supabase
      .from("wallets")
      .select("user_id, balance, total_earned, total_withdrawn");

    if (walletsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch wallets",
      });
      setLoading(false);
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username");

    const { data: { users } } = await supabase.auth.admin.listUsers();

    const userEmails: Record<string, string> = {};
    if (users && Array.isArray(users)) {
      users.forEach((u: any) => {
        if (u?.id && u?.email) {
          userEmails[u.id] = u.email;
        }
      });
    }

    const combined = walletsData.map((wallet) => {
      const profile = profilesData?.find((p) => p.id === wallet.user_id);
      
      return {
        user_id: wallet.user_id,
        username: profile?.username || "Unknown",
        email: userEmails[wallet.user_id] || "Unknown",
        balance: Number(wallet.balance),
        total_earned: Number(wallet.total_earned),
        total_withdrawn: Number(wallet.total_withdrawn),
      };
    });

    setWallets(combined);
    setLoading(false);
  };

  const fetchTransactions = async () => {
    const { data: txnData, error } = await supabase
      .from("wallet_transactions")
      .select("id, user_id, amount, type, status, description, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch transactions",
      });
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username");

    const combined = txnData.map((txn) => {
      const profile = profilesData?.find((p) => p.id === txn.user_id);
      return {
        ...txn,
        username: profile?.username || "Unknown",
      };
    });

    setTransactions(combined);
  };

  const handleOpenDialog = (user: UserWallet, type: "add" | "remove") => {
    setSelectedUser(user);
    setTransactionType(type);
    setAmount("");
    setDescription("");
    setDialogOpen(true);
  };

  const handleSubmitTransaction = async () => {
    if (!selectedUser || !amount || Number(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter a valid amount",
      });
      return;
    }

    setSubmitting(true);

    const txnAmount = transactionType === "add" ? Number(amount) : -Number(amount);
    const newBalance = selectedUser.balance + txnAmount;

    if (newBalance < 0) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Cannot remove more than the current balance",
      });
      setSubmitting(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error: txnError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: selectedUser.user_id,
          amount: Math.abs(txnAmount),
          type: "admin_adjustment",
          status: "completed",
          description: description || `${transactionType === "add" ? "Added" : "Removed"} by admin`,
          metadata: { 
            transaction_type: transactionType,
            admin_id: session.user.id 
          },
          created_by: session.user.id,
        });

      if (txnError) throw txnError;

      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          total_earned: transactionType === "add" 
            ? selectedUser.total_earned + Number(amount)
            : selectedUser.total_earned,
          total_withdrawn: transactionType === "remove"
            ? selectedUser.total_withdrawn + Number(amount)
            : selectedUser.total_withdrawn,
        })
        .eq("user_id", selectedUser.user_id);

      if (walletError) throw walletError;

      toast({
        title: "Success",
        description: `Successfully ${transactionType === "add" ? "added" : "removed"} $${amount}`,
      });

      setDialogOpen(false);
      fetchWallets();
      fetchTransactions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process transaction",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWallets = wallets.filter(
    (wallet) =>
      wallet.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wallet.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet Management</h1>
        <p className="text-muted-foreground mt-1">Manage user wallet balances and transactions</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="bg-card border-0">
        <CardHeader>
          <CardTitle>User Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading wallets...</p>
          ) : filteredWallets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No wallets found</p>
          ) : (
            <div className="space-y-3">
              {filteredWallets.map((wallet) => (
                <div
                  key={wallet.user_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{wallet.username}</p>
                      <Badge variant="outline" className="text-xs">
                        {wallet.email}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Balance: <span className="font-semibold text-foreground">${wallet.balance.toFixed(2)}</span></span>
                      <span>Earned: ${wallet.total_earned.toFixed(2)}</span>
                      <span>Withdrawn: ${wallet.total_withdrawn.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(wallet, "add")}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Funds
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(wallet, "remove")}
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-0">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{txn.username}</p>
                      <Badge variant="secondary" className="text-xs">
                        {txn.type}
                      </Badge>
                      <Badge 
                        variant={txn.status === 'completed' ? 'default' : 'outline'} 
                        className="text-xs"
                      >
                        {txn.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {txn.description || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(txn.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <p className="text-lg font-semibold">
                    ${txn.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionType === "add" ? "Add Funds" : "Remove Funds"}
            </DialogTitle>
            <DialogDescription>
              {transactionType === "add" 
                ? `Add funds to ${selectedUser?.username}'s wallet` 
                : `Remove funds from ${selectedUser?.username}'s wallet`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter a description for this transaction..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {selectedUser && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="text-muted-foreground">Current Balance</p>
                <p className="text-lg font-semibold">${selectedUser.balance.toFixed(2)}</p>
                {amount && Number(amount) > 0 && (
                  <>
                    <p className="text-muted-foreground mt-2">New Balance</p>
                    <p className="text-lg font-semibold">
                      ${(selectedUser.balance + (transactionType === "add" ? Number(amount) : -Number(amount))).toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitTransaction} disabled={submitting}>
              {submitting ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
