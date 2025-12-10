import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import { AdminSidebar } from "@/components/AdminSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { DiscordOAuthCallback } from "@/components/DiscordOAuthCallback";
import { XOAuthCallback } from "@/components/XOAuthCallback";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import BrandAuth from "./pages/BrandAuth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CampaignDetail from "./pages/CampaignDetail";
import CreatorCampaignDashboard from "./pages/CreatorCampaignDashboard";
import CampaignJoin from "./pages/CampaignJoin";
import CampaignPreview from "./pages/CampaignPreview";
import BrandManagement from "./pages/BrandManagement";
import BrandAssets from "./pages/BrandAssets";
import BrandLibrary from "./pages/BrandLibrary";
import BrandAccount from "./pages/BrandAccount";
import BrandInvite from "./pages/BrandInvite";
import Training from "./pages/Training";
import CourseDetail from "./pages/CourseDetail";
import AdminOverview from "./pages/admin/Overview";
import AdminBrands from "./pages/admin/Brands";
import AdminCampaigns from "./pages/admin/Campaigns";
import AdminUsers from "./pages/admin/Users";
import AdminPayouts from "./pages/admin/Payouts";
import AdminCourses from "./pages/admin/Courses";
import AdminWallets from "./pages/admin/Wallets";
import AdminTransactions from "./pages/admin/Transactions";
import PublicProfile from "./pages/PublicProfile";
import NotFound from "./pages/NotFound";
import Apply from "./pages/Apply";
import Discover from "./pages/Discover";
import Referrals from "./pages/Referrals";
import Leaderboard from "./pages/Leaderboard";
import BoostCampaignDetail from "./pages/BoostCampaignDetail";
import PublicBoost from "./pages/PublicBounty";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
const queryClient = new QueryClient();

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0">{children}</main>
    </div>
  );
}

function BrandLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, loading, navigate]);
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/discord/callback" element={<DiscordOAuthCallback />} />
            <Route path="/x/callback" element={<XOAuthCallback />} />
            <Route path="/brand-auth" element={<BrandAuth />} />
            <Route path="/apply" element={<Apply />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/referrals" element={<DashboardLayout><Referrals /></DashboardLayout>} />
            <Route path="/leaderboard" element={<DashboardLayout><Leaderboard /></DashboardLayout>} />
            <Route path="/boost/:id" element={<PublicBoost />} />
            <Route path="/join/:slug" element={<CampaignJoin />} />
            <Route path="/c/:slug" element={<CreatorCampaignDashboard />} />
            <Route path="/dashboard" element={<WorkspaceProvider><Dashboard /></WorkspaceProvider>} />
            <Route path="/campaign/:id" element={<DashboardLayout><CampaignDetail /></DashboardLayout>} />
            <Route path="/campaign/preview/:id" element={<DashboardLayout><CampaignPreview /></DashboardLayout>} />
            <Route path="/campaign/join/:id" element={<DashboardLayout><CampaignJoin /></DashboardLayout>} />
            <Route path="/boost/:id" element={<BrandLayout><BoostCampaignDetail /></BrandLayout>} />
            <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
            <Route path="/admin/brands" element={<AdminLayout><AdminBrands /></AdminLayout>} />
            <Route path="/admin/campaigns" element={<AdminLayout><AdminCampaigns /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
            <Route path="/admin/payouts" element={<AdminLayout><AdminPayouts /></AdminLayout>} />
            <Route path="/admin/wallets" element={<AdminLayout><AdminWallets /></AdminLayout>} />
            <Route path="/admin/courses" element={<AdminLayout><AdminCourses /></AdminLayout>} />
            <Route path="/admin/transactions" element={<AdminLayout><AdminTransactions /></AdminLayout>} />
            <Route path="/manage" element={<BrandLayout><BrandManagement /></BrandLayout>} />
            <Route path="/manage/:campaignSlug" element={<BrandLayout><BrandManagement /></BrandLayout>} />
            <Route path="/brand/:slug/assets" element={<BrandLayout><BrandAssets /></BrandLayout>} />
            <Route path="/brand/:slug/library" element={<BrandLayout><BrandLibrary /></BrandLayout>} />
            <Route path="/brand/:slug/account" element={<BrandLayout><BrandAccount /></BrandLayout>} />
            <Route path="/brand/:brandSlug/invite/:invitationId" element={<BrandInvite />} />
            <Route path="/brand/:slug/training" element={<BrandLayout><Training /></BrandLayout>} />
            <Route path="/brand/:slug/training/:courseId" element={<CourseDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="/:username" element={<PublicProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
