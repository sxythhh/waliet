import { useState, useRef } from "react";
import { DiscoverTab } from "@/components/dashboard/DiscoverTab";
import PublicNavbar from "@/components/PublicNavbar";
import { SEOHead } from "@/components/SEOHead";
import { useScrollUnlockOnMount } from "@/hooks/useScrollUnlockOnMount";
import { generateItemListSchema } from "@/lib/seo";

export default function Discover() {
  useScrollUnlockOnMount();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLElement>(null);

  const structuredData = generateItemListSchema({
    name: "Content Creation Opportunities",
    description: "Browse paid content creation opportunities from top brands",
    items: [],
  });

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <SEOHead
        title="Discover Campaigns"
        description="Browse and apply to paid content creation opportunities from top brands. Find campaigns that match your niche and start earning."
        keywords={['campaigns', 'content opportunities', 'brand deals', 'creator campaigns', 'UGC opportunities']}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Discover', url: '/discover' },
        ]}
        structuredData={structuredData}
      />
      <PublicNavbar 
        searchQuery={searchQuery} 
        onSearchClick={() => setSearchOverlayOpen(true)}
        scrollContainerRef={scrollContainerRef}
      />
      {/* Dedicated scroll container so page still scrolls even if body is scroll-locked */}
      <main ref={scrollContainerRef} className="flex-1 pt-14 overflow-y-auto">
        <DiscoverTab 
          navigateOnClick 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchOverlayOpen={searchOverlayOpen}
          setSearchOverlayOpen={setSearchOverlayOpen}
        />
      </main>
    </div>
  );
}
