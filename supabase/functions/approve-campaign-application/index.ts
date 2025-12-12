import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveApplicationRequest {
  submissionId: string;
}

// Helper function to check if user is admin or brand admin
async function isAuthorized(supabase: any, userId: string, campaignId: string): Promise<boolean> {
  // Check if user is admin
  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (adminRole) return true;

  // Check if user is brand member for this campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('brand_id')
    .eq('id', campaignId)
    .single();

  if (!campaign?.brand_id) return false;

  const { data: brandMember } = await supabase
    .from('brand_members')
    .select('role')
    .eq('user_id', userId)
    .eq('brand_id', campaign.brand_id)
    .maybeSingle();

  return !!brandMember;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} attempting to approve application`);

    // Use service role client for database operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { submissionId }: ApproveApplicationRequest = await req.json();

    if (!submissionId) {
      return new Response(
        JSON.stringify({ error: 'Submission ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Approving application: ${submissionId}`);

    // Get the submission details
    const { data: submission, error: submissionError } = await supabaseClient
      .from('campaign_submissions')
      .select(`
        id,
        campaign_id,
        creator_id,
        status,
        campaigns!inner (
          id,
          title,
          brand_name
        )
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('Error fetching submission:', submissionError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check authorization
    const authorized = await isAuthorized(supabaseClient, user.id, submission.campaign_id);
    if (!authorized) {
      console.error(`User ${user.id} not authorized to approve applications for campaign ${submission.campaign_id}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - you do not have permission to approve applications for this campaign' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (submission.status === 'approved') {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Application already approved',
          alreadyApproved: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update submission status to approved
    const { error: updateError } = await supabaseClient
      .from('campaign_submissions')
      .update({ 
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to approve application' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Submission approved successfully by user:', user.id);

    // Track user in Shortimize
    console.log('Calling track-campaign-user function...');
    const { data: trackData, error: trackError } = await supabaseClient.functions.invoke(
      'track-campaign-user',
      {
        body: {
          campaignId: submission.campaign_id,
          userId: submission.creator_id
        }
      }
    );

    if (trackError) {
      console.error('Error tracking user in Shortimize:', trackError);
      // Continue even if tracking fails
    } else {
      console.log('User tracked in Shortimize:', trackData);
    }

    // Send approval notification
    console.log('Calling send-application-approval function...');
    const { data: notificationData, error: notificationError } = await supabaseClient.functions.invoke(
      'send-application-approval',
      {
        body: {
          submissionId: submissionId
        }
      }
    );

    if (notificationError) {
      console.error('Error sending approval notification:', notificationError);
      // Continue even if notification fails
    } else {
      console.log('Approval notification sent:', notificationData);
    }

    const campaignData = Array.isArray(submission.campaigns) 
      ? submission.campaigns[0] 
      : submission.campaigns;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Application approved successfully',
        submission: {
          id: submission.id,
          campaignId: submission.campaign_id,
          creatorId: submission.creator_id,
          campaignTitle: campaignData?.title,
          brandName: campaignData?.brand_name
        },
        tracking: trackData,
        notification: notificationData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in approve-campaign-application:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
