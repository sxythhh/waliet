import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface UpdatePayoutSettingsInput {
  entity_type: 'brand' | 'boost';
  entity_id: string;
  holding_days?: number;
  minimum_amount?: number;
  reset_to_default?: boolean;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: UpdatePayoutSettingsInput = await req.json();
    const { entity_type, entity_id, holding_days, minimum_amount, reset_to_default } = body;

    // Validate required fields
    if (!entity_type || !entity_id) {
      return new Response(JSON.stringify({ error: 'entity_type and entity_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['brand', 'boost'].includes(entity_type)) {
      return new Response(JSON.stringify({ error: 'entity_type must be "brand" or "boost"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate ranges if values provided
    if (holding_days !== undefined && (holding_days < 0 || holding_days > 30)) {
      return new Response(JSON.stringify({ error: 'holding_days must be between 0 and 30' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (minimum_amount !== undefined && (minimum_amount < 0 || minimum_amount > 50 || minimum_amount % 5 !== 0)) {
      return new Response(JSON.stringify({ error: 'minimum_amount must be 0-50 in increments of 5' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (entity_type === 'brand') {
      // Brand-level settings
      // Check if user owns a brand with this profile ID
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('id, owner_id')
        .eq('owner_id', entity_id)
        .single();

      // Also check if user is a brand member with admin role
      const { data: brandMembership } = await supabase
        .from('brand_members')
        .select('brand_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .maybeSingle();

      const isOwner = brand?.owner_id === user.id;
      const isAdmin = brandMembership && entity_id === user.id;

      if (!isOwner && !isAdmin) {
        // Check if user is the profile owner themselves
        if (entity_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Not authorized to update brand payout settings' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Check rate limit
      const { data: profile } = await supabase
        .from('profiles')
        .select('payout_settings_updated_at')
        .eq('id', entity_id)
        .single();

      if (profile?.payout_settings_updated_at) {
        const lastUpdate = new Date(profile.payout_settings_updated_at).getTime();
        const now = Date.now();
        if (now - lastUpdate < ONE_DAY_MS) {
          const timeRemaining = Math.ceil((ONE_DAY_MS - (now - lastUpdate)) / (60 * 60 * 1000));
          return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            details: `Payout settings can only be changed once per day. Try again in ${timeRemaining} hours.`
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Update brand (profile) payout settings
      const updateData: Record<string, unknown> = {
        payout_settings_updated_at: new Date().toISOString(),
      };

      if (holding_days !== undefined) {
        updateData.payout_holding_days = holding_days;
      }
      if (minimum_amount !== undefined) {
        updateData.payout_minimum_amount = minimum_amount;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', entity_id);

      if (updateError) {
        console.error('Failed to update brand payout settings:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update settings' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log to history
      await supabase
        .from('payout_settings_history')
        .insert({
          entity_type: 'brand',
          entity_id,
          holding_days: holding_days ?? null,
          minimum_amount: minimum_amount ?? null,
          changed_by: user.id,
        });

      return new Response(JSON.stringify({
        success: true,
        message: 'Brand payout settings updated',
        settings: {
          holding_days: holding_days ?? undefined,
          minimum_amount: minimum_amount ?? undefined,
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // Boost-level settings
      // Fetch the boost and verify ownership
      const { data: boost, error: boostError } = await supabase
        .from('bounty_campaigns')
        .select('id, brand_id, creator_id')
        .eq('id', entity_id)
        .single();

      if (boostError || !boost) {
        return new Response(JSON.stringify({ error: 'Boost not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user is brand owner or member
      const { data: brandMembership } = await supabase
        .from('brand_members')
        .select('brand_id, role')
        .eq('user_id', user.id)
        .eq('brand_id', boost.brand_id)
        .maybeSingle();

      const isCreator = boost.creator_id === user.id;
      const isBrandMember = !!brandMembership;

      if (!isCreator && !isBrandMember) {
        return new Response(JSON.stringify({ error: 'Not authorized to update boost payout settings' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check rate limit
      if (boost.payout_settings_updated_at) {
        const lastUpdate = new Date(boost.payout_settings_updated_at).getTime();
        const now = Date.now();
        if (now - lastUpdate < ONE_DAY_MS) {
          const timeRemaining = Math.ceil((ONE_DAY_MS - (now - lastUpdate)) / (60 * 60 * 1000));
          return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            details: `Payout settings can only be changed once per day. Try again in ${timeRemaining} hours.`
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle reset to default
      if (reset_to_default) {
        const { error: resetError } = await supabase
          .from('bounty_campaigns')
          .update({
            payout_holding_days: null,
            payout_minimum_amount: null,
            payout_settings_updated_at: new Date().toISOString(),
          })
          .eq('id', entity_id);

        if (resetError) {
          console.error('Failed to reset boost payout settings:', resetError);
          return new Response(JSON.stringify({ error: 'Failed to reset settings' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Log to history
        await supabase
          .from('payout_settings_history')
          .insert({
            entity_type: 'boost',
            entity_id,
            holding_days: null,
            minimum_amount: null,
            changed_by: user.id,
          });

        return new Response(JSON.stringify({
          success: true,
          message: 'Boost payout settings reset to brand defaults',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update boost payout settings
      const updateData: Record<string, unknown> = {
        payout_settings_updated_at: new Date().toISOString(),
      };

      if (holding_days !== undefined) {
        updateData.payout_holding_days = holding_days;
      }
      if (minimum_amount !== undefined) {
        updateData.payout_minimum_amount = minimum_amount;
      }

      const { error: updateError } = await supabase
        .from('bounty_campaigns')
        .update(updateData)
        .eq('id', entity_id);

      if (updateError) {
        console.error('Failed to update boost payout settings:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update settings' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log to history
      await supabase
        .from('payout_settings_history')
        .insert({
          entity_type: 'boost',
          entity_id,
          holding_days: holding_days ?? null,
          minimum_amount: minimum_amount ?? null,
          changed_by: user.id,
        });

      return new Response(JSON.stringify({
        success: true,
        message: 'Boost payout settings updated',
        settings: {
          holding_days: holding_days ?? undefined,
          minimum_amount: minimum_amount ?? undefined,
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: unknown) {
    console.error('Error updating payout settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
