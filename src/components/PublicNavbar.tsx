import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/AuthDialog";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import blueprintsMenuIcon from "@/assets/blueprints-menu-icon.svg";
import campaignsMenuIcon from "@/assets/campaigns-menu-icon.svg";
import boostsMenuIcon from "@/assets/boosts-menu-icon.svg";
import forBrandsIcon from "@/assets/for-brands-icon.png";
export default function PublicNavbar() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const location = useLocation();
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
  return <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2" aria-label="Virality Home">
                <img alt="Virality Logo" className="h-6 w-6" src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png" width="24" height="24" />
                <span className="text-[17px] font-clash font-semibold text-white tracking-[-0.4px] -ml-0.5">VIRALITY</span>
              </Link>
              
              <div className="hidden md:flex items-center gap-1">
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="bg-transparent text-white/80 hover:text-white hover:bg-transparent font-inter tracking-[-0.5px] text-sm data-[state=open]:bg-transparent focus:bg-transparent focus:text-white data-[active]:bg-transparent">
                        Platform
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-64 p-3 bg-black/40 backdrop-blur-2xl rounded-xl shadow-2xl">
                          <NavigationMenuLink asChild>
                            <Link to="/discover" className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors">
                              <img alt="" className="w-5 h-5" src="/lovable-uploads/1bb8553e-31bf-4d20-8651-40cdd3afde83.png" />
                              <div>
                                <div className="font-medium text-white">Discover</div>
                                <div className="text-xs text-white/50">Find content opportunities</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                          <NavigationMenuLink asChild>
                            <Link to="/new" className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors">
                              <img src={forBrandsIcon} alt="" className="w-5 h-5" />
                              <div>
                                <div className="font-medium text-white">For Brands</div>
                                <div className="text-xs text-white/50">Launch opportunities on Virality</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                
                <Link to="/resources" className={`px-3 py-2 text-sm font-inter tracking-[-0.5px] ${isActive('/resources') ? 'text-white' : 'text-white/80 hover:text-white'}`}>
                  Resources
                </Link>
                
                <Link to="/contact" className={`px-3 py-2 text-sm font-inter tracking-[-0.5px] ${isActive('/contact') ? 'text-white' : 'text-white/80 hover:text-white'}`}>
                  Contact
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
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
                  <Button variant="ghost" size="sm" className="font-geist font-medium tracking-[-0.5px] hover:bg-transparent hover:text-foreground px-[10px] rounded-3xl text-white/80" onClick={() => setShowAuthDialog(true)}>
                    Sign In
                  </Button>
                  <Button size="sm" onClick={() => setShowAuthDialog(true)} className="font-geist font-medium tracking-[-0.5px] px-5 bg-gradient-to-b from-primary via-primary to-primary/70 border-t shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-2xl">
                    Create Account
                  </Button>
                </>}
            </div>
          </div>
        </nav>
      </header>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>;
}