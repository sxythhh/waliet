"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import {
  MdSavings,
  MdRateReview,
  MdSettings,
  MdKeyboardArrowDown,
  MdLogout,
  MdLightMode,
  MdDarkMode,
  MdSearch,
  MdCheck,
  MdAdd,
  MdPerson,
  MdHelpOutline,
  MdBugReport,
  MdLightbulbOutline,
} from "react-icons/md";
import { FaDiscord } from "react-icons/fa";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { CreateWorkspaceDialog } from "@/components/dashboard-new/CreateWorkspaceDialog";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// Custom Waliet home icon component that switches between active/inactive states
function WalietHomeIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <Image
      src={active ? "/icons/WalietHomeActive.png" : "/icons/WalietHomeInactive.png"}
      alt="Home"
      width={20}
      height={20}
      className={cn(
        className,
        active
          // Active: In light mode (solid gold bg), make icon white
          // Active: In dark mode (transparent gold bg), keep gold icon
          ? "brightness-0 invert dark:brightness-100 dark:invert-0"
          // Inactive: In dark mode on hover, make icon white
          : "dark:group-hover:brightness-0 dark:group-hover:invert"
      )}
    />
  );
}

// Placeholder icon type for custom icons
const HOME_ICON_PLACEHOLDER = "HOME" as const;

interface MenuItem {
  title: string;
  tab: string;
  icon: IconType | typeof HOME_ICON_PLACEHOLDER;
}

// Personal/Creator mode menu items
const personalMenuItems: MenuItem[] = [
  { title: "Home", tab: "home", icon: HOME_ICON_PLACEHOLDER },
  { title: "Discover", tab: "discover", icon: MdSavings },
  { title: "Profile", tab: "profile", icon: MdPerson },
  { title: "Wallet", tab: "wallet", icon: MdRateReview },
  { title: "Settings", tab: "settings", icon: MdSettings },
];

// Brand/Workspace mode menu items
const brandMenuItems: MenuItem[] = [
  { title: "Home", tab: "home", icon: HOME_ICON_PLACEHOLDER },
  { title: "Sessions", tab: "campaigns", icon: MdSavings },
  { title: "Services", tab: "blueprints", icon: MdRateReview },
  { title: "Clients", tab: "creators", icon: MdPerson },
  { title: "Settings", tab: "settings", icon: MdSettings },
];

interface Workspace {
  id: string;
  name: string;
  slug: string;
  color: string;
  logoUrl: string | null;
}

function DashboardSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "home";
  const currentWorkspace = searchParams.get("workspace") || "personal";

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // Determine mode based on workspace
  const isPersonalMode = currentWorkspace === "personal";
  const isBrandMode = !isPersonalMode;
  const menuItems = isPersonalMode ? personalMenuItems : brandMenuItems;

  // Find current workspace details
  const currentWorkspaceDetails = workspaces.find(w => w.slug === currentWorkspace);

  // Fetch user data from server (handles Whop header, Whop OAuth cookie, and Supabase)
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          // Create a user object compatible with the existing UI expectations
          setUser({
            id: data.user.id,
            email: data.user.email || undefined,
            user_metadata: {
              full_name: data.user.name,
              avatar_url: data.user.avatar,
            },
          } as User);
        }
      })
      .catch(err => {
        console.error("Failed to fetch user:", err);
      });
  }, []);

  // Load workspaces from localStorage (in real app, fetch from API)
  useEffect(() => {
    const saved = localStorage.getItem("waliet_workspaces");
    if (saved) {
      try {
        setWorkspaces(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse workspaces", e);
      }
    }
  }, []);

  const handleTabClick = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    // Preserve workspace param
    if (currentWorkspace !== "personal") {
      params.set("workspace", currentWorkspace);
    } else {
      params.delete("workspace");
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleWorkspaceChange = (workspaceSlug: string) => {
    const params = new URLSearchParams();
    if (workspaceSlug === "personal") {
      params.set("tab", "home");
    } else {
      params.set("workspace", workspaceSlug);
      params.set("tab", "home");
    }
    localStorage.setItem("lastWorkspace", workspaceSlug);
    setWorkspaceOpen(false);
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleSignOut = async () => {
    // Clear Supabase session
    const supabase = createClient();
    await supabase.auth.signOut();

    // Clear Whop OAuth cookie
    document.cookie = 'whop_oauth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    // Set logged out flag (prevents auto-login via Whop header in app view)
    document.cookie = 'waliet-logged-out=true; path=/; max-age=86400'; // 24 hours

    // Clear local user state
    setUser(null);

    // Redirect to auth page
    router.push("/auth");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
  };

  const getInitial = () => {
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name;
    const email = user?.email;
    return name?.charAt(0).toUpperCase() || email?.charAt(0).toUpperCase() || "U";
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";

  const renderIcon = (item: MenuItem, isActive: boolean) => {
    if (item.icon === HOME_ICON_PLACEHOLDER) {
      return <WalietHomeIcon active={isActive} className="h-5 w-5" />;
    }
    const Icon = item.icon as IconType;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between bg-background px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">W</span>
          </div>
          <span className="font-semibold tracking-tight text-sm text-foreground">WALIET</span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.user_metadata?.avatar_url || undefined} alt={userName} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getInitial()}
                </AvatarFallback>
              </Avatar>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 bg-background border border-border rounded-xl" align="end" sideOffset={8}>
            <div className="p-3">
              {/* User Info + Theme Toggle */}
              <div className="flex items-center justify-between mb-3 px-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate tracking-tight">
                    {userName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-[100px] tracking-tight">
                    {userEmail}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/50">
                  <button
                    onClick={() => {
                      setTheme("light");
                      document.documentElement.classList.remove("dark");
                    }}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      theme === "light"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MdLightMode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setTheme("dark");
                      document.documentElement.classList.add("dark");
                    }}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      theme === "dark"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MdDarkMode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-0.5 mb-3">
                <button
                  onClick={() => window.open("https://discord.gg/waliet", "_blank")}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <FaDiscord className="h-4 w-4" />
                  <span className="text-sm font-medium tracking-tight">Discord</span>
                </button>
                <button
                  onClick={() => window.open("mailto:support@waliet.com", "_blank")}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <MdHelpOutline className="h-4 w-4" />
                  <span className="text-sm font-medium tracking-tight">Support</span>
                </button>
                <button
                  onClick={() => window.open("mailto:feedback@waliet.com?subject=Feature%20Request", "_blank")}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <MdLightbulbOutline className="h-4 w-4" />
                  <span className="text-sm font-medium tracking-tight">Feature Request</span>
                </button>
                <button
                  onClick={() => window.open("mailto:bugs@waliet.com?subject=Bug%20Report", "_blank")}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <MdBugReport className="h-4 w-4" />
                  <span className="text-sm font-medium tracking-tight">Report Bug</span>
                </button>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                <MdLogout className="w-4 h-4" />
                <span className="text-sm font-medium tracking-tight">Sign Out</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2">
          {menuItems.map((item) => {
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => handleTabClick(item.tab)}
                className={cn(
                  "group flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[64px] transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground dark:bg-primary/10 dark:text-primary"
                    : "text-muted-foreground"
                )}
              >
                {renderIcon(item, isActive)}
                <span className="text-[10px] font-medium">{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 bg-card shrink-0 border-r border-border transition-all duration-200",
          isCollapsed ? "w-16" : "w-56 lg:w-64"
        )}
      >
        {/* Workspace Toggle */}
        {!isCollapsed && (
          <div className="px-2 py-2">
            <Popover open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-muted rounded-lg">
                  <div className="flex items-center gap-2.5">
                    {isPersonalMode ? (
                      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">W</span>
                      </div>
                    ) : currentWorkspaceDetails ? (
                      currentWorkspaceDetails.logoUrl ? (
                        <img
                          src={currentWorkspaceDetails.logoUrl}
                          alt={currentWorkspaceDetails.name}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: currentWorkspaceDetails.color }}
                        >
                          <span className="text-xs font-bold text-white">
                            {currentWorkspaceDetails.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">W</span>
                      </div>
                    )}
                    <p className="font-medium text-foreground truncate max-w-[140px] tracking-tight text-sm">
                      {isPersonalMode ? "Dashboard" : currentWorkspaceDetails?.name || "Workspace"}
                    </p>
                  </div>
                  <MdKeyboardArrowDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0 bg-background border border-border" align="start" sideOffset={4}>
                <div className="p-3">
                  {/* Search */}
                  <div className="px-1 pb-3">
                    <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/50 rounded-lg">
                      <MdSearch className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Type to filter..."
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                        value={workspaceSearch}
                        onChange={(e) => setWorkspaceSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Personal Dashboard */}
                  <div className="pt-3 space-y-1">
                    <button
                      onClick={() => handleWorkspaceChange("personal")}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                        isPersonalMode ? "bg-primary/10" : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-6 h-6 rounded-lg">
                          <AvatarImage src={user?.user_metadata?.avatar_url || undefined} className="object-cover rounded-lg" />
                          <AvatarFallback className="text-[10px] font-semibold uppercase rounded-lg bg-muted">
                            {getInitial()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] font-medium text-foreground">My Dashboard</span>
                      </div>
                      {isPersonalMode && (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <MdCheck className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Workspaces List */}
                  {workspaces.length > 0 && (
                    <>
                      <div className="border-t border-border mt-3" />
                      <div className="pt-3 space-y-1">
                        <p className="px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Workspaces
                        </p>
                        {workspaces
                          .filter(w =>
                            w.name.toLowerCase().includes(workspaceSearch.toLowerCase())
                          )
                          .map((workspace) => (
                            <button
                              key={workspace.id}
                              onClick={() => handleWorkspaceChange(workspace.slug)}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                                currentWorkspace === workspace.slug ? "bg-primary/10" : "hover:bg-muted"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                {workspace.logoUrl ? (
                                  <img
                                    src={workspace.logoUrl}
                                    alt={workspace.name}
                                    className="w-6 h-6 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div
                                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: workspace.color }}
                                  >
                                    <span className="text-[10px] font-semibold text-white">
                                      {workspace.name.slice(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <span className="text-[13px] font-medium text-foreground truncate max-w-[140px]">
                                  {workspace.name}
                                </span>
                              </div>
                              {currentWorkspace === workspace.slug && (
                                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                  <MdCheck className="w-2.5 h-2.5 text-primary-foreground" />
                                </div>
                              )}
                            </button>
                          ))}
                      </div>
                    </>
                  )}

                  <div className="border-t border-border mt-3" />

                  {/* Create New */}
                  <div className="pt-3">
                    <button
                      onClick={() => {
                        setWorkspaceOpen(false);
                        setCreateWorkspaceOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                        <MdAdd className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[13px] font-medium">Create Workspace</span>
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Main Navigation */}
        <TooltipProvider delayDuration={0}>
          <nav className="flex-1 py-1 px-2">
            <div className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const isActive = currentTab === item.tab;

                const buttonContent = (
                  <button
                    key={item.tab}
                    onClick={() => handleTabClick(item.tab)}
                    className={cn(
                      "group w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors rounded-lg",
                      isCollapsed ? "justify-center px-0" : "",
                      isActive
                        ? "bg-primary text-primary-foreground dark:bg-primary/10 dark:text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {renderIcon(item, isActive)}
                    {!isCollapsed && (
                      <span className="text-[15px] font-medium tracking-tight">{item.title}</span>
                    )}
                  </button>
                );

                return isCollapsed ? (
                  <Tooltip key={item.tab} delayDuration={0}>
                    <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="z-[9999] font-medium tracking-tight bg-popover border border-border shadow-lg"
                    >
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  buttonContent
                );
              })}
            </div>
          </nav>
        </TooltipProvider>

        {/* User Profile Section */}
        <div className={cn("p-2", isCollapsed && "flex flex-col items-center")}>
          {isCollapsed && <div className="w-8 h-[1px] bg-border mb-2" />}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center rounded-lg hover:bg-muted/50 transition-colors",
                  isCollapsed ? "w-10 h-10 p-0 justify-center" : "w-full gap-3 p-2.5"
                )}
              >
                <Avatar className={isCollapsed ? "w-8 h-8" : "w-9 h-9"}>
                  <AvatarImage src={user?.user_metadata?.avatar_url || undefined} alt={userName} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {getInitial()}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-foreground truncate tracking-tight">
                      {userName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate tracking-tight">
                      {userEmail}
                    </p>
                  </div>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-0 bg-background border border-border rounded-xl overflow-hidden"
              side="top"
              align="start"
              sideOffset={8}
            >
              <div className="p-3">
                {/* User Info + Theme Toggle */}
                <div className="flex items-center justify-between mb-3 px-2.5 py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate tracking-tight">
                        {userName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[100px] tracking-tight">
                        {userEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/50">
                    <button
                      onClick={() => {
                        setTheme("light");
                        document.documentElement.classList.remove("dark");
                      }}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        theme === "light"
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MdLightMode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setTheme("dark");
                        document.documentElement.classList.add("dark");
                      }}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        theme === "dark"
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MdDarkMode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-0.5 mb-3">
                  <button
                    onClick={() => window.open("https://discord.gg/waliet", "_blank")}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <FaDiscord className="h-4 w-4" />
                    <span className="text-sm font-medium tracking-tight">Discord</span>
                  </button>
                  <button
                    onClick={() => window.open("mailto:support@waliet.com", "_blank")}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <MdHelpOutline className="h-4 w-4" />
                    <span className="text-sm font-medium tracking-tight">Support</span>
                  </button>
                  <button
                    onClick={() => window.open("mailto:feedback@waliet.com?subject=Feature%20Request", "_blank")}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <MdLightbulbOutline className="h-4 w-4" />
                    <span className="text-sm font-medium tracking-tight">Feature Request</span>
                  </button>
                  <button
                    onClick={() => window.open("mailto:bugs@waliet.com?subject=Bug%20Report", "_blank")}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <MdBugReport className="h-4 w-4" />
                    <span className="text-sm font-medium tracking-tight">Report Bug</span>
                  </button>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                >
                  <MdLogout className="w-4 h-4" />
                  <span className="text-sm font-medium tracking-tight">Sign Out</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </aside>

      {/* Create Workspace Dialog */}
      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onSuccess={(workspace) => {
          // Generate a slug from the name
          const slug = workspace.name.toLowerCase().replace(/\s+/g, "-").slice(0, 20) + "-" + Date.now().toString(36);
          const newWorkspace: Workspace = {
            id: Date.now().toString(),
            name: workspace.name,
            slug,
            color: workspace.color,
            logoUrl: workspace.logoUrl,
          };

          // Save to localStorage
          const updatedWorkspaces = [...workspaces, newWorkspace];
          setWorkspaces(updatedWorkspaces);
          localStorage.setItem("waliet_workspaces", JSON.stringify(updatedWorkspaces));

          // Switch to the new workspace
          handleWorkspaceChange(slug);
        }}
      />
    </>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "home";

  // Tabs that should have no padding (full-bleed layout)
  const fullBleedTabs = ["creators"];
  const isFullBleed = fullBleedTabs.includes(currentTab);

  return (
    <div className="flex h-screen w-full bg-background">
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col bg-background">
        <div className={cn(
          "pt-14 md:pt-0 flex-1 overflow-y-auto pb-20 md:pb-0 bg-background",
          isFullBleed ? "" : "px-4 sm:px-6 md:px-8 py-6 md:py-8"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

function DashboardLayoutSkeleton() {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex flex-col h-screen w-56 lg:w-64 bg-card shrink-0 border-r border-border">
        <div className="p-4 space-y-4">
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </aside>
      {/* Main content skeleton */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col bg-background">
        <div className="flex-1 p-8">
          <div className="max-w-5xl space-y-6">
            <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
