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
    const ignoredSubdomains = ['www', 'app', 'api', 'admin', 'staging', 'dev', 'join'];
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
  return `${window.location.origin}/portal/${slug}`;
};

/**
 * Get the brand portal URL (either subdomain or path-based)
 */
export const getBrandPortalUrl = (slug: string): string => {
  // In production, use the actual subdomain for white-labeled experience
  if (window.location.hostname.includes('virality.gg')) {
    return `https://${slug}.virality.gg`;
  }

  // In development/preview, use path-based URL
  return `${window.location.origin}/portal/${slug}`;
};

/**
 * Get the campaign portal URL for a specific campaign
 * e.g., catalyst.virality.gg/summer-campaign
 */
export const getCampaignPortalUrl = (brandSlug: string, campaignSlug: string): string => {
  if (window.location.hostname.includes('virality.gg')) {
    return `https://${brandSlug}.virality.gg/${campaignSlug}`;
  }
  return `${window.location.origin}/portal/${brandSlug}/${campaignSlug}`;
};

/**
 * Generate iframe embed code for a campaign portal
 */
export const getEmbedCode = (
  brandSlug: string,
  campaignSlug: string,
  options?: {
    theme?: 'light' | 'dark';
    width?: string;
    height?: string;
  }
): string => {
  const url = getCampaignPortalUrl(brandSlug, campaignSlug);
  const params = new URLSearchParams();
  params.set('embed', 'true');
  if (options?.theme) {
    params.set('theme', options.theme);
  }

  const width = options?.width || '100%';
  const height = options?.height || '600';

  return `<iframe src="${url}?${params.toString()}" width="${width}" height="${height}" frameborder="0" style="border-radius: 12px;"></iframe>`;
};

/**
 * Check if current path should be treated as a campaign portal path
 * Returns the campaign slug if on a subdomain with a non-reserved path
 */
export const getCampaignSlugFromPath = (pathname: string): string | null => {
  // Reserved paths that shouldn't be treated as campaign slugs
  const reservedPaths = ['auth', 'callback', 'portal', 'dashboard', 'api', 'admin'];

  // Get the first segment of the path
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const firstSegment = segments[0].toLowerCase();
  if (reservedPaths.includes(firstSegment)) return null;

  return segments[0];
};
