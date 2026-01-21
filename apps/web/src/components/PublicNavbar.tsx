import { Link, useLocation, useNavigate } from "react-router-dom";
import HelpIcon from "@mui/icons-material/Help";
import searchIcon from "@/assets/search-icon.svg";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/AuthDialog";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { FloatingFooter } from "@/components/FloatingFooter";
import forBrandsIcon from "@/assets/for-brands-icon.png";
import forBrandsIconLight from "@/assets/for-brands-icon-light.svg";
import exploreIconDark from "@/assets/explore-icon-dark.svg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield } from "lucide-react";
interface PublicNavbarProps {
  searchQuery?: string;
  onSearchClick?: () => void;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}
export default function PublicNavbar({
  searchQuery,
  onSearchClick,
  scrollContainerRef
}: PublicNavbarProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const handleSearchClick = useCallback(() => {
    if (onSearchClick) {
      onSearchClick();
    } else {
      navigate('/discover');
    }
  }, [onSearchClick, navigate]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        handleSearchClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSearchClick]);
  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", userId)
        .single();
      if (data) {
        setUserProfile(data);
      }
    };

    const checkAdminStatus = async (userId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };

    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setIsAuthenticated(!!session);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
        checkAdminStatus(session.user.id);
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
        checkAdminStatus(session.user.id);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const isActive = (path: string) => location.pathname === path;
  return <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2" aria-label="Virality Home">
                <img alt="Virality Logo" className="h-6 w-6" src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png" width="24" height="24" />
                <span className="text-[17px] font-clash font-semibold text-foreground tracking-[-0.4px] -ml-0.5">VIRALITY</span>
              </Link>
              
              <div className="hidden md:flex items-center gap-1">
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="bg-transparent text-foreground/80 hover:text-foreground hover:bg-transparent font-inter tracking-[-0.5px] text-sm data-[state=open]:bg-transparent focus:bg-transparent focus:text-foreground data-[active]:bg-transparent">
                        Platform
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-64 p-3 bg-background border border-border rounded-xl shadow-2xl py-[7px] px-[7px]">
                          <NavigationMenuLink asChild>
                            <Link to="/discover" className="flex items-center gap-3 px-3 text-sm text-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors py-[5px]">
                              <img alt="" className="w-5 h-5 dark:hidden" src={exploreIconDark} />
                              <img alt="" className="w-5 h-5 hidden dark:block" src="/lovable-uploads/1bb8553e-31bf-4d20-8651-40cdd3afde83.png" />
                              <div>
                                <div className="font-medium text-foreground">Discover</div>
                                <div className="text-xs text-muted-foreground">Find content opportunities</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                          <NavigationMenuLink asChild>
                            <Link to="/new" className="flex items-center gap-3 px-3 text-sm text-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors py-[5px]">
                              <img src={forBrandsIconLight} alt="" className="w-5 h-5 dark:hidden" />
                              <img src={forBrandsIcon} alt="" className="w-5 h-5 hidden dark:block" />
                              <div>
                                <div className="font-medium text-foreground">For Brands</div>
                                <div className="text-xs text-muted-foreground">Launch opportunities on Virality</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                          <NavigationMenuLink asChild>
                            <Link to="/support" className="flex items-center gap-3 px-3 text-sm text-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors py-[5px]">
                              <HelpIcon className="text-black dark:text-white" sx={{ fontSize: 20 }} />
                              <div>
                                <div className="font-medium text-foreground">Support</div>
                                <div className="text-xs text-muted-foreground">Get help and find answers</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                
                <Link to="/resources" className={`px-[10px] py-2 text-sm font-geist font-medium tracking-[-0.5px] ${isActive('/resources') ? 'text-foreground' : 'text-foreground/80 hover:text-foreground'}`}>
                  Resources
                </Link>
                
                <Link to="/contact" className={`px-[10px] py-2 text-sm font-geist font-medium tracking-[-0.5px] ${isActive('/contact') ? 'text-foreground' : 'text-foreground/80 hover:text-foreground'}`}>
                  Contact
                </Link>
              </div>
            </div>
            
            {/* Search Input - Desktop only */}
            <button onClick={handleSearchClick} className="hidden md:flex items-center justify-between gap-3 px-3 h-8 bg-[#f3f5f7] dark:bg-muted/20 rounded-md text-sm font-inter tracking-[-0.5px] text-muted-foreground dark:text-muted-foreground/50 hover:bg-[#e5e7e9] dark:hover:bg-muted/30 transition-colors min-w-[280px]">
              <div className="flex items-center gap-2">
                <img src={searchIcon} alt="" className="h-4 w-4 opacity-100 dark:opacity-60" />
                <span>{searchQuery || 'Search opportunities'}</span>
              </div>
              <div className="flex items-center justify-center h-5 w-5 rounded bg-[#787f8c]/20 dark:bg-white/10 text-[11px] font-medium text-muted-foreground dark:text-white/50">
                /
              </div>
            </button>
            
            <div className="flex items-center gap-3">
              {/* Desktop Auth Buttons */}
              <div className="hidden md:flex items-center gap-2">
                {isAuthenticated === null ? <div className="w-24 h-8" /> : isAuthenticated ? <>
                    {isAdmin && (
                      <Link to="/admin">
                        <Button size="sm" variant="ghost" className="font-geist font-medium tracking-[-0.5px] px-3 gap-1.5 text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg">
                          <Shield className="h-3.5 w-3.5" />
                          Admin
                        </Button>
                      </Link>
                    )}
                    <Link to="/">
                      <Button size="sm" className="font-geist font-medium tracking-[-0.5px] px-5 h-[34px] bg-primary hover:bg-primary/90 border-t border-[#fbe0aa] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 rounded-lg">
                        Dashboard
                      </Button>
                    </Link>
                    {userProfile?.username && (
                      <Link to={`/@${userProfile.username}`} className="group flex items-center">
                        <Avatar className="h-[32px] w-[32px] ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                          <AvatarImage src={userProfile.avatar_url || ''} alt={userProfile.username} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                            {userProfile.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    )}
                  </> : <>
                    <Button variant="ghost" size="sm" className="font-geist font-medium tracking-[-0.5px] hover:bg-transparent hover:text-foreground px-[10px] rounded-3xl text-foreground/80" onClick={() => setShowAuthDialog(true)}>
                      Sign In
                    </Button>
                    <Button size="sm" onClick={() => setShowAuthDialog(true)} className="font-geist font-medium tracking-[-0.5px] px-5 bg-gradient-to-b from-primary via-primary to-primary/70 shadow-[0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-md">
                      Create Account
                    </Button>
                  </>}
              </div>

              {/* Mobile Auth Buttons */}
              <div className="md:hidden flex items-center gap-2">
                {isAuthenticated === true && isAdmin && (
                  <Link to="/admin">
                    <Button size="sm" variant="ghost" className="font-geist font-medium tracking-[-0.5px] px-2 text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg">
                      <Shield className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                {isAuthenticated === true && (
                  <Link to="/">
                    <Button size="sm" className="font-geist font-medium tracking-[-0.5px] px-5 h-[34px] bg-primary hover:bg-primary/90 border-t border-[#fbe0aa] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 rounded-lg">
                      Dashboard
                    </Button>
                  </Link>
                )}
                {isAuthenticated === false && (
                  <Button size="sm" onClick={() => setShowAuthDialog(true)} className="font-geist font-medium tracking-[-0.5px] px-5 bg-gradient-to-b from-primary via-primary to-primary/70 shadow-[0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-md">
                    Create Account
                  </Button>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <FloatingFooter scrollContainerRef={scrollContainerRef} />
    </>;
}