import { Link, useParams } from "react-router-dom";
import { ChevronRight, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/AuthDialog";
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading course...</div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Course not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link to="/resources" className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-muted hover:bg-muted/80 border border-border rounded-full text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px] text-sm transition-all">
            <img src={arrowBackIcon} alt="" className="w-4 h-4 dark:invert" />
            All Resources
          </Link>

          {/* Course Header */}
          <div className="mb-8">
            <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-inter tracking-[-0.5px] mb-4">
              Course
            </span>
            <h1 className="text-3xl md:text-4xl font-inter tracking-[-0.5px] font-semibold text-foreground mb-2">
              {course.title}
            </h1>
            {course.description && (
              <p className="text-muted-foreground font-inter tracking-[-0.5px] max-w-2xl">
                {course.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{completedModules.size} / {modules.length} lessons completed</span>
                  <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>
          </div>

          {/* Course Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Module List - Sidebar */}
            <div className="lg:col-span-1 order-1 lg:order-1">
              <div className="bg-card border border-border rounded-xl p-4 sticky top-20">
                <h3 className="text-foreground font-inter tracking-[-0.5px] font-medium mb-4">
                  Course Content
                </h3>
                <div className="space-y-2">
                  {modules.map((module, index) => (
                    <button
                      key={module.id}
                      onClick={() => setSelectedModule(module)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        selectedModule?.id === module.id
                          ? 'bg-muted text-foreground'
                          : 'hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        completedModules.has(module.id)
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
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
                      <h2 className="text-2xl font-inter tracking-[-0.5px] font-semibold text-foreground mb-2">
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
                      className="prose prose-neutral dark:prose-invert prose-lg max-w-none [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_a]:text-primary"
                      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                  )}

                  {/* Assets */}
                  {selectedModule.assets && selectedModule.assets.length > 0 && (
                    <div className="pt-6 mt-6">
                      <h4 className="text-foreground font-inter tracking-[-0.5px] font-medium mb-4">
                        Resources & Assets
                      </h4>
                      <div className="space-y-2">
                        {selectedModule.assets.map((asset, index) => (
                          <a
                            key={index}
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-muted hover:bg-muted/80 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
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
                        className="text-muted-foreground hover:text-foreground"
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
                <div className="flex items-center justify-center h-64 text-muted-foreground">
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
