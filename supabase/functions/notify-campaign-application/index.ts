const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CampaignApplicationNotification {
  username: string;
  email: string;
  campaign_name: string;
  campaign_slug: string;
  brand_name: string;
  brand_slug: string;
  brand_logo_url: string;
  social_accounts: Array<{
    platform: string;
    username: string;
    account_link: string;
  }>;
  application_answers: Array<{
    question: string;
    answer: string;
  }>;
  submitted_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: CampaignApplicationNotification = await req.json();

    const webhookUrl = 'https://discord.com/api/webhooks/1424693920436060281/riU2duk3CDy0Y582nmgnlNY12-9TOjJXXLbmCt1yLOpbPfa7kjZ9ynUql7ewvcPG3GBZ';
    
    if (!webhookUrl) {
      console.error('Discord webhook URL not configured');
      throw new Error('Webhook URL not configured');
    }

    // Build accounts field value
    const accountsValue = notification.social_accounts
      .map(acc => `**${acc.platform.toUpperCase()}**: [@${acc.username}](${acc.account_link})`)
      .join('\n');

    // Build application answers field
    const answersValue = notification.application_answers.length > 0
      ? notification.application_answers
          .map(qa => `**Q: ${qa.question}**\n${qa.answer}`)
          .join('\n\n')
      : 'No application questions';

    // Build brand management URL
    const brandManagementUrl = `https://virality.gg/brand/${notification.brand_slug}/management`;

    const embed = {
      content: "",
      tts: false,
      embeds: [
        {
          title: "📝 New Campaign Application",
          description: `**${notification.username}** (${notification.email}) applied to **${notification.campaign_name}**`,
          color: 5793266, // Purple color
          fields: [
            {
              name: "👤 Creator Details",
              value: `**Username**: ${notification.username}\n**Email**: ${notification.email}`,
              inline: false
            },
            {
              name: "📱 Accounts",
              value: accountsValue,
              inline: false
            },
            {
              name: "💬 Application Answers",
              value: answersValue,
              inline: false
            },
            {
              name: "🔗 Management",
              value: `[View in Brand Dashboard](${brandManagementUrl})`,
              inline: false
            },
            {
              name: "📅 Submitted",
              value: new Date(notification.submitted_at).toLocaleString(),
              inline: true
            }
          ],
          footer: {
            icon_url: notification.brand_logo_url,
            text: `${notification.campaign_name} | ${notification.brand_name}`
          },
          timestamp: new Date(notification.submitted_at).toISOString()
        }
      ],
      components: [],
      actions: {},
      flags: 0,
      avatar_url: notification.brand_logo_url
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
