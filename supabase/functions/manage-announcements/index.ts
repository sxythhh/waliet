// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "create" | "update" | "delete" | "list" | "toggle_reaction";

interface ManageAnnouncementsRequest {
  action: Action;
  // For create
  source_type?: "campaign" | "boost";
  source_id?: string;
  content?: string;
  is_pinned?: boolean;
  // For update/delete
  announcement_id?: string;
  // For toggle_reaction
  emoji?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header and verify user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ManageAnnouncementsRequest = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "action is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper to check if user is a brand member for a source
    async function isBrandMemberForSource(
      sourceType: "campaign" | "boost",
      sourceId: string
    ): Promise<boolean> {
      const { data, error } = await supabase
        .from("bounty_campaigns")
        .select(
          `
          id,
          brands!inner (
            id,
            brand_members!inner (
              user_id
            )
          )
        `
        )
        .eq("id", sourceId)
        .eq("brands.brand_members.user_id", user.id)
        .single();

      return !error && !!data;
    }

    // Helper to check if user can view announcement (member or brand owner)
    async function canViewAnnouncement(announcementId: string): Promise<boolean> {
      const { data: announcement, error } = await supabase
        .from("campaign_announcements")
        .select("campaign_id, boost_id")
        .eq("id", announcementId)
        .single();

      if (error || !announcement) return false;

      const sourceType = announcement.campaign_id ? "campaign" : "boost";
      const sourceId = announcement.campaign_id || announcement.boost_id;

      // Check if brand member
      const isBrandMember = await isBrandMemberForSource(sourceType, sourceId);
      if (isBrandMember) return true;

      // Check if creator member
      if (sourceType === "campaign") {
        const { data } = await supabase
          .from("campaign_members")
          .select("id")
          .eq("campaign_id", sourceId)
          .eq("user_id", user.id)
          .eq("status", "approved")
          .single();
        return !!data;
      } else {
        const { data } = await supabase
          .from("boost_memberships")
          .select("id")
          .eq("boost_id", sourceId)
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();
        return !!data;
      }
    }

    switch (action) {
      case "create": {
        const { source_type, source_id, content, is_pinned } = body;

        if (!source_type || !source_id || !content) {
          return new Response(
            JSON.stringify({
              error: "source_type, source_id, and content are required",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Verify user is brand member
        const canCreate = await isBrandMemberForSource(source_type, source_id);
        if (!canCreate) {
          return new Response(
            JSON.stringify({ error: "Not authorized to create announcements" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const insertData: Record<string, any> = {
          content,
          is_pinned: is_pinned || false,
          created_by: user.id,
        };

        if (source_type === "campaign") {
          insertData.campaign_id = source_id;
        } else {
          insertData.boost_id = source_id;
        }

        const { data, error } = await supabase
          .from("campaign_announcements")
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error("Error creating announcement:", error);
          return new Response(
            JSON.stringify({ error: "Failed to create announcement" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify({ success: true, data }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        const { announcement_id, content, is_pinned } = body;

        if (!announcement_id) {
          return new Response(
            JSON.stringify({ error: "announcement_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Get announcement and verify ownership
        const { data: existing, error: fetchError } = await supabase
          .from("campaign_announcements")
          .select("campaign_id, boost_id")
          .eq("id", announcement_id)
          .single();

        if (fetchError || !existing) {
          return new Response(
            JSON.stringify({ error: "Announcement not found" }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const sourceType = existing.campaign_id ? "campaign" : "boost";
        const sourceId = existing.campaign_id || existing.boost_id;

        const canUpdate = await isBrandMemberForSource(sourceType, sourceId);
        if (!canUpdate) {
          return new Response(
            JSON.stringify({ error: "Not authorized to update announcement" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const updateData: Record<string, any> = {};
        if (content !== undefined) updateData.content = content;
        if (is_pinned !== undefined) updateData.is_pinned = is_pinned;

        const { data, error } = await supabase
          .from("campaign_announcements")
          .update(updateData)
          .eq("id", announcement_id)
          .select()
          .single();

        if (error) {
          console.error("Error updating announcement:", error);
          return new Response(
            JSON.stringify({ error: "Failed to update announcement" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { announcement_id } = body;

        if (!announcement_id) {
          return new Response(
            JSON.stringify({ error: "announcement_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Get announcement and verify ownership
        const { data: existing, error: fetchError } = await supabase
          .from("campaign_announcements")
          .select("campaign_id, boost_id")
          .eq("id", announcement_id)
          .single();

        if (fetchError || !existing) {
          return new Response(
            JSON.stringify({ error: "Announcement not found" }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const sourceType = existing.campaign_id ? "campaign" : "boost";
        const sourceId = existing.campaign_id || existing.boost_id;

        const canDelete = await isBrandMemberForSource(sourceType, sourceId);
        if (!canDelete) {
          return new Response(
            JSON.stringify({ error: "Not authorized to delete announcement" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const { error } = await supabase
          .from("campaign_announcements")
          .delete()
          .eq("id", announcement_id);

        if (error) {
          console.error("Error deleting announcement:", error);
          return new Response(
            JSON.stringify({ error: "Failed to delete announcement" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list": {
        const { source_type, source_id } = body;

        if (!source_type || !source_id) {
          return new Response(
            JSON.stringify({ error: "source_type and source_id are required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Build query based on source type
        let query = supabase
          .from("campaign_announcements")
          .select(
            `
            *,
            created_by_profile:profiles!campaign_announcements_created_by_fkey(
              id,
              username,
              avatar_url
            ),
            reactions:announcement_reactions(
              emoji,
              user_id
            )
          `
          )
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false });

        if (source_type === "campaign") {
          query = query.eq("campaign_id", source_id);
        } else {
          query = query.eq("boost_id", source_id);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error listing announcements:", error);
          return new Response(
            JSON.stringify({ error: "Failed to list announcements" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Transform data to aggregate reactions
        const announcements = (data || []).map((announcement) => {
          const reactionCounts: Record<
            string,
            { count: number; hasReacted: boolean }
          > = {};

          for (const reaction of announcement.reactions || []) {
            if (!reactionCounts[reaction.emoji]) {
              reactionCounts[reaction.emoji] = { count: 0, hasReacted: false };
            }
            reactionCounts[reaction.emoji].count++;
            if (reaction.user_id === user.id) {
              reactionCounts[reaction.emoji].hasReacted = true;
            }
          }

          return {
            id: announcement.id,
            content: announcement.content,
            is_pinned: announcement.is_pinned,
            created_at: announcement.created_at,
            updated_at: announcement.updated_at,
            created_by: announcement.created_by_profile,
            reactions: Object.entries(reactionCounts).map(([emoji, data]) => ({
              emoji,
              count: data.count,
              hasReacted: data.hasReacted,
            })),
          };
        });

        return new Response(JSON.stringify({ success: true, data: announcements }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggle_reaction": {
        const { announcement_id, emoji } = body;

        if (!announcement_id || !emoji) {
          return new Response(
            JSON.stringify({ error: "announcement_id and emoji are required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Verify user can view the announcement
        const canReact = await canViewAnnouncement(announcement_id);
        if (!canReact) {
          return new Response(
            JSON.stringify({ error: "Not authorized to react to announcement" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Check if reaction exists
        const { data: existingReaction, error: checkError } = await supabase
          .from("announcement_reactions")
          .select("id")
          .eq("announcement_id", announcement_id)
          .eq("user_id", user.id)
          .eq("emoji", emoji)
          .single();

        if (existingReaction) {
          // Remove reaction
          const { error } = await supabase
            .from("announcement_reactions")
            .delete()
            .eq("id", existingReaction.id);

          if (error) {
            console.error("Error removing reaction:", error);
            return new Response(
              JSON.stringify({ error: "Failed to remove reaction" }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          return new Response(
            JSON.stringify({ success: true, action: "removed" }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } else {
          // Add reaction
          const { error } = await supabase
            .from("announcement_reactions")
            .insert({
              announcement_id,
              user_id: user.id,
              emoji,
            });

          if (error) {
            console.error("Error adding reaction:", error);
            return new Response(
              JSON.stringify({ error: "Failed to add reaction" }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          return new Response(JSON.stringify({ success: true, action: "added" }), {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in manage-announcements:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
