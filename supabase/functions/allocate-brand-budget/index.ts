import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { brand_id, campaign_id, boost_id, amount } = await req.json();

    if (!brand_id || !amount) {
      return new Response(JSON.stringify({ error: 'brand_id and amount are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!campaign_id && !boost_id) {
      return new Response(JSON.stringify({ error: 'Either campaign_id or boost_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (amount <= 0) {
      return new Response(JSON.stringify({ error: 'Amount must be greater than 0' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin of this brand
    const { data: memberData, error: memberError } = await supabase
      .from('brand_members')
      .select('role')
      .eq('brand_id', brand_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData || !['owner', 'admin'].includes(memberData.role)) {
      return new Response(JSON.stringify({ error: 'Not authorized for this brand' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get brand wallet balance
    const { data: brandWallet, error: walletError } = await supabase
      .from('brand_wallets')
      .select('id, balance')
      .eq('brand_id', brand_id)
      .single();

    if (walletError || !brandWallet) {
      return new Response(JSON.stringify({ error: 'Brand wallet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const walletBalance = brandWallet.balance || 0;
    console.log(`Brand ${brand_id} wallet balance: $${walletBalance}`);

    if (walletBalance < amount) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient brand wallet balance',
        current_balance: walletBalance,
        requested_amount: amount
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Allocate budget to campaign or boost
    if (campaign_id) {
      // Verify campaign belongs to this brand
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, brand_id, budget, title')
        .eq('id', campaign_id)
        .single();

      if (campaignError || !campaign || campaign.brand_id !== brand_id) {
        return new Response(JSON.stringify({ error: 'Campaign not found or does not belong to this brand' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update campaign budget
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ budget: (campaign.budget || 0) + amount })
        .eq('id', campaign_id);

      if (updateError) {
        console.error('Error updating campaign budget:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update campaign budget' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Deduct from brand wallet
      const { error: walletUpdateError } = await supabase
        .from('brand_wallets')
        .update({ balance: walletBalance - amount })
        .eq('brand_id', brand_id);

      if (walletUpdateError) {
        console.error('Error updating brand wallet:', walletUpdateError);
        // Rollback campaign budget update
        await supabase
          .from('campaigns')
          .update({ budget: campaign.budget || 0 })
          .eq('id', campaign_id);
        return new Response(JSON.stringify({ error: 'Failed to update brand wallet' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log transaction in brand_wallet_transactions
      await supabase
        .from('brand_wallet_transactions')
        .insert({
          brand_id: brand_id,
          campaign_id: campaign_id,
          type: 'campaign_funding',
          amount: -amount,
          description: `Funded campaign: ${campaign.title}`,
          created_by: user.id
        });

      console.log(`Brand ${brand_id} funded campaign ${campaign_id} with $${amount}`);

    } else if (boost_id) {
      // Verify boost belongs to this brand
      const { data: boost, error: boostError } = await supabase
        .from('bounty_campaigns')
        .select('id, brand_id, budget, title')
        .eq('id', boost_id)
        .single();

      if (boostError || !boost || boost.brand_id !== brand_id) {
        return new Response(JSON.stringify({ error: 'Boost not found or does not belong to this brand' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update boost budget
      const { error: updateError } = await supabase
        .from('bounty_campaigns')
        .update({ budget: (boost.budget || 0) + amount })
        .eq('id', boost_id);

      if (updateError) {
        console.error('Error updating boost budget:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update boost budget' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Deduct from brand wallet
      const { error: walletUpdateError } = await supabase
        .from('brand_wallets')
        .update({ balance: walletBalance - amount })
        .eq('brand_id', brand_id);

      if (walletUpdateError) {
        console.error('Error updating brand wallet:', walletUpdateError);
        // Rollback boost budget update
        await supabase
          .from('bounty_campaigns')
          .update({ budget: boost.budget || 0 })
          .eq('id', boost_id);
        return new Response(JSON.stringify({ error: 'Failed to update brand wallet' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log transaction in brand_wallet_transactions
      await supabase
        .from('brand_wallet_transactions')
        .insert({
          brand_id: brand_id,
          boost_id: boost_id,
          type: 'boost_funding',
          amount: -amount,
          description: `Funded boost: ${boost.title}`,
          created_by: user.id
        });

      console.log(`Brand ${brand_id} funded boost ${boost_id} with $${amount}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      allocated_amount: amount,
      remaining_balance: walletBalance - amount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in allocate-brand-budget:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
