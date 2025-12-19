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
      blog_posts: {
        Row: {
          author: string
          category: string | null
          content: string
          content_type: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
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
          payout_amount: number | null
          platform: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
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
          payout_amount?: number | null
          platform: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          payout_amount?: number | null
          platform?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          banner_url: string | null
          blueprint_embed_url: string | null
          blueprint_id: string | null
          brand_id: string
          budget: number | null
          budget_used: number | null
          content_style_requirements: string
          created_at: string
          description: string | null
          discord_guild_id: string | null
          end_date: string | null
          id: string
          is_private: boolean
          max_accepted_creators: number
          monthly_retainer: number
          start_date: string | null
          status: string
          title: string
          updated_at: string
          videos_per_month: number
        }
        Insert: {
          accepted_creators_count?: number
          application_questions?: Json | null
          banner_url?: string | null
          blueprint_embed_url?: string | null
          blueprint_id?: string | null
          brand_id: string
          budget?: number | null
          budget_used?: number | null
          content_style_requirements: string
          created_at?: string
          description?: string | null
          discord_guild_id?: string | null
          end_date?: string | null
          id?: string
          is_private?: boolean
          max_accepted_creators: number
          monthly_retainer: number
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          videos_per_month: number
        }
        Update: {
          accepted_creators_count?: number
          application_questions?: Json | null
          banner_url?: string | null
          blueprint_embed_url?: string | null
          blueprint_id?: string | null
          brand_id?: string
          budget?: number | null
          budget_used?: number | null
          content_style_requirements?: string
          created_at?: string
          description?: string | null
          discord_guild_id?: string | null
          end_date?: string | null
          id?: string
          is_private?: boolean
          max_accepted_creators?: number
          monthly_retainer?: number
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          videos_per_month?: number
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
      brand_invitations: {
        Row: {
          brand_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
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
          invited_by: string
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
          invited_by?: string
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
      brands: {
        Row: {
          account_url: string | null
          assets_url: string | null
          brand_type: string | null
          business_details: Json | null
          collection_id: string | null
          collection_name: string | null
          created_at: string
          description: string | null
          discord_webhook_url: string | null
          home_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          notify_new_application: boolean | null
          notify_new_message: boolean | null
          notify_new_sale: boolean | null
          renewal_date: string | null
          shortimize_api_key: string | null
          show_account_tab: boolean
          slack_webhook_url: string | null
          slug: string
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          updated_at: string
          whop_company_id: string | null
          whop_manage_url: string | null
          whop_membership_id: string | null
          whop_onboarding_complete: boolean | null
        }
        Insert: {
          account_url?: string | null
          assets_url?: string | null
          brand_type?: string | null
          business_details?: Json | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          description?: string | null
          discord_webhook_url?: string | null
          home_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          notify_new_application?: boolean | null
          notify_new_message?: boolean | null
          notify_new_sale?: boolean | null
          renewal_date?: string | null
          shortimize_api_key?: string | null
          show_account_tab?: boolean
          slack_webhook_url?: string | null
          slug: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          updated_at?: string
          whop_company_id?: string | null
          whop_manage_url?: string | null
          whop_membership_id?: string | null
          whop_onboarding_complete?: boolean | null
        }
        Update: {
          account_url?: string | null
          assets_url?: string | null
          brand_type?: string | null
          business_details?: Json | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          description?: string | null
          discord_webhook_url?: string | null
          home_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          notify_new_application?: boolean | null
          notify_new_message?: boolean | null
          notify_new_sale?: boolean | null
          renewal_date?: string | null
          shortimize_api_key?: string | null
          show_account_tab?: boolean
          slack_webhook_url?: string | null
          slug?: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          updated_at?: string
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
          brand_id: string
          cached_at: string
          campaign_id: string
          caption: string | null
          comments: number | null
          created_at: string
          description: string | null
          id: string
          likes: number | null
          platform: string
          shares: number | null
          shortimize_video_id: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          uploaded_at: string | null
          username: string
          video_url: string | null
          views: number | null
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
          platform: string
          shares?: number | null
          shortimize_video_id: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string | null
          username: string
          video_url?: string | null
          views?: number | null
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
          platform?: string
          shares?: number | null
          shortimize_video_id?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string | null
          username?: string
          video_url?: string | null
          views?: number | null
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
          submission_text: string | null
          updated_at: string | null
          video_url: string
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
          submission_text?: string | null
          updated_at?: string | null
          video_url: string
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
          submission_text?: string | null
          updated_at?: string | null
          video_url?: string
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
          created_at: string | null
          description: string | null
          discord_guild_id: string | null
          embed_url: string | null
          end_date: string | null
          guidelines: string | null
          hashtags: string[] | null
          id: string
          is_featured: boolean
          is_infinite_budget: boolean | null
          is_private: boolean | null
          payout_day_of_week: number | null
          preview_url: string | null
          requirements: string[] | null
          requires_application: boolean
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
          created_at?: string | null
          description?: string | null
          discord_guild_id?: string | null
          embed_url?: string | null
          end_date?: string | null
          guidelines?: string | null
          hashtags?: string[] | null
          id?: string
          is_featured?: boolean
          is_infinite_budget?: boolean | null
          is_private?: boolean | null
          payout_day_of_week?: number | null
          preview_url?: string | null
          requirements?: string[] | null
          requires_application?: boolean
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
          created_at?: string | null
          description?: string | null
          discord_guild_id?: string | null
          embed_url?: string | null
          end_date?: string | null
          guidelines?: string | null
          hashtags?: string[] | null
          id?: string
          is_featured?: boolean
          is_infinite_budget?: boolean | null
          is_private?: boolean | null
          payout_day_of_week?: number | null
          preview_url?: string | null
          requirements?: string[] | null
          requires_application?: boolean
          rpm_rate?: number
          slug?: string
          start_date?: string | null
          status?: string | null
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
          account_type: string
          avatar_url: string | null
          billing_address: string | null
          bio: string | null
          city: string | null
          content_languages: string[] | null
          content_niches: string[] | null
          content_styles: string[] | null
          country: string | null
          created_at: string | null
          demographics_score: number | null
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
          full_name: string | null
          hide_from_leaderboard: boolean
          id: string
          legal_business_name: string | null
          onboarding_completed: boolean
          phone_number: string | null
          referral_code: string | null
          referral_earnings: number | null
          referral_tier: Database["public"]["Enums"]["referral_tier"] | null
          referred_by: string | null
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
          views_score: number | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          billing_address?: string | null
          bio?: string | null
          city?: string | null
          content_languages?: string[] | null
          content_niches?: string[] | null
          content_styles?: string[] | null
          country?: string | null
          created_at?: string | null
          demographics_score?: number | null
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
          full_name?: string | null
          hide_from_leaderboard?: boolean
          id: string
          legal_business_name?: string | null
          onboarding_completed?: boolean
          phone_number?: string | null
          referral_code?: string | null
          referral_earnings?: number | null
          referral_tier?: Database["public"]["Enums"]["referral_tier"] | null
          referred_by?: string | null
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
          views_score?: number | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          billing_address?: string | null
          bio?: string | null
          city?: string | null
          content_languages?: string[] | null
          content_niches?: string[] | null
          content_styles?: string[] | null
          country?: string | null
          created_at?: string | null
          demographics_score?: number | null
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
          full_name?: string | null
          hide_from_leaderboard?: boolean
          id?: string
          legal_business_name?: string | null
          onboarding_completed?: boolean
          phone_number?: string | null
          referral_code?: string | null
          referral_earnings?: number | null
          referral_tier?: Database["public"]["Enums"]["referral_tier"] | null
          referred_by?: string | null
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
          views_score?: number | null
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
      roadmap_phases: {
        Row: {
          brand_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_phases_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_task_completions: {
        Row: {
          brand_id: string
          completed_at: string
          completed_by: string | null
          id: string
          task_id: string
        }
        Insert: {
          brand_id: string
          completed_at?: string
          completed_by?: string | null
          id?: string
          task_id: string
        }
        Update: {
          brand_id?: string
          completed_at?: string
          completed_by?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_task_completions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "roadmap_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_locked: boolean
          is_section_header: boolean
          link_url: string | null
          order_index: number
          phase_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean
          is_section_header?: boolean
          link_url?: string | null
          order_index?: number
          phase_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean
          is_section_header?: boolean
          link_url?: string | null
          order_index?: number
          phase_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "roadmap_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_deals: {
        Row: {
          brand_id: string
          close_date: string | null
          created_at: string
          deal_value: number | null
          id: string
          lost_reason: string | null
          next_payment_date: string | null
          notes: string | null
          owner_id: string | null
          payment_amount: number | null
          probability: number | null
          stage: Database["public"]["Enums"]["sales_stage"]
          updated_at: string
          won_date: string | null
        }
        Insert: {
          brand_id: string
          close_date?: string | null
          created_at?: string
          deal_value?: number | null
          id?: string
          lost_reason?: string | null
          next_payment_date?: string | null
          notes?: string | null
          owner_id?: string | null
          payment_amount?: number | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["sales_stage"]
          updated_at?: string
          won_date?: string | null
        }
        Update: {
          brand_id?: string
          close_date?: string | null
          created_at?: string
          deal_value?: number | null
          id?: string
          lost_reason?: string | null
          next_payment_date?: string | null
          notes?: string | null
          owner_id?: string | null
          payment_amount?: number | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["sales_stage"]
          updated_at?: string
          won_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_deals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_video_saves: {
        Row: {
          blueprint_id: string
          created_at: string
          id: string
          saved_by: string | null
          scope_video_id: string
        }
        Insert: {
          blueprint_id: string
          created_at?: string
          id?: string
          saved_by?: string | null
          scope_video_id: string
        }
        Update: {
          blueprint_id?: string
          created_at?: string
          id?: string
          saved_by?: string | null
          scope_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_video_saves_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_video_saves_scope_video_id_fkey"
            columns: ["scope_video_id"]
            isOneToOne: false
            referencedRelation: "scope_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_videos: {
        Row: {
          avatar_url: string | null
          brand_id: string | null
          caption: string | null
          content_style: string | null
          created_at: string
          cta_outcome: string | null
          file_url: string | null
          format: string | null
          id: string
          is_example: boolean | null
          platform: string
          tags: string[] | null
          target_audience: string | null
          thumbnail_url: string | null
          updated_at: string
          username: string | null
          video_url: string
          views: number | null
        }
        Insert: {
          avatar_url?: string | null
          brand_id?: string | null
          caption?: string | null
          content_style?: string | null
          created_at?: string
          cta_outcome?: string | null
          file_url?: string | null
          format?: string | null
          id?: string
          is_example?: boolean | null
          platform?: string
          tags?: string[] | null
          target_audience?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          username?: string | null
          video_url: string
          views?: number | null
        }
        Update: {
          avatar_url?: string | null
          brand_id?: string | null
          caption?: string | null
          content_style?: string | null
          created_at?: string
          cta_outcome?: string | null
          file_url?: string | null
          format?: string | null
          id?: string
          is_example?: boolean | null
          platform?: string
          tags?: string[] | null
          target_audience?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          username?: string | null
          video_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scope_videos_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
      shortimize_tracking: {
        Row: {
          accounts_synced: number | null
          campaign_id: string
          collection_id: string | null
          collection_name: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          sync_error: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          accounts_synced?: number | null
          campaign_id: string
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          accounts_synced?: number | null
          campaign_id?: string
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortimize_tracking_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortimize_tracking_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      video_analytics: {
        Row: {
          account: string
          brand_id: string
          comments: number | null
          created_at: string | null
          engagement_rate: number | null
          id: string
          imported_at: string | null
          likes: number | null
          platform: string
          updated_at: string | null
          upload_date: string | null
          video_link: string
          video_title: string | null
          views: number | null
          views_performance: number | null
        }
        Insert: {
          account: string
          brand_id: string
          comments?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          imported_at?: string | null
          likes?: number | null
          platform: string
          updated_at?: string | null
          upload_date?: string | null
          video_link: string
          video_title?: string | null
          views?: number | null
          views_performance?: number | null
        }
        Update: {
          account?: string
          brand_id?: string
          comments?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          imported_at?: string | null
          likes?: number | null
          platform?: string
          updated_at?: string | null
          upload_date?: string | null
          video_link?: string
          video_title?: string | null
          views?: number | null
          views_performance?: number | null
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
      warmap_events: {
        Row: {
          assigned_to: string[] | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          link: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string[] | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          link?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string[] | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          link?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          order_index: number | null
          priority: string | null
          reminder_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          priority?: string | null
          reminder_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          priority?: string | null
          reminder_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      brand_has_no_members: { Args: { _brand_id: string }; Returns: boolean }
      can_view_profile: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      cleanup_demographic_videos: { Args: never; Returns: undefined }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_brand_admin: {
        Args: { _brand_id: string; _user_id: string }
        Returns: boolean
      }
      is_brand_member: {
        Args: { _brand_id: string; _user_id: string }
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
    }
    Enums: {
      app_role: "admin" | "user" | "brand"
      payout_status_new: "pending" | "in_transit" | "completed" | "rejected"
      referral_tier: "beginner" | "amateur" | "pro" | "elite"
      sales_stage: "lead" | "qualified" | "negotiation" | "won"
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
      payout_status_new: ["pending", "in_transit", "completed", "rejected"],
      referral_tier: ["beginner", "amateur", "pro", "elite"],
      sales_stage: ["lead", "qualified", "negotiation", "won"],
    },
  },
} as const
