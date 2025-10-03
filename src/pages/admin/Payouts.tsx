import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
          full_name
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
    } = variants[status] || {};
    return <Badge variant={variant}>{label}</Badge>;
  };
  return <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Payout Management</h1>
            <p className="text-muted-foreground mt-1">Review and process payout requests</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 bg-black py-[10px]">
                <p className="text-sm text-muted-foreground mb-1">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                
                <p className="text-2xl font-bold">{stats.completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Pending</p>
                <p className="text-2xl font-bold">${stats.totalPending.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : filteredRequests.length === 0 ? <p className="text-muted-foreground text-center py-12">No requests found</p> : <div className="space-y-3">
                  {filteredRequests.map(request => <Card key={request.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold">
                                {request.profiles?.full_name || request.profiles?.username}
                              </p>
                              {getStatusBadge(request.status)}
                            </div>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <span>{format(new Date(request.requested_at), 'MMM dd, yyyy')}</span>
                              <span>{request.payout_method === 'paypal' ? 'PayPal' : 'Crypto'}</span>
                              {request.transaction_id && <span>TX: {request.transaction_id}</span>}
                            </div>
                            {request.rejection_reason && <p className="text-sm text-destructive mt-2">
                                Reason: {request.rejection_reason}
                              </p>}
                            {request.notes && <p className="text-sm text-muted-foreground mt-2">
                                Notes: {request.notes}
                              </p>}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right mr-4">
                              <p className="text-2xl font-bold">${Number(request.amount).toFixed(2)}</p>
                            </div>
                            
                            {request.status === 'pending' && <div className="flex gap-2">
                                <Button size="sm" onClick={() => openActionDialog(request, 'approve')}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openActionDialog(request, 'reject')}>
                                  Reject
                                </Button>
                              </div>}
                            
                            {request.status === 'approved' && <Button size="sm" onClick={() => openActionDialog(request, 'complete')}>
                                Complete
                              </Button>}
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