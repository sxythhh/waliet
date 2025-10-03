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
  const { toast } = useToast();

  useEffect(() => {
    fetchPayoutRequests();
  }, []);

  const fetchPayoutRequests = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("payout_requests")
      .select(`
        *,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        )
      `)
      .order("requested_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payout requests",
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
    totalPending: allRequests
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount), 0),
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let updateData: any = {
      processed_at: new Date().toISOString(),
      processed_by: session.user.id,
      notes: notes || null,
    };

    if (action === 'approve') {
      updateData.status = 'approved';
    } else if (action === 'reject') {
      if (!rejectionReason) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please provide a rejection reason",
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
          description: "Please provide a transaction ID",
        });
        return;
      }
      updateData.status = 'completed';
      updateData.transaction_id = transactionId;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance: 0,
          total_withdrawn: selectedRequest.amount
        })
        .eq("user_id", selectedRequest.user_id);

      if (walletError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update wallet balance",
        });
        return;
      }
    }

    const { error } = await supabase
      .from("payout_requests")
      .update(updateData)
      .eq("id", selectedRequest.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${action} payout request`,
      });
    } else {
      toast({
        title: "Success",
        description: `Payout request ${action}d successfully`,
      });
      setDialogOpen(false);
      fetchPayoutRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      completed: { variant: "default", label: "Completed" },
    };
    const { variant, label } = variants[status] || {};
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPayoutMethodIcon = (method: string) => {
    if (method === 'paypal') {
      return <img src="/src/assets/paypal-logo.svg" alt="PayPal" className="h-5 w-5" />;
    } else if (method === 'wise') {
      return <img src="/src/assets/wise-logo.svg" alt="Wise" className="h-5 w-5" />;
    }
    return <Wallet className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Payout Management</h1>
              <p className="text-muted-foreground mt-1">Review and process creator payout requests</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                {allRequests.length} Total Requests
              </Badge>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-0">
                    {stats.pending}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Pending Review</p>
                <p className="text-2xl font-bold">${stats.totalPending.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 border-0">
                    {stats.approved}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Approved</p>
                <p className="text-2xl font-bold">
                  ${allRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <Badge variant="secondary" className="bg-green-500/20 text-green-700 border-0">
                    {stats.completed}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl font-bold">
                  ${allRequests.filter(r => r.status === 'completed').reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <Badge variant="secondary" className="bg-red-500/20 text-red-700 border-0">
                    {stats.rejected}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 border-0">
                    All
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Total Volume</p>
                <p className="text-2xl font-bold">
                  ${allRequests.reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-6">
            <TabsTrigger value="pending" className="gap-2">
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-muted-foreground">Loading payout requests...</p>
                </div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wallet className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-lg font-medium text-muted-foreground">No {activeTab !== 'all' ? activeTab : ''} requests found</p>
                  <p className="text-sm text-muted-foreground mt-1">Payout requests will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        {/* User Avatar */}
                        <Avatar className="h-16 w-16 flex-shrink-0">
                          {request.profiles?.avatar_url ? (
                            <img 
                              src={request.profiles.avatar_url} 
                              alt={request.profiles?.username || 'User'} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                              {(request.profiles?.username || 'U').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        {/* Main Content */}
                        <div className="flex-1 space-y-4">
                          {/* Top Row: Name, Status, and Amount */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold mb-1">
                                {request.profiles?.full_name || request.profiles?.username}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {format(new Date(request.requested_at), 'MMM dd, yyyy')}
                                </span>
                                {getStatusBadge(request.status)}
                              </div>
                            </div>

                            {/* Amount Display - Made Smaller */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Requested Amount
                              </p>
                              <p className="text-2xl font-semibold text-success" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                                ${Number(request.amount).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Payment Details Row */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              {getPayoutMethodIcon(request.payout_method)}
                              <div>
                                <span className="text-muted-foreground">Method: </span>
                                <span className="font-medium capitalize">{request.payout_method}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Details: </span>
                                <span className="font-medium truncate">
                                  {request.payout_details?.email || 
                                   request.payout_details?.wallet_address || 
                                   request.payout_details?.account_number ||
                                   'N/A'}
                                </span>
                              </div>
                            </div>

                            {request.processed_at && (
                              <div className="flex items-center gap-2 col-span-2">
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground">Processed: </span>
                                  <span className="font-medium">
                                    {format(new Date(request.processed_at), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Additional Info Sections */}
                          {(request.transaction_id || request.rejection_reason || request.notes) && (
                            <div className="space-y-2">
                              {request.transaction_id && (
                                <div className="p-2.5 bg-muted/50 rounded-md text-sm">
                                  <span className="text-muted-foreground">Transaction ID: </span>
                                  <span className="font-mono font-medium">{request.transaction_id}</span>
                                </div>
                              )}

                              {request.rejection_reason && (
                                <div className="p-2.5 bg-destructive/10 rounded-md border border-destructive/20 text-sm">
                                  <span className="text-destructive font-medium">Rejection Reason: </span>
                                  <span className="text-destructive">{request.rejection_reason}</span>
                                </div>
                              )}

                              {request.notes && (
                                <div className="p-2.5 bg-muted/50 rounded-md text-sm">
                                  <span className="text-muted-foreground">Admin Notes: </span>
                                  <span>{request.notes}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {request.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => openActionDialog(request, 'approve')}
                                  className="gap-1.5"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => openActionDialog(request, 'reject')}
                                  className="gap-1.5"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </Button>
                              </>
                            )}
                            
                            {request.status === 'approved' && (
                              <Button 
                                size="sm" 
                                onClick={() => openActionDialog(request, 'complete')}
                                className="gap-1.5"
                              >
                                <DollarSign className="h-4 w-4" />
                                Mark as Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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

          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedRequest.profiles?.username}</p>
                <p className="text-2xl font-bold">${Number(selectedRequest.amount).toFixed(2)}</p>
              </div>

              {action === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Rejection Reason *</Label>
                  <Textarea
                    id="reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why..."
                    rows={3}
                  />
                </div>
              )}

              {action === 'complete' && (
                <div className="space-y-2">
                  <Label htmlFor="transactionId">Transaction ID *</Label>
                  <Input
                    id="transactionId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Payment transaction ID"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleProcessRequest}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}