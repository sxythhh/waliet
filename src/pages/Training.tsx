import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Course {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
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

  useEffect(() => {
    fetchTrainingData();
  }, [slug]);

  const fetchTrainingData = async () => {
    if (!slug) return;

    try {
      // Fetch all courses (they're now global)
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("order_index", { ascending: true });

      if (coursesError) throw coursesError;

      setCourses(coursesData || []);

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
        
        // Auto-select first module
        if (coursesData.length > 0 && modulesData && modulesData.length > 0) {
          const firstModule = modulesData[0];
          setSelectedModuleId(firstModule.id);
          setSelectedCourseId(firstModule.course_id);
        }
      }
    } catch (error) {
      console.error("Error fetching training data:", error);
      toast.error("Failed to load training content");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleSelect = (moduleId: string, courseId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedCourseId(courseId);
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

  return (
    <div className="min-h-screen p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Training Portal</h1>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-3">
            <Card className="bg-[#202020] border-white/10 sticky top-8">
              <CardContent className="p-4">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="space-y-2">
                    {courses.map((course, courseIndex) => (
                      <div key={course.id} className="space-y-1">
                        <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/80">
                          <BookOpen className="h-4 w-4" />
                          <span className="truncate">{course.title}</span>
                        </div>
                        {modules[course.id]?.map((module, moduleIndex) => (
                          <Button
                            key={module.id}
                            variant="ghost"
                            className={`w-full justify-start text-left font-normal pl-9 ${
                              selectedModuleId === module.id
                                ? 'bg-[#5865F2] text-white hover:bg-[#5865F2] hover:text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                            onClick={() => handleModuleSelect(module.id, course.id)}
                          >
                            <span className="text-xs mr-2">{moduleIndex + 1}</span>
                            <span className="truncate">{module.title}</span>
                          </Button>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="col-span-9">
            {selectedModule && selectedCourse ? (
              <div className="space-y-6">
                {/* Breadcrumb */}
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink className="text-white/60 hover:text-white">
                        {selectedCourse.title}
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
                <Card className="bg-[#202020] border-white/10">
                  <CardContent className="p-8">
                    <header className="mb-8 pb-6 border-b border-white/10">
                      <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                        <span className="font-medium">Module {moduleIndex}</span>
                      </div>
                      <h1 className="text-4xl font-bold text-white mb-2">
                        {selectedModule.title}
                      </h1>
                    </header>

                    {selectedModule.video_url && (
                      <div className="mb-8 rounded-lg overflow-hidden border border-white/10">
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
                        className="prose prose-lg prose-neutral dark:prose-invert max-w-none
                          prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                          prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
                          prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
                          prose-p:text-white/80 prose-p:leading-7 prose-p:mb-4
                          prose-a:text-[#5865F2] prose-a:no-underline hover:prose-a:underline
                          prose-strong:font-semibold prose-strong:text-white
                          prose-ul:my-4 prose-li:my-2 prose-li:text-white/80
                          prose-img:rounded-lg prose-img:border prose-img:border-white/10"
                        dangerouslySetInnerHTML={{ __html: selectedModule.content }}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-[#202020] border-white/10">
                <CardContent className="flex items-center justify-center h-[calc(100vh-16rem)] p-8">
                  <div className="text-center text-white/60">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p className="text-lg">Select a module from the sidebar to begin</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
