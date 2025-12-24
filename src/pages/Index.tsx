import PublicNavbar from "@/components/PublicNavbar";
import { SEOHead } from "@/components/SEOHead";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";

export default function Index() {
  const structuredData = [generateOrganizationSchema(), generateWebsiteSchema()];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a0a]">
      <SEOHead
        title="Content Opportunities"
        description="Where Creators Get Paid. Discover or Launch Content Creation Opportunities with Virality. Find top video editing talent from our network."
        keywords={['creator economy', 'content creators', 'brand deals', 'influencer marketing', 'UGC', 'video creators']}
        structuredData={structuredData}
      />
      <PublicNavbar />

      {/* Embedded Content */}
      <div className="flex-1 pt-14">
        <iframe 
          src="https://join.virality.gg" 
          className="w-full h-full border-0" 
          title="Virality - Where Creators Get Paid" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
        />
      </div>
    </div>
  );
}
