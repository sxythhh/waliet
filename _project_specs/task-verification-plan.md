# Waliet Task Verification Implementation Plan

## Executive Summary

This plan implements a tiered verification system for Waliet based on the research document. The approach layers multiple verification methods calibrated to task value and fraud risk, starting simple and scaling with demand.

**Core Principle**: No single verification method works for everything. We'll implement a hybrid system with:
- API webhooks (highest trust) for supported platforms
- zkTLS proofs via Reclaim Protocol for arbitrary web actions
- Session recording for behavioral evidence
- Screenshot + ML analysis as fallback
- Manual review queue for edge cases

---

## Phase 1: MVP Foundation (Weeks 1-4)

### 1.1 Database Schema Additions

```sql
-- Task verification configuration
ALTER TABLE tasks ADD COLUMN verification_type TEXT DEFAULT 'screenshot';
-- Options: 'screenshot', 'api_webhook', 'reclaim_zktls', 'oauth', 'manual'

ALTER TABLE tasks ADD COLUMN verification_config JSONB DEFAULT '{}';
-- Stores platform-specific config like webhook URLs, Reclaim provider IDs

ALTER TABLE tasks ADD COLUMN reward_tier TEXT DEFAULT 'low';
-- Options: 'low' ($0.01-$1), 'medium' ($1-$10), 'high' ($10+)

-- Task submissions/evidence table
CREATE TABLE task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_application_id UUID REFERENCES task_applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Submission evidence
  screenshot_url TEXT,
  screenshot_hash TEXT, -- SHA-256 hash
  submitted_url TEXT,

  -- Device fingerprint
  device_fingerprint TEXT,
  device_fingerprint_data JSONB,

  -- Verification status
  verification_status TEXT DEFAULT 'pending',
  -- Options: 'pending', 'auto_approved', 'flagged', 'manual_review', 'approved', 'rejected'

  verification_score DECIMAL(5,2), -- 0-100 confidence score
  verification_flags TEXT[], -- Array of triggered fraud signals
  verification_notes TEXT,

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id), -- For manual reviews

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Fraud signals log
CREATE TABLE fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES task_submissions(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  -- Types: 'fast_completion', 'duplicate_device', 'suspicious_screenshot',
  --        'vpn_detected', 'time_anomaly', 'pattern_match'
  signal_data JSONB,
  severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User trust scores (for honeypot/reputation system)
CREATE TABLE user_trust_scores (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  trust_score DECIMAL(5,2) DEFAULT 50.0, -- 0-100
  total_submissions INTEGER DEFAULT 0,
  approved_submissions INTEGER DEFAULT 0,
  rejected_submissions INTEGER DEFAULT 0,
  flagged_submissions INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_submissions_status ON task_submissions(verification_status);
CREATE INDEX idx_submissions_user ON task_submissions(user_id);
CREATE INDEX idx_submissions_device ON task_submissions(device_fingerprint);
CREATE INDEX idx_fraud_signals_submission ON fraud_signals(submission_id);
```

### 1.2 Core Components

#### A. Screenshot Upload & Validation
- **UI**: Screenshot upload component in task submission flow
- **Validation**:
  - File type check (PNG, JPG, WebP)
  - Size limits (max 10MB)
  - SHA-256 hash generation
  - Basic EXIF metadata extraction
- **Storage**: Supabase Storage bucket for screenshots

#### B. Device Fingerprinting
- **Integration**: FingerprintJS Pro (or open-source alternative)
- **Capture points**:
  - On task application
  - On submission
  - Compare for consistency

#### C. Basic Fraud Rules Engine
```typescript
interface FraudRule {
  id: string;
  name: string;
  check: (submission: TaskSubmission, context: FraudContext) => FraudSignal | null;
  severity: 'low' | 'medium' | 'high';
}

const PHASE_1_RULES: FraudRule[] = [
  {
    id: 'fast_completion',
    name: 'Suspiciously Fast Completion',
    check: (submission, ctx) => {
      const minTime = ctx.task.estimated_time_minutes * 0.2; // 20% of expected
      if (submission.completion_time_minutes < minTime) {
        return { type: 'fast_completion', severity: 'medium' };
      }
      return null;
    }
  },
  {
    id: 'duplicate_device',
    name: 'Multiple Accounts Same Device',
    check: async (submission, ctx) => {
      const sameDevice = await countSubmissionsByDevice(submission.device_fingerprint);
      if (sameDevice > 3) {
        return { type: 'duplicate_device', severity: 'high' };
      }
      return null;
    }
  },
  {
    id: 'submission_frequency',
    name: 'High Submission Frequency',
    check: async (submission, ctx) => {
      const last24h = await countUserSubmissions(submission.user_id, 24);
      if (last24h > 50) {
        return { type: 'submission_frequency', severity: 'medium' };
      }
      return null;
    }
  }
];
```

#### D. Manual Review Queue
- **UI**: Admin dashboard tab for reviewing flagged submissions
- **Features**:
  - Filter by status, task, user
  - View screenshot, URL, timestamps
  - Approve/Reject with notes
  - Batch actions

### 1.3 Verification Flow (Phase 1)

```
User Completes Task
        ↓
Upload Screenshot + URL
        ↓
Capture Device Fingerprint
        ↓
Generate SHA-256 Hash
        ↓
Run Fraud Rules
        ↓
    ┌───┴───┐
    ↓       ↓
No Flags   Flags Triggered
    ↓           ↓
Auto-Approve   → Manual Review Queue
    ↓           ↓
Update Status   Admin Reviews
    ↓           ↓
Release Payment  Approve/Reject
```

---

## Phase 2: Automation & APIs (Weeks 5-8)

### 2.1 Session Recording Integration

**Tool**: PostHog (free tier: 5,000 recordings/month) or OpenReplay (self-hosted)

```typescript
// Hook into task flow
const useTaskSession = (taskId: string) => {
  useEffect(() => {
    // Start recording when user views task
    posthog.startSessionRecording();
    posthog.capture('task_started', { task_id: taskId });

    return () => {
      posthog.stopSessionRecording();
    };
  }, [taskId]);

  const submitWithSession = async (submission: SubmissionData) => {
    const sessionId = posthog.get_session_id();
    return submitTask({
      ...submission,
      session_recording_id: sessionId
    });
  };

  return { submitWithSession };
};
```

### 2.2 Platform Webhook Integrations

#### Supported Platforms (Priority Order):
1. **Discord** - Join server verification via bot
2. **Twitter/X** - Follow, like, retweet via API
3. **GitHub** - Star repo, follow user
4. **Stripe** - Purchase verification
5. **Shopify** - Order verification

#### Webhook Handler Architecture:

```typescript
// supabase/functions/webhook-verify/index.ts
interface WebhookProvider {
  name: string;
  validateSignature(req: Request): boolean;
  parseEvent(body: unknown): VerificationEvent;
  matchToTask(event: VerificationEvent): Promise<TaskSubmission | null>;
}

const providers: Record<string, WebhookProvider> = {
  discord: new DiscordWebhookProvider(),
  twitter: new TwitterWebhookProvider(),
  github: new GitHubWebhookProvider(),
  // ...
};

Deno.serve(async (req) => {
  const provider = req.headers.get('x-webhook-provider');
  const handler = providers[provider];

  if (!handler.validateSignature(req)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = handler.parseEvent(await req.json());
  const submission = await handler.matchToTask(event);

  if (submission) {
    await updateSubmissionStatus(submission.id, 'auto_approved', {
      verification_type: 'api_webhook',
      verification_score: 100,
      webhook_event: event
    });
  }

  return new Response('OK');
});
```

### 2.3 Anomaly Detection (ML-Lite)

Using Isolation Forest for anomaly scoring:

```typescript
// Features for anomaly detection
interface SubmissionFeatures {
  completion_time_ratio: number; // actual / expected
  hour_of_day: number;
  day_of_week: number;
  user_submission_count_24h: number;
  user_approval_rate: number;
  device_submission_count: number;
  task_type_experience: number; // how many similar tasks completed
}

// Simple scoring without heavy ML (can upgrade later)
const calculateAnomalyScore = (features: SubmissionFeatures): number => {
  let score = 100; // Start at 100, subtract for anomalies

  // Fast completion
  if (features.completion_time_ratio < 0.3) score -= 30;
  else if (features.completion_time_ratio < 0.5) score -= 15;

  // High volume
  if (features.user_submission_count_24h > 30) score -= 20;
  else if (features.user_submission_count_24h > 15) score -= 10;

  // Low approval rate
  if (features.user_approval_rate < 0.5) score -= 25;
  else if (features.user_approval_rate < 0.7) score -= 10;

  // Device reuse
  if (features.device_submission_count > 5) score -= 15;

  // Unusual time (2am-5am local)
  if (features.hour_of_day >= 2 && features.hour_of_day <= 5) score -= 5;

  return Math.max(0, score);
};
```

### 2.4 Updated Database Schema

```sql
-- Add webhook tracking
ALTER TABLE tasks ADD COLUMN webhook_url TEXT;
ALTER TABLE tasks ADD COLUMN webhook_secret TEXT;

-- Add session recording
ALTER TABLE task_submissions ADD COLUMN session_recording_id TEXT;
ALTER TABLE task_submissions ADD COLUMN session_recording_url TEXT;

-- Add anomaly score
ALTER TABLE task_submissions ADD COLUMN anomaly_score DECIMAL(5,2);
```

---

## Phase 3: zkTLS & Scale (Weeks 9-12)

### 3.1 Reclaim Protocol Integration

**Why Reclaim**:
- 2,500+ data providers
- No app download (App Clips / Instant Apps)
- 2-4 second proof generation
- <$1 per verification
- JavaScript/React Native SDKs

#### Integration Flow:

```typescript
// Frontend: Task submission with Reclaim
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';

const submitWithReclaim = async (task: Task) => {
  // Get provider config from task
  const providerId = task.verification_config.reclaim_provider_id;

  // Initialize Reclaim
  const reclaimRequest = await ReclaimProofRequest.init(
    RECLAIM_APP_ID,
    RECLAIM_APP_SECRET,
    providerId
  );

  // Add context (links proof to this specific task)
  reclaimRequest.addContext(
    task.id,
    `Verify completion of task: ${task.title}`
  );

  // Generate request URL (opens Reclaim flow)
  const requestUrl = await reclaimRequest.getRequestUrl();

  // Start verification session
  await reclaimRequest.startSession({
    onSuccess: async (proofs) => {
      // Submit proof to backend
      await submitTaskWithProof(task.id, proofs);
    },
    onFailure: (error) => {
      toast.error('Verification failed. Please try again.');
    }
  });

  // Open Reclaim verification
  window.open(requestUrl, '_blank');
};

// Backend: Verify Reclaim proof
import { Reclaim } from '@reclaimprotocol/js-sdk';

const verifyReclaimProof = async (proofs: ReclaimProof[]) => {
  const isValid = await Reclaim.verifySignedProof(proofs);

  if (!isValid) {
    throw new Error('Invalid proof');
  }

  // Extract verified data from proof
  const extractedData = proofs[0].claimData.context;

  return {
    verified: true,
    data: extractedData,
    proof_hash: proofs[0].identifier
  };
};
```

#### Reclaim Provider Examples:

| Task Type | Reclaim Provider | What it Proves |
|-----------|------------------|----------------|
| "Join website" | Generic login proof | User has account on domain |
| "Leave review" | Review platform proof | Review exists on user's profile |
| "Make purchase" | E-commerce order proof | Order exists in history |
| "Complete course" | Education platform proof | Course completion status |
| "Social follow" | Social media proof | Following relationship exists |

### 3.2 Tiered Verification System

```typescript
type RewardTier = 'low' | 'medium' | 'high';

interface VerificationTier {
  tier: RewardTier;
  reward_range: [number, number];
  auto_approve_threshold: number; // Anomaly score threshold
  required_verification: VerificationType[];
  spot_check_rate: number; // % manually reviewed even if auto-approved
}

const VERIFICATION_TIERS: VerificationTier[] = [
  {
    tier: 'low',
    reward_range: [0.01, 1],
    auto_approve_threshold: 70,
    required_verification: ['screenshot'],
    spot_check_rate: 0.05 // 5%
  },
  {
    tier: 'medium',
    reward_range: [1, 10],
    auto_approve_threshold: 80,
    required_verification: ['screenshot', 'session_recording'],
    spot_check_rate: 0.15 // 15%
  },
  {
    tier: 'high',
    reward_range: [10, Infinity],
    auto_approve_threshold: 95,
    required_verification: ['reclaim_zktls'], // or 'api_webhook'
    spot_check_rate: 0.30 // 30%
  }
];

const processSubmission = async (submission: TaskSubmission) => {
  const task = await getTask(submission.task_id);
  const tier = VERIFICATION_TIERS.find(t =>
    task.reward_amount >= t.reward_range[0] &&
    task.reward_amount < t.reward_range[1]
  );

  // Calculate anomaly score
  const anomalyScore = await calculateAnomalyScore(submission);

  // Check if meets auto-approve threshold
  if (anomalyScore >= tier.auto_approve_threshold) {
    // Random spot check
    if (Math.random() < tier.spot_check_rate) {
      return markForManualReview(submission, 'spot_check');
    }
    return autoApprove(submission, anomalyScore);
  }

  return markForManualReview(submission, 'below_threshold');
};
```

### 3.3 Chrome Extension (Optional Enhancement)

For power users, a Chrome extension can provide:
- Automatic screenshot capture with cryptographic attestation
- Proof that screenshot came from actual browser (not edited)
- Device binding to prevent sharing

```typescript
// Extension captures screenshot with attestation
const captureAttested = async () => {
  const screenshot = await chrome.tabs.captureVisibleTab();
  const timestamp = Date.now();
  const url = await getCurrentTabUrl();

  // Create attestation
  const attestation = {
    screenshot_hash: await sha256(screenshot),
    url,
    timestamp,
    extension_id: chrome.runtime.id,
    device_id: await getDeviceId()
  };

  // Sign with extension's key
  const signature = await sign(attestation);

  return {
    screenshot,
    attestation,
    signature
  };
};
```

### 3.4 Updated Database Schema (Phase 3)

```sql
-- Reclaim proofs
ALTER TABLE task_submissions ADD COLUMN reclaim_proof_id TEXT;
ALTER TABLE task_submissions ADD COLUMN reclaim_proof_data JSONB;

-- Chrome extension attestation
ALTER TABLE task_submissions ADD COLUMN extension_attestation JSONB;

-- Verification tier tracking
ALTER TABLE task_submissions ADD COLUMN verification_tier TEXT;
ALTER TABLE task_submissions ADD COLUMN was_spot_checked BOOLEAN DEFAULT FALSE;
```

---

## Cost Estimates (1,000 tasks/month)

| Component | Phase 1 | Phase 2 | Phase 3 |
|-----------|---------|---------|---------|
| Screenshot storage | $5 | $5 | $5 |
| FingerprintJS | $0 (free tier) | $0 | $99 (pro) |
| PostHog/Session Recording | $0 | $0 (free tier) | $0-50 |
| Reclaim Protocol | $0 | $0 | $100-500 |
| Manual Review (est.) | $500-1000 | $200-500 | $100-300 |
| **Total** | **$505-1005** | **$205-505** | **$304-954** |

*Manual review costs decrease as automation improves*

---

## Implementation Checklist

### Phase 1 (Weeks 1-4)
- [ ] Create database migrations for verification tables
- [ ] Build screenshot upload component
- [ ] Integrate FingerprintJS
- [ ] Implement basic fraud rules engine
- [ ] Build admin review queue UI
- [ ] Create verification status flow in task applications
- [ ] Add trust score tracking

### Phase 2 (Weeks 5-8)
- [ ] Integrate PostHog session recording
- [ ] Build webhook handler Edge Function
- [ ] Implement Discord bot for server join verification
- [ ] Add Twitter API integration
- [ ] Implement anomaly scoring algorithm
- [ ] Update admin dashboard with session replay

### Phase 3 (Weeks 9-12)
- [ ] Integrate Reclaim Protocol SDK
- [ ] Build Reclaim verification flow UI
- [ ] Implement tiered verification logic
- [ ] Add spot-check system
- [ ] Build verification analytics dashboard
- [ ] (Optional) Develop Chrome extension

---

## Files to Create/Modify

### New Files
```
apps/web/src/
├── components/
│   ├── task-verification/
│   │   ├── ScreenshotUpload.tsx
│   │   ├── VerificationStatus.tsx
│   │   ├── ReclaimVerification.tsx
│   │   └── ManualReviewQueue.tsx
│   └── admin/
│       └── VerificationDashboard.tsx
├── hooks/
│   ├── useTaskSubmission.ts
│   ├── useVerificationStatus.ts
│   └── useDeviceFingerprint.ts
└── lib/
    ├── fraud-detection.ts
    └── verification-tiers.ts

supabase/
├── migrations/
│   └── 20260122000000_task_verification.sql
└── functions/
    ├── webhook-verify/
    │   └── index.ts
    └── verify-reclaim-proof/
        └── index.ts
```

### Modified Files
```
apps/web/src/
├── components/dashboard/TaskCard.tsx (add verification badge)
├── pages/TaskDetail.tsx (add submission flow)
└── hooks/useTaskApplications.ts (add submission methods)
```
