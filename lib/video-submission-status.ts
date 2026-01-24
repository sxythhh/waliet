/**
 * Video Submission Status Transition Logic
 *
 * This utility handles the business logic for video submission status transitions,
 * including per-platform status management and validation.
 */

export type OverallStatus = "pending" | "approved" | "ready_to_post" | "posted" | "rejected";
export type PlatformStatus = "pending" | "approved" | "ready_to_post" | "posted" | "rejected" | "skipped" | null;
export type Platform = "tiktok" | "instagram" | "youtube";

export interface StatusTransitionConfig {
  canApprove: boolean; // owner, admin
  canPost: boolean; // owner, admin, poster
}

export interface VideoSubmissionStatuses {
  status: OverallStatus;
  status_tiktok: PlatformStatus;
  status_instagram: PlatformStatus;
  status_youtube: PlatformStatus;
  posted_url_tiktok?: string | null;
  posted_url_instagram?: string | null;
  posted_url_youtube?: string | null;
}

/**
 * Valid status transitions for overall status
 */
const VALID_TRANSITIONS: Record<OverallStatus, OverallStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["pending", "ready_to_post", "rejected"],
  ready_to_post: ["approved", "posted", "rejected"],
  posted: [], // Final state, no transitions out
  rejected: ["pending"], // Can be reconsidered
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  from: OverallStatus,
  to: OverallStatus,
  config: StatusTransitionConfig
): boolean {
  // Check if transition is allowed by business rules
  if (!VALID_TRANSITIONS[from].includes(to)) {
    return false;
  }

  // Check permissions for specific transitions
  if (to === "approved" && !config.canApprove) {
    return false;
  }
  if (to === "rejected" && !config.canApprove) {
    return false;
  }
  if ((to === "ready_to_post" || to === "posted") && !config.canPost) {
    return false;
  }
  if (to === "pending" && from !== "rejected" && !config.canApprove) {
    return false;
  }

  return true;
}

/**
 * Get allowed next statuses for a given current status
 */
export function getAllowedTransitions(
  currentStatus: OverallStatus,
  config: StatusTransitionConfig
): OverallStatus[] {
  return VALID_TRANSITIONS[currentStatus].filter((status) =>
    isValidTransition(currentStatus, status, config)
  );
}

/**
 * Get the next status in the workflow (for quick advance button)
 */
export function getNextWorkflowStatus(
  currentStatus: OverallStatus,
  config: StatusTransitionConfig
): OverallStatus | null {
  const workflowOrder: OverallStatus[] = ["pending", "approved", "ready_to_post", "posted"];
  const currentIndex = workflowOrder.indexOf(currentStatus);

  if (currentIndex === -1 || currentIndex === workflowOrder.length - 1) {
    return null;
  }

  const nextStatus = workflowOrder[currentIndex + 1];

  if (isValidTransition(currentStatus, nextStatus, config)) {
    return nextStatus;
  }

  return null;
}

/**
 * Calculate overall status based on per-platform statuses
 */
export function calculateOverallStatus(statuses: VideoSubmissionStatuses): OverallStatus {
  const platformStatuses = [
    statuses.status_tiktok,
    statuses.status_instagram,
    statuses.status_youtube,
  ].filter((s) => s && s !== "skipped") as PlatformStatus[];

  // If no active platforms, return pending
  if (platformStatuses.length === 0) {
    return "pending";
  }

  // If all are posted, overall is posted
  if (platformStatuses.every((s) => s === "posted")) {
    return "posted";
  }

  // If any are rejected, overall is rejected (unless some are posted)
  const hasPosted = platformStatuses.some((s) => s === "posted");
  const hasRejected = platformStatuses.some((s) => s === "rejected");

  if (hasRejected && !hasPosted) {
    return "rejected";
  }

  // If any are ready_to_post (and none posted), overall is ready_to_post
  if (platformStatuses.some((s) => s === "ready_to_post")) {
    return "ready_to_post";
  }

  // If any are approved (and none ready_to_post or posted), overall is approved
  if (platformStatuses.some((s) => s === "approved")) {
    return "approved";
  }

  // Default to pending
  return "pending";
}

/**
 * Check if a platform status can transition to a new status
 */
export function canTransitionPlatform(
  currentStatus: PlatformStatus,
  newStatus: PlatformStatus,
  config: StatusTransitionConfig
): boolean {
  // Can't transition skipped or null platforms
  if (currentStatus === "skipped" || currentStatus === null) {
    return false;
  }

  // Once posted, can't change
  if (currentStatus === "posted") {
    return false;
  }

  // Check permissions
  if (newStatus === "approved" || newStatus === "rejected") {
    return config.canApprove;
  }
  if (newStatus === "ready_to_post" || newStatus === "posted") {
    return config.canPost;
  }

  return false;
}

/**
 * Validate that posted URL is provided when marking as posted
 */
export function validatePostedTransition(
  platform: Platform,
  newStatus: PlatformStatus,
  postedUrl: string | null | undefined
): { valid: boolean; error?: string } {
  if (newStatus === "posted") {
    if (!postedUrl || postedUrl.trim() === "") {
      return {
        valid: false,
        error: `Posted URL required for ${platform} when marking as posted`,
      };
    }
  }
  return { valid: true };
}

/**
 * Get platform display info
 */
export const PLATFORM_INFO: Record<
  Platform,
  { label: string; icon: string; fullName: string }
> = {
  tiktok: { label: "TT", icon: "logos:tiktok-icon", fullName: "TikTok" },
  instagram: { label: "IG", icon: "skill-icons:instagram", fullName: "Instagram" },
  youtube: { label: "YT", icon: "logos:youtube-icon", fullName: "YouTube" },
};

/**
 * Get status display info
 */
export const STATUS_INFO: Record<
  OverallStatus,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    color: "bg-blue-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  ready_to_post: {
    label: "Ready to Post",
    color: "bg-violet-500",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-600 dark:text-violet-400",
  },
  posted: {
    label: "Posted",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500",
    bgColor: "bg-red-500/10",
    textColor: "text-red-600 dark:text-red-400",
  },
};

/**
 * Check if caption can be edited (not posted to any platform)
 */
export function canEditCaption(statuses: VideoSubmissionStatuses): boolean {
  return (
    statuses.status_tiktok !== "posted" &&
    statuses.status_instagram !== "posted" &&
    statuses.status_youtube !== "posted"
  );
}

/**
 * Get active platforms (not skipped or null)
 */
export function getActivePlatforms(
  statuses: VideoSubmissionStatuses
): { platform: Platform; status: PlatformStatus }[] {
  const platforms: { platform: Platform; status: PlatformStatus }[] = [];

  if (statuses.status_tiktok && statuses.status_tiktok !== "skipped") {
    platforms.push({ platform: "tiktok", status: statuses.status_tiktok });
  }
  if (statuses.status_instagram && statuses.status_instagram !== "skipped") {
    platforms.push({ platform: "instagram", status: statuses.status_instagram });
  }
  if (statuses.status_youtube && statuses.status_youtube !== "skipped") {
    platforms.push({ platform: "youtube", status: statuses.status_youtube });
  }

  return platforms;
}

/**
 * Check if submission has platforms ready to be marked as posted
 */
export function hasPlatformsReadyToPost(statuses: VideoSubmissionStatuses): boolean {
  const activePlatforms = getActivePlatforms(statuses);
  return activePlatforms.some(
    (p) => p.status === "ready_to_post" || p.status === "approved"
  );
}
