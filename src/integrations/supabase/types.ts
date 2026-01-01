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
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      auto_rejection_log: {
        Row: {
          created_at: string
          id: string
          rejection_reason: string | null
          rule_id: string | null
          submission_id: string | null
          submission_type: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          rejection_reason?: string | null
          rule_id?: string | null
          submission_id?: string | null
          submission_type?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          rejection_reason?: string | null
          rule_id?: string | null
          submission_id?: string | null
          submission_type?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_rejection_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "auto_rejection_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_rejection_rules: {
        Row: {
          brand_id: string
          campaign_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          rejection_message: string | null
          rule_config: Json | null
          rule_type: string
          rule_value: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          rejection_message?: string | null
          rule_config?: Json | null
          rule_type: string
          rule_value?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          rejection_message?: string | null
          rule_config?: Json | null
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
          completed_at: string
          created_at: string
          id: string
          module_id: string
          quiz_score: number | null
          user_id: string
        }
        Insert: {
          blueprint_id: string
          completed_at?: string
          created_at?: string
          id?: string
          module_id: string
          quiz_score?: number | null
          user_id: string
        }
        Update: {
          blueprint_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          module_id?: string
          quiz_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_training_completions_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
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
            foreignKeyName: "boost_video_submissions_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_view_bonuses: {
        Row: {
          bonus_amount: number
          bonus_type: string
          bounty_campaign_id: string
          cpm_rate: number | null
          created_at: string
          id: string
          is_active: boolean | null
          min_views: number | null
          updated_at: string
          view_threshold: number
        }
        Insert: {
          bonus_amount: number
          bonus_type?: string
          bounty_campaign_id: string
          cpm_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_views?: number | null
          updated_at?: string
          view_threshold: number
        }
        Update: {
          bonus_amount?: number
          bonus_type?: string
          bounty_campaign_id?: string
          cpm_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_views?: number | null
          updated_at?: string
          view_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "boost_view_bonuses_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      bounty_applications: {
        Row: {
          application_text: string | null
          applied_at: string
          bounty_campaign_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          application_text?: string | null
          applied_at?: string
          bounty_campaign_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          application_text?: string | null
          applied_at?: string
          bounty_campaign_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "bounty_applications_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
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
        ]
      }
      bounty_campaigns: {
        Row: {
          accepted_creators_count: number
          application_questions: Json | null
          availability_requirement: string | null
          banner_url: string | null
          blueprint_embed_url: string | null
          blueprint_id: string | null
          brand_id: string
          budget: number | null
          budget_used: number | null
          content_distribution: string | null
          content_style_requirements: string
          created_at: string
          description: string | null
          discord_guild_id: string | null
          discord_role_id: string | null
          end_date: string | null
          id: string
          is_private: boolean
          max_accepted_creators: number
          monthly_retainer: number
          position_type: string | null
          review_notes: string | null
          review_status: string | null
          reward_amount: number | null
          shortimize_collection_name: string | null
          slug: string | null
          start_date: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          videos_per_month: number
          view_bonuses_enabled: boolean | null
          work_location: string | null
        }
        Insert: {
          accepted_creators_count?: number
          application_questions?: Json | null
          availability_requirement?: string | null
          banner_url?: string | null
          blueprint_embed_url?: string | null
          blueprint_id?: string | null
          brand_id: string
          budget?: number | null
          budget_used?: number | null
          content_distribution?: string | null
          content_style_requirements: string
          created_at?: string
          description?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          end_date?: string | null
          id?: string
          is_private?: boolean
          max_accepted_creators: number
          monthly_retainer: number
          position_type?: string | null
          review_notes?: string | null
          review_status?: string | null
          reward_amount?: number | null
          shortimize_collection_name?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          videos_per_month: number
          view_bonuses_enabled?: boolean | null
          work_location?: string | null
        }
        Update: {
          accepted_creators_count?: number
          application_questions?: Json | null
          availability_requirement?: string | null
          banner_url?: string | null
          blueprint_embed_url?: string | null
          blueprint_id?: string | null
          brand_id?: string
          budget?: number | null
          budget_used?: number | null
          content_distribution?: string | null
          content_style_requirements?: string
          created_at?: string
          description?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          end_date?: string | null
          id?: string
          is_private?: boolean
          max_accepted_creators?: number
          monthly_retainer?: number
          position_type?: string | null
          review_notes?: string | null
          review_status?: string | null
          reward_amount?: number | null
          shortimize_collection_name?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          videos_per_month?: number
          view_bonuses_enabled?: boolean | null
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bounty_campaigns_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bounty_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
            foreignKeyName: "brand_broadcast_reads_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "brand_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_broadcast_targets: {
        Row: {
          boost_id: string | null
          broadcast_id: string
          campaign_id: string | null
          created_at: string
          id: string
        }
        Insert: {
          boost_id?: string | null
          broadcast_id: string
          campaign_id?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          boost_id?: string | null
          broadcast_id?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_broadcast_targets_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_broadcast_targets_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "brand_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_broadcast_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_broadcast_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_broadcasts: {
        Row: {
          brand_id: string
          broadcast_type: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          scheduled_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          target_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          broadcast_type?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          target_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          broadcast_type?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          target_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_broadcasts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
            foreignKeyName: "brand_course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_creator_notes: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string
          creator_id: string
          id: string
          note_content: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by: string
          creator_id: string
          id?: string
          note_content?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string
          creator_id?: string
          id?: string
          note_content?: string | null
          tags?: string[] | null
          updated_at?: string
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
        Relationships: [
          {
            foreignKeyName: "brand_creator_tags_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "brand_creator_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_creator_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "creator_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_invitations: {
        Row: {
          brand_id: string
          created_at: string
          email: string
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
          email: string
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
          email?: string
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
        ]
      }
      brand_referrals: {
        Row: {
          brand_id: string
          commission_rate: number | null
          created_at: string
          id: string
          referral_code: string
          referrer_brand_id: string | null
          referrer_id: string | null
          reward_earned: number | null
          status: string
          total_earned: number | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          referral_code: string
          referrer_brand_id?: string | null
          referrer_id?: string | null
          reward_earned?: number | null
          status?: string
          total_earned?: number | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          referral_code?: string
          referrer_brand_id?: string | null
          referrer_id?: string | null
          reward_earned?: number | null
          status?: string
          total_earned?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_referrals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_referrals_referrer_brand_id_fkey"
            columns: ["referrer_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
            foreignKeyName: "brand_wallet_transactions_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_wallet_transactions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_wallet_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_wallet_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
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
          collection_id: string | null
          collection_name: string | null
          created_at: string
          description: string | null
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
          renewal_date: string | null
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
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_onboarding_complete: boolean | null
          stripe_payouts_enabled: boolean | null
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
          whop_member_id: string | null
          whop_membership_id: string | null
          whop_onboarding_complete: boolean | null
          whop_payment_method_id: string | null
        }
        Insert: {
          account_url?: string | null
          app_store_url?: string | null
          assets_url?: string | null
          brand_color?: string | null
          brand_type?: string | null
          business_details?: Json | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          description?: string | null
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
          renewal_date?: string | null
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
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
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
          whop_member_id?: string | null
          whop_membership_id?: string | null
          whop_onboarding_complete?: boolean | null
          whop_payment_method_id?: string | null
        }
        Update: {
          account_url?: string | null
          app_store_url?: string | null
          assets_url?: string | null
          brand_color?: string | null
          brand_type?: string | null
          business_details?: Json | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          description?: string | null
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
          renewal_date?: string | null
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
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
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
          whop_member_id?: string | null
          whop_membership_id?: string | null
          whop_onboarding_complete?: boolean | null
          whop_payment_method_id?: string | null
        }
        Relationships: []
      }
      cached_campaign_videos: {
        Row: {
          bookmarks: number | null
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
            foreignKeyName: "cached_campaign_videos_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
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
        Relationships: []
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
            foreignKeyName: "campaign_cpm_payouts_video_submission_id_fkey"
            columns: ["video_submission_id"]
            isOneToOne: true
            referencedRelation: "video_submissions"
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
            foreignKeyName: "campaign_links_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_links_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_links_bounty_campaign_id_fkey"
            columns: ["bounty_campaign_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_links_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
          {
            foreignKeyName: "campaign_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "campaign_videos_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
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
          payment_model: string | null
          payout_day_of_week: number | null
          platform_rates: Json | null
          post_rate: number | null
          preview_url: string | null
          requirements: string[] | null
          requires_application: boolean
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
          payment_model?: string | null
          payout_day_of_week?: number | null
          platform_rates?: Json | null
          post_rate?: number | null
          preview_url?: string | null
          requirements?: string[] | null
          requires_application?: boolean
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
          payment_model?: string | null
          payout_day_of_week?: number | null
          platform_rates?: Json | null
          post_rate?: number | null
          preview_url?: string | null
          requirements?: string[] | null
          requires_application?: boolean
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
            foreignKeyName: "campaigns_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "content_slot_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_slot_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_slot_history_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "content_slots"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "content_slots_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_slots_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_slots_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "creator_contracts"
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "contract_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "contract_template_variables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
        ]
      }
      creator_contracts: {
        Row: {
          boost_id: string | null
          brand_id: string
          created_at: string
          creator_email: string
          creator_id: string | null
          custom_terms: string | null
          duration_months: number
          end_date: string | null
          id: string
          monthly_rate: number
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
          created_at?: string
          creator_email: string
          creator_id?: string | null
          custom_terms?: string | null
          duration_months?: number
          end_date?: string | null
          id?: string
          monthly_rate?: number
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
          created_at?: string
          creator_email?: string
          creator_id?: string | null
          custom_terms?: string | null
          duration_months?: number
          end_date?: string | null
          id?: string
          monthly_rate?: number
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
            foreignKeyName: "creator_contracts_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_contracts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
          {
            foreignKeyName: "creator_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_fraud_history: {
        Row: {
          created_at: string
          fraud_amount: number | null
          fraud_count: number | null
          id: string
          last_fraud_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fraud_amount?: number | null
          fraud_count?: number | null
          id?: string
          last_fraud_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fraud_amount?: number | null
          fraud_count?: number | null
          id?: string
          last_fraud_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "creator_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_notes_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "brand_creator_relationships"
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
            foreignKeyName: "creator_strikes_appeal_reviewed_by_fkey"
            columns: ["appeal_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_appeal_reviewed_by_fkey"
            columns: ["appeal_reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "creator_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_strikes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "creator_tier_assignments_previous_tier_id_fkey"
            columns: ["previous_tier_id"]
            isOneToOne: false
            referencedRelation: "creator_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tier_assignments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "creator_tiers"
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
            foreignKeyName: "discord_reaction_tracking_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "brand_broadcasts"
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
        Relationships: [
          {
            foreignKeyName: "discord_reactions_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "discord_reaction_tracking"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "discord_role_mappings_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_role_mappings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_role_mappings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_role_mappings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_role_mappings_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "creator_tiers"
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
        Relationships: []
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
        Relationships: []
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
        ]
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
        Relationships: []
      }
      fraud_evidence: {
        Row: {
          created_at: string
          evidence_data: Json | null
          evidence_type: string
          fraud_flag_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          evidence_data?: Json | null
          evidence_type: string
          fraud_flag_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          evidence_data?: Json | null
          evidence_type?: string
          fraud_flag_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_evidence_fraud_flag_id_fkey"
            columns: ["fraud_flag_id"]
            isOneToOne: false
            referencedRelation: "fraud_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          created_at: string
          flag_reason: string | null
          flag_type: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string | null
          submission_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          flag_reason?: string | null
          flag_type: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          submission_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          flag_reason?: string | null
          flag_type?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          submission_id?: string | null
          updated_at?: string
          user_id?: string | null
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "campaign_links"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "link_conversions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "campaign_links"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "milestone_achievements_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_achievements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_achievements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_achievements_milestone_config_id_fkey"
            columns: ["milestone_config_id"]
            isOneToOne: false
            referencedRelation: "milestone_configs"
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
            foreignKeyName: "milestone_configs_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "bounty_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_configs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_configs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_configs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
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
            foreignKeyName: "module_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
            foreignKeyName: "payment_ledger_boost_submission_id_fkey"
            columns: ["boost_submission_id"]
            isOneToOne: false
            referencedRelation: "boost_video_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "submission_payout_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_video_submission_id_fkey"
            columns: ["video_submission_id"]
            isOneToOne: false
            referencedRelation: "video_submissions"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "platform_income_source_brand_id_fkey"
            columns: ["source_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
          city: string | null
          content_languages: string[] | null
          content_niches: string[] | null
          content_styles: string[] | null
          country: string | null
          created_at: string | null
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
          email: string | null
          fraud_flag_count: number | null
          fraud_flag_permanent: boolean | null
          full_name: string | null
          hide_from_leaderboard: boolean
          id: string
          is_private: boolean
          last_fraud_at: string | null
          legal_business_name: string | null
          onboarding_completed: boolean
          phone_number: string | null
          portfolio_items: Json | null
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
          tier_bonus_claimed_at: Json | null
          total_earnings: number | null
          total_referrals: number | null
          trust_score: number | null
          twitter_avatar: string | null
          twitter_connected_at: string | null
          twitter_id: string | null
          twitter_name: string | null
          twitter_username: string | null
          updated_at: string | null
          username: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vat_number: string | null
          views_score: number | null
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
          city?: string | null
          content_languages?: string[] | null
          content_niches?: string[] | null
          content_styles?: string[] | null
          country?: string | null
          created_at?: string | null
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
          email?: string | null
          fraud_flag_count?: number | null
          fraud_flag_permanent?: boolean | null
          full_name?: string | null
          hide_from_leaderboard?: boolean
          id: string
          is_private?: boolean
          last_fraud_at?: string | null
          legal_business_name?: string | null
          onboarding_completed?: boolean
          phone_number?: string | null
          portfolio_items?: Json | null
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
          tier_bonus_claimed_at?: Json | null
          total_earnings?: number | null
          total_referrals?: number | null
          trust_score?: number | null
          twitter_avatar?: string | null
          twitter_connected_at?: string | null
          twitter_id?: string | null
          twitter_name?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          username: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vat_number?: string | null
          views_score?: number | null
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
          city?: string | null
          content_languages?: string[] | null
          content_niches?: string[] | null
          content_styles?: string[] | null
          country?: string | null
          created_at?: string | null
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
          email?: string | null
          fraud_flag_count?: number | null
          fraud_flag_permanent?: boolean | null
          full_name?: string | null
          hide_from_leaderboard?: boolean
          id?: string
          is_private?: boolean
          last_fraud_at?: string | null
          legal_business_name?: string | null
          onboarding_completed?: boolean
          phone_number?: string | null
          portfolio_items?: Json | null
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
          tier_bonus_claimed_at?: Json | null
          total_earnings?: number | null
          total_referrals?: number | null
          trust_score?: number | null
          twitter_avatar?: string | null
          twitter_connected_at?: string | null
          twitter_id?: string | null
          twitter_name?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          username?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vat_number?: string | null
          views_score?: number | null
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
        Relationships: [
          {
            foreignKeyName: "referral_milestone_rewards_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "referral_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_milestone_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "referral_team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "referral_teams"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "referral_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "referral_teams"
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
        ]
      }
      social_accounts: {
        Row: {
          account_link: string | null
          avatar_url: string | null
          bio: string | null
          campaign_id: string | null
          connected_at: string | null
          follower_count: number | null
          hidden_from_public: boolean
          id: string
          is_verified: boolean | null
          platform: string
          user_id: string
          username: string
          verification_screenshot_url: string | null
        }
        Insert: {
          account_link?: string | null
          avatar_url?: string | null
          bio?: string | null
          campaign_id?: string | null
          connected_at?: string | null
          follower_count?: number | null
          hidden_from_public?: boolean
          id?: string
          is_verified?: boolean | null
          platform: string
          user_id: string
          username: string
          verification_screenshot_url?: string | null
        }
        Update: {
          account_link?: string | null
          avatar_url?: string | null
          bio?: string | null
          campaign_id?: string | null
          connected_at?: string | null
          follower_count?: number | null
          hidden_from_public?: boolean
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
        Relationships: [
          {
            foreignKeyName: "submission_payout_items_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "submission_payout_requests"
            referencedColumns: ["id"]
          },
        ]
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
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          views_snapshot?: Json | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "team_earnings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_earnings_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: true
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_earnings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          created_at: string
          id: string
          is_internal: boolean
          sender_id: string
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id: string
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id?: string
          sender_type?: Database["public"]["Enums"]["message_sender_type"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
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
            foreignKeyName: "tier_change_log_from_tier_id_fkey"
            columns: ["from_tier_id"]
            isOneToOne: false
            referencedRelation: "creator_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_change_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "tier_promotion_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_change_log_to_tier_id_fkey"
            columns: ["to_tier_id"]
            isOneToOne: false
            referencedRelation: "creator_tiers"
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
            foreignKeyName: "tier_promotion_rules_from_tier_id_fkey"
            columns: ["from_tier_id"]
            isOneToOne: false
            referencedRelation: "creator_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_promotion_rules_to_tier_id_fkey"
            columns: ["to_tier_id"]
            isOneToOne: false
            referencedRelation: "creator_tiers"
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
          analytics_recording_requested_at: string | null
          analytics_recording_uploaded_at: string | null
          analytics_recording_url: string | null
          bookmarks: number | null
          bot_score: number | null
          brand_id: string | null
          comments: number | null
          created_at: string | null
          creator_id: string
          flag_deadline: string | null
          id: string
          is_flagged: boolean | null
          likes: number | null
          metrics_updated_at: string | null
          paid_views: number
          payout_amount: number | null
          payout_status: string | null
          platform: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shares: number | null
          shortimize_video_id: string | null
          social_account_id: string | null
          source: string | null
          source_id: string
          source_type: string
          status: string | null
          submission_notes: string | null
          submitted_at: string | null
          updated_at: string | null
          video_author_avatar: string | null
          video_author_username: string | null
          video_description: string | null
          video_thumbnail_url: string | null
          video_title: string | null
          video_upload_date: string | null
          video_url: string
          views: number | null
        }
        Insert: {
          analytics_recording_requested_at?: string | null
          analytics_recording_uploaded_at?: string | null
          analytics_recording_url?: string | null
          bookmarks?: number | null
          bot_score?: number | null
          brand_id?: string | null
          comments?: number | null
          created_at?: string | null
          creator_id: string
          flag_deadline?: string | null
          id?: string
          is_flagged?: boolean | null
          likes?: number | null
          metrics_updated_at?: string | null
          paid_views?: number
          payout_amount?: number | null
          payout_status?: string | null
          platform?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shares?: number | null
          shortimize_video_id?: string | null
          social_account_id?: string | null
          source?: string | null
          source_id: string
          source_type: string
          status?: string | null
          submission_notes?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          video_author_avatar?: string | null
          video_author_username?: string | null
          video_description?: string | null
          video_thumbnail_url?: string | null
          video_title?: string | null
          video_upload_date?: string | null
          video_url: string
          views?: number | null
        }
        Update: {
          analytics_recording_requested_at?: string | null
          analytics_recording_uploaded_at?: string | null
          analytics_recording_url?: string | null
          bookmarks?: number | null
          bot_score?: number | null
          brand_id?: string | null
          comments?: number | null
          created_at?: string | null
          creator_id?: string
          flag_deadline?: string | null
          id?: string
          is_flagged?: boolean | null
          likes?: number | null
          metrics_updated_at?: string | null
          paid_views?: number
          payout_amount?: number | null
          payout_status?: string | null
          platform?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shares?: number | null
          shortimize_video_id?: string | null
          social_account_id?: string | null
          source?: string | null
          source_id?: string
          source_type?: string
          status?: string | null
          submission_notes?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          video_author_avatar?: string | null
          video_author_username?: string | null
          video_description?: string | null
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
            foreignKeyName: "video_submissions_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      view_bonus_payouts: {
        Row: {
          amount_paid: number
          bonus_id: string
          created_at: string
          creator_id: string
          id: string
          paid_at: string
          transaction_id: string | null
          video_submission_id: string
          views_at_payout: number
        }
        Insert: {
          amount_paid: number
          bonus_id: string
          created_at?: string
          creator_id: string
          id?: string
          paid_at?: string
          transaction_id?: string | null
          video_submission_id: string
          views_at_payout: number
        }
        Update: {
          amount_paid?: number
          bonus_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          paid_at?: string
          transaction_id?: string | null
          video_submission_id?: string
          views_at_payout?: number
        }
        Relationships: [
          {
            foreignKeyName: "view_bonus_payouts_bonus_id_fkey"
            columns: ["bonus_id"]
            isOneToOne: false
            referencedRelation: "boost_view_bonuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "view_bonus_payouts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "view_bonus_payouts_video_submission_id_fkey"
            columns: ["video_submission_id"]
            isOneToOne: false
            referencedRelation: "video_submissions"
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
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "brand_webhooks"
            referencedColumns: ["id"]
          },
        ]
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
          p_sender_id: string
        }
        Returns: Json
      }
      brand_has_no_members: { Args: { _brand_id: string }; Returns: boolean }
      can_view_payout_item: { Args: { _item_id: string }; Returns: boolean }
      can_view_profile: {
        Args: { _profile_id: string; _viewer_id: string }
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
      decrypt_payout_details: {
        Args: { encrypted_details: string; wallet_user_id: string }
        Returns: Json
      }
      delete_discord_tokens: { Args: { p_user_id: string }; Returns: undefined }
      encrypt_discord_token: { Args: { token: string }; Returns: string }
      encrypt_payout_details: { Args: { details: Json }; Returns: string }
      generate_short_code: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
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
      get_discord_tokens: {
        Args: { p_user_id: string }
        Returns: {
          access_token: string
          discord_id: string
          refresh_token: string
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
      is_member_of_active_brand: {
        Args: { _user_id: string }
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
      owns_payout_request: { Args: { _request_id: string }; Returns: boolean }
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
