import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdjustmentRequest {
  campaign_id: string;
  adjustment_amount: number; // positive to increase, negative to decrease
  reason: string;
  adjustment_type: 'increase' | 'decrease' | 'set'; // set = set to exact value
  new_budget_used?: number; // only used when adjustment_type is 'set'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: AdjustmentRequest = await req.json();
    const { campaign_id, adjustment_amount, reason, adjustment_type, new_budget_used } = body;

    // Validate required fields
    if (!campaign_id || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: campaign_id, reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (adjustment_type === 'set' && new_budget_used === undefined) {
      return new Response(
        JSON.stringify({ error: 'new_budget_used is required when adjustment_type is "set"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (adjustment_type !== 'set' && (adjustment_amount === undefined || adjustment_amount === 0)) {
      return new Response(
        JSON.stringify({ error: 'adjustment_amount is required and must be non-zero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, budget, budget_used, brand_id, brand_name')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentBudgetUsed = parseFloat(campaign.budget_used?.toString() || '0');
    let newBudgetUsedValue: number;
    let actualAdjustment: number;

    if (adjustment_type === 'set') {
      newBudgetUsedValue = new_budget_used!;
      actualAdjustment = newBudgetUsedValue - currentBudgetUsed;
    } else if (adjustment_type === 'increase') {
      actualAdjustment = Math.abs(adjustment_amount);
      newBudgetUsedValue = currentBudgetUsed + actualAdjustment;
    } else {
      actualAdjustment = -Math.abs(adjustment_amount);
      newBudgetUsedValue = Math.max(0, currentBudgetUsed + actualAdjustment);
    }

    // Ensure budget_used doesn't go negative
    if (newBudgetUsedValue < 0) {
      newBudgetUsedValue = 0;
      actualAdjustment = -currentBudgetUsed;
    }

    // Create transaction record for audit trail
    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id, // Admin user who made the adjustment
        amount: actualAdjustment,
        type: 'balance_correction',
        status: 'completed',
        description: `Campaign budget adjustment: ${reason}`,
        metadata: {
          adjustment_type: 'campaign_budget',
          campaign_id,
          campaign_title: campaign.title,
          brand_name: campaign.brand_name,
          budget_before: currentBudgetUsed,
          budget_after: newBudgetUsedValue,
          total_budget: parseFloat(campaign.budget.toString()),
          reason,
          adjusted_by: user.id,
        },
        created_by: user.id,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw new Error('Failed to create transaction record');
    }

    // Update campaign budget_used
    const { error: campaignUpdateError } = await supabase
      .from('campaigns')
      .update({
        budget_used: newBudgetUsedValue,
      })
      .eq('id', campaign_id);

    if (campaignUpdateError) {
      console.error('Campaign update error:', campaignUpdateError);
      throw new Error('Failed to update campaign budget');
    }

    // Log to audit trail
    await supabase
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        action: 'CAMPAIGN_BUDGET_ADJUSTMENT',
        table_name: 'campaigns',
        record_id: campaign_id,
        old_data: {
          budget_used: currentBudgetUsed,
        },
        new_data: {
          budget_used: newBudgetUsedValue,
          adjustment: actualAdjustment,
          reason,
          transaction_id: transaction.id,
        },
      });

    console.log(`Campaign budget adjusted: ${campaign.title} - ${currentBudgetUsed} -> ${newBudgetUsedValue} (${actualAdjustment > 0 ? '+' : ''}${actualAdjustment}) by admin ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        adjustment: {
          campaign_id,
          campaign_title: campaign.title,
          budget_before: currentBudgetUsed,
          budget_after: newBudgetUsedValue,
          adjustment_amount: actualAdjustment,
          total_budget: parseFloat(campaign.budget.toString()),
          transaction_id: transaction.id,
          reason,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error adjusting campaign budget:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
