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
  return;
}