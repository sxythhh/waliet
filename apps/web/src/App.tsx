import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useUtmTracking } from "@/hooks/useUtmTracking";
import { useOAuthRedirect } from "@/hooks/useOAuthRedirect";
import { queryClient } from "@/lib/queryClient";
import { PageLoader, DashboardLoader } from "@/components/PageLoader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getSubdomainSlug, getCampaignSlugFromPath } from "./utils/subdomain";

// Eagerly loaded routes (critical path)
import NotFound from "./pages/NotFound";

// Lazily loaded routes (secondary pages)
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
const Admin = lazy(() => import("./pages/Admin"));
const DiscordOAuthCallback = lazy(() => import("./components/DiscordOAuthCallback").then(m => ({ default: m.DiscordOAuthCallback })));
const DiscordBotOAuthCallback = lazy(() => import("./components/DiscordBotOAuthCallback").then(m => ({ default: m.DiscordBotOAuthCallback })));
const XOAuthCallback = lazy(() => import("./components/XOAuthCallback").then(m => ({ default: m.XOAuthCallback })));
const GoogleCalendarOAuthCallback = lazy(() => import("./components/GoogleCalendarOAuthCallback").then(m => ({ default: m.GoogleCalendarOAuthCallback })));
const GoogleDocsOAuthCallback = lazy(() => import("./components/GoogleDocsOAuthCallback").then(m => ({ default: m.GoogleDocsOAuthCallback })));
const NotionOAuthCallback = lazy(() => import("./components/NotionOAuthCallback").then(m => ({ default: m.NotionOAuthCallback })));
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
const Resources = lazy(() => import("./pages/Resources"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BrandPublicPage = lazy(() => import("./pages/BrandPublicPage"));
const Install = lazy(() => import("./pages/Install"));
const BrandPortal = lazy(() => import("./pages/BrandPortal"));
const CampaignPortal = lazy(() => import("./pages/CampaignPortal"));
const JoinTeam = lazy(() => import("./pages/JoinTeam"));
const PublicCourseDetail = lazy(() => import("./pages/PublicCourseDetail"));
const Store = lazy(() => import("./pages/Store"));
const BrandOnboarding = lazy(() => import("./pages/BrandOnboarding"));
const AffiliateHowItWorks = lazy(() => import("./pages/AffiliateHowItWorks"));
const CreatorCampaignDetails = lazy(() => import("./pages/CreatorCampaignDetails"));
const CreatorBoostDetails = lazy(() => import("./pages/CreatorBoostDetails"));
const PublicBoostApplication = lazy(() => import("./pages/PublicBoostApplication"));
const PublicCampaignPage = lazy(() => import("./pages/PublicCampaignPage"));
const TaskDetail = lazy(() => import("./pages/TaskDetail"));

// Component to track UTM params on app load
function UtmTracker() {
  useUtmTracking();
  return null;
}

// Component to handle OAuth redirects when Supabase redirects to root
function OAuthRedirectHandler() {
  useOAuthRedirect();
  return null;
}

// Redirect /join/:slug to /campaign/:slug
function JoinSlugRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/campaign/${slug}`} replace />;
}

// Redirect /c/:slug to /campaign/:slug for backwards compatibility
function CampaignSlugRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/campaign/${slug}`} replace />;
}

// Redirect /boost/:id to /join/:slug (supports both UUID and slug in URL)
function BoostRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBoostSlug = async () => {
      const supabase = await import("@/integrations/supabase/client").then(m => m.supabase);

      // First try to find by slug (most common case from shared links)
      let { data } = await supabase
        .from("bounty_campaigns")
        .select("slug")
        .eq("slug", id)
        .maybeSingle();

      // If not found by slug, try by UUID
      if (!data) {
        const result = await supabase
          .from("bounty_campaigns")
          .select("slug")
          .eq("id", id)
          .maybeSingle();
        data = result.data;
      }

      if (data?.slug) {
        navigate(`/join/${data.slug}`, { replace: true });
      } else {
        toast.error("Boost not found", {
          description: "The boost you're looking for doesn't exist or has been removed."
        });
        navigate("/", { replace: true });
      }
    };
    fetchBoostSlug();
  }, [id, navigate]);

  return <PageLoader />;
}

// Handle subdomain routing for brand portal and campaign portals
function SubdomainHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const subdomainSlug = getSubdomainSlug();

  useEffect(() => {
    if (subdomainSlug) {
      const pathname = location.pathname;

      // Root path → brand portal home
      if (pathname === '/' || pathname === '') {
        navigate(`/portal/${subdomainSlug}`, { replace: true });
        return;
      }

      // Check if this path should be treated as a campaign portal
      const campaignSlug = getCampaignSlugFromPath(pathname);
      if (campaignSlug) {
        navigate(`/portal/${subdomainSlug}/${campaignSlug}`, { replace: true });
        return;
      }
    }
  }, [subdomainSlug, navigate, location.pathname]);

  return <>{children}</>;
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  // Don't add top padding on detail pages - they have their own header
  const isDetailPage = location.pathname.startsWith('/dashboard/campaign/') || location.pathname.startsWith('/dashboard/boost/');

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AppSidebar />
      <main className={`flex-1 pb-20 md:pt-0 md:pb-0 overflow-y-auto ${isDetailPage ? '' : 'pt-14'}`}>{children}</main>
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


const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <UtmTracker />
              <OAuthRedirectHandler />
              <SubdomainHandler>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <WorkspaceProvider><Dashboard /></WorkspaceProvider>
                    </Suspense>
                  } />
                  <Route path="/b/:slug" element={<BrandPublicPage />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/discord/callback" element={<DiscordOAuthCallback />} />
                  <Route path="/discord/bot-callback" element={<DiscordBotOAuthCallback />} />
                  <Route path="/x/callback" element={<XOAuthCallback />} />
                  <Route path="/google/calendar-callback" element={<GoogleCalendarOAuthCallback />} />
                  <Route path="/google/docs-callback" element={<GoogleDocsOAuthCallback />} />
                  <Route path="/notion/callback" element={<NotionOAuthCallback />} />
                  <Route path="/apply" element={<Apply />} />
                  {/* Redirect /discover to home for backwards compatibility */}
                  <Route path="/discover" element={<Navigate to="/" replace />} />
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
                  <Route path="/affiliate" element={<AffiliateHowItWorks />} />
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
                  <Route path="/store" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <Store />
                    </Suspense>
                  } />
                  <Route path="/boost/:id" element={<BoostRedirect />} />
                  <Route path="/blueprint/:id" element={<BlueprintDetail />} />
                  <Route path="/join/:slug" element={<JoinSlugRedirect />} />
                  <Route path="/c/:slug" element={<CampaignSlugRedirect />} />
                  <Route path="/apply/:slug" element={
                    <Suspense fallback={<PageLoader />}>
                      <PublicBoostApplication />
                    </Suspense>
                  } />
                  {/* Redirect /dashboard to home for backwards compatibility */}
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="/dashboard/campaign/:id" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <WorkspaceProvider><DashboardLayout><CreatorCampaignDetails /></DashboardLayout></WorkspaceProvider>
                    </Suspense>
                  } />
                  <Route path="/dashboard/boost/:id" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <WorkspaceProvider><DashboardLayout><CreatorBoostDetails /></DashboardLayout></WorkspaceProvider>
                    </Suspense>
                  } />
                  <Route path="/tasks/:id" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <TaskDetail />
                    </Suspense>
                  } />
                  <Route path="/campaign/:id" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <PublicCampaignPage />
                    </Suspense>
                  } />
                  <Route path="/campaign/join/:id" element={
                    <Suspense fallback={<DashboardLoader />}>
                      <DashboardLayout><CampaignJoin /></DashboardLayout>
                    </Suspense>
                  } />
                  <Route path="/admin" element={
                    <Suspense fallback={<PageLoader />}>
                      <Admin />
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
                  <Route path="/brand/:brandSlug/join/:token" element={<BrandInvite />} />
                  <Route path="/brand/:brandSlug/onboarding" element={<BrandOnboarding />} />
                  <Route path="/brand/:slug/training" element={
                    <Suspense fallback={<PageLoader />}>
                      <BrandLayout><Training /></BrandLayout>
                    </Suspense>
                  } />
                  <Route path="/portal/:brandSlug/:campaignSlug" element={<CampaignPortal />} />
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
          </CurrencyProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
