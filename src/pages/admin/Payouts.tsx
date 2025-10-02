import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, DollarSign, User, CreditCard, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  };
}

export default function AdminPayouts() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'complete' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('pending');
  const { toast } = useToast();

  useEffect(() => {
    fetchPayoutRequests();
  }, [filter]);

  const fetchPayoutRequests = async () => {
    setLoading(true);
    
    let query = supabase
      .from("payout_requests")
      .select(`
        *,
        profiles:user_id (
          username,
          full_name
        )
      `)
      .order("requested_at", { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payout requests",
      });
    } else {
      setRequests(data as any || []);
    }
    setLoading(false);
  };

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
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning/20 text-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-primary/20 text-primary"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'completed':
        return <Badge className="bg-success/20 text-success"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return null;
    }
  };

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    totalAmount: requests
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading payout requests...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payout Management</h1>
        <p className="text-muted-foreground mt-1">Review and process creator payout requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Pending Requests</p>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Approved</p>
              <CheckCircle className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Pending Amount</p>
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Requests List */}
      <Card className="bg-card border-0">
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No payout requests found
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-6 rounded-lg hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-base">{request.profiles?.full_name || request.profiles?.username}</p>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(request.requested_at), 'MMM dd, yyyy')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4" />
                        {request.payout_method === 'paypal' ? 'PayPal' : 'Crypto'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${Number(request.amount).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => openActionDialog(request, 'approve')}
                        className="gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openActionDialog(request, 'reject')}
                        className="gap-1"
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
                      className="gap-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' && 'Approve Payout Request'}
              {action === 'reject' && 'Reject Payout Request'}
              {action === 'complete' && 'Complete Payout'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && `${selectedRequest.profiles?.username} - $${Number(selectedRequest.amount).toFixed(2)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {action === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={4}
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
                  placeholder="Enter payment transaction ID"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleProcessRequest}>
                Confirm {action?.charAt(0).toUpperCase() + action?.slice(1)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
