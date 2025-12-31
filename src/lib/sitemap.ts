/**
 * Static sitemap routes configuration
 * Used for generating sitemap.xml
 */

export interface SitemapRoute {
  path: string;
  priority: number;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  lastmod?: string;
}

// Static routes that should be indexed
export const staticRoutes: SitemapRoute[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/discover', priority: 0.9, changefreq: 'hourly' },
  { path: '/resources', priority: 0.8, changefreq: 'weekly' },
  { path: '/blog', priority: 0.8, changefreq: 'weekly' },
  { path: '/contact', priority: 0.6, changefreq: 'monthly' },
  { path: '/apply', priority: 0.7, changefreq: 'monthly' },
  { path: '/new', priority: 0.7, changefreq: 'monthly' },
  { path: '/case-studies', priority: 0.7, changefreq: 'weekly' },
  { path: '/support', priority: 0.5, changefreq: 'monthly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/creator-terms', priority: 0.3, changefreq: 'yearly' },
  { path: '/install', priority: 0.5, changefreq: 'monthly' },
  { path: '/leaderboard', priority: 0.6, changefreq: 'daily' },
];

// Routes that should not be indexed (private/auth routes)
export const noIndexRoutes = [
  '/auth',
  '/auth/callback',
  '/reset-password',
  '/discord/callback',
  '/x/callback',
  '/dashboard',
  '/admin',
  '/manage',
  '/campaign',
  '/referrals',
];

/**
 * Check if a route should be indexed
 */
export function shouldIndexRoute(path: string): boolean {
  return !noIndexRoutes.some(route => path.startsWith(route));
}

/**
 * Get priority for dynamic routes
 */
export function getDynamicRoutePriority(type: 'campaign' | 'boost' | 'blog' | 'brand' | 'profile' | 'course'): number {
  const priorities: Record<string, number> = {
    campaign: 0.8,
    boost: 0.8,
    blog: 0.7,
    brand: 0.7,
    profile: 0.5,
    course: 0.7,
  };
  return priorities[type] || 0.5;
}
