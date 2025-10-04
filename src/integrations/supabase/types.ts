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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      brand_course_access: {
        Row: {
          brand_id: string
          course_id: string
          created_at: string
          has_access: boolean
          id: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          course_id: string
          created_at?: string
          has_access?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          course_id?: string
          created_at?: string
          has_access?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_course_access_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          account_url: string | null
          assets_url: string | null
          brand_type: string | null
          created_at: string
          description: string | null
          home_url: string | null
          id: string
          logo_url: string | null
          name: string
          show_account_tab: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          account_url?: string | null
          assets_url?: string | null
          brand_type?: string | null
          created_at?: string
          description?: string | null
          home_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          show_account_tab?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          account_url?: string | null
          assets_url?: string | null
          brand_type?: string | null
          created_at?: string
          description?: string | null
          home_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          show_account_tab?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_account_analytics: {
        Row: {
          account_link: string | null
          account_username: string
          amount_of_videos_tracked: string | null
          average_engagement_rate: number | null
          average_video_views: number | null
          campaign_id: string
          created_at: string
          end_date: string | null
          id: string
          last_payment_amount: number | null
          last_payment_date: string | null
          last_tracked: string | null
          outperforming_video_rate: number | null
          paid_views: number | null
          platform: string
          posts_last_7_days: Json | null
          start_date: string | null
          total_comments: number | null
          total_likes: number | null
          total_videos: number | null
          total_views: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_link?: string | null
          account_username: string
          amount_of_videos_tracked?: string | null
          average_engagement_rate?: number | null
          average_video_views?: number | null
          campaign_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_tracked?: string | null
          outperforming_video_rate?: number | null
          paid_views?: number | null
          platform: string
          posts_last_7_days?: Json | null
          start_date?: string | null
          total_comments?: number | null
          total_likes?: number | null
          total_videos?: number | null
          total_views?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_link?: string | null
          account_username?: string
          amount_of_videos_tracked?: string | null
          average_engagement_rate?: number | null
          average_video_views?: number | null
          campaign_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_tracked?: string | null
          outperforming_video_rate?: number | null
          paid_views?: number | null
          platform?: string
          posts_last_7_days?: Json | null
          start_date?: string | null
          total_comments?: number | null
          total_likes?: number | null
          total_videos?: number | null
          total_views?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_submissions: {
        Row: {
          campaign_id: string
          content_url: string
          creator_id: string
          earnings: number | null
          id: string
          platform: string
          reviewed_at: string | null
          status: string | null
          submitted_at: string | null
          views: number | null
        }
        Insert: {
          campaign_id: string
          content_url: string
          creator_id: string
          earnings?: number | null
          id?: string
          platform: string
          reviewed_at?: string | null
          status?: string | null
          submitted_at?: string | null
          views?: number | null
        }
        Update: {
          campaign_id?: string
          content_url?: string
          creator_id?: string
          earnings?: number | null
          id?: string
          platform?: string
          reviewed_at?: string | null
          status?: string | null
          submitted_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_submissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_submissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          access_code: string | null
          allowed_platforms: string[] | null
          application_questions: Json | null
          banner_url: string | null
          brand_id: string | null
          brand_logo_url: string | null
          brand_name: string
          budget: number
          budget_used: number | null
          created_at: string | null
          description: string | null
          embed_url: string | null
          end_date: string | null
          guidelines: string | null
          id: string
          is_private: boolean | null
          preview_url: string | null
          rpm_rate: number
          slug: string
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_code?: string | null
          allowed_platforms?: string[] | null
          application_questions?: Json | null
          banner_url?: string | null
          brand_id?: string | null
          brand_logo_url?: string | null
          brand_name: string
          budget: number
          budget_used?: number | null
          created_at?: string | null
          description?: string | null
          embed_url?: string | null
          end_date?: string | null
          guidelines?: string | null
          id?: string
          is_private?: boolean | null
          preview_url?: string | null
          rpm_rate: number
          slug: string
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_code?: string | null
          allowed_platforms?: string[] | null
          application_questions?: Json | null
          banner_url?: string | null
          brand_id?: string | null
          brand_logo_url?: string | null
          brand_name?: string
          budget?: number
          budget_used?: number | null
          created_at?: string | null
          description?: string | null
          embed_url?: string | null
          end_date?: string | null
          guidelines?: string | null
          id?: string
          is_private?: boolean | null
          preview_url?: string | null
          rpm_rate?: number
          slug?: string
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          id?: string
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          brand_id: string | null
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      demographic_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          screenshot_url: string | null
          social_account_id: string
          status: string
          submitted_at: string
          tier1_percentage: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          screenshot_url?: string | null
          social_account_id: string
          status?: string
          submitted_at?: string
          tier1_percentage: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          screenshot_url?: string | null
          social_account_id?: string
          status?: string
          submitted_at?: string
          tier1_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demographic_submissions_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          key_name: string
          key_value: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          key_name: string
          key_value: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          key_name?: string
          key_value?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payout_details: Json
          payout_method: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["payout_status_new"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payout_details: Json
          payout_method: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status_new"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payout_details?: Json
          payout_method?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status_new"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          demographics_score: number | null
          full_name: string | null
          id: string
          phone_number: string | null
          total_earnings: number | null
          trust_score: number | null
          updated_at: string | null
          username: string
          views_score: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          demographics_score?: number | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          total_earnings?: number | null
          trust_score?: number | null
          updated_at?: string | null
          username: string
          views_score?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          demographics_score?: number | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          total_earnings?: number | null
          trust_score?: number | null
          updated_at?: string | null
          username?: string
          views_score?: number | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          account_link: string | null
          campaign_id: string | null
          connected_at: string | null
          follower_count: number | null
          id: string
          is_verified: boolean | null
          platform: string
          user_id: string
          username: string
          verification_screenshot_url: string | null
        }
        Insert: {
          account_link?: string | null
          campaign_id?: string | null
          connected_at?: string | null
          follower_count?: number | null
          id?: string
          is_verified?: boolean | null
          platform: string
          user_id: string
          username: string
          verification_screenshot_url?: string | null
        }
        Update: {
          account_link?: string | null
          campaign_id?: string | null
          connected_at?: string | null
          follower_count?: number | null
          id?: string
          is_verified?: boolean | null
          platform?: string
          user_id?: string
          username?: string
          verification_screenshot_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_accounts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_campaigns: {
        Row: {
          allowed_platforms: string[] | null
          application_questions: Json | null
          banner_url: string | null
          brand_id: string | null
          brand_logo_url: string | null
          brand_name: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          guidelines: string | null
          id: string | null
          is_private: boolean | null
          preview_url: string | null
          slug: string | null
          start_date: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_platforms?: string[] | null
          application_questions?: Json | null
          banner_url?: string | null
          brand_id?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          guidelines?: string | null
          id?: string | null
          is_private?: boolean | null
          preview_url?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_platforms?: string[] | null
          application_questions?: Json | null
          banner_url?: string | null
          brand_id?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          guidelines?: string | null
          id?: string | null
          is_private?: boolean | null
          preview_url?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          demographics_score: number | null
          full_name: string | null
          id: string | null
          total_earnings: number | null
          trust_score: number | null
          username: string | null
          views_score: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          demographics_score?: number | null
          full_name?: string | null
          id?: string | null
          total_earnings?: number | null
          trust_score?: number | null
          username?: string | null
          views_score?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          demographics_score?: number | null
          full_name?: string | null
          id?: string | null
          total_earnings?: number | null
          trust_score?: number | null
          username?: string | null
          views_score?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrypt_payout_details: {
        Args: { encrypted_details: string; wallet_user_id: string }
        Returns: Json
      }
      encrypt_payout_details: {
        Args: { details: Json }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_analytics_to_users: {
        Args: { p_campaign_id: string }
        Returns: {
          matched_count: number
          total_count: number
          unmatched_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      payout_status_new: "pending" | "in_transit" | "completed" | "rejected"
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
      app_role: ["admin", "user"],
      payout_status_new: ["pending", "in_transit", "completed", "rejected"],
    },
  },
} as const
