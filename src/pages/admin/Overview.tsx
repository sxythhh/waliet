import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarmapTab } from "@/components/admin/WarmapTab";
import { WorkTab } from "@/components/admin/WorkTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { SalesTab } from "@/components/admin/SalesTab";
export default function AdminOverview() {
  const [activeTab, setActiveTab] = useState("warmap");
  return <div className="w-full h-full p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-fit mx-auto mb-6 bg-card rounded-full p-1 shadow-lg">
            <TabsTrigger value="warmap" className="rounded-full px-6 data-[state=active]:bg-[#1C1C1C]">
              Warmap
            </TabsTrigger>
            <TabsTrigger value="work" className="rounded-full px-6 data-[state=active]:bg-[#1C1C1C]">
              Work
            </TabsTrigger>
            
            <TabsTrigger value="analytics" className="rounded-full px-6 data-[state=active]:bg-[#1C1C1C]">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="warmap" className="mt-0">
            <WarmapTab />
          </TabsContent>

          <TabsContent value="work" className="mt-0">
            <WorkTab />
          </TabsContent>

          <TabsContent value="sales" className="mt-0">
            <SalesTab />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>;
}