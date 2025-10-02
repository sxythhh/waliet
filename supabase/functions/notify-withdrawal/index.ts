const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WithdrawalNotification {
  username: string;
  email: string;
  amount: number;
  payout_method: string;
  payout_details: any;
  balance_before: number;
  balance_after: number;
  date: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: WithdrawalNotification = await req.json();

    const webhookUrl = "https://discord.com/api/webhooks/1423279762419351635/Cf-R5aygv08jYdgSYInYFi9yJNy4s_aZtUAQkMmhW0ijc9Lo2zLAnCA6T1MdnDbqr4E9";

    // Format payout details based on method
    let payoutDetailsText = '';
    if (notification.payout_method === 'paypal') {
      payoutDetailsText = `**PayPal:** ${notification.payout_details.email || 'N/A'}`;
    } else if (notification.payout_method === 'crypto') {
      payoutDetailsText = `**Crypto:** ${notification.payout_details.network || 'N/A'}\n**Address:** ${notification.payout_details.address || 'N/A'}`;
    } else if (notification.payout_method === 'bank') {
      payoutDetailsText = `**Bank:** ${notification.payout_details.account_number || 'N/A'}`;
    } else if (notification.payout_method === 'wise') {
      payoutDetailsText = `**Wise:** ${notification.payout_details.email || 'N/A'}`;
    } else if (notification.payout_method === 'revolut') {
      payoutDetailsText = `**Revolut:** ${notification.payout_details.email || 'N/A'}`;
    } else if (notification.payout_method === 'tips') {
      payoutDetailsText = `**TIPS:** ${notification.payout_details.username || 'N/A'}`;
    } else {
      payoutDetailsText = `**Method:** ${notification.payout_method}`;
    }

    const embed = {
      content: "",
      tts: false,
      embeds: [
        {
          title: "💸 New Withdrawal Request",
          description: `A user has requested a withdrawal from their Virality wallet.`,
          color: 5793266,
          fields: [
            {
              name: "👤 User",
              value: `${notification.username} (${notification.email})`,
              inline: false
            },
            {
              name: "💰 Amount",
              value: `$${notification.amount.toFixed(2)}`,
              inline: true
            },
            {
              name: "💳 Payout Method",
              value: notification.payout_method.toUpperCase(),
              inline: true
            },
            {
              name: "📅 Date",
              value: new Date(notification.date).toLocaleString(),
              inline: true
            },
            {
              name: "💵 Balance Before",
              value: `$${notification.balance_before.toFixed(2)}`,
              inline: true
            },
            {
              name: "💵 Balance After",
              value: `$${notification.balance_after.toFixed(2)}`,
              inline: true
            },
            {
              name: "📋 Payout Details",
              value: payoutDetailsText,
              inline: false
            }
          ],
          timestamp: new Date(notification.date).toISOString()
        }
      ],
      components: [],
      actions: {},
      flags: 0
    };

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embed),
    });

    if (!webhookResponse.ok) {
      console.error('Discord webhook error:', await webhookResponse.text());
      throw new Error('Failed to send Discord notification');
    }

    console.log('Discord notification sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
