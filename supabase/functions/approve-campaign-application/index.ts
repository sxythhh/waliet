import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveApplicationRequest {
  submissionId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    console.log('Submission approved successfully');

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
