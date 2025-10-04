import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, DollarSign, Clock, CheckCircle2, XCircle, CreditCard, Wallet, TrendingUp, Users as UsersIcon, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'in_transit' | 'rejected' | 'completed';
  payout_method: string;
  payout_details: any;
  requested_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  transaction_id: string | null;
  notes: string | null;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
    id: string;
    wallets?: {
      balance: number;
      total_earned: number;
      total_withdrawn: number;
    };
  };
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

export default function AdminPayouts() {
  const [allRequests, setAllRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'complete' | 'revert' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [userSocialAccounts, setUserSocialAccounts] = useState<SocialAccount[]>([]);
  const [loadingSocialAccounts, setLoadingSocialAccounts] = useState(false);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [socialAccountsOpen, setSocialAccountsOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<PayoutRequest['profiles'] | null>(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchPayoutRequests();
  }, []);
  const fetchPayoutRequests = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("payout_requests").select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          wallets (
            balance,
            total_earned,
            total_withdrawn
          )
        )
      `).order("requested_at", {
      ascending: false
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payout requests"
      });
    } else {
      setAllRequests(data as any || []);
    }
    setLoading(false);
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
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

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

  const openUserDetailsDialog = (profile: PayoutRequest['profiles']) => {
    setSelectedUserProfile(profile);
    setUserDetailsDialogOpen(true);
    fetchUserSocialAccounts(profile.id);
    fetchUserTransactions(profile.id);
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

  // Filter requests locally for instant tab switching
  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return allRequests;
    return allRequests.filter(r => r.status === activeTab);
  }, [allRequests, activeTab]);
  const stats = useMemo(() => ({
    pending: allRequests.filter(r => r.status === 'pending').length,
    in_transit: allRequests.filter(r => r.status === 'in_transit').length,
    completed: allRequests.filter(r => r.status === 'completed').length,
    rejected: allRequests.filter(r => r.status === 'rejected').length,
    totalPending: allRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount), 0)
  }), [allRequests]);
  const openActionDialog = (request: PayoutRequest, actionType: 'approve' | 'reject' | 'complete' | 'revert') => {
    setSelectedRequest(request);
    setAction(actionType);
    setRejectionReason('');
    setTransactionId('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleRevertStatus = async () => {
    if (!selectedRequest) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let newStatus: 'pending' | 'in_transit' | 'completed' | 'rejected' = 'pending';
    let updateData: any = {
      processed_at: new Date().toISOString(),
      processed_by: session.user.id,
      notes: notes || null
    };

    // Determine new status based on current status
    if (selectedRequest.status === 'in_transit') {
      newStatus = 'pending';
      updateData.rejection_reason = null;
    } else if (selectedRequest.status === 'completed') {
      newStatus = 'in_transit';
      updateData.transaction_id = null;
      
      // Get current wallet data first
      const { data: walletData, error: walletFetchError } = await supabase
        .from("wallets")
        .select("balance, total_withdrawn")
        .eq("user_id", selectedRequest.user_id)
        .single();

      if (walletFetchError || !walletData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch wallet data"
        });
        return;
      }

      const newBalance = Number(walletData.balance) + Number(selectedRequest.amount);
      const newTotalWithdrawn = Number(walletData.total_withdrawn) - Number(selectedRequest.amount);
      
      // Restore wallet balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          total_withdrawn: newTotalWithdrawn
        })
        .eq("user_id", selectedRequest.user_id);
      
      if (walletError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to restore wallet balance"
        });
        return;
      }
    } else if (selectedRequest.status === 'rejected') {
      newStatus = 'pending';
      updateData.rejection_reason = null;
    }

    updateData.status = newStatus;

    const { error } = await supabase
      .from("payout_requests")
      .update(updateData)
      .eq("id", selectedRequest.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to revert payout status"
      });
    } else {
      toast({
        title: "Success",
        description: `Payout status reverted to ${newStatus}`
      });
      setDialogOpen(false);
      fetchPayoutRequests();
    }
  };
  const handleCompleteDirectly = async (request: PayoutRequest) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Find the matching pending transaction
    const { data: pendingTransaction, error: findError } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", request.user_id)
      .eq("type", "withdrawal")
      .eq("amount", -Number(request.amount))
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error("Error finding transaction:", findError);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to find pending transaction"
      });
      return;
    }

    if (!pendingTransaction) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No matching pending transaction found"
      });
      return;
    }

    // Update the specific transaction to completed
    const { error: transactionError } = await supabase
      .from("wallet_transactions")
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq("id", pendingTransaction.id);

    if (transactionError) {
      console.error("Failed to update transaction:", transactionError);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update transaction status"
      });
      return;
    }

    if (transactionError) {
      console.error("Failed to update transaction:", transactionError);
    }

    const updateData = {
      status: 'completed' as const,
      processed_at: new Date().toISOString(),
      processed_by: session.user.id
    };

    const { error } = await supabase.from("payout_requests").update(updateData).eq("id", request.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete payout request"
      });
    } else {
      toast({
        title: "Success",
        description: "Payout marked as completed"
      });
      fetchPayoutRequests();
    }
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !action) return;

    if (action === 'revert') {
      await handleRevertStatus();
      return;
    }

    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    let updateData: any = {
      processed_at: new Date().toISOString(),
      processed_by: session.user.id,
      notes: notes || null
    };
    if (action === 'approve') {
      updateData.status = 'in_transit';
    } else if (action === 'reject') {
      if (!rejectionReason) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please provide a rejection reason"
        });
        return;
      }
      updateData.status = 'rejected';
      updateData.rejection_reason = rejectionReason;
      
      // Find the pending withdrawal transaction
      const { data: pendingTransaction, error: findError } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("user_id", selectedRequest.user_id)
        .eq("type", "withdrawal")
        .eq("amount", -Number(selectedRequest.amount))
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) {
        console.error("Error finding transaction:", findError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to find pending transaction"
        });
        return;
      }

      if (pendingTransaction) {
        // Update the transaction to rejected
        const { error: transactionError } = await supabase
          .from("wallet_transactions")
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq("id", pendingTransaction.id);

        if (transactionError) {
          console.error("Failed to update transaction:", transactionError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update transaction status"
          });
          return;
        }

        // Add the money back to the wallet
        const { data: walletData, error: walletFetchError } = await supabase
          .from("wallets")
          .select("balance, total_withdrawn")
          .eq("user_id", selectedRequest.user_id)
          .single();

        if (walletFetchError || !walletData) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch wallet data"
          });
          return;
        }

        // Restore the balance and reduce total_withdrawn
        const restoredBalance = Number(walletData.balance) + Number(selectedRequest.amount);
        const adjustedTotalWithdrawn = Number(walletData.total_withdrawn) - Number(selectedRequest.amount);

        const { error: walletError } = await supabase
          .from("wallets")
          .update({
            balance: restoredBalance,
            total_withdrawn: Math.max(0, adjustedTotalWithdrawn) // Prevent negative values
          })
          .eq("user_id", selectedRequest.user_id);

        if (walletError) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to restore wallet balance"
          });
          return;
        }
      }
    }
    const {
      error
    } = await supabase.from("payout_requests").update(updateData).eq("id", selectedRequest.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${action} payout request`
      });
    } else {
      toast({
        title: "Success",
        description: `Payout request ${action}d successfully`
      });
      setDialogOpen(false);
      fetchPayoutRequests();
    }
  };
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: {
        variant: "secondary",
        label: "Pending",
        icon: Clock
      },
      in_transit: {
        variant: "default",
        label: "In Transit",
        icon: TrendingUp
      },
      rejected: {
        variant: "destructive",
        label: "Rejected",
        icon: XCircle
      },
      completed: {
        variant: "default",
        label: "Completed",
        icon: CheckCircle2
      }
    };
    const {
      variant,
      label,
      icon: Icon
    } = variants[status] || {
      variant: "secondary",
      label: "Unknown",
      icon: Clock
    };
    return <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>;
  };
  const getPayoutMethodIcon = (method: string, details?: any) => {
    console.log('Payout method:', method, 'Details:', details);
    if (method === 'paypal') {
      return <img src="/src/assets/paypal-logo.svg" alt="PayPal" className="h-5 w-5" />;
    } else if (method === 'wise') {
      return <img src="/src/assets/wise-logo.svg" alt="Wise" className="h-5 w-5" />;
    } else if (method === 'crypto' && details?.network) {
      const network = details.network.toLowerCase();
      console.log('Network:', network);
      const logoMap: Record<string, string> = {
        'ethereum': '/src/assets/ethereum-logo.png',
        'polygon': '/src/assets/polygon-logo.png',
        'solana': '/src/assets/solana-logo.png',
        'optimism': '/src/assets/optimism-logo.png',
        'usdc': '/src/assets/usdc-logo.png',
        'usdt': '/src/assets/usdt-logo.png'
      };
      const logoUrl = logoMap[network];
      console.log('Logo URL:', logoUrl);
      if (logoUrl) {
        return <img src={logoUrl} alt={details.network} className="h-5 w-5" />;
      }
    }
    return <Wallet className="h-5 w-5" />;
  };
  return <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6 bg-[#111111]">
            <TabsTrigger value="pending" className="gap-2 bg-[#1c1c1c]/0">
              <Clock className="h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-muted-foreground">Loading payout requests...</p>
                </div>
              </div> : filteredRequests.length === 0 ? <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wallet className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-lg font-medium text-muted-foreground">No {activeTab !== 'all' ? activeTab : ''} requests found</p>
                  <p className="text-sm text-muted-foreground mt-1">Payout requests will appear here</p>
                </CardContent>
              </Card> : <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map(request => <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header Row: Name, Date, Status */}
                        <div className="flex items-start justify-between gap-3 pb-2 border-b">
                          <div className="flex-1 min-w-0">
                            <h3 
                              className="text-base font-semibold mb-1 cursor-pointer hover:underline transition-all truncate" 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (request.profiles) {
                                  openUserDetailsDialog(request.profiles);
                                }
                              }}
                            >
                              {request.profiles?.full_name || request.profiles?.username}
                            </h3>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          
                          {/* Amount Display */}
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Amount</p>
                            <p className="text-xl font-semibold text-success" style={{
                              fontFamily: 'Chakra Petch, sans-serif'
                            }}>
                              ${Number(request.amount).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Payment Details */}
                        <div className="grid grid-cols-2 gap-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {getPayoutMethodIcon(request.payout_method, request.payout_details)}
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-muted-foreground">Payment Method</p>
                              <p className="font-medium capitalize text-xs truncate">
                                {request.payout_method === 'crypto' && request.payout_details?.network ? request.payout_details.network : request.payout_method}
                              </p>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground mb-0.5">
                              {request.payout_method === 'crypto' ? 'Wallet Address' : 'Account Details'}
                            </p>
                            <p className="font-medium truncate text-xs">
                              {request.payout_details?.wallet_address || request.payout_details?.email || request.payout_details?.account_number || 'N/A'}
                            </p>
                          </div>

                          {request.processed_at && <div className="col-span-2">
                              <p className="text-[10px] text-muted-foreground mb-0.5">Processed Date</p>
                              <p className="font-medium text-xs flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {format(new Date(request.processed_at), 'MMM dd, yyyy')}
                              </p>
                            </div>}
                        </div>

                        {/* Additional Info Sections */}
                        {(request.transaction_id || request.rejection_reason || request.notes) && <div className="space-y-2 pt-2 border-t">
                            {request.transaction_id && <div className="p-2 bg-muted/30 rounded-md">
                                <p className="text-[10px] text-muted-foreground mb-0.5">Transaction ID</p>
                                <p className="font-mono font-medium text-xs">{request.transaction_id}</p>
                              </div>}

                            {request.rejection_reason && <div className="p-2 bg-destructive/10 rounded-md border border-destructive/20">
                                <p className="text-[10px] text-destructive font-medium mb-0.5">Rejection Reason</p>
                                <p className="text-destructive text-xs">{request.rejection_reason}</p>
                              </div>}

                            {request.notes && <div className="p-2 bg-muted/30 rounded-md">
                                <p className="text-[10px] text-muted-foreground mb-0.5">Admin Notes</p>
                                <p className="text-xs">{request.notes}</p>
                              </div>}
                          </div>}

                        {/* Action Buttons */}
                        <div className="flex gap-1.5 pt-2 border-t">
                        {request.status === 'pending' && <>
                              <Button size="sm" onClick={() => handleCompleteDirectly(request)} className="gap-1 bg-green-600 hover:bg-green-700 text-white border-0 h-8 text-xs px-2.5">
                                <DollarSign className="h-3.5 w-3.5" />
                                Mark as Completed
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => openActionDialog(request, 'reject')} className="gap-1 h-8 text-xs px-2.5">
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </>}
                          
                          {request.status === 'in_transit' && <>
                              <Button size="sm" onClick={() => handleCompleteDirectly(request)} className="gap-1 h-8 text-xs px-2.5">
                                <DollarSign className="h-3.5 w-3.5" />
                                Mark as Complete
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openActionDialog(request, 'revert')} className="gap-1 h-8 text-xs px-2.5">
                                <RotateCcw className="h-3.5 w-3.5" />
                                Revert to Pending
                              </Button>
                            </>}


                          {request.status === 'rejected' && (
                            <Button size="sm" variant="outline" onClick={() => openActionDialog(request, 'revert')} className="gap-1 h-8 text-xs px-2.5">
                              <RotateCcw className="h-3.5 w-3.5" />
                              Revert to Pending
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' && 'Approve Payout'}
              {action === 'reject' && 'Reject Payout'}
              {action === 'complete' && 'Complete Payout'}
              {action === 'revert' && 'Revert Payout Status'}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedRequest.profiles?.username}</p>
                <p className="text-2xl font-bold">${Number(selectedRequest.amount).toFixed(2)}</p>
              </div>

              {action === 'reject' && <div className="space-y-2">
                  <Label htmlFor="reason">Rejection Reason *</Label>
                  <Textarea id="reason" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why..." rows={3} />
                </div>}


              {action === 'revert' && selectedRequest && <div className="p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    This will revert the status from <span className="font-semibold text-foreground">{selectedRequest.status}</span> to{' '}
                    <span className="font-semibold text-foreground">
                      {selectedRequest.status === 'in_transit' ? 'pending' : 
                       selectedRequest.status === 'completed' ? 'in transit' : 
                       'pending'}
                    </span>.
                  </p>
                  {selectedRequest.status === 'completed' && (
                    <p className="text-sm text-warning">
                      ⚠️ This will restore the funds to the user's wallet balance.
                    </p>
                  )}
                </div>}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleProcessRequest}>
                  Confirm
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <UserDetailsDialog 
        open={userDetailsDialogOpen}
        onOpenChange={setUserDetailsDialogOpen}
        user={selectedUserProfile}
        socialAccounts={userSocialAccounts}
        transactions={userTransactions}
        loadingSocialAccounts={loadingSocialAccounts}
        loadingTransactions={loadingTransactions}
        socialAccountsOpen={socialAccountsOpen}
        onSocialAccountsOpenChange={setSocialAccountsOpen}
        transactionsOpen={transactionsOpen}
        onTransactionsOpenChange={setTransactionsOpen}
      />
    </div>;
}