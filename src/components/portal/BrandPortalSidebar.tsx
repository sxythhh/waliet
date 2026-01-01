import { useSearchParams, useNavigate } from "react-router-dom";
import { Home, Briefcase, Wallet, FileVideo, MessageCircle, BookOpen, Settings, LogOut, ExternalLink, ChevronUp, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Brand } from "@/pages/BrandPortal";

interface BrandPortalSidebarProps {
  brand: Brand;
  currentTab: string;
}

const menuItems = [
  { title: "Home", tab: "home", icon: Home },
  { title: "Campaigns", tab: "campaigns", icon: Briefcase },
  { title: "Submissions", tab: "submissions", icon: FileVideo },
  { title: "Earnings", tab: "earnings", icon: TrendingUp },
  { title: "Wallet", tab: "wallet", icon: Wallet },
  { title: "Messages", tab: "messages", icon: MessageCircle },
  { title: "Resources", tab: "resources", icon: BookOpen },
  { title: "Settings", tab: "settings", icon: Settings },
];

export function BrandPortalSidebar({ brand, currentTab }: BrandPortalSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null; email: string | null } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setProfile({ ...data, email: user.email || null });
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

  const accentColor = brand.brand_color || "#2061de";

  return (
    <aside className="w-64 bg-gradient-to-b from-white to-gray-50/80 dark:from-background dark:to-background border-r border-gray-200/80 dark:border-border flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-gray-100 dark:border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 rounded-xl shadow-sm ring-2 ring-white dark:ring-border">
            <AvatarImage src={brand.logo_url || ""} alt={brand.name} className="object-cover" />
            <AvatarFallback 
              className="rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: accentColor }}
            >
              {brand.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 dark:text-foreground truncate text-[15px]">{brand.name}</h2>
            <p className="text-xs text-gray-500 dark:text-muted-foreground font-medium">Creator Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = currentTab === item.tab;
          const Icon = item.icon;
          
          return (
            <button
              key={item.tab}
              onClick={() => handleTabClick(item.tab)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left group ${
                isActive 
                  ? "text-white font-medium shadow-lg" 
                  : "text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-muted hover:text-gray-900 dark:hover:text-foreground"
              }`}
              style={isActive ? { 
                backgroundColor: accentColor,
                boxShadow: `0 4px 12px ${accentColor}40`
              } : undefined}
            >
              <Icon className={`h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
              <span className="text-[13px] font-medium">{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* User Section with Popover */}
      <div className="p-3 border-t border-gray-100 dark:border-border bg-gray-50/50 dark:bg-muted/20">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-muted shadow-sm hover:shadow-md transition-all duration-200 group">
              <Avatar className="h-8 w-8 ring-2 ring-gray-100 dark:ring-border">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gray-100 dark:bg-muted text-gray-600 dark:text-muted-foreground text-xs font-medium">
                  {profile?.username?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-medium text-gray-900 dark:text-foreground truncate">
                  {profile?.username || "Creator"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {profile?.email || ""}
                </p>
              </div>
              <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-foreground transition-colors" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            className="w-56 p-2"
            sideOffset={8}
          >
            <div className="space-y-1">
              <button
                onClick={() => {
                  handleTabClick("settings");
                  setPopoverOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                onClick={() => {
                  navigate("/dashboard");
                  setPopoverOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Main Dashboard
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
