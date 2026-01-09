/**
 * SEO Utilities for programmatic SEO implementation
 * Provides helpers for metadata generation, structured data, and canonical URLs
 */

const BASE_URL = 'https://virality.gg';
const SITE_NAME = 'Virality';
const DEFAULT_OG_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/wSW70YLPeyOrFzASIGeZhFjkFab2/social-images/social-1765737210088-subscribe! (2048 x 1152 px) (9).png';

export interface SEOData {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generates a full page title with site name suffix
 */
export function generatePageTitle(title: string, includeSiteName = true): string {
  if (!includeSiteName) return title;
  return `${title} | ${SITE_NAME}`;
}

/**
 * Generates canonical URL from path
 */
export function getCanonicalUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
}

/**
 * Truncates description to optimal SEO length (max 160 chars)
 */
export function truncateDescription(description: string, maxLength = 160): string {
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Generates Organization structured data (JSON-LD)
 */
export function generateOrganizationSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png`,
    sameAs: [
      'https://twitter.com/viralitygg',
      'https://discord.gg/virality',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: `${BASE_URL}/contact`,
    },
  };
}

/**
 * Generates WebSite structured data with search action
 */
export function generateWebsiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/discover?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generates BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Generates Article structured data for blog posts
 */
export function generateArticleSchema(options: {
  title: string;
  description: string;
  author: string;
  publishedTime: string;
  modifiedTime?: string;
  image?: string;
  url: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: options.title,
    description: options.description,
    author: {
      '@type': 'Person',
      name: options.author,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png`,
      },
    },
    datePublished: options.publishedTime,
    dateModified: options.modifiedTime || options.publishedTime,
    image: options.image || DEFAULT_OG_IMAGE,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`,
    },
  };
}

/**
 * Generates Campaign/JobPosting structured data
 */
export function generateCampaignSchema(options: {
  title: string;
  description: string;
  brandName: string;
  brandLogo?: string;
  datePosted: string;
  validThrough?: string;
  url: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: options.title,
    description: options.description,
    hiringOrganization: {
      '@type': 'Organization',
      name: options.brandName,
      logo: options.brandLogo,
    },
    datePosted: options.datePosted,
    validThrough: options.validThrough,
    employmentType: 'CONTRACTOR',
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'Worldwide',
    },
    url: options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`,
  };
}

/**
 * Generates ProfilePage structured data
 */
export function generateProfileSchema(options: {
  name: string;
  username: string;
  description?: string;
  image?: string;
  url: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: options.name,
      alternateName: options.username,
      description: options.description,
      image: options.image,
      url: options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`,
    },
  };
}

/**
 * Generates Course structured data
 */
export function generateCourseSchema(options: {
  title: string;
  description: string;
  provider?: string;
  image?: string;
  url: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: options.title,
    description: options.description,
    provider: {
      '@type': 'Organization',
      name: options.provider || SITE_NAME,
    },
    image: options.image,
    url: options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`,
  };
}

/**
 * Generates FAQ structured data
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generates ItemList structured data for collection pages
 */
export function generateItemListSchema(options: {
  name: string;
  description: string;
  items: { name: string; url: string; position: number }[];
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: options.name,
    description: options.description,
    numberOfItems: options.items.length,
    itemListElement: options.items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

export { BASE_URL, SITE_NAME, DEFAULT_OG_IMAGE };
