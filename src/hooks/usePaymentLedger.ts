import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentLedgerEntry {
  id: string;
  user_id: string;
  video_submission_id: string | null;
  boost_submission_id: string | null;
  source_type: 'campaign' | 'boost';
  source_id: string;
  payment_type: 'cpm' | 'milestone' | 'flat_rate' | 'retainer' | 'view_bonus';
  views_snapshot: number;
  rate: number;
  milestone_threshold: number | null;
  accrued_amount: number;
  paid_amount: number;
  status: 'pending' | 'locked' | 'clearing' | 'paid' | 'clawed_back';
  payout_request_id: string | null;
  locked_at: string | null;
  clearing_ends_at: string | null;
  cleared_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentLedgerSummary {
  totalAccrued: number;
  totalPaid: number;
  totalPending: number;
  totalLocked: number;
  totalClearing: number;
  entriesBySource: Record<string, {
    sourceType: 'campaign' | 'boost';
    sourceId: string;
    accrued: number;
    paid: number;
    pending: number;
  }>;
}

export function usePaymentLedger(userId?: string) {
  const [entries, setEntries] = useState<PaymentLedgerEntry[]>([]);
  const [summary, setSummary] = useState<PaymentLedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const targetUserId = userId || session?.user?.id;
      
      if (!targetUserId) {
        setEntries([]);
        setSummary(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('payment_ledger')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const ledgerEntries = (data || []) as PaymentLedgerEntry[];
      setEntries(ledgerEntries);

      // Calculate summary
      const summaryData: PaymentLedgerSummary = {
        totalAccrued: 0,
        totalPaid: 0,
        totalPending: 0,
        totalLocked: 0,
        totalClearing: 0,
        entriesBySource: {},
      };

      ledgerEntries.forEach(entry => {
        const accrued = Number(entry.accrued_amount) || 0;
        const paid = Number(entry.paid_amount) || 0;
        const pending = Math.max(0, accrued - paid);

        summaryData.totalAccrued += accrued;
        summaryData.totalPaid += paid;

        if (entry.status === 'pending') {
          summaryData.totalPending += pending;
        } else if (entry.status === 'locked') {
          summaryData.totalLocked += pending;
        } else if (entry.status === 'clearing') {
          summaryData.totalClearing += pending;
        }

        // Group by source
        const key = `${entry.source_type}:${entry.source_id}`;
        if (!summaryData.entriesBySource[key]) {
          summaryData.entriesBySource[key] = {
            sourceType: entry.source_type,
            sourceId: entry.source_id,
            accrued: 0,
            paid: 0,
            pending: 0,
          };
        }
        summaryData.entriesBySource[key].accrued += accrued;
        summaryData.entriesBySource[key].paid += paid;
        summaryData.entriesBySource[key].pending += pending;
      });

      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching payment ledger:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment ledger');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEntries();

    // Set up real-time listener
    const channel = supabase
      .channel('payment-ledger-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_ledger',
        },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  const requestPayout = async (sourceType?: string, sourceId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('request-payout', {
        body: { sourceType, sourceId },
      });

      if (error) throw error;
      
      await fetchEntries();
      return data;
    } catch (err) {
      console.error('Error requesting payout:', err);
      throw err;
    }
  };

  const getPendingBySource = (sourceType: 'campaign' | 'boost', sourceId: string) => {
    return entries
      .filter(e => 
        e.source_type === sourceType && 
        e.source_id === sourceId && 
        e.status === 'pending'
      )
      .reduce((sum, e) => sum + Math.max(0, Number(e.accrued_amount) - Number(e.paid_amount)), 0);
  };

  return {
    entries,
    summary,
    loading,
    error,
    refetch: fetchEntries,
    requestPayout,
    getPendingBySource,
  };
}
