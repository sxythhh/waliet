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
    const brandManagementUrl = `https://viralitymarketplace.lovable.app/brand/${notification.brand_slug}/management`;

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
            icon_url: "https://media.discordapp.net/attachments/1391444835545649345/1420268993817870437/Untitled_design_30.png?ex=68e49a13&is=68e34893&hm=899e73daa7cdae0eecae6bbd3cb482b3ff24b3d7e522ae41cca3e4658140b085&=&format=webp&quality=lossless&width=1000&height=1000",
            text: `${notification.campaign_name} | ${notification.brand_name}`
          },
          timestamp: new Date(notification.submitted_at).toISOString()
        }
      ],
      components: [],
      actions: {},
      flags: 0,
      avatar_url: "https://media.discordapp.net/attachments/1394602748816658432/1424694312846757971/5q8mfJos_400x400_1.jpg?ex=68e4e179&is=68e38ff9&hm=f71ac885068a2e1fb4772fa2a64b8cce095633b559cad417b258d56942153819&=&format=webp&width=800&height=800"
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
