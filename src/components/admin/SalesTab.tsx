import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesPipelineView } from "./SalesPipelineView";
import { SalesAnalyticsView } from "./SalesAnalyticsView";

export function SalesTab() {
  const [activeView, setActiveView] = useState("pipeline");

  return (
    <div className="w-full">
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="w-fit mx-auto mb-6 bg-card rounded-full p-1 shadow-lg">
          <TabsTrigger value="pipeline" className="rounded-full px-6 data-[state=active]:bg-[#1C1C1C]">
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-full px-6 data-[state=active]:bg-[#1C1C1C]">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-0">
          <SalesPipelineView />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <SalesAnalyticsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
