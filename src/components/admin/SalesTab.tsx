import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesPipelineView } from "./SalesPipelineView";
import { SalesAnalyticsView } from "./SalesAnalyticsView";
import { AllBrandsView } from "./AllBrandsView";

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
          <TabsTrigger value="all-brands" className="rounded-full px-6 data-[state=active]:bg-[#1C1C1C]">
            All Brands
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-0">
          <SalesPipelineView />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <SalesAnalyticsView />
        </TabsContent>

        <TabsContent value="all-brands" className="mt-0">
          <AllBrandsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
