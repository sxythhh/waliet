// Creator Tiers System Types

export interface PromotionCriteria {
  min_months_active: number;
  min_avg_views: number;
  min_completion_rate: number; // 0-1
  min_engagement_rate: number; // 0-1
}

export interface DemotionCriteria {
  consecutive_missed_quotas: number;
  min_completion_rate: number; // Below this triggers warning
}

export interface CreatorTier {
  id: string;
  bounty_campaign_id: string;
  name: string;
  level: number;
  monthly_retainer: number;
  videos_per_month: number;
  perks: string[];
  color: string;
  icon?: string;
  promotion_criteria: PromotionCriteria;
  demotion_criteria: DemotionCriteria;
  is_default: boolean;
  is_entry_tier: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatorTierAssignment {
  id: string;
  bounty_campaign_id: string;
  user_id: string;
  tier_id: string;
  assigned_at: string;
  assigned_by?: string;
  assignment_reason: 'initial' | 'auto_promoted' | 'auto_demoted' | 'manual';
  months_in_tier: number;
  tier_start_date: string;
  previous_tier_id?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  tier?: CreatorTier;
}

export type TierChangeType = 'initial' | 'promotion' | 'demotion' | 'manual' | 'lateral';

export interface TierChangeHistory {
  id: string;
  bounty_campaign_id: string;
  user_id: string;
  from_tier_id?: string;
  to_tier_id?: string;
  change_type: TierChangeType;
  change_reason?: string;
  changed_by?: string;
  performance_snapshot: PerformanceSnapshot;
  criteria_evaluation: CriteriaEvaluation;
  created_at: string;
  // Joined data
  from_tier?: CreatorTier;
  to_tier?: CreatorTier;
}

export interface PerformanceSnapshot {
  avg_views?: number;
  completion_rate?: number;
  engagement_rate?: number;
  months_active?: number;
  total_earned?: number;
  videos_submitted?: number;
  videos_approved?: number;
}

export interface CriteriaEvaluation {
  met_criteria?: string[];
  failed_criteria?: string[];
  promotion_eligible?: boolean;
  demotion_warning?: boolean;
}

export interface CreatorTierMetrics {
  id: string;
  bounty_campaign_id: string;
  user_id: string;
  tier_id: string;
  period_year: number;
  period_month: number;
  videos_submitted: number;
  videos_approved: number;
  videos_rejected: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  completion_rate: number;
  avg_views_per_video: number;
  engagement_rate: number;
  base_earnings: number;
  bonus_earnings: number;
  total_earnings: number;
  quota_required: number;
  quota_met: boolean;
  promotion_eligible: boolean;
  demotion_warning: boolean;
  created_at: string;
  updated_at: string;
}

// Default tier templates for quick setup
export const DEFAULT_TIER_TEMPLATES: Omit<CreatorTier, 'id' | 'bounty_campaign_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Bronze',
    level: 1,
    monthly_retainer: 100,
    videos_per_month: 2,
    perks: ['Access to brand resources', 'Monthly newsletter'],
    color: '#CD7F32',
    is_default: false,
    is_entry_tier: true,
    promotion_criteria: {
      min_months_active: 2,
      min_avg_views: 1000,
      min_completion_rate: 0.9,
      min_engagement_rate: 0.02,
    },
    demotion_criteria: {
      consecutive_missed_quotas: 2,
      min_completion_rate: 0.5,
    },
  },
  {
    name: 'Silver',
    level: 2,
    monthly_retainer: 250,
    videos_per_month: 4,
    perks: ['Priority support', 'Early campaign access', 'Exclusive Discord role'],
    color: '#C0C0C0',
    is_default: false,
    is_entry_tier: false,
    promotion_criteria: {
      min_months_active: 3,
      min_avg_views: 5000,
      min_completion_rate: 0.95,
      min_engagement_rate: 0.03,
    },
    demotion_criteria: {
      consecutive_missed_quotas: 2,
      min_completion_rate: 0.6,
    },
  },
  {
    name: 'Gold',
    level: 3,
    monthly_retainer: 500,
    videos_per_month: 6,
    perks: ['1:1 brand meetings', 'Product gifting', 'Featured creator spotlight', 'Performance bonuses'],
    color: '#FFD700',
    is_default: false,
    is_entry_tier: false,
    promotion_criteria: {
      min_months_active: 4,
      min_avg_views: 15000,
      min_completion_rate: 0.95,
      min_engagement_rate: 0.04,
    },
    demotion_criteria: {
      consecutive_missed_quotas: 2,
      min_completion_rate: 0.7,
    },
  },
  {
    name: 'Platinum',
    level: 4,
    monthly_retainer: 1000,
    videos_per_month: 8,
    perks: ['VIP support', 'Revenue share opportunities', 'Co-creation opportunities', 'Event invitations', 'Custom content briefs'],
    color: '#E5E4E2',
    is_default: false,
    is_entry_tier: false,
    promotion_criteria: {
      min_months_active: 6,
      min_avg_views: 50000,
      min_completion_rate: 0.98,
      min_engagement_rate: 0.05,
    },
    demotion_criteria: {
      consecutive_missed_quotas: 3,
      min_completion_rate: 0.8,
    },
  },
];

// Tier color presets
export const TIER_COLORS = [
  { name: 'Bronze', value: '#CD7F32' },
  { name: 'Silver', value: '#C0C0C0' },
  { name: 'Gold', value: '#FFD700' },
  { name: 'Platinum', value: '#E5E4E2' },
  { name: 'Diamond', value: '#B9F2FF' },
  { name: 'Ruby', value: '#E0115F' },
  { name: 'Emerald', value: '#50C878' },
  { name: 'Sapphire', value: '#0F52BA' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Indigo', value: '#6366F1' },
];

// Helper to calculate progress toward next tier
export function calculateTierProgress(
  currentMetrics: PerformanceSnapshot,
  nextTierCriteria: PromotionCriteria
): {
  overallProgress: number;
  criteriaProgress: {
    name: string;
    current: number;
    required: number;
    progress: number;
    met: boolean;
  }[];
} {
  const criteriaProgress = [
    {
      name: 'Months Active',
      current: currentMetrics.months_active || 0,
      required: nextTierCriteria.min_months_active,
      progress: nextTierCriteria.min_months_active > 0
        ? Math.min(100, ((currentMetrics.months_active || 0) / nextTierCriteria.min_months_active) * 100)
        : 100,
      met: (currentMetrics.months_active || 0) >= nextTierCriteria.min_months_active,
    },
    {
      name: 'Avg Views',
      current: currentMetrics.avg_views || 0,
      required: nextTierCriteria.min_avg_views,
      progress: nextTierCriteria.min_avg_views > 0
        ? Math.min(100, ((currentMetrics.avg_views || 0) / nextTierCriteria.min_avg_views) * 100)
        : 100,
      met: (currentMetrics.avg_views || 0) >= nextTierCriteria.min_avg_views,
    },
    {
      name: 'Completion Rate',
      current: (currentMetrics.completion_rate || 0) * 100,
      required: nextTierCriteria.min_completion_rate * 100,
      progress: nextTierCriteria.min_completion_rate > 0
        ? Math.min(100, ((currentMetrics.completion_rate || 0) / nextTierCriteria.min_completion_rate) * 100)
        : 100,
      met: (currentMetrics.completion_rate || 0) >= nextTierCriteria.min_completion_rate,
    },
    {
      name: 'Engagement Rate',
      current: (currentMetrics.engagement_rate || 0) * 100,
      required: nextTierCriteria.min_engagement_rate * 100,
      progress: nextTierCriteria.min_engagement_rate > 0
        ? Math.min(100, ((currentMetrics.engagement_rate || 0) / nextTierCriteria.min_engagement_rate) * 100)
        : 100,
      met: (currentMetrics.engagement_rate || 0) >= nextTierCriteria.min_engagement_rate,
    },
  ];

  const metCount = criteriaProgress.filter(c => c.met).length;
  const overallProgress = (metCount / criteriaProgress.length) * 100;

  return { overallProgress, criteriaProgress };
}
