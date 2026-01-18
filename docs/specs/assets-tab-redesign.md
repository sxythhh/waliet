# Assets Tab Redesign Specification

## Overview

Replace the current iframe-based asset display with a native, full-featured asset management system that allows brands to upload, organize, and share brand materials with creators.

**Current State**: Simple iframe embedding `assets_url` from brands table
**Target State**: Native asset library with categories, previews, download tracking, and asset requests

---

## Tech Stack (Existing)

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | Shadcn/UI + Radix UI |
| Styling | Tailwind CSS (dark theme) |
| State | TanStack Query |
| Backend | Supabase (PostgreSQL + Storage) |
| Icons | Lucide React |

---

## Database Schema

### New Tables

```sql
-- Asset categories (predefined types)
CREATE TYPE asset_type AS ENUM ('image', 'video', 'document', 'link');

-- Main assets table
CREATE TABLE brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  description TEXT,
  type asset_type NOT NULL,

  -- Storage (for uploaded files)
  file_path TEXT,              -- Supabase storage path
  file_url TEXT,               -- Public CDN URL
  file_size BIGINT,            -- Size in bytes
  mime_type TEXT,

  -- External links (for type='link')
  external_url TEXT,

  -- Thumbnail (auto-generated or custom)
  thumbnail_url TEXT,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Tracking
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Download/view tracking
CREATE TABLE asset_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES brand_assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Asset requests from creators
CREATE TABLE asset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),

  -- Request details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  asset_type asset_type,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')),
  response_note TEXT,
  fulfilled_asset_id UUID REFERENCES brand_assets(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_brand_assets_brand_id ON brand_assets(brand_id);
CREATE INDEX idx_brand_assets_type ON brand_assets(type);
CREATE INDEX idx_asset_downloads_asset_id ON asset_downloads(asset_id);
CREATE INDEX idx_asset_requests_brand_id ON asset_requests(brand_id);
CREATE INDEX idx_asset_requests_status ON asset_requests(status);
```

### Row Level Security (RLS)

```sql
-- brand_assets: Brand members can view, admins can modify
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand members can view assets"
  ON brand_assets FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Brand admins can manage assets"
  ON brand_assets FOR ALL
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- asset_requests: Creators can create, brand admins can manage
ALTER TABLE asset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create requests for their brands"
  ON asset_requests FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM brand_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own requests"
  ON asset_requests FOR SELECT
  USING (
    requested_by = auth.uid() OR
    brand_id IN (
      SELECT brand_id FROM brand_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

### Storage Bucket

```sql
-- Create storage bucket for assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true);

-- Storage policies
CREATE POLICY "Brand admins can upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM brands
      WHERE id IN (
        SELECT brand_id FROM brand_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );
```

---

## Component Architecture

```
src/
├── pages/
│   └── BrandAssets.tsx              # Main page (refactored)
│
├── components/
│   └── assets/
│       ├── AssetLibrary.tsx         # Main container component
│       ├── AssetHeader.tsx          # Search, filters, view toggle, actions
│       ├── AssetGrid.tsx            # Grid view layout
│       ├── AssetList.tsx            # List view layout
│       ├── AssetCard.tsx            # Individual asset card (grid)
│       ├── AssetRow.tsx             # Individual asset row (list)
│       ├── AssetPreview.tsx         # Modal preview for assets
│       ├── AssetUploadDialog.tsx    # Upload new assets
│       ├── AssetEditDialog.tsx      # Edit asset details
│       ├── AssetRequestDialog.tsx   # Request new asset (creator)
│       ├── AssetRequestsList.tsx    # View pending requests (admin)
│       ├── AssetEmptyState.tsx      # Instructional empty state
│       ├── AssetTypeFilter.tsx      # Category tabs/filter
│       └── AssetThumbnail.tsx       # Thumbnail with type icon overlay
│
├── hooks/
│   └── assets/
│       ├── useAssets.ts             # Fetch assets with filters
│       ├── useAssetUpload.ts        # Upload handling
│       ├── useAssetDownload.ts      # Download with tracking
│       ├── useAssetRequests.ts      # Asset requests CRUD
│       └── useAssetStats.ts         # Download/view statistics
│
└── types/
    └── assets.ts                    # TypeScript interfaces
```

---

## UI Components Specification

### 1. AssetHeader

```
┌─────────────────────────────────────────────────────────────────────┐
│  Assets                                                              │
│  Brand resources and materials for your content                      │
│                                                                      │
│  ┌──────────────────┐  ┌─────────┐  ┌────┐ ┌────┐  ┌─────────────┐  │
│  │ 🔍 Search assets │  │ All ▾   │  │ ▦  │ │ ☰  │  │ + Add Asset │  │
│  └──────────────────┘  └─────────┘  └────┘ └────┘  └─────────────┘  │
│                         Filter      Grid   List     (Admin only)    │
└─────────────────────────────────────────────────────────────────────┘
```

**Props:**
- `searchQuery: string`
- `onSearchChange: (query: string) => void`
- `activeFilter: AssetType | 'all'`
- `onFilterChange: (filter: AssetType | 'all') => void`
- `viewMode: 'grid' | 'list'`
- `onViewModeChange: (mode: 'grid' | 'list') => void`
- `isAdmin: boolean`

### 2. AssetTypeFilter

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌───────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐  ┌───────┐     │
│  │  All  │  │ Images  │  │ Videos  │  │ Documents │  │ Links │     │
│  │  (24) │  │  (12)   │  │   (5)   │  │    (4)    │  │  (3)  │     │
│  └───────┘  └─────────┘  └─────────┘  └───────────┘  └───────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

**Visual:**
- Horizontal pill/tab buttons
- Active state: `bg-primary text-primary-foreground`
- Count badge inside each tab
- Icons: Image, Video, FileText, Link2

### 3. AssetCard (Grid View)

```
┌─────────────────────────┐
│  ┌───────────────────┐  │
│  │                   │  │
│  │    [Thumbnail]    │  │
│  │                   │  │
│  │         🖼️        │  │  ← Type icon overlay (bottom-right)
│  └───────────────────┘  │
│                         │
│  Logo Guidelines.pdf    │  ← Name (truncated)
│  PDF • 2.4 MB          │  ← Type + Size
│  ↓ 47 downloads        │  ← Download count
│                         │
│  ┌─────────┐ ┌───────┐  │
│  │ Preview │ │   ↓   │  │  ← Action buttons on hover
│  └─────────┘ └───────┘  │
└─────────────────────────┘
```

**Props:**
- `asset: BrandAsset`
- `onPreview: () => void`
- `onDownload: () => void`
- `onEdit?: () => void` (admin only)

**Styling:**
- Card: `bg-card border border-border rounded-lg hover:border-primary/50 transition-colors`
- Thumbnail container: `aspect-video bg-muted rounded-md overflow-hidden`
- Actions: Hidden by default, shown on hover with `opacity-0 group-hover:opacity-100`

### 4. AssetRow (List View)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌────┐                                                             │
│  │ 🖼️ │  Logo Guidelines.pdf    PDF      2.4 MB    47 ↓    Dec 5   │
│  └────┘  Brand logo usage...    Document           downloads        │
│                                                          ┌───┐ ┌───┐│
│                                                          │ 👁 │ │ ↓ ││
│                                                          └───┘ └───┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Columns:**
1. Thumbnail (40x40)
2. Name + Description
3. Type badge
4. File size
5. Download count
6. Date added
7. Actions (preview, download)

### 5. AssetEmptyState

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                          ┌─────────────┐                             │
│                          │             │                             │
│                          │   📁 🖼️ 🎬   │                             │
│                          │             │                             │
│                          └─────────────┘                             │
│                                                                      │
│                    No assets uploaded yet                            │
│                                                                      │
│         Upload brand materials for your creators to use:             │
│                                                                      │
│         🖼️  Images    Logos, product photos, graphics                │
│         🎬  Videos    B-roll, intros, outros, tutorials              │
│         📄  Documents Guidelines, scripts, briefs                    │
│         🔗  Links     Tools, resources, reference sites              │
│                                                                      │
│                     ┌─────────────────────┐                          │
│                     │  + Upload First Asset │   (Admin)              │
│                     └─────────────────────┘                          │
│                                                                      │
│         ─────────────── or ───────────────                           │
│                                                                      │
│                    ┌───────────────────┐                             │
│                    │  Request an Asset  │   (Creator)                │
│                    └───────────────────┘                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Creator View** (non-admin):
- Hide "Upload First Asset" button
- Show "Request an Asset" as primary CTA

### 6. AssetUploadDialog

```
┌─────────────────────────────────────────────────────────────────────┐
│  Upload Asset                                                   ✕   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Asset Type                                                          │
│  ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌─────────┐                  │
│  │ 🖼️ Image│ │ 🎬 Video│ │ 📄 Document│ │ 🔗 Link │                  │
│  └─────────┘ └─────────┘ └───────────┘ └─────────┘                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │     Drag & drop files here, or click to browse              │    │
│  │                                                              │    │
│  │     PNG, JPG, GIF, MP4, MOV, PDF, DOC up to 100MB           │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ── or for links ──                                                  │
│                                                                      │
│  External URL                                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ https://                                                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Name *                                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Brand Logo - Dark Version                                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Description                                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Use this logo on dark backgrounds. PNG with transparency.   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│                                        ┌──────────┐ ┌──────────┐    │
│                                        │  Cancel  │ │  Upload  │    │
│                                        └──────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

**Validation (Zod):**
```typescript
const uploadSchema = z.object({
  type: z.enum(['image', 'video', 'document', 'link']),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  file: z.instanceof(File).optional(),
  external_url: z.string().url().optional(),
}).refine(
  (data) => data.type === 'link' ? !!data.external_url : !!data.file,
  { message: 'File or URL required' }
);
```

### 7. AssetRequestDialog (Creator)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Request an Asset                                               ✕   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  What do you need?                                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ High-resolution product photos                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Describe what you're looking for                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ I'm creating a review video and need product photos from    │    │
│  │ multiple angles. Preferably PNG with transparent background │    │
│  │ for overlays.                                                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Asset Type (optional)                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Images                                                    ▾ │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Priority                                                            │
│  ○ Low   ◉ Normal   ○ High                                          │
│                                                                      │
│                                        ┌──────────┐ ┌──────────┐    │
│                                        │  Cancel  │ │  Submit  │    │
│                                        └──────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 8. AssetPreview (Modal)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Brand Logo - Dark Version                                      ✕   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │                                                              │    │
│  │                      [Large Preview]                         │    │
│  │                                                              │    │
│  │                                                              │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Use this logo on dark backgrounds. PNG with transparency.           │
│                                                                      │
│  Type: Image (PNG)                                                   │
│  Size: 2.4 MB                                                        │
│  Dimensions: 2000 x 1000                                             │
│  Uploaded: Dec 5, 2024                                               │
│  Downloads: 47                                                       │
│                                                                      │
│                                                   ┌────────────────┐ │
│                                                   │  ↓ Download    │ │
│                                                   └────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Preview Types:**
- **Images**: Direct `<img>` rendering
- **Videos**: `<video>` player with controls
- **Documents**: PDF.js viewer or thumbnail + download
- **Links**: Link preview card with favicon + meta description

---

## TypeScript Interfaces

```typescript
// types/assets.ts

export type AssetType = 'image' | 'video' | 'document' | 'link';

export interface BrandAsset {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  type: AssetType;
  file_path: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  download_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AssetRequest {
  id: string;
  brand_id: string;
  requested_by: string;
  title: string;
  description: string;
  asset_type: AssetType | null;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'declined';
  response_note: string | null;
  fulfilled_asset_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  // Joined fields
  requester?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface AssetFilters {
  type?: AssetType | 'all';
  search?: string;
  tags?: string[];
}

export type ViewMode = 'grid' | 'list';
```

---

## React Query Hooks

### useAssets

```typescript
// hooks/assets/useAssets.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BrandAsset, AssetFilters } from '@/types/assets';

export function useAssets(brandId: string, filters?: AssetFilters) {
  return useQuery({
    queryKey: ['assets', brandId, filters],
    queryFn: async () => {
      let query = supabase
        .from('brand_assets')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BrandAsset[];
    },
    enabled: !!brandId,
  });
}
```

### useAssetUpload

```typescript
// hooks/assets/useAssetUpload.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateThumbnail } from '@/lib/thumbnails';

interface UploadParams {
  brandId: string;
  name: string;
  description?: string;
  type: AssetType;
  file?: File;
  externalUrl?: string;
}

export function useAssetUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UploadParams) => {
      const { brandId, name, description, type, file, externalUrl } = params;

      let fileUrl: string | null = null;
      let filePath: string | null = null;
      let fileSize: number | null = null;
      let mimeType: string | null = null;
      let thumbnailUrl: string | null = null;

      // Upload file if provided
      if (file) {
        const ext = file.name.split('.').pop();
        const fileName = `${brandId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('brand-assets')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('brand-assets')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
        filePath = fileName;
        fileSize = file.size;
        mimeType = file.type;

        // Generate thumbnail for images/videos
        if (type === 'image' || type === 'video') {
          thumbnailUrl = await generateThumbnail(file, brandId);
        }
      }

      // Insert asset record
      const { data, error } = await supabase
        .from('brand_assets')
        .insert({
          brand_id: brandId,
          name,
          description,
          type,
          file_path: filePath,
          file_url: fileUrl,
          file_size: fileSize,
          mime_type: mimeType,
          external_url: externalUrl,
          thumbnail_url: thumbnailUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: ['assets', brandId] });
    },
  });
}
```

### useAssetDownload

```typescript
// hooks/assets/useAssetDownload.ts

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BrandAsset } from '@/types/assets';

export function useAssetDownload() {
  return useMutation({
    mutationFn: async (asset: BrandAsset) => {
      // Track download
      await supabase.from('asset_downloads').insert({
        asset_id: asset.id,
      });

      // Increment counter
      await supabase
        .from('brand_assets')
        .update({ download_count: asset.download_count + 1 })
        .eq('id', asset.id);

      // Trigger download
      if (asset.file_url) {
        const link = document.createElement('a');
        link.href = asset.file_url;
        link.download = asset.name;
        link.click();
      } else if (asset.external_url) {
        window.open(asset.external_url, '_blank');
      }
    },
  });
}
```

---

## Implementation Phases

### Phase 1: Database & Core Infrastructure
1. Create Supabase migration for new tables
2. Set up storage bucket and policies
3. Generate TypeScript types
4. Create base hooks (useAssets, useAssetUpload)

### Phase 2: Basic UI Components
1. AssetLibrary container component
2. AssetHeader with search and view toggle
3. AssetCard and AssetRow components
4. AssetEmptyState

### Phase 3: Upload & Management
1. AssetUploadDialog with drag-drop
2. AssetEditDialog for metadata
3. AssetPreview modal
4. Thumbnail generation

### Phase 4: Category Filtering & Polish
1. AssetTypeFilter tabs
2. Download tracking integration
3. View count tracking
4. Animations and transitions

### Phase 5: Asset Requests
1. AssetRequestDialog
2. AssetRequestsList (admin view)
3. Request status management
4. Notifications

---

## File Size & Type Limits

| Type | Max Size | Allowed Formats |
|------|----------|-----------------|
| Image | 25 MB | PNG, JPG, JPEG, GIF, WEBP, SVG |
| Video | 100 MB | MP4, MOV, WEBM |
| Document | 50 MB | PDF, DOC, DOCX, TXT, MD |
| Link | N/A | Valid URL |

---

## Responsive Behavior

| Breakpoint | Grid Columns | View Mode |
|------------|--------------|-----------|
| < 640px (sm) | 1 | List forced |
| 640-768px (md) | 2 | User choice |
| 768-1024px (lg) | 3 | User choice |
| > 1024px (xl) | 4 | User choice |

---

## Accessibility Requirements

- All interactive elements keyboard navigable
- Focus indicators on cards and buttons
- Alt text for all thumbnails
- ARIA labels for icon-only buttons
- Announce download start/completion to screen readers
- Color contrast ratio ≥ 4.5:1

---

## Analytics Events (PostHog)

```typescript
// Track asset interactions
posthog.capture('asset_viewed', { asset_id, asset_type, brand_id });
posthog.capture('asset_downloaded', { asset_id, asset_type, brand_id });
posthog.capture('asset_uploaded', { asset_type, file_size, brand_id });
posthog.capture('asset_request_submitted', { asset_type, priority, brand_id });
```

---

## Migration from Current Implementation

1. Keep `assets_url` field for backwards compatibility
2. Show "Legacy Assets" link if `assets_url` exists
3. New assets system is primary, iframe fallback secondary
4. No data migration needed (current is just iframe URL)
