import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, PlayCircle, ArrowLeft, CheckCircle2, Circle, Check, PanelLeft, PanelLeftClose, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { VideoEmbed } from "@/components/VideoEmbed";
import lockIcon from "@/assets/lock-icon.png";
import { toast } from "sonner";
import DOMPurify from "dompurify";

interface Course {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_locked?: boolean;
  banner_url?: string | null;
  brand_id?: string | null;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  assets?: Array<{
    title: string;
    url: string;
  }>;
}

interface ModuleCompletion {
  module_id: string;
  completed_at: string;
}

interface EducationTabProps {
  brandId: string;
}

export function EducationTab({ brandId }: EducationTabProps) {
  const isMobile = useIsMobile();
  const [courses, setCourses] = useState<Course[]>([]);
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Course detail state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [completions, setCompletions] = useState<ModuleCompletion[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, [brandId]);

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .or(`brand_id.is.null,brand_id.eq.${brandId}`)
        .order("order_index", { ascending: true });

      if (coursesError) throw coursesError;

      const { data: accessData } = await supabase
        .from("brand_course_access")
        .select("*")
        .eq("brand_id", brandId);

      const coursesWithAccess = coursesData?.map(course => {
        const accessRecord = accessData?.find(a => a.course_id === course.id);
        const isLocked = accessRecord ? !accessRecord.has_access : false;
        return { ...course, is_locked: isLocked };
      }) || [];

      setCourses(coursesWithAccess);

      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        const { data: modulesData } = await supabase
          .from("course_modules")
          .select("id, course_id")
          .in("course_id", courseIds);

        const counts: Record<string, number> = {};
        modulesData?.forEach(module => {
          counts[module.course_id] = (counts[module.course_id] || 0) + 1;
        });
        setModuleCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseData = async (course: Course) => {
    setCourseLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { data: modulesData, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", course.id)
        .order("order_index", { ascending: true });

      if (modulesError) throw modulesError;

      const typedModules = modulesData?.map(module => ({
        ...module,
        content: module.content || null,
        video_url: module.video_url || null,
        assets: Array.isArray(module.assets) ? module.assets as Array<{ title: string; url: string }> : []
      })) || [];

      setModules(typedModules);

      if (typedModules.length > 0) {
        setSelectedModuleId(typedModules[0].id);
      }

      if (user && typedModules.length > 0) {
        const { data: completionsData } = await supabase
          .from("module_completions")
          .select("module_id, completed_at")
          .eq("user_id", user.id)
          .in("module_id", typedModules.map(m => m.id));
        setCompletions(completionsData || []);
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
      toast.error("Failed to load course");
    } finally {
      setCourseLoading(false);
    }
  };

  const handleSelectCourse = (course: Course) => {
    if (course.is_locked) {
      toast.error("This course is locked");
      return;
    }
    setSelectedCourse(course);
    fetchCourseData(course);
  };

  const handleBackToList = () => {
    setSelectedCourse(null);
    setModules([]);
    setCompletions([]);
    setSelectedModuleId(null);
  };

  const toggleCompletion = async (moduleId: string, isCompleted: boolean) => {
    if (!userId) {
      toast.error("Please log in to track your progress");
      return;
    }
    try {
      if (isCompleted) {
        const { error } = await supabase
          .from("module_completions")
          .delete()
          .eq("user_id", userId)
          .eq("module_id", moduleId);
        if (error) throw error;
        setCompletions(prev => prev.filter(c => c.module_id !== moduleId));
        toast.success("Module marked as incomplete");
      } else {
        const { error } = await supabase
          .from("module_completions")
          .insert({ user_id: userId, module_id: moduleId });
        if (error) throw error;
        setCompletions(prev => [...prev, { module_id: moduleId, completed_at: new Date().toISOString() }]);
        toast.success("Module marked as complete");
      }
    } catch (error) {
      console.error("Error toggling completion:", error);
      toast.error("Failed to update progress");
    }
  };

  const selectedModule = modules.find(m => m.id === selectedModuleId);
  const completedCount = completions.length;
  const totalCount = modules.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const sanitizedContent = useMemo(() => {
    if (!selectedModule?.content) return '';
    return DOMPurify.sanitize(selectedModule.content, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'img', 'br', 'code', 'pre', 'blockquote'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  }, [selectedModule?.content]);

  // Loading state for course list
  if (loading) {
    return (
      <div className="h-full p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Course detail view
  if (selectedCourse) {
    if (courseLoading) {
      return (
        <div className="h-full flex">
          <div className="hidden lg:block w-80 bg-muted/30 min-h-full">
            <div className="p-4">
              <Skeleton className="h-8 w-20 mb-4" />
              <div className="space-y-2 mb-6">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              <div className="space-y-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 md:p-8">
            <Card className="bg-card border-border">
              <CardContent className="p-6 md:p-8">
                <Skeleton className="h-8 w-64 mb-6" />
                <Skeleton className="aspect-video w-full mb-6" />
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex">
        {/* Desktop Sidebar */}
        <div className={`${sidebarOpen ? 'hidden lg:block' : 'hidden'} w-80 bg-muted/30 min-h-full transition-all duration-300`}>
          <div className="p-4 sticky top-0 max-h-screen overflow-y-auto">
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={handleBackToList} className="text-muted-foreground hover:text-foreground mb-2 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return
              </Button>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-medium">{completedCount}/{totalCount}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>

            <div className="space-y-1">
              {modules.map((module, index) => {
                const isCompleted = completions.some(c => c.module_id === module.id);
                const isSelected = selectedModuleId === module.id;
                return (
                  <div
                    key={module.id}
                    className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
                    onClick={() => setSelectedModuleId(module.id)}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${isCompleted ? 'bg-primary text-primary-foreground' : isSelected ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                      {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className={`flex-1 text-sm transition-colors font-inter tracking-[-0.5px] ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {module.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Sheet */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-80 bg-background border-border p-0">
              <div className="p-4 h-full overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Course Modules</SheetTitle>
                </SheetHeader>
                <div className="mb-4">
                  <Button variant="ghost" size="sm" onClick={() => { setSidebarOpen(false); handleBackToList(); }} className="text-muted-foreground hover:text-foreground mb-2 -ml-2">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return
                  </Button>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground font-medium">{completedCount}/{totalCount}</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                </div>
                <div className="space-y-1">
                  {modules.map((module, index) => {
                    const isCompleted = completions.some(c => c.module_id === module.id);
                    const isSelected = selectedModuleId === module.id;
                    return (
                      <div
                        key={module.id}
                        className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
                        onClick={() => { setSelectedModuleId(module.id); setSidebarOpen(false); }}
                      >
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${isCompleted ? 'bg-primary text-primary-foreground' : isSelected ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                          {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                        </div>
                        <span className={`flex-1 text-sm transition-colors font-inter tracking-[-0.5px] ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'}`}>
                          {module.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {selectedModule ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-accent">
                      {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
                    </Button>
                    <h2 className="hidden md:block text-2xl md:text-3xl font-bold text-foreground font-inter tracking-[-0.5px]">
                      {selectedModule.title}
                    </h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCompletion(selectedModule.id, completions.some(c => c.module_id === selectedModule.id))}
                    className="border-border bg-muted hover:bg-primary hover:text-primary-foreground"
                  >
                    {completions.some(c => c.module_id === selectedModule.id) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mb-8">
                  {selectedModule.video_url && (
                    <div className="flex-1 md:w-2/3">
                      {selectedModule.video_url.includes('<') ? (
                        <VideoEmbed embedCode={selectedModule.video_url} />
                      ) : (
                        <div className="rounded-lg overflow-hidden">
                          <div className="aspect-video bg-black">
                            <iframe
                              src={selectedModule.video_url}
                              className="w-full h-full border-0"
                              title={selectedModule.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedModule.assets && selectedModule.assets.length > 0 && (
                    <div className={selectedModule.video_url ? "md:w-1/3" : "w-full"}>
                      <h3 className="text-lg font-semibold text-foreground mb-4 font-inter tracking-[-0.5px]">Assets</h3>
                      <div className="flex flex-col gap-3">
                        {selectedModule.assets.map((asset, index) => {
                          const domain = new URL(asset.url).hostname;
                          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                          return (
                            <a
                              key={index}
                              href={asset.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 rounded-lg border border-border transition-all group hover:bg-accent"
                            >
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                <img src={faviconUrl} alt={`${domain} favicon`} className="w-6 h-6" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground font-medium truncate transition-colors font-inter tracking-[-0.5px]">{asset.title}</p>
                                <p className="text-muted-foreground text-sm truncate group-hover:underline">{domain}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 transition-colors" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedModule.content && (
                  <div
                    className="prose prose-base md:prose-lg dark:prose-invert max-w-none
                      prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
                      prose-p:text-muted-foreground prose-p:leading-7 prose-p:mb-4
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-strong:font-semibold prose-strong:text-foreground
                      prose-ul:my-4 prose-li:my-2 prose-li:text-muted-foreground
                      [&_img]:max-w-full [&_img]:md:max-w-[600px] [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-muted-foreground text-center py-12">
              Select a module to begin
            </div>
          )}
        </div>
      </div>
    );
  }

  // Course list view
  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-inter tracking-[-0.5px] text-foreground">Education</h1>
        <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mt-1">Training courses and resources for your team</p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1 font-inter tracking-[-0.5px]">No courses available</h3>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Training courses will appear here once they're added</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card
              key={course.id}
              className={`bg-card border-border overflow-hidden group hover:border-primary/30 transition-all cursor-pointer ${course.is_locked ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={() => handleSelectCourse(course)}
            >
              <div className="relative h-40 bg-gradient-to-br from-primary/10 to-muted overflow-hidden">
                {course.banner_url ? (
                  <img src={course.banner_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PlayCircle className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                {course.is_locked && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                    <img src={lockIcon} alt="Locked" className="h-12 w-12" />
                  </div>
                )}
              </div>
              <CardContent className="p-5">
                <h2 className="text-base font-semibold text-foreground mb-1 font-inter tracking-[-0.5px] line-clamp-1">{course.title}</h2>
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 font-inter tracking-[-0.5px]">{course.description}</p>
                )}
                {!course.is_locked && (
                  <div className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">{moduleCounts[course.id] || 0} modules</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
