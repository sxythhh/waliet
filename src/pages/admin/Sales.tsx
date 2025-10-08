import { SalesTab } from "@/components/admin/SalesTab";

export default function AdminSales() {
  return (
    <div className="w-full h-full p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Sales Pipeline</h1>
        <SalesTab />
      </div>
    </div>
  );
}
