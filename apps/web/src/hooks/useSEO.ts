import { useMemo } from 'react';
import {
  SEOData,
  BreadcrumbItem,
  generatePageTitle,
  getCanonicalUrl,
  truncateDescription,
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  generateWebsiteSchema,
  BASE_URL,
  DEFAULT_OG_IMAGE,
} from '@/lib/seo';

interface UseSEOOptions extends SEOData {
  breadcrumbs?: BreadcrumbItem[];
  structuredData?: object | object[];
}

interface UseSEOReturn {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  ogType: string;
  noIndex: boolean;
  structuredDataJson: string;
  keywords: string;
}

/**
 * Hook for generating SEO metadata and structured data
 * Memoizes computations for performance
 */
export function useSEO(options: UseSEOOptions): UseSEOReturn {
  return useMemo(() => {
    const title = generatePageTitle(options.title);
    const description = truncateDescription(options.description);
    const canonical = options.canonical || getCanonicalUrl(window.location.pathname);
    const ogImage = options.ogImage || DEFAULT_OG_IMAGE;
    const ogType = options.ogType || 'website';
    const noIndex = options.noIndex || false;
    const keywords = options.keywords?.join(', ') || '';

    // Build structured data array
    const structuredDataArray: object[] = [];

    // Add organization and website schema for homepage
    if (window.location.pathname === '/') {
      structuredDataArray.push(generateOrganizationSchema());
      structuredDataArray.push(generateWebsiteSchema());
    }

    // Add breadcrumbs if provided
    if (options.breadcrumbs && options.breadcrumbs.length > 0) {
      structuredDataArray.push(generateBreadcrumbSchema(options.breadcrumbs));
    }

    // Add custom structured data
    if (options.structuredData) {
      if (Array.isArray(options.structuredData)) {
        structuredDataArray.push(...options.structuredData);
      } else {
        structuredDataArray.push(options.structuredData);
      }
    }

    const structuredDataJson =
      structuredDataArray.length === 1
        ? JSON.stringify(structuredDataArray[0])
        : JSON.stringify(structuredDataArray);

    return {
      title,
      description,
      canonical,
      ogImage,
      ogType,
      noIndex,
      structuredDataJson,
      keywords,
    };
  }, [
    options.title,
    options.description,
    options.canonical,
    options.ogImage,
    options.ogType,
    options.noIndex,
    options.keywords,
    options.breadcrumbs,
    options.structuredData,
  ]);
}

export { BASE_URL };
