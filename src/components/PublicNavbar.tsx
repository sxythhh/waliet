import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setIsAuthenticated(!!session);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);
  const isActive = (path: string) => location.pathname === path;
  const handleMobileNavClick = () => {
    setMobileMenuOpen(false);
  };
  return <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#0a0a0a] border-b border-border">
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
                        <div className="w-64 p-3 bg-white dark:bg-[#0a0a0a] border border-border rounded-xl shadow-2xl py-[7px] px-[7px]">
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
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                
                <Link to="/resources" className={`px-3 py-2 text-sm font-inter tracking-[-0.5px] ${isActive('/resources') ? 'text-foreground' : 'text-foreground/80 hover:text-foreground'}`}>
                  Resources
                </Link>
                
                <Link to="/contact" className={`px-3 py-2 text-sm font-inter tracking-[-0.5px] ${isActive('/contact') ? 'text-foreground' : 'text-foreground/80 hover:text-foreground'}`}>
                  Contact
                </Link>
              </div>
            </div>
            
            {/* Search Input - Desktop only */}
            <button onClick={handleSearchClick} className="hidden md:flex items-center justify-between gap-3 px-3 h-8 bg-[#f3f5f7] dark:bg-muted/20 rounded-md text-sm font-inter tracking-[-0.5px] text-[#787f8c] dark:text-muted-foreground/50 hover:bg-[#e5e7e9] dark:hover:bg-muted/30 transition-colors min-w-[280px]">
              <div className="flex items-center gap-2">
                <img src={searchIcon} alt="" className="h-4 w-4 opacity-100 dark:opacity-60" />
                <span>{searchQuery || 'Search opportunities'}</span>
              </div>
              <div className="flex items-center justify-center h-5 w-5 rounded bg-[#787f8c]/20 dark:bg-white/10 text-[11px] font-medium text-[#787f8c] dark:text-white/50">
                /
              </div>
            </button>
            
            <div className="flex items-center gap-3">
              {/* Desktop Auth Buttons */}
              <div className="hidden md:flex items-center gap-3">
                {isAuthenticated === null ? <div className="w-24 h-8" /> : isAuthenticated ? <>
                    <Link to="/dashboard">
                      <Button size="sm" className="font-geist font-medium tracking-[-0.5px] px-5 bg-[#2061de] hover:bg-[#2061de]/90 border-t border-[#3d75f0] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 rounded-lg">
                        Dashboard
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={async () => {
                  await supabase.auth.signOut();
                }} className="font-inter tracking-[-0.3px] font-medium text-muted-foreground hover:text-white hover:bg-destructive/20 gap-1.5 rounded-xl" aria-label="Sign out">
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign Out
                    </Button>
                  </> : <>
                    <Button variant="ghost" size="sm" className="font-geist font-medium tracking-[-0.5px] hover:bg-transparent hover:text-foreground px-[10px] rounded-3xl text-foreground/80" onClick={() => setShowAuthDialog(true)}>
                      Sign In
                    </Button>
                    <Button size="sm" onClick={() => setShowAuthDialog(true)} className="font-geist font-medium tracking-[-0.5px] px-5 bg-gradient-to-b from-primary via-primary to-primary/70 shadow-[0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-md">
                      Create Account
                    </Button>
                  </>}
              </div>

              {/* Mobile Create Account Button */}
              {isAuthenticated === false && <Button size="sm" onClick={() => setShowAuthDialog(true)} className="md:hidden font-geist font-medium tracking-[-0.5px] px-4 bg-gradient-to-b from-primary via-primary to-primary/70 border-t shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-2xl text-sm">
                  Create Account
                </Button>}

              {/* Mobile Hamburger Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] bg-background border-border p-0">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <Link to="/" onClick={handleMobileNavClick} className="flex items-center gap-2">
                        <img alt="Virality Logo" className="h-6 w-6" src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png" />
                        <span className="text-[17px] font-clash font-semibold text-foreground tracking-[-0.4px]">VIRALITY</span>
                      </Link>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4">
                      <div className="px-4 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">Platform</p>
                        <Link to="/discover" onClick={handleMobileNavClick} className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                          <img alt="" className="w-5 h-5 dark:hidden" src={exploreIconDark} />
                          <img alt="" className="w-5 h-5 hidden dark:block" src="/lovable-uploads/1bb8553e-31bf-4d20-8651-40cdd3afde83.png" />
                          <span>Discover</span>
                        </Link>
                        <Link to="/new" onClick={handleMobileNavClick} className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                          <img src={forBrandsIconLight} alt="" className="w-5 h-5 dark:hidden" />
                          <img src={forBrandsIcon} alt="" className="w-5 h-5 hidden dark:block" />
                          <span>For Brands</span>
                        </Link>
                      </div>

                      <div className="px-4 mt-4 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">Pages</p>
                        <Link to="/resources" onClick={handleMobileNavClick} className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${isActive('/resources') ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/50'}`}>
                          Resources
                        </Link>
                        <Link to="/contact" onClick={handleMobileNavClick} className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${isActive('/contact') ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/50'}`}>
                          Contact
                        </Link>
                        <Link to="/support" onClick={handleMobileNavClick} className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${isActive('/support') ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/50'}`}>
                          Support
                        </Link>
                      </div>
                    </div>

                    <div className="p-4 border-t border-border space-y-2">
                      {isAuthenticated === null ? null : isAuthenticated ? <>
                          <Link to="/dashboard" onClick={handleMobileNavClick} className="block">
                            <Button size="sm" className="w-full font-geist font-medium tracking-[-0.5px] bg-[#2061de] hover:bg-[#2061de]/90 border-t border-[#3d75f0] rounded-lg">
                              Dashboard
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={async () => {
                        await supabase.auth.signOut();
                        setMobileMenuOpen(false);
                      }} className="w-full font-inter tracking-[-0.3px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5">
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </Button>
                        </> : <>
                          <Button variant="outline" size="sm" className="w-full font-geist font-medium tracking-[-0.5px]" onClick={() => {
                        setShowAuthDialog(true);
                        setMobileMenuOpen(false);
                      }}>
                            Sign In
                          </Button>
                          <Button size="sm" onClick={() => {
                        setShowAuthDialog(true);
                        setMobileMenuOpen(false);
                      }} className="w-full font-geist font-medium tracking-[-0.5px] bg-gradient-to-b from-primary via-primary to-primary/70 border-t border-[#a11010]/[0.26] rounded-lg">
                            Create Account
                          </Button>
                        </>}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </header>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <FloatingFooter scrollContainerRef={scrollContainerRef} />
    </>;
}