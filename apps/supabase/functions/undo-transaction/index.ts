import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UndoRequest {
  transaction_id: string;
  reason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header to verify the user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user token to check admin status
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      console.error('User is not admin:', user.id);
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transaction_id, reason }: UndoRequest = await req.json();

    if (!transaction_id) {
      return new Response(JSON.stringify({ error: 'transaction_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Undoing transaction: ${transaction_id} by admin: ${user.id}`);

    // Fetch the original transaction
    const { data: originalTx, error: fetchError } = await adminClient
      .from('wallet_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (fetchError || !originalTx) {
      console.error('Transaction not found:', fetchError);
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Original transaction:', originalTx);

    const reversalAmount = -originalTx.amount;
    const undoActions: string[] = [];

    // Get current wallet and update with the reversal
    const { data: currentWallet } = await adminClient
      .from('wallets')
      .select('balance, total_earned, total_withdrawn')
      .eq('user_id', originalTx.user_id)
      .single();

    if (currentWallet) {
      const updates: any = {
        balance: (currentWallet.balance || 0) + reversalAmount,
      };

      // If the original was an earning, also reverse total_earned
      if (originalTx.type === 'earning' && originalTx.amount > 0) {
        updates.total_earned = Math.max(0, (currentWallet.total_earned || 0) - originalTx.amount);
        undoActions.push(`Reversed total_earned by $${originalTx.amount.toFixed(2)}`);
      }

      // If it was a withdrawal, reverse total_withdrawn
      if (originalTx.type === 'withdrawal' && originalTx.amount < 0) {
        updates.total_withdrawn = Math.max(0, (currentWallet.total_withdrawn || 0) - Math.abs(originalTx.amount));
        undoActions.push(`Reversed total_withdrawn by $${Math.abs(originalTx.amount).toFixed(2)}`);
      }

      const { error: updateWalletError } = await adminClient
        .from('wallets')
        .update(updates)
        .eq('user_id', originalTx.user_id);

      if (updateWalletError) {
        console.error('Failed to update wallet:', updateWalletError);
        throw new Error('Failed to update wallet balance');
      }
      undoActions.push(`Updated wallet balance by $${reversalAmount.toFixed(2)}`);
    }

    // 2. Handle campaign budget reversal if this was a campaign payout
    const metadata = originalTx.metadata as any;
    if (metadata?.campaign_id && originalTx.type === 'earning') {
      const campaignId = metadata.campaign_id;

      // Atomically decrement the budget_used to prevent race conditions
      const { data: newBudgetUsed, error: campaignError } = await adminClient
        .rpc('decrement_campaign_budget_used', {
          p_campaign_id: campaignId,
          p_amount: originalTx.amount,
        });

      if (campaignError) {
        console.error('Failed to update campaign budget:', campaignError);
      } else {
        undoActions.push(`Reversed campaign budget_used to $${newBudgetUsed?.toFixed(2)}`);
      }

      // Also check if this was an account-based payout and update campaign_account_analytics
      if (metadata?.social_account_id) {
        const { data: accountAnalytics } = await adminClient
          .from('campaign_account_analytics')
          .select('paid_views, last_payment_amount, last_payment_date')
          .eq('campaign_id', campaignId)
          .eq('shortimize_account_id', metadata.shortimize_account_id || '')
          .maybeSingle();

        if (accountAnalytics) {
          // Reverse the paid_views if we know how many were paid
          const viewsPaid = metadata?.views_paid || 0;
          const newPaidViews = Math.max(0, (accountAnalytics.paid_views || 0) - viewsPaid);
          
          await adminClient
            .from('campaign_account_analytics')
            .update({ 
              paid_views: newPaidViews,
              last_payment_amount: null,
              last_payment_date: null 
            })
            .eq('campaign_id', campaignId)
            .eq('shortimize_account_id', metadata.shortimize_account_id || '');

          undoActions.push(`Reversed account paid_views: ${accountAnalytics.paid_views} → ${newPaidViews}`);
        }
      }

      // Check for campaign_cpm_payouts record and delete it
      if (metadata?.cpm_payout_id) {
        const { error: cpmPayoutError } = await adminClient
          .from('campaign_cpm_payouts')
          .delete()
          .eq('id', metadata.cpm_payout_id);

        if (!cpmPayoutError) {
          undoActions.push('Deleted campaign_cpm_payouts record');
        }
      }
    }

    // 3. Handle boost/bounty campaign budget reversal
    if (metadata?.boost_id && originalTx.type === 'earning') {
      const boostId = metadata.boost_id;

      // Atomically decrement the budget_used to prevent race conditions
      const { data: newBoostBudgetUsed, error: boostError } = await adminClient
        .rpc('decrement_boost_budget_used', {
          p_boost_id: boostId,
          p_amount: originalTx.amount,
        });

      if (boostError) {
        console.error('Failed to update boost budget:', boostError);
      } else {
        undoActions.push(`Reversed boost budget_used to $${newBoostBudgetUsed?.toFixed(2)}`);
      }
    }

    // 4. Handle referral earnings reversal
    if (originalTx.type === 'referral') {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('referral_earnings')
        .eq('id', originalTx.user_id)
        .single();

      if (profile) {
        const newReferralEarnings = Math.max(0, (profile.referral_earnings || 0) - originalTx.amount);
        
        await adminClient
          .from('profiles')
          .update({ referral_earnings: newReferralEarnings })
          .eq('id', originalTx.user_id);

        undoActions.push(`Reversed referral_earnings: $${profile.referral_earnings?.toFixed(2)} → $${newReferralEarnings.toFixed(2)}`);
      }

      // Also reverse the referral record if applicable
      if (metadata?.referral_id) {
        const { data: referral } = await adminClient
          .from('referrals')
          .select('reward_earned')
          .eq('id', metadata.referral_id)
          .single();

        if (referral) {
          const newRewardEarned = Math.max(0, (referral.reward_earned || 0) - originalTx.amount);
          
          await adminClient
            .from('referrals')
            .update({ reward_earned: newRewardEarned })
            .eq('id', metadata.referral_id);

          undoActions.push(`Reversed referral reward_earned`);
        }
      }
    }

    // 5. Handle team commission reversal
    if (metadata?.source_type === 'team_commission' && metadata?.team_id) {
      // Delete the team_earnings record if it exists
      const { error: teamEarningsError } = await adminClient
        .from('team_earnings')
        .delete()
        .eq('source_transaction_id', transaction_id);

      if (!teamEarningsError) {
        undoActions.push('Deleted team_earnings record');
      }
    }

    // 6. Create the reversal transaction
    const { data: reversalTx, error: reversalError } = await adminClient
      .from('wallet_transactions')
      .insert({
        user_id: originalTx.user_id,
        amount: reversalAmount,
        type: 'balance_correction',
        status: 'completed',
        description: `Reversal of transaction ${transaction_id}${reason ? `: ${reason}` : ''}`,
        metadata: {
          original_transaction_id: transaction_id,
          original_type: originalTx.type,
          original_amount: originalTx.amount,
          original_metadata: metadata,
          reversal_reason: reason || 'Admin reversal',
          reversed_by: user.id,
          undo_actions: undoActions,
        },
      })
      .select()
      .single();

    if (reversalError) {
      console.error('Failed to create reversal transaction:', reversalError);
      throw new Error('Failed to create reversal transaction');
    }

    // 7. Mark the original transaction as reversed
    await adminClient
      .from('wallet_transactions')
      .update({
        metadata: {
          ...metadata,
          reversed: true,
          reversed_at: new Date().toISOString(),
          reversed_by: user.id,
          reversal_transaction_id: reversalTx.id,
        },
      })
      .eq('id', transaction_id);

    console.log('Transaction undone successfully:', {
      original_id: transaction_id,
      reversal_id: reversalTx.id,
      actions: undoActions,
    });

    return new Response(JSON.stringify({
      success: true,
      reversal_transaction_id: reversalTx.id,
      actions_taken: undoActions,
      message: `Successfully reversed transaction. ${undoActions.length} actions taken.`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error undoing transaction:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
