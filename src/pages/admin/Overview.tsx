import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { ApiActivityTab } from "@/components/admin/ApiActivityTab";
import { SendAnnouncementDialog } from "@/components/admin/SendAnnouncementDialog";

export default function AdminOverview() {
  return (
    <div className="w-full h-full p-4 md:p-6 pt-16 md:pt-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold font-inter tracking-[-0.5px]">Overview</h1>
          <SendAnnouncementDialog />
        </div>
        <AnalyticsTab />
        <ApiActivityTab />
      </div>
    </div>
  );
}