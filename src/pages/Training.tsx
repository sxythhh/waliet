import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TrainingSidebar } from "@/components/TrainingSidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ChevronRight } from "lucide-react";

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
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <TrainingSidebar
          courses={courses}
          modules={modules}
          selectedModuleId={selectedModuleId}
          onModuleSelect={handleModuleSelect}
        />
        
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            {selectedCourse && selectedModule && (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="text-muted-foreground">Training</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="text-muted-foreground">
                      {selectedCourse.title}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Module {moduleIndex}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </header>

          <div className="flex-1 p-8">
            {selectedModule ? (
              <article className="max-w-4xl mx-auto">
                <header className="mb-8 pb-6 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <span className="font-medium">Module {moduleIndex}</span>
                    <span>•</span>
                    <span>{selectedCourse?.title}</span>
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight mb-2">
                    {selectedModule.title}
                  </h1>
                </header>

                {selectedModule.video_url && (
                  <div className="mb-8 rounded-lg overflow-hidden border">
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
                      prose-headings:font-bold prose-headings:tracking-tight
                      prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
                      prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
                      prose-p:leading-7 prose-p:mb-4
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-strong:font-semibold prose-strong:text-foreground
                      prose-ul:my-4 prose-li:my-2
                      prose-img:rounded-lg prose-img:border"
                    dangerouslySetInnerHTML={{ __html: selectedModule.content }}
                  />
                )}
              </article>
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg">Select a module from the sidebar to begin</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
