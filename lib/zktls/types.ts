/**
 * zkTLS verification types and utilities
 */

export interface VerificationStatus {
  verified: boolean;
  verifiedAt?: Date | string;
  expiresAt?: Date | string;
}

/**
 * Check if verification is expiring soon (within 30 days)
 */
export function isVerificationExpiringSoon(status: VerificationStatus | null | undefined): boolean {
  if (!status?.expiresAt) return false;
  const expiresAt = new Date(status.expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
}

/**
 * Check if verification has expired
 */
export function isVerificationExpired(status: VerificationStatus | null | undefined): boolean {
  if (!status?.expiresAt) return false;
  const expiresAt = new Date(status.expiresAt);
  return new Date() > expiresAt;
}

/**
 * Get days until verification expires
 */
export function getDaysUntilExpiry(status: VerificationStatus | null | undefined): number {
  if (!status?.expiresAt) return 0;
  const expiresAt = new Date(status.expiresAt);
  const now = new Date();
  return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}
