import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface MilestoneConfig {
  id: string;
  brand_id: string;
  campaign_id: string | null;
  boost_id: string | null;
  milestone_type: 'views' | 'earnings' | 'submissions';
  threshold: number;
  message_template: string;
  is_active: boolean;
}

interface CreatorProgress {
  user_id: string;
  campaign_id?: string;
  boost_id?: string;
  total_views?: number;
  total_earnings?: number;
  total_submissions?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: filter by brand_id
    let brandFilter: string | null = null;
    try {
      const body = await req.json();
      brandFilter = body.brand_id || null;
    } catch {
      // No body provided, process all brands
    }

    console.log('Processing milestones for:', brandFilter || 'all brands');

    // Fetch all active milestone configs
    let configQuery = supabase
      .from('milestone_configs')
      .select('*')
      .eq('is_active', true);

    if (brandFilter) {
      configQuery = configQuery.eq('brand_id', brandFilter);
    }

    const { data: configs, error: configError } = await configQuery;

    if (configError) {
      console.error('Error fetching milestone configs:', configError);
      throw configError;
    }

    if (!configs || configs.length === 0) {
      console.log('No active milestone configs found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active milestone configs', achievements: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalAchievements = 0;
    const achievementDetails: any[] = [];

    // Group configs by type for efficient querying
    const viewConfigs = configs.filter((c: MilestoneConfig) => c.milestone_type === 'views');
    const earningsConfigs = configs.filter((c: MilestoneConfig) => c.milestone_type === 'earnings');
    const submissionsConfigs = configs.filter((c: MilestoneConfig) => c.milestone_type === 'submissions');

    // Process VIEW milestones
    if (viewConfigs.length > 0) {
      console.log(`Processing ${viewConfigs.length} view milestones`);

      // Get aggregated views per creator per campaign/boost
      const { data: viewProgress } = await supabase
        .from('video_submissions')
        .select('creator_id, source_type, source_id, video_views')
        .in('status', ['approved', 'paid']);

      if (viewProgress) {
        // Aggregate views by creator and source
        const creatorViews = new Map<string, number>();
        const creatorCampaignViews = new Map<string, Map<string, number>>();
        const creatorBoostViews = new Map<string, Map<string, number>>();

        for (const sub of viewProgress) {
          if (!sub.creator_id) continue;
          const views = sub.video_views || 0;

          // Global views
          creatorViews.set(sub.creator_id, (creatorViews.get(sub.creator_id) || 0) + views);

          // Campaign-specific views
          if (sub.source_type === 'campaign' && sub.source_id) {
            if (!creatorCampaignViews.has(sub.creator_id)) {
              creatorCampaignViews.set(sub.creator_id, new Map());
            }
            const campaignMap = creatorCampaignViews.get(sub.creator_id)!;
            campaignMap.set(sub.source_id, (campaignMap.get(sub.source_id) || 0) + views);
          }

          // Boost-specific views
          if (sub.source_type === 'boost' && sub.source_id) {
            if (!creatorBoostViews.has(sub.creator_id)) {
              creatorBoostViews.set(sub.creator_id, new Map());
            }
            const boostMap = creatorBoostViews.get(sub.creator_id)!;
            boostMap.set(sub.source_id, (boostMap.get(sub.source_id) || 0) + views);
          }
        }

        // Check each config
        for (const config of viewConfigs as MilestoneConfig[]) {
          const creatorsToCheck: Array<{ user_id: string; views: number; campaign_id?: string; boost_id?: string }> = [];

          if (config.campaign_id) {
            // Campaign-specific milestone
            for (const [creatorId, campaignMap] of creatorCampaignViews) {
              const views = campaignMap.get(config.campaign_id) || 0;
              if (views >= config.threshold) {
                creatorsToCheck.push({ user_id: creatorId, views, campaign_id: config.campaign_id });
              }
            }
          } else if (config.boost_id) {
            // Boost-specific milestone
            for (const [creatorId, boostMap] of creatorBoostViews) {
              const views = boostMap.get(config.boost_id) || 0;
              if (views >= config.threshold) {
                creatorsToCheck.push({ user_id: creatorId, views, boost_id: config.boost_id });
              }
            }
          } else {
            // Global milestone (brand-wide)
            for (const [creatorId, views] of creatorViews) {
              if (views >= config.threshold) {
                creatorsToCheck.push({ user_id: creatorId, views });
              }
            }
          }

          // Check for existing achievements and insert new ones
          for (const creator of creatorsToCheck) {
            const result = await checkAndInsertAchievement(supabase, config, creator);
            if (result) {
              totalAchievements++;
              achievementDetails.push(result);
            }
          }
        }
      }
    }

    // Process EARNINGS milestones
    if (earningsConfigs.length > 0) {
      console.log(`Processing ${earningsConfigs.length} earnings milestones`);

      // Get earnings from wallet_transactions
      const { data: earningsData } = await supabase
        .from('wallet_transactions')
        .select('user_id, amount, campaign_id, boost_id')
        .eq('type', 'credit')
        .gt('amount', 0);

      if (earningsData) {
        // Aggregate earnings by creator
        const creatorEarnings = new Map<string, number>();
        const creatorCampaignEarnings = new Map<string, Map<string, number>>();
        const creatorBoostEarnings = new Map<string, Map<string, number>>();

        for (const tx of earningsData) {
          if (!tx.user_id) continue;
          const amount = tx.amount || 0;

          // Global earnings
          creatorEarnings.set(tx.user_id, (creatorEarnings.get(tx.user_id) || 0) + amount);

          // Campaign-specific earnings
          if (tx.campaign_id) {
            if (!creatorCampaignEarnings.has(tx.user_id)) {
              creatorCampaignEarnings.set(tx.user_id, new Map());
            }
            const campaignMap = creatorCampaignEarnings.get(tx.user_id)!;
            campaignMap.set(tx.campaign_id, (campaignMap.get(tx.campaign_id) || 0) + amount);
          }

          // Boost-specific earnings
          if (tx.boost_id) {
            if (!creatorBoostEarnings.has(tx.user_id)) {
              creatorBoostEarnings.set(tx.user_id, new Map());
            }
            const boostMap = creatorBoostEarnings.get(tx.user_id)!;
            boostMap.set(tx.boost_id, (boostMap.get(tx.boost_id) || 0) + amount);
          }
        }

        // Check each config
        for (const config of earningsConfigs as MilestoneConfig[]) {
          const creatorsToCheck: Array<{ user_id: string; earnings: number; campaign_id?: string; boost_id?: string }> = [];

          if (config.campaign_id) {
            for (const [creatorId, campaignMap] of creatorCampaignEarnings) {
              const earnings = campaignMap.get(config.campaign_id) || 0;
              if (earnings >= config.threshold) {
                creatorsToCheck.push({ user_id: creatorId, earnings, campaign_id: config.campaign_id });
              }
            }
          } else if (config.boost_id) {
            for (const [creatorId, boostMap] of creatorBoostEarnings) {
              const earnings = boostMap.get(config.boost_id) || 0;
              if (earnings >= config.threshold) {
                creatorsToCheck.push({ user_id: creatorId, earnings, boost_id: config.boost_id });
              }
            }
          } else {
            for (const [creatorId, earnings] of creatorEarnings) {
              if (earnings >= config.threshold) {
                creatorsToCheck.push({ user_id: creatorId, earnings });
              }
            }
          }

          for (const creator of creatorsToCheck) {
            const result = await checkAndInsertAchievement(supabase, config, {
              user_id: creator.user_id,
              value: creator.earnings,
              campaign_id: creator.campaign_id,
              boost_id: creator.boost_id
            });
            if (result) {
              totalAchievements++;
              achievementDetails.push(result);
            }
          }
        }
      }
    }

    // Process SUBMISSIONS milestones
    if (submissionsConfigs.length > 0) {
      console.log(`Processing ${submissionsConfigs.length} submissions milestones`);

      // Count approved submissions per creator
      const { data: submissionCounts } = await supabase
        .from('video_submissions')
        .select('creator_id, source_type, source_id')
        .eq('status', 'approved');

      if (submissionCounts) {
        const creatorSubmissions = new Map<string, number>();
        const creatorCampaignSubmissions = new Map<string, Map<string, number>>();
        const creatorBoostSubmissions = new Map<string, Map<string, number>>();

        for (const sub of submissionCounts) {
          if (!sub.creator_id) continue;

          creatorSubmissions.set(sub.creator_id, (creatorSubmissions.get(sub.creator_id) || 0) + 1);

          if (sub.source_type === 'campaign' && sub.source_id) {
            if (!creatorCampaignSubmissions.has(sub.creator_id)) {
              creatorCampaignSubmissions.set(sub.creator_id, new Map());
            }
            const campaignMap = creatorCampaignSubmissions.get(sub.creator_id)!;
            campaignMap.set(sub.source_id, (campaignMap.get(sub.source_id) || 0) + 1);
          }

          if (sub.source_type === 'boost' && sub.source_id) {
            if (!creatorBoostSubmissions.has(sub.creator_id)) {
              creatorBoostSubmissions.set(sub.creator_id, new Map());
            }
            const boostMap = creatorBoostSubmissions.get(sub.creator_id)!;
            boostMap.set(sub.source_id, (boostMap.get(sub.source_id) || 0) + 1);
          }
        }

        for (const config of submissionsConfigs as MilestoneConfig[]) {
          const creatorsToCheck: Array<{ user_id: string; count: number; campaign_id?: string; boost_id?: string }> = [];

          if (config.campaign_id) {
            for (const [creatorId, campaignMap] of creatorCampaignSubmissions) {
              const count = campaignMap.get(config.campaign_id) || 0;
              if (count >= config.threshold) {
                creatorsToCheck.push({ user_id: creatorId, count, campaign_id: config.campaign_id });
              }
            }
          } else if (config.boost_id) {
            for (const [creatorId, boostMap] of creatorBoostSubmissions) {
              const count = boostMap.get(config.boost_id) || 0;
              if (count >= config.threshold) {
                creatorsToCheck.push({ user_id: creatorId, count, boost_id: config.boost_id });
              }
            }
          } else {
            for (const [creatorId, count] of creatorSubmissions) {
              if (count >= config.threshold) {
                creatorsToCheck.push({ user_id: creatorId, count });
              }
            }
          }

          for (const creator of creatorsToCheck) {
            const result = await checkAndInsertAchievement(supabase, config, {
              user_id: creator.user_id,
              value: creator.count,
              campaign_id: creator.campaign_id,
              boost_id: creator.boost_id
            });
            if (result) {
              totalAchievements++;
              achievementDetails.push(result);
            }
          }
        }
      }
    }

    // Send notifications for achievements where notification_sent = false
    const notificationsSent = await sendMilestoneNotifications(supabase);

    console.log(`Processed ${totalAchievements} new achievements, sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        achievements: totalAchievements,
        notifications_sent: notificationsSent,
        details: achievementDetails
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing milestones:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkAndInsertAchievement(
  supabase: any,
  config: MilestoneConfig,
  creator: { user_id: string; value?: number; views?: number; earnings?: number; campaign_id?: string; boost_id?: string }
): Promise<any | null> {
  const achievedValue = creator.value ?? creator.views ?? creator.earnings ?? 0;

  // Build the unique constraint check
  let existingQuery = supabase
    .from('milestone_achievements')
    .select('id')
    .eq('milestone_config_id', config.id)
    .eq('user_id', creator.user_id);

  if (creator.campaign_id) {
    existingQuery = existingQuery.eq('campaign_id', creator.campaign_id);
  } else if (creator.boost_id) {
    existingQuery = existingQuery.eq('boost_id', creator.boost_id);
  } else {
    existingQuery = existingQuery.is('campaign_id', null).is('boost_id', null);
  }

  const { data: existing } = await existingQuery.single();

  if (existing) {
    // Already achieved this milestone
    return null;
  }

  // Insert new achievement
  const insertData: any = {
    milestone_config_id: config.id,
    user_id: creator.user_id,
    achieved_value: achievedValue,
    notification_sent: false
  };

  if (creator.campaign_id) {
    insertData.campaign_id = creator.campaign_id;
  }
  if (creator.boost_id) {
    insertData.boost_id = creator.boost_id;
  }

  const { data: achievement, error } = await supabase
    .from('milestone_achievements')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error inserting achievement:', error);
    return null;
  }

  console.log(`New milestone achievement: user ${creator.user_id} reached ${config.milestone_type} threshold ${config.threshold}`);

  return {
    milestone_config_id: config.id,
    user_id: creator.user_id,
    milestone_type: config.milestone_type,
    threshold: config.threshold,
    achieved_value: achievedValue
  };
}

async function sendMilestoneNotifications(supabase: any): Promise<number> {
  // Fetch unsent notifications with config details
  const { data: pendingNotifications, error } = await supabase
    .from('milestone_achievements')
    .select(`
      id,
      user_id,
      achieved_value,
      milestone_config:milestone_configs(
        milestone_type,
        threshold,
        message_template,
        brand_id
      )
    `)
    .eq('notification_sent', false);

  if (error || !pendingNotifications || pendingNotifications.length === 0) {
    return 0;
  }

  let sentCount = 0;

  for (const notification of pendingNotifications) {
    const config = notification.milestone_config;
    if (!config) continue;

    try {
      // Get user's Discord info
      const { data: profile } = await supabase
        .from('profiles')
        .select('discord_id, username, full_name')
        .eq('id', notification.user_id)
        .single();

      if (profile?.discord_id) {
        // Format the message
        const creatorName = profile.full_name || profile.username || 'Creator';
        let message = config.message_template;

        // Replace placeholders
        message = message.replace('{name}', creatorName);
        message = message.replace('{threshold}', formatThreshold(config.threshold, config.milestone_type));
        message = message.replace('{value}', formatThreshold(notification.achieved_value, config.milestone_type));

        // Send Discord DM
        const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
        if (DISCORD_BOT_TOKEN) {
          // Create DM channel
          const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ recipient_id: profile.discord_id }),
          });

          if (dmChannelResponse.ok) {
            const dmChannel = await dmChannelResponse.json();

            // Send message with embed
            await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: message,
                embeds: [{
                  title: '🎉 Milestone Achieved!',
                  description: `You've reached ${formatThreshold(config.threshold, config.milestone_type)} ${config.milestone_type}!`,
                  color: 0x22c55e, // Green
                }]
              }),
            });

            console.log(`Sent milestone notification to user ${notification.user_id}`);
          }
        }
      }

      // Mark as sent regardless of Discord availability
      await supabase
        .from('milestone_achievements')
        .update({ notification_sent: true })
        .eq('id', notification.id);

      sentCount++;
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }
  }

  return sentCount;
}

function formatThreshold(value: number, type: string): string {
  if (type === 'earnings') {
    return `$${value.toLocaleString()}`;
  } else if (type === 'views') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
  }
  return value.toLocaleString();
}
