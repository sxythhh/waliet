import { Dock, Compass, CircleUser, ArrowUpRight, LogOut, Settings, Medal, Gift, MessageSquare, HelpCircle, ChevronDown, Building2, User, Plus } from "lucide-react";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import newLogo from "@/assets/new-logo.png";
import viralityIcon from "@/assets/virality-icon.png";
import discordIcon from "@/assets/discord-icon.png";
import webStoriesInactive from "@/assets/web-stories-inactive.svg";
import webStoriesActive from "@/assets/web-stories-active.svg";
import walletInactive from "@/assets/wallet-inactive.svg";
import walletActive from "@/assets/wallet-active.svg";
import discoverInactive from "@/assets/discover-inactive.svg";
import discoverActive from "@/assets/discover-active.svg";
import profileInactive from "@/assets/profile-inactive.svg";
import profileActive from "@/assets/profile-active.svg";
import blueprintsInactive from "@/assets/blueprints-inactive.svg";
import blueprintsActive from "@/assets/blueprints-active.svg";
import creatorsInactive from "@/assets/creators-inactive.svg";
import creatorsActive from "@/assets/creators-active.svg";
import referralsInactive from "@/assets/referrals-inactive.svg";
import referralsActive from "@/assets/referrals-active.svg";
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
interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}
interface BrandMembership {
  brand_id: string;
  role: string;
  brands: {
    name: string;
    slug: string;
    logo_url: string | null;
  };
}
const creatorMenuItems = [{
  title: "Campaigns",
  tab: "campaigns",
  icon: null as any
}, {
  title: "Wallet",
  tab: "wallet",
  icon: Dock
}, {
  title: "Discover",
  tab: "discover",
  icon: Compass
}, {
  title: "Referrals",
  tab: "referrals",
  icon: null as any
}, {
  title: "Profile",
  tab: "profile",
  icon: CircleUser
}];
const brandMenuItems = [{
  title: "Campaigns",
  tab: "campaigns",
  icon: null as any
}, {
  title: "Blueprints",
  tab: "blueprints",
  icon: null as any
}, {
  title: "Creators",
  tab: "creators",
  icon: null as any
}, {
  title: "Profile",
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
    theme
  } = useTheme();
  const {
    isAdmin
  } = useAdminCheck();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [accountType, setAccountType] = useState<string>("creator");
  const [brandMemberships, setBrandMemberships] = useState<BrandMembership[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [currentBrandName, setCurrentBrandName] = useState<string>("");
  const [currentBrandLogo, setCurrentBrandLogo] = useState<string | null>(null);
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const menuItems = isCreatorMode ? creatorMenuItems : brandMenuItems;
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBrandMemberships();
    }
  }, [user]);
  useEffect(() => {
    if (isAdmin) {
      fetchAllBrands();
    }
  }, [isAdmin]);
  useEffect(() => {
    // Update current brand info when workspace changes
    if (!isCreatorMode && workspace) {
      // Check in allBrands first (for admins), then in brandMemberships
      const brandFromAll = allBrands.find(b => b.slug === workspace);
      if (brandFromAll) {
        setCurrentBrandName(brandFromAll.name);
        setCurrentBrandLogo(brandFromAll.logo_url);
        return;
      }
      const brand = brandMemberships.find(m => m.brands.slug === workspace);
      if (brand) {
        setCurrentBrandName(brand.brands.name);
        setCurrentBrandLogo(brand.brands.logo_url);
      }
    }
  }, [workspace, brandMemberships, allBrands, isCreatorMode]);
  const fetchProfile = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from("profiles").select("avatar_url, full_name, username, account_type").eq("id", user.id).single();
    if (data) {
      setAvatarUrl(data.avatar_url);
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
    } = await supabase.from("brand_members").select("brand_id, role, brands(name, slug, logo_url)").eq("user_id", user.id);
    if (data) {
      setBrandMemberships(data as unknown as BrandMembership[]);
    }
  };
  const fetchAllBrands = async () => {
    const {
      data
    } = await supabase.from("brands").select("id, name, slug, logo_url").order("name");
    if (data) {
      setAllBrands(data);
    }
  };
  const getInitial = () => {
    return displayName.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U";
  };
  const handleTabClick = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    // Clear blueprint and campaign params when switching tabs
    newParams.delete("blueprint");
    newParams.delete("campaign");
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
      return <div className="w-6 h-6 rounded bg-[#1f1f1f] flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-neutral-400" />
        </div>;
    }
    if (currentBrandLogo) {
      return <img src={currentBrandLogo} alt="" className="w-6 h-6 rounded object-cover" />;
    }
    return <div className="w-6 h-6 rounded bg-[#1f1f1f] flex items-center justify-center">
        <Building2 className="w-3.5 h-3.5 text-neutral-400" />
      </div>;
  };
  return <>
      {/* Mobile Header - Top */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between bg-[#0a0a0a] px-4">
        <div className="flex items-center gap-2">
          <OptimizedImage src={viralityIcon} alt="Logo" className="h-7 w-7 rounded-lg object-cover" />
          <span className="font-geist font-bold tracking-tighter-custom text-base text-white">VIRALITY</span>
        </div>
        <div className="flex items-center gap-3">
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
            <PopoverContent className="w-72 p-0 bg-card" align="end">
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-xl font-bold mb-1">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="secondary" onClick={() => handleTabClick("profile")}>
                    Settings
                  </Button>
                  <ThemeToggle />
                </div>
                
                {/* Workspace switcher in mobile menu */}
                {(isAdmin ? allBrands.length > 0 : brandMemberships.length > 0) && <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Switch Workspace</p>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      <button onClick={() => handleWorkspaceChange("creator")} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${isCreatorMode ? 'bg-accent' : 'hover:bg-accent/50'}`}>
                        <User className="w-4 h-4" />
                        <span className="text-sm">Creator Dashboard</span>
                      </button>
                      {isAdmin && allBrands.map(brand => <button key={brand.id} onClick={() => handleWorkspaceChange(brand.slug)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${workspace === brand.slug ? 'bg-accent' : 'hover:bg-accent/50'}`}>
                          {brand.logo_url ? <img src={brand.logo_url} alt="" className="w-4 h-4 rounded object-cover" /> : <Building2 className="w-4 h-4" />}
                          <span className="text-sm truncate">{brand.name}</span>
                        </button>)}
                      {!isAdmin && brandMemberships.map(membership => <button key={membership.brand_id} onClick={() => handleWorkspaceChange(membership.brands.slug)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${workspace === membership.brands.slug ? 'bg-accent' : 'hover:bg-accent/50'}`}>
                          {membership.brands.logo_url ? <img src={membership.brands.logo_url} alt="" className="w-4 h-4 rounded object-cover" /> : <Building2 className="w-4 h-4" />}
                          <span className="text-sm truncate">{membership.brands.name}</span>
                        </button>)}
                    </div>
                  </div>}
                
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-0 py-2 text-left hover:opacity-70 transition-opacity" onClick={() => navigate("/leaderboard")}>
                    <Medal className="w-4 h-4" />
                    <span className="font-medium text-sm">Leaderboard</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-0 py-2 text-left hover:opacity-70 transition-opacity" onClick={() => navigate("/referrals")}>
                    <Gift className="w-4 h-4" />
                    <span className="font-medium text-sm">Referrals</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-0 py-2 text-left hover:opacity-70 transition-opacity" onClick={() => window.open("https://discord.gg/virality", "_blank")}>
                    <div className="flex items-center gap-3">
                      <img src={discordIcon} alt="Discord" className="w-4 h-4 rounded" />
                      <span className="font-medium text-sm">Discord</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button className="w-full flex items-center gap-2 px-0 py-2 text-left hover:opacity-70 transition-opacity" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium text-sm">Log out</span>
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-around bg-[#0a0a0a] px-2">
        {menuItems.map(item => {
        const isActive = location.pathname === '/dashboard' && currentTab === item.tab;
        return <button key={item.title} onClick={() => handleTabClick(item.tab)} className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all ${isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {item.tab === "campaigns" ? <div className="relative h-6 w-6">
                  <img src={webStoriesInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={webStoriesActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
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
                </div> : item.tab === "creators" ? <div className="relative h-6 w-6">
                  <img src={creatorsInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={creatorsActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.tab === "referrals" ? <div className="relative h-6 w-6">
                  <img src={referralsInactive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                  <img src={referralsActive} alt="" className={`absolute inset-0 h-6 w-6 transition-opacity duration-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </div> : item.icon ? <item.icon className={`h-6 w-6 ${isActive ? 'text-[#2060df]' : ''}`} /> : null}
              <span className="text-[10px] font-medium font-geist tracking-[-0.5px]">{item.title}</span>
            </button>;
      })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 h-screen sticky top-0 bg-[#0a0a0a] shrink-0 border-r border-[#141414]">
        {/* Logo */}
        <div className="flex items-center justify-between py-[10px] px-[10px]">
          <div className="flex items-center gap-2.5">
            <OptimizedImage src={viralityIcon} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-geist font-bold tracking-tighter-custom text-base text-white">
              VIRALITY
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* Workspace Toggle */}
        <div className="px-px py-0">
          <Popover open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
            <PopoverTrigger asChild>
              <button className="w-full flex items-center justify-between px-2.5 py-2 transition-colors rounded hover:bg-[#0e0e0e]">
                <div className="flex items-center gap-2">
                  {isCreatorMode ? <Avatar className="w-6 h-6">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-[#1f1f1f] text-[10px] text-neutral-400">
                        {displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar> : currentBrandLogo ? <img src={currentBrandLogo} alt="" className="w-6 h-6 rounded object-cover" /> : <div className="w-6 h-6 rounded bg-[#1f1f1f] flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                      </div>}
                  <p className="text-xs font-medium text-white truncate max-w-[120px] tracking-[-0.5px]">{getWorkspaceDisplayName()}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${workspaceOpen ? 'rotate-180' : ''}`} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1.5 bg-[#141414] border-0" align="start" sideOffset={4}>
              <div className="space-y-0.5 max-h-[400px] overflow-y-auto font-inter tracking-[-0.5px]">
                <button onClick={() => handleWorkspaceChange("creator")} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${isCreatorMode ? 'bg-[#1f1f1f]' : 'hover:bg-[#1f1f1f]'}`}>
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-[#1f1f1f] text-[10px] text-neutral-400">
                      {displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-white">Creator Dashboard</span>
                </button>
                {isAdmin && allBrands.length > 0 && <>
                    
                    {allBrands.map(brand => <button key={brand.id} onClick={() => handleWorkspaceChange(brand.slug)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${workspace === brand.slug ? 'bg-[#1f1f1f]' : 'hover:bg-[#1f1f1f]'}`}>
                        {brand.logo_url ? <img src={brand.logo_url} alt="" className="w-5 h-5 rounded object-cover" /> : <div className="w-5 h-5 rounded bg-[#1f1f1f] flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-neutral-400" />
                          </div>}
                        <span className="text-sm font-medium text-white truncate">{brand.name}</span>
                      </button>)}
                  </>}
              {!isAdmin && brandMemberships.length > 0 && <>
                    <p className="px-2 py-1 text-[10px] text-neutral-500 uppercase tracking-wider">Your Brands</p>
                    {brandMemberships.map(membership => <button key={membership.brand_id} onClick={() => handleWorkspaceChange(membership.brands.slug)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${workspace === membership.brands.slug ? 'bg-[#1f1f1f]' : 'hover:bg-[#1f1f1f]'}`}>
                        {membership.brands.logo_url ? <img src={membership.brands.logo_url} alt="" className="w-5 h-5 rounded object-cover" /> : <div className="w-5 h-5 rounded bg-[#1f1f1f] flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-neutral-400" />
                          </div>}
                        <span className="text-sm font-medium text-white truncate">{membership.brands.name}</span>
                      </button>)}
                  </>}
                {!isAdmin && <>
                    
                    <button onClick={() => {
                  setWorkspaceOpen(false);
                  setShowCreateBrandDialog(true);
                }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:bg-[#1f1f1f] text-neutral-400 hover:text-white">
                      <div className="w-5 h-5 rounded bg-[#1f1f1f] flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-medium">Create Brand</span>
                    </button>
                  </>}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-0 px-0">
          <div>
            {menuItems.map(item => {
            const isActive = location.pathname === '/dashboard' && currentTab === item.tab;
            return <button key={item.title} onClick={() => handleTabClick(item.tab)} className={`w-full flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[#0e0e0e] ${isActive ? 'text-white' : 'text-[#6f6f6f] hover:text-white'}`}>
                  {item.tab === "campaigns" ? <div className="relative h-[21px] w-[21px]">
                      <img src={webStoriesInactive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={webStoriesActive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "wallet" ? <div className="relative h-[21px] w-[21px]">
                      <img src={walletInactive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={walletActive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "discover" ? <div className="relative h-[21px] w-[21px]">
                      <img src={discoverInactive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={discoverActive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "profile" ? <div className="relative h-[21px] w-[21px]">
                      <img src={profileInactive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={profileActive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "blueprints" ? <div className="relative h-[21px] w-[21px]">
                      <img src={blueprintsInactive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={blueprintsActive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "creators" ? <div className="relative h-[21px] w-[21px]">
                      <img src={creatorsInactive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={creatorsActive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.tab === "referrals" ? <div className="relative h-[21px] w-[21px]">
                      <img src={referralsInactive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                      <img src={referralsActive} alt="" className={`absolute inset-0 h-[21px] w-[21px] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </div> : item.icon ? <item.icon className={`h-[21px] w-[21px] ${isActive ? 'text-[#2060df]' : ''}`} /> : null}
                  <span className="font-['Inter'] text-[14px] font-medium tracking-[-0.5px]">{item.title}</span>
                </button>;
          })}
          </div>

          {/* Secondary Links */}
          <div>
            
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-2">
          <div className="flex items-center gap-3 p-2.5">
            <Avatar className="w-9 h-9">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-neutral-800 text-neutral-300 text-sm">
                {getInitial()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleSignOut} className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Log out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      <CreateBrandDialog open={showCreateBrandDialog} onOpenChange={setShowCreateBrandDialog} hideTrigger onSuccess={() => {
      fetchBrandMemberships();
    }} />
    </>;
}