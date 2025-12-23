import { DiscoverTab } from "@/components/dashboard/DiscoverTab";
import PublicNavbar from "@/components/PublicNavbar";

export default function Discover() {
  return (
    <div className="min-h-screen bg-background overflow-auto">
      <PublicNavbar />
      <div className="pt-14">
        <DiscoverTab />
      </div>
    </div>
  );
}
