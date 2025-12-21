import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useUtmTracking } from "@/hooks/useUtmTracking";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Discover from "./pages/Discover";
import CampaignDetail from "./pages/CampaignDetail";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import BrandAuth from "./pages/BrandAuth";
import Dashboard from "./pages/Dashboard";
import CampaignJoin from "./pages/CampaignJoin";
import BrandDashboard from "./pages/BrandDashboard";
import BrandManagement from "./pages/BrandManagement";
import BrandAccount from "./pages/BrandAccount";
import BrandLibrary from "./pages/BrandLibrary";
import BrandAssets from "./pages/BrandAssets";
import BrandInvite from "./pages/BrandInvite";
import Training from "./pages/Training";

import PublicProfile from "./pages/PublicProfile";
import CampaignPreview from "./pages/CampaignPreview";
import Apply from "./pages/Apply";
import AdminOverview from "./pages/admin/Overview";
import AdminPayouts from "./pages/admin/Payouts";
import AdminTransactions from "./pages/admin/Transactions";
import AdminUsers from "./pages/admin/Users";
import AdminBrands from "./pages/admin/Brands";
import AdminWallets from "./pages/admin/Wallets";
import AdminResources from "./pages/admin/Resources";
import AdminFeedback from "./pages/admin/Feedback";
import { DiscordOAuthCallback } from "./components/DiscordOAuthCallback";
import { XOAuthCallback } from "./components/XOAuthCallback";
import Leaderboard from "./pages/Leaderboard";
import Referrals from "./pages/Referrals";
import ResetPassword from "./pages/ResetPassword";
import Support from "./pages/Support";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CreatorTerms from "./pages/CreatorTerms";
import BoostCampaignDetail from "./pages/BoostCampaignDetail";
import PublicBounty from "./pages/PublicBounty";
import CreatorCampaignDashboard from "./pages/CreatorCampaignDashboard";
import New from "./pages/New";
import Contact from "./pages/Contact";
import BlueprintDetail from "./pages/BlueprintDetail";
import Resources from "./pages/Resources";
import BlogPost from "./pages/BlogPost";
import BrandPublicPage from "./pages/BrandPublicPage";
import Install from "./pages/Install";

import PublicCourseDetail from "./pages/PublicCourseDetail";
import { getSubdomainSlug } from "./utils/subdomain";
const queryClient = new QueryClient();

// Component to track UTM params on app load
function UtmTracker() {
  useUtmTracking();
  return null;
}

// Redirect /join/:slug to discover page with campaign slug param
function JoinRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/dashboard?tab=discover&campaignSlug=${slug}`} replace />;
}

// Handle subdomain routing for brand pages
function SubdomainHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const subdomainSlug = getSubdomainSlug();

  useEffect(() => {
    if (subdomainSlug) {
      // Redirect to brand public page
      navigate(`/b/${subdomainSlug}`, { replace: true });
    }
  }, [subdomainSlug, navigate]);

  return <>{children}</>;
}
function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0">{children}</main>
    </div>;
}
function BrandLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>;
}
function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const {
    isAdmin,
    loading
  } = useAdminCheck();
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, loading, navigate]);
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>;
  }
  if (!isAdmin) {
    return null;
  }
  return <div className="flex h-screen w-full overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>;
}
const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <UtmTracker />
            <SubdomainHandler>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/b/:slug" element={<BrandPublicPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/discord/callback" element={<DiscordOAuthCallback />} />
                <Route path="/x/callback" element={<XOAuthCallback />} />
                <Route path="/brand-auth" element={<BrandAuth />} />
                <Route path="/apply" element={<Apply />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/creator-terms" element={<CreatorTerms />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/new" element={<New />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/blog" element={<Resources />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/course/:id" element={<PublicCourseDetail />} />
              <Route path="/support" element={<Support />} />
              <Route path="/install" element={<Install />} />
              <Route path="/referrals" element={<DashboardLayout><Referrals /></DashboardLayout>} />
              <Route path="/leaderboard" element={<DashboardLayout><Leaderboard /></DashboardLayout>} />
              <Route path="/boost/:id" element={<PublicBounty />} />
              <Route path="/blueprint/:id" element={<BlueprintDetail />} />
              {/* Boost dashboard is now part of /dashboard?boost=:id */}
              <Route path="/join" element={<Navigate to="/dashboard?tab=discover&joinPrivate=true" replace />} />
              <Route path="/join/:slug" element={<JoinRedirect />} />
              <Route path="/c/:slug" element={<CreatorCampaignDashboard />} />
              <Route path="/dashboard" element={<WorkspaceProvider><Dashboard /></WorkspaceProvider>} />
              <Route path="/campaign/:id" element={<DashboardLayout><CampaignDetail /></DashboardLayout>} />
              <Route path="/campaign/preview/:id" element={<DashboardLayout><CampaignPreview /></DashboardLayout>} />
              <Route path="/campaign/join/:id" element={<DashboardLayout><CampaignJoin /></DashboardLayout>} />
              <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
              <Route path="/admin/brands" element={<AdminLayout><AdminBrands /></AdminLayout>} />
              <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
              <Route path="/admin/feedback" element={<AdminLayout><AdminFeedback /></AdminLayout>} />
              <Route path="/admin/resources" element={<AdminLayout><AdminResources /></AdminLayout>} />
              <Route path="/admin/payouts" element={<AdminLayout><AdminPayouts /></AdminLayout>} />
              <Route path="/admin/wallets" element={<AdminLayout><AdminWallets /></AdminLayout>} />
              <Route path="/admin/transactions" element={<AdminLayout><AdminTransactions /></AdminLayout>} />
              <Route path="/manage" element={<BrandLayout><BrandManagement /></BrandLayout>} />
              <Route path="/manage/:campaignSlug" element={<BrandLayout><BrandManagement /></BrandLayout>} />
              <Route path="/brand/:slug/assets" element={<BrandLayout><BrandAssets /></BrandLayout>} />
              <Route path="/brand/:slug/library" element={<BrandLayout><BrandLibrary /></BrandLayout>} />
              <Route path="/brand/:slug/account" element={<BrandLayout><BrandAccount /></BrandLayout>} />
              <Route path="/brand/:brandSlug/invite/:invitationId" element={<BrandInvite />} />
              <Route path="/brand/:slug/training" element={<BrandLayout><Training /></BrandLayout>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="/:username" element={<PublicProfile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SubdomainHandler>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;