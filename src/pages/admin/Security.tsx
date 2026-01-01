import { FraudDashboard } from "@/components/admin/security/FraudDashboard";
import { AuditLog } from "@/components/admin/security/AuditLog";
import { FraudReviewQueue } from "@/components/admin/FraudReviewQueue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";

export default function SecurityPage() {
  return (
    <AdminPermissionGuard resource="security">
    <div className="w-full h-full p-4 md:p-6 pt-16 md:pt-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-inter tracking-[-0.5px] text-white">
            Security Center
          </h1>
          <p className="text-sm text-white/40 font-inter tracking-[-0.5px] mt-0.5">
            Fraud detection, audit trails, and security monitoring
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-auto">
            <TabsTrigger
              value="dashboard"
              className="text-sm font-inter tracking-[-0.5px] data-[state=active]:bg-white/[0.08] data-[state=active]:text-white px-4 py-2"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="review"
              className="text-sm font-inter tracking-[-0.5px] data-[state=active]:bg-white/[0.08] data-[state=active]:text-white px-4 py-2"
            >
              Fraud Review Queue
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="text-sm font-inter tracking-[-0.5px] data-[state=active]:bg-white/[0.08] data-[state=active]:text-white px-4 py-2"
            >
              Audit Log
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard" className="mt-0">
              <FraudDashboard />
            </TabsContent>

            <TabsContent value="review" className="mt-0">
              <FraudReviewQueue />
            </TabsContent>

            <TabsContent value="audit" className="mt-0">
              <AuditLog />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
    </AdminPermissionGuard>
  );
}
