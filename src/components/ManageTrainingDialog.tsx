import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Link as LinkIcon, Image } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ManageBrandAccessDialog } from "@/components/ManageBrandAccessDialog";

interface Course {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
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

interface ManageTrainingDialogProps {
  onSuccess?: () => void;
  initialExpandedCourseId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ManageTrainingDialog({
  onSuccess,
  initialExpandedCourseId,
  open: controlledOpen,
  onOpenChange
}: ManageTrainingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [expandedCourse, setExpandedCourse] = useState<string | null>(initialExpandedCourseId || null);
  const [loading, setLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Record<string, Partial<Course>>>({});
  const [editingModule, setEditingModule] = useState<Record<string, Partial<Module>>>({});
  const [uploadingBanner, setUploadingBanner] = useState<string | null>(null);

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
      
      // Initialize editing state with current values
      const courseEdits: Record<string, Partial<Course>> = {};
      coursesData?.forEach(c => {
        courseEdits[c.id] = { title: c.title, description: c.description };
      });
      setEditingCourse(courseEdits);

      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        const { data: modulesData, error: modulesError } = await supabase
          .from("course_modules")
          .select("*")
          .in("course_id", courseIds)
          .order("order_index", { ascending: true });
        
        if (modulesError) throw modulesError;
        
        const modulesByCourse: Record<string, Module[]> = {};
        const moduleEdits: Record<string, Partial<Module>> = {};
        
        modulesData?.forEach(module => {
          if (!modulesByCourse[module.course_id]) {
            modulesByCourse[module.course_id] = [];
          }
          const typedModule: Module = {
            ...module,
            content: module.content || null,
            video_url: module.video_url || null,
            assets: Array.isArray(module.assets) ? module.assets as Array<{ title: string; url: string }> : []
          };
          modulesByCourse[module.course_id].push(typedModule);
          moduleEdits[module.id] = {
            title: module.title,
            video_url: module.video_url,
            content: module.content,
            assets: typedModule.assets
          };
        });
        
        setModules(modulesByCourse);
        setEditingModule(moduleEdits);
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
        order_index: courses.length
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

  const handleBannerUpload = async (courseId: string, file: File) => {
    setUploadingBanner(courseId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${courseId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('courses')
        .update({ banner_url: publicUrl })
        .eq('id', courseId);

      if (updateError) throw updateError;

      toast.success("Banner uploaded successfully");
      fetchData();
    } catch (error) {
      console.error("Error uploading banner:", error);
      toast.error("Failed to upload banner");
    } finally {
      setUploadingBanner(null);
    }
  };

  const saveCourse = async (courseId: string) => {
    const updates = editingCourse[courseId];
    if (!updates) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({ title: updates.title, description: updates.description })
        .eq("id", courseId);
      if (error) throw error;
      toast.success("Course saved");
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
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
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
        order_index: moduleCount
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

  const saveModule = async (moduleId: string) => {
    const updates = editingModule[moduleId];
    if (!updates) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("course_modules")
        .update({
          title: updates.title,
          video_url: updates.video_url,
          content: updates.content,
          assets: updates.assets || []
        })
        .eq("id", moduleId);
      if (error) throw error;
      toast.success("Module saved");
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
      const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
      if (error) throw error;
      toast.success("Module deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error("Failed to delete module");
    }
  };

  const updateCourseField = (courseId: string, field: keyof Course, value: string) => {
    setEditingCourse(prev => ({
      ...prev,
      [courseId]: { ...prev[courseId], [field]: value }
    }));
  };

  const updateModuleField = (moduleId: string, field: keyof Module, value: any) => {
    setEditingModule(prev => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [field]: value }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          Manage Training
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Manage Training Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={addCourse} disabled={loading} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
            <ManageBrandAccessDialog />
          </div>

          {courses.map(course => {
            const courseData = editingCourse[course.id] || { title: course.title, description: course.description };
            
            return (
              <Card key={course.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-3">
                      {/* Banner Upload */}
                      <div className="space-y-2">
                        <Label className="text-foreground text-sm flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Course Banner
                        </Label>
                        {course.banner_url && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                            <img 
                              src={course.banner_url} 
                              alt="Course banner"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleBannerUpload(course.id, file);
                          }}
                          disabled={uploadingBanner === course.id}
                          className="bg-muted border-border text-foreground file:text-muted-foreground"
                        />
                      </div>
                      
                      <Input 
                        value={courseData.title || ""} 
                        onChange={e => updateCourseField(course.id, 'title', e.target.value)}
                        onBlur={() => saveCourse(course.id)}
                        className="bg-muted border-border text-foreground font-semibold" 
                        placeholder="Course Title" 
                      />
                      <Textarea 
                        value={courseData.description || ""} 
                        onChange={e => updateCourseField(course.id, 'description', e.target.value)}
                        onBlur={() => saveCourse(course.id)}
                        className="bg-muted border-border text-foreground" 
                        placeholder="Course Description" 
                      />
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)} 
                      className="text-muted-foreground"
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

                    <Accordion type="single" collapsible className="space-y-2">
                      {modules[course.id]?.map((module, index) => {
                        const moduleData = editingModule[module.id] || {
                          title: module.title,
                          video_url: module.video_url,
                          content: module.content,
                          assets: module.assets
                        };
                        
                        return (
                          <AccordionItem 
                            key={module.id} 
                            value={module.id} 
                            className="bg-muted border-border rounded-lg px-4"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-sm whitespace-nowrap">Module {index + 1}</span>
                              <AccordionTrigger className="flex-1 hover:no-underline py-3">
                                <span className="text-foreground font-medium truncate text-left">
                                  {moduleData.title || "Untitled Module"}
                                </span>
                              </AccordionTrigger>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => deleteModule(module.id)} 
                                className="text-destructive/60 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <AccordionContent className="space-y-4 pt-2 pb-4">
                              <div className="space-y-2">
                                <Label className="text-foreground text-sm">Module Title</Label>
                                <Input 
                                  value={moduleData.title || ""} 
                                  onChange={e => updateModuleField(module.id, 'title', e.target.value)}
                                  onBlur={() => saveModule(module.id)}
                                  className="bg-card border-border text-foreground" 
                                  placeholder="Enter module title" 
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-foreground text-sm">Video Embed (YouTube, Vimeo, Wistia, etc.)</Label>
                                <Textarea 
                                  value={moduleData.video_url || ""} 
                                  onChange={e => updateModuleField(module.id, 'video_url', e.target.value)}
                                  onBlur={() => saveModule(module.id)}
                                  className="bg-card border-border text-foreground font-mono text-xs" 
                                  placeholder="Paste embed code or URL here..."
                                  rows={4}
                                />
                                <p className="text-xs text-muted-foreground">
                                  You can paste a URL (YouTube, Vimeo) or full embed code (Wistia, etc.)
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-foreground text-sm flex items-center gap-2">
                                  <LinkIcon className="h-4 w-4" />
                                  Assets
                                </Label>
                                {(moduleData.assets || []).map((asset, assetIndex) => (
                                  <div key={assetIndex} className="flex gap-2">
                                    <Input
                                      value={asset.title}
                                      onChange={(e) => {
                                        const newAssets = [...(moduleData.assets || [])];
                                        newAssets[assetIndex] = { ...asset, title: e.target.value };
                                        updateModuleField(module.id, 'assets', newAssets);
                                      }}
                                      onBlur={() => saveModule(module.id)}
                                      className="bg-card border-border text-foreground"
                                      placeholder="Asset title"
                                    />
                                    <Input
                                      value={asset.url}
                                      onChange={(e) => {
                                        const newAssets = [...(moduleData.assets || [])];
                                        newAssets[assetIndex] = { ...asset, url: e.target.value };
                                        updateModuleField(module.id, 'assets', newAssets);
                                      }}
                                      onBlur={() => saveModule(module.id)}
                                      className="bg-card border-border text-foreground"
                                      placeholder="https://..."
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        const newAssets = (moduleData.assets || []).filter((_, i) => i !== assetIndex);
                                        updateModuleField(module.id, 'assets', newAssets);
                                        saveModule(module.id);
                                      }}
                                      className="text-destructive/60 hover:text-destructive flex-shrink-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const newAssets = [...(moduleData.assets || []), { title: "", url: "" }];
                                    updateModuleField(module.id, 'assets', newAssets);
                                  }}
                                  className="w-full border-border text-muted-foreground hover:text-foreground"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Asset Link
                                </Button>
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-foreground text-sm">Content</Label>
                                <RichTextEditor 
                                  content={moduleData.content || ""} 
                                  onChange={content => {
                                    updateModuleField(module.id, 'content', content);
                                  }}
                                  placeholder="Write your course content here..."
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => saveModule(module.id)} 
                                  disabled={loading}
                                  className="mt-2"
                                >
                                  Save Content
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
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
