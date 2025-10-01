import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle } from "lucide-react";

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
      }
    } catch (error) {
      console.error("Error fetching training data:", error);
      toast.error("Failed to load training content");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Training Portal</h1>

        <div className="space-y-6">
          {courses.map((course) => (
            <Card key={course.id} className="bg-[#202020] border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-2xl">{course.title}</CardTitle>
                {course.description && (
                  <p className="text-white/60 mt-2">{course.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {modules[course.id] && modules[course.id].length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {modules[course.id].map((module, index) => (
                      <AccordionItem key={module.id} value={module.id} className="border-white/10">
                        <AccordionTrigger className="text-white hover:text-white/80">
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-sm">Module {index + 1}</span>
                            <span>{module.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          {module.video_url && (
                            <div className="bg-black/40 rounded-lg overflow-hidden">
                              <div className="aspect-video">
                                <iframe
                                  src={module.video_url}
                                  className="w-full h-full"
                                  title={module.title}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          )}
                          {module.content && (
                            <div 
                              className="text-white/80 prose prose-invert max-w-none"
                              dangerouslySetInnerHTML={{ __html: module.content }}
                            />
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-white/60 text-center py-4">No modules available for this course</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
