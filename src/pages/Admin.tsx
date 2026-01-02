import { useState, useEffect, lazy, Suspense, ComponentType } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AdminSearchCommand } from "@/components/admin/AdminSearchCommand";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoading } from "@/components/ui/loading-bar";
import { OptimizedImage } from "@/components/OptimizedImage";
import ghostLogoBlue from "@/assets/ghost-logo-blue.png";
import {
  GaugeIcon,
  UsersIcon,
  TargetIcon,
  RocketIcon,
  CurrencyDollarIcon,
  LayersIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  type AnimatedIconProps,
} from "@/components/icons";

// Lazy load tab content
const OverviewContent = lazy(() => import("./admin/Overview"));
const UsersContent = lazy(() => import("./admin/Users"));
const BrandsContent = lazy(() => import("./admin/Brands"));
const FinanceContent = lazy(() => import("./admin/Finance"));
const ReferralsContent = lazy(() => import("./admin/Referrals"));
const ResourcesContent = lazy(() => import("./admin/Resources"));
const TicketsContent = lazy(() => import("./admin/Tickets"));
const PermissionsContent = lazy(() => import("./admin/Permissions"));
const CampaignsContent = lazy(() => import("./admin/Campaigns"));

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

const tabs: { id: string; label: string; icon: ComponentType<AnimatedIconProps> }[] = [
  { id: "overview", label: "Overview", icon: GaugeIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "brands", label: "Brands", icon: TargetIcon },
  { id: "campaigns", label: "Campaigns", icon: RocketIcon },
  { id: "finance", label: "Finance", icon: CurrencyDollarIcon },
  { id: "referrals", label: "Referrals", icon: UsersIcon },
  { id: "content", label: "Content", icon: LayersIcon },
  { id: "tickets", label: "Tickets", icon: MessageCircleIcon },
  { id: "permissions", label: "Permissions", icon: ShieldCheckIcon },
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
        <PageLoading text="Loading admin..." />
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
        <div className="flex items-center gap-6">
          {/* Logo + Wordmark */}
          <div className="flex items-center gap-1">
            <OptimizedImage src={ghostLogoBlue} alt="Logo" className="h-7 w-7 rounded-none object-cover" />
            <span className="font-geist font-bold tracking-tighter-custom text-base text-foreground">VIRALITY</span>
          </div>

          {/* Search Input */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-9 px-3 w-64 bg-muted/40 hover:bg-muted/60 rounded-lg transition-colors text-left"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
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
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-12 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent font-inter tracking-[-0.3px] text-sm"
                >
                  {/* Icon hidden but preserved: <Icon size={16} strokeWidth={2} /> */}
                  {tab.label}
                </TabsTrigger>
              );
            })}
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

          <TabsContent value="campaigns" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <CampaignsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="finance" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <FinanceContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="referrals" className="m-0 h-full">
            <Suspense fallback={<TabLoader />}>
              <ReferralsContent />
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
