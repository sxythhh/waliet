import { S3Client, PutObjectCommand, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.440.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'virality-demographics';
  const publicUrl = Deno.env.get('R2_PUBLIC_URL')!;

  try {
    // Handle DELETE request - delete file from R2
    if (req.method === 'DELETE') {
      const { key } = await req.json();

      if (!key) {
        return new Response(
          JSON.stringify({ error: 'Missing key parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const r2 = getR2Client();
      await r2.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }));

      console.log(`Deleted file from R2: ${key}`);

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
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const socialAccountId = formData.get('socialAccountId') as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId || !socialAccountId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or socialAccountId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Generate unique file key
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'mp4';
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

    console.log(`Uploaded demographics video to R2: ${key} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

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
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
