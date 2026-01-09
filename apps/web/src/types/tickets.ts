// Ticket Types

export type TicketStatus = "open" | "in_progress" | "awaiting_reply" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "billing" | "technical" | "account" | "campaign" | "payout" | "other";
export type MessageSenderType = "user" | "admin";

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  user?: TicketUser;
  assigned_admin?: AdminUser;
  message_count?: number;
  discord_channel?: {
    id: string;
    channel_id: string;
    channel_name: string | null;
    closed_at: string | null;
  };
}

export interface TicketUser {
  id?: string;
  username: string;
  email: string;
  avatar_url: string | null;
  full_name: string | null;
  trust_score?: number;
  demographics_score?: number;
  total_earnings?: number;
  created_at?: string;
  country?: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: MessageSenderType;
  content: string;
  is_internal: boolean;
  created_at: string;
  discord_synced?: boolean;
  sender?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  discord_message?: {
    source: "discord" | "web";
  };
}

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

export interface TicketStats {
  open: number;
  in_progress: number;
  awaiting_reply: number;
  resolved: number;
  closed: number;
  total: number;
}

export interface TicketFilters {
  search: string;
  status: TicketStatus | "all";
  priority: TicketPriority | "all";
  category: TicketCategory | "all";
  assigned: string | "all" | "unassigned";
}

export interface TicketTemplate {
  id: string;
  category: string;
  name: string;
  content: string;
}

export interface UserContext {
  profile: TicketUser & {
    id: string;
    bio?: string | null;
    phone_number?: string | null;
  };
  wallet?: {
    balance: number;
    total_earned: number;
    total_withdrawn: number;
  };
  social_accounts?: Array<{
    id: string;
    platform: string;
    username: string;
    follower_count: number | null;
    is_verified: boolean;
  }>;
  ticket_history?: Array<{
    id: string;
    ticket_number: string;
    subject: string;
    status: TicketStatus;
    created_at: string;
  }>;
  recent_transactions?: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    created_at: string;
  }>;
}
