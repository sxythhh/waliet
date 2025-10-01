import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/RichTextEditor";

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

interface ManageTrainingDialogProps {
  onSuccess?: () => void;
  initialExpandedCourseId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ManageTrainingDialog({ onSuccess, initialExpandedCourseId, open: controlledOpen, onOpenChange }: ManageTrainingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [expandedCourse, setExpandedCourse] = useState<string | null>(initialExpandedCourseId || null);
  const [loading, setLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [editingModule, setEditingModule] = useState<Partial<Module> | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
      if (initialExpandedCourseId) {
        setExpandedCourse(initialExpandedCourseId);
      }
    }
  }, [open, initialExpandedCourseId]);

  const fetchData = async () => {
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
          .select("*")
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
      }
    } catch (error) {
      console.error("Error fetching training data:", error);
      toast.error("Failed to load training data");
    }
  };

  const addCourse = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("courses").insert({
        title: "New Course",
        description: "",
        order_index: courses.length,
      });

      if (error) throw error;
      toast.success("Course added");
      fetchData();
    } catch (error) {
      console.error("Error adding course:", error);
      toast.error("Failed to add course");
    } finally {
      setLoading(false);
    }
  };

  const saveCourse = async (courseId: string, updates: Partial<Course>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", courseId);

      if (error) throw error;
      toast.success("Course saved");
      setEditingCourse(null);
      fetchData();
    } catch (error) {
      console.error("Error updating course:", error);
      toast.error("Failed to save course");
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;
      toast.success("Course deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    }
  };

  const addModule = async (courseId: string) => {
    setLoading(true);
    try {
      const moduleCount = modules[courseId]?.length || 0;
      const { error } = await supabase.from("course_modules").insert({
        course_id: courseId,
        title: "New Module",
        content: "",
        video_url: "",
        order_index: moduleCount,
      });

      if (error) throw error;
      toast.success("Module added");
      fetchData();
    } catch (error) {
      console.error("Error adding module:", error);
      toast.error("Failed to add module");
    } finally {
      setLoading(false);
    }
  };

  const saveModule = async (moduleId: string, updates: Partial<Module>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("course_modules")
        .update(updates)
        .eq("id", moduleId);

      if (error) throw error;
      toast.success("Module saved");
      setEditingModule(null);
      fetchData();
    } catch (error) {
      console.error("Error saving module:", error);
      toast.error("Failed to save module");
    } finally {
      setLoading(false);
    }
  };

  const deleteModule = async (moduleId: string) => {
    try {
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;
      toast.success("Module deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error("Failed to delete module");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          Manage Training
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#202020] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Manage Training Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={addCourse} disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>

          {courses.map((course) => {
            const isEditing = editingCourse?.id === course.id;
            const displayCourse = isEditing ? editingCourse : course;
            
            return (
              <Card key={course.id} className="bg-[#191919] border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="cursor-move text-white/60"
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={displayCourse?.title || ""}
                        onChange={(e) => setEditingCourse({ ...course, title: e.target.value })}
                        className="bg-[#202020] border-white/10 text-white font-semibold"
                        placeholder="Course Title"
                      />
                      <Textarea
                        value={displayCourse?.description || ""}
                        onChange={(e) => setEditingCourse({ ...course, description: e.target.value })}
                        className="bg-[#202020] border-white/10 text-white"
                        placeholder="Course Description"
                      />
                      {isEditing && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveCourse(course.id, { 
                              title: displayCourse?.title, 
                              description: displayCourse?.description 
                            })}
                            disabled={loading}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCourse(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                      className="text-white/60"
                    >
                      {expandedCourse === course.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteCourse(course.id)}
                      className="text-destructive/60 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                {expandedCourse === course.id && (
                  <CardContent className="space-y-4">
                    <Button onClick={() => addModule(course.id)} disabled={loading} className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Module
                    </Button>

                    {modules[course.id]?.map((module, index) => {
                      const isEditingModule = editingModule?.id === module.id;
                      const displayModule = isEditingModule ? editingModule : module;
                      
                      return (
                        <div key={module.id} className="bg-[#202020] p-4 rounded-lg space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm">Module {index + 1}</span>
                            <Input
                              value={displayModule?.title || ""}
                              onChange={(e) => setEditingModule({ ...module, title: e.target.value })}
                              className="flex-1 bg-[#191919] border-white/10 text-white"
                              placeholder="Module Title"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteModule(module.id)}
                              className="text-destructive/60 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Video URL (YouTube, Vimeo, etc.)</Label>
                            <Input
                              value={displayModule?.video_url || ""}
                              onChange={(e) => setEditingModule({ ...module, video_url: e.target.value })}
                              className="bg-[#191919] border-white/10 text-white"
                              placeholder="https://www.youtube.com/embed/..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Content</Label>
                            <RichTextEditor
                              content={displayModule?.content || ""}
                              onChange={(content) => setEditingModule({ ...module, content })}
                              placeholder="Write your course content here..."
                            />
                          </div>
                          {isEditingModule && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveModule(module.id, {
                                  title: displayModule?.title,
                                  video_url: displayModule?.video_url,
                                  content: displayModule?.content
                                })}
                                disabled={loading}
                              >
                                Save Module
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingModule(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
