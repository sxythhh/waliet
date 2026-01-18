// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ValidateGDriveRequest {
  fileId?: string;
  fileUrl?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
}

/**
 * Extracts Google Drive file ID from various URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://docs.google.com/document/d/FILE_ID/edit
 */
function extractFileId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /open\?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If it looks like just a file ID (alphanumeric with dashes/underscores)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Validates that the file is a supported video format
 */
function isVideoMimeType(mimeType: string): boolean {
  const videoMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/webm",
    "video/3gpp",
    "video/3gpp2",
    "video/x-m4v",
    "video/x-matroska",
  ];

  return (
    mimeType.startsWith("video/") || videoMimeTypes.includes(mimeType)
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Google API key from environment
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");

    if (!googleApiKey) {
      console.error("GOOGLE_API_KEY not configured");
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Server configuration error. Please contact support.",
        } as ValidationResult),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: ValidateGDriveRequest = await req.json();
    const { fileId, fileUrl } = body;

    // Extract file ID from URL if not provided directly
    const id = fileId || extractFileId(fileUrl || "");

    if (!id) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Invalid Google Drive URL format. Please provide a valid Google Drive link.",
        } as ValidationResult),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query Google Drive API for file metadata
    // Using fields parameter to get specific metadata
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,thumbnailLink,webContentLink,size&key=${googleApiKey}`;

    const response = await fetch(metadataUrl);

    if (response.status === 404) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "File not found. Make sure the file exists and the link is correct.",
        } as ValidationResult),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (response.status === 403) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'File is not publicly accessible. Please set sharing to "Anyone with the link can view".',
        } as ValidationResult),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Drive API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Unable to verify file access. Please check the link and try again.",
        } as ValidationResult),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const metadata = await response.json();

    // Validate it's a video file
    if (!isVideoMimeType(metadata.mimeType)) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: `File is not a video (detected: ${metadata.mimeType}). Please upload a video file.`,
        } as ValidationResult),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check file size (optional: warn if very large)
    const fileSizeBytes = parseInt(metadata.size || "0", 10);
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    if (fileSizeMB > 5000) {
      // 5GB limit warning
      return new Response(
        JSON.stringify({
          valid: false,
          error: "File is too large. Maximum file size is 5GB.",
        } as ValidationResult),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate thumbnail URL (Google Drive provides this)
    // Format: https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
    const thumbnailUrl = metadata.thumbnailLink
      ? metadata.thumbnailLink.replace(/=s\d+/, "=s800")
      : `https://drive.google.com/thumbnail?id=${id}&sz=w800`;

    // Generate download URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;

    // Success response
    return new Response(
      JSON.stringify({
        valid: true,
        fileId: metadata.id,
        fileName: metadata.name,
        mimeType: metadata.mimeType,
        thumbnailUrl,
        downloadUrl,
      } as ValidationResult),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in validate-gdrive-access:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: "Failed to validate file. Please try again.",
      } as ValidationResult),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
