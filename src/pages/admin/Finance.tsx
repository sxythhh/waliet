import { useState } from "react";
import { cn } from "@/lib/utils";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const PayoutsContent = lazy(() => import("./Payouts"));
const TransactionsContent = lazy(() => import("./Transactions"));

function TabLoader() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-muted/30 rounded-xl p-5 border border-border">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

type FinanceTab = "transactions" | "payouts";

export default function Finance() {
  const [activeTab, setActiveTab] = useState<FinanceTab>("transactions");

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tabs */}
      <div className="border-b border-border/50 px-6 pt-4">
        <div className="flex items-center gap-1">
          {[
            { id: "transactions" as const, label: "All Transactions" },
            { id: "payouts" as const, label: "Payout Requests" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-inter tracking-[-0.5px] rounded-t-lg transition-colors relative",
                activeTab === tab.id
                  ? "text-foreground bg-muted/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "transactions" && (
          <Suspense fallback={<TabLoader />}>
            <TransactionsContent />
          </Suspense>
        )}
        {activeTab === "payouts" && (
          <Suspense fallback={<TabLoader />}>
            <PayoutsContent />
          </Suspense>
        )}
      </div>
    </div>
  );
}
