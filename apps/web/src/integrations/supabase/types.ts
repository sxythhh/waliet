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
      admin_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string | null
          status: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source?: string | null
          status?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      admin_incidents: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string | null
          updates: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string | null
          updates?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string | null
          updates?: Json | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          resource: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          resource: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          resource?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          cta_link: string | null
          cta_text: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          show_as_popup: boolean | null
          target_audience: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          cta_link?: string | null
          cta_text?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          show_as_popup?: boolean | null
          target_audience?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          cta_link?: string | null
          cta_text?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          show_as_popup?: boolean | null
          target_audience?: string | null
          title?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          api_key_hash: string
          created_at: string
          endpoint: string
          id: string
        }
        Insert: {
          api_key_hash: string
          created_at?: string
          endpoint: string
          id?: string
        }
        Update: {
          api_key_hash?: string
          created_at?: string
          endpoint?: string
          id?: string
        }
        Relationships: []
      }
      audience_insights_requests: {
        Row: {
          brand_id: string
          campaign_id: string | null
          created_at: string | null
          creator_id: string
          expires_at: string | null
          id: string
          message: string | null
          requested_at: string | null
          responded_at: string | null
          social_account_id: string | null
          status: string
          submission_id: string | null
        }
        Insert: {
          brand_id: string
          campaign_id?: string | null
          created_at?: string | null
          creator_id: string
          expires_at?: string | null
          id?: string
          message?: string | null
          requested_at?: string | null
          responded_at?: string | null
          social_account_id?: string | null
          status?: string
          submission_id?: string | null
        }
        Update: {
          brand_id?: string
          campaign_id?: string | null
          created_at?: string | null
          creator_id?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          requested_at?: string | null
          responded_at?: string | null
          social_account_id?: string | null
          status?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audience_insights_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_insights_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_insights_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_insights_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_insights_requests_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_rejection_log: {
        Row: {
          created_at: string
          id: string
          rejection_reason: string
          rule_id: string
          submission_id: string | null
          submission_type: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          rejection_reason: string
          rule_id: string
          submission_id?: string | null
          submission_type: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          rejection_reason?: string
          rule_id?: string
          submission_id?: string | null
          submission_type?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_rejection_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_rejection_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_rejection_rules: {
        Row: {
          boost_id: string | null
          brand_id: string
          campaign_id: string | null
          created_at: string
          id: string
          is_active: boolean
          rejection_message: string
          rule_type: string
          rule_value: string | null
          updated_at: string
        }
        Insert: {
          boost_id?: string | null
          brand_id: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          rejection_message: string
          rule_type: string
          rule_value?: string | null
          updated_at?: string
        }
        Update: {
          boost_id?: string | null
          brand_id?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          rejection_message?: string
          rule_type?: string
          rule_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_rejection_rules_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_rejection_rules_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_rejection_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_rejection_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_devices: {
        Row: {
          ban_reason: string | null
          created_at: string
          creator_id: string | null
          expires_at: string | null
          fingerprint_id: string
          id: string
          ip_address: unknown
        }
        Insert: {
          ban_reason?: string | null
          created_at?: string
          creator_id?: string | null
          expires_at?: string | null
          fingerprint_id: string
          id?: string
          ip_address?: unknown
        }
        Update: {
          ban_reason?: string | null
          created_at?: string
          creator_id?: string | null
          expires_at?: string | null
          fingerprint_id?: string
          id?: string
          ip_address?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "banned_devices_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banned_devices_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          category: string | null
          content: string
          content_type: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          hidden_from_listing: boolean | null
          id: string
          image_url: string | null
          is_published: boolean
          published_at: string | null
          read_time: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string | null
          content: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          hidden_from_listing?: boolean | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          read_time?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string | null
          content?: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          hidden_from_listing?: boolean | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          read_time?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blueprint_templates: {
        Row: {
          assets: Json | null
          brand_voice: string | null
          call_to_action: string | null
          category: string | null
          content: string | null
          content_guidelines: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dos_and_donts: Json | null
          example_videos: Json | null
          hashtags: string[] | null
          hooks: Json | null
          id: string
          is_active: boolean
          platforms: string[] | null
          talking_points: Json | null
          target_personas: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          assets?: Json | null
          brand_voice?: string | null
          call_to_action?: string | null
          category?: string | null
          content?: string | null
          content_guidelines?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dos_and_donts?: Json | null
          example_videos?: Json | null
          hashtags?: string[] | null
          hooks?: Json | null
          id?: string
          is_active?: boolean
          platforms?: string[] | null
          talking_points?: Json | null
          target_personas?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          assets?: Json | null
          brand_voice?: string | null
          call_to_action?: string | null
          category?: string | null
          content?: string | null
          content_guidelines?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dos_and_donts?: Json | null
          example_videos?: Json | null
          hashtags?: string[] | null
          hooks?: Json | null
          id?: string
          is_active?: boolean
          platforms?: string[] | null
          talking_points?: Json | null
          target_personas?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blueprint_training_completions: {
        Row: {
          blueprint_id: string
          completed_at: string | null
          id: string
          module_id: string
          quiz_score: number | null
          user_id: string
        }
        Insert: {
          blueprint_id: string
          completed_at?: string | null
          id?: string
          module_id: string
          quiz_score?: number | null
          user_id: string
        }
        Update: {
          blueprint_id?: string
          completed_at?: string | null
          id?: string
          module_id?: string
          quiz_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_training_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_training_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprints: {
        Row: {
          assets: Json | null
          brand_id: string
          brand_voice: string | null
          call_to_action: string | null
          content: string | null
          content_guidelines: string | null
          created_at: string
          dos_and_donts: Json | null
          example_videos: Json | null
          faqs: Json | null
          hashtags: string[] | null
          hooks: Json | null
          id: string
          platforms: string[] | null
          section_order: string[] | null
          status: string
          talking_points: Json | null
          target_personas: Json | null
          title: string
          training_modules: Json | null
          updated_at: string
        }
        Insert: {
          assets?: Json | null
          brand_id: string
          brand_voice?: string | null
          call_to_action?: string | null
          content?: string | null
          content_guidelines?: string | null
          created_at?: string
          dos_and_donts?: Json | null
          example_videos?: Json | null
          faqs?: Json | null
          hashtags?: string[] | null
          hooks?: Json | null
          id?: string
          platforms?: string[] | null
          section_order?: string[] | null
          status?: string
          talking_points?: Json | null
          target_personas?: Json | null
          title?: string
          training_modules?: Json | null
          updated_at?: string
        }
        Update: {
          assets?: Json | null
          brand_id?: string
          brand_voice?: string | null
          call_to_action?: string | null
          content?: string | null
          content_guidelines?: string | null
          created_at?: string
          dos_and_donts?: Json | null
          example_videos?: Json | null
          faqs?: Json | null
          hashtags?: string[] | null
          hooks?: Json | null
          id?: string
          platforms?: string[] | null
          section_order?: string[] | null
          status?: string
          talking_points?: Json | null
          target_personas?: Json | null
          title?: string
          training_modules?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprints_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_creator_tiers: {
        Row: {
          bounty_campaign_id: string
          color: string | null
          created_at: string | null
          demotion_criteria: Json | null
          icon: string | null
          id: string
          is_default: boolean | null
          is_entry_tier: boolean | null
          level: number
          monthly_retainer: number
          name: string
          perks: Json | null
          promotion_criteria: Json | null
          updated_at: string | null
          videos_per_month: number
        }
        Insert: {
          bounty_campaign_id: string
          color?: string | null
          created_at?: string | null
          demotion_criteria?: Json | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_entry_tier?: boolean | null
          level?: number
          monthly_retainer: number
          name: string
          perks?: Json | null
          promotion_criteria?: Json | null
          updated_at?: string | null
          videos_per_month: number
        }
        Update: {
          bounty_campaign_id?: string
          color?: string | null
          created_at?: string | null
          demotion_criteria?: Json | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_entry_tier?: boolean | null
          level?: number
          monthly_retainer?: number
          name?: string
          perks?: Json | null
          promotion_criteria?: Json | null
          updated_at?: string | null
          videos_per_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "boost_creator_tiers_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_deliverables: {
        Row: {
          bounty_campaign_id: string
          brand_notes: string | null
          content_brief: string | null
          content_type: string
          created_at: string | null
          creator_notes: string | null
          description: string | null
          due_date: string
          due_time: string | null
          id: string
          max_duration_seconds: number | null
          min_duration_seconds: number | null
          overdue_reminder_sent_at: string | null
          platform: string | null
          priority: string | null
          recurrence_instance: number | null
          reminder_1d_sent_at: string | null
          reminder_3d_sent_at: string | null
          reminder_7d_sent_at: string | null
          reminder_days: number[] | null
          required_hashtags: string[] | null
          required_mentions: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_count: number | null
          revision_notes: string | null
          sort_order: number | null
          status: string | null
          submission_id: string | null
          submitted_at: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bounty_campaign_id: string
          brand_notes?: string | null
          content_brief?: string | null
          content_type?: string
          created_at?: string | null
          creator_notes?: string | null
          description?: string | null
          due_date: string
          due_time?: string | null
          id?: string
          max_duration_seconds?: number | null
          min_duration_seconds?: number | null
          overdue_reminder_sent_at?: string | null
          platform?: string | null
          priority?: string | null
          recurrence_instance?: number | null
          reminder_1d_sent_at?: string | null
          reminder_3d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          reminder_days?: number[] | null
          required_hashtags?: string[] | null
          required_mentions?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_count?: number | null
          revision_notes?: string | null
          sort_order?: number | null
          status?: string | null
          submission_id?: string | null
          submitted_at?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bounty_campaign_id?: string
          brand_notes?: string | null
          content_brief?: string | null
          content_type?: string
          created_at?: string | null
          creator_notes?: string | null
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          max_duration_seconds?: number | null
          min_duration_seconds?: number | null
          overdue_reminder_sent_at?: string | null
          platform?: string | null
          priority?: string | null
          recurrence_instance?: number | null
          reminder_1d_sent_at?: string | null
          reminder_3d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          reminder_days?: number[] | null
          required_hashtags?: string[] | null
          required_mentions?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_count?: number | null
          revision_notes?: string | null
          sort_order?: number | null
          status?: string | null
          submission_id?: string | null
          submitted_at?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_deliverables_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_deliverables_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "video_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_deliverables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "deliverable_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_editor_accounts: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          boost_id: string
          id: string
          is_active: boolean | null
          social_account_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          boost_id: string
          id?: string
          is_active?: boolean | null
          social_account_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          boost_id?: string
          id?: string
          is_active?: boolean | null
          social_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_editor_accounts_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_editor_accounts_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_editor_accounts_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_editor_accounts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "brand_social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_editor_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_editor_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_participants: {
        Row: {
          boost_id: string
          id: string
          joined_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          boost_id: string
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          boost_id?: string
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_participants_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_tier_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assignment_reason: string | null
          bounty_campaign_id: string
          created_at: string | null
          id: string
          months_in_tier: number | null
          previous_tier_id: string | null
          tier_id: string
          tier_start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_reason?: string | null
          bounty_campaign_id: string
          created_at?: string | null
          id?: string
          months_in_tier?: number | null
          previous_tier_id?: string | null
          tier_id: string
          tier_start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_reason?: string | null
          bounty_campaign_id?: string
          created_at?: string | null
          id?: string
          months_in_tier?: number | null
          previous_tier_id?: string | null
          tier_id?: string
          tier_start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_tier_assignments_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_tier_assignments_previous_tier_id_fkey"
            columns: ["previous_tier_id"]
            isOneToOne: false
            referencedRelation: "boost_creator_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_tier_assignments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "boost_creator_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_video_submissions: {
        Row: {
          bounty_campaign_id: string
          created_at: string
          id: string
          is_flagged: boolean | null
          payout_amount: number | null
          platform: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shortimize_video_id: string | null
          status: string
          submission_notes: string | null
          submitted_at: string
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          bounty_campaign_id: string
          created_at?: string
          id?: string
          is_flagged?: boolean | null
          payout_amount?: number | null
          platform: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shortimize_video_id?: string | null
          status?: string
          submission_notes?: string | null
          submitted_at?: string
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          bounty_campaign_id?: string
          created_at?: string
          id?: string
          is_flagged?: boolean | null
          payout_amount?: number | null
          platform?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shortimize_video_id?: string | null
          status?: string
          submission_notes?: string | null
          submitted_at?: string
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_video_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_video_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_view_bonuses: {
        Row: {
          bonus_amount: number
          bonus_type: string
          boost_id: string
          cpm_rate: number | null
          created_at: string | null
          id: string
          min_views: number | null
          views_threshold: number
        }
        Insert: {
          bonus_amount: number
          bonus_type?: string
          boost_id: string
          cpm_rate?: number | null
          created_at?: string | null
          id?: string
          min_views?: number | null
          views_threshold: number
        }
        Update: {
          bonus_amount?: number
          bonus_type?: string
          boost_id?: string
          cpm_rate?: number | null
          created_at?: string | null
          id?: string
          min_views?: number | null
          views_threshold?: number
        }
        Relationships: []
      }
      bounty_applications: {
        Row: {
          application_answers: Json | null
          application_text: string | null
          applied_at: string
          auto_waitlisted_from_pause: boolean | null
          bounty_campaign_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
          waitlist_position: number | null
        }
        Insert: {
          application_answers?: Json | null
          application_text?: string | null
          applied_at?: string
          auto_waitlisted_from_pause?: boolean | null
          bounty_campaign_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          waitlist_position?: number | null
        }
        Update: {
          application_answers?: Json | null
          application_text?: string | null
          applied_at?: string
          auto_waitlisted_from_pause?: boolean | null
          bounty_campaign_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bounty_applications_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bounty_bookmarks: {
        Row: {
          bounty_campaign_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bounty_campaign_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bounty_campaign_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bounty_bookmarks_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bounty_campaigns: {
        Row: {
          accepted_creators_count: number
          application_questions: Json | null
          auto_create_deliverables: boolean | null
          auto_tier_progression: boolean | null
          availability_requirement: string | null
          banner_url: string | null
          blueprint_embed_url: string | null
          blueprint_id: string | null
          bot_auto_reject_enabled: boolean | null
          bot_score_threshold: number | null
          brand_id: string
          budget: number | null
          budget_used: number | null
          categories: string[] | null
          content_distribution: string | null
          content_style_requirements: string
          content_type: string | null
          created_at: string
          deliverables_enabled: boolean | null
          description: string | null
          discord_guild_id: string | null
          discord_role_id: string | null
          end_date: string | null
          experience_level: string | null
          id: string
          is_private: boolean
          max_accepted_creators: number
          max_waitlist_size: number | null
          monthly_retainer: number
          paused_at: string | null
          payout_type: string
          position_type: string | null
          public_application_enabled: boolean | null
          public_form_settings: Json | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_amount: number | null
          shortimize_collection_name: string | null
          skills: string[] | null
          slug: string | null
          start_date: string | null
          status: string
          tags: string[] | null
          tiers_enabled: boolean | null
          title: string
          updated_at: string
          videos_per_month: number
          view_bonuses_enabled: boolean | null
          waitlist_enabled: boolean | null
          work_location: string | null
        }
        Insert: {
          accepted_creators_count?: number
          application_questions?: Json | null
          auto_create_deliverables?: boolean | null
          auto_tier_progression?: boolean | null
          availability_requirement?: string | null
          banner_url?: string | null
          blueprint_embed_url?: string | null
          blueprint_id?: string | null
          bot_auto_reject_enabled?: boolean | null
          bot_score_threshold?: number | null
          brand_id: string
          budget?: number | null
          budget_used?: number | null
          categories?: string[] | null
          content_distribution?: string | null
          content_style_requirements: string
          content_type?: string | null
          created_at?: string
          deliverables_enabled?: boolean | null
          description?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          end_date?: string | null
          experience_level?: string | null
          id?: string
          is_private?: boolean
          max_accepted_creators: number
          max_waitlist_size?: number | null
          monthly_retainer: number
          paused_at?: string | null
          payout_type?: string
          position_type?: string | null
          public_application_enabled?: boolean | null
          public_form_settings?: Json | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount?: number | null
          shortimize_collection_name?: string | null
          skills?: string[] | null
          slug?: string | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          tiers_enabled?: boolean | null
          title: string
          updated_at?: string
          videos_per_month: number
          view_bonuses_enabled?: boolean | null
          waitlist_enabled?: boolean | null
          work_location?: string | null
        }
        Update: {
          accepted_creators_count?: number
          application_questions?: Json | null
          auto_create_deliverables?: boolean | null
          auto_tier_progression?: boolean | null
          availability_requirement?: string | null
          banner_url?: string | null
          blueprint_embed_url?: string | null
          blueprint_id?: string | null
          bot_auto_reject_enabled?: boolean | null
          bot_score_threshold?: number | null
          brand_id?: string
          budget?: number | null
          budget_used?: number | null
          categories?: string[] | null
          content_distribution?: string | null
          content_style_requirements?: string
          content_type?: string | null
          created_at?: string
          deliverables_enabled?: boolean | null
          description?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          end_date?: string | null
          experience_level?: string | null
          id?: string
          is_private?: boolean
          max_accepted_creators?: number
          max_waitlist_size?: number | null
          monthly_retainer?: number
          paused_at?: string | null
          payout_type?: string
          position_type?: string | null
          public_application_enabled?: boolean | null
          public_form_settings?: Json | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount?: number | null
          shortimize_collection_name?: string | null
          skills?: string[] | null
          slug?: string | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          tiers_enabled?: boolean | null
          title?: string
          updated_at?: string
          videos_per_month?: number
          view_bonuses_enabled?: boolean | null
          waitlist_enabled?: boolean | null
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bounty_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_applications: {
        Row: {
          business_description: string
          business_name: string
          created_at: string
          current_mrr: string
          desired_outcome: string
          email: string
          has_content_library: string
          id: string
          logo_url: string | null
          monthly_budget: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          timeline_commitment: string
          updated_at: string
          website: string | null
        }
        Insert: {
          business_description: string
          business_name: string
          created_at?: string
          current_mrr: string
          desired_outcome: string
          email: string
          has_content_library: string
          id?: string
          logo_url?: string | null
          monthly_budget: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          timeline_commitment: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          business_description?: string
          business_name?: string
          created_at?: string
          current_mrr?: string
          desired_outcome?: string
          email?: string
          has_content_library?: string
          id?: string
          logo_url?: string | null
          monthly_budget?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          timeline_commitment?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      brand_broadcast_reads: {
        Row: {
          broadcast_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          broadcast_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          broadcast_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_broadcast_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_broadcast_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_broadcast_targets: {
        Row: {
          boost_id: string | null
          broadcast_id: string
          campaign_id: string | null
          id: string
        }
        Insert: {
          boost_id?: string | null
          broadcast_id: string
          campaign_id?: string | null
          id?: string
        }
        Update: {
          boost_id?: string | null
          broadcast_id?: string
          campaign_id?: string | null
          id?: string
        }
        Relationships: []
      }
      brand_broadcasts: {
        Row: {
          brand_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          scheduled_for: string | null
          sent_at: string | null
          status: string
          target_type: string
          title: string
        }
        Insert: {
          brand_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          target_type?: string
          title: string
        }
        Update: {
          brand_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          target_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_broadcasts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_broadcasts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "brand_course_access_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_creator_notes: {
        Row: {
          brand_id: string
          created_at: string | null
          created_by: string | null
          creator_id: string
          id: string
          note_content: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          created_by?: string | null
          creator_id: string
          id?: string
          note_content?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          created_by?: string | null
          creator_id?: string
          id?: string
          note_content?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_creator_notes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_creator_notes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_creator_notes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_creator_notes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_creator_relationships: {
        Row: {
          brand_id: string
          created_at: string
          external_email: string | null
          external_handle: string | null
          external_name: string | null
          external_platform: string | null
          first_interaction_at: string | null
          id: string
          source_id: string | null
          source_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          external_email?: string | null
          external_handle?: string | null
          external_name?: string | null
          external_platform?: string | null
          first_interaction_at?: string | null
          id?: string
          source_id?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          external_email?: string | null
          external_handle?: string | null
          external_name?: string | null
          external_platform?: string | null
          first_interaction_at?: string | null
          id?: string
          source_id?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_creator_relationships_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_creator_relationships_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_creator_relationships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_creator_relationships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_creator_tags: {
        Row: {
          created_at: string
          id: string
          relationship_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          relationship_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relationship_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      brand_invitations: {
        Row: {
          brand_id: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invite_token: string | null
          invited_by: string
          is_link_invite: boolean | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string | null
          invited_by: string
          is_link_invite?: boolean | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string | null
          invited_by?: string
          is_link_invite?: boolean | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_invitations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_invitations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_members: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_referrals: {
        Row: {
          brand_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referrer_id: string | null
          reward_earned: number | null
          status: string | null
        }
        Insert: {
          brand_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referrer_id?: string | null
          reward_earned?: number | null
          status?: string | null
        }
        Update: {
          brand_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referrer_id?: string | null
          reward_earned?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_referrals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_referrals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_resources: {
        Row: {
          brand_id: string
          content_text: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          resource_type: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          content_text?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          resource_type: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          content_text?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          resource_type?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_resources_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_resources_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_social_accounts: {
        Row: {
          account_handle: string
          account_name: string | null
          account_url: string | null
          brand_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: string
          updated_at: string | null
        }
        Insert: {
          account_handle: string
          account_name?: string | null
          account_url?: string | null
          brand_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          updated_at?: string | null
        }
        Update: {
          account_handle?: string
          account_name?: string | null
          account_url?: string | null
          brand_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_social_accounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_social_accounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_wallet_transactions: {
        Row: {
          amount: number
          boost_id: string | null
          brand_id: string
          campaign_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: string | null
          type: string
          whop_payment_id: string | null
        }
        Insert: {
          amount: number
          boost_id?: string | null
          brand_id: string
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type: string
          whop_payment_id?: string | null
        }
        Update: {
          amount?: number
          boost_id?: string | null
          brand_id?: string
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type?: string
          whop_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_wallet_transactions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_wallet_transactions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_wallets: {
        Row: {
          balance: number
          brand_id: string
          created_at: string
          currency: string
          id: string
          total_deposited: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          balance?: number
          brand_id: string
          created_at?: string
          currency?: string
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          brand_id?: string
          created_at?: string
          currency?: string
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_wallets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_wallets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_webhooks: {
        Row: {
          api_version: string | null
          brand_id: string
          created_at: string
          created_by: string | null
          endpoint_url: string
          events: string[]
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_status_code: number | null
          last_triggered_at: string | null
          name: string
          secret_key: string
        }
        Insert: {
          api_version?: string | null
          brand_id: string
          created_at?: string
          created_by?: string | null
          endpoint_url: string
          events: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          name: string
          secret_key?: string
        }
        Update: {
          api_version?: string | null
          brand_id?: string
          created_at?: string
          created_by?: string | null
          endpoint_url?: string
          events?: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          name?: string
          secret_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_webhooks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_webhooks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          account_url: string | null
          app_store_url: string | null
          assets_url: string | null
          brand_color: string | null
          brand_type: string | null
          business_details: Json | null
          close_contacts: Json | null
          close_custom_fields: Json | null
          close_lead_id: string | null
          close_status_id: string | null
          close_status_label: string | null
          close_sync_enabled: boolean | null
          close_synced_at: string | null
          collection_id: string | null
          collection_name: string | null
          created_at: string
          description: string | null
          discord_bot_added_at: string | null
          discord_guild_icon: string | null
          discord_guild_id: string | null
          discord_guild_name: string | null
          discord_webhook_url: string | null
          dub_api_key: string | null
          fraud_sensitivity: string | null
          home_url: string | null
          id: string
          instagram_handle: string | null
          is_active: boolean
          is_verified: boolean
          linkedin_handle: string | null
          logo_url: string | null
          low_balance_auto_topup_amount: number | null
          low_balance_auto_topup_enabled: boolean | null
          low_balance_last_notified_at: string | null
          low_balance_notify_threshold: number | null
          low_balance_pause_campaign_threshold: number | null
          low_balance_pause_payouts_threshold: number | null
          name: string
          notify_creator_fraud: boolean | null
          notify_new_application: boolean | null
          notify_new_message: boolean | null
          notify_new_sale: boolean | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          portal_settings: Json | null
          renewal_date: string | null
          settings: Json | null
          shortimize_api_key: string | null
          show_account_tab: boolean
          slack_webhook_url: string | null
          slash_account_number: string | null
          slash_balance_cents: number | null
          slash_crypto_addresses: Json | null
          slash_routing_number: string | null
          slash_virtual_account_id: string | null
          slash_webhook_id: string | null
          slug: string
          source: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          tiktok_handle: string | null
          updated_at: string
          website: string | null
          website_url: string | null
          whop_company_id: string | null
          whop_manage_url: string | null
          whop_membership_id: string | null
          whop_onboarding_complete: boolean | null
        }
        Insert: {
          account_url?: string | null
          app_store_url?: string | null
          assets_url?: string | null
          brand_color?: string | null
          brand_type?: string | null
          business_details?: Json | null
          close_contacts?: Json | null
          close_custom_fields?: Json | null
          close_lead_id?: string | null
          close_status_id?: string | null
          close_status_label?: string | null
          close_sync_enabled?: boolean | null
          close_synced_at?: string | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          description?: string | null
          discord_bot_added_at?: string | null
          discord_guild_icon?: string | null
          discord_guild_id?: string | null
          discord_guild_name?: string | null
          discord_webhook_url?: string | null
          dub_api_key?: string | null
          fraud_sensitivity?: string | null
          home_url?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean
          is_verified?: boolean
          linkedin_handle?: string | null
          logo_url?: string | null
          low_balance_auto_topup_amount?: number | null
          low_balance_auto_topup_enabled?: boolean | null
          low_balance_last_notified_at?: string | null
          low_balance_notify_threshold?: number | null
          low_balance_pause_campaign_threshold?: number | null
          low_balance_pause_payouts_threshold?: number | null
          name: string
          notify_creator_fraud?: boolean | null
          notify_new_application?: boolean | null
          notify_new_message?: boolean | null
          notify_new_sale?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          portal_settings?: Json | null
          renewal_date?: string | null
          settings?: Json | null
          shortimize_api_key?: string | null
          show_account_tab?: boolean
          slack_webhook_url?: string | null
          slash_account_number?: string | null
          slash_balance_cents?: number | null
          slash_crypto_addresses?: Json | null
          slash_routing_number?: string | null
          slash_virtual_account_id?: string | null
          slash_webhook_id?: string | null
          slug: string
          source?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          website?: string | null
          website_url?: string | null
          whop_company_id?: string | null
          whop_manage_url?: string | null
          whop_membership_id?: string | null
          whop_onboarding_complete?: boolean | null
        }
        Update: {
          account_url?: string | null
          app_store_url?: string | null
          assets_url?: string | null
          brand_color?: string | null
          brand_type?: string | null
          business_details?: Json | null
          close_contacts?: Json | null
          close_custom_fields?: Json | null
          close_lead_id?: string | null
          close_status_id?: string | null
          close_status_label?: string | null
          close_sync_enabled?: boolean | null
          close_synced_at?: string | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          description?: string | null
          discord_bot_added_at?: string | null
          discord_guild_icon?: string | null
          discord_guild_id?: string | null
          discord_guild_name?: string | null
          discord_webhook_url?: string | null
          dub_api_key?: string | null
          fraud_sensitivity?: string | null
          home_url?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean
          is_verified?: boolean
          linkedin_handle?: string | null
          logo_url?: string | null
          low_balance_auto_topup_amount?: number | null
          low_balance_auto_topup_enabled?: boolean | null
          low_balance_last_notified_at?: string | null
          low_balance_notify_threshold?: number | null
          low_balance_pause_campaign_threshold?: number | null
          low_balance_pause_payouts_threshold?: number | null
          name?: string
          notify_creator_fraud?: boolean | null
          notify_new_application?: boolean | null
          notify_new_message?: boolean | null
          notify_new_sale?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          portal_settings?: Json | null
          renewal_date?: string | null
          settings?: Json | null
          shortimize_api_key?: string | null
          show_account_tab?: boolean
          slack_webhook_url?: string | null
          slash_account_number?: string | null
          slash_balance_cents?: number | null
          slash_crypto_addresses?: Json | null
          slash_routing_number?: string | null
          slash_virtual_account_id?: string | null
          slash_webhook_id?: string | null
          slug?: string
          source?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          website?: string | null
          website_url?: string | null
          whop_company_id?: string | null
          whop_manage_url?: string | null
          whop_membership_id?: string | null
          whop_onboarding_complete?: boolean | null
        }
        Relationships: []
      }
      cached_campaign_videos: {
        Row: {
          bookmarks: number | null
          bot_analysis_status: string | null
          bot_analyzed_at: string | null
          bot_score: number | null
          bot_score_breakdown: Json | null
          brand_id: string
          cached_at: string
          campaign_id: string
          caption: string | null
          comments: number | null
          created_at: string
          description: string | null
          id: string
          likes: number | null
          matched_at: string | null
          platform: string
          shares: number | null
          shortimize_video_id: string
          social_account_id: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          uploaded_at: string | null
          user_id: string | null
          username: string
          video_url: string | null
          views: number | null
          week_start_date: string | null
          week_start_views: number | null
        }
        Insert: {
          bookmarks?: number | null
          bot_analysis_status?: string | null
          bot_analyzed_at?: string | null
          bot_score?: number | null
          bot_score_breakdown?: Json | null
          brand_id: string
          cached_at?: string
          campaign_id: string
          caption?: string | null
          comments?: number | null
          created_at?: string
          description?: string | null
          id?: string
          likes?: number | null
          matched_at?: string | null
          platform: string
          shares?: number | null
          shortimize_video_id: string
          social_account_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string | null
          user_id?: string | null
          username: string
          video_url?: string | null
          views?: number | null
          week_start_date?: string | null
          week_start_views?: number | null
        }
        Update: {
          bookmarks?: number | null
          bot_analysis_status?: string | null
          bot_analyzed_at?: string | null
          bot_score?: number | null
          bot_score_breakdown?: Json | null
          brand_id?: string
          cached_at?: string
          campaign_id?: string
          caption?: string | null
          comments?: number | null
          created_at?: string
          description?: string | null
          id?: string
          likes?: number | null
          matched_at?: string | null
          platform?: string
          shares?: number | null
          shortimize_video_id?: string
          social_account_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string | null
          user_id?: string | null
          username?: string
          video_url?: string | null
          views?: number | null
          week_start_date?: string | null
          week_start_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cached_campaign_videos_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cached_campaign_videos_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cached_campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cached_campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cached_campaign_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cached_campaign_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_account_analytics: {
        Row: {
          account_link: string | null
          account_username: string
          amount_of_videos_tracked: string | null
          average_engagement_rate: number | null
          average_video_views: number | null
          bio: string | null
          campaign_id: string
          created_at: string
          end_date: string | null
          id: string
          last_payment_amount: number | null
          last_payment_date: string | null
          last_tracked: string | null
          last_uploaded_at: string | null
          latest_followers_count: number | null
          latest_following_count: number | null
          median_views_non_zero: number | null
          outperforming_video_rate: number | null
          paid_views: number | null
          percent_outperform_10x: number | null
          percent_outperform_25x: number | null
          platform: string
          posts_last_7_days: Json | null
          shortimize_account_id: string | null
          start_date: string | null
          total_bookmarks: number | null
          total_comments: number | null
          total_likes: number | null
          total_shares: number | null
          total_videos: number | null
          total_views: number | null
          tracking_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_link?: string | null
          account_username: string
          amount_of_videos_tracked?: string | null
          average_engagement_rate?: number | null
          average_video_views?: number | null
          bio?: string | null
          campaign_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_tracked?: string | null
          last_uploaded_at?: string | null
          latest_followers_count?: number | null
          latest_following_count?: number | null
          median_views_non_zero?: number | null
          outperforming_video_rate?: number | null
          paid_views?: number | null
          percent_outperform_10x?: number | null
          percent_outperform_25x?: number | null
          platform: string
          posts_last_7_days?: Json | null
          shortimize_account_id?: string | null
          start_date?: string | null
          total_bookmarks?: number | null
          total_comments?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_videos?: number | null
          total_views?: number | null
          tracking_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_link?: string | null
          account_username?: string
          amount_of_videos_tracked?: string | null
          average_engagement_rate?: number | null
          average_video_views?: number | null
          bio?: string | null
          campaign_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_tracked?: string | null
          last_uploaded_at?: string | null
          latest_followers_count?: number | null
          latest_following_count?: number | null
          median_views_non_zero?: number | null
          outperforming_video_rate?: number | null
          paid_views?: number | null
          percent_outperform_10x?: number | null
          percent_outperform_25x?: number | null
          platform?: string
          posts_last_7_days?: Json | null
          shortimize_account_id?: string | null
          start_date?: string | null
          total_bookmarks?: number | null
          total_comments?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_videos?: number | null
          total_views?: number | null
          tracking_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_account_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_account_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_account_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_account_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_bookmarks: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_bookmarks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_bookmarks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_cpm_payouts: {
        Row: {
          campaign_id: string
          cpm_amount_paid: number
          created_at: string
          creator_id: string
          flat_rate_paid: number
          id: string
          transaction_id: string | null
          updated_at: string
          video_submission_id: string
          views_at_payout: number
        }
        Insert: {
          campaign_id: string
          cpm_amount_paid?: number
          created_at?: string
          creator_id: string
          flat_rate_paid?: number
          id?: string
          transaction_id?: string | null
          updated_at?: string
          video_submission_id: string
          views_at_payout?: number
        }
        Update: {
          campaign_id?: string
          cpm_amount_paid?: number
          created_at?: string
          creator_id?: string
          flat_rate_paid?: number
          id?: string
          transaction_id?: string | null
          updated_at?: string
          video_submission_id?: string
          views_at_payout?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_cpm_payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_cpm_payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_cpm_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_cpm_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_links: {
        Row: {
          assigned_to: string | null
          bounty_campaign_id: string | null
          brand_id: string
          campaign_id: string | null
          conversion_value: number
          created_at: string
          created_by: string | null
          description: string | null
          destination_url: string
          dub_link_id: string | null
          dub_short_link: string | null
          id: string
          is_active: boolean
          short_code: string
          title: string | null
          total_clicks: number
          total_conversions: number
          unique_clicks: number
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_to?: string | null
          bounty_campaign_id?: string | null
          brand_id: string
          campaign_id?: string | null
          conversion_value?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination_url: string
          dub_link_id?: string | null
          dub_short_link?: string | null
          id?: string
          is_active?: boolean
          short_code: string
          title?: string | null
          total_clicks?: number
          total_conversions?: number
          unique_clicks?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_to?: string | null
          bounty_campaign_id?: string | null
          brand_id?: string
          campaign_id?: string | null
          conversion_value?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination_url?: string
          dub_link_id?: string | null
          dub_short_link?: string | null
          id?: string
          is_active?: boolean
          short_code?: string
          title?: string | null
          total_clicks?: number
          total_conversions?: number
          unique_clicks?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_links_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_links_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_participants: {
        Row: {
          campaign_id: string
          id: string
          joined_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_submissions: {
        Row: {
          application_answers: Json | null
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
          application_answers?: Json | null
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
          application_answers?: Json | null
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
      campaign_video_metrics: {
        Row: {
          brand_id: string
          campaign_id: string
          created_at: string
          id: string
          recorded_at: string
          total_bookmarks: number
          total_comments: number
          total_likes: number
          total_shares: number
          total_videos: number
          total_views: number
        }
        Insert: {
          brand_id: string
          campaign_id: string
          created_at?: string
          id?: string
          recorded_at?: string
          total_bookmarks?: number
          total_comments?: number
          total_likes?: number
          total_shares?: number
          total_videos?: number
          total_views?: number
        }
        Update: {
          brand_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          recorded_at?: string
          total_bookmarks?: number
          total_comments?: number
          total_likes?: number
          total_shares?: number
          total_videos?: number
          total_views?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_video_metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_video_metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_video_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_video_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_video_sync_status: {
        Row: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          last_synced_at: string | null
          sync_status: string | null
          updated_at: string
          videos_synced: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          sync_status?: string | null
          updated_at?: string
          videos_synced?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          sync_status?: string | null
          updated_at?: string
          videos_synced?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_video_sync_status_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_video_sync_status_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_videos: {
        Row: {
          bot_score: number | null
          campaign_id: string
          created_at: string | null
          creator_id: string
          estimated_payout: number | null
          flag_deadline: string | null
          id: string
          is_flagged: boolean | null
          platform: string | null
          shortimize_video_id: string | null
          social_account_id: string | null
          status: string | null
          submission_text: string | null
          updated_at: string | null
          video_author_avatar: string | null
          video_author_username: string | null
          video_comments: number | null
          video_cover_url: string | null
          video_description: string | null
          video_likes: number | null
          video_shares: number | null
          video_title: string | null
          video_upload_date: string | null
          video_url: string
          video_views: number | null
        }
        Insert: {
          bot_score?: number | null
          campaign_id: string
          created_at?: string | null
          creator_id: string
          estimated_payout?: number | null
          flag_deadline?: string | null
          id?: string
          is_flagged?: boolean | null
          platform?: string | null
          shortimize_video_id?: string | null
          social_account_id?: string | null
          status?: string | null
          submission_text?: string | null
          updated_at?: string | null
          video_author_avatar?: string | null
          video_author_username?: string | null
          video_comments?: number | null
          video_cover_url?: string | null
          video_description?: string | null
          video_likes?: number | null
          video_shares?: number | null
          video_title?: string | null
          video_upload_date?: string | null
          video_url: string
          video_views?: number | null
        }
        Update: {
          bot_score?: number | null
          campaign_id?: string
          created_at?: string | null
          creator_id?: string
          estimated_payout?: number | null
          flag_deadline?: string | null
          id?: string
          is_flagged?: boolean | null
          platform?: string | null
          shortimize_video_id?: string | null
          social_account_id?: string | null
          status?: string | null
          submission_text?: string | null
          updated_at?: string | null
          video_author_avatar?: string | null
          video_author_username?: string | null
          video_comments?: number | null
          video_cover_url?: string | null
          video_description?: string | null
          video_likes?: number | null
          video_shares?: number | null
          video_title?: string | null
          video_upload_date?: string | null
          video_url?: string
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_creator_id_fkey"
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
          analytics_url: string | null
          application_questions: Json | null
          asset_links: Json | null
          banner_url: string | null
          blueprint_id: string | null
          brand_id: string | null
          brand_logo_url: string | null
          brand_name: string
          budget: number
          budget_used: number | null
          campaign_type: string | null
          campaign_update: string | null
          campaign_update_at: string | null
          category: string | null
          content_distribution: string | null
          created_at: string | null
          description: string | null
          discord_guild_id: string | null
          discord_role_id: string | null
          embed_url: string | null
          end_date: string | null
          guidelines: string | null
          hashtags: string[] | null
          id: string
          is_featured: boolean
          is_infinite_budget: boolean | null
          is_private: boolean | null
          min_insights_score: number | null
          payment_model: string | null
          payout_day_of_week: number | null
          payout_type: string
          platform_rates: Json | null
          post_rate: number | null
          preview_url: string | null
          require_audience_insights: boolean | null
          requirements: string[] | null
          requires_application: boolean
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rpm_rate: number
          shortimize_collection_name: string | null
          slug: string
          start_date: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_code?: string | null
          allowed_platforms?: string[] | null
          analytics_url?: string | null
          application_questions?: Json | null
          asset_links?: Json | null
          banner_url?: string | null
          blueprint_id?: string | null
          brand_id?: string | null
          brand_logo_url?: string | null
          brand_name: string
          budget: number
          budget_used?: number | null
          campaign_type?: string | null
          campaign_update?: string | null
          campaign_update_at?: string | null
          category?: string | null
          content_distribution?: string | null
          created_at?: string | null
          description?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          embed_url?: string | null
          end_date?: string | null
          guidelines?: string | null
          hashtags?: string[] | null
          id?: string
          is_featured?: boolean
          is_infinite_budget?: boolean | null
          is_private?: boolean | null
          min_insights_score?: number | null
          payment_model?: string | null
          payout_day_of_week?: number | null
          payout_type?: string
          platform_rates?: Json | null
          post_rate?: number | null
          preview_url?: string | null
          require_audience_insights?: boolean | null
          requirements?: string[] | null
          requires_application?: boolean
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rpm_rate: number
          shortimize_collection_name?: string | null
          slug: string
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_code?: string | null
          allowed_platforms?: string[] | null
          analytics_url?: string | null
          application_questions?: Json | null
          asset_links?: Json | null
          banner_url?: string | null
          blueprint_id?: string | null
          brand_id?: string | null
          brand_logo_url?: string | null
          brand_name?: string
          budget?: number
          budget_used?: number | null
          campaign_type?: string | null
          campaign_update?: string | null
          campaign_update_at?: string | null
          category?: string | null
          content_distribution?: string | null
          created_at?: string | null
          description?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          embed_url?: string | null
          end_date?: string | null
          guidelines?: string | null
          hashtags?: string[] | null
          id?: string
          is_featured?: boolean
          is_infinite_budget?: boolean | null
          is_private?: boolean | null
          min_insights_score?: number | null
          payment_model?: string | null
          payout_day_of_week?: number | null
          payout_type?: string
          platform_rates?: Json | null
          post_rate?: number | null
          preview_url?: string | null
          require_audience_insights?: boolean | null
          requirements?: string[] | null
          requires_application?: boolean
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rpm_rate?: number
          shortimize_collection_name?: string | null
          slug?: string
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
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
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_feedback: {
        Row: {
          assistant_response: string
          created_at: string
          feedback_text: string | null
          feedback_type: string | null
          id: string
          rating: number | null
          retrieved_conversation_ids: string[] | null
          session_id: string | null
          user_id: string | null
          user_message: string
        }
        Insert: {
          assistant_response: string
          created_at?: string
          feedback_text?: string | null
          feedback_type?: string | null
          id?: string
          rating?: number | null
          retrieved_conversation_ids?: string[] | null
          session_id?: string | null
          user_id?: string | null
          user_message: string
        }
        Update: {
          assistant_response?: string
          created_at?: string
          feedback_text?: string | null
          feedback_type?: string | null
          id?: string
          rating?: number | null
          retrieved_conversation_ids?: string[] | null
          session_id?: string | null
          user_id?: string | null
          user_message?: string
        }
        Relationships: []
      }
      close_activities: {
        Row: {
          activity_at: string
          activity_type: string
          body: string | null
          brand_id: string
          close_activity_id: string
          close_lead_id: string
          created_at: string
          custom_fields: Json | null
          direction: string | null
          duration_seconds: number | null
          id: string
          subject: string | null
          synced_at: string | null
          user_name: string | null
        }
        Insert: {
          activity_at: string
          activity_type: string
          body?: string | null
          brand_id: string
          close_activity_id: string
          close_lead_id: string
          created_at?: string
          custom_fields?: Json | null
          direction?: string | null
          duration_seconds?: number | null
          id?: string
          subject?: string | null
          synced_at?: string | null
          user_name?: string | null
        }
        Update: {
          activity_at?: string
          activity_type?: string
          body?: string | null
          brand_id?: string
          close_activity_id?: string
          close_lead_id?: string
          created_at?: string
          custom_fields?: Json | null
          direction?: string | null
          duration_seconds?: number | null
          id?: string
          subject?: string | null
          synced_at?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "close_activities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_activities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      close_opportunities: {
        Row: {
          brand_id: string
          close_created_at: string | null
          close_lead_id: string
          close_opportunity_id: string
          close_updated_at: string | null
          confidence: number | null
          created_at: string
          custom_fields: Json | null
          date_won: string | null
          id: string
          note: string | null
          status_id: string | null
          status_label: string | null
          status_type: string | null
          synced_at: string | null
          updated_at: string
          value: number | null
          value_period: string | null
        }
        Insert: {
          brand_id: string
          close_created_at?: string | null
          close_lead_id: string
          close_opportunity_id: string
          close_updated_at?: string | null
          confidence?: number | null
          created_at?: string
          custom_fields?: Json | null
          date_won?: string | null
          id?: string
          note?: string | null
          status_id?: string | null
          status_label?: string | null
          status_type?: string | null
          synced_at?: string | null
          updated_at?: string
          value?: number | null
          value_period?: string | null
        }
        Update: {
          brand_id?: string
          close_created_at?: string | null
          close_lead_id?: string
          close_opportunity_id?: string
          close_updated_at?: string | null
          confidence?: number | null
          created_at?: string
          custom_fields?: Json | null
          date_won?: string | null
          id?: string
          note?: string | null
          status_id?: string | null
          status_label?: string | null
          status_type?: string | null
          synced_at?: string | null
          updated_at?: string
          value?: number | null
          value_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "close_opportunities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_opportunities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      close_sync_log: {
        Row: {
          changes: Json | null
          created_at: string
          direction: string
          entity_id: string
          entity_type: string
          error_message: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          local_id: string | null
          payload: Json | null
          processed_at: string | null
          retry_count: number | null
          source: string
          status: string
        }
        Insert: {
          changes?: Json | null
          created_at?: string
          direction: string
          entity_id: string
          entity_type: string
          error_message?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          local_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          retry_count?: number | null
          source: string
          status?: string
        }
        Update: {
          changes?: Json | null
          created_at?: string
          direction?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          local_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          retry_count?: number | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      content_slot_history: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_date: string | null
          new_status: string | null
          notes: string | null
          old_date: string | null
          old_status: string | null
          slot_id: string
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_date?: string | null
          new_status?: string | null
          notes?: string | null
          old_date?: string | null
          old_status?: string | null
          slot_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_date?: string | null
          new_status?: string | null
          notes?: string | null
          old_date?: string | null
          old_status?: string | null
          slot_id?: string
        }
        Relationships: []
      }
      content_slots: {
        Row: {
          boost_id: string | null
          brand_id: string
          completed_at: string | null
          confirmed_at: string | null
          contract_id: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          notes: string | null
          platform: string | null
          proposed_by: string | null
          reminder_sent: boolean | null
          scheduled_date: string
          scheduled_time: string | null
          status: string | null
          submission_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          boost_id?: string | null
          brand_id: string
          completed_at?: string | null
          confirmed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          proposed_by?: string | null
          reminder_sent?: boolean | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string | null
          submission_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          boost_id?: string | null
          brand_id?: string
          completed_at?: string | null
          confirmed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          proposed_by?: string | null
          reminder_sent?: boolean | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string | null
          submission_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_slots_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_slots_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_slots_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_slots_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_styles: {
        Row: {
          brand_id: string
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          phase: string
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          brand_id: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          phase?: string
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          brand_id?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          phase?: string
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_styles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_styles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_sections: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_required: boolean | null
          sort_order: number | null
          template_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          template_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          template_id?: string
          title?: string
        }
        Relationships: []
      }
      contract_template_variables: {
        Row: {
          created_at: string | null
          default_value: string | null
          id: string
          is_required: boolean | null
          options: string[] | null
          sort_order: number | null
          template_id: string
          variable_key: string
          variable_label: string
          variable_type: string | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          id?: string
          is_required?: boolean | null
          options?: string[] | null
          sort_order?: number | null
          template_id: string
          variable_key: string
          variable_label: string
          variable_type?: string | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          id?: string
          is_required?: boolean | null
          options?: string[] | null
          sort_order?: number | null
          template_id?: string
          variable_key?: string
          variable_label?: string
          variable_type?: string | null
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          brand_id: string
          content: string
          created_at: string | null
          created_by: string | null
          default_duration_months: number | null
          default_monthly_rate: number | null
          default_videos_per_month: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          brand_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          default_duration_months?: number | null
          default_monthly_rate?: number | null
          default_videos_per_month?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          brand_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          default_duration_months?: number | null
          default_monthly_rate?: number | null
          default_videos_per_month?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          brand_id: string
          created_at: string
          creator_id: string
          id: string
          is_bookmarked: boolean
          last_message_at: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          creator_id: string
          id?: string
          is_bookmarked?: boolean
          last_message_at?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_bookmarked?: boolean
          last_message_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          assets: Json | null
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
          assets?: Json | null
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
          assets?: Json | null
          content?: string | null
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          banner_url: string | null
          brand_id: string | null
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
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
          {
            foreignKeyName: "courses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_contracts: {
        Row: {
          boost_id: string | null
          brand_id: string
          contract_url: string | null
          created_at: string
          creator_email: string
          creator_id: string | null
          custom_terms: string | null
          duration_months: number
          end_date: string | null
          id: string
          monthly_rate: number
          sent_at: string | null
          signature_url: string | null
          signed_at: string | null
          start_date: string
          status: string
          template_id: string | null
          title: string
          updated_at: string
          videos_per_month: number
        }
        Insert: {
          boost_id?: string | null
          brand_id: string
          contract_url?: string | null
          created_at?: string
          creator_email: string
          creator_id?: string | null
          custom_terms?: string | null
          duration_months?: number
          end_date?: string | null
          id?: string
          monthly_rate?: number
          sent_at?: string | null
          signature_url?: string | null
          signed_at?: string | null
          start_date: string
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          videos_per_month?: number
        }
        Update: {
          boost_id?: string | null
          brand_id?: string
          contract_url?: string | null
          created_at?: string
          creator_email?: string
          creator_id?: string | null
          custom_terms?: string | null
          duration_months?: number
          end_date?: string | null
          id?: string
          monthly_rate?: number
          sent_at?: string | null
          signature_url?: string | null
          signed_at?: string | null
          start_date?: string
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          videos_per_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_contracts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_contracts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_contracts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_contracts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_fraud_history: {
        Row: {
          clawback_ledger_id: string | null
          created_at: string
          creator_id: string
          details: Json | null
          fraud_amount: number
          fraud_flag_id: string | null
          fraud_type: string
          id: string
          trust_penalty: number
        }
        Insert: {
          clawback_ledger_id?: string | null
          created_at?: string
          creator_id: string
          details?: Json | null
          fraud_amount?: number
          fraud_flag_id?: string | null
          fraud_type: string
          id?: string
          trust_penalty?: number
        }
        Update: {
          clawback_ledger_id?: string | null
          created_at?: string
          creator_id?: string
          details?: Json | null
          fraud_amount?: number
          fraud_flag_id?: string | null
          fraud_type?: string
          id?: string
          trust_penalty?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_fraud_history_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_fraud_history_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          relationship_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_id?: string
        }
        Relationships: []
      }
      creator_portfolios: {
        Row: {
          availability: string | null
          certifications: Json | null
          content_niches: string[] | null
          created_at: string | null
          custom_sections: Json | null
          education: Json | null
          equipment: string[] | null
          featured_videos: Json | null
          id: string
          is_public: boolean | null
          languages: string[] | null
          platforms: Json | null
          rate_range: Json | null
          section_order: string[] | null
          showcase_items: Json | null
          skills: string[] | null
          updated_at: string | null
          user_id: string
          work_experience: Json | null
        }
        Insert: {
          availability?: string | null
          certifications?: Json | null
          content_niches?: string[] | null
          created_at?: string | null
          custom_sections?: Json | null
          education?: Json | null
          equipment?: string[] | null
          featured_videos?: Json | null
          id?: string
          is_public?: boolean | null
          languages?: string[] | null
          platforms?: Json | null
          rate_range?: Json | null
          section_order?: string[] | null
          showcase_items?: Json | null
          skills?: string[] | null
          updated_at?: string | null
          user_id: string
          work_experience?: Json | null
        }
        Update: {
          availability?: string | null
          certifications?: Json | null
          content_niches?: string[] | null
          created_at?: string | null
          custom_sections?: Json | null
          education?: Json | null
          equipment?: string[] | null
          featured_videos?: Json | null
          id?: string
          is_public?: boolean | null
          languages?: string[] | null
          platforms?: Json | null
          rate_range?: Json | null
          section_order?: string[] | null
          showcase_items?: Json | null
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string
          work_experience?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_portfolios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_portfolios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_reliability_scores: {
        Row: {
          active_strikes: number | null
          brand_id: string
          creator_id: string
          id: string
          last_calculated_at: string | null
          last_strike_at: string | null
          on_time_rate: number | null
          reliability_score: number | null
          total_delivered: number | null
          total_scheduled: number | null
          total_strikes: number | null
        }
        Insert: {
          active_strikes?: number | null
          brand_id: string
          creator_id: string
          id?: string
          last_calculated_at?: string | null
          last_strike_at?: string | null
          on_time_rate?: number | null
          reliability_score?: number | null
          total_delivered?: number | null
          total_scheduled?: number | null
          total_strikes?: number | null
        }
        Update: {
          active_strikes?: number | null
          brand_id?: string
          creator_id?: string
          id?: string
          last_calculated_at?: string | null
          last_strike_at?: string | null
          on_time_rate?: number | null
          reliability_score?: number | null
          total_delivered?: number | null
          total_scheduled?: number | null
          total_strikes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_reliability_scores_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_reliability_scores_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_reliability_scores_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_reliability_scores_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_strikes: {
        Row: {
          appeal_reason: string | null
          appeal_reviewed_at: string | null
          appeal_reviewed_by: string | null
          appeal_status: string | null
          boost_id: string | null
          brand_id: string
          campaign_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          creator_id: string
          expires_at: string | null
          id: string
          is_appealed: boolean | null
          reason: string | null
          scheduled_date: string | null
          severity: number | null
          strike_type: string
        }
        Insert: {
          appeal_reason?: string | null
          appeal_reviewed_at?: string | null
          appeal_reviewed_by?: string | null
          appeal_status?: string | null
          boost_id?: string | null
          brand_id: string
          campaign_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_id: string
          expires_at?: string | null
          id?: string
          is_appealed?: boolean | null
          reason?: string | null
          scheduled_date?: string | null
          severity?: number | null
          strike_type: string
        }
        Update: {
          appeal_reason?: string | null
          appeal_reviewed_at?: string | null
          appeal_reviewed_by?: string | null
          appeal_status?: string | null
          boost_id?: string | null
          brand_id?: string
          campaign_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_id?: string
          expires_at?: string | null
          id?: string
          is_appealed?: boolean | null
          reason?: string | null
          scheduled_date?: string | null
          severity?: number | null
          strike_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_strikes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tags: {
        Row: {
          brand_id: string
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          brand_id: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          brand_id?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_tags_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tags_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_testimonials: {
        Row: {
          brand_id: string
          content: string
          created_at: string
          creator_avatar_url: string | null
          creator_id: string
          creator_name: string | null
          id: string
          rating: number | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          content: string
          created_at?: string
          creator_avatar_url?: string | null
          creator_id: string
          creator_name?: string | null
          id?: string
          rating?: number | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          content?: string
          created_at?: string
          creator_avatar_url?: string | null
          creator_id?: string
          creator_name?: string | null
          id?: string
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_testimonials_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_testimonials_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_testimonials_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_testimonials_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tier_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          brand_id: string
          id: string
          previous_tier_id: string | null
          tier_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          brand_id: string
          id?: string
          previous_tier_id?: string | null
          tier_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          brand_id?: string
          id?: string
          previous_tier_id?: string | null
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_tier_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tier_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tier_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tier_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tier_metrics: {
        Row: {
          avg_views_per_video: number | null
          base_earnings: number | null
          bonus_earnings: number | null
          bounty_campaign_id: string
          completion_rate: number | null
          created_at: string | null
          demotion_warning: boolean | null
          engagement_rate: number | null
          id: string
          period_month: number
          period_year: number
          promotion_eligible: boolean | null
          quota_met: boolean | null
          quota_required: number
          tier_id: string
          total_comments: number | null
          total_earnings: number | null
          total_likes: number | null
          total_shares: number | null
          total_views: number | null
          updated_at: string | null
          user_id: string
          videos_approved: number | null
          videos_rejected: number | null
          videos_submitted: number | null
        }
        Insert: {
          avg_views_per_video?: number | null
          base_earnings?: number | null
          bonus_earnings?: number | null
          bounty_campaign_id: string
          completion_rate?: number | null
          created_at?: string | null
          demotion_warning?: boolean | null
          engagement_rate?: number | null
          id?: string
          period_month: number
          period_year: number
          promotion_eligible?: boolean | null
          quota_met?: boolean | null
          quota_required?: number
          tier_id: string
          total_comments?: number | null
          total_earnings?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_views?: number | null
          updated_at?: string | null
          user_id: string
          videos_approved?: number | null
          videos_rejected?: number | null
          videos_submitted?: number | null
        }
        Update: {
          avg_views_per_video?: number | null
          base_earnings?: number | null
          bonus_earnings?: number | null
          bounty_campaign_id?: string
          completion_rate?: number | null
          created_at?: string | null
          demotion_warning?: boolean | null
          engagement_rate?: number | null
          id?: string
          period_month?: number
          period_year?: number
          promotion_eligible?: boolean | null
          quota_met?: boolean | null
          quota_required?: number
          tier_id?: string
          total_comments?: number | null
          total_earnings?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_views?: number | null
          updated_at?: string | null
          user_id?: string
          videos_approved?: number | null
          videos_rejected?: number | null
          videos_submitted?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_tier_metrics_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tier_metrics_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "boost_creator_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tiers: {
        Row: {
          brand_id: string
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_default: boolean
          name: string
          rpm_multiplier: number
          tier_order: number
        }
        Insert: {
          brand_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          rpm_multiplier?: number
          tier_order: number
        }
        Update: {
          brand_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          rpm_multiplier?: number
          tier_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_tiers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tiers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_brand_plans: {
        Row: {
          boosts_limit: number | null
          brand_id: string
          campaigns_limit: number | null
          created_at: string | null
          created_by: string | null
          hires_limit: number | null
          id: string
          is_active: boolean | null
          monthly_price: number | null
          name: string
          notes: string | null
          updated_at: string | null
          whop_plan_id: string | null
          whop_product_type: string | null
        }
        Insert: {
          boosts_limit?: number | null
          brand_id: string
          campaigns_limit?: number | null
          created_at?: string | null
          created_by?: string | null
          hires_limit?: number | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          name: string
          notes?: string | null
          updated_at?: string | null
          whop_plan_id?: string | null
          whop_product_type?: string | null
        }
        Update: {
          boosts_limit?: number | null
          brand_id?: string
          campaigns_limit?: number | null
          created_at?: string | null
          created_by?: string | null
          hires_limit?: number | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          name?: string
          notes?: string | null
          updated_at?: string | null
          whop_plan_id?: string | null
          whop_product_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_brand_plans_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_brand_plans_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_comments: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          deliverable_id: string
          id: string
          is_read: boolean | null
          read_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          deliverable_id: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          deliverable_id?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_comments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "boost_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_templates: {
        Row: {
          advance_days: number | null
          apply_to_all_creators: boolean | null
          auto_create: boolean | null
          bounty_campaign_id: string
          content_brief: string | null
          content_type: string
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          default_priority: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_duration_seconds: number | null
          min_duration_seconds: number | null
          platform: string | null
          recurrence: string
          required_hashtags: string[] | null
          required_mentions: string[] | null
          specific_tier_ids: string[] | null
          specific_user_ids: string[] | null
          title: string
          updated_at: string | null
          week_of_month: number | null
        }
        Insert: {
          advance_days?: number | null
          apply_to_all_creators?: boolean | null
          auto_create?: boolean | null
          bounty_campaign_id: string
          content_brief?: string | null
          content_type?: string
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          default_priority?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_duration_seconds?: number | null
          min_duration_seconds?: number | null
          platform?: string | null
          recurrence: string
          required_hashtags?: string[] | null
          required_mentions?: string[] | null
          specific_tier_ids?: string[] | null
          specific_user_ids?: string[] | null
          title: string
          updated_at?: string | null
          week_of_month?: number | null
        }
        Update: {
          advance_days?: number | null
          apply_to_all_creators?: boolean | null
          auto_create?: boolean | null
          bounty_campaign_id?: string
          content_brief?: string | null
          content_type?: string
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          default_priority?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_duration_seconds?: number | null
          min_duration_seconds?: number | null
          platform?: string | null
          recurrence?: string
          required_hashtags?: string[] | null
          required_mentions?: string[] | null
          specific_tier_ids?: string[] | null
          specific_user_ids?: string[] | null
          title?: string
          updated_at?: string | null
          week_of_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_templates_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      demographic_scores: {
        Row: {
          calculated_at: string | null
          id: string
          score: number | null
          user_id: string
        }
        Insert: {
          calculated_at?: string | null
          id?: string
          score?: number | null
          user_id: string
        }
        Update: {
          calculated_at?: string | null
          id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demographic_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demographic_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demographic_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          expires_at: string | null
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
          expires_at?: string | null
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
          expires_at?: string | null
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
      discord_bot_config: {
        Row: {
          bot_token: string | null
          brand_id: string
          command_prefix: string | null
          created_at: string
          guild_id: string
          id: string
          is_active: boolean
          log_channel_id: string | null
          stats_channel_id: string | null
          updated_at: string
        }
        Insert: {
          bot_token?: string | null
          brand_id: string
          command_prefix?: string | null
          created_at?: string
          guild_id: string
          id?: string
          is_active?: boolean
          log_channel_id?: string | null
          stats_channel_id?: string | null
          updated_at?: string
        }
        Update: {
          bot_token?: string | null
          brand_id?: string
          command_prefix?: string | null
          created_at?: string
          guild_id?: string
          id?: string
          is_active?: boolean
          log_channel_id?: string | null
          stats_channel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_bot_config_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_bot_config_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_command_log: {
        Row: {
          args: string | null
          brand_id: string
          channel_id: string
          command: string
          created_at: string
          discord_user_id: string
          error_message: string | null
          execution_time_ms: number | null
          guild_id: string
          id: string
          response_status: string | null
          user_id: string | null
        }
        Insert: {
          args?: string | null
          brand_id: string
          channel_id: string
          command: string
          created_at?: string
          discord_user_id: string
          error_message?: string | null
          execution_time_ms?: number | null
          guild_id: string
          id?: string
          response_status?: string | null
          user_id?: string | null
        }
        Update: {
          args?: string | null
          brand_id?: string
          channel_id?: string
          command?: string
          created_at?: string
          discord_user_id?: string
          error_message?: string | null
          execution_time_ms?: number | null
          guild_id?: string
          id?: string
          response_status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_command_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_command_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_command_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_command_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_emoji_sentiments: {
        Row: {
          created_at: string
          emoji: string
          emoji_name: string | null
          id: string
          is_default: boolean
          sentiment: string
        }
        Insert: {
          created_at?: string
          emoji: string
          emoji_name?: string | null
          id?: string
          is_default?: boolean
          sentiment: string
        }
        Update: {
          created_at?: string
          emoji?: string
          emoji_name?: string | null
          id?: string
          is_default?: boolean
          sentiment?: string
        }
        Relationships: []
      }
      discord_membership_log: {
        Row: {
          brand_id: string
          created_at: string
          discord_discriminator: string | null
          discord_user_id: string
          discord_username: string | null
          event_timestamp: string
          event_type: string
          guild_id: string
          id: string
          new_value: string | null
          old_value: string | null
          role_id: string | null
          role_name: string | null
          user_id: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          discord_discriminator?: string | null
          discord_user_id: string
          discord_username?: string | null
          event_timestamp?: string
          event_type: string
          guild_id: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          role_id?: string | null
          role_name?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          discord_discriminator?: string | null
          discord_user_id?: string
          discord_username?: string | null
          event_timestamp?: string
          event_type?: string
          guild_id?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          role_id?: string | null
          role_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_membership_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_membership_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_membership_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_membership_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_reaction_tracking: {
        Row: {
          brand_id: string
          broadcast_id: string | null
          channel_id: string
          first_tracked_at: string
          guild_id: string
          id: string
          last_updated_at: string
          message_id: string
          message_preview: string | null
          negative_count: number
          neutral_count: number
          positive_count: number
          reactions: Json
          sentiment_score: number | null
          total_reactions: number
        }
        Insert: {
          brand_id: string
          broadcast_id?: string | null
          channel_id: string
          first_tracked_at?: string
          guild_id: string
          id?: string
          last_updated_at?: string
          message_id: string
          message_preview?: string | null
          negative_count?: number
          neutral_count?: number
          positive_count?: number
          reactions?: Json
          sentiment_score?: number | null
          total_reactions?: number
        }
        Update: {
          brand_id?: string
          broadcast_id?: string | null
          channel_id?: string
          first_tracked_at?: string
          guild_id?: string
          id?: string
          last_updated_at?: string
          message_id?: string
          message_preview?: string | null
          negative_count?: number
          neutral_count?: number
          positive_count?: number
          reactions?: Json
          sentiment_score?: number | null
          total_reactions?: number
        }
        Relationships: [
          {
            foreignKeyName: "discord_reaction_tracking_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_reaction_tracking_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_reactions: {
        Row: {
          added_at: string
          discord_user_id: string
          emoji: string
          emoji_name: string | null
          id: string
          is_custom: boolean
          removed_at: string | null
          sentiment: string | null
          tracking_id: string
        }
        Insert: {
          added_at?: string
          discord_user_id: string
          emoji: string
          emoji_name?: string | null
          id?: string
          is_custom?: boolean
          removed_at?: string | null
          sentiment?: string | null
          tracking_id: string
        }
        Update: {
          added_at?: string
          discord_user_id?: string
          emoji?: string
          emoji_name?: string | null
          id?: string
          is_custom?: boolean
          removed_at?: string | null
          sentiment?: string | null
          tracking_id?: string
        }
        Relationships: []
      }
      discord_role_mappings: {
        Row: {
          active_days: number | null
          boost_id: string | null
          brand_id: string
          campaign_id: string | null
          created_at: string
          guild_id: string
          id: string
          is_active: boolean
          mapping_type: string
          min_earnings: number | null
          role_id: string
          role_name: string
          tier_id: string | null
        }
        Insert: {
          active_days?: number | null
          boost_id?: string | null
          brand_id: string
          campaign_id?: string | null
          created_at?: string
          guild_id: string
          id?: string
          is_active?: boolean
          mapping_type: string
          min_earnings?: number | null
          role_id: string
          role_name: string
          tier_id?: string | null
        }
        Update: {
          active_days?: number | null
          boost_id?: string | null
          brand_id?: string
          campaign_id?: string | null
          created_at?: string
          guild_id?: string
          id?: string
          is_active?: boolean
          mapping_type?: string
          min_earnings?: number | null
          role_id?: string
          role_name?: string
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_role_mappings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_role_mappings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_ticket_channels: {
        Row: {
          channel_id: string
          channel_name: string | null
          closed_at: string | null
          created_at: string | null
          discord_user_id: string
          guild_id: string
          id: string
          ticket_id: string
        }
        Insert: {
          channel_id: string
          channel_name?: string | null
          closed_at?: string | null
          created_at?: string | null
          discord_user_id: string
          guild_id: string
          id?: string
          ticket_id: string
        }
        Update: {
          channel_id?: string
          channel_name?: string | null
          closed_at?: string | null
          created_at?: string | null
          discord_user_id?: string
          guild_id?: string
          id?: string
          ticket_id?: string
        }
        Relationships: []
      }
      discord_ticket_config: {
        Row: {
          auto_close_hours: number | null
          brand_id: string | null
          created_at: string
          guild_id: string
          id: string
          is_active: boolean | null
          log_channel_id: string | null
          panel_channel_id: string | null
          panel_message_id: string | null
          support_role_id: string | null
          ticket_category_id: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          auto_close_hours?: number | null
          brand_id?: string | null
          created_at?: string
          guild_id: string
          id?: string
          is_active?: boolean | null
          log_channel_id?: string | null
          panel_channel_id?: string | null
          panel_message_id?: string | null
          support_role_id?: string | null
          ticket_category_id?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          auto_close_hours?: number | null
          brand_id?: string | null
          created_at?: string
          guild_id?: string
          id?: string
          is_active?: boolean | null
          log_channel_id?: string | null
          panel_channel_id?: string | null
          panel_message_id?: string | null
          support_role_id?: string | null
          ticket_category_id?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_ticket_config_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_ticket_config_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_ticket_messages: {
        Row: {
          channel_id: string
          discord_message_id: string
          id: string
          source: string
          synced_at: string | null
          ticket_id: string
          ticket_message_id: string | null
        }
        Insert: {
          channel_id: string
          discord_message_id: string
          id?: string
          source: string
          synced_at?: string | null
          ticket_id: string
          ticket_message_id?: string | null
        }
        Update: {
          channel_id?: string
          discord_message_id?: string
          id?: string
          source?: string
          synced_at?: string | null
          ticket_id?: string
          ticket_message_id?: string | null
        }
        Relationships: []
      }
      discord_tickets: {
        Row: {
          assigned_to: string | null
          brand_id: string
          channel_id: string | null
          closed_at: string | null
          closed_by: string | null
          config_id: string | null
          created_at: string
          discord_user_id: string
          discord_username: string | null
          id: string
          priority: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          brand_id: string
          channel_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          config_id?: string | null
          created_at?: string
          discord_user_id: string
          discord_username?: string | null
          id?: string
          priority?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          brand_id?: string
          channel_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          config_id?: string | null
          created_at?: string
          discord_user_id?: string
          discord_username?: string | null
          id?: string
          priority?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_tickets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_tickets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_tokens: {
        Row: {
          access_token_encrypted: string
          created_at: string
          discord_id: string
          id: string
          refresh_token_encrypted: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          discord_id: string
          id?: string
          refresh_token_encrypted: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          discord_id?: string
          id?: string
          refresh_token_encrypted?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_user_links: {
        Row: {
          discord_avatar: string | null
          discord_discriminator: string | null
          discord_user_id: string
          discord_username: string
          id: string
          linked_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          discord_avatar?: string | null
          discord_discriminator?: string | null
          discord_user_id: string
          discord_username: string
          id?: string
          linked_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          discord_avatar?: string | null
          discord_discriminator?: string | null
          discord_user_id?: string
          discord_username?: string
          id?: string
          linked_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "discord_user_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_user_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_user_roles: {
        Row: {
          brand_id: string
          discord_user_id: string
          error_message: string | null
          guild_id: string
          id: string
          role_id: string
          sync_status: string
          synced_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          discord_user_id: string
          error_message?: string | null
          guild_id: string
          id?: string
          role_id: string
          sync_status?: string
          synced_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          discord_user_id?: string
          error_message?: string | null
          guild_id?: string
          id?: string
          role_id?: string
          sync_status?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_user_roles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_user_roles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_broadcasts: {
        Row: {
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          html_content: string
          id: string
          recipient_count: number | null
          scheduled_at: string | null
          segment: string | null
          segment_filter: Json | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          subject: string
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          html_content: string
          id?: string
          recipient_count?: number | null
          scheduled_at?: string | null
          segment?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject: string
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          html_content?: string
          id?: string
          recipient_count?: number | null
          scheduled_at?: string | null
          segment?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_broadcasts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          broadcast_id: string | null
          clicked_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          recipient_id: string | null
          resend_id: string | null
          status: string | null
          subject: string
        }
        Insert: {
          broadcast_id?: string | null
          clicked_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          recipient_id?: string | null
          resend_id?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          broadcast_id?: string | null
          clicked_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_id?: string | null
          resend_id?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "email_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          html_content: string
          id: string
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          html_content: string
          id?: string
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          html_content?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          created_at: string | null
          id: string
          key_name: string
          key_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_name: string
          key_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key_name?: string
          key_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          action_type: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          amount: number | null
          balance_after: number | null
          balance_before: number | null
          created_at: string | null
          currency: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          payout_request_id: string | null
          reason: string | null
          reference_id: string | null
          target_user_email: string | null
          target_user_id: string | null
          transaction_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          amount?: number | null
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          payout_request_id?: string | null
          reason?: string | null
          reference_id?: string | null
          target_user_email?: string | null
          target_user_id?: string | null
          transaction_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          amount?: number | null
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          payout_request_id?: string | null
          reason?: string | null
          reference_id?: string | null
          target_user_email?: string | null
          target_user_id?: string | null
          transaction_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_evidence: {
        Row: {
          admin_notes: string | null
          creator_id: string
          evidence_type: string
          expires_at: string | null
          external_url: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          payout_request_id: string
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          uploaded_at: string
        }
        Insert: {
          admin_notes?: string | null
          creator_id: string
          evidence_type: string
          expires_at?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          payout_request_id: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          uploaded_at?: string
        }
        Update: {
          admin_notes?: string | null
          creator_id?: string
          evidence_type?: string
          expires_at?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          payout_request_id?: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_evidence_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_evidence_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          created_at: string
          creator_id: string
          detected_value: number | null
          flag_reason: string | null
          flag_type: string
          id: string
          payout_request_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_type: string | null
          status: string
          submission_id: string | null
          threshold_value: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          detected_value?: number | null
          flag_reason?: string | null
          flag_type: string
          id?: string
          payout_request_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_type?: string | null
          status?: string
          submission_id?: string | null
          threshold_value?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          detected_value?: number | null
          flag_reason?: string | null
          flag_type?: string
          id?: string
          payout_request_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_type?: string | null
          status?: string
          submission_id?: string | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_flags_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          id: string
          refresh_token_encrypted: string
          scope: string | null
          token_expires_at: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          id?: string
          refresh_token_encrypted: string
          scope?: string | null
          token_expires_at: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          id?: string
          refresh_token_encrypted?: string
          scope?: string | null
          token_expires_at?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "tools_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_docs_tokens: {
        Row: {
          access_token_encrypted: string
          created_at: string
          id: string
          refresh_token_encrypted: string
          scope: string | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          id?: string
          refresh_token_encrypted: string
          scope?: string | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          id?: string
          refresh_token_encrypted?: string
          scope?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ip_bans: {
        Row: {
          banned_at: string
          banned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string
          is_active: boolean
          reason: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
          reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
          reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      level_thresholds: {
        Row: {
          level: number
          rank: string
          xp_required: number
        }
        Insert: {
          level: number
          rank: string
          xp_required: number
        }
        Update: {
          level?: number
          rank?: string
          xp_required?: number
        }
        Relationships: []
      }
      link_clicks: {
        Row: {
          browser: string | null
          city: string | null
          clicked_at: string
          country: string | null
          device: string | null
          id: string
          ip_hash: string | null
          link_id: string
          os: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device?: string | null
          id?: string
          ip_hash?: string | null
          link_id: string
          os?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device?: string | null
          id?: string
          ip_hash?: string | null
          link_id?: string
          os?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      link_conversions: {
        Row: {
          conversion_type: string
          converted_at: string
          id: string
          link_id: string
          metadata: Json | null
          order_id: string | null
          value: number | null
        }
        Insert: {
          conversion_type?: string
          converted_at?: string
          id?: string
          link_id: string
          metadata?: Json | null
          order_id?: string | null
          value?: number | null
        }
        Update: {
          conversion_type?: string
          converted_at?: string
          id?: string
          link_id?: string
          metadata?: Json | null
          order_id?: string | null
          value?: number | null
        }
        Relationships: []
      }
      low_balance_alerts: {
        Row: {
          alert_type: string
          balance_at_alert: number
          brand_id: string
          created_at: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          threshold_value: number
        }
        Insert: {
          alert_type: string
          balance_at_alert: number
          brand_id: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          threshold_value: number
        }
        Update: {
          alert_type?: string
          balance_at_alert?: number
          brand_id?: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          threshold_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "low_balance_alerts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_balance_alerts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          sender_type?: string
        }
        Relationships: []
      }
      milestone_achievements: {
        Row: {
          achieved_at: string
          achieved_value: number
          boost_id: string | null
          campaign_id: string | null
          id: string
          milestone_config_id: string
          notification_sent: boolean
          user_id: string
        }
        Insert: {
          achieved_at?: string
          achieved_value: number
          boost_id?: string | null
          campaign_id?: string | null
          id?: string
          milestone_config_id: string
          notification_sent?: boolean
          user_id: string
        }
        Update: {
          achieved_at?: string
          achieved_value?: number
          boost_id?: string | null
          campaign_id?: string | null
          id?: string
          milestone_config_id?: string
          notification_sent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_configs: {
        Row: {
          boost_id: string | null
          brand_id: string
          campaign_id: string | null
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          milestone_type: string
          threshold: number
        }
        Insert: {
          boost_id?: string | null
          brand_id: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message_template: string
          milestone_type: string
          threshold: number
        }
        Update: {
          boost_id?: string | null
          brand_id?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          milestone_type?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestone_configs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_configs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      module_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_transfers: {
        Row: {
          amount: number
          created_at: string
          fee: number
          id: string
          net_amount: number
          note: string | null
          recipient_id: string
          sender_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          fee?: number
          id?: string
          net_amount: number
          note?: string | null
          recipient_id: string
          sender_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          net_amount?: number
          note?: string | null
          recipient_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      payment_ledger: {
        Row: {
          accrued_amount: number
          boost_submission_id: string | null
          clawback_reason: string | null
          clawed_back_at: string | null
          cleared_at: string | null
          clearing_ends_at: string | null
          created_at: string
          id: string
          last_calculated_at: string | null
          last_paid_at: string | null
          locked_at: string | null
          milestone_threshold: number | null
          paid_amount: number
          payment_type: string
          payout_request_id: string | null
          rate: number | null
          source_id: string
          source_type: string
          status: string
          updated_at: string
          user_id: string
          video_submission_id: string | null
          views_snapshot: number | null
        }
        Insert: {
          accrued_amount?: number
          boost_submission_id?: string | null
          clawback_reason?: string | null
          clawed_back_at?: string | null
          cleared_at?: string | null
          clearing_ends_at?: string | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          last_paid_at?: string | null
          locked_at?: string | null
          milestone_threshold?: number | null
          paid_amount?: number
          payment_type: string
          payout_request_id?: string | null
          rate?: number | null
          source_id: string
          source_type: string
          status?: string
          updated_at?: string
          user_id: string
          video_submission_id?: string | null
          views_snapshot?: number | null
        }
        Update: {
          accrued_amount?: number
          boost_submission_id?: string | null
          clawback_reason?: string | null
          clawed_back_at?: string | null
          cleared_at?: string | null
          clearing_ends_at?: string | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          last_paid_at?: string | null
          locked_at?: string | null
          milestone_threshold?: number | null
          paid_amount?: number
          payment_type?: string
          payout_request_id?: string | null
          rate?: number | null
          source_id?: string
          source_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          video_submission_id?: string | null
          views_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_approval_votes: {
        Row: {
          admin_id: string | null
          approval_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          vote: string
          voted_at: string | null
        }
        Insert: {
          admin_id?: string | null
          approval_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          vote: string
          voted_at?: string | null
        }
        Update: {
          admin_id?: string | null
          approval_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          vote?: string
          voted_at?: string | null
        }
        Relationships: []
      }
      payout_approvals: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          executed_at: string | null
          executed_by: string | null
          expires_at: string | null
          id: string
          payout_request_id: string
          payout_type: string
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string | null
          required_approvals: number | null
          status: string | null
          tx_signature: string | null
          updated_at: string | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          executed_at?: string | null
          executed_by?: string | null
          expires_at?: string | null
          id?: string
          payout_request_id: string
          payout_type?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          required_approvals?: number | null
          status?: string | null
          tx_signature?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          executed_at?: string | null
          executed_by?: string | null
          expires_at?: string | null
          id?: string
          payout_request_id?: string
          payout_type?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          required_approvals?: number | null
          status?: string | null
          tx_signature?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          approval_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          payout_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          approval_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          payout_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          approval_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          payout_id?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          blockchain_network: string | null
          created_at: string
          crypto_amount: number | null
          id: string
          net_amount: number | null
          notes: string | null
          payout_details: Json
          payout_method: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["payout_status_new"]
          tax_form_id: string | null
          tax_form_verified: boolean | null
          transaction_id: string | null
          tx_confirmed_at: string | null
          tx_signature: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
          withholding_amount: number | null
          withholding_rate: number | null
        }
        Insert: {
          amount: number
          blockchain_network?: string | null
          created_at?: string
          crypto_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payout_details: Json
          payout_method: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status_new"]
          tax_form_id?: string | null
          tax_form_verified?: boolean | null
          transaction_id?: string | null
          tx_confirmed_at?: string | null
          tx_signature?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
          withholding_amount?: number | null
          withholding_rate?: number | null
        }
        Update: {
          amount?: number
          blockchain_network?: string | null
          created_at?: string
          crypto_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payout_details?: Json
          payout_method?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status_new"]
          tax_form_id?: string | null
          tax_form_verified?: boolean | null
          transaction_id?: string | null
          tx_confirmed_at?: string | null
          tx_signature?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
          withholding_amount?: number | null
          withholding_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payout_requests_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payout_requests_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_tax_form_id_fkey"
            columns: ["tax_form_id"]
            isOneToOne: false
            referencedRelation: "tax_forms"
            referencedColumns: ["id"]
          },
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
      pitches: {
        Row: {
          boost_id: string | null
          brand_id: string
          campaign_id: string | null
          created_at: string
          creator_id: string
          expires_at: string | null
          id: string
          message: string
          portfolio_links: string[] | null
          proposed_rate: number | null
          responded_at: string | null
          response: string | null
          response_message: string | null
          status: string
          subject: string
          type: string | null
          updated_at: string
        }
        Insert: {
          boost_id?: string | null
          brand_id: string
          campaign_id?: string | null
          created_at?: string
          creator_id: string
          expires_at?: string | null
          id?: string
          message: string
          portfolio_links?: string[] | null
          proposed_rate?: number | null
          responded_at?: string | null
          response?: string | null
          response_message?: string | null
          status?: string
          subject: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          boost_id?: string | null
          brand_id?: string
          campaign_id?: string | null
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          id?: string
          message?: string
          portfolio_links?: string[] | null
          proposed_rate?: number | null
          responded_at?: string | null
          response?: string | null
          response_message?: string | null
          status?: string
          subject?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitches_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitches_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitches_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitches_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitches_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_income: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          source_brand_id: string | null
          source_transaction_id: string | null
          source_user_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          source_brand_id?: string | null
          source_transaction_id?: string | null
          source_user_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          source_brand_id?: string | null
          source_transaction_id?: string | null
          source_user_id?: string | null
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          audience_quality_score: number | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banner_url: string | null
          billing_address: string | null
          bio: string | null
          brand_referral_code: string | null
          city: string | null
          content_languages: string[] | null
          content_niches: string[] | null
          content_styles: string[] | null
          country: string | null
          created_at: string | null
          cumulative_payouts_year: number | null
          cumulative_payouts_ytd: number | null
          current_level: number | null
          current_rank: string | null
          current_xp: number | null
          demographics_score: number | null
          device_fingerprint: string | null
          discord_access_token: string | null
          discord_avatar: string | null
          discord_connected_at: string | null
          discord_discriminator: string | null
          discord_email: string | null
          discord_id: string | null
          discord_refresh_token: string | null
          discord_token_expires_at: string | null
          discord_username: string | null
          editing_tools: string[] | null
          email: string | null
          fraud_flag_count: number | null
          fraud_flag_permanent: boolean | null
          full_name: string | null
          hide_from_leaderboard: boolean
          id: string
          is_private: boolean
          last_fraud_at: string | null
          legal_business_name: string | null
          notify_discord_campaign_updates: boolean
          notify_discord_new_campaigns: boolean
          notify_discord_payout_status: boolean
          notify_discord_transactions: boolean
          notify_email_campaign_updates: boolean
          notify_email_new_campaigns: boolean
          notify_email_payout_status: boolean
          notify_email_transactions: boolean
          notify_email_weekly_roundup: boolean
          onboarding_completed: boolean
          onboarding_step: number | null
          phone_number: string | null
          portfolio_items: Json | null
          referral_clicks: number | null
          referral_code: string | null
          referral_earnings: number | null
          referral_tier: Database["public"]["Enums"]["referral_tier"] | null
          referred_by: string | null
          resume_url: string | null
          show_joined_campaigns: boolean | null
          show_location: boolean | null
          show_total_earned: boolean | null
          signup_url: string | null
          subscribed_to_updates: boolean
          successful_referrals: number | null
          tax_classification: string | null
          tax_country: string | null
          tier_bonus_claimed_at: Json | null
          total_earnings: number | null
          total_referrals: number | null
          trust_score: number | null
          trust_score_updated_at: string | null
          twitter_avatar: string | null
          twitter_connected_at: string | null
          twitter_id: string | null
          twitter_name: string | null
          twitter_username: string | null
          updated_at: string | null
          username: string
          username_set_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vat_number: string | null
          views_score: number | null
          zktls_trust_level: string | null
          zktls_verified_at: string | null
        }
        Insert: {
          account_type?: string
          audience_quality_score?: number | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banner_url?: string | null
          billing_address?: string | null
          bio?: string | null
          brand_referral_code?: string | null
          city?: string | null
          content_languages?: string[] | null
          content_niches?: string[] | null
          content_styles?: string[] | null
          country?: string | null
          created_at?: string | null
          cumulative_payouts_year?: number | null
          cumulative_payouts_ytd?: number | null
          current_level?: number | null
          current_rank?: string | null
          current_xp?: number | null
          demographics_score?: number | null
          device_fingerprint?: string | null
          discord_access_token?: string | null
          discord_avatar?: string | null
          discord_connected_at?: string | null
          discord_discriminator?: string | null
          discord_email?: string | null
          discord_id?: string | null
          discord_refresh_token?: string | null
          discord_token_expires_at?: string | null
          discord_username?: string | null
          editing_tools?: string[] | null
          email?: string | null
          fraud_flag_count?: number | null
          fraud_flag_permanent?: boolean | null
          full_name?: string | null
          hide_from_leaderboard?: boolean
          id: string
          is_private?: boolean
          last_fraud_at?: string | null
          legal_business_name?: string | null
          notify_discord_campaign_updates?: boolean
          notify_discord_new_campaigns?: boolean
          notify_discord_payout_status?: boolean
          notify_discord_transactions?: boolean
          notify_email_campaign_updates?: boolean
          notify_email_new_campaigns?: boolean
          notify_email_payout_status?: boolean
          notify_email_transactions?: boolean
          notify_email_weekly_roundup?: boolean
          onboarding_completed?: boolean
          onboarding_step?: number | null
          phone_number?: string | null
          portfolio_items?: Json | null
          referral_clicks?: number | null
          referral_code?: string | null
          referral_earnings?: number | null
          referral_tier?: Database["public"]["Enums"]["referral_tier"] | null
          referred_by?: string | null
          resume_url?: string | null
          show_joined_campaigns?: boolean | null
          show_location?: boolean | null
          show_total_earned?: boolean | null
          signup_url?: string | null
          subscribed_to_updates?: boolean
          successful_referrals?: number | null
          tax_classification?: string | null
          tax_country?: string | null
          tier_bonus_claimed_at?: Json | null
          total_earnings?: number | null
          total_referrals?: number | null
          trust_score?: number | null
          trust_score_updated_at?: string | null
          twitter_avatar?: string | null
          twitter_connected_at?: string | null
          twitter_id?: string | null
          twitter_name?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          username: string
          username_set_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vat_number?: string | null
          views_score?: number | null
          zktls_trust_level?: string | null
          zktls_verified_at?: string | null
        }
        Update: {
          account_type?: string
          audience_quality_score?: number | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banner_url?: string | null
          billing_address?: string | null
          bio?: string | null
          brand_referral_code?: string | null
          city?: string | null
          content_languages?: string[] | null
          content_niches?: string[] | null
          content_styles?: string[] | null
          country?: string | null
          created_at?: string | null
          cumulative_payouts_year?: number | null
          cumulative_payouts_ytd?: number | null
          current_level?: number | null
          current_rank?: string | null
          current_xp?: number | null
          demographics_score?: number | null
          device_fingerprint?: string | null
          discord_access_token?: string | null
          discord_avatar?: string | null
          discord_connected_at?: string | null
          discord_discriminator?: string | null
          discord_email?: string | null
          discord_id?: string | null
          discord_refresh_token?: string | null
          discord_token_expires_at?: string | null
          discord_username?: string | null
          editing_tools?: string[] | null
          email?: string | null
          fraud_flag_count?: number | null
          fraud_flag_permanent?: boolean | null
          full_name?: string | null
          hide_from_leaderboard?: boolean
          id?: string
          is_private?: boolean
          last_fraud_at?: string | null
          legal_business_name?: string | null
          notify_discord_campaign_updates?: boolean
          notify_discord_new_campaigns?: boolean
          notify_discord_payout_status?: boolean
          notify_discord_transactions?: boolean
          notify_email_campaign_updates?: boolean
          notify_email_new_campaigns?: boolean
          notify_email_payout_status?: boolean
          notify_email_transactions?: boolean
          notify_email_weekly_roundup?: boolean
          onboarding_completed?: boolean
          onboarding_step?: number | null
          phone_number?: string | null
          portfolio_items?: Json | null
          referral_clicks?: number | null
          referral_code?: string | null
          referral_earnings?: number | null
          referral_tier?: Database["public"]["Enums"]["referral_tier"] | null
          referred_by?: string | null
          resume_url?: string | null
          show_joined_campaigns?: boolean | null
          show_location?: boolean | null
          show_total_earned?: boolean | null
          signup_url?: string | null
          subscribed_to_updates?: boolean
          successful_referrals?: number | null
          tax_classification?: string | null
          tax_country?: string | null
          tier_bonus_claimed_at?: Json | null
          total_earnings?: number | null
          total_referrals?: number | null
          trust_score?: number | null
          trust_score_updated_at?: string | null
          twitter_avatar?: string | null
          twitter_connected_at?: string | null
          twitter_id?: string | null
          twitter_name?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          username?: string
          username_set_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vat_number?: string | null
          views_score?: number | null
          zktls_trust_level?: string | null
          zktls_verified_at?: string | null
        }
        Relationships: []
      }
      program_video_metrics: {
        Row: {
          brand_id: string
          created_at: string | null
          id: string
          recorded_at: string | null
          source_id: string
          source_type: string
          total_bookmarks: number | null
          total_comments: number | null
          total_likes: number | null
          total_shares: number | null
          total_videos: number | null
          total_views: number | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          id?: string
          recorded_at?: string | null
          source_id: string
          source_type: string
          total_bookmarks?: number | null
          total_comments?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_videos?: number | null
          total_views?: number | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          id?: string
          recorded_at?: string | null
          source_id?: string
          source_type?: string
          total_bookmarks?: number | null
          total_comments?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_videos?: number | null
          total_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_video_metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_video_metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      public_boost_applications: {
        Row: {
          application_answers: Json | null
          bounty_campaign_id: string
          converted_user_id: string | null
          created_at: string
          discord_id: string | null
          discord_username: string | null
          email: string
          id: string
          phone_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_accounts: Json | null
          status: string
          updated_at: string
          waitlist_position: number | null
        }
        Insert: {
          application_answers?: Json | null
          bounty_campaign_id: string
          converted_user_id?: string | null
          created_at?: string
          discord_id?: string | null
          discord_username?: string | null
          email: string
          id?: string
          phone_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_accounts?: Json | null
          status?: string
          updated_at?: string
          waitlist_position?: number | null
        }
        Update: {
          application_answers?: Json | null
          bounty_campaign_id?: string
          converted_user_id?: string | null
          created_at?: string
          discord_id?: string | null
          discord_username?: string | null
          email?: string
          id?: string
          phone_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_accounts?: Json | null
          status?: string
          updated_at?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_boost_applications_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_boost_applications_converted_user_id_fkey"
            columns: ["converted_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_boost_applications_converted_user_id_fkey"
            columns: ["converted_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_boost_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_boost_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          attempts: number | null
          created_at: string | null
          id: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          attempts?: number | null
          created_at?: string | null
          id?: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          attempts?: number | null
          created_at?: string | null
          id?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      referral_milestone_rewards: {
        Row: {
          awarded_at: string
          id: string
          milestone_id: string
          referral_id: string
          reward_amount: number
        }
        Insert: {
          awarded_at?: string
          id?: string
          milestone_id: string
          referral_id: string
          reward_amount: number
        }
        Update: {
          awarded_at?: string
          id?: string
          milestone_id?: string
          referral_id?: string
          reward_amount?: number
        }
        Relationships: []
      }
      referral_milestones: {
        Row: {
          created_at: string
          display_name: string
          id: string
          milestone_type: string
          reward_amount: number
          threshold: number
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          milestone_type: string
          reward_amount: number
          threshold?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          milestone_type?: string
          reward_amount?: number
          threshold?: number
        }
        Relationships: []
      }
      referral_team_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_team_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          team_id: string
          total_contributed: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          team_id: string
          total_contributed?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          team_id?: string
          total_contributed?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_teams: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          referral_code: string
          total_earnings: number | null
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          referral_code: string
          total_earnings?: number | null
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          referral_code?: string
          total_earnings?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_earned: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_earned?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_earned?: number | null
          status?: string
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
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      social_account_campaigns: {
        Row: {
          campaign_id: string
          connected_at: string
          created_at: string
          disconnected_at: string | null
          id: string
          social_account_id: string
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          social_account_id: string
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          social_account_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_account_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_account_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_account_campaigns_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_account_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_account_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          account_link: string | null
          avatar_url: string | null
          bio: string | null
          connected_at: string | null
          follower_count: number | null
          hidden_from_public: boolean
          id: string
          is_verified: boolean | null
          last_zktls_verification_id: string | null
          platform: string
          user_id: string
          username: string
          verification_screenshot_url: string | null
          zktls_avg_views: number | null
          zktls_demographics: Json | null
          zktls_engagement_rate: number | null
          zktls_expires_at: string | null
          zktls_follower_count: number | null
          zktls_verified: boolean | null
          zktls_verified_at: string | null
        }
        Insert: {
          account_link?: string | null
          avatar_url?: string | null
          bio?: string | null
          connected_at?: string | null
          follower_count?: number | null
          hidden_from_public?: boolean
          id?: string
          is_verified?: boolean | null
          last_zktls_verification_id?: string | null
          platform: string
          user_id: string
          username: string
          verification_screenshot_url?: string | null
          zktls_avg_views?: number | null
          zktls_demographics?: Json | null
          zktls_engagement_rate?: number | null
          zktls_expires_at?: string | null
          zktls_follower_count?: number | null
          zktls_verified?: boolean | null
          zktls_verified_at?: string | null
        }
        Update: {
          account_link?: string | null
          avatar_url?: string | null
          bio?: string | null
          connected_at?: string | null
          follower_count?: number | null
          hidden_from_public?: boolean
          id?: string
          is_verified?: boolean | null
          last_zktls_verification_id?: string | null
          platform?: string
          user_id?: string
          username?: string
          verification_screenshot_url?: string | null
          zktls_avg_views?: number | null
          zktls_demographics?: Json | null
          zktls_engagement_rate?: number | null
          zktls_expires_at?: string | null
          zktls_follower_count?: number | null
          zktls_verified?: boolean | null
          zktls_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_last_zktls_verification_id_fkey"
            columns: ["last_zktls_verification_id"]
            isOneToOne: false
            referencedRelation: "zktls_verifications"
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
      strike_thresholds: {
        Row: {
          action_type: string
          brand_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          notification_template: string | null
          strike_count: number
          threshold_name: string
        }
        Insert: {
          action_type: string
          brand_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_template?: string | null
          strike_count: number
          threshold_name: string
        }
        Update: {
          action_type?: string
          brand_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_template?: string | null
          strike_count?: number
          threshold_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "strike_thresholds_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strike_thresholds_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_payout_items: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          clawback_reason: string | null
          clawback_status: string | null
          clawed_back_at: string | null
          clawed_back_by: string | null
          created_at: string
          flag_reason: string | null
          flagged_at: string | null
          flagged_by: string | null
          id: string
          is_locked: boolean
          original_amount: number | null
          overridden_at: string | null
          overridden_by: string | null
          override_amount: number | null
          override_reason: string | null
          payout_request_id: string
          source_id: string
          source_type: string
          status: string | null
          submission_id: string
          views_at_request: number | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          clawback_reason?: string | null
          clawback_status?: string | null
          clawed_back_at?: string | null
          clawed_back_by?: string | null
          created_at?: string
          flag_reason?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          is_locked?: boolean
          original_amount?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_amount?: number | null
          override_reason?: string | null
          payout_request_id: string
          source_id: string
          source_type: string
          status?: string | null
          submission_id: string
          views_at_request?: number | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          clawback_reason?: string | null
          clawback_status?: string | null
          clawed_back_at?: string | null
          clawed_back_by?: string | null
          created_at?: string
          flag_reason?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          is_locked?: boolean
          original_amount?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_amount?: number | null
          override_reason?: string | null
          payout_request_id?: string
          source_id?: string
          source_type?: string
          status?: string | null
          submission_id?: string
          views_at_request?: number | null
        }
        Relationships: []
      }
      submission_payout_requests: {
        Row: {
          appeal_evidence_id: string | null
          appeal_resolved_at: string | null
          appeal_resolved_by: string | null
          appeal_status: string | null
          appeal_submitted_at: string | null
          auto_approval_status: string | null
          clearing_ends_at: string
          completed_at: string | null
          created_at: string
          evidence_deadline: string | null
          evidence_requested_at: string | null
          fraud_check_result: Json | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
          views_snapshot: Json | null
        }
        Insert: {
          appeal_evidence_id?: string | null
          appeal_resolved_at?: string | null
          appeal_resolved_by?: string | null
          appeal_status?: string | null
          appeal_submitted_at?: string | null
          auto_approval_status?: string | null
          clearing_ends_at: string
          completed_at?: string | null
          created_at?: string
          evidence_deadline?: string | null
          evidence_requested_at?: string | null
          fraud_check_result?: Json | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
          views_snapshot?: Json | null
        }
        Update: {
          appeal_evidence_id?: string | null
          appeal_resolved_at?: string | null
          appeal_resolved_by?: string | null
          appeal_status?: string | null
          appeal_submitted_at?: string | null
          auto_approval_status?: string | null
          clearing_ends_at?: string
          completed_at?: string | null
          created_at?: string
          evidence_deadline?: string | null
          evidence_requested_at?: string | null
          fraud_check_result?: Json | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          views_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          id: string
          priority: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string | null
          id?: string
          priority?: string
          status?: string
          subject: string
          ticket_number?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          id?: string
          priority?: string
          status?: string
          subject?: string
          ticket_number?: string
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
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_forms: {
        Row: {
          admin_notes: string | null
          created_at: string
          electronic_signature_consent: boolean
          expires_at: string | null
          form_data: Json
          form_type: string
          id: string
          ip_address: unknown
          rejection_reason: string | null
          replaced_by: string | null
          signature_date: string
          signature_name: string
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
          version: number
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          electronic_signature_consent?: boolean
          expires_at?: string | null
          form_data: Json
          form_type: string
          id?: string
          ip_address?: unknown
          rejection_reason?: string | null
          replaced_by?: string | null
          signature_date?: string
          signature_name: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          electronic_signature_consent?: boolean
          expires_at?: string | null
          form_data?: Json
          form_type?: string
          id?: string
          ip_address?: unknown
          rejection_reason?: string | null
          replaced_by?: string | null
          signature_date?: string
          signature_name?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_forms_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "tax_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_forms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_forms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_forms_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_forms_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_earnings: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          member_id: string
          source_amount: number
          source_transaction_id: string
          team_id: string
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          member_id: string
          source_amount: number
          source_transaction_id: string
          team_id: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          member_id?: string
          source_amount?: number
          source_transaction_id?: string
          team_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          commission_rate: number
          id: string
          joined_at: string
          status: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_rate?: number
          id?: string
          joined_at?: string
          status?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_rate?: number
          id?: string
          joined_at?: string
          status?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          invite_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          invite_code?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          invite_code?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string | null
          discord_synced: boolean | null
          id: string
          is_internal: boolean | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          discord_synced?: boolean | null
          id?: string
          is_internal?: boolean | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          discord_synced?: boolean | null
          id?: string
          is_internal?: boolean | null
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: []
      }
      tier_change_history: {
        Row: {
          bounty_campaign_id: string
          change_reason: string | null
          change_type: string
          changed_by: string | null
          created_at: string | null
          criteria_evaluation: Json | null
          from_tier_id: string | null
          id: string
          performance_snapshot: Json | null
          to_tier_id: string | null
          user_id: string
        }
        Insert: {
          bounty_campaign_id: string
          change_reason?: string | null
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          criteria_evaluation?: Json | null
          from_tier_id?: string | null
          id?: string
          performance_snapshot?: Json | null
          to_tier_id?: string | null
          user_id: string
        }
        Update: {
          bounty_campaign_id?: string
          change_reason?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          criteria_evaluation?: Json | null
          from_tier_id?: string | null
          id?: string
          performance_snapshot?: Json | null
          to_tier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_change_history_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_change_history_from_tier_id_fkey"
            columns: ["from_tier_id"]
            isOneToOne: false
            referencedRelation: "boost_creator_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_change_history_to_tier_id_fkey"
            columns: ["to_tier_id"]
            isOneToOne: false
            referencedRelation: "boost_creator_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_change_log: {
        Row: {
          brand_id: string
          change_type: string
          created_at: string
          from_tier_id: string | null
          id: string
          metrics_snapshot: Json | null
          rule_id: string | null
          to_tier_id: string
          user_id: string
        }
        Insert: {
          brand_id: string
          change_type: string
          created_at?: string
          from_tier_id?: string | null
          id?: string
          metrics_snapshot?: Json | null
          rule_id?: string | null
          to_tier_id: string
          user_id: string
        }
        Update: {
          brand_id?: string
          change_type?: string
          created_at?: string
          from_tier_id?: string | null
          id?: string
          metrics_snapshot?: Json | null
          rule_id?: string | null
          to_tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_change_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_change_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_change_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_change_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_promotion_rules: {
        Row: {
          brand_id: string
          created_at: string
          evaluation_period_days: number | null
          from_tier_id: string | null
          id: string
          is_active: boolean
          rule_type: string
          threshold_value: number
          to_tier_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          evaluation_period_days?: number | null
          from_tier_id?: string | null
          id?: string
          is_active?: boolean
          rule_type: string
          threshold_value: number
          to_tier_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          evaluation_period_days?: number | null
          from_tier_id?: string | null
          id?: string
          is_active?: boolean
          rule_type?: string
          threshold_value?: number
          to_tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_promotion_rules_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_promotion_rules_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_events: {
        Row: {
          all_day: boolean | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          google_event_id: string | null
          id: string
          location: string | null
          partner_id: string | null
          start_time: string
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          partner_id?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          partner_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tools_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_partners: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          deal_value: number | null
          email: string | null
          id: string
          last_contact: string | null
          name: string
          next_followup: string | null
          notes: string | null
          phone: string | null
          pipeline_stage: string | null
          status: string | null
          tags: string[] | null
          type: string | null
          updated_at: string | null
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          deal_value?: number | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          deal_value?: number | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_partners_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tools_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_products: {
        Row: {
          billing_cycle: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          name: string
          price: number | null
          workspace_id: string | null
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name: string
          price?: number | null
          workspace_id?: string | null
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string
          price?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tools_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tools_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_team_members: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          last_active: string | null
          name: string
          role: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_active?: string | null
          name: string
          role?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_active?: string | null
          name?: string
          role?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tools_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_time_entries: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          hourly_rate: number | null
          id: string
          is_billable: boolean | null
          partner_id: string | null
          start_time: string
          task_id: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean | null
          partner_id?: string | null
          start_time?: string
          task_id?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean | null
          partner_id?: string | null
          start_time?: string
          task_id?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_time_entries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "tools_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tools_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_time_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tools_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          date: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          paid_date: string | null
          partner_id: string | null
          product_id: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_date?: string | null
          partner_id?: string | null
          product_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_date?: string | null
          partner_id?: string | null
          product_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_transactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "tools_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tools_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_workspaces: {
        Row: {
          created_at: string | null
          google_calendar_id: string | null
          google_calendar_name: string | null
          google_connected_at: string | null
          google_connected_by: string | null
          google_sync_token: string | null
          google_webhook_channel_id: string | null
          google_webhook_expiration: string | null
          google_webhook_resource_id: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          google_calendar_id?: string | null
          google_calendar_name?: string | null
          google_connected_at?: string | null
          google_connected_by?: string | null
          google_sync_token?: string | null
          google_webhook_channel_id?: string | null
          google_webhook_expiration?: string | null
          google_webhook_resource_id?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          google_calendar_id?: string | null
          google_calendar_name?: string | null
          google_connected_at?: string | null
          google_connected_by?: string | null
          google_sync_token?: string | null
          google_webhook_channel_id?: string | null
          google_webhook_expiration?: string | null
          google_webhook_resource_id?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      training_conversations: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          imported_by: string | null
          is_active: boolean | null
          last_retrieved_at: string | null
          quality_score: number | null
          question: string
          question_embedding: string | null
          retrieval_count: number | null
          source: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          imported_by?: string | null
          is_active?: boolean | null
          last_retrieved_at?: string | null
          quality_score?: number | null
          question: string
          question_embedding?: string | null
          retrieval_count?: number | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          imported_by?: string | null
          is_active?: boolean | null
          last_retrieved_at?: string | null
          quality_score?: number | null
          question?: string
          question_embedding?: string | null
          retrieval_count?: number | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trust_score_history: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          score: number
          score_change: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          score: number
          score_change?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          score?: number
          score_change?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_announcement_views: {
        Row: {
          announcement_id: string
          dismissed_at: string | null
          id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string | null
          id?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string | null
          id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_announcement_views_user_id_fkey"
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_current: boolean | null
          last_active_at: string | null
          os: string | null
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string | null
          os?: string | null
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string | null
          os?: string | null
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_submissions: {
        Row: {
          account_manager_notes: string | null
          analytics_recording_requested_at: string | null
          analytics_recording_uploaded_at: string | null
          analytics_recording_url: string | null
          bookmarks: number | null
          bot_analysis_status: string | null
          bot_analyzed_at: string | null
          bot_score: number | null
          bot_score_breakdown: Json | null
          brand_id: string | null
          caption: string | null
          comments: number | null
          created_at: string | null
          creator_id: string
          duration_seconds: number | null
          feedback: string | null
          flag_deadline: string | null
          gdrive_file_id: string | null
          gdrive_file_name: string | null
          gdrive_url: string | null
          gdrive_validated: boolean | null
          id: string
          is_flagged: boolean | null
          likes: number | null
          metrics_updated_at: string | null
          paid_views: number
          payout_amount: number | null
          payout_status: string | null
          platform: string | null
          posted_at_instagram: string | null
          posted_at_tiktok: string | null
          posted_at_youtube: string | null
          posted_by_instagram: string | null
          posted_by_tiktok: string | null
          posted_by_youtube: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number | null
          revision_of: string | null
          shares: number | null
          shortimize_video_id: string | null
          social_account_id: string | null
          source: string | null
          source_id: string
          source_type: string
          status: string | null
          status_instagram: string | null
          status_tiktok: string | null
          status_youtube: string | null
          submission_notes: string | null
          submitted_at: string | null
          target_account_instagram: string | null
          target_account_tiktok: string | null
          target_account_youtube: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          video_author_avatar: string | null
          video_author_username: string | null
          video_description: string | null
          video_playback_url: string | null
          video_thumbnail_url: string | null
          video_title: string | null
          video_upload_date: string | null
          video_url: string
          views: number | null
        }
        Insert: {
          account_manager_notes?: string | null
          analytics_recording_requested_at?: string | null
          analytics_recording_uploaded_at?: string | null
          analytics_recording_url?: string | null
          bookmarks?: number | null
          bot_analysis_status?: string | null
          bot_analyzed_at?: string | null
          bot_score?: number | null
          bot_score_breakdown?: Json | null
          brand_id?: string | null
          caption?: string | null
          comments?: number | null
          created_at?: string | null
          creator_id: string
          duration_seconds?: number | null
          feedback?: string | null
          flag_deadline?: string | null
          gdrive_file_id?: string | null
          gdrive_file_name?: string | null
          gdrive_url?: string | null
          gdrive_validated?: boolean | null
          id?: string
          is_flagged?: boolean | null
          likes?: number | null
          metrics_updated_at?: string | null
          paid_views?: number
          payout_amount?: number | null
          payout_status?: string | null
          platform?: string | null
          posted_at_instagram?: string | null
          posted_at_tiktok?: string | null
          posted_at_youtube?: string | null
          posted_by_instagram?: string | null
          posted_by_tiktok?: string | null
          posted_by_youtube?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number | null
          revision_of?: string | null
          shares?: number | null
          shortimize_video_id?: string | null
          social_account_id?: string | null
          source?: string | null
          source_id: string
          source_type: string
          status?: string | null
          status_instagram?: string | null
          status_tiktok?: string | null
          status_youtube?: string | null
          submission_notes?: string | null
          submitted_at?: string | null
          target_account_instagram?: string | null
          target_account_tiktok?: string | null
          target_account_youtube?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          video_author_avatar?: string | null
          video_author_username?: string | null
          video_description?: string | null
          video_playback_url?: string | null
          video_thumbnail_url?: string | null
          video_title?: string | null
          video_upload_date?: string | null
          video_url: string
          views?: number | null
        }
        Update: {
          account_manager_notes?: string | null
          analytics_recording_requested_at?: string | null
          analytics_recording_uploaded_at?: string | null
          analytics_recording_url?: string | null
          bookmarks?: number | null
          bot_analysis_status?: string | null
          bot_analyzed_at?: string | null
          bot_score?: number | null
          bot_score_breakdown?: Json | null
          brand_id?: string | null
          caption?: string | null
          comments?: number | null
          created_at?: string | null
          creator_id?: string
          duration_seconds?: number | null
          feedback?: string | null
          flag_deadline?: string | null
          gdrive_file_id?: string | null
          gdrive_file_name?: string | null
          gdrive_url?: string | null
          gdrive_validated?: boolean | null
          id?: string
          is_flagged?: boolean | null
          likes?: number | null
          metrics_updated_at?: string | null
          paid_views?: number
          payout_amount?: number | null
          payout_status?: string | null
          platform?: string | null
          posted_at_instagram?: string | null
          posted_at_tiktok?: string | null
          posted_at_youtube?: string | null
          posted_by_instagram?: string | null
          posted_by_tiktok?: string | null
          posted_by_youtube?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number | null
          revision_of?: string | null
          shares?: number | null
          shortimize_video_id?: string | null
          social_account_id?: string | null
          source?: string | null
          source_id?: string
          source_type?: string
          status?: string | null
          status_instagram?: string | null
          status_tiktok?: string | null
          status_youtube?: string | null
          submission_notes?: string | null
          submitted_at?: string | null
          target_account_instagram?: string | null
          target_account_tiktok?: string | null
          target_account_youtube?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          video_author_avatar?: string | null
          video_author_username?: string | null
          video_description?: string | null
          video_playback_url?: string | null
          video_thumbnail_url?: string | null
          video_title?: string | null
          video_upload_date?: string | null
          video_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_submissions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_posted_by_instagram_fkey"
            columns: ["posted_by_instagram"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_posted_by_instagram_fkey"
            columns: ["posted_by_instagram"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_posted_by_tiktok_fkey"
            columns: ["posted_by_tiktok"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_posted_by_tiktok_fkey"
            columns: ["posted_by_tiktok"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_posted_by_youtube_fkey"
            columns: ["posted_by_youtube"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_posted_by_youtube_fkey"
            columns: ["posted_by_youtube"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_revision_of_fkey"
            columns: ["revision_of"]
            isOneToOne: false
            referencedRelation: "video_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_target_account_instagram_fkey"
            columns: ["target_account_instagram"]
            isOneToOne: false
            referencedRelation: "brand_social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_target_account_tiktok_fkey"
            columns: ["target_account_tiktok"]
            isOneToOne: false
            referencedRelation: "brand_social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_target_account_youtube_fkey"
            columns: ["target_account_youtube"]
            isOneToOne: false
            referencedRelation: "brand_social_accounts"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          success: boolean
          webhook_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zktls_verifications: {
        Row: {
          avg_views: number | null
          created_at: string | null
          demographics: Json | null
          engagement_rate: number | null
          expires_at: string
          follower_count: number | null
          id: string
          is_valid: boolean | null
          proof_data: Json
          proof_id: string
          provider_id: string
          public_data: Json | null
          social_account_id: string | null
          updated_at: string | null
          user_id: string | null
          verified_at: string
          video_id: string | null
          video_metrics: Json | null
        }
        Insert: {
          avg_views?: number | null
          created_at?: string | null
          demographics?: Json | null
          engagement_rate?: number | null
          expires_at?: string
          follower_count?: number | null
          id?: string
          is_valid?: boolean | null
          proof_data: Json
          proof_id: string
          provider_id: string
          public_data?: Json | null
          social_account_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string
          video_id?: string | null
          video_metrics?: Json | null
        }
        Update: {
          avg_views?: number | null
          created_at?: string | null
          demographics?: Json | null
          engagement_rate?: number | null
          expires_at?: string
          follower_count?: number | null
          id?: string
          is_valid?: boolean | null
          proof_data?: Json
          proof_id?: string
          provider_id?: string
          public_data?: Json | null
          social_account_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string
          video_id?: string | null
          video_metrics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "zktls_verifications_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      brands_with_crm: {
        Row: {
          account_url: string | null
          active_opportunity_count: number | null
          app_store_url: string | null
          assets_url: string | null
          brand_color: string | null
          brand_type: string | null
          business_details: Json | null
          close_contacts: Json | null
          close_custom_fields: Json | null
          close_lead_id: string | null
          close_status_id: string | null
          close_status_label: string | null
          close_sync_enabled: boolean | null
          close_synced_at: string | null
          collection_id: string | null
          collection_name: string | null
          created_at: string | null
          description: string | null
          discord_bot_added_at: string | null
          discord_guild_icon: string | null
          discord_guild_id: string | null
          discord_guild_name: string | null
          discord_webhook_url: string | null
          dub_api_key: string | null
          fraud_sensitivity: string | null
          home_url: string | null
          id: string | null
          instagram_handle: string | null
          is_active: boolean | null
          is_verified: boolean | null
          last_activity_at: string | null
          last_activity_type: string | null
          linkedin_handle: string | null
          logo_url: string | null
          low_balance_auto_topup_amount: number | null
          low_balance_auto_topup_enabled: boolean | null
          low_balance_last_notified_at: string | null
          low_balance_notify_threshold: number | null
          low_balance_pause_campaign_threshold: number | null
          low_balance_pause_payouts_threshold: number | null
          name: string | null
          notify_creator_fraud: boolean | null
          notify_new_application: boolean | null
          notify_new_message: boolean | null
          notify_new_sale: boolean | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          opportunity_count: number | null
          portal_settings: Json | null
          renewal_date: string | null
          settings: Json | null
          shortimize_api_key: string | null
          show_account_tab: boolean | null
          slack_webhook_url: string | null
          slash_account_number: string | null
          slash_balance_cents: number | null
          slash_crypto_addresses: Json | null
          slash_routing_number: string | null
          slash_virtual_account_id: string | null
          slash_webhook_id: string | null
          slug: string | null
          source: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          tiktok_handle: string | null
          total_pipeline_value: number | null
          updated_at: string | null
          website: string | null
          website_url: string | null
          weighted_pipeline_value: number | null
          whop_company_id: string | null
          whop_manage_url: string | null
          whop_membership_id: string | null
          whop_onboarding_complete: boolean | null
          won_opportunity_count: number | null
          won_value: number | null
        }
        Relationships: []
      }
      editor_boost_stats: {
        Row: {
          boost_id: string | null
          brand_id: string | null
          daily_videos: number | null
          monthly_videos: number | null
          total_earnings: number | null
          total_videos: number | null
          user_id: string | null
          videos_paid: number | null
          videos_posted: number | null
          weekly_videos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bounty_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_creator_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_creator_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          is_infinite_budget: boolean | null
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
          is_infinite_budget?: boolean | null
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
          is_infinite_budget?: boolean | null
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
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_with_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          current_level: number | null
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
          current_level?: number | null
          demographics_score?: number | null
          full_name?: string | null
          id?: string | null
          total_earnings?: never
          trust_score?: number | null
          username?: string | null
          views_score?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          current_level?: number | null
          demographics_score?: number | null
          full_name?: string | null
          id?: string | null
          total_earnings?: never
          trust_score?: number | null
          username?: string | null
          views_score?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_to_wallet: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      atomic_allocate_budget: {
        Args: {
          p_amount: number
          p_brand_id: string
          p_campaign_id: string
          p_campaign_type: string
        }
        Returns: Json
      }
      atomic_brand_to_personal_transfer: {
        Args: {
          p_amount: number
          p_brand_id: string
          p_description?: string
          p_user_id: string
        }
        Returns: Json
      }
      atomic_complete_payout: {
        Args: { p_approved_by?: string; p_payout_request_id: string }
        Returns: Json
      }
      atomic_p2p_transfer: {
        Args: {
          p_fee: number
          p_gross_amount: number
          p_net_amount: number
          p_note?: string
          p_recipient_id: string
          p_recipient_username?: string
          p_sender_id: string
          p_sender_username?: string
        }
        Returns: Json
      }
      atomic_request_withdrawal: {
        Args: {
          p_amount: number
          p_payout_details: Json
          p_payout_method: string
          p_tax_form_id?: string
          p_tax_form_verified?: boolean
          p_user_id: string
          p_withholding_amount?: number
          p_withholding_rate?: number
        }
        Returns: Json
      }
      brand_has_no_members: { Args: { _brand_id: string }; Returns: boolean }
      calculate_audience_insights_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_reaction_sentiment: {
        Args: { p_negative: number; p_positive: number; p_total: number }
        Returns: number
      }
      calculate_reliability_score: {
        Args: { p_brand_id: string; p_creator_id: string }
        Returns: number
      }
      calculate_trust_penalty: {
        Args: { p_fraud_amount: number }
        Returns: number
      }
      calculate_trust_score_for_user: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_zktls_trust_bonus: {
        Args: { p_user_id: string }
        Returns: number
      }
      can_view_payout_item: { Args: { _item_id: string }; Returns: boolean }
      can_view_profile: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_approval_threshold: {
        Args: { approval_uuid: string }
        Returns: boolean
      }
      check_google_docs_connection: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_max_attempts?: number
          p_user_id: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      check_tax_form_required: {
        Args: { p_payout_amount: number; p_user_id: string }
        Returns: {
          cumulative_payouts: number
          existing_form_id: string
          existing_form_status: string
          form_type: string
          reason: string
          required: boolean
          threshold: number
        }[]
      }
      check_username_available: {
        Args: { desired_username: string }
        Returns: boolean
      }
      cleanup_demographic_videos: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      create_default_creator_tiers: {
        Args: { p_brand_id: string }
        Returns: undefined
      }
      decrypt_discord_token: {
        Args: { encrypted_token: string }
        Returns: string
      }
      decrypt_google_docs_token: {
        Args: { encrypted_token: string }
        Returns: string
      }
      decrypt_payout_details: {
        Args: { encrypted_details: string; wallet_user_id: string }
        Returns: Json
      }
      delete_discord_tokens: { Args: { p_user_id: string }; Returns: undefined }
      delete_google_docs_tokens: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      encrypt_discord_token: { Args: { token: string }; Returns: string }
      encrypt_google_docs_token: { Args: { token: string }; Returns: string }
      encrypt_payout_details: { Args: { details: Json }; Returns: string }
      expire_old_insights_requests: { Args: never; Returns: number }
      expire_old_pitches: { Args: never; Returns: undefined }
      generate_short_code: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_approval_thresholds: { Args: { p_amount: number }; Returns: Json }
      get_approval_vote_count: {
        Args: { approval_uuid: string }
        Returns: {
          approve_count: number
          reject_count: number
        }[]
      }
      get_brand_creator_earnings: {
        Args: { p_brand_id: string }
        Returns: {
          total_earnings: number
          user_id: string
        }[]
      }
      get_creator_insights: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          approval_rate: number
          approved_submissions: number
          avatar_url: string
          created_at: string
          email: string
          id: string
          last_active: string
          platform_breakdown: Json
          total_earnings: number
          total_submissions: number
          username: string
        }[]
      }
      get_creator_insights_stats: {
        Args: never
        Returns: {
          active_creators: number
          at_risk_creators: number
          avg_earnings: number
          churned_creators: number
          dormant_creators: number
          total_creators: number
        }[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_current_user_email: { Args: never; Returns: string }
      get_database_stats: {
        Args: never
        Returns: {
          active_connections: number
          cache_hit_ratio: number
          deadlocks: number
          idle_connections: number
          total_connections: number
          transactions_committed: number
          transactions_rolled_back: number
        }[]
      }
      get_db_size: {
        Args: never
        Returns: {
          size_bytes: number
          size_formatted: string
        }[]
      }
      get_discord_tokens: {
        Args: { p_user_id: string }
        Returns: {
          access_token: string
          discord_id: string
          refresh_token: string
          token_expires_at: string
        }[]
      }
      get_effective_brand_limits: {
        Args: { p_brand_id: string }
        Returns: {
          boosts_limit: number
          campaigns_limit: number
          custom_plan_name: string
          hires_limit: number
          is_custom: boolean
        }[]
      }
      get_fraud_thresholds: { Args: { p_sensitivity: string }; Returns: Json }
      get_google_docs_tokens: {
        Args: { p_user_id: string }
        Returns: {
          access_token: string
          refresh_token: string
          scope: string
          token_expires_at: string
        }[]
      }
      get_level_from_xp: {
        Args: { xp: number }
        Returns: {
          level: number
          rank: string
          xp_for_next_level: number
        }[]
      }
      get_pending_amount: {
        Args: { ledger: Database["public"]["Tables"]["payment_ledger"]["Row"] }
        Returns: number
      }
      get_referral_tier: {
        Args: { referral_count: number }
        Returns: Database["public"]["Enums"]["referral_tier"]
      }
      get_table_sizes: {
        Args: never
        Returns: {
          data_size: string
          index_size: string
          row_estimate: number
          table_name: string
          total_size: string
        }[]
      }
      get_tier_commission_rate: {
        Args: { tier: Database["public"]["Enums"]["referral_tier"] }
        Returns: number
      }
      get_tier_upgrade_bonus: {
        Args: {
          new_tier: Database["public"]["Enums"]["referral_tier"]
          old_tier: Database["public"]["Enums"]["referral_tier"]
        }
        Returns: number
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_withholding_rate: {
        Args: { p_tax_form_id: string; p_user_id: string }
        Returns: number
      }
      has_admin_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_referral_clicks: {
        Args: { referral_code_input: string }
        Returns: undefined
      }
      increment_template_usage: {
        Args: { template_id_param: string }
        Returns: undefined
      }
      is_brand_admin: {
        Args: { _brand_id: string; _user_id: string }
        Returns: boolean
      }
      is_brand_member: {
        Args: { _brand_id: string; _user_id: string }
        Returns: boolean
      }
      is_creator_banned: { Args: { p_creator_id: string }; Returns: boolean }
      is_device_banned: { Args: { p_fingerprint: string }; Returns: boolean }
      is_member_of_active_brand: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_tools_admin: { Args: never; Returns: boolean }
      is_zktls_verification_expired: {
        Args: { verification_id: string }
        Returns: boolean
      }
      log_financial_audit: {
        Args: {
          p_action_type: string
          p_actor_id: string
          p_amount?: number
          p_balance_after?: number
          p_balance_before?: number
          p_ip_address?: unknown
          p_metadata?: Json
          p_payout_request_id?: string
          p_reason?: string
          p_target_user_id?: string
          p_transaction_id?: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_action_type: string
          p_actor_id?: string
          p_actor_type?: string
          p_entity_id?: string
          p_entity_type?: string
          p_ip_address?: string
          p_metadata?: Json
          p_user_agent?: string
        }
        Returns: string
      }
      match_analytics_to_users: {
        Args: { p_campaign_id: string }
        Returns: {
          matched_count: number
          total_count: number
          unmatched_count: number
        }[]
      }
      match_training_conversations: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          answer: string
          category: string
          id: string
          question: string
          similarity: number
        }[]
      }
      owns_payout_request: { Args: { _request_id: string }; Returns: boolean }
      update_cumulative_payouts: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      update_zktls_trust_level: { Args: { p_user_id: string }; Returns: string }
      upsert_discord_tokens: {
        Args: {
          p_access_token: string
          p_discord_id: string
          p_refresh_token: string
          p_token_expires_at: string
          p_user_id: string
        }
        Returns: undefined
      }
      upsert_google_docs_tokens: {
        Args: {
          p_access_token: string
          p_refresh_token: string
          p_scope?: string
          p_token_expires_at: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_is_member_of_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_owner_of_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_team_member: { Args: { _user_id: string }; Returns: boolean }
      user_owns_any_team: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "brand"
      message_sender_type: "user" | "admin"
      payout_status_new: "pending" | "in_transit" | "completed" | "rejected"
      referral_tier: "beginner" | "amateur" | "pro" | "elite"
      sales_stage: "lead" | "qualified" | "negotiation" | "won"
      ticket_category:
        | "billing"
        | "technical"
        | "account"
        | "campaign"
        | "payout"
        | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "awaiting_reply"
        | "resolved"
        | "closed"
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
      app_role: ["admin", "user", "brand"],
      message_sender_type: ["user", "admin"],
      payout_status_new: ["pending", "in_transit", "completed", "rejected"],
      referral_tier: ["beginner", "amateur", "pro", "elite"],
      sales_stage: ["lead", "qualified", "negotiation", "won"],
      ticket_category: [
        "billing",
        "technical",
        "account",
        "campaign",
        "payout",
        "other",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "awaiting_reply",
        "resolved",
        "closed",
      ],
    },
  },
} as const

