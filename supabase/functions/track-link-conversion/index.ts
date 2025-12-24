import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversionRequest {
  shortCode?: string;
  linkId?: string;
  conversionType?: string;
  value?: number;
  orderId?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ConversionRequest = await req.json();
    const { shortCode, linkId, conversionType = 'sale', value = 0, orderId, metadata } = body;

    if (!shortCode && !linkId) {
      return new Response(
        JSON.stringify({ error: 'shortCode or linkId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the link
    let link;
    if (linkId) {
      const { data, error } = await supabase
        .from('campaign_links')
        .select('*')
        .eq('id', linkId)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Link not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      link = data;
    } else {
      const { data, error } = await supabase
        .from('campaign_links')
        .select('*')
        .eq('short_code', shortCode)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Link not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      link = data;
    }

    // Check for duplicate conversion (same order_id)
    if (orderId) {
      const { data: existingConversion } = await supabase
        .from('link_conversions')
        .select('id')
        .eq('link_id', link.id)
        .eq('order_id', orderId)
        .single();

      if (existingConversion) {
        return new Response(
          JSON.stringify({ error: 'Conversion already recorded for this order' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Record the conversion
    const { data: conversion, error: conversionError } = await supabase
      .from('link_conversions')
      .insert({
        link_id: link.id,
        conversion_type: conversionType,
        value,
        order_id: orderId,
        metadata,
      })
      .select()
      .single();

    if (conversionError) {
      console.error('Error recording conversion:', conversionError);
      return new Response(
        JSON.stringify({ error: 'Failed to record conversion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update conversion counts on the link
    const { error: updateError } = await supabase
      .from('campaign_links')
      .update({
        total_conversions: link.total_conversions + 1,
        conversion_value: parseFloat(link.conversion_value) + value,
      })
      .eq('id', link.id);

    if (updateError) {
      console.error('Error updating conversion counts:', updateError);
    }

    console.log('Conversion tracked:', { 
      linkId: link.id, 
      conversionType, 
      value, 
      orderId 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversion: {
          id: conversion.id,
          linkId: link.id,
          shortCode: link.short_code,
          conversionType,
          value,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-link-conversion:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
