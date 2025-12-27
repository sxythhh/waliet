import { useSearchParams, useNavigate } from "react-router-dom";
import { Home, Briefcase, Wallet, FileVideo, User, LogOut, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
}

interface BrandPortalSidebarProps {
  brand: Brand;
  currentTab: string;
}

const menuItems = [
  { title: "Home", tab: "home", icon: Home },
  { title: "Campaigns", tab: "campaigns", icon: Briefcase },
  { title: "Earnings", tab: "earnings", icon: Wallet },
  { title: "Submissions", tab: "submissions", icon: FileVideo },
  { title: "Profile", tab: "profile", icon: User },
];

export function BrandPortalSidebar({ brand, currentTab }: BrandPortalSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(data);
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

      {/* User Section */}
      <div className="p-3 border-t border-gray-100 dark:border-border bg-gray-50/50 dark:bg-muted/20">
        {/* Go to Main Dashboard */}
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-600 dark:text-muted-foreground hover:bg-white dark:hover:bg-muted hover:text-gray-900 dark:hover:text-foreground hover:shadow-sm transition-all duration-200 mb-2"
        >
          <ExternalLink className="h-[18px] w-[18px]" />
          <span className="text-[13px] font-medium">Main Dashboard</span>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-muted shadow-sm">
          <Avatar className="h-8 w-8 ring-2 ring-gray-100 dark:ring-border">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-gray-100 dark:bg-muted text-gray-600 dark:text-muted-foreground text-xs font-medium">
              {profile?.username?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-900 dark:text-foreground truncate">
              {profile?.username || "Creator"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-foreground hover:bg-gray-100 dark:hover:bg-background rounded-lg"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
