import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.440.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize R2 client (S3-compatible)
function getR2Client() {
  const accountId = Deno.env.get('R2_ACCOUNT_ID')!;
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')!;
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')!;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// Extract R2 key from URL
function extractR2Key(url: string): string | null {
  const publicUrl = Deno.env.get('R2_PUBLIC_URL') || '';
  if (url.startsWith(publicUrl)) {
    return url.replace(`${publicUrl}/`, '');
  }
  // Also handle old Supabase storage URLs (for migration)
  const supabaseMatch = url.match(/verification-screenshots\/(.+)$/);
  if (supabaseMatch) {
    return null; // Return null for Supabase URLs - handled differently
  }
  return null;
}

async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const r2 = getR2Client();
    const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'virality-demographics';

    await r2.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));

    console.log(`Deleted from R2: ${key}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete from R2: ${key}`, error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'cleanup_reviewed';

    let results = {
      action,
      processed: 0,
      deleted: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (action === 'cleanup_reviewed') {
      // Clean up videos for approved/rejected submissions
      const { data: submissions, error } = await supabase
        .from('demographic_submissions')
        .select('id, screenshot_url, status')
        .in('status', ['approved', 'rejected'])
        .not('screenshot_url', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch submissions: ${error.message}`);
      }

      console.log(`Found ${submissions?.length || 0} reviewed submissions with videos to clean up`);

      for (const submission of submissions || []) {
        results.processed++;

        const key = extractR2Key(submission.screenshot_url);

        if (key) {
          // R2 URL - delete from R2
          const deleted = await deleteFromR2(key);
          if (deleted) {
            results.deleted++;
          } else {
            results.failed++;
            results.errors.push(`Failed to delete R2 file for submission ${submission.id}`);
          }
        } else {
          // Old Supabase URL or unknown format - just clear the URL
          console.log(`Skipping non-R2 URL for submission ${submission.id}`);
        }

        // Clear the URL in database regardless
        await supabase
          .from('demographic_submissions')
          .update({ screenshot_url: null })
          .eq('id', submission.id);
      }

    } else if (action === 'cleanup_expired') {
      // Clean up expired pending submissions (14 days old)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - 14);

      const { data: submissions, error } = await supabase
        .from('demographic_submissions')
        .select('id, screenshot_url, submitted_at')
        .eq('status', 'pending')
        .not('screenshot_url', 'is', null)
        .lt('submitted_at', expiryDate.toISOString());

      if (error) {
        throw new Error(`Failed to fetch expired submissions: ${error.message}`);
      }

      console.log(`Found ${submissions?.length || 0} expired pending submissions to clean up`);

      for (const submission of submissions || []) {
        results.processed++;

        const key = extractR2Key(submission.screenshot_url);

        if (key) {
          const deleted = await deleteFromR2(key);
          if (deleted) {
            results.deleted++;
          } else {
            results.failed++;
            results.errors.push(`Failed to delete R2 file for expired submission ${submission.id}`);
          }
        }

        // Mark as expired and clear URL
        await supabase
          .from('demographic_submissions')
          .update({
            status: 'expired',
            screenshot_url: null,
            admin_notes: 'Auto-expired after 14 days without review',
          })
          .eq('id', submission.id);
      }

    } else if (action === 'delete_single') {
      // Delete a single submission's video (called after review)
      const submissionId = body.submissionId;

      if (!submissionId) {
        return new Response(
          JSON.stringify({ error: 'Missing submissionId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: submission, error } = await supabase
        .from('demographic_submissions')
        .select('id, screenshot_url')
        .eq('id', submissionId)
        .single();

      if (error || !submission) {
        return new Response(
          JSON.stringify({ error: 'Submission not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (submission.screenshot_url) {
        results.processed = 1;
        const key = extractR2Key(submission.screenshot_url);

        if (key) {
          const deleted = await deleteFromR2(key);
          if (deleted) {
            results.deleted = 1;
          } else {
            results.failed = 1;
          }
        }

        // Clear URL in database
        await supabase
          .from('demographic_submissions')
          .update({ screenshot_url: null })
          .eq('id', submissionId);
      }
    }

    console.log(`Cleanup complete: ${JSON.stringify(results)}`);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in cleanup-demographics-videos:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
