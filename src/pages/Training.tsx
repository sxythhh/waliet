import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Lock } from "lucide-react";
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
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTrainingData();
  }, [slug]);
  const fetchTrainingData = async () => {
    if (!slug) return;
    try {
      // Fetch brand info
      const {
        data: brandData,
        error: brandError
      } = await supabase.from("brands").select("id").eq("slug", slug).maybeSingle();
      if (brandError) throw brandError;
      if (!brandData) {
        toast.error("Brand not found");
        return;
      }

      // Fetch all courses
      const {
        data: coursesData,
        error: coursesError
      } = await supabase.from("courses").select("*").order("order_index", {
        ascending: true
      });
      if (coursesError) throw coursesError;

      // Fetch brand access for this brand
      const {
        data: accessData,
        error: accessError
      } = await supabase.from("brand_course_access").select("*").eq("brand_id", brandData.id);
      if (accessError) throw accessError;

      // Mark courses as locked/unlocked based on access
      const coursesWithAccess = coursesData?.map(course => {
        const accessRecord = accessData?.find(a => a.course_id === course.id);
        // Default to unlocked (true) if no record exists
        const isLocked = accessRecord ? !accessRecord.has_access : false;
        return {
          ...course,
          is_locked: isLocked
        };
      }) || [];
      setCourses(coursesWithAccess);

      // Fetch modules for each course (just for count)
      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        const {
          data: modulesData,
          error: modulesError
        } = await supabase.from("course_modules").select("*").in("course_id", courseIds).order("order_index", {
          ascending: true
        });
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
    return <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>;
  }
  if (courses.length === 0) {
    return <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-2">No Training Courses Available</div>
          <div className="text-white/60">
            Training content will appear here once courses are added
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen p-4 md:p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map(course => <Card key={course.id} className={`bg-[#202020] border-none overflow-hidden group hover:border-white/20 transition-all cursor-pointer ${course.is_locked ? 'opacity-60 cursor-not-allowed' : ''}`} onClick={() => {
          if (!course.is_locked) {
            navigate(`/brand/${slug}/training/${course.id}`);
          } else {
            toast.error("This course is locked. Contact your administrator for access.");
          }
        }}>
              {/* Banner Image */}
              <div className="relative h-48 bg-gradient-to-br from-[#5865F2]/20 to-[#202020] overflow-hidden">
                {course.banner_url ? <img src={course.banner_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-white/20" />
                  </div>}
                {course.is_locked && <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Lock className="h-12 w-12 text-blue-500" />
                  </div>}
              </div>

              <CardContent className="p-6">
                <h2 className="text-xl font-chakra-petch font-semibold text-white mb-2" style={{
              letterSpacing: '-0.5px'
            }}>{course.title}</h2>
                {course.description && <p className="text-white/60 text-sm line-clamp-3">{course.description}</p>}
                
                {!course.is_locked && <div className="mt-4 text-white/60 text-sm">
                    {modules[course.id]?.length || 0} modules
                  </div>}
              </CardContent>
            </Card>)}
        </div>
      </div>
    </div>;
}