// Deliverables System Types

export type DeliverableStatus =
  | 'scheduled'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'approved'
  | 'late'
  | 'missed'
  | 'cancelled';

export type DeliverableContentType =
  | 'video'
  | 'short'
  | 'reel'
  | 'story'
  | 'post'
  | 'carousel'
  | 'live'
  | 'other';

export type DeliverablePlatform =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'twitter'
  | 'other';

export type DeliverablePriority = 'low' | 'normal' | 'high' | 'urgent';

export type RecurrenceType = 'weekly' | 'biweekly' | 'monthly';

export interface Deliverable {
  id: string;
  bounty_campaign_id: string;
  user_id: string;

  // Details
  title: string;
  description?: string;
  content_brief?: string;

  // Scheduling
  due_date: string; // DATE
  due_time?: string; // TIME
  reminder_days: number[];

  // Content requirements
  content_type: DeliverableContentType;
  platform?: DeliverablePlatform;
  min_duration_seconds?: number;
  max_duration_seconds?: number;
  required_hashtags?: string[];
  required_mentions?: string[];

  // Status
  status: DeliverableStatus;
  submission_id?: string;
  submitted_at?: string;
  revision_notes?: string;
  revision_count: number;

  // Review
  reviewed_at?: string;
  reviewed_by?: string;

  // Priority
  priority: DeliverablePriority;
  sort_order: number;

  // Template info
  template_id?: string;
  recurrence_instance?: number;

  // Reminders
  reminder_7d_sent_at?: string;
  reminder_3d_sent_at?: string;
  reminder_1d_sent_at?: string;
  overdue_reminder_sent_at?: string;

  // Notes
  brand_notes?: string;
  creator_notes?: string;

  created_at: string;
  updated_at: string;

  // Joined data
  submission?: {
    id: string;
    video_url: string;
    status: string;
    views?: number;
  };
  creator?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

export interface DeliverableTemplate {
  id: string;
  bounty_campaign_id: string;

  // Template details
  title: string;
  description?: string;
  content_brief?: string;

  // Content requirements
  content_type: DeliverableContentType;
  platform?: DeliverablePlatform;
  min_duration_seconds?: number;
  max_duration_seconds?: number;
  required_hashtags?: string[];
  required_mentions?: string[];

  // Recurrence
  recurrence: RecurrenceType;
  day_of_week?: number; // 0-6, 0=Sunday
  day_of_month?: number; // 1-28
  week_of_month?: number; // 1-4

  // Assignment
  apply_to_all_creators: boolean;
  specific_tier_ids?: string[];
  specific_user_ids?: string[];

  // Auto-generation
  auto_create: boolean;
  advance_days: number;

  // Priority
  default_priority: DeliverablePriority;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliverableComment {
  id: string;
  deliverable_id: string;
  user_id: string;
  user_type: 'creator' | 'brand' | 'system';
  content: string;
  attachments: {
    url: string;
    filename: string;
    type: string;
  }[];
  is_read: boolean;
  read_at?: string;
  created_at: string;

  // Joined data
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

// Helper types for UI
export interface DeliverableWithMeta extends Deliverable {
  days_until_due: number;
  is_overdue: boolean;
  can_submit: boolean;
  comments_count?: number;
}

// Status configuration for UI
export const DELIVERABLE_STATUS_CONFIG: Record<
  DeliverableStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  }
> = {
  scheduled: {
    label: 'Scheduled',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'calendar',
  },
  in_progress: {
    label: 'In Progress',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'loader',
  },
  submitted: {
    label: 'Submitted',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: 'upload',
  },
  revision_requested: {
    label: 'Revision Requested',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'edit',
  },
  approved: {
    label: 'Approved',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'check',
  },
  late: {
    label: 'Late',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'alert-circle',
  },
  missed: {
    label: 'Missed',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'x',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'x-circle',
  },
};

export const CONTENT_TYPE_CONFIG: Record<
  DeliverableContentType,
  {
    label: string;
    icon: string;
  }
> = {
  video: { label: 'Video', icon: 'video' },
  short: { label: 'Short', icon: 'smartphone' },
  reel: { label: 'Reel', icon: 'film' },
  story: { label: 'Story', icon: 'square' },
  post: { label: 'Post', icon: 'image' },
  carousel: { label: 'Carousel', icon: 'layers' },
  live: { label: 'Live', icon: 'radio' },
  other: { label: 'Other', icon: 'file' },
};

export const PLATFORM_CONFIG: Record<
  DeliverablePlatform,
  {
    label: string;
    color: string;
  }
> = {
  tiktok: { label: 'TikTok', color: '#000000' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  youtube: { label: 'YouTube', color: '#FF0000' },
  twitter: { label: 'X/Twitter', color: '#1DA1F2' },
  other: { label: 'Other', color: '#6B7280' },
};

export const PRIORITY_CONFIG: Record<
  DeliverablePriority,
  {
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  low: { label: 'Low', color: '#6B7280', bgColor: '#F3F4F6' },
  normal: { label: 'Normal', color: '#3B82F6', bgColor: '#DBEAFE' },
  high: { label: 'High', color: '#F59E0B', bgColor: '#FEF3C7' },
  urgent: { label: 'Urgent', color: '#EF4444', bgColor: '#FEE2E2' },
};

// Helper function to calculate days until due
export function calculateDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper to check if deliverable can be submitted
export function canSubmitDeliverable(deliverable: Deliverable): boolean {
  return ['scheduled', 'in_progress', 'late', 'revision_requested'].includes(
    deliverable.status
  );
}

// Helper to get status badge props
export function getStatusBadgeProps(status: DeliverableStatus) {
  const config = DELIVERABLE_STATUS_CONFIG[status];
  return {
    label: config.label,
    style: {
      backgroundColor: config.bgColor,
      color: config.color,
    },
  };
}
