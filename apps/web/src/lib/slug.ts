/**
 * Centralized slug generation utilities
 * Provides consistent slug generation across the application
 */

/**
 * Generate a URL-friendly slug from any string
 * @param input - The string to convert to a slug
 * @param options - Configuration options
 * @returns A URL-friendly slug
 */
export function generateSlug(
  input: string,
  options: {
    /** Fallback slug if input is empty or results in empty slug */
    fallback?: string;
    /** Maximum length for the slug (default: unlimited) */
    maxLength?: number;
    /** Allow numbers at the start (default: true) */
    allowLeadingNumbers?: boolean;
  } = {}
): string {
  const { fallback = "untitled", maxLength, allowLeadingNumbers = true } = options;

  if (!input || typeof input !== "string") {
    return fallback;
  }

  let slug = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

  // Remove leading numbers if not allowed
  if (!allowLeadingNumbers) {
    slug = slug.replace(/^[0-9-]+/, "");
  }

  // Apply max length
  if (maxLength && slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(/-$/, "");
  }

  return slug || fallback;
}

/**
 * Generate a unique slug by appending a random suffix
 * Useful when creating items that need unique slugs
 * @param input - The string to convert to a slug
 * @returns A slug with a random 4-character suffix
 */
export function generateUniqueSlug(input: string): string {
  const baseSlug = generateSlug(input, { fallback: "item" });
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${suffix}`;
}

/**
 * Validate if a string is a valid slug
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== "string") return false;
  // Valid slugs: lowercase alphanumeric with hyphens, no leading/trailing hyphens
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Sanitize user-provided slug input
 * @param input - User input to sanitize
 * @returns A valid slug
 */
export function sanitizeSlugInput(input: string): string {
  return generateSlug(input, { fallback: "" });
}
