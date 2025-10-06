const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DemographicSubmissionNotification {
  username: string;
  email: string;
  platform: string;
  social_account_username: string;
  video_url: string;
  submitted_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: DemographicSubmissionNotification = await req.json();

    const webhookUrl = 'https://discord.com/api/webhooks/1424687897663242301/M8G4DRyvS1N-6ElAZT4-10VufFG_Tn1LsB4FeLaKObnlDLNe8zUtJVuLXdoO2tKkjD6h';
    
    if (!webhookUrl) {
      console.error('Discord webhook URL not configured');
      throw new Error('Webhook URL not configured');
    }

    const embed = {
      content: notification.video_url ? `📹 **Demographics Video:** ${notification.video_url}` : "",
      tts: false,
      embeds: [
        {
          title: "📊 New Demographics Submission",
          description: `A user has submitted demographics for review.`,
          color: 3447003, // Blue color
          fields: [
            {
              name: "👤 User",
              value: `${notification.username} (${notification.email})`,
              inline: false
            },
            {
              name: "📱 Platform",
              value: notification.platform.toUpperCase(),
              inline: true
            },
            {
              name: "👥 Account",
              value: `@${notification.social_account_username}`,
              inline: true
            },
            {
              name: "📅 Submitted",
              value: new Date(notification.submitted_at).toLocaleString(),
              inline: true
            }
          ],
          timestamp: new Date(notification.submitted_at).toISOString()
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
