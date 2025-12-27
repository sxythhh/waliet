import { Dock, Compass, CircleUser, ArrowUpRight, LogOut, Settings, Medal, Gift, MessageSquare, HelpCircle, ChevronDown, ChevronRight, Building2, User, Plus, Monitor, Sun, Moon, PanelLeftClose, PanelLeft, Search, Check, UserPlus, LayoutDashboard, Database, FileText, Trophy } from "lucide-react";
import unfoldMoreIcon from "@/assets/unfold-more-icon.svg";
import { SubscriptionGateDialog } from "@/components/brand/SubscriptionGateDialog";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { InviteMemberDialog } from "@/components/brand/InviteMemberDialog";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import newLogo from "@/assets/new-logo.png";
import ghostLogoBlue from "@/assets/ghost-logo-blue.png";
import discordIcon from "@/assets/discord-icon.png";
import supportIcon from "@/assets/support-icon.svg";
import lightbulbIcon from "@/assets/lightbulb-icon.svg";
import bugIcon from "@/assets/bug-icon.svg";
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import SidebarMenuButtons from "@/components/SidebarMenuButtons";
import { CampaignDetailsDialog } from "@/components/CampaignDetailsDialog";
interface JoinedCampaign {
  id: string;
  title: string;
  slug: string;
  brand_name: string;
  brand_logo_url: string | null;
  description: string | null;
  status: string;
  budget: number;
  budget_used?: number | null;
  rpm_rate: number;
  allowed_platforms: string[] | null;
  end_date: string | null;
  created_at: string;
  hashtags?: string[] | null;
  guidelines?: string | null;
  embed_url?: string | null;
  asset_links?: any[] | null;
  requirements?: string[] | null;
  campaign_update?: string | null;
  campaign_update_at?: string | null;
  payout_day_of_week?: number | null;
  blueprint_id?: string | null;
  payment_model?: string | null;
  post_rate?: number | null;
}
interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
}
interface BrandMembership {
  brand_id: string;
  role: string;
  brands: {
    name: string;
    slug: string;
    logo_url: string | null;
    brand_color: string | null;
  };
}
interface SubItem {
  title: string;
  subtab: string;
  iconInactive: string;
  iconActive: string;
}
interface MenuItem {
  title: string;
  tab: string;
  icon: any;
  subItems?: SubItem[];
}
const creatorMenuItems: MenuItem[] = [{
  title: "Home",
  tab: "campaigns",
  icon: null as any
}, {
  title: "Profile",
  tab: "wallet",
  icon: Dock
}, {
  title: "Marketplace",
  tab: "discover",
  icon: Compass
}, {
  title: "Referrals",
  tab: "referrals",
  icon: null as any
}, {
  title: "Settings",
  tab: "profile",
  icon: CircleUser
}];
const brandMenuItems: MenuItem[] = [{
  title: "Home",
  tab: "campaigns",
  icon: null as any
}, {
  title: "Campaigns",
  tab: "analytics",
  icon: null as any
}, {
  title: "Blueprints",
  tab: "blueprints",
  icon: null as any
}, {
  title: "Creators",
  tab: "creators",
  icon: null as any,
  subItems: [{
    title: "Messages",
    subtab: "messages",
    iconInactive: messagesInactive,
    iconActive: messagesActive
  }, {
    title: "Database",
    subtab: "database",
    iconInactive: databaseInactive,
    iconActive: databaseActive
  }, {
    title: "Contracts",
    subtab: "contracts",
    iconInactive: contractsInactive,
    iconActive: contractsActive
  }
  // { title: "Leaderboard", subtab: "leaderboard", iconInactive: leaderboardInactive, iconActive: leaderboardActive },
  ]
}, {
  title: "Settings",
  tab: "profile",
  icon: CircleUser
}];
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [accountType, setAccountType] = useState<string>("creator");
  const [brandMemberships, setBrandMemberships] = useState<BrandMembership[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [currentBrandName, setCurrentBrandName] = useState<string>("");
  const [currentBrandLogo, setCurrentBrandLogo] = useState<string | null>(null);
  const [currentBrandColor, setCurrentBrandColor] = useState<string | null>(null);
  const [currentBrandSubscriptionStatus, setCurrentBrandSubscriptionStatus] = useState<string | null>(null);
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [subscriptionGateOpen, setSubscriptionGateOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"feature" | "bug">("feature");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [currentBrandMemberCount, setCurrentBrandMemberCount] = useState<number>(0);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [creatorsExpanded, setCreatorsExpanded] = useState(false);
  const [joinedCampaigns, setJoinedCampaigns] = useState<JoinedCampaign[]>([]);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<JoinedCampaign | null>(null);
  const [campaignDetailsDialogOpen, setCampaignDetailsDialogOpen] = useState(false);
  const menuItems = isCreatorMode ? creatorMenuItems : brandMenuItems;
  const currentSubtab = searchParams.get("subtab") || "messages";

  // Get current brand ID for subscription dialog
  const currentBrandId = !isCreatorMode && workspace ? allBrands.find(b => b.slug === workspace)?.id || brandMemberships.find(m => m.brands.slug === workspace)?.brand_id || '' : '';
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBrandMemberships();
      fetchJoinedCampaigns();
    }
  }, [user]);
  useEffect(() => {
    if (isAdmin) {
      fetchAllBrands();
    }
  }, [isAdmin]);
  useEffect(() => {
    // Update current brand info when workspace changes
    const fetchCurrentBrandInfo = async () => {
      if (!isCreatorMode && workspace) {
        // Find the brand id first
        const brandFromAll = allBrands.find(b => b.slug === workspace);
        const brandFromMembership = brandMemberships.find(m => m.brands.slug === workspace);
        if (brandFromAll) {
          setCurrentBrandName(brandFromAll.name);
          setCurrentBrandLogo(brandFromAll.logo_url);
          setCurrentBrandColor(brandFromAll.brand_color);
          // Fetch subscription status
          const {
            data
          } = await supabase.from("brands").select("subscription_status").eq("id", brandFromAll.id).single();
          setCurrentBrandSubscriptionStatus(data?.subscription_status || null);
          // Fetch member count
          const {
            count
          } = await supabase.from("brand_members").select("id", {
            count: 'exact',
            head: true
          }).eq("brand_id", brandFromAll.id);
          setCurrentBrandMemberCount(count || 0);
        } else if (brandFromMembership) {
          setCurrentBrandName(brandFromMembership.brands.name);
          setCurrentBrandLogo(brandFromMembership.brands.logo_url);
          setCurrentBrandColor(brandFromMembership.brands.brand_color);
          // Fetch subscription status
          const {
            data
          } = await supabase.from("brands").select("subscription_status").eq("id", brandFromMembership.brand_id).single();
          setCurrentBrandSubscriptionStatus(data?.subscription_status || null);
          // Fetch member count
          const {
            count
          } = await supabase.from("brand_members").select("id", {
            count: 'exact',
            head: true
          }).eq("brand_id", brandFromMembership.brand_id);
          setCurrentBrandMemberCount(count || 0);
        }
      } else {
        setCurrentBrandSubscriptionStatus(null);
        setCurrentBrandMemberCount(0);
      }
    };
    fetchCurrentBrandInfo();
  }, [workspace, brandMemberships, allBrands, isCreatorMode]);
  const fetchProfile = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from("profiles").select("avatar_url, banner_url, full_name, username, account_type").eq("id", user.id).single();
    if (data) {
      setAvatarUrl(data.avatar_url);
      setBannerUrl(data.banner_url);
      setDisplayName(data.full_name || data.username || user.email || "");
      setAccountType(data.account_type || "creator");
    } else {
      setDisplayName(user.email || "");
    }
  };
  const fetchBrandMemberships = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from("brand_members").select("brand_id, role, brands(name, slug, logo_url, brand_color)").eq("user_id", user.id);
    if (data) {
      setBrandMemberships(data as unknown as BrandMembership[]);
    }
  };
  const fetchAllBrands = async () => {
    const {
      data
    } = await supabase.from("brands").select("id, name, slug, logo_url, brand_color").order("name");
    if (data) {
      setAllBrands(data);
    }
  };
  const fetchJoinedCampaigns = async () => {
    if (!user) return;

    // First get campaign IDs user has joined (accepted submissions)
    const {
      data: submissions
    } = await supabase.from("campaign_submissions").select("campaign_id").eq("creator_id", user.id).eq("status", "approved");
    if (!submissions || submissions.length === 0) {
      setJoinedCampaigns([]);
      return;
    }
    const campaignIds = submissions.map(s => s.campaign_id);

    // Fetch campaign details
    const {
      data: campaigns
    } = await supabase.from("campaigns").select("*").in("id", campaignIds).eq("status", "active").order("created_at", {
      ascending: false
    }).limit(5);
    if (campaigns) {
      setJoinedCampaigns(campaigns as JoinedCampaign[]);
    }
  };
  const getInitial = () => {
    return displayName.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U";
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
    setSearchParams(newParams);
  };
  const handleSubtabClick = (subtab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "creators");
    newParams.set("subtab", subtab);
    newParams.delete("blueprint");
    newParams.delete("campaign");
    newParams.delete("boost");
    setSearchParams(newParams);
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
    setSearchParams(newParams);
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
      return <img src={currentBrandLogo} alt="" className="w-6 h-6 rounded object-cover" />;
    }
    return <div className="w-6 h-6 rounded flex items-center justify-center" style={{
      backgroundColor: currentBrandColor || 'hsl(var(--muted))'
    }}>
        <span className="text-[10px] font-semibold text-white uppercase">{currentBrandName?.charAt(0) || 'B'}</span>
      </div>;
  };
  return <>
      {/* Mobile Header - Top */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between bg-background px-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <OptimizedImage src={ghostLogoBlue} alt="Logo" className="h-7 w-7 rounded-none object-cover mr-[2px]" />
          <span className="font-geist font-bold tracking-tighter-custom text-base text-foreground">VIRALITY</span>
        </Link>
        <div className="flex items-center gap-3">
          {/* Upgrade Plan Button - Mobile */}
          {!isCreatorMode && currentBrandSubscriptionStatus !== "active" && <button onClick={() => setSubscriptionGateOpen(true)} className="py-1.5 px-3 bg-primary border-t border-primary/70 rounded-lg font-['Inter'] text-[13px] font-medium tracking-[-0.5px] text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5">
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
              <div className="p-3 space-y-1 font-inter tracking-[-0.5px]">
                {/* Workspace Section */}
                {(isAdmin ? allBrands.length > 0 : brandMemberships.length > 0) && <div className="pb-1">
                    <button onClick={() => handleWorkspaceChange("creator")} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${isCreatorMode ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                      <img src={swapHorizIcon} alt="" className="w-4 h-4" />
                      <span className="text-sm">{isCreatorMode ? 'Switch to workspace' : 'Switch to creator'}</span>
                    </button>
                    <div className="max-h-[120px] overflow-y-auto">
                      {isAdmin && allBrands.slice(0, 5).map(brand => <button key={brand.id} onClick={() => handleWorkspaceChange(brand.slug)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${workspace === brand.slug ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                          {brand.logo_url ? <img src={brand.logo_url} alt="" className="w-4 h-4 rounded object-cover" /> : <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-semibold text-white" style={{
                      backgroundColor: brand.brand_color || '#8B5CF6'
                    }}>{brand.name.charAt(0).toUpperCase()}</div>}
                          <span className="text-sm truncate">{brand.name}</span>
                        </button>)}
                      {!isAdmin && brandMemberships.map(membership => <button key={membership.brand_id} onClick={() => handleWorkspaceChange(membership.brands.slug)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${workspace === membership.brands.slug ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                          {membership.brands.logo_url ? <img src={membership.brands.logo_url} alt="" className="w-4 h-4 rounded object-cover" /> : <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-semibold text-white" style={{
                      backgroundColor: membership.brands.brand_color || '#8B5CF6'
                    }}>{membership.brands.name.charAt(0).toUpperCase()}</div>}
                          <span className="text-sm truncate">{membership.brands.name}</span>
                        </button>)}
                      <button onClick={() => {
                    setShowCreateBrandDialog(true);
                  }} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">Create brand</span>
                      </button>
                    </div>
                  </div>}
                
                {/* Quick Links */}
                <div className="space-y-0.5">
                  <button onClick={() => navigate("/support")} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                    <img src={supportIcon} alt="Support" className="w-4 h-4" />
                    <span className="text-sm font-inter tracking-[-0.5px]">Support</span>
                  </button>
                  <button onClick={() => window.open("https://discord.gg/virality", "_blank")} className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                    <div className="flex items-center gap-3">
                      <img alt="Discord" className="w-4 h-4 rounded" src="/lovable-uploads/6c9f19d0-2d91-4b27-98dc-3ce76d39c24c.webp" />
                      <span className="text-sm font-inter tracking-[-0.5px]">Discord</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => {
                  setFeedbackType("feature");
                  setFeedbackOpen(true);
                }} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                    <img src={lightbulbIcon} alt="Feature Request" className="w-4 h-4" />
                    <span className="text-sm font-inter tracking-[-0.5px]">Feature Request</span>
                  </button>
                  <button onClick={() => {
                  setFeedbackType("bug");
                  setFeedbackOpen(true);
                }} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                    <img src={bugIcon} alt="Report Bug" className="w-4 h-4" />
                    <span className="text-sm font-inter tracking-[-0.5px]">Report Bug</span>
                  </button>
                </div>

                {/* Theme & Logout */}
                <div className="pt-1 flex items-center gap-2">
                  <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span className="text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </button>
                  <button onClick={handleSignOut} className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-muted text-muted-foreground hover:text-red-400 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Log out</span>
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-around bg-background border-t border-border px-2">
        {menuItems.map(item => {
        const isActive = location.pathname === '/dashboard' && currentTab === item.tab;
        return <button key={item.title} onClick={() => handleTabClick(item.tab)} className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}>
              {item.tab === "campaigns" ? <div className="relative h-6 w-6">
                  <img src={homeInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={homeActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "wallet" ? <div className="relative h-6 w-6">
                  <img src={walletInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={walletActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "discover" ? <div className="relative h-6 w-6">
                  <img src={discoverInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={discoverActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "profile" ? <div className="relative h-6 w-6">
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
                </div> : item.tab === "referrals" ? <div className="relative h-6 w-6">
                  <img src={referralsInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={referralsActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "education" ? <div className="relative h-6 w-6">
                  <img src={educationInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={educationActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.icon ? <item.icon className={`h-6 w-6 ${isActive ? 'text-[#2060df]' : ''}`} /> : null}
              <span className="text-[12px] font-medium font-geist tracking-[-0.5px]">{item.title}</span>
            </button>;
      })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-16' : 'w-56 lg:w-64'} h-screen sticky top-0 bg-[#fdfdfd] dark:bg-background shrink-0 border-r border-[#dedede] dark:border-border transition-all duration-200`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-[14px] py-[8px] pl-[17px]">
          <Link to="/" className={`flex items-center gap-0 hover:opacity-80 transition-opacity ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <OptimizedImage src={ghostLogoBlue} alt="Logo" className="h-6 w-6 rounded-none object-cover mr-[2px]" />
            {!isCollapsed && <span className="font-geist font-bold tracking-tighter-custom text-base text-foreground">
                VIRALITY
              </span>}
          </Link>
          {!isCollapsed && <button onClick={() => setIsCollapsed(true)} className="h-7 w-7 flex items-center justify-center rounded-[5px] hover:bg-muted transition-colors group">
              <img src="/src/assets/left-panel-close.svg" alt="Collapse" className="h-4 w-4 group-hover:hidden" />
              <img src="/src/assets/left-panel-close-hover.svg" alt="Collapse" className="h-4 w-4 hidden group-hover:block" />
            </button>}
        </div>

        {/* Workspace Toggle */}
        {!isCollapsed ? <div className="px-2 py-[5px]">
            <Popover open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
              <PopoverTrigger asChild>
              <button className="w-full flex items-center justify-between px-3 py-2 transition-colors hover:bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    {isCreatorMode ? <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                        <img src={theme === 'light' ? swapHorizLightIcon : swapHorizIcon} alt="" className="w-3.5 h-3.5" />
                      </div> : currentBrandLogo ? <img src={currentBrandLogo} alt="" className="w-6 h-6 rounded object-cover" /> : <div className="w-6 h-6 rounded flex items-center justify-center" style={{
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
                  {!isCreatorMode && currentBrandId && <div className="p-3 border-b border-border flex items-center justify-start">
                      <div className="flex items-center gap-3">
                        {currentBrandLogo ? <img src={currentBrandLogo} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
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
                    <span className="text-[11px] font-medium font-inter tracking-[-0.3px] text-foreground">Workspaces</span>
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
                    {(isCreatorMode ? "switch to workspace" : "switch to creator").includes(workspaceSearch.toLowerCase()) || workspaceSearch === "" ? <button onClick={() => handleWorkspaceChange("creator")} className={`w-full flex items-center justify-between px-2 py-2 rounded-md transition-colors ${isCreatorMode ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                            <img src={theme === 'light' ? swapHorizLightIcon : swapHorizIcon} alt="" className="w-4 h-4" />
                          </div>
                          <span className="text-[13px] font-medium text-foreground">{isCreatorMode ? 'Switch to workspace' : 'Switch to creator'}</span>
                        </div>
                        {isCreatorMode && <Check className="w-4 h-4 text-muted-foreground" />}
                      </button> : null}
                    
                    {/* Admin brands */}
                    {isAdmin && allBrands.filter(brand => brand.name.toLowerCase().includes(workspaceSearch.toLowerCase()) || workspaceSearch === "").map(brand => <button key={brand.id} onClick={() => handleWorkspaceChange(brand.slug)} className={`w-full flex items-center justify-between px-2 py-2 rounded-md transition-colors ${workspace === brand.slug ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                          <div className="flex items-center gap-2.5">
                            {brand.logo_url ? <img src={brand.logo_url} alt="" className="w-7 h-7 rounded-md object-cover" /> : <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{
                      backgroundColor: brand.brand_color || '#8B5CF6'
                    }}>
                                <span className="text-[11px] font-medium text-white uppercase">{brand.name.charAt(0)}</span>
                              </div>}
                            <span className="text-[13px] font-medium text-foreground truncate max-w-[140px]">{brand.name}</span>
                          </div>
                          {workspace === brand.slug && <Check className="w-4 h-4 text-muted-foreground" />}
                        </button>)}
                    
                    {/* Non-admin brand memberships */}
                    {!isAdmin && brandMemberships.filter(membership => membership.brands.name.toLowerCase().includes(workspaceSearch.toLowerCase()) || workspaceSearch === "").map(membership => <button key={membership.brand_id} onClick={() => handleWorkspaceChange(membership.brands.slug)} className={`w-full flex items-center justify-between px-2 py-2 rounded-md transition-colors ${workspace === membership.brands.slug ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                          <div className="flex items-center gap-2.5">
                            {membership.brands.logo_url ? <img src={membership.brands.logo_url} alt="" className="w-7 h-7 rounded-md object-cover" /> : <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{
                      backgroundColor: membership.brands.brand_color || '#8B5CF6'
                    }}>
                                <span className="text-[11px] font-medium text-white uppercase">{membership.brands.name.charAt(0)}</span>
                              </div>}
                            <span className="text-[13px] font-medium text-foreground truncate max-w-[140px]">{membership.brands.name}</span>
                          </div>
                          {workspace === membership.brands.slug && <Check className="w-4 h-4 text-muted-foreground" />}
                        </button>)}
                  </div>
                  
                  <div className="border-t border-border" />
                  
                  {/* Create Brand */}
                  <div className="p-1.5">
                    <button onClick={() => {
                  setWorkspaceOpen(false);
                  setShowCreateBrandDialog(true);
                }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[13px] font-medium">Create Brand</span>
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div> : <div className="px-2 py-2 flex justify-center">
            <button onClick={() => setIsCollapsed(false)} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors group">
              <img src="/src/assets/dock-to-right.svg" alt="Expand" className="h-4 w-4 group-hover:hidden" />
              <img src="/src/assets/dock-to-right-hover.svg" alt="Expand" className="h-4 w-4 hidden group-hover:block" />
            </button>
          </div>}

        {/* Main Navigation */}
        <nav className="flex-1 py-0 px-2">
          <div className="flex flex-col gap-1">
            {menuItems.map(item => {
            const isActive = location.pathname === '/dashboard' && currentTab === item.tab;
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
                      {!isCollapsed && <span className="font-['Inter'] text-[15px] font-medium tracking-[-0.5px]">{item.title}</span>}
                    </div>
                    {!isCollapsed && <ChevronDown className={`w-4 h-4 transition-transform ${creatorsExpanded ? 'rotate-180' : ''}`} />}
                  </button>
                  
                  {/* Subitems */}
                  {!isCollapsed && creatorsExpanded && <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                      {item.subItems.map(subItem => {
                    const isSubActive = isActive && currentSubtab === subItem.subtab;
                    return <button key={subItem.subtab} onClick={() => handleSubtabClick(subItem.subtab)} className={`w-full flex items-center gap-2 px-2.5 py-2 transition-colors rounded-md hover:bg-muted/50 dark:hover:bg-[#0e0e0e] ${isSubActive ? 'bg-muted dark:bg-[#0e0e0e] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                            
                            <span className="font-['Inter'] text-[13px] font-medium tracking-[-0.5px]">{subItem.title}</span>
                          </button>;
                  })}
                    </div>}
                </div>;
            }
            return <button key={item.title} onClick={() => handleTabClick(item.tab)} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-2 px-3'} py-2.5 transition-colors rounded-lg hover:bg-muted/50 dark:hover:bg-[#0e0e0e] ${isActive ? 'bg-muted dark:bg-[#0e0e0e] text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title={isCollapsed ? item.title : undefined}>
                  {item.tab === "campaigns" ? <div className="relative h-[24px] w-[24px]">
                      <img src={homeInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={homeActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "wallet" ? <div className="relative h-[24px] w-[24px]">
                      <img src={chefHatInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={chefHatActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "discover" ? <div className="relative h-[24px] w-[24px]">
                      <img src={discoverInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={discoverActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "profile" ? <div className="relative h-[24px] w-[24px]">
                      <img src={profileInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={profileActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "blueprints" ? <div className="relative h-[24px] w-[24px]">
                      <img src={blueprintsInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={blueprintsActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "scope" ? <div className="relative h-[24px] w-[24px]">
                      <img src={scopeInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={scopeActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "referrals" ? <div className="relative h-[24px] w-[24px]">
                      <img src={referralsInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={referralsActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "education" ? <div className="relative h-[24px] w-[24px]">
                      <img src={educationInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={educationActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "analytics" ? <div className="relative h-[24px] w-[24px]">
                      <img src={campaignsInactive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={campaignsActive} alt="" className={`absolute inset-0 h-[24px] w-[24px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.icon ? <item.icon className={`h-[24px] w-[24px] ${isActive ? 'text-[#2060df]' : ''}`} /> : null}
                  {!isCollapsed && <span className="font-['Inter'] text-[15px] font-medium tracking-[-0.5px]">{item.title}</span>}
                </button>;
          })}
          </div>
        </nav>

        {/* Joined Campaigns Section - Only show in creator mode */}
        {isCreatorMode && joinedCampaigns.length > 0 && <div className={`px-2 py-2 border-t border-border ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
            {!isCollapsed}
            <div className={`${isCollapsed ? 'flex flex-col items-center gap-2 mt-0' : 'mt-2 flex flex-col gap-0.5'} max-h-[200px] overflow-y-auto`}>
              {joinedCampaigns.map(campaign => <button key={campaign.id} onClick={() => {
            setSelectedCampaignForDetails(campaign);
            setCampaignDetailsDialogOpen(true);
          }} className={`flex items-center rounded-lg hover:bg-muted/50 dark:hover:bg-[#0e0e0e] transition-colors ${isCollapsed ? 'p-1.5 justify-center' : 'w-full gap-2 px-3 py-2 text-left'}`} title={isCollapsed ? campaign.title : undefined}>
                  <Avatar className="w-6 h-6 rounded-md flex-shrink-0">
                    <AvatarImage src={campaign.brand_logo_url || undefined} alt={campaign.brand_name} />
                    <AvatarFallback className="rounded-md text-[10px] bg-muted">
                      {campaign.brand_name?.charAt(0).toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && <span className="font-['Inter'] text-[13px] font-medium tracking-[-0.5px] text-foreground truncate">
                      {campaign.title}
                    </span>}
                </button>)}
            </div>
          </div>}

        {!isCreatorMode && !isCollapsed && currentBrandSubscriptionStatus !== "active" && <div className="px-2 py-1">
            <button onClick={() => setSubscriptionGateOpen(true)} className="w-full py-2 px-3 bg-primary border-t border-primary/70 rounded-lg font-['Inter'] text-[14px] font-medium tracking-[-0.5px] text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <img src={nutFillIcon} alt="" className="h-4 w-4" />
              Upgrade Plan
            </button>
          </div>}

        {/* Swap to Business CTA - Only show in creator mode if user has no workspaces */}
        {isCreatorMode && !isCollapsed && brandMemberships.length === 0 && !isAdmin && <div className="px-2 pb-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="font-['Geist'] text-[13px] font-medium tracking-[-0.5px] text-foreground mb-1">
                Swap to Business
              </p>
              <p className="font-['Geist'] text-[11px] tracking-[-0.5px] text-muted-foreground mb-2">
                Advanced analytics, unlimited campaigns, and priority support.
              </p>
              <button className="w-full py-2 px-3 bg-primary border-t border-primary/70 rounded-md font-['Geist'] text-[12px] font-medium tracking-[-0.5px] text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center" onClick={() => setShowCreateBrandDialog(true)}>
                Create Workspace
              </button>
            </div>
          </div>}


        {/* User Profile Section */}
        <div className={`p-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
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
                      <p className="text-xs text-muted-foreground truncate font-inter tracking-[-0.5px]">{user?.email}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                      <p className="text-xs text-muted-foreground truncate max-w-[100px] font-inter tracking-[-0.5px]">{user?.email}</p>
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
                <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors">
                  
                  <span className="text-sm font-medium font-inter tracking-[-0.5px]">Sign Out</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </aside>
      <CreateBrandDialog open={showCreateBrandDialog} onOpenChange={setShowCreateBrandDialog} hideTrigger onSuccess={() => {
      fetchBrandMemberships();
    }} />
      <SubscriptionGateDialog brandId={currentBrandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} type={feedbackType} />
      <InviteMemberDialog open={inviteMemberOpen} onOpenChange={setInviteMemberOpen} brandId={currentBrandId} onInviteSent={() => {
      // Refresh member count
      const fetchMemberCount = async () => {
        if (currentBrandId) {
          const {
            count
          } = await supabase.from("brand_members").select("id", {
            count: 'exact',
            head: true
          }).eq("brand_id", currentBrandId);
          setCurrentBrandMemberCount(count || 0);
        }
      };
      fetchMemberCount();
    }} />
      <CampaignDetailsDialog campaign={selectedCampaignForDetails} open={campaignDetailsDialogOpen} onOpenChange={setCampaignDetailsDialogOpen} />
    </>;
}