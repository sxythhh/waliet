import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Search, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AdminSearchCommand } from "@/components/admin/AdminSearchCommand";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoading } from "@/components/ui/loading-bar";
import { OptimizedImage } from "@/components/OptimizedImage";
import ghostLogoBlue from "@/assets/ghost-logo-blue.png";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
// Material Icons
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import CampaignOutlined from "@mui/icons-material/CampaignOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import ShareOutlined from "@mui/icons-material/ShareOutlined";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import MailOutlined from "@mui/icons-material/MailOutlined";
import SupportAgentOutlined from "@mui/icons-material/SupportAgentOutlined";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import BuildOutlined from "@mui/icons-material/BuildOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";

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
const EmailsContent = lazy(() => import("./admin/Emails"));
const ToolsContent = lazy(() => import("./admin/Tools"));

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

// Sidebar navigation items with Material icons
const navItems = [
  { id: "overview", label: "Overview", icon: DashboardOutlined },
  { id: "users", label: "Users", icon: PeopleOutlined },
  { id: "brands", label: "Brands", icon: BusinessOutlined },
  { id: "campaigns", label: "Campaigns", icon: CampaignOutlined },
  { id: "finance", label: "Finance", icon: AccountBalanceWalletOutlined },
  { id: "referrals", label: "Referrals", icon: ShareOutlined },
  { id: "content", label: "Content", icon: ArticleOutlined },
  { id: "emails", label: "Emails", icon: MailOutlined },
  { id: "tickets", label: "Tickets", icon: SupportAgentOutlined },
  { id: "permissions", label: "Permissions", icon: AdminPanelSettingsOutlined },
  { id: "tools", label: "Tools", icon: BuildOutlined },
];

// Sidebar navigation component
function AdminNav({
  activeTab,
  onNavigate,
  onSearchOpen,
  onSignOut,
}: {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onSearchOpen: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <OptimizedImage src={ghostLogoBlue} alt="Logo" className="h-6 w-6" />
          <span className="font-geist font-bold tracking-tight text-[15px] text-white">VIRALITY</span>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <button
          onClick={onSearchOpen}
          className="w-full flex items-center gap-2 h-9 px-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg transition-colors text-left"
        >
          <SearchOutlined sx={{ fontSize: 16 }} className="text-white/30" />
          <span className="text-[13px] text-white/30 flex-1">Search</span>
          <kbd className="text-[11px] text-white/20 font-medium">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors relative",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <Icon
                sx={{ fontSize: 18 }}
                className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "text-white" : "text-white/40 group-hover:text-white/60"
                )}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogoutOutlined sx={{ fontSize: 18 }} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

// Content renderer based on active tab
function AdminContent({ activeTab }: { activeTab: string }) {
  const content = {
    overview: <OverviewContent />,
    users: <UsersContent />,
    brands: <BrandsContent />,
    campaigns: <CampaignsContent />,
    finance: <FinanceContent />,
    referrals: <ReferralsContent />,
    content: <ResourcesContent />,
    emails: <EmailsContent />,
    tickets: <TicketsContent />,
    permissions: <PermissionsContent />,
    tools: <ToolsContent />,
  };

  return (
    <Suspense fallback={<TabLoader />}>
      {content[activeTab as keyof typeof content] || <OverviewContent />}
    </Suspense>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, loading } = useAdminCheck();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const handleNavigate = (tab: string) => {
    setSearchParams({ tab });
    setMobileNavOpen(false);
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
    <div className="h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col shrink-0">
        <AdminNav
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onSearchOpen={() => setSearchOpen(true)}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0 border-0">
          <AdminNav
            activeTab={activeTab}
            onNavigate={handleNavigate}
            onSearchOpen={() => {
              setMobileNavOpen(false);
              setSearchOpen(true);
            }}
            onSignOut={handleSignOut}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <OptimizedImage src={ghostLogoBlue} alt="Logo" className="h-6 w-6 rounded-none object-cover" />
            <span className="font-geist font-bold tracking-tighter-custom text-sm text-foreground">VIRALITY</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-background">
          <AdminContent activeTab={activeTab} />
        </main>
      </div>

      <AdminSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
