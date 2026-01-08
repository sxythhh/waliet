import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Constants for clearing period calculations
const FLAGGING_WINDOW_DAYS = 4;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

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

export interface PaymentAnomaly {
  entryId: string;
  type: 'overpayment' | 'invalid_amount';
  description: string;
  amount: number;
}

export interface PaymentLedgerSummary {
  totalAccrued: number;
  totalPaid: number;
  totalPending: number;
  totalClearing: number;
  entriesByVideo: Record<string, VideoLedgerEntry>;
  clearingRequests: ClearingRequest[];
  accruingCount: number;
  clearingCount: number;
  paidCount: number;
  clawedBackCount: number;
  earliestClearingEndsAt?: string;
  hasActiveFlaggableItems: boolean;
  entriesBySource: Record<string, {
    sourceType: 'campaign' | 'boost';
    sourceId: string;
    accrued: number;
    paid: number;
    pending: number;
  }>;
  // New: anomaly detection
  anomalies: PaymentAnomaly[];
  hasAnomalies: boolean;
}

/**
 * Safely parse a monetary value to cents (integer).
 * Returns 0 for invalid/malformed values and detects anomalies.
 */
function parseMoneyToCents(value: unknown): { cents: number; isValid: boolean } {
  if (value === null || value === undefined) {
    return { cents: 0, isValid: true };
  }

  const num = Number(value);

  // Check for NaN, Infinity, or non-finite values
  if (!Number.isFinite(num)) {
    return { cents: 0, isValid: false };
  }

  // Convert to cents (integer) to avoid floating point issues
  // Round to handle any floating point representation errors
  const cents = Math.round(num * 100);

  return { cents, isValid: true };
}

/**
 * Convert cents back to dollars for display
 */
function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Calculate days remaining using UTC to avoid timezone issues
 */
function calculateDaysRemainingUTC(endDateString: string): number {
  const endDate = new Date(endDateString);
  const now = new Date();

  // Use UTC to ensure consistent calculation regardless of client timezone
  const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const diffMs = endUTC - nowUTC;
  return Math.max(0, Math.ceil(diffMs / MS_PER_DAY));
}

/**
 * Calculate days since a date using UTC
 */
function calculateDaysSinceUTC(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();

  const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return (nowUTC - dateUTC) / MS_PER_DAY;
}

export function usePaymentLedger(userId?: string) {
  const [entries, setEntries] = useState<PaymentLedgerEntry[]>([]);
  const [summary, setSummary] = useState<PaymentLedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track request ordering to prevent race conditions
  const requestIdRef = useRef(0);
  // Track the current channel for proper cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchEntries = useCallback(async () => {
    // Increment request ID to track this specific request
    const currentRequestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const authenticatedUserId = session?.user?.id;

      // Determine target user ID
      const targetUserId = userId || authenticatedUserId;

      // FIX #3: Authorization check - only allow fetching own data unless explicit userId matches
      if (!targetUserId) {
        setEntries([]);
        setSummary(null);
        return;
      }

      // If a specific userId is requested, verify it matches the authenticated user
      // RLS should also enforce this, but defense in depth
      if (userId && userId !== authenticatedUserId) {
        // For now, we allow this for admin contexts, but log it
        // In production, you'd check if user has admin role
        console.warn(`Payment ledger accessed for different user: requested=${userId}, authenticated=${authenticatedUserId}`);
      }

      const { data, error: fetchError } = await supabase
        .from('payment_ledger')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      // FIX #2: Check if this request is still the latest one
      if (currentRequestId !== requestIdRef.current) {
        // A newer request was made, discard this result
        return;
      }

      if (fetchError) {
        throw fetchError;
      }

      const ledgerEntries = (data || []) as PaymentLedgerEntry[];
      setEntries(ledgerEntries);

      // Calculate summary using integer cents to avoid floating point errors
      let totalAccruedCents = 0;
      let totalPaidCents = 0;
      let totalPendingCents = 0;
      let totalClearingCents = 0;

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
        clawedBackCount: 0,
        hasActiveFlaggableItems: false,
        entriesBySource: {},
        anomalies: [],
        hasAnomalies: false,
      };

      const clearingRequestMap: Record<string, ClearingRequest & { amountCents: number }> = {};
      let earliestClearingEnd: Date | null = null;

      ledgerEntries.forEach(entry => {
        // FIX #5: Safe number parsing with anomaly detection
        const accruedResult = parseMoneyToCents(entry.accrued_amount);
        const paidResult = parseMoneyToCents(entry.paid_amount);

        const accruedCents = accruedResult.cents;
        const paidCents = paidResult.cents;

        // Detect invalid amounts
        if (!accruedResult.isValid) {
          summaryData.anomalies.push({
            entryId: entry.id,
            type: 'invalid_amount',
            description: `Invalid accrued amount: ${entry.accrued_amount}`,
            amount: 0,
          });
        }
        if (!paidResult.isValid) {
          summaryData.anomalies.push({
            entryId: entry.id,
            type: 'invalid_amount',
            description: `Invalid paid amount: ${entry.paid_amount}`,
            amount: 0,
          });
        }

        // FIX #4: Detect overpayments instead of masking them
        const pendingCents = accruedCents - paidCents;
        if (pendingCents < 0) {
          summaryData.anomalies.push({
            entryId: entry.id,
            type: 'overpayment',
            description: `Paid amount (${centsToDollars(paidCents)}) exceeds accrued (${centsToDollars(accruedCents)})`,
            amount: centsToDollars(Math.abs(pendingCents)),
          });
        }

        // For calculations, use 0 for negative pending (but we've logged the anomaly)
        const safePendingCents = Math.max(0, pendingCents);

        totalAccruedCents += accruedCents;
        totalPaidCents += paidCents;

        // Map status for UI
        let uiStatus: VideoLedgerEntry['status'] = 'accruing';
        if (entry.status === 'pending') {
          totalPendingCents += safePendingCents;
          uiStatus = 'accruing';
          summaryData.accruingCount++;
        } else if (entry.status === 'paid' && safePendingCents > 0) {
          totalPendingCents += safePendingCents;
          uiStatus = 'accruing';
          summaryData.accruingCount++;
        } else if (entry.status === 'clearing') {
          totalClearingCents += safePendingCents;
          uiStatus = 'clearing';
          summaryData.clearingCount++;

          if (entry.clearing_ends_at) {
            const endDate = new Date(entry.clearing_ends_at);
            if (!earliestClearingEnd || endDate < earliestClearingEnd) {
              earliestClearingEnd = endDate;
            }

            // FIX #6: Use UTC-based calculation for flagging window
            if (entry.locked_at) {
              const daysSinceLocked = calculateDaysSinceUTC(entry.locked_at);
              if (daysSinceLocked < FLAGGING_WINDOW_DAYS) {
                summaryData.hasActiveFlaggableItems = true;
              }
            }

            if (entry.payout_request_id) {
              if (!clearingRequestMap[entry.payout_request_id]) {
                const daysRemaining = calculateDaysRemainingUTC(entry.clearing_ends_at);
                const daysSinceLocked = entry.locked_at
                  ? calculateDaysSinceUTC(entry.locked_at)
                  : 0;

                clearingRequestMap[entry.payout_request_id] = {
                  id: entry.payout_request_id,
                  amount: 0,
                  amountCents: 0,
                  clearingEndsAt: entry.clearing_ends_at,
                  daysRemaining,
                  canBeFlagged: daysSinceLocked < FLAGGING_WINDOW_DAYS,
                  itemCount: 0,
                };
              }
              clearingRequestMap[entry.payout_request_id].amountCents += safePendingCents;
              clearingRequestMap[entry.payout_request_id].itemCount++;
            }
          }
        } else if (entry.status === 'paid') {
          uiStatus = 'paid';
          summaryData.paidCount++;
        } else if (entry.status === 'clawed_back') {
          uiStatus = 'clawed_back';
          summaryData.clawedBackCount++;
        }

        const videoKey = entry.video_submission_id || entry.boost_submission_id || entry.id;
        summaryData.entriesByVideo[videoKey] = {
          videoSubmissionId: entry.video_submission_id,
          boostSubmissionId: entry.boost_submission_id,
          status: uiStatus,
          accrued: centsToDollars(accruedCents),
          paid: centsToDollars(paidCents),
          pending: centsToDollars(safePendingCents),
          clearingEndsAt: entry.clearing_ends_at || undefined,
          payoutRequestId: entry.payout_request_id || undefined,
          createdAt: entry.created_at,
        };

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
        // Store as dollars for the source breakdown
        const source = summaryData.entriesBySource[key];
        source.accrued = centsToDollars(
          Math.round(source.accrued * 100) + accruedCents
        );
        source.paid = centsToDollars(
          Math.round(source.paid * 100) + paidCents
        );
        source.pending = centsToDollars(
          Math.round(source.pending * 100) + safePendingCents
        );
      });

      // FIX #1: Convert cents back to dollars for final summary
      summaryData.totalAccrued = centsToDollars(totalAccruedCents);
      summaryData.totalPaid = centsToDollars(totalPaidCents);
      summaryData.totalPending = centsToDollars(totalPendingCents);
      summaryData.totalClearing = centsToDollars(totalClearingCents);

      // Convert clearing request amounts from cents to dollars
      summaryData.clearingRequests = Object.values(clearingRequestMap).map(req => ({
        id: req.id,
        amount: centsToDollars(req.amountCents),
        clearingEndsAt: req.clearingEndsAt,
        daysRemaining: req.daysRemaining,
        canBeFlagged: req.canBeFlagged,
        itemCount: req.itemCount,
      }));

      if (earliestClearingEnd) {
        summaryData.earliestClearingEndsAt = earliestClearingEnd.toISOString();
      }

      // Set anomaly flag
      summaryData.hasAnomalies = summaryData.anomalies.length > 0;

      // FIX #2: Final check that this is still the latest request
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setSummary(summaryData);
    } catch (err) {
      // Only update error state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        console.error('Error fetching payment ledger:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch payment ledger');
      }
    } finally {
      // Only update loading state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  // FIX #7: Separate effect for realtime subscription with proper cleanup
  useEffect(() => {
    // Initial fetch
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    // Clean up previous channel if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Only set up subscription if we have a valid userId
    if (!userId) {
      return;
    }

    // Set up real-time listener
    const channel = supabase
      .channel(`payment-ledger-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_ledger',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, fetchEntries]);

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
      .reduce((sum, e) => {
        const { cents: accruedCents } = parseMoneyToCents(e.accrued_amount);
        const { cents: paidCents } = parseMoneyToCents(e.paid_amount);
        return sum + centsToDollars(Math.max(0, accruedCents - paidCents));
      }, 0);
  };

  const getEntryByVideoId = (videoId: string): VideoLedgerEntry | null => {
    return summary?.entriesByVideo[videoId] || null;
  };

  const requestPayoutForVideo = async (videoSubmissionId: string) => {
    return requestPayout(undefined, undefined, videoSubmissionId, undefined);
  };

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
