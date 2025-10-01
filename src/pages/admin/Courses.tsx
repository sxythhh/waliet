import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ManageTrainingDialog } from "@/components/ManageTrainingDialog";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";

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
  order_index: number;
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchCourses();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("order_index", { ascending: true });

      if (coursesError) throw coursesError;

      setCourses(coursesData || []);

      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        const { data: modulesData, error: modulesError } = await supabase
          .from("course_modules")
          .select("id, course_id, title, order_index")
          .in("course_id", courseIds)
          .order("order_index", { ascending: true });

        if (modulesError) throw modulesError;

        const modulesByCourse: Record<string, Module[]> = {};
        modulesData?.forEach(module => {
          if (!modulesByCourse[module.course_id]) {
            modulesByCourse[module.course_id] = [];
          }
          modulesByCourse[module.course_id].push(module);
        });

        setModules(modulesByCourse);
      } else {
        setModules({});
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
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Training Courses</h1>
            <p className="text-muted-foreground mt-2">
              Manage global training content for all DWY brands
            </p>
          </div>
          <ManageTrainingDialog onSuccess={fetchCourses} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Global Training Content</CardTitle>
            <CardDescription>
              {courses.length} {courses.length === 1 ? 'course' : 'courses'} with {Object.values(modules).flat().length} total modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No courses yet. Click "Manage Training" to add courses.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course, index) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Course {index + 1}</Badge>
                          <h3 className="font-semibold text-lg">{course.title}</h3>
                        </div>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {modules[course.id] && modules[course.id].length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-muted">
                        <p className="text-sm text-muted-foreground mb-2">
                          {modules[course.id].length} {modules[course.id].length === 1 ? 'module' : 'modules'}:
                        </p>
                        <ul className="space-y-1">
                          {modules[course.id].map((module, moduleIndex) => (
                            <li key={module.id} className="text-sm">
                              {moduleIndex + 1}. {module.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
