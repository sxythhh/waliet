// Payout Approval System Types

export type PayoutApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed';
export type PayoutType = 'crypto' | 'fiat';
export type VoteType = 'approve' | 'reject';
export type AuditAction = 'requested' | 'approved' | 'rejected' | 'executed' | 'failed' | 'expired' | 'vote_cast';

// Amount thresholds for approval requirements
export const PAYOUT_THRESHOLDS = {
  LOW: { max: 50, requiredApprovals: 1, delayMinutes: 0 },
  MEDIUM: { max: 500, requiredApprovals: 2, delayMinutes: 0 },
  HIGH: { max: Infinity, requiredApprovals: 3, delayMinutes: 60 },
} as const;

export function getRequiredApprovals(amount: number): { requiredApprovals: number; delayMinutes: number; tier: string } {
  if (amount <= PAYOUT_THRESHOLDS.LOW.max) {
    return { ...PAYOUT_THRESHOLDS.LOW, tier: 'LOW' };
  }
  if (amount <= PAYOUT_THRESHOLDS.MEDIUM.max) {
    return { ...PAYOUT_THRESHOLDS.MEDIUM, tier: 'MEDIUM' };
  }
  return { ...PAYOUT_THRESHOLDS.HIGH, tier: 'HIGH' };
}

export interface PayoutApproval {
  id: string;
  payout_request_id: string | null;
  payout_type: PayoutType;
  user_id: string;
  amount: number;
  currency: string;
  wallet_address: string | null;
  status: PayoutApprovalStatus;
  required_approvals: number;
  requested_by: string;
  requested_at: string;
  expires_at: string;
  executed_at: string | null;
  executed_by: string | null;
  tx_signature: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  requester?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  recipient?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  votes?: PayoutApprovalVote[];
  vote_count?: {
    approve_count: number;
    reject_count: number;
  };
}

export interface PayoutApprovalVote {
  id: string;
  approval_id: string;
  admin_id: string;
  vote: VoteType;
  comment: string | null;
  voted_at: string;
  // Joined data
  admin?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface PayoutAuditLog {
  id: string;
  payout_id: string | null;
  approval_id: string | null;
  action: AuditAction;
  actor_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  // Joined data
  actor?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

// Request/Response types for edge functions
export interface RequestPayoutApprovalInput {
  payout_request_id: string;
}

export interface RequestPayoutApprovalResponse {
  success: boolean;
  approval_id?: string;
  required_approvals?: number;
  error?: string;
}

export interface CastApprovalVoteInput {
  approval_id: string;
  vote: VoteType;
  comment?: string;
}

export interface CastApprovalVoteResponse {
  success: boolean;
  vote_id?: string;
  approval_status?: PayoutApprovalStatus;
  can_execute?: boolean;
  error?: string;
}

export interface ExecuteApprovalInput {
  approval_id: string;
}

export interface ExecuteApprovalResponse {
  success: boolean;
  tx_signature?: string;
  error?: string;
}
