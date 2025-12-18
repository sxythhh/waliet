import { Link, useParams } from "react-router-dom";
import { LogOut, ChevronRight, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/AuthDialog";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import blueprintsMenuIcon from "@/assets/blueprints-menu-icon.svg";
import campaignsMenuIcon from "@/assets/campaigns-menu-icon.svg";
import boostsMenuIcon from "@/assets/boosts-menu-icon.svg";
import arrowBackIcon from "@/assets/arrow-back-icon.svg";
import checkboxChecked from "@/assets/checkbox-checked.svg";
import checkboxUnchecked from "@/assets/checkbox-unchecked.svg";
import DOMPurify from "dompurify";
import { VideoEmbed } from "@/components/VideoEmbed";
import { Progress } from "@/components/ui/progress";

interface Course {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  assets: Array<{ title: string; url: string }> | null;
}

export default function PublicCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id]);

  useEffect(() => {
    if (userId && modules.length > 0) {
      fetchCompletions();
    }
  }, [userId, modules]);

  const fetchCourse = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', id)
        .order('order_index', { ascending: true });

      if (modulesError) throw modulesError;
      
      const typedModules: Module[] = (modulesData || []).map(m => ({
        ...m,
        assets: Array.isArray(m.assets) ? m.assets as Array<{ title: string; url: string }> : null
      }));
      
      setModules(typedModules);
      if (typedModules.length > 0) {
        setSelectedModule(typedModules[0]);
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletions = async () => {
    if (!userId) return;
    
    const moduleIds = modules.map(m => m.id);
    const { data, error } = await supabase
      .from('module_completions')
      .select('module_id')
      .eq('user_id', userId)
      .in('module_id', moduleIds);

    if (!error && data) {
      setCompletedModules(new Set(data.map(d => d.module_id)));
    }
  };

  const toggleModuleCompletion = async (moduleId: string) => {
    if (!userId) {
      setShowAuthDialog(true);
      return;
    }

    const isCompleted = completedModules.has(moduleId);

    if (isCompleted) {
      await supabase
        .from('module_completions')
        .delete()
        .eq('user_id', userId)
        .eq('module_id', moduleId);
      
      setCompletedModules(prev => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
    } else {
      await supabase
        .from('module_completions')
        .insert({ user_id: userId, module_id: moduleId });
      
      setCompletedModules(prev => new Set([...prev, moduleId]));
    }
  };

  const sanitizedContent = useMemo(() => {
    if (!selectedModule?.content) return '';
    return DOMPurify.sanitize(selectedModule.content, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'img', 'br', 'code', 'pre', 'blockquote'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  }, [selectedModule?.content]);

  const progressPercentage = modules.length > 0 ? (completedModules.size / modules.length) * 100 : 0;

  // Show loading while checking auth
  if (loading || isAuthenticated === null) {
    return (
      <div className="h-screen flex flex-col bg-[#0a0a0a]">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-white/60">Loading course...</div>
        </div>
      </div>
    );
  }

  // Auth gate - show signup prompt when not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col bg-[#0a0a0a]">
        {/* Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link to="/" className="flex items-center gap-2">
                <img alt="Virality" className="h-6 w-6" src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png" />
                <span className="text-lg font-clash font-semibold text-white">VIRALITY</span>
              </Link>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="font-geist font-medium tracking-[-0.5px] hover:bg-transparent hover:text-foreground px-[10px] rounded-3xl text-white/80" onClick={() => setShowAuthDialog(true)}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => setShowAuthDialog(true)} className="font-geist font-medium tracking-[-0.5px] px-5 bg-gradient-to-b from-primary via-primary to-primary/70 border-t shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-2xl">
                  Create Account
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Auth Gate Content */}
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-inter tracking-[-0.5px] font-semibold text-white mb-3">
              Sign up to access this course
            </h1>
            <p className="text-white/60 font-inter tracking-[-0.5px] mb-8">
              Create a free account to unlock all courses, track your progress, and start learning.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => setShowAuthDialog(true)} 
                className="w-full font-inter tracking-[-0.5px] bg-primary hover:bg-primary/90 h-11"
              >
                Create Free Account
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAuthDialog(true)} 
                className="w-full font-inter tracking-[-0.5px] h-11 border-white/10 text-white hover:bg-white/5"
              >
                Sign In
              </Button>
            </div>
            <Link to="/resources" className="inline-flex items-center gap-2 mt-6 text-sm text-white/50 hover:text-white/70 font-inter tracking-[-0.5px]">
              <img src={arrowBackIcon} alt="" className="w-4 h-4" />
              Back to Resources
            </Link>
          </div>
        </main>

        <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen flex flex-col bg-[#0a0a0a]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white/60">Course not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2">
                <img alt="Virality" className="h-6 w-6" src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png" />
                <span className="text-lg font-clash font-semibold text-white">VIRALITY</span>
              </Link>
              
              <div className="hidden md:flex items-center gap-1">
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="bg-transparent text-white/80 hover:text-white hover:bg-[#1a1a1a] font-inter tracking-[-0.5px] text-sm data-[state=open]:bg-[#1a1a1a]">
                        Product
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-64 p-3 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl">
                          <NavigationMenuLink asChild>
                            <Link to="/dashboard?tab=discover" className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors">
                              <img src={blueprintsMenuIcon} alt="" className="w-5 h-5" />
                              <div>
                                <div className="font-medium text-white">Blueprints</div>
                                <div className="text-xs text-white/50">Campaign templates & briefs</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                          <NavigationMenuLink asChild>
                            <Link to="/dashboard?tab=discover" className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors">
                              <img src={campaignsMenuIcon} alt="" className="w-5 h-5" />
                              <div>
                                <div className="font-medium text-white">Campaigns</div>
                                <div className="text-xs text-white/50">RPM-based creator programs</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                          <NavigationMenuLink asChild>
                            <Link to="/dashboard?tab=discover" className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors">
                              <img src={boostsMenuIcon} alt="" className="w-5 h-5" />
                              <div>
                                <div className="font-medium text-white">Boosts</div>
                                <div className="text-xs text-white/50">Fixed-rate video bounties</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                
                <Link to="/resources" className="px-3 py-2 text-sm text-white font-inter tracking-[-0.5px]">
                  Resources
                </Link>
                
                <Link to="/new" className="px-3 py-2 text-sm text-white/80 hover:text-white font-inter tracking-[-0.5px]">
                  Contact
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">
                    <Button size="sm" className="font-inter tracking-[-0.3px] font-medium bg-[#2060df] hover:bg-[#2060df]/90 border-t border-[#4f89ff] text-white">
                      Dashboard
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await supabase.auth.signOut();
                  }} className="font-inter tracking-[-0.3px] font-medium text-muted-foreground hover:text-white hover:bg-destructive/20 gap-1.5 rounded-xl">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="font-geist font-medium tracking-[-0.5px] hover:bg-transparent hover:text-foreground px-[10px] rounded-3xl text-white/80" onClick={() => setShowAuthDialog(true)}>
                    Sign In
                  </Button>
                  <Button size="sm" onClick={() => setShowAuthDialog(true)} className="font-geist font-medium tracking-[-0.5px] px-5 bg-gradient-to-b from-primary via-primary to-primary/70 border-t shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-2xl">
                    Create Account
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link to="/resources" className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-white/5 hover:bg-white/10 border rounded-full text-white/80 hover:text-white font-inter tracking-[-0.5px] text-sm transition-all border-white/0">
            <img src={arrowBackIcon} alt="" className="w-4 h-4" />
            All Resources
          </Link>

          {/* Course Header */}
          <div className="mb-8">
            <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-inter tracking-[-0.5px] mb-4">
              Course
            </span>
            <h1 className="text-3xl md:text-4xl font-inter tracking-[-0.5px] font-semibold text-white mb-2">
              {course.title}
            </h1>
            {course.description && (
              <p className="text-white/60 font-inter tracking-[-0.5px] max-w-2xl">
                {course.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/50">{completedModules.size} / {modules.length} lessons completed</span>
                  <span className="text-white/70">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>
          </div>

          {/* Course Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Module List - Sidebar */}
            <div className="lg:col-span-1 order-1 lg:order-1">
              <div className="bg-[#111] rounded-xl p-4 sticky top-20">
                <h3 className="text-white font-inter tracking-[-0.5px] font-medium mb-4">
                  Course Content
                </h3>
                <div className="space-y-2">
                  {modules.map((module, index) => (
                    <button
                      key={module.id}
                      onClick={() => setSelectedModule(module)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        selectedModule?.id === module.id
                          ? 'bg-white/10 text-white'
                          : 'hover:bg-white/5 text-white/70'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        completedModules.has(module.id)
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/10 text-white/50'
                      }`}>
                        {completedModules.has(module.id) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-medium">{index + 1}</span>
                        )}
                      </div>
                      <span className="font-inter tracking-[-0.5px] text-sm truncate">
                        {module.title}
                      </span>
                      {selectedModule?.id === module.id && (
                        <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Module Content - Main */}
            <div className="lg:col-span-2 order-2 lg:order-2">
              {selectedModule ? (
                <div className="space-y-6">
                  {/* Video Embed */}
                  {selectedModule.video_url && (
                    <div className="mb-6">
                      {selectedModule.video_url.includes('<') ? (
                        <VideoEmbed embedCode={selectedModule.video_url} />
                      ) : (
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                          <iframe
                            src={selectedModule.video_url}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Module Title & Actions */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-inter tracking-[-0.5px] font-semibold text-white mb-2">
                        {selectedModule.title}
                      </h2>
                    </div>
                    <Button
                      variant={completedModules.has(selectedModule.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleModuleCompletion(selectedModule.id)}
                      className={completedModules.has(selectedModule.id) 
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0" 
                        : "text-foreground hover:bg-muted border-0"
                      }
                    >
                      <img 
                        src={completedModules.has(selectedModule.id) ? checkboxChecked : checkboxUnchecked} 
                        alt="" 
                        className="w-5 h-5 mr-2" 
                      />
                      {completedModules.has(selectedModule.id) ? 'Completed' : 'Mark Complete'}
                    </Button>
                  </div>

                  {/* Module Content */}
                  {selectedModule.content && (
                    <div 
                      className="prose prose-invert prose-lg max-w-none [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:text-white/80 [&_li]:text-white/80 [&_a]:text-primary"
                      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                  )}

                  {/* Assets */}
                  {selectedModule.assets && selectedModule.assets.length > 0 && (
                    <div className="pt-6 mt-6">
                      <h4 className="text-white font-inter tracking-[-0.5px] font-medium mb-4">
                        Resources & Assets
                      </h4>
                      <div className="space-y-2">
                        {selectedModule.assets.map((asset, index) => (
                          <a
                            key={index}
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            <span className="font-inter tracking-[-0.5px] text-sm">
                              {asset.title}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-6">
                    {modules.findIndex(m => m.id === selectedModule.id) > 0 && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          const currentIndex = modules.findIndex(m => m.id === selectedModule.id);
                          if (currentIndex > 0) {
                            setSelectedModule(modules[currentIndex - 1]);
                          }
                        }}
                        className="text-white/70 hover:text-white"
                      >
                        ← Previous Lesson
                      </Button>
                    )}
                    <div className="flex-1" />
                    {modules.findIndex(m => m.id === selectedModule.id) < modules.length - 1 && (
                      <Button
                        onClick={() => {
                          const currentIndex = modules.findIndex(m => m.id === selectedModule.id);
                          if (currentIndex < modules.length - 1) {
                            setSelectedModule(modules[currentIndex + 1]);
                          }
                        }}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Next Lesson →
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-white/50">
                  Select a lesson to begin
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
}
