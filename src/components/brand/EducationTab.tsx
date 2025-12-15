import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, PlayCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import lockIcon from "@/assets/lock-icon.png";
import { toast } from "sonner";

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
}

interface EducationTabProps {
  brandId: string;
}

export function EducationTab({ brandId }: EducationTabProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get("workspace") || "";
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, [brandId]);

  const fetchCourses = async () => {
    try {
      // Fetch all courses (global or brand-specific)
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .or(`brand_id.is.null,brand_id.eq.${brandId}`)
        .order("order_index", { ascending: true });

      if (coursesError) throw coursesError;

      // Fetch brand access
      const { data: accessData } = await supabase
        .from("brand_course_access")
        .select("*")
        .eq("brand_id", brandId);

      // Mark courses as locked/unlocked
      const coursesWithAccess = coursesData?.map(course => {
        const accessRecord = accessData?.find(a => a.course_id === course.id);
        const isLocked = accessRecord ? !accessRecord.has_access : false;
        return { ...course, is_locked: isLocked };
      }) || [];

      setCourses(coursesWithAccess);

      // Fetch modules for count
      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        const { data: modulesData } = await supabase
          .from("course_modules")
          .select("id, course_id, title")
          .in("course_id", courseIds);

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
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="h-full p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-inter tracking-[-0.5px] text-foreground">
          Education
        </h1>
        <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mt-1">
          Training courses and resources for your team
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1 font-inter tracking-[-0.5px]">
            No courses available
          </h3>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
            Training courses will appear here once they're added
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card
              key={course.id}
              className={`bg-card border-border overflow-hidden group hover:border-primary/30 transition-all cursor-pointer ${
                course.is_locked ? "opacity-60 cursor-not-allowed" : ""
              }`}
              onClick={() => {
                if (!course.is_locked) {
                  navigate(`/brand/${workspace}/training/${course.id}`);
                } else {
                  toast.error("This course is locked");
                }
              }}
            >
              {/* Banner */}
              <div className="relative h-40 bg-gradient-to-br from-primary/10 to-muted overflow-hidden">
                {course.banner_url ? (
                  <img
                    src={course.banner_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
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
                <h2 className="text-base font-semibold text-foreground mb-1 font-inter tracking-[-0.5px] line-clamp-1">
                  {course.title}
                </h2>
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 font-inter tracking-[-0.5px]">
                    {course.description}
                  </p>
                )}
                {!course.is_locked && (
                  <div className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    {modules[course.id]?.length || 0} modules
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
