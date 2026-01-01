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
  status: 'pending' | 'clearing' | 'paid' | 'clawed_back';
  payout_request_id: string | null;
  locked_at: string | null;
  clearing_ends_at: string | null;
  cleared_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoLedgerEntry {
  videoSubmissionId: string | null;
  boostSubmissionId: string | null;
  status: 'accruing' | 'clearing' | 'paid' | 'clawed_back';
  accrued: number;
  paid: number;
  pending: number;
  clearingEndsAt?: string;
  payoutRequestId?: string;
  createdAt: string;
}

export interface ClearingRequest {
  id: string;
  amount: number;
  clearingEndsAt: string;
  daysRemaining: number;
  canBeFlagged: boolean;
  itemCount: number;
}

export interface PaymentLedgerSummary {
  totalAccrued: number;
  totalPaid: number;
  totalPending: number;
  totalClearing: number;
  // Video-level breakdown
  entriesByVideo: Record<string, VideoLedgerEntry>;
  // Active clearing requests
  clearingRequests: ClearingRequest[];
  // Counts
  accruingCount: number;
  clearingCount: number;
  paidCount: number;
  // Earliest clearing end date (for countdown)
  earliestClearingEndsAt?: string;
  // Can any clearing items still be flagged?
  hasActiveFlaggableItems: boolean;
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
        totalClearing: 0,
        entriesByVideo: {},
        clearingRequests: [],
        accruingCount: 0,
        clearingCount: 0,
        paidCount: 0,
        hasActiveFlaggableItems: false,
        entriesBySource: {},
      };

      // Track clearing requests by payout_request_id
      const clearingRequestMap: Record<string, ClearingRequest> = {};
      let earliestClearingEnd: Date | null = null;

      ledgerEntries.forEach(entry => {
        const accrued = Number(entry.accrued_amount) || 0;
        const paid = Number(entry.paid_amount) || 0;
        const pending = Math.max(0, accrued - paid);

        summaryData.totalAccrued += accrued;
        summaryData.totalPaid += paid;

        // Map status for UI
        let uiStatus: VideoLedgerEntry['status'] = 'accruing';
        if (entry.status === 'pending') {
          summaryData.totalPending += pending;
          uiStatus = 'accruing';
          summaryData.accruingCount++;
        } else if (entry.status === 'paid' && pending > 0) {
          // Previously paid entry that has accrued more earnings
          summaryData.totalPending += pending;
          uiStatus = 'accruing'; // Show as accruing since there's more to claim
          summaryData.accruingCount++;
        } else if (entry.status === 'clearing') {
          summaryData.totalClearing += pending;
          uiStatus = 'clearing';
          summaryData.clearingCount++;
          
          // Track clearing end dates
          if (entry.clearing_ends_at) {
            const endDate = new Date(entry.clearing_ends_at);
            if (!earliestClearingEnd || endDate < earliestClearingEnd) {
              earliestClearingEnd = endDate;
            }
            
            // Check if can be flagged (first 4 days)
            if (entry.locked_at) {
              const lockedDate = new Date(entry.locked_at);
              const daysSinceLocked = (Date.now() - lockedDate.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSinceLocked < 4) {
                summaryData.hasActiveFlaggableItems = true;
              }
            }
            
            // Group by payout request
            if (entry.payout_request_id) {
              if (!clearingRequestMap[entry.payout_request_id]) {
                const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                const lockedDate = entry.locked_at ? new Date(entry.locked_at) : new Date();
                const daysSinceLocked = (Date.now() - lockedDate.getTime()) / (1000 * 60 * 60 * 24);
                
                clearingRequestMap[entry.payout_request_id] = {
                  id: entry.payout_request_id,
                  amount: 0,
                  clearingEndsAt: entry.clearing_ends_at,
                  daysRemaining,
                  canBeFlagged: daysSinceLocked < 4,
                  itemCount: 0,
                };
              }
              clearingRequestMap[entry.payout_request_id].amount += pending;
              clearingRequestMap[entry.payout_request_id].itemCount++;
            }
          }
        } else if (entry.status === 'paid') {
          uiStatus = 'paid';
          summaryData.paidCount++;
        } else if (entry.status === 'clawed_back') {
          uiStatus = 'clawed_back';
        }

        // Build video entry key
        const videoKey = entry.video_submission_id || entry.boost_submission_id || entry.id;
        summaryData.entriesByVideo[videoKey] = {
          videoSubmissionId: entry.video_submission_id,
          boostSubmissionId: entry.boost_submission_id,
          status: uiStatus,
          accrued,
          paid,
          pending,
          clearingEndsAt: entry.clearing_ends_at || undefined,
          payoutRequestId: entry.payout_request_id || undefined,
          createdAt: entry.created_at,
        };

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

      // Convert clearing requests map to array
      summaryData.clearingRequests = Object.values(clearingRequestMap);
      if (earliestClearingEnd) {
        summaryData.earliestClearingEndsAt = earliestClearingEnd.toISOString();
      }

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

    // Set up real-time listener - filtered by user_id for efficiency
    const channel = supabase
      .channel(`payment-ledger-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_ledger',
          filter: userId ? `user_id=eq.${userId}` : undefined,
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

  const requestPayout = async (sourceType?: string, sourceId?: string, videoSubmissionId?: string, boostSubmissionId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('request-payout', {
        body: { sourceType, sourceId, videoSubmissionId, boostSubmissionId },
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

  // Get ledger entry for a specific video
  const getEntryByVideoId = (videoId: string): VideoLedgerEntry | null => {
    return summary?.entriesByVideo[videoId] || null;
  };

  // Request payout for a single video
  const requestPayoutForVideo = async (videoSubmissionId: string) => {
    return requestPayout(undefined, undefined, videoSubmissionId, undefined);
  };

  // Request payout for a single boost submission
  const requestPayoutForBoost = async (boostSubmissionId: string) => {
    return requestPayout(undefined, undefined, undefined, boostSubmissionId);
  };

  return {
    entries,
    summary,
    loading,
    error,
    refetch: fetchEntries,
    requestPayout,
    getPendingBySource,
    getEntryByVideoId,
    requestPayoutForVideo,
    requestPayoutForBoost,
  };
}
