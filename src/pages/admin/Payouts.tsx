import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, DollarSign, Clock, CheckCircle2, XCircle, CreditCard, Wallet, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
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
  };
}
export default function AdminPayouts() {
  const [allRequests, setAllRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'complete' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
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
          username,
          full_name,
          avatar_url
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

  // Filter requests locally for instant tab switching
  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return allRequests;
    return allRequests.filter(r => r.status === activeTab);
  }, [allRequests, activeTab]);
  const stats = useMemo(() => ({
    pending: allRequests.filter(r => r.status === 'pending').length,
    approved: allRequests.filter(r => r.status === 'approved').length,
    completed: allRequests.filter(r => r.status === 'completed').length,
    rejected: allRequests.filter(r => r.status === 'rejected').length,
    totalPending: allRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount), 0)
  }), [allRequests]);
  const openActionDialog = (request: PayoutRequest, actionType: 'approve' | 'reject' | 'complete') => {
    setSelectedRequest(request);
    setAction(actionType);
    setRejectionReason('');
    setTransactionId('');
    setNotes('');
    setDialogOpen(true);
  };
  const handleProcessRequest = async () => {
    if (!selectedRequest || !action) return;
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
      updateData.status = 'approved';
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
    } else if (action === 'complete') {
      if (!transactionId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please provide a transaction ID"
        });
        return;
      }
      updateData.status = 'completed';
      updateData.transaction_id = transactionId;

      // Update wallet balance
      const {
        error: walletError
      } = await supabase.from("wallets").update({
        balance: 0,
        total_withdrawn: selectedRequest.amount
      }).eq("user_id", selectedRequest.user_id);
      if (walletError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update wallet balance"
        });
        return;
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
        label: "Pending"
      },
      approved: {
        variant: "default",
        label: "Approved"
      },
      rejected: {
        variant: "destructive",
        label: "Rejected"
      },
      completed: {
        variant: "default",
        label: "Completed"
      }
    };
    const {
      variant,
      label
    } = variants[status] || {
      variant: "secondary",
      label: "Unknown"
    };
    return <Badge variant={variant}>{label}</Badge>;
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
          <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-6 bg-[#111111]">
            <TabsTrigger value="pending" className="gap-2 bg-[#1c1c1c]/0">
              <Clock className="h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Approved
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
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header Row: Name, Date, Status */}
                        <div className="flex items-start justify-between gap-4 pb-4 border-b">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold mb-2">
                              {request.profiles?.full_name || request.profiles?.username}
                            </h3>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {format(new Date(request.requested_at), 'MMM dd, yyyy')}
                              </span>
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                          
                          {/* Amount Display */}
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">Amount</p>
                            <p className="text-3xl font-semibold text-success" style={{
                              fontFamily: 'Chakra Petch, sans-serif'
                            }}>
                              ${Number(request.amount).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Payment Details */}
                        <div className="grid grid-cols-2 gap-4 py-3">
                          <div className="flex items-center gap-2">
                            {getPayoutMethodIcon(request.payout_method, request.payout_details)}
                            <div>
                              <p className="text-xs text-muted-foreground">Payment Method</p>
                              <p className="font-medium capitalize text-sm">
                                {request.payout_method === 'crypto' && request.payout_details?.network ? request.payout_details.network : request.payout_method}
                              </p>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">
                              {request.payout_method === 'crypto' ? 'Wallet Address' : 'Account Details'}
                            </p>
                            <p className="font-medium truncate text-sm">
                              {request.payout_details?.wallet_address || request.payout_details?.email || request.payout_details?.account_number || 'N/A'}
                            </p>
                          </div>

                          {request.processed_at && <div className="col-span-2">
                              <p className="text-xs text-muted-foreground mb-1">Processed Date</p>
                              <p className="font-medium text-sm flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {format(new Date(request.processed_at), 'MMM dd, yyyy')}
                              </p>
                            </div>}
                        </div>

                        {/* Additional Info Sections */}
                        {(request.transaction_id || request.rejection_reason || request.notes) && <div className="space-y-2 pt-3 border-t">
                            {request.transaction_id && <div className="p-3 bg-muted/30 rounded-md">
                                <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                                <p className="font-mono font-medium text-sm">{request.transaction_id}</p>
                              </div>}

                            {request.rejection_reason && <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                                <p className="text-xs text-destructive font-medium mb-1">Rejection Reason</p>
                                <p className="text-destructive text-sm">{request.rejection_reason}</p>
                              </div>}

                            {request.notes && <div className="p-3 bg-muted/30 rounded-md">
                                <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                                <p className="text-sm">{request.notes}</p>
                              </div>}
                          </div>}

                        {/* Action Buttons */}
                        {(request.status === 'pending' || request.status === 'approved') && (
                          <div className="flex gap-2 pt-3 border-t">
                            {request.status === 'pending' && <>
                                <Button size="sm" onClick={() => openActionDialog(request, 'approve')} className="gap-1.5">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openActionDialog(request, 'reject')} className="gap-1.5">
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </Button>
                              </>}
                            
                            {request.status === 'approved' && <Button size="sm" onClick={() => openActionDialog(request, 'complete')} className="gap-1.5">
                                <DollarSign className="h-4 w-4" />
                                Mark as Complete
                              </Button>}
                          </div>
                        )}
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

              {action === 'complete' && <div className="space-y-2">
                  <Label htmlFor="transactionId">Transaction ID *</Label>
                  <Input id="transactionId" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Payment transaction ID" />
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
    </div>;
}