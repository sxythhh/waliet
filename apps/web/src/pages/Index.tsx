import { Navigate } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";
import { SEOHead } from "@/components/SEOHead";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { user, loading } = useAuth();
  const structuredData = [generateOrganizationSchema(), generateWebsiteSchema()];

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
      </div>
    );
  }

  // Redirect logged-in users to discover page
  if (user) {
    return <Navigate to="/discover" replace />;
  }

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
