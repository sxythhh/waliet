import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BrandSidebar } from "@/components/BrandSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CampaignDetail from "./pages/CampaignDetail";
import CampaignJoin from "./pages/CampaignJoin";
import BrandDashboard from "./pages/BrandDashboard";
import BrandManagement from "./pages/BrandManagement";
import BrandAssets from "./pages/BrandAssets";
import BrandLibrary from "./pages/BrandLibrary";
import BrandAccount from "./pages/BrandAccount";
import Training from "./pages/Training";
import AdminOverview from "./pages/admin/Overview";
import AdminBrands from "./pages/admin/Brands";
import AdminCampaigns from "./pages/admin/Campaigns";
import AdminUsers from "./pages/admin/Users";
import AdminPayouts from "./pages/admin/Payouts";
import AdminCourses from "./pages/admin/Courses";
import AdminWallets from "./pages/admin/Wallets";
import AdminDemographics from "./pages/admin/Demographics";
import PublicProfile from "./pages/PublicProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function BrandLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <BrandSidebar />
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/join/:slug" element={<CampaignJoin />} />
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/campaign/:id" element={<DashboardLayout><CampaignDetail /></DashboardLayout>} />
          <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
          <Route path="/admin/brands" element={<AdminLayout><AdminBrands /></AdminLayout>} />
          <Route path="/admin/campaigns" element={<AdminLayout><AdminCampaigns /></AdminLayout>} />
          <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
          <Route path="/admin/payouts" element={<AdminLayout><AdminPayouts /></AdminLayout>} />
          <Route path="/admin/wallets" element={<AdminLayout><AdminWallets /></AdminLayout>} />
          <Route path="/admin/courses" element={<AdminLayout><AdminCourses /></AdminLayout>} />
          <Route path="/admin/demographics" element={<AdminLayout><AdminDemographics /></AdminLayout>} />
          <Route path="/brand/:slug" element={<BrandLayout><BrandDashboard /></BrandLayout>} />
          <Route path="/brand/:slug/management" element={<BrandLayout><BrandManagement /></BrandLayout>} />
          <Route path="/brand/:slug/assets" element={<BrandLayout><BrandAssets /></BrandLayout>} />
          <Route path="/brand/:slug/library" element={<BrandLayout><BrandLibrary /></BrandLayout>} />
          <Route path="/brand/:slug/account" element={<BrandLayout><BrandAccount /></BrandLayout>} />
          <Route path="/brand/:slug/training" element={<BrandLayout><Training /></BrandLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="/:slug" element={<PublicProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
