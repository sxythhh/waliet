import { S3Client, PutObjectCommand, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.440.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Allowed video extensions (whitelist)
const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'];

// Initialize R2 client (S3-compatible)
function getR2Client(): S3Client {
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');

  // Validate required environment variables
  if (!accountId || !accessKeyId || !secretAccessKey) {
    const missing: string[] = [];
    if (!accountId) missing.push('R2_ACCOUNT_ID');
    if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
    if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
    throw new Error(`Missing required R2 configuration: ${missing.join(', ')}`);
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// Sanitize file extension
function sanitizeExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  return ALLOWED_EXTENSIONS.includes(ext) ? ext : 'mp4';
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'virality-demographics';
  const publicUrl = Deno.env.get('R2_PUBLIC_URL');

  // Validate R2_PUBLIC_URL is set
  if (!publicUrl) {
    console.error('R2_PUBLIC_URL environment variable is not set');
    return new Response(
      JSON.stringify({ error: 'Server configuration error: R2_PUBLIC_URL not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create Supabase client and verify JWT
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    console.error('Auth error:', authError?.message);
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Handle DELETE request - delete file from R2
    if (req.method === 'DELETE') {
      const { key } = await req.json();

      if (!key || typeof key !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid key parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // SECURITY: Verify user owns this file by checking key prefix
      if (!key.startsWith(`${user.id}/demographics_`)) {
        console.error(`IDOR attempt: User ${user.id} tried to delete key ${key}`);
        return new Response(
          JSON.stringify({ error: 'Forbidden: You can only delete your own files' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const r2 = getR2Client();
      await r2.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }));

      console.log(`Deleted file from R2: ${key} by user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, deleted: key }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request - upload file to R2
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = req.headers.get('content-type') || '';

    // Handle multipart form data
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Expected multipart/form-data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');
    const socialAccountId = formData.get('socialAccountId');

    // Validate file is actually a File object
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type: expected File object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof userId !== 'string' || typeof socialAccountId !== 'string' || !userId || !socialAccountId) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid userId or socialAccountId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify userId matches authenticated user
    if (userId !== user.id) {
      console.error(`User ID mismatch: Auth user ${user.id} vs provided ${userId}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify social account ownership
    const { data: socialAccount, error: accountError } = await supabaseClient
      .from('social_accounts')
      .select('id')
      .eq('id', socialAccountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !socialAccount) {
      console.error(`Social account ownership check failed: ${accountError?.message}`);
      return new Response(
        JSON.stringify({ error: 'Social account not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Max 3 submissions per social account per 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseClient
      .from('demographic_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('social_account_id', socialAccountId)
      .gte('submitted_at', oneDayAgo);

    if (!countError && count !== null && count >= 3) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 3 submissions per 24 hours per account.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return new Response(
        JSON.stringify({ error: 'Only video files are allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Max file size: 15MB (after client-side compression)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique file key with sanitized extension
    const timestamp = Date.now();
    const extension = sanitizeExtension(file.name);
    const key = `${userId}/demographics_${socialAccountId}_${timestamp}.${extension}`;

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to R2
    const r2 = getR2Client();
    await r2.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: uint8Array,
      ContentType: file.type,
      // Set metadata for lifecycle management
      Metadata: {
        'user-id': userId,
        'social-account-id': socialAccountId,
        'upload-timestamp': timestamp.toString(),
      },
    }));

    // Generate public URL
    const fileUrl = `${publicUrl}/${key}`;

    console.log(`Uploaded demographics video to R2: ${key} (${(file.size / 1024 / 1024).toFixed(2)}MB) by user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: fileUrl,
        key: key,
        size: file.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in upload-demographics-video:', error);

    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Missing required R2 configuration')) {
        errorMessage = 'Server configuration error. Please contact support.';
        console.error('R2 configuration missing - check environment variables');
      } else if (error.message.includes('AccessDenied') || error.message.includes('InvalidAccessKeyId')) {
        errorMessage = 'Storage service authentication failed. Please contact support.';
        console.error('R2 authentication failed - check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY');
      } else if (error.message.includes('NoSuchBucket')) {
        errorMessage = 'Storage bucket not found. Please contact support.';
        console.error('R2 bucket not found - check R2_BUCKET_NAME');
      } else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        errorMessage = 'Upload timed out. Please try again with a smaller file.';
        statusCode = 408;
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
