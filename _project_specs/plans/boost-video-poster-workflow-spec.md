# Boost Video Poster Workflow - Detailed Specification

## Overview

This document specifies the complete implementation for the poster/video uploader workflow with Google Drive integration. The system enables professional video editors to submit content via Google Drive, brands to review and approve submissions, and posters to publish approved content to brand social accounts.

---

## Table of Contents

1. [User Roles & Permissions](#1-user-roles--permissions)
2. [Workflow States](#2-workflow-states)
3. [Database Schema](#3-database-schema)
4. [Core Kanban Flow (Phase 1)](#4-core-kanban-flow-phase-1)
5. [Google Drive Validation (Phase 2)](#5-google-drive-validation-phase-2)
6. [Video Preview (Phase 3)](#6-video-preview-phase-3)
7. [Credentials Vault (Phase 4)](#7-credentials-vault-phase-4)
8. [Scheduling & Notifications (Phase 5)](#8-scheduling--notifications-phase-5)
9. [UI/UX Specifications](#9-uiux-specifications)
10. [API Endpoints](#10-api-endpoints)
11. [Security Considerations](#11-security-considerations)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. User Roles & Permissions

### Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Editor** | Creates video content for the brand | Submit videos, view own submissions, edit captions (until posted), view assigned accounts only |
| **Poster** | Publishes approved content to social platforms | View all submissions, move to "Posted", access credentials vault, enter posted URLs |
| **Admin** | Brand team member with approval authority | All poster permissions + approve/reject, add feedback, assign editors to accounts |
| **Owner** | Brand owner | All admin permissions + manage team, delete submissions |

### Permission Matrix

| Action | Editor | Poster | Admin | Owner |
|--------|--------|--------|-------|-------|
| Submit video | ✓ | ✓ | ✓ | ✓ |
| View own submissions | ✓ | ✓ | ✓ | ✓ |
| View all submissions | ✗ | ✓ | ✓ | ✓ |
| Edit caption (until posted) | ✓ | ✓ | ✓ | ✓ |
| Move Pending → Approved | ✗ | ✗ | ✓ | ✓ |
| Move Approved → Ready to Post | ✗ | ✗ | ✓ | ✓ |
| Move Ready to Post → Posted | ✗ | ✓ | ✓ | ✓ |
| Reject submission | ✗ | ✗ | ✓ | ✓ |
| Add feedback | ✗ | ✗ | ✓ | ✓ |
| Access credentials vault | ✗ | ✓ | ✓ | ✓ |
| Assign editors to accounts | ✗ | ✗ | ✓ | ✓ |
| Manage brand social accounts | ✗ | ✗ | ✓ | ✓ |

---

## 2. Workflow States

### State Machine

```
                                    ┌─────────────┐
                                    │  REJECTED   │
                                    └─────────────┘
                                          ▲
                                          │ reject
                                          │
┌─────────────┐    approve    ┌─────────────┐    ready    ┌─────────────┐    post    ┌─────────────┐
│   PENDING   │ ────────────► │  APPROVED   │ ──────────► │READY TO POST│ ─────────► │   POSTED    │
└─────────────┘               └─────────────┘             └─────────────┘            └─────────────┘
      ▲                             │                           │
      │                             │ request changes           │ request changes
      │                             ▼                           ▼
      │                       ┌─────────────┐             ┌─────────────┐
      └────── resubmit ────── │  REVISION   │ ◄───────────│  REVISION   │
                              │  REQUESTED  │             │  REQUESTED  │
                              └─────────────┘             └─────────────┘
```

### Per-Platform Status

Each submission tracks status independently per platform:

```typescript
type PlatformStatus =
  | 'pending'        // Awaiting review
  | 'approved'       // Brand approved for this platform
  | 'ready_to_post'  // Ready for poster to publish
  | 'posted'         // Published to platform
  | 'rejected'       // Not approved for this platform
  | 'skipped'        // Intentionally not posting to this platform
```

### Status Transition Rules

| From | To | Allowed By | Requirements |
|------|-----|------------|--------------|
| pending | approved | Admin, Owner | None |
| pending | rejected | Admin, Owner | Feedback required |
| approved | ready_to_post | Admin, Owner | None |
| approved | rejected | Admin, Owner | Feedback required |
| ready_to_post | posted | Poster, Admin, Owner | Posted URL required |
| ready_to_post | rejected | Admin, Owner | Feedback required |
| any | skipped | Admin, Owner | None |

---

## 3. Database Schema

### Modified Tables

#### `video_submissions` (existing - add columns)

```sql
-- Posted URL proof (one per platform)
ALTER TABLE video_submissions ADD COLUMN posted_url_tiktok TEXT;
ALTER TABLE video_submissions ADD COLUMN posted_url_instagram TEXT;
ALTER TABLE video_submissions ADD COLUMN posted_url_youtube TEXT;

-- Scheduling
ALTER TABLE video_submissions ADD COLUMN scheduled_post_date DATE;
ALTER TABLE video_submissions ADD COLUMN scheduled_post_time TIME;

-- Caption edit tracking
ALTER TABLE video_submissions ADD COLUMN caption_edited_at TIMESTAMPTZ;
ALTER TABLE video_submissions ADD COLUMN caption_edited_by UUID REFERENCES profiles(id);

-- GDrive validation status
ALTER TABLE video_submissions ADD COLUMN gdrive_access_validated BOOLEAN DEFAULT false;
ALTER TABLE video_submissions ADD COLUMN gdrive_access_checked_at TIMESTAMPTZ;
ALTER TABLE video_submissions ADD COLUMN gdrive_thumbnail_url TEXT;
```

#### `brand_social_account_credentials` (new table)

```sql
CREATE TABLE brand_social_account_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES brand_social_accounts(id) ON DELETE CASCADE,

  -- Encrypted credentials (stored in Supabase Vault)
  vault_secret_id UUID NOT NULL, -- Reference to vault.secrets

  -- Metadata (not sensitive)
  credential_type TEXT NOT NULL CHECK (credential_type IN ('password', 'api_key', '2fa_backup', 'notes')),
  label TEXT, -- e.g., "Main password", "Backup codes"

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  last_accessed_at TIMESTAMPTZ,
  last_accessed_by UUID REFERENCES profiles(id),

  UNIQUE(social_account_id, credential_type, label)
);

-- RLS: Only brand admins/owners can manage, posters can read
ALTER TABLE brand_social_account_credentials ENABLE ROW LEVEL SECURITY;
```

#### `video_submission_status_history` (new table - audit trail)

```sql
CREATE TABLE video_submission_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES video_submissions(id) ON DELETE CASCADE,

  -- What changed
  platform TEXT, -- NULL for overall status, 'tiktok'/'instagram'/'youtube' for platform-specific
  previous_status TEXT,
  new_status TEXT NOT NULL,

  -- Context
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT, -- For rejections/revisions

  INDEX idx_submission_history (submission_id, changed_at DESC)
);
```

### Database Functions

#### `validate_posted_url_required()`

```sql
CREATE OR REPLACE FUNCTION validate_posted_url_required()
RETURNS TRIGGER AS $$
BEGIN
  -- When moving to 'posted' status, require the corresponding URL
  IF NEW.status_tiktok = 'posted' AND OLD.status_tiktok != 'posted' THEN
    IF NEW.posted_url_tiktok IS NULL OR NEW.posted_url_tiktok = '' THEN
      RAISE EXCEPTION 'Posted URL required for TikTok';
    END IF;
  END IF;

  IF NEW.status_instagram = 'posted' AND OLD.status_instagram != 'posted' THEN
    IF NEW.posted_url_instagram IS NULL OR NEW.posted_url_instagram = '' THEN
      RAISE EXCEPTION 'Posted URL required for Instagram';
    END IF;
  END IF;

  IF NEW.status_youtube = 'posted' AND OLD.status_youtube != 'posted' THEN
    IF NEW.posted_url_youtube IS NULL OR NEW.posted_url_youtube = '' THEN
      RAISE EXCEPTION 'Posted URL required for YouTube';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_posted_url
  BEFORE UPDATE ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION validate_posted_url_required();
```

---

## 4. Core Kanban Flow (Phase 1)

### 4.1 Submission Form Updates

**File:** `src/components/SubmitBoostVideoDialog.tsx`

#### Changes Required:

1. **Account Selection** - Show only assigned accounts
   ```typescript
   // Fetch editor's assigned accounts
   const { data: assignedAccounts } = await supabase
     .from('boost_editor_accounts')
     .select('social_account_id, brand_social_accounts(*)')
     .eq('boost_id', boostId)
     .eq('user_id', userId)
     .eq('is_active', true);
   ```

2. **Platform checkboxes** - Pre-select assigned platforms
   ```typescript
   // Group by platform, pre-select if editor has assignment
   const platformOptions = ['tiktok', 'instagram', 'youtube'].map(platform => ({
     platform,
     accounts: assignedAccounts.filter(a => a.brand_social_accounts.platform === platform),
     preSelected: assignedAccounts.some(a => a.brand_social_accounts.platform === platform)
   }));
   ```

3. **Validation before submit** - Check GDrive accessibility (Phase 2)

### 4.2 Kanban Board Updates

**File:** `src/components/brand/BoostVideoReviewQueue.tsx`

#### UI Changes:

1. **Add filtering controls**
   - Filter by platform (TikTok, Instagram, YouTube, All)
   - Filter by editor
   - Filter by date range
   - Search by caption text

2. **Per-platform status indicators on cards**
   ```tsx
   <div className="flex gap-1">
     {submission.target_account_tiktok && (
       <PlatformStatusBadge
         platform="tiktok"
         status={submission.status_tiktok}
       />
     )}
     {submission.target_account_instagram && (
       <PlatformStatusBadge
         platform="instagram"
         status={submission.status_instagram}
       />
     )}
     {submission.target_account_youtube && (
       <PlatformStatusBadge
         platform="youtube"
         status={submission.status_youtube}
       />
     )}
   </div>
   ```

3. **"Mark as Posted" dialog with URL inputs**
   ```tsx
   interface MarkAsPostedDialogProps {
     submission: VideoSubmission;
     onConfirm: (urls: {
       tiktok?: string;
       instagram?: string;
       youtube?: string;
     }) => void;
   }

   // Show URL input for each targeted platform
   // Validate URL format before allowing confirm
   // Support bulk (all platforms) or individual marking
   ```

4. **Caption editing inline**
   - Click caption to edit
   - Save on blur or Enter
   - Show "edited by X at Y" indicator
   - Disable editing after any platform is "posted"

### 4.3 Status Transition Logic

```typescript
// src/lib/submission-workflow.ts

export async function transitionStatus(
  submissionId: string,
  targetStatus: PlatformStatus,
  options: {
    platforms?: ('tiktok' | 'instagram' | 'youtube')[]; // null = all targeted
    postedUrls?: Record<string, string>;
    feedback?: string;
    userId: string;
  }
) {
  const { platforms, postedUrls, feedback, userId } = options;

  // 1. Fetch current submission
  const submission = await getSubmission(submissionId);

  // 2. Determine which platforms to update
  const targetPlatforms = platforms || getTargetedPlatforms(submission);

  // 3. Validate transition is allowed
  for (const platform of targetPlatforms) {
    const currentStatus = submission[`status_${platform}`];
    validateTransition(currentStatus, targetStatus, platform);
  }

  // 4. Build update object
  const updates: Record<string, any> = {};

  for (const platform of targetPlatforms) {
    updates[`status_${platform}`] = targetStatus;

    if (targetStatus === 'posted' && postedUrls?.[platform]) {
      updates[`posted_url_${platform}`] = postedUrls[platform];
      updates[`posted_at_${platform}`] = new Date().toISOString();
      updates[`posted_by_${platform}`] = userId;
    }
  }

  // 5. Update overall status (derive from platform statuses)
  updates.status = deriveOverallStatus(submission, updates);

  // 6. Add feedback if rejecting
  if (targetStatus === 'rejected' && feedback) {
    updates.feedback = feedback;
  }

  // 7. Execute update
  await supabase
    .from('video_submissions')
    .update(updates)
    .eq('id', submissionId);

  // 8. Log to history
  await logStatusChange(submissionId, targetPlatforms, targetStatus, userId, feedback);

  // 9. Trigger notifications (Phase 5)
  await notifyStatusChange(submission, targetStatus, targetPlatforms);
}

function deriveOverallStatus(submission: any, updates: any): string {
  const platforms = ['tiktok', 'instagram', 'youtube'];
  const statuses = platforms
    .filter(p => submission[`target_account_${p}`])
    .map(p => updates[`status_${p}`] || submission[`status_${p}`]);

  // If all posted → posted
  if (statuses.every(s => s === 'posted')) return 'posted';
  // If any posted → ready_to_post (partial)
  if (statuses.some(s => s === 'posted')) return 'ready_to_post';
  // If all ready_to_post → ready_to_post
  if (statuses.every(s => s === 'ready_to_post' || s === 'skipped')) return 'ready_to_post';
  // If all approved → approved
  if (statuses.every(s => s === 'approved' || s === 'skipped')) return 'approved';
  // If all rejected → rejected
  if (statuses.every(s => s === 'rejected')) return 'rejected';
  // Default to pending
  return 'pending';
}
```

### 4.4 Hybrid Bulk/Individual Actions

```tsx
// In BoostVideoReviewQueue.tsx

// Card dropdown menu
<DropdownMenu>
  <DropdownMenuContent>
    {/* Individual platform actions */}
    {submission.target_account_tiktok && (
      <DropdownMenuItem onClick={() => openMarkPostedDialog('tiktok')}>
        Mark TikTok as Posted
      </DropdownMenuItem>
    )}
    {submission.target_account_instagram && (
      <DropdownMenuItem onClick={() => openMarkPostedDialog('instagram')}>
        Mark Instagram as Posted
      </DropdownMenuItem>
    )}
    {submission.target_account_youtube && (
      <DropdownMenuItem onClick={() => openMarkPostedDialog('youtube')}>
        Mark YouTube as Posted
      </DropdownMenuItem>
    )}

    <DropdownMenuSeparator />

    {/* Bulk action */}
    <DropdownMenuItem onClick={() => openMarkPostedDialog('all')}>
      Mark All as Posted
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 5. Google Drive Validation (Phase 2)

### 5.1 Server-Side Validation

**File:** `supabase/functions/validate-gdrive-access/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { fileId, fileUrl } = await req.json();

  // Extract file ID if URL provided
  const id = fileId || extractFileId(fileUrl);
  if (!id) {
    return new Response(JSON.stringify({
      valid: false,
      error: 'Invalid Google Drive URL format'
    }), { status: 400 });
  }

  // Check if file is publicly accessible
  // Using Google Drive API v3 with no auth (public files only)
  const metadataUrl = `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,thumbnailLink,webContentLink&key=${Deno.env.get('GOOGLE_API_KEY')}`;

  try {
    const response = await fetch(metadataUrl);

    if (response.status === 404) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'File not found. Make sure the file exists and sharing is set to "Anyone with the link".'
      }), { status: 200 });
    }

    if (response.status === 403) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'File is not publicly accessible. Please set sharing to "Anyone with the link can view".'
      }), { status: 200 });
    }

    if (!response.ok) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Unable to verify file access. Please check the link and try again.'
      }), { status: 200 });
    }

    const metadata = await response.json();

    // Validate it's a video file
    if (!metadata.mimeType?.startsWith('video/')) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'File is not a video. Please upload a video file.'
      }), { status: 200 });
    }

    return new Response(JSON.stringify({
      valid: true,
      fileId: metadata.id,
      fileName: metadata.name,
      mimeType: metadata.mimeType,
      thumbnailUrl: metadata.thumbnailLink,
      downloadUrl: metadata.webContentLink
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({
      valid: false,
      error: 'Failed to validate file. Please try again.'
    }), { status: 500 });
  }
});

function extractFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /open\?id=([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

### 5.2 Submission Flow with Validation

```typescript
// In SubmitBoostVideoDialog.tsx

const handleSubmit = async () => {
  setSubmitting(true);
  setError(null);

  // 1. Validate GDrive access server-side
  const validationResult = await supabase.functions.invoke('validate-gdrive-access', {
    body: { fileUrl: gdriveUrl }
  });

  if (!validationResult.data?.valid) {
    setError(validationResult.data?.error || 'Unable to access video file');
    setSubmitting(false);
    return;
  }

  // 2. Create submission with validated metadata
  const { error: submitError } = await supabase
    .from('video_submissions')
    .insert({
      boost_id: boostId,
      user_id: userId,
      gdrive_url: gdriveUrl,
      gdrive_file_id: validationResult.data.fileId,
      gdrive_file_name: validationResult.data.fileName,
      gdrive_thumbnail_url: validationResult.data.thumbnailUrl,
      gdrive_access_validated: true,
      gdrive_access_checked_at: new Date().toISOString(),
      caption,
      duration_seconds: duration,
      target_account_tiktok: selectedAccounts.tiktok,
      target_account_instagram: selectedAccounts.instagram,
      target_account_youtube: selectedAccounts.youtube,
      status: 'pending',
      status_tiktok: selectedAccounts.tiktok ? 'pending' : null,
      status_instagram: selectedAccounts.instagram ? 'pending' : null,
      status_youtube: selectedAccounts.youtube ? 'pending' : null,
    });

  if (submitError) {
    setError('Failed to submit video. Please try again.');
    setSubmitting(false);
    return;
  }

  onSuccess();
};
```

---

## 6. Video Preview (Phase 3)

### 6.1 Embedded GDrive Player Component

**File:** `src/components/GDriveVideoPreview.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Play, ExternalLink, AlertCircle } from 'lucide-react';

interface GDriveVideoPreviewProps {
  fileId: string;
  thumbnailUrl?: string;
  fileName?: string;
  className?: string;
}

export function GDriveVideoPreview({
  fileId,
  thumbnailUrl,
  fileName,
  className
}: GDriveVideoPreviewProps) {
  const [loadError, setLoadError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Google Drive embed URL for video playback
  const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  const directUrl = `https://drive.google.com/file/d/${fileId}/view`;

  if (loadError) {
    // Fallback to thumbnail
    return (
      <div className={cn("relative rounded-lg overflow-hidden bg-muted", className)}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={fileName || 'Video thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm text-center">Preview unavailable</p>
          </div>
        )}
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
        >
          <div className="flex items-center gap-2 text-white">
            <ExternalLink className="h-5 w-5" />
            <span>Open in Drive</span>
          </div>
        </a>
      </div>
    );
  }

  if (!isPlaying) {
    // Show thumbnail with play button
    return (
      <div
        className={cn("relative rounded-lg overflow-hidden bg-muted cursor-pointer group", className)}
        onClick={() => setIsPlaying(true)}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={fileName || 'Video thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-8 w-8 text-foreground ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
    );
  }

  // Embedded player
  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="autoplay; encrypted-media"
        allowFullScreen
        onError={() => setLoadError(true)}
      />
    </div>
  );
}
```

### 6.2 Submission Detail Drawer

**File:** `src/components/brand/VideoSubmissionDrawer.tsx`

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GDriveVideoPreview } from '@/components/GDriveVideoPreview';

interface VideoSubmissionDrawerProps {
  submission: VideoSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: string, platforms?: string[]) => void;
}

export function VideoSubmissionDrawer({
  submission,
  open,
  onOpenChange,
  onStatusChange
}: VideoSubmissionDrawerProps) {
  if (!submission) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Video Submission</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Video Preview */}
          <GDriveVideoPreview
            fileId={submission.gdrive_file_id}
            thumbnailUrl={submission.gdrive_thumbnail_url}
            fileName={submission.gdrive_file_name}
            className="aspect-[9/16] max-h-[400px]"
          />

          {/* Caption */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Caption
            </label>
            <EditableCaption
              value={submission.caption}
              submissionId={submission.id}
              disabled={isAnyPlatformPosted(submission)}
            />
          </div>

          {/* Platform Status */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Platform Status
            </label>
            <div className="mt-2 space-y-2">
              {submission.target_account_tiktok && (
                <PlatformStatusRow
                  platform="tiktok"
                  status={submission.status_tiktok}
                  postedUrl={submission.posted_url_tiktok}
                  onMarkPosted={(url) => handleMarkPosted('tiktok', url)}
                />
              )}
              {/* ... instagram, youtube ... */}
            </div>
          </div>

          {/* Feedback */}
          {submission.feedback && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <label className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Feedback
              </label>
              <p className="mt-1 text-sm">{submission.feedback}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {/* Context-aware action buttons */}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## 7. Credentials Vault (Phase 4)

### 7.1 Supabase Vault Integration

**Migration:** `supabase/migrations/XXXXXX_credentials_vault.sql`

```sql
-- Enable vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Function to store credential in vault
CREATE OR REPLACE FUNCTION store_brand_credential(
  p_social_account_id UUID,
  p_credential_type TEXT,
  p_label TEXT,
  p_secret_value TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_vault_secret_id UUID;
  v_credential_id UUID;
BEGIN
  -- Insert into vault
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (
    p_secret_value,
    'brand_cred_' || p_social_account_id || '_' || p_credential_type,
    'Credential for brand social account'
  )
  RETURNING id INTO v_vault_secret_id;

  -- Insert credential record
  INSERT INTO brand_social_account_credentials (
    social_account_id,
    vault_secret_id,
    credential_type,
    label,
    created_by
  ) VALUES (
    p_social_account_id,
    v_vault_secret_id,
    p_credential_type,
    p_label,
    p_user_id
  )
  RETURNING id INTO v_credential_id;

  RETURN v_credential_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retrieve credential (logs access)
CREATE OR REPLACE FUNCTION get_brand_credential(
  p_credential_id UUID,
  p_user_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_secret TEXT;
  v_vault_id UUID;
BEGIN
  -- Get vault secret ID
  SELECT vault_secret_id INTO v_vault_id
  FROM brand_social_account_credentials
  WHERE id = p_credential_id;

  IF v_vault_id IS NULL THEN
    RAISE EXCEPTION 'Credential not found';
  END IF;

  -- Get secret from vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = v_vault_id;

  -- Log access
  UPDATE brand_social_account_credentials
  SET last_accessed_at = NOW(), last_accessed_by = p_user_id
  WHERE id = p_credential_id;

  RETURN v_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.2 Credentials Manager UI

**File:** `src/components/brand/CredentialsVaultDialog.tsx`

```tsx
interface CredentialsVaultDialogProps {
  socialAccountId: string;
  accountName: string;
  platform: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CredentialsVaultDialog({
  socialAccountId,
  accountName,
  platform,
  open,
  onOpenChange
}: CredentialsVaultDialogProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);

  const revealCredential = async (credentialId: string) => {
    const { data, error } = await supabase.rpc('get_brand_credential', {
      p_credential_id: credentialId,
      p_user_id: userId
    });

    if (data) {
      setRevealedId(credentialId);
      setRevealedValue(data);

      // Auto-hide after 30 seconds
      setTimeout(() => {
        setRevealedId(null);
        setRevealedValue(null);
      }, 30000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {platform} Credentials - @{accountName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {credentials.map(cred => (
            <div key={cred.id} className="p-3 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{cred.label || cred.credential_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {cred.credential_type}
                  </p>
                </div>

                {revealedId === cred.id ? (
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-muted rounded text-sm">
                      {revealedValue}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(revealedValue!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revealCredential(cred.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Reveal
                  </Button>
                )}
              </div>

              {cred.last_accessed_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last accessed {formatRelative(cred.last_accessed_at)} by {cred.last_accessed_by_name}
                </p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 8. Scheduling & Notifications (Phase 5)

### 8.1 Scheduling UI

Add to `VideoSubmissionDrawer.tsx`:

```tsx
{/* Scheduling Section */}
<div>
  <label className="text-xs text-muted-foreground uppercase tracking-wider">
    Schedule Post
  </label>
  <div className="mt-2 flex gap-2">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {submission.scheduled_post_date
            ? format(new Date(submission.scheduled_post_date), 'PPP')
            : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={submission.scheduled_post_date ? new Date(submission.scheduled_post_date) : undefined}
          onSelect={(date) => updateSchedule(date)}
          disabled={(date) => date < new Date()}
        />
      </PopoverContent>
    </Popover>

    <Select
      value={submission.scheduled_post_time || ''}
      onValueChange={(time) => updateSchedule(undefined, time)}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Time" />
      </SelectTrigger>
      <SelectContent>
        {TIME_SLOTS.map(slot => (
          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>
```

### 8.2 Notification System

**File:** `supabase/functions/notify-submission-status/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { submissionId, newStatus, platforms, changedBy } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get submission details
  const { data: submission } = await supabase
    .from('video_submissions')
    .select(`
      *,
      boost:bounty_campaigns(title, brand_id),
      editor:profiles!user_id(email, username)
    `)
    .eq('id', submissionId)
    .single();

  // Get brand notification settings
  const { data: brand } = await supabase
    .from('brands')
    .select('notification_webhook_url, notification_email')
    .eq('id', submission.boost.brand_id)
    .single();

  // Real-time email
  if (shouldSendRealtime(newStatus)) {
    await sendEmail({
      to: getRecipients(submission, newStatus),
      subject: `Video ${newStatus}: ${submission.boost.title}`,
      body: buildEmailBody(submission, newStatus, platforms)
    });
  }

  // Queue for digest
  await supabase
    .from('notification_queue')
    .insert({
      type: 'submission_status_change',
      data: { submissionId, newStatus, platforms },
      process_after: getNextDigestTime()
    });

  // Webhook (existing infrastructure)
  if (brand.notification_webhook_url) {
    await fetch(brand.notification_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'submission_status_changed',
        submission_id: submissionId,
        new_status: newStatus,
        platforms,
        boost_title: submission.boost.title,
        editor_name: submission.editor.username
      })
    });
  }

  return new Response(JSON.stringify({ success: true }));
});

function shouldSendRealtime(status: string): boolean {
  // Send realtime for significant state changes
  return ['approved', 'rejected', 'posted'].includes(status);
}
```

### 8.3 Daily Digest Cron

**File:** `supabase/functions/send-notification-digest/index.ts`

```typescript
// Runs daily at 9 AM UTC
// Aggregates all notification_queue items
// Sends single digest email per user
// Clears processed queue items
```

---

## 9. UI/UX Specifications

### 9.1 Kanban Card Design

```
┌─────────────────────────────────────────┐
│ ┌─────┐                           ⋮     │
│ │ 👤  │ Editor Name        2h ago       │
│ └─────┘                                 │
│                                         │
│ Caption text goes here and can wrap     │
│ to multiple lines with a 2-line...      │
│                                         │
│ ┌────┐ ┌────┐ ┌────┐                   │
│ │ TT │ │ IG │ │ YT │     Rev 2   💬    │
│ │ ✓  │ │ ⏳ │ │ —  │                   │
│ └────┘ └────┘ └────┘          ⏱ 0:45   │
│                                    →    │
└─────────────────────────────────────────┘

Legend:
- TT/IG/YT: Platform badges with status icon
- ✓ = approved/posted, ⏳ = pending, — = skipped
- Rev 2: Revision indicator
- 💬: Has feedback
- ⏱ 0:45: Video duration
- →: Quick advance to next stage
```

### 9.2 Color Coding

| Status | Background | Text | Dot |
|--------|------------|------|-----|
| Pending | `amber-500/10` | `amber-600` | `amber-500` |
| Approved | `blue-500/10` | `blue-600` | `blue-500` |
| Ready to Post | `violet-500/10` | `violet-600` | `violet-500` |
| Posted | `emerald-500/10` | `emerald-600` | `emerald-500` |
| Rejected | `red-500/10` | `red-600` | `red-500` |

### 9.3 Responsive Behavior

- **Desktop (>1024px)**: 4-column kanban, side drawer for details
- **Tablet (768-1024px)**: 2-column kanban with horizontal scroll, modal for details
- **Mobile (<768px)**: Single column list view, full-screen detail view

---

## 10. API Endpoints

### Edge Functions

| Function | Method | Purpose |
|----------|--------|---------|
| `validate-gdrive-access` | POST | Validate GDrive file is accessible |
| `notify-submission-status` | POST | Trigger notifications on status change |
| `send-notification-digest` | CRON | Daily digest email |
| `get-brand-credential` | RPC | Retrieve credential from vault |
| `store-brand-credential` | RPC | Store credential in vault |

### Database RPC Functions

| Function | Purpose |
|----------|---------|
| `transition_submission_status` | Atomic status transition with validation |
| `get_kanban_submissions` | Optimized query for kanban view |
| `get_editor_assigned_accounts` | Get accounts assigned to editor |

---

## 11. Security Considerations

### 11.1 Access Control

- Row-Level Security on all tables
- Role-based permission checks in application code
- Audit logging for credential access
- Rate limiting on credential reveal (max 10/hour)

### 11.2 Data Protection

- Credentials encrypted at rest (Supabase Vault)
- Credentials never logged
- Auto-clear revealed credentials after 30 seconds
- No credential caching in browser

### 11.3 GDrive Security

- Only validate publicly accessible files
- Don't store GDrive OAuth tokens (public access only)
- Validate file type is video before accepting

---

## 12. Testing Checklist

### Phase 1: Core Kanban Flow
- [ ] Editor can submit video with GDrive URL
- [ ] Editor only sees assigned accounts
- [ ] Admin can move pending → approved
- [ ] Admin can reject with feedback
- [ ] Admin can move approved → ready_to_post
- [ ] Poster can mark as posted (requires URL)
- [ ] Bulk "mark all as posted" works
- [ ] Individual per-platform marking works
- [ ] Caption editing works until posted
- [ ] Caption locked after any platform posted
- [ ] Filtering by platform works
- [ ] Filtering by editor works
- [ ] Search by caption works
- [ ] Status history is recorded

### Phase 2: GDrive Validation
- [ ] Valid public GDrive URL accepted
- [ ] Private GDrive URL rejected with clear error
- [ ] Non-existent file rejected
- [ ] Non-video file rejected
- [ ] File metadata (name, thumbnail) extracted

### Phase 3: Video Preview
- [ ] Thumbnail displays on card
- [ ] Click thumbnail shows embedded player
- [ ] Fallback to thumbnail if embed fails
- [ ] "Open in Drive" link works

### Phase 4: Credentials Vault
- [ ] Admin can add credentials
- [ ] Poster can reveal credentials
- [ ] Access is logged
- [ ] Credentials auto-hide after 30 seconds
- [ ] Copy to clipboard works

### Phase 5: Scheduling & Notifications
- [ ] Optional schedule date/time can be set
- [ ] Real-time email sent on approval/rejection
- [ ] Daily digest email sent
- [ ] Webhook fires on status change

---

## Appendix: File Changes Summary

### New Files
- `src/components/GDriveVideoPreview.tsx`
- `src/components/brand/VideoSubmissionDrawer.tsx`
- `src/components/brand/CredentialsVaultDialog.tsx`
- `src/components/brand/MarkAsPostedDialog.tsx`
- `src/lib/submission-workflow.ts`
- `supabase/functions/validate-gdrive-access/index.ts`
- `supabase/functions/notify-submission-status/index.ts`
- `supabase/functions/send-notification-digest/index.ts`
- `supabase/migrations/XXXXXX_video_submission_updates.sql`
- `supabase/migrations/XXXXXX_credentials_vault.sql`

### Modified Files
- `src/components/SubmitBoostVideoDialog.tsx` - Add validation, account filtering
- `src/components/brand/BoostVideoReviewQueue.tsx` - Add filters, drawer, actions
- `src/integrations/supabase/types.ts` - Update types
