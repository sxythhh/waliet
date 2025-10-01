import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BrandSidebar } from "@/components/BrandSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CampaignDetail from "./pages/CampaignDetail";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Discover from "./pages/Discover";
import BrandDashboard from "./pages/BrandDashboard";
import BrandManagement from "./pages/BrandManagement";
import BrandAssets from "./pages/BrandAssets";
import BrandLibrary from "./pages/BrandLibrary";
import BrandAccount from "./pages/BrandAccount";
import Training from "./pages/Training";
import AdminDashboard from "./pages/AdminDashboard";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/discover" element={<DashboardLayout><Discover /></DashboardLayout>} />
          <Route path="/campaign/:id" element={<DashboardLayout><CampaignDetail /></DashboardLayout>} />
          <Route path="/wallet" element={<DashboardLayout><Wallet /></DashboardLayout>} />
          <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
          <Route path="/leaderboard" element={<DashboardLayout><Leaderboard /></DashboardLayout>} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/brand/:slug" element={<BrandLayout><BrandDashboard /></BrandLayout>} />
          <Route path="/brand/:slug/management" element={<BrandLayout><BrandManagement /></BrandLayout>} />
          <Route path="/brand/:slug/assets" element={<BrandLayout><BrandAssets /></BrandLayout>} />
          <Route path="/brand/:slug/library" element={<BrandLayout><BrandLibrary /></BrandLayout>} />
          <Route path="/brand/:slug/account" element={<BrandLayout><BrandAccount /></BrandLayout>} />
          <Route path="/brand/:slug/training" element={<BrandLayout><Training /></BrandLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
