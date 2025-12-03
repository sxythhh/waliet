import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { ApiActivityTab } from "@/components/admin/ApiActivityTab";

export default function AdminOverview() {
  return <div className="w-full h-full p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <AnalyticsTab />
        <ApiActivityTab />
      </div>
    </div>;
}