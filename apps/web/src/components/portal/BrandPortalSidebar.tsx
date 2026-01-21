import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { LogOut, Sun, Moon, ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Brand } from "@/pages/BrandPortal";
import { useTheme } from "@/components/ThemeProvider";
import { WalletDropdown } from "@/components/WalletDropdown";
import { cn } from "@/lib/utils";

// Import dual-state icons from assets
import homeInactive from "@/assets/home-inactive-new.png";
import homeActive from "@/assets/WalietHomeActive.png";
import chefHatInactive from "@/assets/chef-hat-gray.svg";
import chefHatActive from "@/assets/chef-hat-blue.svg";
import discoverInactive from "@/assets/discover-inactive.svg";
import discoverActive from "@/assets/discover-active.svg";
import educationInactive from "@/assets/education-inactive.svg";
import educationActive from "@/assets/education-active.svg";
import profileInactive from "@/assets/profile-inactive.svg";
import profileActive from "@/assets/profile-active.svg";
import messagesInactive from "@/assets/mail-inactive.svg";
import messagesActive from "@/assets/mail-active.svg";
import supportIcon from "@/assets/support-icon.svg";
import supportIconLight from "@/assets/support-icon-light.svg";

interface BrandPortalSidebarProps {
  brand: Brand;
  currentTab: string;
}

interface MenuItem {
  title: string;
  tab: string;
  iconInactive: string;
  iconActive: string;
}

const menuItems: MenuItem[] = [
  { title: "Home", tab: "home", iconInactive: homeInactive, iconActive: homeActive },
  { title: "Profile", tab: "profile", iconInactive: chefHatInactive, iconActive: chefHatActive },
  { title: "Discover", tab: "discover", iconInactive: discoverInactive, iconActive: discoverActive },
  { title: "Resources", tab: "resources", iconInactive: educationInactive, iconActive: educationActive },
  { title: "Messages", tab: "messages", iconInactive: messagesInactive, iconActive: messagesActive },
  { title: "Settings", tab: "settings", iconInactive: profileInactive, iconActive: profileActive },
];

export function BrandPortalSidebar({ brand, currentTab }: BrandPortalSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [userProfile, setUserProfile] = useState<{
    username: string | null;
    avatar_url: string | null;
    email: string | null;
    full_name: string | null;
    banner_url: string | null;
  } | null>(null);

  const isLightMode = theme === "light" || (theme === "system" && !window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, avatar_url, full_name, banner_url")
          .eq("id", user.id)
          .maybeSingle();
        setUserProfile({ ...data, email: user.email || null });
      }
    };
    fetchProfile();
  }, []);

  const handleTabClick = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getInitial = () => {
    return userProfile?.full_name?.charAt(0).toUpperCase() ||
           userProfile?.username?.charAt(0).toUpperCase() ||
           userProfile?.email?.charAt(0).toUpperCase() || "U";
  };

  const displayName = userProfile?.full_name || userProfile?.username || "Creator";

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#fdfdfd] dark:bg-background shrink-0 border-r border-border dark:border-border">
      {/* Brand Header */}
      <div className="flex items-center gap-2 px-[14px] pl-[17px] py-[8px]">
        <Link to={`/portal/${brand.slug}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="h-6 w-6 rounded object-cover"
            />
          ) : (
            <div
              className="h-6 w-6 rounded flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: brand.brand_color || '#2061de' }}
            >
              {brand.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-geist font-bold tracking-tighter-custom text-base text-foreground uppercase">
            {brand.name}
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-0 px-2">
        <div className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = currentTab === item.tab;
            const brandColor = brand.brand_color || '#2061de';

            return (
              <button
                key={item.tab}
                onClick={() => handleTabClick(item.tab)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 transition-colors rounded-lg",
                  "hover:bg-muted/50 dark:hover:bg-[#0e0e0e]",
                  isActive
                    ? "bg-muted dark:bg-[#0e0e0e]"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={isActive ? { color: brandColor } : undefined}
              >
                <div className="relative h-[24px] w-[24px]">
                  {/* Inactive icon */}
                  <img
                    src={item.iconInactive}
                    alt=""
                    className={cn(
                      "absolute inset-0 h-[24px] w-[24px] transition-opacity duration-0",
                      isActive ? 'opacity-0' : 'opacity-100'
                    )}
                  />
                  {/* Active icon with brand color applied via mask */}
                  {isActive && (
                    <div
                      className="absolute inset-0 h-[24px] w-[24px]"
                      style={{
                        backgroundColor: brandColor,
                        WebkitMaskImage: `url(${item.iconActive})`,
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                        maskImage: `url(${item.iconActive})`,
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center',
                      }}
                    />
                  )}
                </div>
                <span className="font-inter text-[15px] font-medium tracking-[-0.5px]">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="p-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="w-9 h-9">
                <AvatarImage src={userProfile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                  {getInitial()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate font-inter tracking-[-0.5px]">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate font-inter tracking-[-0.5px]">
                  {userProfile?.email}
                </p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-0 bg-background border border-border rounded-xl overflow-hidden"
            side="top"
            align="start"
            sideOffset={8}
          >
            {/* Banner with fade */}
            {userProfile?.banner_url && (
              <div className="absolute inset-x-0 top-0 h-24 w-full rounded-t-xl overflow-hidden">
                <img src={userProfile.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
              </div>
            )}

            <div className={cn("p-3 relative z-10", userProfile?.banner_url ? 'pt-4' : '')}>
              {/* User Info + Theme Toggle */}
              <div className="flex items-center justify-between mb-1.5 px-2.5 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate font-inter tracking-[-0.5px]">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[100px] font-inter tracking-[-0.5px]">
                      {userProfile?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/50">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      "p-1 rounded-md transition-colors",
                      theme === 'light' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "p-1 rounded-md transition-colors",
                      theme === 'dark' || theme === 'system' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-0.5 mb-2">
                <button
                  onClick={() => navigate("/support")}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-foreground hover:bg-muted/50 transition-colors"
                >
                  <img src={isLightMode ? supportIconLight : supportIcon} alt="Support" className="w-4 h-4" />
                  <span className="text-sm font-medium font-inter tracking-[-0.5px]">Support</span>
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-foreground hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-medium font-inter tracking-[-0.5px]">Main Dashboard</span>
                  </div>
                </button>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium font-inter tracking-[-0.5px]">Sign Out</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Wallet Dropdown */}
      <div className="px-2 pb-2">
        <WalletDropdown variant="sidebar" />
      </div>
    </aside>
  );
}
