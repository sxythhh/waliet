import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret for security
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('VIRALITY_API_KEY');
    
    if (!webhookSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid or missing webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log('Received webhook payload:', JSON.stringify(body, null, 2));

    // Validate required fields
    const { title, brand_name, budget, rpm_rate, slug } = body;
    
    if (!title || !brand_name || budget === undefined || rpm_rate === undefined || !slug) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['title', 'brand_name', 'budget', 'rpm_rate', 'slug']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare campaign data
    const campaignData = {
      title,
      brand_name,
      budget: Number(budget),
      rpm_rate: Number(rpm_rate),
      slug,
      description: body.description || null,
      brand_logo_url: body.brand_logo_url || null,
      banner_url: body.banner_url || null,
      guidelines: body.guidelines || null,
      allowed_platforms: body.allowed_platforms || ['tiktok', 'instagram'],
      status: body.status || 'active',
      start_date: body.start_date || new Date().toISOString(),
      end_date: body.end_date || null,
      is_private: body.is_private || false,
      requires_application: body.requires_application ?? true,
      is_infinite_budget: body.is_infinite_budget || false,
      is_featured: body.is_featured || false,
      brand_id: body.brand_id || null,
      embed_url: body.embed_url || null,
      preview_url: body.preview_url || null,
      access_code: body.access_code || null,
      campaign_type: body.campaign_type || null,
      category: body.category || null,
      discord_guild_id: body.discord_guild_id || null,
      application_questions: body.application_questions || [],
    };

    console.log('Creating campaign with data:', JSON.stringify(campaignData, null, 2));

    // Insert the campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert(campaignData)
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create campaign', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Campaign created successfully:', campaign.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaign created successfully',
        campaign 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
