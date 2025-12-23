import { DiscoverTab } from "@/components/dashboard/DiscoverTab";
import PublicNavbar from "@/components/PublicNavbar";
import { useScrollUnlockOnMount } from "@/hooks/useScrollUnlockOnMount";

export default function Discover() {
  useScrollUnlockOnMount();

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      {/* Dedicated scroll container so page still scrolls even if body is scroll-locked */}
      <main className="pt-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
        <DiscoverTab navigateOnClick />
      </main>
    </div>
  );
}

