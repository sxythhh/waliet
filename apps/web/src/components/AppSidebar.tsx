import { Dock, Compass, CircleUser, ArrowUpRight, LogOut, Settings, Medal, Gift, MessageSquare, HelpCircle, ChevronDown, Building2, User, Plus, Monitor, Sun, Moon, Search, Check, UserPlus, LayoutDashboard, Database, FileText, Trophy, LucideIcon, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, Modifier } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@iconify/react";
import { WalletDropdown } from "@/components/WalletDropdown";
import unfoldMoreIcon from "@/assets/unfold-more-icon.svg";
import { SubscriptionGateDialog } from "@/components/brand/SubscriptionGateDialog";
import { BrandUpgradeCTA } from "@/components/brand/BrandUpgradeCTA";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { InviteMemberDialog } from "@/components/brand/InviteMemberDialog";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import newLogo from "@/assets/virality-logo-new.png";
import ghostLogoBlue from "@/assets/ghost-logo-blue.png";
import AuthDialog from "@/components/AuthDialog";
import discordIcon from "@/assets/discord-icon.png";
import supportIcon from "@/assets/support-icon.svg";
import lightbulbIcon from "@/assets/lightbulb-icon.svg";
import bugIcon from "@/assets/bug-icon.svg";
// Light mode icons
import discordIconLight from "@/assets/discord-icon-light.svg";
import supportIconLight from "@/assets/support-icon-light.svg";
import lightbulbIconLight from "@/assets/lightbulb-icon-light.svg";
import bugIconLight from "@/assets/bug-icon-light.svg";
import homeInactive from "@/assets/home-inactive-new.png";
import homeActive from "@/assets/home-active-new.png";
import walletInactive from "@/assets/wallet-inactive.svg";
import walletActive from "@/assets/wallet-active.svg";
import discoverInactive from "@/assets/discover-inactive.svg";
import discoverActive from "@/assets/discover-active.svg";
import profileInactive from "@/assets/profile-inactive.svg";
import profileActive from "@/assets/profile-active.svg";
import chefHatInactive from "@/assets/chef-hat-gray.svg";
import chefHatActive from "@/assets/chef-hat-blue.svg";
import blueprintsInactive from "@/assets/blueprints-inactive.svg";
import blueprintsActive from "@/assets/blueprints-active.svg";
import creatorsInactive from "@/assets/creators-inactive.svg";
import creatorsActive from "@/assets/creators-active.svg";
import referralsInactive from "@/assets/referrals-inactive.svg";
import referralsActive from "@/assets/referrals-active.svg";
import educationInactive from "@/assets/education-inactive.svg";
import educationActive from "@/assets/education-active.svg";
import scopeInactive from "@/assets/scope-inactive.svg";
import scopeActive from "@/assets/scope-active.svg";
import campaignsInactive from "@/assets/campaigns-inactive.svg";
import campaignsActive from "@/assets/campaigns-active.svg";
import nutFillIcon from "@/assets/nut-fill.svg";
import settingsFilledIcon from "@/assets/settings-filled-icon.svg";
import personEditIcon from "@/assets/person-edit-icon.svg";
import swapHorizIcon from "@/assets/swap-horiz-icon.svg";
import swapHorizLightIcon from "@/assets/swap-horiz-light.svg";
import storefrontIcon from "@/assets/storefront-icon.svg";
import messagesInactive from "@/assets/mail-inactive.svg";
import messagesActive from "@/assets/mail-active.svg";
import databaseInactive from "@/assets/database-inactive.svg";
import databaseActive from "@/assets/database-active.svg";
import contractsInactive from "@/assets/contracts-inactive.svg";
import contractsActive from "@/assets/contracts-active.svg";
import leaderboardInactive from "@/assets/leaderboard-inactive.svg";
import leaderboardActive from "@/assets/leaderboard-active.svg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import SidebarMenuButtons from "@/components/SidebarMenuButtons";
import { CampaignDetailsDialog } from "@/components/CampaignDetailsDialog";
import {
  useJoinedCampaigns,
  useBrandMemberships,
  useAllBrands,
  useCurrentBrandInfo,
  useBrandCampaignsForSidebar,
  useUserProfile,
  type JoinedCampaign,
  type BrandMembership,
  type Brand,
  type BrandCampaignItem,
} from "@/hooks/useSidebarData";

interface SubItem {
  title: string;
  subtab: string;
  iconInactive: string;
  iconActive: string;
}
interface MenuItem {
  title: string;
  tab: string;
  icon: LucideIcon | null;
  subItems?: SubItem[];
}
const creatorMenuItems: MenuItem[] = [{
  title: "Home",
  tab: "campaigns",
  icon: null
}, {
  title: "Profile",
  tab: "profile",
  icon: Dock
}, {
  title: "Discover",
  tab: "discover",
  icon: Compass
}, {
  title: "Payments",
  tab: "wallet",
  icon: null
}, {
  title: "Settings",
  tab: "settings",
  icon: CircleUser
}];
const brandMenuItems: MenuItem[] = [{
  title: "Home",
  tab: "campaigns",
  icon: null
}, {
  title: "Campaigns",
  tab: "analytics",
  icon: null
}, {
  title: "Blueprints",
  tab: "blueprints",
  icon: null
}, {
  title: "Creators",
  tab: "creators",
  icon: null,
  subItems: [
    { title: "Messages", subtab: "messages", iconInactive: messagesInactive, iconActive: messagesActive },
    { title: "Database", subtab: "database", iconInactive: databaseInactive, iconActive: databaseActive },
    { title: "Contracts", subtab: "contracts", iconInactive: contractsInactive, iconActive: contractsActive }
  ]
}, {
  title: "Settings",
  tab: "settings",
  icon: CircleUser
}];

// Restrict drag to vertical axis only
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

// Sortable sidebar item component for drag and drop reordering
function SortableSidebarItem({ id, children }: { id: string; children: (isHovered: boolean) => React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  };

  // Wrap listeners to add hover detection
  const enhancedListeners = {
    ...listeners,
    onPointerEnter: (e: React.PointerEvent) => {
      setIsHovered(true);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      setIsHovered(false);
    },
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overflow-visible"
      {...attributes}
      {...enhancedListeners}
    >
      {children(isHovered)}
    </div>
  );
}

export function AppSidebar() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const currentTab = searchParams.get("tab") || "campaigns";
  const workspace = searchParams.get("workspace") || "creator";
  const isCreatorMode = workspace === "creator";
  const {
    user
  } = useAuth();
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    isAdmin
  } = useAdminCheck();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const hasAutoCollapsed = useRef(false);
  const [subscriptionGateOpen, setSubscriptionGateOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"feature" | "bug">("feature");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [creatorsExpanded, setCreatorsExpanded] = useState(false);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<JoinedCampaign | null>(null);
  const [campaignDetailsDialogOpen, setCampaignDetailsDialogOpen] = useState(false);
  const [campaignsExpanded, setCampaignsExpanded] = useState(true);
  const [effectiveUserId, setEffectiveUserId] = useState<string | undefined>(user?.id);
  const [effectiveUserEmail, setEffectiveUserEmail] = useState<string | undefined>(user?.email || undefined);
  const [sidebarCampaignOrder, setSidebarCampaignOrder] = useState<string[]>([]);

  // DnD sensors for reordering
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sync effectiveUserId with user from context, or fetch directly if context is stale
  useEffect(() => {
    const syncUserId = async () => {
      if (user?.id) {
        setEffectiveUserId(user.id);
        setEffectiveUserEmail(user.email || undefined);
      } else {
        // Context might be stale - fetch session directly
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setEffectiveUserId(session.user.id);
          setEffectiveUserEmail(session.user.email || undefined);
        }
      }
    };
    syncUserId();
  }, [user?.id, user?.email]);

  // React Query for data fetching with caching - use effectiveUserId instead of user?.id
  const queryClient = useQueryClient();
  const { data: brandMemberships = [] } = useBrandMemberships(effectiveUserId);
  const { data: allBrands = [] } = useAllBrands(isAdmin);
  const { data: joinedCampaigns = [] } = useJoinedCampaigns(effectiveUserId);
  const { data: userProfile } = useUserProfile(effectiveUserId);

  // Load sidebar campaign order from localStorage
  useEffect(() => {
    if (effectiveUserId) {
      try {
        const savedOrder = localStorage.getItem(`sidebarOrder_${effectiveUserId}`);
        if (savedOrder) {
          setSidebarCampaignOrder(JSON.parse(savedOrder));
        }
      } catch (e) {
        console.warn("Failed to load sidebar order from localStorage:", e);
      }
    }
  }, [effectiveUserId]);

  // Sort joined campaigns based on saved order
  const sortedJoinedCampaigns = [...joinedCampaigns].sort((a, b) => {
    const aKey = `${a.type}-${a.id}`;
    const bKey = `${b.type}-${b.id}`;
    const aIndex = sidebarCampaignOrder.indexOf(aKey);
    const bIndex = sidebarCampaignOrder.indexOf(bKey);
    // Items not in order go to the end, sorted by created_at
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Handle drag end for reordering sidebar campaigns
  const handleSidebarDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedJoinedCampaigns.findIndex(item => `${item.type}-${item.id}` === active.id);
      const newIndex = sortedJoinedCampaigns.findIndex(item => `${item.type}-${item.id}` === over.id);
      const newOrder = arrayMove(
        sortedJoinedCampaigns.map(item => `${item.type}-${item.id}`),
        oldIndex,
        newIndex
      );
      setSidebarCampaignOrder(newOrder);
      if (effectiveUserId) {
        try {
          localStorage.setItem(`sidebarOrder_${effectiveUserId}`, JSON.stringify(newOrder));
        } catch (e) {
          console.warn("Failed to save sidebar order to localStorage:", e);
        }
      }
    }
  };

  // Derive profile values from cached query (prevents flicker on navigation)
  const avatarUrl = userProfile?.avatar_url || null;
  const bannerUrl = userProfile?.banner_url || null;
  const displayName = userProfile?.full_name || userProfile?.username || effectiveUserEmail || "";
  const accountType = userProfile?.account_type || "creator";

  // Get workspace/brand ID early for the hook
  const workspaceBrandId = !isCreatorMode && workspace
    ? allBrands.find(b => b.slug === workspace)?.id || brandMemberships.find(m => m.brands.slug === workspace)?.brand_id || null
    : null;
  const { data: brandCampaignsForSidebar = [] } = useBrandCampaignsForSidebar(workspaceBrandId);

  const menuItems = isCreatorMode ? creatorMenuItems : brandMenuItems;
  const currentSubtab = searchParams.get("subtab") || "messages";
  
  // Determine if we're in light mode
  const isLightMode = theme === "light" || (theme === "system" && !window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Auto-collapse sidebar on campaign/boost detail pages on desktop
  // Auto-expand when navigating away (reverse animation)
  const isDetailPage = location.pathname.startsWith('/dashboard/campaign/') || location.pathname.startsWith('/dashboard/boost/') || location.pathname.startsWith('/campaign/') || location.pathname.startsWith('/boost/');
  useEffect(() => {
    if (!isMobile && isDetailPage && !hasAutoCollapsed.current) {
      setIsCollapsed(true);
      hasAutoCollapsed.current = true;
    }
    // Auto-expand when navigating away from detail pages (if it was auto-collapsed)
    if (!isDetailPage && hasAutoCollapsed.current) {
      setIsCollapsed(false);
      hasAutoCollapsed.current = false;
    }
  }, [isMobile, isDetailPage]);

  // Get current brand ID for subscription dialog and brand info
  const currentBrandId = !isCreatorMode && workspace
    ? allBrands.find(b => b.slug === workspace)?.id || brandMemberships.find(m => m.brands.slug === workspace)?.brand_id || ''
    : '';

  // Use React Query for current brand info (cached)
  const { data: currentBrandInfo } = useCurrentBrandInfo(currentBrandId || null);

  // Derive brand info from the hook data or memberships
  const currentBrandName = currentBrandInfo?.name
    || brandMemberships.find(m => m.brands.slug === workspace)?.brands.name
    || "";
  const currentBrandLogo = currentBrandInfo?.logo_url
    || brandMemberships.find(m => m.brands.slug === workspace)?.brands.logo_url
    || null;
  const currentBrandColor = currentBrandInfo?.brand_color
    || brandMemberships.find(m => m.brands.slug === workspace)?.brands.brand_color
    || null;
  const currentBrandSubscriptionStatus = currentBrandInfo?.subscription_status || null;
  const currentBrandSubscriptionPlan = currentBrandInfo?.subscription_plan || null;
  const currentBrandMemberCount = currentBrandInfo?.memberCount || 0;

  const getInitial = () => {
    return displayName.charAt(0).toUpperCase() || effectiveUserEmail?.charAt(0).toUpperCase() || "U";
  };
  const handleTabClick = (tab: string, subtab?: string) => {
    // If clicking scope without an active subscription, show upgrade popup
    if (tab === "scope" && !isCreatorMode && currentBrandSubscriptionStatus !== "active") {
      setSubscriptionGateOpen(true);
      return;
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    // Clear blueprint, campaign, and boost params when switching tabs
    newParams.delete("blueprint");
    newParams.delete("campaign");
    newParams.delete("boost");
    if (subtab) {
      newParams.set("subtab", subtab);
    } else {
      newParams.delete("subtab");
    }
    // If not already on home, navigate there with the new params
    if (location.pathname !== '/') {
      navigate(`/?${newParams.toString()}`);
    } else {
      setSearchParams(newParams);
    }
  };
  const handleSubtabClick = (subtab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "creators");
    newParams.set("subtab", subtab);
    newParams.delete("blueprint");
    newParams.delete("campaign");
    newParams.delete("boost");
    // If not already on home, navigate there with the new params
    if (location.pathname !== '/') {
      navigate(`/?${newParams.toString()}`);
    } else {
      setSearchParams(newParams);
    }
  };
  const handleWorkspaceChange = (newWorkspace: string) => {
    const newParams = new URLSearchParams();
    if (newWorkspace === "creator") {
      newParams.set("tab", "campaigns");
    } else {
      newParams.set("workspace", newWorkspace);
      newParams.set("tab", "campaigns");
    }
    // Save workspace preference to localStorage
    localStorage.setItem("lastWorkspace", newWorkspace);
    // Always navigate to home when switching workspaces
    // This ensures we leave detail pages (campaign/boost) properly
    navigate(`/?${newParams.toString()}`);
    setWorkspaceOpen(false);
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Logged out successfully");
  };
  const getWorkspaceDisplayName = () => {
    if (isCreatorMode) return "Creator Dashboard";
    return currentBrandName || "Brand Dashboard";
  };
  const getWorkspaceIcon = () => {
    if (isCreatorMode) {
      return <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        </div>;
    }
    if (currentBrandLogo) {
      return <img src={currentBrandLogo} alt={currentBrandName || "Brand logo"} className="w-6 h-6 rounded object-cover" />;
    }
    return <div className="w-6 h-6 rounded flex items-center justify-center" style={{
      backgroundColor: currentBrandColor || 'hsl(var(--muted))'
    }}>
        <span className="text-[10px] font-semibold text-white uppercase">{currentBrandName?.charAt(0) || 'B'}</span>
      </div>;
  };
  return <>
      {/* Mobile Header - Top (hidden on campaign/boost detail pages) */}
      <header className={`md:hidden fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between bg-background px-4 ${isDetailPage ? 'hidden' : ''}`}>
        {!isCreatorMode && currentBrandName ? (
          <Link to={`/?workspace=${workspace}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {currentBrandLogo ? (
              <img src={currentBrandLogo} alt={currentBrandName} className="h-7 w-7 rounded object-cover" />
            ) : (
              <div
                className="h-7 w-7 rounded flex items-center justify-center"
                style={{ backgroundColor: currentBrandColor || '#8B5CF6' }}
              >
                <span className="text-xs font-bold text-white">{currentBrandName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className="font-geist font-bold tracking-tighter-custom text-sm text-foreground uppercase truncate max-w-[120px]">{currentBrandName}</span>
          </Link>
        ) : (
          <Link to="/" className="flex items-center">
            <OptimizedImage src={newLogo} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
          </Link>
        )}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Wallet Dropdown - Mobile (for creators, or brands with active plan) */}
              {(isCreatorMode || !isCreatorMode && currentBrandSubscriptionStatus === "active") && <WalletDropdown variant="header" />}
              {/* Upgrade Plan Button - Mobile (only for brands without active plan) */}
              {!isCreatorMode && currentBrandSubscriptionStatus !== "active" && <button onClick={() => setSubscriptionGateOpen(true)} className="py-1.5 px-3 bg-primary border-t border-primary/70 rounded-lg font-inter text-[13px] font-medium tracking-[-0.5px] text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5">
                  <img src={nutFillIcon} alt="" className="h-3.5 w-3.5" />
                  Upgrade
                </button>}
              <Popover>
            <PopoverTrigger asChild>
              <button className="cursor-pointer">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {getInitial()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-background border border-border rounded-xl shadow-2xl" align="end" sideOffset={8}>
              <div className="p-3 space-y-1 font-inter">
                {/* Workspace Section */}
                {(isAdmin ? allBrands.length > 0 : brandMemberships.length > 0) && <div className="pb-1">
                    <button onClick={() => handleWorkspaceChange("creator")} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${isCreatorMode ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/50'}`}>
                      <img src={isLightMode ? swapHorizLightIcon : swapHorizIcon} alt="" className="w-4 h-4" />
                      <span className="text-sm font-semibold tracking-[-0.5px]">{isCreatorMode ? 'Switch to workspace' : 'Switch to creator'}</span>
                    </button>
                    <div className="max-h-[120px] overflow-y-auto">
                      {isAdmin && allBrands.slice(0, 5).map(brand => <button key={brand.id} onClick={() => handleWorkspaceChange(brand.slug)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${workspace === brand.slug ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/50'}`}>
                          {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="w-4 h-4 rounded object-cover" /> : <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-semibold text-white" style={{
                      backgroundColor: brand.brand_color || '#8B5CF6'
                    }}>{brand.name.charAt(0).toUpperCase()}</div>}
                          <span className="text-sm font-semibold tracking-[-0.5px] truncate">{brand.name}</span>
                        </button>)}
                      {!isAdmin && brandMemberships.map(membership => <button key={membership.brand_id} onClick={() => handleWorkspaceChange(membership.brands.slug)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${workspace === membership.brands.slug ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/50'}`}>
                          {membership.brands.logo_url ? <img src={membership.brands.logo_url} alt={membership.brands.name} className="w-4 h-4 rounded object-cover" /> : <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-semibold text-white" style={{
                      backgroundColor: membership.brands.brand_color || '#8B5CF6'
                    }}>{membership.brands.name.charAt(0).toUpperCase()}</div>}
                          <span className="text-sm font-semibold tracking-[-0.5px] truncate">{membership.brands.name}</span>
                        </button>)}
                      <button onClick={() => {
                    setShowCreateBrandDialog(true);
                  }} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors text-foreground hover:bg-muted/50">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-semibold tracking-[-0.5px]">Create brand</span>
                      </button>
                    </div>
                  </div>}
                
                {/* Quick Links */}
                <div className="space-y-0.5 opacity-60">
                  <button onClick={() => navigate("/support")} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-foreground hover:bg-muted/50 transition-colors">
                    <img src={isLightMode ? supportIconLight : supportIcon} alt="Support" className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-[-0.5px]">Support</span>
                  </button>
                  <button onClick={() => window.open("https://discord.gg/virality", "_blank")} className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-foreground hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img alt="Discord" className="w-4 h-4 rounded" src={isLightMode ? discordIconLight : "/lovable-uploads/6c9f19d0-2d91-4b27-98dc-3ce76d39c24c.webp"} />
                      <span className="text-sm font-semibold tracking-[-0.5px]">Discord</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => {
                  setFeedbackType("feature");
                  setFeedbackOpen(true);
                }} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-foreground hover:bg-muted/50 transition-colors">
                    <img src={isLightMode ? lightbulbIconLight : lightbulbIcon} alt="Feature Request" className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-[-0.5px]">Feature Request</span>
                  </button>
                  <button onClick={() => {
                  setFeedbackType("bug");
                  setFeedbackOpen(true);
                }} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-foreground hover:bg-muted/50 transition-colors">
                    <img src={isLightMode ? bugIconLight : bugIcon} alt="Report Bug" className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-[-0.5px]">Report Bug</span>
                  </button>
                </div>

                {/* Theme & Logout */}
                <div className="pt-1 flex items-center gap-2">
                  <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-muted text-foreground transition-colors">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span className="text-sm font-semibold tracking-[-0.5px]">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </button>
                  <button onClick={handleSignOut} className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-muted text-foreground hover:text-red-400 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-[-0.5px]">Log out</span>
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="font-geist font-semibold tracking-[-0.5px] text-foreground/80 h-8" onClick={() => setShowAuthDialog(true)}>
                Sign In
              </Button>
              <Button size="sm" className="font-geist font-semibold tracking-[-0.5px] bg-primary hover:bg-primary/90 border-t border-[#fbe0aa] h-8" onClick={() => setShowAuthDialog(true)}>
                Create Account
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-around bg-background border-t border-border px-2 pb-safe-bottom">
        {menuItems.map(item => {
        const isActive = location.pathname === '/' && currentTab === item.tab;
        return <button key={item.title} onClick={() => handleTabClick(item.tab)} className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}>
              {item.tab === "campaigns" ? <div className="relative h-6 w-6">
                  <img src={homeInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={homeActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "profile" ? <div className="relative h-6 w-6">
                  <img src={chefHatInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={chefHatActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "discover" ? <div className="relative h-6 w-6">
                  <img src={discoverInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={discoverActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "settings" ? <div className="relative h-6 w-6">
                  <img src={profileInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={profileActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "blueprints" ? <div className="relative h-6 w-6">
                  <img src={blueprintsInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={blueprintsActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "scope" ? <div className="relative h-6 w-6">
                  <img src={scopeInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={scopeActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "creators" ? <div className="relative h-6 w-6">
                  <img src={creatorsInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={creatorsActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "wallet" ? <Icon icon="material-symbols:id-card" className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} /> : item.tab === "education" ? <div className="relative h-6 w-6">
                  <img src={educationInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={educationActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "analytics" ? <div className="relative h-6 w-6">
                  <img src={campaignsInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={campaignsActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.icon ? <item.icon className={`h-6 w-6 ${isActive ? 'text-primary' : ''}`} /> : null}
              <span className="text-[12px] font-medium font-geist tracking-[-0.5px]">{item.title}</span>
            </button>;
      })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-16' : 'w-56 lg:w-64'} h-screen sticky top-0 bg-[#fdfdfd] dark:bg-background shrink-0 border-r border-border dark:border-border transition-all duration-200 overflow-visible`}>

        {/* Workspace Toggle */}
        {!isCollapsed ? <div className="px-2 py-[5px]">
            <Popover open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
              <PopoverTrigger asChild>
              <button className="w-full flex items-center justify-between px-3 py-2 transition-colors hover:bg-muted/50 dark:hover:bg-[#0e0e0e] rounded-md">
                  <div className="flex items-center gap-2">
                    {isCreatorMode ? <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                        <img src={theme === 'light' ? swapHorizLightIcon : swapHorizIcon} alt="" className="w-3.5 h-3.5" />
                      </div> : currentBrandLogo ? <img src={currentBrandLogo} alt={currentBrandName || "Brand logo"} className="w-6 h-6 rounded object-cover" /> : <div className="w-6 h-6 rounded flex items-center justify-center" style={{
                  backgroundColor: currentBrandColor || '#8B5CF6'
                }}>
                          <span className="text-[10px] font-semibold text-white">{currentBrandName?.charAt(0).toUpperCase()}</span>
                        </div>}
                    <p className="font-medium text-foreground truncate max-w-[160px] tracking-[-0.5px] text-sm">{isCreatorMode ? 'Switch to workspace' : getWorkspaceDisplayName()}</p>
                  </div>
                  <img src={unfoldMoreIcon} alt="" className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0 bg-background border border-border" align="start" sideOffset={4}>
                <div className="font-inter tracking-[-0.5px]">
                  {/* Current Workspace Details - Only show when in brand mode */}
                  {!isCreatorMode && currentBrandId && <div className="p-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {currentBrandLogo ? <img src={currentBrandLogo} alt={currentBrandName || "Brand logo"} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                    backgroundColor: currentBrandColor || '#8B5CF6'
                  }}>
                            <span className="text-sm font-medium text-white uppercase">{currentBrandName?.charAt(0)}</span>
                          </div>}
                        <div>
                          <p className="text-[13px] font-medium text-foreground truncate max-w-[160px]">{currentBrandName}</p>
                          <p className="text-[11px] text-muted-foreground">{currentBrandMemberCount} {currentBrandMemberCount === 1 ? 'Member' : 'Members'}</p>
                        </div>
                      </div>
                      
                    </div>}
                  
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 pt-3 pb-2">
                    <span className="text-[11px] font-medium font-inter text-foreground">Workspaces</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{(isAdmin ? allBrands.length : brandMemberships.length) + 1} total</span>
                  </div>
                  
                  {/* Search */}
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/50 rounded-md">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <input type="text" placeholder="Type to filter..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" value={workspaceSearch} onChange={e => setWorkspaceSearch(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="border-t border-border" />
                  
                  {/* Active Section */}
                  
                  
                  <div className="px-1.5 pb-1.5 max-h-[320px] overflow-y-auto space-y-0.5 py-[5px]">
                    {/* Creator Dashboard */}
                    {(isCreatorMode ? "switch to workspace" : "switch to creator").includes(workspaceSearch.toLowerCase()) || workspaceSearch === "" ? <button onClick={() => handleWorkspaceChange("creator")} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${isCreatorMode ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-6 h-6 rounded-md">
                            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} className="object-cover rounded-md" /> : null}
                            <AvatarFallback className="text-[10px] font-semibold uppercase rounded-md">{displayName?.charAt(0) || 'C'}</AvatarFallback>
                          </Avatar>
                          <span className="text-[13px] font-medium text-foreground">Creator Dashboard</span>
                        </div>
                        {isCreatorMode && <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="w-2.5 h-2.5 text-primary-foreground" /></div>}
                      </button> : null}
                    
                    {/* Admin brands */}
                    {isAdmin && allBrands.filter(brand => (brand.name || brand.slug || '').toLowerCase().includes(workspaceSearch.toLowerCase()) || workspaceSearch === "").map(brand => {
                      const brandDisplayName = brand.name || brand.slug || 'Unnamed Brand';
                      return (
                        <button key={brand.id} onClick={() => handleWorkspaceChange(brand.slug)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${workspace === brand.slug ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                          <div className="flex items-center gap-2.5">
                            {brand.logo_url ? <Avatar className="w-6 h-6 rounded-md">
                                <AvatarImage src={brand.logo_url} alt={brandDisplayName} className="object-cover rounded-md" />
                                <AvatarFallback style={{ backgroundColor: brand.brand_color || '#8B5CF6' }} className="text-white text-[10px] font-semibold uppercase rounded-md">{brandDisplayName.charAt(0)}</AvatarFallback>
                              </Avatar> : <Avatar className="w-6 h-6 rounded-md">
                                <AvatarFallback style={{ backgroundColor: brand.brand_color || '#8B5CF6' }} className="text-white text-[10px] font-semibold uppercase rounded-md">{brandDisplayName.charAt(0)}</AvatarFallback>
                              </Avatar>}
                            <span className="text-[13px] font-medium text-foreground truncate max-w-[160px]">{brandDisplayName}</span>
                          </div>
                          {workspace === brand.slug && <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="w-2.5 h-2.5 text-primary-foreground" /></div>}
                        </button>
                      );
                    })}

                    {/* Non-admin brand memberships */}
                    {!isAdmin && brandMemberships.filter(membership => (membership.brands.name || membership.brands.slug || '').toLowerCase().includes(workspaceSearch.toLowerCase()) || workspaceSearch === "").map(membership => {
                      const brandDisplayName = membership.brands.name || membership.brands.slug || 'Unnamed Brand';
                      return (
                        <button key={membership.brand_id} onClick={() => handleWorkspaceChange(membership.brands.slug)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${workspace === membership.brands.slug ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                          <div className="flex items-center gap-2.5">
                            {membership.brands.logo_url ? <Avatar className="w-6 h-6 rounded-md">
                                <AvatarImage src={membership.brands.logo_url} alt={brandDisplayName} className="object-cover rounded-md" />
                                <AvatarFallback style={{ backgroundColor: membership.brands.brand_color || '#8B5CF6' }} className="text-white text-[10px] font-semibold uppercase rounded-md">{brandDisplayName.charAt(0)}</AvatarFallback>
                              </Avatar> : <Avatar className="w-6 h-6 rounded-md">
                                <AvatarFallback style={{ backgroundColor: membership.brands.brand_color || '#8B5CF6' }} className="text-white text-[10px] font-semibold uppercase rounded-md">{brandDisplayName.charAt(0)}</AvatarFallback>
                              </Avatar>}
                            <span className="text-[13px] font-medium text-foreground truncate max-w-[160px]">{brandDisplayName}</span>
                          </div>
                          {workspace === membership.brands.slug && <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="w-2.5 h-2.5 text-primary-foreground" /></div>}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="border-t border-border" />
                  
                  {/* Create Brand */}
                  <div className="p-1.5">
                    <button onClick={() => {
                  setWorkspaceOpen(false);
                  setShowCreateBrandDialog(true);
                }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors hover:bg-[#f2f2f2] dark:hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[13px] font-medium">Create Brand</span>
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div> : null}

        {/* Main Navigation */}
        <TooltipProvider delayDuration={0}>
        <nav className="flex-1 py-0 px-2 overflow-visible">
          <div className="flex flex-col gap-1 overflow-visible">
            {menuItems.map(item => {
            const isActive = location.pathname === '/' && currentTab === item.tab;
            const hasSubItems = item.subItems && item.subItems.length > 0;

            // For items with subitems (like Creators), render expandable menu
            if (hasSubItems) {
              return <div key={item.title}>
                  <button onClick={() => {
                  if (isCollapsed) {
                    handleTabClick(item.tab, "messages");
                  } else {
                    setCreatorsExpanded(!creatorsExpanded);
                    if (!creatorsExpanded) {
                      handleTabClick(item.tab, currentSubtab || "messages");
                    }
                  }
                }} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 transition-colors rounded-lg hover:bg-muted/50 dark:hover:bg-[#0e0e0e] ${isActive ? 'bg-muted dark:bg-[#0e0e0e] text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title={isCollapsed ? item.title : undefined}>
                    <div className="flex items-center gap-2">
                      <div className="relative h-[24px] w-[24px]">
                        <img src={creatorsInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                        <img src={creatorsActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                      </div>
                      {!isCollapsed && <span className="font-inter text-[15px] font-medium tracking-[-0.5px]">{item.title}</span>}
                    </div>
                    {!isCollapsed && <ChevronDown className={`w-4 h-4 transition-transform ${creatorsExpanded ? 'rotate-180' : ''}`} />}
                  </button>
                  
                  {/* Subitems */}
                  {!isCollapsed && creatorsExpanded && <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                      {item.subItems.map(subItem => {
                    const isSubActive = isActive && currentSubtab === subItem.subtab;
                    return <button key={subItem.subtab} onClick={() => handleSubtabClick(subItem.subtab)} className={`w-full flex items-center gap-2 px-2.5 py-2 transition-colors rounded-md hover:bg-muted/50 dark:hover:bg-[#0e0e0e] ${isSubActive ? 'bg-muted dark:bg-[#0e0e0e] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                            
                            <span className="font-inter text-[13px] font-medium tracking-[-0.5px]">{subItem.title}</span>
                          </button>;
                  })}
                    </div>}
                </div>;
            }
            const buttonContent = <button key={item.title} onClick={() => handleTabClick(item.tab, item.tab === "creators" ? "database" : undefined)} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-2 px-3'} py-2.5 transition-colors rounded-lg hover:bg-muted/50 dark:hover:bg-[#0e0e0e] ${isActive ? 'bg-muted dark:bg-[#0e0e0e] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {item.tab === "campaigns" ? <div className="relative h-[24px] w-[24px]">
                      <img src={homeInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={homeActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "profile" ? <div className="relative h-[24px] w-[24px]">
                      <img src={chefHatInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={chefHatActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "discover" ? <div className="relative h-[24px] w-[24px]">
                      <img src={discoverInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={discoverActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "settings" ? <div className="relative h-[24px] w-[24px]">
                      <img src={profileInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={profileActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "blueprints" ? <div className="relative h-[24px] w-[24px]">
                      <img src={blueprintsInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={blueprintsActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "creators" ? <div className="relative h-[24px] w-[24px]">
                      <img src={creatorsInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={creatorsActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "scope" ? <div className="relative h-[24px] w-[24px]">
                      <img src={scopeInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={scopeActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "wallet" ? <Icon icon="material-symbols:id-card" className={`h-[24px] w-[24px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`} /> : item.tab === "education" ? <div className="relative h-[24px] w-[24px]">
                      <img src={educationInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={educationActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "analytics" ? <div className="relative h-[24px] w-[24px]">
                      <img src={campaignsInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={campaignsActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.icon ? <item.icon className={`h-[24px] w-[24px] ${isActive ? 'text-primary' : ''}`} /> : null}
                  {!isCollapsed && <span className="font-inter text-[15px] font-medium tracking-[-0.5px]">{item.title}</span>}
                </button>;
            
            return isCollapsed ? (
              <Tooltip key={item.title} delayDuration={0}>
                <TooltipTrigger asChild>
                  {buttonContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[9999] font-inter font-medium tracking-[-0.3px] bg-popover border border-border shadow-lg">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            ) : buttonContent;
          })}

            {/* Joined Campaigns & Boosts - Discord style icons when collapsed (draggable) */}
            {isCollapsed && isCreatorMode && sortedJoinedCampaigns.length > 0 && (
              <>
                <div className="w-8 h-[1px] bg-border mx-auto my-2" />
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSidebarDragEnd} modifiers={[restrictToVerticalAxis]}>
                  <SortableContext items={sortedJoinedCampaigns.map(item => `${item.type}-${item.id}`)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col items-center gap-2 flex-1 overflow-visible">
                      {sortedJoinedCampaigns.map((item) => {
                        const itemPath = item.type === "campaign" ? `/dashboard/campaign/${item.id}` : `/dashboard/boost/${item.id}`;
                        const isActiveItem = location.pathname === itemPath;
                        const itemKey = `${item.type}-${item.id}`;
                        return (
                          <SortableSidebarItem key={itemKey} id={itemKey}>
                            {(isHovered) => (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative flex items-center justify-center overflow-visible">
                                    {/* Left pill indicator - at sidebar edge, half overflowing */}
                                    <div
                                      className={`absolute -left-3 top-1/2 -translate-y-1/2 w-1 bg-foreground rounded-r-full ${isHovered || isActiveItem ? 'transition-[height] duration-150 ease-out' : ''}`}
                                      style={{ height: isActiveItem ? 32 : isHovered ? 20 : 0 }}
                                    />
                                    <button
                                      onClick={() => navigate(itemPath)}
                                      className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-muted dark:bg-[#1a1a1a] hover:brightness-110 transition-all"
                                    >
                                      {item.brand_logo_url ? (
                                        <img
                                          src={item.brand_logo_url}
                                          alt={item.title}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-xs font-semibold text-foreground">
                                          {item.brand_name?.charAt(0).toUpperCase() || (item.type === "boost" ? 'B' : 'C')}
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={12} className="bg-[#111] dark:bg-[#111] text-white border-0 px-3 py-1.5 rounded-md shadow-xl">
                                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">{item.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </SortableSidebarItem>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
            )}

            {/* Brand Campaigns & Boosts - Discord style icons when collapsed (brand mode) */}
            {isCollapsed && !isCreatorMode && brandCampaignsForSidebar.length > 0 && (
              <>
                <div className="w-8 h-[1px] bg-border mx-auto my-2" />
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {brandCampaignsForSidebar.map((item) => {
                    const isActiveItem = item.type === "campaign"
                      ? searchParams.get("campaign") === item.id
                      : searchParams.get("boost") === item.id;
                    return (
                      <Tooltip key={`${item.type}-${item.id}`}>
                        <TooltipTrigger asChild>
                          <div className="relative flex items-center justify-center group">
                            {/* Left pill indicator */}
                            <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-1 bg-foreground rounded-r-full ${isActiveItem ? 'h-8 transition-[height] duration-150 ease-out' : 'h-0 group-hover:h-5 group-hover:transition-[height] group-hover:duration-150 group-hover:ease-out'}`} />
                            <button
                              onClick={() => {
                                const newParams = new URLSearchParams(searchParams);
                                newParams.set("tab", "analytics");
                                if (item.type === "campaign") {
                                  newParams.delete("boost");
                                  newParams.set("campaign", item.id);
                                } else {
                                  newParams.delete("campaign");
                                  newParams.set("boost", item.id);
                                }
                                navigate(`/?${newParams.toString()}`);
                              }}
                              className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-muted dark:bg-[#1a1a1a] hover:brightness-110 transition-all"
                            >
                              {item.cover_url ? (
                                <img
                                  src={item.cover_url}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-semibold text-foreground">
                                  {item.title?.charAt(0).toUpperCase() || (item.type === "boost" ? "B" : "C")}
                                </span>
                              )}
                            </button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12} className="bg-[#111] dark:bg-[#111] text-white border-0 px-3 py-1.5 rounded-md shadow-xl">
                          <p className="text-sm font-medium font-inter tracking-[-0.3px]">{item.title}</p>
                          <p className="text-xs text-white/60 font-inter tracking-[-0.3px] capitalize">{item.type}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </nav>
        </TooltipProvider>

        {/* Joined Campaigns Section - Hidden, shown inside nav when collapsed */}

        {/* BrandUpgradeCTA - Hidden for now
        {!isCreatorMode && !isCollapsed && currentBrandSubscriptionStatus !== "active" && currentBrandId && (
            <BrandUpgradeCTA
              brandId={currentBrandId}
              subscriptionPlan={currentBrandSubscriptionPlan}
              onUpgrade={() => setSubscriptionGateOpen(true)}
              variant="sidebar"
            />
          )}
        */}


        {/* User Profile Section */}
        <div className={`p-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Separator line when collapsed */}
          {isCollapsed && <div className="w-8 h-[1px] bg-border mb-2" />}
          <Popover>
            <PopoverTrigger asChild>
              <button className={`${isCollapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full gap-3 p-2.5'} flex items-center rounded-lg hover:bg-muted/50 transition-colors`}>
                <Avatar className={isCollapsed ? "w-8 h-8" : "w-9 h-9"}>
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {getInitial()}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && <>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-foreground truncate font-inter tracking-[-0.5px]">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate font-inter tracking-[-0.5px]">{effectiveUserEmail}</p>
                    </div>
                    
                  </>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-background border border-border rounded-xl overflow-hidden" side="top" align="start" sideOffset={8}>
              {/* Banner with fade - positioned absolutely behind content */}
              {bannerUrl && <div className="absolute inset-x-0 top-0 h-24 w-full rounded-t-xl overflow-hidden">
                  <img src={bannerUrl} alt="" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
                </div>}
              
              <div className={`p-3 relative z-10 ${bannerUrl ? 'pt-4' : ''}`}>
                {/* User Info + Theme Toggle */}
                <div className="flex items-center justify-between mb-1.5 px-2.5 py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate font-inter tracking-[-0.5px]">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[100px] font-inter tracking-[-0.5px]">{effectiveUserEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/50">
                    <button onClick={() => setTheme('light')} className={`p-1 rounded-md transition-colors ${theme === 'light' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      <Sun className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTheme('dark')} className={`p-1 rounded-md transition-colors ${theme === 'dark' || theme === 'system' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Menu Items */}
                <SidebarMenuButtons onFeedback={type => {
                setFeedbackType(type);
                setFeedbackOpen(true);
              }} supportIcon={supportIcon} lightbulbIcon={lightbulbIcon} bugIcon={bugIcon} />

                {/* Sign Out Button */}
                <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium font-inter tracking-[-0.5px]">Sign Out</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Wallet Dropdown - Desktop Sidebar (hidden when collapsed) */}
        {!isCollapsed && (
          <div className="px-2 pb-2">
            <WalletDropdown variant="sidebar" isCollapsed={false} />
          </div>
        )}
      </aside>
      <CreateBrandDialog open={showCreateBrandDialog} onOpenChange={setShowCreateBrandDialog} hideTrigger onSuccess={() => {
        // Invalidate brand memberships cache to refetch
        queryClient.invalidateQueries({ queryKey: ["brandMemberships", user?.id] });
      }} />
      <SubscriptionGateDialog brandId={currentBrandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} type={feedbackType} />
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <InviteMemberDialog open={inviteMemberOpen} onOpenChange={setInviteMemberOpen} brandId={currentBrandId} brandSlug={workspace || ''} onInviteSent={() => {
        // Invalidate brand info cache to refresh member count
        queryClient.invalidateQueries({ queryKey: ["currentBrandInfo", currentBrandId] });
      }} />
      <CampaignDetailsDialog campaign={selectedCampaignForDetails} open={campaignDetailsDialogOpen} onOpenChange={setCampaignDetailsDialogOpen} />
    </>;
}