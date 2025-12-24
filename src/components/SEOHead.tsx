import { Helmet } from 'react-helmet-async';
import { useSEO } from '@/hooks/useSEO';
import type { SEOData, BreadcrumbItem } from '@/lib/seo';

interface SEOHeadProps extends SEOData {
  breadcrumbs?: BreadcrumbItem[];
  structuredData?: object | object[];
}

/**
 * Reusable SEO component that handles all meta tags and structured data
 * Uses react-helmet-async for SSR compatibility
 */
export function SEOHead({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  noIndex = false,
  keywords,
  author,
  publishedTime,
  modifiedTime,
  breadcrumbs,
  structuredData,
}: SEOHeadProps) {
  const seo = useSEO({
    title,
    description,
    canonical,
    ogImage,
    ogType,
    noIndex,
    keywords,
    breadcrumbs,
    structuredData,
  });

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{seo.title}</title>
      <meta name="title" content={seo.title} />
      <meta name="description" content={seo.description} />
      {seo.keywords && <meta name="keywords" content={seo.keywords} />}
      {author && <meta name="author" content={author} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={seo.canonical} />
      
      {/* Robots */}
      {seo.noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seo.ogType} />
      <meta property="og:url" content={seo.canonical} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.ogImage} />
      <meta property="og:site_name" content="Virality" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seo.canonical} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.ogImage} />
      
      {/* Article specific */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      
      {/* Structured Data */}
      <script type="application/ld+json">{seo.structuredDataJson}</script>
    </Helmet>
  );
}

export default SEOHead;
