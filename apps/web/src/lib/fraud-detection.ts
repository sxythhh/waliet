import { supabase } from "@/integrations/supabase/client";

/**
 * Fraud Detection Rules Engine
 * Analyzes task submissions for suspicious patterns
 */

export interface FraudSignal {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  data: Record<string, unknown>;
  message: string;
}

export interface FraudContext {
  submission: {
    id: string;
    user_id: string;
    task_id: string;
    device_fingerprint: string | null;
    completion_time_seconds: number | null;
    started_at: string | null;
    submitted_at: string;
  };
  task: {
    id: string;
    estimated_time_minutes: number | null;
    reward_amount: number | null;
    reward_tier: string;
  };
  userStats: {
    total_submissions: number;
    approved_submissions: number;
    rejected_submissions: number;
    trust_score: number;
    account_age_days: number;
  };
}

export interface FraudAnalysisResult {
  score: number; // 0-100, higher is more trustworthy
  signals: FraudSignal[];
  recommendation: "auto_approve" | "review" | "flag" | "reject";
}

// ============================================
// FRAUD RULES
// ============================================

type FraudRule = (ctx: FraudContext) => FraudSignal | null;

/**
 * Rule: Fast Completion
 * Flags submissions completed much faster than expected
 */
const checkFastCompletion: FraudRule = (ctx) => {
  const { submission, task } = ctx;

  if (!task.estimated_time_minutes || !submission.completion_time_seconds) {
    return null;
  }

  const expectedSeconds = task.estimated_time_minutes * 60;
  const ratio = submission.completion_time_seconds / expectedSeconds;

  if (ratio < 0.1) {
    return {
      type: "fast_completion",
      severity: "high",
      data: {
        completion_time_seconds: submission.completion_time_seconds,
        expected_seconds: expectedSeconds,
        ratio,
      },
      message: `Completed in ${submission.completion_time_seconds}s, expected ~${expectedSeconds}s (${Math.round(ratio * 100)}% of expected time)`,
    };
  }

  if (ratio < 0.3) {
    return {
      type: "fast_completion",
      severity: "medium",
      data: {
        completion_time_seconds: submission.completion_time_seconds,
        expected_seconds: expectedSeconds,
        ratio,
      },
      message: `Completed faster than expected (${Math.round(ratio * 100)}% of expected time)`,
    };
  }

  return null;
};

/**
 * Rule: New Account
 * Flags submissions from very new accounts
 */
const checkNewAccount: FraudRule = (ctx) => {
  const { userStats } = ctx;

  if (userStats.account_age_days < 1) {
    return {
      type: "new_account",
      severity: "medium",
      data: { account_age_days: userStats.account_age_days },
      message: "Account created less than 24 hours ago",
    };
  }

  if (userStats.account_age_days < 7 && userStats.total_submissions === 0) {
    return {
      type: "new_account",
      severity: "low",
      data: { account_age_days: userStats.account_age_days },
      message: "New account with no submission history",
    };
  }

  return null;
};

/**
 * Rule: Low Trust Score
 * Flags users with poor verification history
 */
const checkLowTrustScore: FraudRule = (ctx) => {
  const { userStats } = ctx;

  // Only apply if user has history
  if (userStats.total_submissions < 3) {
    return null;
  }

  if (userStats.trust_score < 30) {
    return {
      type: "low_trust_score",
      severity: "high",
      data: {
        trust_score: userStats.trust_score,
        total_submissions: userStats.total_submissions,
        rejected_submissions: userStats.rejected_submissions,
      },
      message: `User has low trust score (${userStats.trust_score}/100)`,
    };
  }

  if (userStats.trust_score < 50) {
    return {
      type: "low_trust_score",
      severity: "medium",
      data: { trust_score: userStats.trust_score },
      message: `User has below-average trust score (${userStats.trust_score}/100)`,
    };
  }

  return null;
};

/**
 * Rule: High Value Task
 * Extra scrutiny for high-reward tasks
 */
const checkHighValueTask: FraudRule = (ctx) => {
  const { task, userStats } = ctx;

  if (task.reward_tier === "high" && userStats.total_submissions < 5) {
    return {
      type: "high_value_low_history",
      severity: "medium",
      data: {
        reward_amount: task.reward_amount,
        total_submissions: userStats.total_submissions,
      },
      message: `High-value task ($${task.reward_amount}) from user with limited history`,
    };
  }

  return null;
};

/**
 * Rule: Submission Frequency
 * Check if user is submitting too many tasks in a short period
 */
const checkSubmissionFrequency = async (ctx: FraudContext): Promise<FraudSignal | null> => {
  const { submission } = ctx;

  // Count submissions in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("task_submissions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", submission.user_id)
    .gte("submitted_at", oneDayAgo);

  const submissionsLast24h = count || 0;

  if (submissionsLast24h > 50) {
    return {
      type: "submission_frequency",
      severity: "high",
      data: { submissions_24h: submissionsLast24h },
      message: `${submissionsLast24h} submissions in last 24 hours (unusually high)`,
    };
  }

  if (submissionsLast24h > 20) {
    return {
      type: "submission_frequency",
      severity: "medium",
      data: { submissions_24h: submissionsLast24h },
      message: `${submissionsLast24h} submissions in last 24 hours`,
    };
  }

  return null;
};

/**
 * Rule: Duplicate Device
 * Check if same device fingerprint used by multiple accounts
 */
const checkDuplicateDevice = async (ctx: FraudContext): Promise<FraudSignal | null> => {
  const { submission } = ctx;

  if (!submission.device_fingerprint) {
    return null;
  }

  // Count unique users with this fingerprint
  const { data } = await supabase
    .from("task_submissions")
    .select("user_id")
    .eq("device_fingerprint", submission.device_fingerprint)
    .neq("user_id", submission.user_id)
    .limit(10);

  const uniqueUsers = new Set(data?.map((d) => d.user_id) || []);
  const otherUsersCount = uniqueUsers.size;

  if (otherUsersCount >= 3) {
    return {
      type: "duplicate_device",
      severity: "high",
      data: {
        device_fingerprint: submission.device_fingerprint,
        other_users_count: otherUsersCount,
      },
      message: `Device fingerprint shared with ${otherUsersCount} other accounts`,
    };
  }

  if (otherUsersCount >= 1) {
    return {
      type: "duplicate_device",
      severity: "medium",
      data: {
        device_fingerprint: submission.device_fingerprint,
        other_users_count: otherUsersCount,
      },
      message: `Device fingerprint shared with ${otherUsersCount} other account(s)`,
    };
  }

  return null;
};

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analyze a submission for fraud signals
 */
export async function analyzeSubmission(
  submissionId: string
): Promise<FraudAnalysisResult> {
  // Fetch submission with related data
  const { data: submission, error: subError } = await supabase
    .from("task_submissions")
    .select(`
      *,
      tasks (
        id,
        estimated_time_minutes,
        reward_amount,
        reward_tier
      )
    `)
    .eq("id", submissionId)
    .single();

  if (subError || !submission) {
    throw new Error(`Failed to fetch submission: ${subError?.message}`);
  }

  // Fetch user stats
  const { data: trustScore } = await supabase
    .from("user_trust_scores")
    .select("*")
    .eq("user_id", submission.user_id)
    .maybeSingle();

  // Fetch user profile for account age
  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", submission.user_id)
    .single();

  const accountAgeDays = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const ctx: FraudContext = {
    submission: {
      id: submission.id,
      user_id: submission.user_id,
      task_id: submission.task_id,
      device_fingerprint: submission.device_fingerprint,
      completion_time_seconds: submission.completion_time_seconds,
      started_at: submission.started_at,
      submitted_at: submission.submitted_at || submission.created_at,
    },
    task: {
      id: submission.tasks?.id || submission.task_id,
      estimated_time_minutes: submission.tasks?.estimated_time_minutes || null,
      reward_amount: submission.tasks?.reward_amount || null,
      reward_tier: submission.tasks?.reward_tier || "low",
    },
    userStats: {
      total_submissions: trustScore?.total_submissions || 0,
      approved_submissions: trustScore?.approved_submissions || 0,
      rejected_submissions: trustScore?.rejected_submissions || 0,
      trust_score: trustScore?.trust_score || 50,
      account_age_days: accountAgeDays,
    },
  };

  // Run all sync rules
  const syncRules: FraudRule[] = [
    checkFastCompletion,
    checkNewAccount,
    checkLowTrustScore,
    checkHighValueTask,
  ];

  const signals: FraudSignal[] = [];

  for (const rule of syncRules) {
    const signal = rule(ctx);
    if (signal) {
      signals.push(signal);
    }
  }

  // Run async rules
  const [frequencySignal, deviceSignal] = await Promise.all([
    checkSubmissionFrequency(ctx),
    checkDuplicateDevice(ctx),
  ]);

  if (frequencySignal) signals.push(frequencySignal);
  if (deviceSignal) signals.push(deviceSignal);

  // Calculate score (start at 100, subtract for signals)
  let score = 100;
  for (const signal of signals) {
    switch (signal.severity) {
      case "critical":
        score -= 40;
        break;
      case "high":
        score -= 25;
        break;
      case "medium":
        score -= 15;
        break;
      case "low":
        score -= 5;
        break;
    }
  }
  score = Math.max(0, score);

  // Determine recommendation
  let recommendation: FraudAnalysisResult["recommendation"];
  const hasCritical = signals.some((s) => s.severity === "critical");
  const hasHigh = signals.some((s) => s.severity === "high");

  if (hasCritical) {
    recommendation = "reject";
  } else if (hasHigh) {
    recommendation = "flag";
  } else if (score < 70) {
    recommendation = "review";
  } else {
    recommendation = "auto_approve";
  }

  // Store signals in database
  if (signals.length > 0) {
    await supabase.from("fraud_signals").insert(
      signals.map((signal) => ({
        submission_id: submissionId,
        user_id: submission.user_id,
        signal_type: signal.type,
        signal_data: signal.data,
        severity: signal.severity,
      }))
    );
  }

  // Update submission with score and flags
  await supabase
    .from("task_submissions")
    .update({
      verification_score: score,
      verification_flags: signals.map((s) => s.type),
      verification_status:
        recommendation === "auto_approve"
          ? "auto_approved"
          : recommendation === "reject"
            ? "rejected"
            : "flagged",
    })
    .eq("id", submissionId);

  return { score, signals, recommendation };
}

/**
 * Get verification tier thresholds based on reward amount
 */
export function getVerificationTier(rewardAmount: number | null): {
  tier: string;
  autoApproveThreshold: number;
  spotCheckRate: number;
} {
  const amount = rewardAmount || 0;

  if (amount < 1) {
    return { tier: "low", autoApproveThreshold: 70, spotCheckRate: 0.05 };
  } else if (amount < 10) {
    return { tier: "medium", autoApproveThreshold: 80, spotCheckRate: 0.15 };
  } else {
    return { tier: "high", autoApproveThreshold: 95, spotCheckRate: 0.3 };
  }
}
