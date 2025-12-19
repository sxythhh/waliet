/**
 * Extract brand slug from subdomain if present
 * e.g., catalyst.virality.gg → "catalyst"
 * Only works on virality.gg domain
 */
export const getSubdomainSlug = (): string | null => {
  const host = window.location.hostname;
  const parts = host.split('.');
  
  // Only detect subdomains on virality.gg
  if (parts.length === 3 && parts[1] === 'virality' && parts[2] === 'gg') {
    const subdomain = parts[0];
    // Ignore common subdomains that aren't brand slugs
    const ignoredSubdomains = ['www', 'app', 'api', 'admin', 'staging', 'dev'];
    if (!ignoredSubdomains.includes(subdomain.toLowerCase())) {
      return subdomain;
    }
  }
  
  return null;
};

/**
 * Get the base domain without subdomain
 */
export const getBaseDomain = (): string => {
  const host = window.location.hostname;
  const parts = host.split('.');
  
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  
  return host;
};

/**
 * Build the full subdomain URL for a brand
 */
export const getBrandSubdomainUrl = (slug: string): string => {
  // In production, use the actual subdomain
  if (window.location.hostname.includes('virality.gg')) {
    return `https://${slug}.virality.gg`;
  }
  
  // In development/preview, use path-based URL as fallback
  return `${window.location.origin}/b/${slug}`;
};
