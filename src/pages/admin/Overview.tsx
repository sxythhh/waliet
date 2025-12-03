import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { ApiActivityTab } from "@/components/admin/ApiActivityTab";

export default function AdminOverview() {
  return (
    <div className="w-full h-full p-4 md:p-6 pt-16 md:pt-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <AnalyticsTab />
        <ApiActivityTab />
      </div>
    </div>
  );
}