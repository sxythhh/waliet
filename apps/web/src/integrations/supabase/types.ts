export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      business_members: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_wallet_transactions: {
        Row: {
          amount: number
          business_id: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: string | null
          type: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_wallet_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_wallets: {
        Row: {
          balance: number | null
          business_id: string
          created_at: string | null
          id: string
          total_deposited: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          business_id: string
          created_at?: string | null
          id?: string
          total_deposited?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          business_id?: string
          created_at?: string | null
          id?: string
          total_deposited?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_wallets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          brand_color: string | null
          business_details: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name: string
          notify_new_application: boolean | null
          notify_new_message: boolean | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          settings: Json | null
          slug: string
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          brand_color?: string | null
          business_details?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          notify_new_application?: boolean | null
          notify_new_message?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          settings?: Json | null
          slug: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          brand_color?: string | null
          business_details?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          notify_new_application?: boolean | null
          notify_new_message?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          settings?: Json | null
          slug?: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          net_amount: number | null
          payout_details: Json
          payout_method: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          net_amount?: number | null
          payout_details: Json
          payout_method: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          net_amount?: number | null
          payout_details?: Json
          payout_method?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          interests: string[] | null
          is_private: boolean | null
          notify_email_new_tasks: boolean | null
          notify_email_payout_status: boolean | null
          notify_email_task_updates: boolean | null
          notify_email_transactions: boolean | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone_number: string | null
          referral_code: string | null
          referral_earnings: number | null
          referred_by: string | null
          skills: string[] | null
          successful_referrals: number | null
          total_earnings: number | null
          total_referrals: number | null
          trust_score: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          interests?: string[] | null
          is_private?: boolean | null
          notify_email_new_tasks?: boolean | null
          notify_email_payout_status?: boolean | null
          notify_email_task_updates?: boolean | null
          notify_email_transactions?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone_number?: string | null
          referral_code?: string | null
          referral_earnings?: number | null
          referred_by?: string | null
          skills?: string[] | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          trust_score?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          is_private?: boolean | null
          notify_email_new_tasks?: boolean | null
          notify_email_payout_status?: boolean | null
          notify_email_task_updates?: boolean | null
          notify_email_transactions?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone_number?: string | null
          referral_code?: string | null
          referral_earnings?: number | null
          referred_by?: string | null
          skills?: string[] | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          trust_score?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          paid_at: string | null
          referred_id: string
          referrer_id: string
          reward_amount: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_applications: {
        Row: {
          application_answers: Json | null
          application_text: string | null
          applied_at: string | null
          approved_rate: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          proposed_rate: number | null
          rate_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_answers?: Json | null
          application_text?: string | null
          applied_at?: string | null
          approved_rate?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          proposed_rate?: number | null
          rate_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_answers?: Json | null
          application_text?: string | null
          applied_at?: string | null
          approved_rate?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          proposed_rate?: number | null
          rate_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_applications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_bookmarks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          amount_earned: number | null
          attachments: Json | null
          created_at: string | null
          feedback: string | null
          id: string
          paid_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submission_text: string | null
          submission_url: string | null
          task_application_id: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_earned?: number | null
          attachments?: Json | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          paid_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_text?: string | null
          submission_url?: string | null
          task_application_id: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_earned?: number | null
          attachments?: Json | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          paid_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_text?: string | null
          submission_url?: string | null
          task_application_id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_task_application_id_fkey"
            columns: ["task_application_id"]
            isOneToOne: false
            referencedRelation: "task_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          application_questions: Json | null
          banner_url: string | null
          budget: number | null
          budget_used: number | null
          business_id: string
          category: string | null
          created_at: string | null
          current_participants: number | null
          deadline: string | null
          description: string | null
          end_date: string | null
          id: string
          is_private: boolean | null
          max_participants: number | null
          payment_model: string | null
          rate_max: number | null
          rate_min: number | null
          requirements: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_amount: number
          skills_required: string[] | null
          slug: string | null
          start_date: string | null
          status: string | null
          tags: string[] | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          application_questions?: Json | null
          banner_url?: string | null
          budget?: number | null
          budget_used?: number | null
          business_id: string
          category?: string | null
          created_at?: string | null
          current_participants?: number | null
          deadline?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_private?: boolean | null
          max_participants?: number | null
          payment_model?: string | null
          rate_max?: number | null
          rate_min?: number | null
          requirements?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount?: number
          skills_required?: string[] | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          application_questions?: Json | null
          banner_url?: string | null
          budget?: number | null
          budget_used?: number | null
          business_id?: string
          category?: string | null
          created_at?: string | null
          current_participants?: number | null
          deadline?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_private?: boolean | null
          max_participants?: number | null
          payment_model?: string | null
          rate_max?: number | null
          rate_min?: number | null
          requirements?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount?: number
          skills_required?: string[] | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          message: string
          sender_id: string
          sender_type: string | null
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message: string
          sender_id: string
          sender_type?: string | null
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          payout_details: Json | null
          payout_method: string | null
          total_earned: number | null
          total_withdrawn: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          payout_details?: Json | null
          payout_method?: string | null
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          payout_details?: Json | null
          payout_method?: string | null
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_to_wallet: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "business"
      payout_status: "pending" | "in_transit" | "completed" | "rejected"
      PayoutStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      PurchaseStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
      RefundStatus: "PENDING" | "APPROVED" | "DENIED" | "PROCESSED"
      ReviewType: "BUYER_TO_SELLER" | "SELLER_TO_BUYER"
      SessionStatus:
        | "REQUESTED"
        | "ACCEPTED"
        | "DECLINED"
        | "CANCELLED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "RATED"
        | "NO_SHOW_BUYER"
        | "NO_SHOW_SELLER"
        | "DISPUTED"
        | "AWAITING_CONFIRMATION"
        | "PAID_OUT"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "business"],
      payout_status: ["pending", "in_transit", "completed", "rejected"],
      PayoutStatus: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      PurchaseStatus: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
      RefundStatus: ["PENDING", "APPROVED", "DENIED", "PROCESSED"],
      ReviewType: ["BUYER_TO_SELLER", "SELLER_TO_BUYER"],
      SessionStatus: [
        "REQUESTED",
        "ACCEPTED",
        "DECLINED",
        "CANCELLED",
        "IN_PROGRESS",
        "COMPLETED",
        "RATED",
        "NO_SHOW_BUYER",
        "NO_SHOW_SELLER",
        "DISPUTED",
        "AWAITING_CONFIRMATION",
        "PAID_OUT",
      ],
    },
  },
} as const
A new version of Supabase CLI is available: v2.72.7 (currently installed v2.67.1)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
