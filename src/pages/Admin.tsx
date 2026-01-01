import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AdminSearchCommand } from "@/components/admin/AdminSearchCommand";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load tab content
const OverviewContent = lazy(() => import("./admin/Overview"));
const UsersContent = lazy(() => import("./admin/Users"));
const BrandsContent = lazy(() => import("./admin/Brands"));
const PayoutsContent = lazy(() => import("./admin/Payouts"));
const ResourcesContent = lazy(() => import("./admin/Resources"));
const FeedbackContent = lazy(() => import("./admin/Feedback"));
const TicketsContent = lazy(() => import("./admin/Tickets"));
const PermissionsContent = lazy(() => import("./admin/Permissions"));

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

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "brands", label: "Brands" },
  { id: "finance", label: "Finance" },
  { id: "content", label: "Content" },
  { id: "tickets", label: "Tickets" },
  { id: "feedback", label: "Feedback" },
  { id: "permissions", label: "Permissions" },
];

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, loading } = useAdminCheck();
  const [searchOpen, setSearchOpen] = useState(false);

  const activeTab = searchParams.get("tab") || "overview";

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, loading, navigate]);

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold font-inter tracking-[-0.5px]">Admin</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="gap-2 text-muted-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-2 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </header>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-6 bg-card">
          <TabsList className="h-12 bg-transparent gap-1 p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-12 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent font-inter tracking-[-0.3px] text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          <TabsContent value="overview" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <OverviewContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="users" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <UsersContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="brands" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <BrandsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="finance" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <PayoutsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="content" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <ResourcesContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="tickets" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <TicketsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="feedback" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <FeedbackContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="permissions" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <PermissionsContent />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>

      <AdminSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
