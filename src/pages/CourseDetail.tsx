import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import DOMPurify from "dompurify";
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
}
interface ModuleCompletion {
  module_id: string;
  completed_at: string;
}
export default function CourseDetail() {
  const {
    slug,
    courseId
  } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [completions, setCompletions] = useState<ModuleCompletion[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    fetchCourseData();
  }, [courseId]);
  const fetchCourseData = async () => {
    if (!courseId) return;
    try {
      // Get current user
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Fetch course
      const {
        data: courseData,
        error: courseError
      } = await supabase.from("courses").select("*").eq("id", courseId).single();
      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch modules
      const {
        data: modulesData,
        error: modulesError
      } = await supabase.from("course_modules").select("*").eq("course_id", courseId).order("order_index", {
        ascending: true
      });
      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // Set first module as selected
      if (modulesData && modulesData.length > 0) {
        setSelectedModuleId(modulesData[0].id);
      }

      // Fetch completions if user is logged in
      if (user) {
        const {
          data: completionsData,
          error: completionsError
        } = await supabase.from("module_completions").select("module_id, completed_at").eq("user_id", user.id).in("module_id", modulesData?.map(m => m.id) || []);
        if (completionsError) throw completionsError;
        setCompletions(completionsData || []);
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
      toast.error("Failed to load course");
    } finally {
      setLoading(false);
    }
  };
  const toggleCompletion = async (moduleId: string, isCompleted: boolean) => {
    if (!userId) {
      toast.error("Please log in to track your progress");
      return;
    }
    try {
      if (isCompleted) {
        // Remove completion
        const {
          error
        } = await supabase.from("module_completions").delete().eq("user_id", userId).eq("module_id", moduleId);
        if (error) throw error;
        setCompletions(prev => prev.filter(c => c.module_id !== moduleId));
        toast.success("Module marked as incomplete");
      } else {
        // Add completion
        const {
          error
        } = await supabase.from("module_completions").insert({
          user_id: userId,
          module_id: moduleId
        });
        if (error) throw error;
        setCompletions(prev => [...prev, {
          module_id: moduleId,
          completed_at: new Date().toISOString()
        }]);
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
  const progressPercentage = totalCount > 0 ? completedCount / totalCount * 100 : 0;
  const sanitizedContent = useMemo(() => {
    if (!selectedModule?.content) return '';
    return DOMPurify.sanitize(selectedModule.content, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'img', 'br', 'code', 'pre', 'blockquote'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  }, [selectedModule?.content]);
  if (loading) {
    return <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>;
  }
  if (!course) {
    return <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Course not found</div>
      </div>;
  }
  return <div className="min-h-screen bg-[#191919]">
      {/* Content */}
      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <div className="hidden lg:block w-80 border-r border-white/10 bg-[#202020] min-h-screen">
          <div className="p-4 sticky top-0 max-h-screen overflow-y-auto">
            {/* Course Info */}
            <div className="mb-6 pb-6 border-b border-white/10 px-0 py-0">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/brand/${slug}/training`)} className="text-white/60 hover:text-white mb-4 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return
              </Button>
              
              
              {course.description}
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Progress</span>
                  <span className="text-white font-medium">
                    {completedCount}/{totalCount}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>

            
            <div className="space-y-1">
              {modules.map((module, index) => {
              const isCompleted = completions.some(c => c.module_id === module.id);
              const isSelected = selectedModuleId === module.id;
              return <div key={module.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-[#5865F2] text-white' : 'hover:bg-white/5 text-white/80'}`} onClick={() => setSelectedModuleId(module.id)}>
                    <Checkbox checked={isCompleted} onCheckedChange={() => toggleCompletion(module.id, isCompleted)} onClick={e => e.stopPropagation()} className="border-white/20" />
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="flex-1 text-sm truncate">{module.title}</span>
                    {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                  </div>;
            })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8">
          {selectedModule ? <Card className="bg-[#202020] border-none">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-sm text-white/60 mb-2">
                      Module {modules.findIndex(m => m.id === selectedModuleId) + 1}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                      {selectedModule.title}
                    </h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleCompletion(selectedModule.id, completions.some(c => c.module_id === selectedModule.id))} className="border-white/10">
                    {completions.some(c => c.module_id === selectedModule.id) ? <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Completed
                      </> : <>
                        <Circle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </>}
                  </Button>
                </div>

                <Separator className="mb-6 bg-white/10" />

                {selectedModule.video_url && <div className="mb-8 rounded-lg overflow-hidden">
                    <div className="aspect-video bg-black">
                      <iframe src={selectedModule.video_url} className="w-full h-full" title={selectedModule.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  </div>}

                {selectedModule.content && <div className="prose prose-base md:prose-lg prose-neutral dark:prose-invert max-w-none
                      prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                      prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-8 md:prose-h2:mt-12 prose-h2:mb-3 md:prose-h2:mb-4
                      prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-6 md:prose-h3:mt-8 prose-h3:mb-2 md:prose-h3:mb-3
                      prose-p:text-white/80 prose-p:leading-7 prose-p:mb-4
                      prose-a:text-[#5865F2] prose-a:no-underline hover:prose-a:underline
                      prose-strong:font-semibold prose-strong:text-white
                      prose-ul:my-4 prose-li:my-2 prose-li:text-white/80
                      prose-img:rounded-lg" dangerouslySetInnerHTML={{
              __html: sanitizedContent
            }} />}
              </CardContent>
            </Card> : <div className="text-white/60 text-center py-12">
              Select a module to begin
            </div>}
        </div>
      </div>
    </div>;
}