import { DiscoverTab } from "@/components/dashboard/DiscoverTab";
import PublicNavbar from "@/components/PublicNavbar";
import { useScrollUnlockOnMount } from "@/hooks/useScrollUnlockOnMount";

export default function Discover() {
  useScrollUnlockOnMount();

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <main className="pt-14">
        <DiscoverTab />
      </main>
    </div>
  );
}
