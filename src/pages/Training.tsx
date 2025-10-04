import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ChevronRight, BookOpen, ArrowLeft, Menu, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import DOMPurify from "dompurify";

interface Course {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_locked?: boolean;
  banner_url?: string | null;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
}

export default function Training() {
  const { slug } = useParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrainingData();
  }, [slug]);

  const fetchTrainingData = async () => {
    if (!slug) return;

    try {
      // Fetch brand info
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (brandError) throw brandError;
      if (!brandData) {
        toast.error("Brand not found");
        return;
      }

      setBrandId(brandData.id);

      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("order_index", { ascending: true });

      if (coursesError) throw coursesError;

      // Fetch brand access for this brand
      const { data: accessData, error: accessError } = await supabase
        .from("brand_course_access")
        .select("*")
        .eq("brand_id", brandData.id);

      if (accessError) throw accessError;

      // Mark courses as locked/unlocked based on access
      const coursesWithAccess = coursesData?.map(course => {
        const accessRecord = accessData?.find(a => a.course_id === course.id);
        // Default to unlocked (true) if no record exists
        const isLocked = accessRecord ? !accessRecord.has_access : false;
        return { ...course, is_locked: isLocked };
      }) || [];

      setCourses(coursesWithAccess);

      // Fetch modules for each course
      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        const { data: modulesData, error: modulesError } = await supabase
          .from("course_modules")
          .select("*")
          .in("course_id", courseIds)
          .order("order_index", { ascending: true });

        if (modulesError) throw modulesError;

        // Group modules by course
        const modulesByCourse: Record<string, Module[]> = {};
        modulesData?.forEach(module => {
          if (!modulesByCourse[module.course_id]) {
            modulesByCourse[module.course_id] = [];
          }
          modulesByCourse[module.course_id].push(module);
        });

        setModules(modulesByCourse);
      }
    } catch (error) {
      console.error("Error fetching training data:", error);
      toast.error("Failed to load training content");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleSelect = (moduleId: string, courseId: string, isLocked?: boolean) => {
    if (isLocked) {
      toast.error("This course is locked. Contact your administrator for access.");
      return;
    }
    setSelectedModuleId(moduleId);
    setSelectedCourseId(courseId);
    setMobileMenuOpen(false);
  };

  const handleBackToCourses = () => {
    setSelectedModuleId(null);
    setSelectedCourseId(null);
  };

  const selectedModule = selectedModuleId && selectedCourseId
    ? modules[selectedCourseId]?.find(m => m.id === selectedModuleId)
    : null;

  const selectedCourse = selectedCourseId
    ? courses.find(c => c.id === selectedCourseId)
    : null;

  const moduleIndex = selectedModule && selectedCourseId
    ? modules[selectedCourseId]?.findIndex(m => m.id === selectedModuleId) + 1
    : 0;

  // Sanitize module content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    if (!selectedModule?.content) return '';
    return DOMPurify.sanitize(selectedModule.content, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'img', 'br', 'code', 'pre', 'blockquote'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });
  }, [selectedModule?.content]);

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-2">No Training Courses Available</div>
          <div className="text-white/60">
            Training content will appear here once courses are added
          </div>
        </div>
      </div>
    );
  }

  const SidebarNav = () => (
    <div className="space-y-2">
      {courses.map((course) => (
        <div key={course.id} className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/80">
            {course.is_locked ? (
              <Lock className="h-4 w-4 text-red-500" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            <span className="truncate">{course.title}</span>
            {course.is_locked && (
              <span className="text-xs text-red-500 ml-auto">Locked</span>
            )}
          </div>
          {modules[course.id]?.map((module, moduleIndex) => (
            <Button
              key={module.id}
              variant="ghost"
              disabled={course.is_locked}
              className={`w-full justify-start text-left font-normal pl-9 ${
                selectedModuleId === module.id
                  ? 'bg-[#5865F2] text-white hover:bg-[#5865F2] hover:text-white'
                  : course.is_locked
                  ? 'text-white/30 cursor-not-allowed'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => handleModuleSelect(module.id, course.id, course.is_locked)}
            >
              <span className="text-xs mr-2">{moduleIndex + 1}</span>
              <span className="truncate">{module.title}</span>
            </Button>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Training Portal</h1>
          {selectedModule && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToCourses}
                className="text-white/60 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Courses</span>
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden text-white/60">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-[#202020] border-white/10 w-[280px]">
                  <div className="mt-6">
                    <SidebarNav />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>

        {!selectedModule ? (
          /* Course Overview */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className={`bg-[#202020] border-none overflow-hidden group hover:border-white/20 transition-all ${course.is_locked ? 'opacity-60' : ''}`}>
                {/* Banner Image */}
                <div className="relative h-48 bg-gradient-to-br from-[#5865F2]/20 to-[#202020] overflow-hidden">
                  {course.banner_url ? (
                    <img 
                      src={course.banner_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-white/20" />
                    </div>
                  )}
                  {course.is_locked && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Lock className="h-12 w-12 text-red-500" />
                    </div>
                  )}
                </div>

                <CardContent className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-bold text-white">{course.title}</h2>
                      {course.is_locked && (
                        <span className="text-xs text-red-500 font-medium">Locked</span>
                      )}
                    </div>
                    {course.description && (
                      <p className="text-white/60 text-sm line-clamp-2">{course.description}</p>
                    )}
                  </div>

                  {course.is_locked ? (
                    <div className="text-center py-4 text-white/60 text-sm">
                      <p>Contact your administrator for access.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-white/60 text-xs font-medium mb-2">
                        {modules[course.id]?.length || 0} Modules
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1">
                        {modules[course.id]?.slice(0, 5).map((module, moduleIndex) => (
                          <Button
                            key={module.id}
                            variant="ghost"
                            size="sm"
                            className="h-auto p-3 justify-start text-left border border-white/10 bg-[#191919] hover:bg-white/5 hover:border-white/20"
                            onClick={() => handleModuleSelect(module.id, course.id, course.is_locked)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-xs font-medium">
                                {moduleIndex + 1}
                              </div>
                              <span className="text-white/80 text-sm truncate">{module.title}</span>
                            </div>
                          </Button>
                        ))}
                        {modules[course.id]?.length > 5 && (
                          <div className="text-white/40 text-xs text-center py-2">
                            +{modules[course.id].length - 5} more modules
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Module Content */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Desktop Sidebar */}
            <div className="hidden xl:block xl:col-span-3">
              <Card className="bg-[#202020] border-none sticky top-8">
                <CardContent className="p-4">
                  <ScrollArea className="h-[calc(100vh-12rem)]">
                    <SidebarNav />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Module Content */}
            <div className="xl:col-span-9">
              <div className="space-y-4 md:space-y-6">
                {/* Breadcrumb */}
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink 
                        className="text-white/60 hover:text-white cursor-pointer"
                        onClick={handleBackToCourses}
                      >
                        {selectedCourse?.title}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-white/40">
                      <ChevronRight className="h-4 w-4" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-white">
                        Module {moduleIndex}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                {/* Module Content Card */}
                <Card className="bg-[#202020] border-none">
                  <CardContent className="p-4 md:p-8">
                    <header className="mb-6 md:mb-8 pb-4 md:pb-6 border-b border-white/10">
                      <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                        <span className="font-medium">Module {moduleIndex}</span>
                      </div>
                      <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
                        {selectedModule.title}
                      </h1>
                    </header>

                    {selectedModule.video_url && (
                      <div className="mb-6 md:mb-8 rounded-lg overflow-hidden">
                        <div className="aspect-video bg-black">
                          <iframe
                            src={selectedModule.video_url}
                            className="w-full h-full"
                            title={selectedModule.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}

                    {selectedModule.content && (
                      <div 
                        className="prose prose-base md:prose-lg prose-neutral dark:prose-invert max-w-none
                          prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                          prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-8 md:prose-h2:mt-12 prose-h2:mb-3 md:prose-h2:mb-4
                          prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-6 md:prose-h3:mt-8 prose-h3:mb-2 md:prose-h3:mb-3
                          prose-p:text-white/80 prose-p:leading-7 prose-p:mb-4
                          prose-a:text-[#5865F2] prose-a:no-underline hover:prose-a:underline
                          prose-strong:font-semibold prose-strong:text-white
                          prose-ul:my-4 prose-li:my-2 prose-li:text-white/80
                          prose-img:rounded-lg"
                        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
