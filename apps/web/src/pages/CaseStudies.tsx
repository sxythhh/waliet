import PublicNavbar from "@/components/PublicNavbar";
import { SEOHead } from "@/components/SEOHead";
import { getCanonicalUrl } from "@/lib/seo";

export default function CaseStudies() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a0a]">
      <SEOHead
        title="Case Studies | Creator Campaign Success Stories"
        description="Explore successful creator marketing campaigns and case studies. See how brands achieve results with Virality's creator network."
        canonical={getCanonicalUrl('/case-studies')}
        keywords={['case studies', 'creator marketing', 'influencer campaigns', 'success stories', 'brand campaigns']}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Case Studies', url: '/case-studies' },
        ]}
      />
      <PublicNavbar />

      {/* Embedded Content */}
      <iframe
        src="https://join.virality.gg/case-studies"
        className="flex-1 w-full border-0 mt-14"
        title="Case Studies"
      />
    </div>
  );
}
