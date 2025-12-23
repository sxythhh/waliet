import { useState } from "react";
import { DiscoverTab } from "@/components/dashboard/DiscoverTab";
import PublicNavbar from "@/components/PublicNavbar";
import { useScrollUnlockOnMount } from "@/hooks/useScrollUnlockOnMount";

export default function Discover() {
  useScrollUnlockOnMount();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <PublicNavbar 
        searchQuery={searchQuery} 
        onSearchClick={() => setSearchOverlayOpen(true)} 
      />
      {/* Dedicated scroll container so page still scrolls even if body is scroll-locked */}
      <main className="flex-1 pt-14 overflow-y-auto">
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

