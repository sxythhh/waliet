import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Allowed video extensions (whitelist)
const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'];
const BUCKET_NAME = 'demographics-videos';

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

  // Validate authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create Supabase client and verify JWT
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // Client for user auth verification
  const supabaseClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  // Admin client for storage operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    console.error('Auth error:', authError?.message);
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Handle DELETE request
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

      const { error: deleteError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([key]);

      if (deleteError) {
        console.error('Delete error:', deleteError.message);
        throw new Error(deleteError.message);
      }

      console.log(`Deleted file: ${key} by user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, deleted: key }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request - upload file
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = req.headers.get('content-type') || '';

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

    // Max file size: 50MB
    const maxSize = 50 * 1024 * 1024;
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

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(key, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      throw new Error(uploadError.message);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(key);

    const fileUrl = urlData.publicUrl;

    console.log(`Uploaded demographics video: ${key} (${(file.size / 1024 / 1024).toFixed(2)}MB) by user ${user.id}`);

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
      if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        errorMessage = 'File already exists. Please try again.';
        statusCode = 409;
      } else if (error.message.includes('Bucket not found')) {
        errorMessage = 'Storage not configured. Please contact support.';
        console.error('Storage bucket not found - create demographics-videos bucket');
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
