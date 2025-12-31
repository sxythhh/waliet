import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useUtmTracking } from "@/hooks/useUtmTracking";
import { queryClient } from "@/lib/queryClient";
import { PageLoader, DashboardLoader } from "@/components/PageLoader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getSubdomainSlug } from "./utils/subdomain";

// Eagerly loaded routes (critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazily loaded routes (secondary pages)
const Discover = lazy(() => import("./pages/Discover"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CampaignJoin = lazy(() => import("./pages/CampaignJoin"));
const BrandDashboard = lazy(() => import("./pages/BrandDashboard"));
const BrandManagement = lazy(() => import("./pages/BrandManagement"));
const BrandAccount = lazy(() => import("./pages/BrandAccount"));
const BrandLibrary = lazy(() => import("./pages/BrandLibrary"));
const BrandAssets = lazy(() => import("./pages/BrandAssets"));
const BrandInvite = lazy(() => import("./pages/BrandInvite"));
const Training = lazy(() => import("./pages/Training"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Apply = lazy(() => import("./pages/Apply"));
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminPayouts = lazy(() => import("./pages/admin/Payouts"));
const AdminTransactions = lazy(() => import("./pages/admin/Transactions"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminBrands = lazy(() => import("./pages/admin/Brands"));
const AdminWallets = lazy(() => import("./pages/admin/Wallets"));
const AdminResources = lazy(() => import("./pages/admin/Resources"));
const AdminFeedback = lazy(() => import("./pages/admin/Feedback"));
const AdminSecurity = lazy(() => import("./pages/admin/Security"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const DiscordOAuthCallback = lazy(() => import("./components/DiscordOAuthCallback").then(m => ({ default: m.DiscordOAuthCallback })));
const XOAuthCallback = lazy(() => import("./components/XOAuthCallback").then(m => ({ default: m.XOAuthCallback })));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Referrals = lazy(() => import("./pages/Referrals"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Support = lazy(() => import("./pages/Support"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const CreatorTerms = lazy(() => import("./pages/CreatorTerms"));
const BoostCampaignDetail = lazy(() => import("./pages/BoostCampaignDetail"));
const CampaignApply = lazy(() => import("./pages/CampaignApply"));
const New = lazy(() => import("./pages/New"));
const Contact = lazy(() => import("./pages/Contact"));
const CaseStudies = lazy(() => import("./pages/CaseStudies"));
const BlueprintDetail = lazy(() => import("./pages/BlueprintDetail"));
const BlueprintPreview = lazy(() => import("./pages/BlueprintPreview"));
const Resources = lazy(() => import("./pages/Resources"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BrandPublicPage = lazy(() => import("./pages/BrandPublicPage"));
const Install = lazy(() => import("./pages/Install"));
const BrandPortal = lazy(() => import("./pages/BrandPortal"));
const JoinTeam = lazy(() => import("./pages/JoinTeam"));
const PublicCourseDetail = lazy(() => import("./pages/PublicCourseDetail"));

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

// Redirect /boost/:id to /c/:slug (fetch slug first)
function BoostRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchBoostSlug = async () => {
      const { data } = await import("@/integrations/supabase/client").then(m => 
        m.supabase.from("bounty_campaigns").select("slug").eq("id", id).maybeSingle()
      );
      if (data?.slug) {
        navigate(`/c/${data.slug}`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    };
    fetchBoostSlug();
  }, [id, navigate]);
  
  return <PageLoader />;
}

// Handle subdomain routing for brand portal
function SubdomainHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const subdomainSlug = getSubdomainSlug();

  useEffect(() => {
    if (subdomainSlug) {
      navigate(`/portal/${subdomainSlug}`, { replace: true });
    }
  }, [subdomainSlug, navigate]);

  return <>{children}</>;
}

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
    return <PageLoader />;
  }
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <UtmTracker />
              <SubdomainHandler>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/b/:slug" element={<BrandPublicPage />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/discord/callback" element={<DiscordOAuthCallback />} />
                  <Route path="/x/callback" element={<XOAuthCallback />} />
                  <Route path="/apply" element={<Apply />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/creator-terms" element={<CreatorTerms />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/new" element={<New />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/case-studies" element={<CaseStudies />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/blog" element={<Resources />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/course/:id" element={<PublicCourseDetail />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/referrals" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <DashboardLayout><Referrals /></DashboardLayout>
                    </Suspense>
                  } />
                  <Route path="/leaderboard" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <DashboardLayout><Leaderboard /></DashboardLayout>
                    </Suspense>
                  } />
                  <Route path="/boost/:id" element={<BoostRedirect />} />
                  <Route path="/blueprint/:id" element={<BlueprintDetail />} />
                  <Route path="/blueprint/:blueprintId/preview" element={<BlueprintPreview />} />
                  <Route path="/join" element={<Navigate to="/dashboard?tab=discover&joinPrivate=true" replace />} />
                  <Route path="/join/:slug" element={<JoinRedirect />} />
                  <Route path="/c/:slug" element={<CampaignApply />} />
                  <Route path="/dashboard" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <WorkspaceProvider><Dashboard /></WorkspaceProvider>
                    </Suspense>
                  } />
                  <Route path="/campaign/:id" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <DashboardLayout><CampaignDetail /></DashboardLayout>
                    </Suspense>
                  } />
                  <Route path="/campaign/join/:id" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <DashboardLayout><CampaignJoin /></DashboardLayout>
                    </Suspense>
                  } />
                  <Route path="/admin" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminOverview /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/admin/brands" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminBrands /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/admin/users" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminUsers /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/admin/security" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminSecurity /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/admin/feedback" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminFeedback /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/admin/resources" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminResources /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/admin/payouts" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminPayouts /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/admin/wallets" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminWallets /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/admin/transactions" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminTransactions /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/admin/reports" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminLayout><AdminReports /></AdminLayout>
                    </Suspense>
                  } />
                  <Route path="/manage" element={
                    <Suspense fallback={<PageLoader />}>
                      <BrandLayout><BrandManagement /></BrandLayout>
                    </Suspense>
                  } />
                  <Route path="/manage/:campaignSlug" element={
                    <Suspense fallback={<PageLoader />}>
                      <BrandLayout><BrandManagement /></BrandLayout>
                    </Suspense>
                  } />
                  <Route path="/brand/:slug/assets" element={
                    <Suspense fallback={<PageLoader />}>
                      <BrandLayout><BrandAssets /></BrandLayout>
                    </Suspense>
                  } />
                  <Route path="/brand/:slug/library" element={
                    <Suspense fallback={<PageLoader />}>
                      <BrandLayout><BrandLibrary /></BrandLayout>
                    </Suspense>
                  } />
                  <Route path="/brand/:slug/account" element={
                    <Suspense fallback={<PageLoader />}>
                      <BrandLayout><BrandAccount /></BrandLayout>
                    </Suspense>
                  } />
                  <Route path="/brand/:brandSlug/invite/:invitationId" element={<BrandInvite />} />
                  <Route path="/brand/:slug/training" element={
                    <Suspense fallback={<PageLoader />}>
                      <BrandLayout><Training /></BrandLayout>
                    </Suspense>
                  } />
                  <Route path="/portal/:slug" element={<BrandPortal />} />
                  <Route path="/join-team/:inviteCode" element={<JoinTeam />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path=":username" element={<PublicProfile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SubdomainHandler>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
