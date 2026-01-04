import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_PENALTY = 10;
const AMOUNT_MULTIPLIER = 0.01; // 1 point per $100
const BAN_THRESHOLD = 3; // Ban after 3 confirmed frauds

interface FraudPenaltyRequest {
  creatorId: string;
  fraudAmount: number;
  fraudFlagId?: string;
  clawbackLedgerId?: string;
  fraudType: string;
  adminId?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
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

    // Verify admin role using user_roles table
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: FraudPenaltyRequest = await req.json();
    const {
      creatorId,
      fraudAmount,
      fraudFlagId,
      clawbackLedgerId,
      fraudType,
      deviceFingerprint,
      ipAddress,
    } = body;

    console.log('Applying fraud penalty', { creatorId, fraudAmount, fraudType });

    // Calculate trust penalty
    const trustPenalty = Math.floor(BASE_PENALTY + (fraudAmount * AMOUNT_MULTIPLIER));

    // Fetch current creator stats
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('trust_score, fraud_flag_count, fraud_flag_permanent')
      .eq('id', creatorId)
      .single();

    if (creatorError) {
      console.error('Failed to fetch creator:', creatorError);
      throw new Error('Creator not found');
    }

    const currentTrustScore = creator.trust_score || 100;
    const newTrustScore = Math.max(0, currentTrustScore - trustPenalty);
    const newFraudCount = (creator.fraud_flag_count || 0) + 1;
    const shouldBan = newFraudCount >= BAN_THRESHOLD;

    // Update creator profile
    const profileUpdate: any = {
      trust_score: newTrustScore,
      fraud_flag_count: newFraudCount,
      fraud_flag_permanent: true,
      last_fraud_at: new Date().toISOString(),
    };

    if (shouldBan) {
      profileUpdate.banned_at = new Date().toISOString();
      profileUpdate.ban_reason = `Banned for ${newFraudCount} confirmed fraud incidents`;
    }

    await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', creatorId);

    // Record in fraud history
    await supabase
      .from('creator_fraud_history')
      .insert({
        creator_id: creatorId,
        fraud_flag_id: fraudFlagId,
        fraud_type: fraudType,
        fraud_amount: fraudAmount,
        trust_penalty: trustPenalty,
        clawback_ledger_id: clawbackLedgerId,
        details: {
          previous_trust_score: currentTrustScore,
          new_trust_score: newTrustScore,
          previous_fraud_count: creator.fraud_flag_count || 0,
          new_fraud_count: newFraudCount,
          banned: shouldBan,
        },
      });

    // Update fraud flag to confirmed if provided
    if (fraudFlagId) {
      await supabase
        .from('fraud_flags')
        .update({
          status: 'confirmed',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', fraudFlagId);
    }

    // Ban device if fingerprint provided and creator is being banned
    if (shouldBan && deviceFingerprint) {
      await supabase
        .from('banned_devices')
        .upsert({
          fingerprint_id: deviceFingerprint,
          ip_address: ipAddress || null,
          creator_id: creatorId,
          ban_reason: `Linked to banned creator with ${newFraudCount} fraud incidents`,
        }, {
          onConflict: 'fingerprint_id',
        });
    }

    // Send Discord alert
    try {
      await sendFraudConfirmedAlert({
        creatorId,
        fraudAmount,
        fraudType,
        trustPenalty,
        newTrustScore,
        newFraudCount,
        banned: shouldBan,
      });
    } catch (e) {
      console.error('Failed to send Discord alert:', e);
    }

    console.log('Fraud penalty applied', {
      creatorId,
      trustPenalty,
      newTrustScore,
      newFraudCount,
      banned: shouldBan,
    });

    return new Response(JSON.stringify({
      success: true,
      penalty: {
        trustPenalty,
        previousTrustScore: currentTrustScore,
        newTrustScore,
        previousFraudCount: creator.fraud_flag_count || 0,
        newFraudCount,
        banned: shouldBan,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error applying fraud penalty:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendFraudConfirmedAlert(data: {
  creatorId: string;
  fraudAmount: number;
  fraudType: string;
  trustPenalty: number;
  newTrustScore: number;
  newFraudCount: number;
  banned: boolean;
}) {
  const webhookUrl = Deno.env.get('DISCORD_FRAUD_WEBHOOK_URL');
  if (!webhookUrl) return;

  const embed = {
    title: data.banned ? '🚫 Creator Banned - Fraud Confirmed' : '⚠️ Fraud Confirmed',
    color: data.banned ? 0xFF0000 : 0xFFA500,
    fields: [
      { name: 'Creator ID', value: data.creatorId.slice(0, 8), inline: true },
      { name: 'Fraud Type', value: data.fraudType, inline: true },
      { name: 'Amount', value: `$${data.fraudAmount.toFixed(2)}`, inline: true },
      { name: 'Trust Penalty', value: `-${data.trustPenalty} pts`, inline: true },
      { name: 'New Trust Score', value: `${data.newTrustScore}`, inline: true },
      { name: 'Total Frauds', value: `${data.newFraudCount}`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };

  if (data.banned) {
    embed.fields.push({ name: '🚫 Status', value: 'ACCOUNT BANNED', inline: false });
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
