import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { LogOut, Sun, Moon } from "lucide-react";
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

interface BrandPortalMobileNavProps {
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
  { title: "Settings", tab: "settings", iconInactive: profileInactive, iconActive: profileActive },
];

export function BrandPortalMobileNav({ brand, currentTab }: BrandPortalMobileNavProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [userProfile, setUserProfile] = useState<{
    username: string | null;
    avatar_url: string | null;
    email: string | null;
    full_name: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, avatar_url, full_name")
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
    <>
      {/* Mobile Header - Top */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between bg-background px-4">
        <Link to={`/portal/${brand.slug}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="h-7 w-7 rounded object-cover"
            />
          ) : (
            <div
              className="h-7 w-7 rounded flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: brand.brand_color || '#2061de' }}
            >
              {brand.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-geist font-bold tracking-tighter-custom text-base text-foreground uppercase">
            {brand.name}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Wallet Dropdown - Mobile */}
          <WalletDropdown variant="header" />

          {/* User Avatar */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="cursor-pointer">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={userProfile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {getInitial()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-background border border-border rounded-xl shadow-2xl" align="end" sideOffset={8}>
              <div className="p-3 space-y-1 font-inter">
                {/* Quick Links */}
                <div className="space-y-0.5">
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-semibold tracking-[-0.5px]">Switch to Main Dashboard</span>
                  </button>
                </div>

                {/* Theme & Logout */}
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-muted text-foreground transition-colors"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span className="text-sm font-semibold tracking-[-0.5px]">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-muted text-foreground hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-[-0.5px]">Log out</span>
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-around bg-background border-t border-border px-2 pb-safe-bottom">
        {menuItems.map((item) => {
          const isActive = currentTab === item.tab;
          const brandColor = brand.brand_color || '#2061de';

          return (
            <button
              key={item.tab}
              onClick={() => handleTabClick(item.tab)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all",
                !isActive && 'text-muted-foreground hover:text-foreground/80'
              )}
              style={isActive ? { color: brandColor } : undefined}
            >
              <div className="relative h-6 w-6">
                {/* Inactive icon */}
                <img
                  src={item.iconInactive}
                  alt=""
                  className={cn(
                    "absolute inset-0 h-6 w-6 transition-opacity duration-0",
                    isActive ? 'opacity-0' : 'opacity-100'
                  )}
                />
                {/* Active icon with brand color applied via mask */}
                {isActive && (
                  <div
                    className="absolute inset-0 h-6 w-6"
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
              <span className="text-[12px] font-medium font-geist tracking-[-0.5px]">{item.title}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
