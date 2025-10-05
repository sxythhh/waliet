import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle2, Circle, Check, PanelLeft, PanelLeftClose, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import DOMPurify from "dompurify";
import { VideoEmbed } from "@/components/VideoEmbed";
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
  assets?: Array<{
    title: string;
    url: string;
  }>;
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
      
      // Type cast the data to ensure assets is properly typed
      const typedModules = modulesData?.map(module => ({
        ...module,
        content: module.content || null,
        video_url: module.video_url || null,
        assets: Array.isArray(module.assets) ? module.assets as Array<{ title: string; url: string }> : []
      })) || [];
      
      setModules(typedModules);

      // Set first module as selected
      if (typedModules && typedModules.length > 0) {
        setSelectedModuleId(typedModules[0].id);
      }

      // Fetch completions if user is logged in
      if (user) {
        const {
          data: completionsData,
          error: completionsError
        } = await supabase.from("module_completions").select("module_id, completed_at").eq("user_id", user.id).in("module_id", typedModules?.map(m => m.id) || []);
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
      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} w-80 bg-[#202020] min-h-screen transition-all duration-300`}>
          <div className="p-4 sticky top-0 max-h-screen overflow-y-auto">
            {/* Course Info */}
            <div className="mb-4 px-0 py-0">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/brand/${slug}/training`)} className="text-white/60 hover:text-white mb-2 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return
              </Button>
              
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
              return <div key={module.id} className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`} onClick={() => setSelectedModuleId(module.id)}>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${isCompleted ? 'bg-[#5865F2] text-white' : isSelected ? 'bg-white/10 text-white/80' : 'bg-white/5 text-white/40'}`}>
                      {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className={`flex-1 text-sm transition-colors font-chakra-petch font-semibold ${isSelected ? 'text-white font-medium' : 'text-white/60 group-hover:text-white/80'}`} style={{ letterSpacing: '-0.5px' }}>{module.title}</span>
                    {isSelected}
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
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="text-white hover:bg-white/10"
                    >
                      {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
                    </Button>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                      {selectedModule.title}
                    </h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleCompletion(selectedModule.id, completions.some(c => c.module_id === selectedModule.id))} className="border-transparent bg-white/10 hover:bg-[#5865F2]">
                    {completions.some(c => c.module_id === selectedModule.id) ? <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-white" />
                        Completed
                      </> : <>
                        <Circle className="h-4 w-4 mr-2 text-white" />
                        Mark Complete
                      </>}
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mb-8">
                  {/* Video Section */}
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

                  {/* Assets Section */}
                  {selectedModule.assets && selectedModule.assets.length > 0 && (
                    <div className={selectedModule.video_url ? "md:w-1/3" : "w-full"}>
                      <h3 className="text-lg font-semibold text-white mb-4">Assets</h3>
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
                              className="flex items-center gap-3 p-4 rounded-lg border border-white/10 transition-all group"
                            >
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                                <img 
                                  src={faviconUrl} 
                                  alt={`${domain} favicon`}
                                  className="w-6 h-6"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate transition-colors">
                                  {asset.title}
                                </p>
                                <p className="text-white/40 text-sm truncate group-hover:underline">{domain}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white/60 flex-shrink-0 transition-colors" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedModule.content && <div className="prose prose-base md:prose-lg prose-neutral dark:prose-invert max-w-none
                      prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                      prose-h1:text-3xl md:prose-h1:text-4xl prose-h1:mt-10 md:prose-h1:mt-14 prose-h1:mb-4 md:prose-h1:mb-5
                      prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-8 md:prose-h2:mt-12 prose-h2:mb-3 md:prose-h2:mb-4
                      prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-6 md:prose-h3:mt-8 prose-h3:mb-2 md:prose-h3:mb-3
                      prose-p:text-white/80 prose-p:leading-7 prose-p:mb-4
                      prose-a:text-[#5865F2] prose-a:no-underline hover:prose-a:underline
                      prose-strong:font-semibold prose-strong:text-white
                      prose-ul:my-4 prose-li:my-2 prose-li:text-white/80
                      [&_img]:max-w-full [&_img]:md:max-w-[600px] [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4
                      [&_h1]:text-white [&_h1]:text-3xl [&_h1]:md:text-4xl [&_h1]:font-bold [&_h1]:my-6
                      [&_h2]:text-white [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-bold [&_h2]:my-5
                      [&_h3]:text-white [&_h3]:text-xl [&_h3]:md:text-2xl [&_h3]:font-bold [&_h3]:my-4" dangerouslySetInnerHTML={{
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