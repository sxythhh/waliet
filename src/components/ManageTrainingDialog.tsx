import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ManageBrandAccessDialog } from "@/components/ManageBrandAccessDialog";
import { useState as useReactState } from "react";
import { Upload, Image } from "lucide-react";
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
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [editingModule, setEditingModule] = useState<Partial<Module> | null>(null);
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
      const {
        data: coursesData,
        error: coursesError
      } = await supabase.from("courses").select("*").order("order_index", {
        ascending: true
      });
      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        const {
          data: modulesData,
          error: modulesError
        } = await supabase.from("course_modules").select("*").in("course_id", courseIds).order("order_index", {
          ascending: true
        });
        if (modulesError) throw modulesError;
        const modulesByCourse: Record<string, Module[]> = {};
        modulesData?.forEach(module => {
          if (!modulesByCourse[module.course_id]) {
            modulesByCourse[module.course_id] = [];
          }
          // Type cast the assets properly
          const typedModule: Module = {
            ...module,
            content: module.content || null,
            video_url: module.video_url || null,
            assets: Array.isArray(module.assets) ? module.assets as Array<{ title: string; url: string }> : []
          };
          modulesByCourse[module.course_id].push(typedModule);
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
      const {
        error
      } = await supabase.from("courses").insert({
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

  const saveCourse = async (courseId: string, updates: Partial<Course>) => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from("courses").update(updates).eq("id", courseId);
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
      const {
        error
      } = await supabase.from("courses").delete().eq("id", courseId);
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
      const {
        error
      } = await supabase.from("course_modules").insert({
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
  const saveModule = async (moduleId: string, updates: Partial<Module>) => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from("course_modules").update(updates).eq("id", moduleId);
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
      const {
        error
      } = await supabase.from("course_modules").delete().eq("id", moduleId);
      if (error) throw error;
      toast.success("Module deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error("Failed to delete module");
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          Manage Training
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#202020] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Manage Training Content</DialogTitle>
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
          const isEditing = editingCourse?.id === course.id;
          const displayCourse = isEditing ? editingCourse : course;
          return <Card key={course.id} className="bg-[#191919] border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    
                    <div className="flex-1 space-y-2">
                      {/* Banner Upload */}
                      <div className="space-y-2">
                        <Label className="text-white text-sm flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Course Banner
                        </Label>
                        {course.banner_url && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-[#202020]">
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
                          className="bg-[#202020] border-white/10 text-white file:text-white/80"
                        />
                      </div>
                      
                      <Input value={displayCourse?.title || ""} onChange={e => setEditingCourse({
                    ...course,
                    title: e.target.value
                  })} className="bg-[#202020] border-white/10 text-white font-semibold" placeholder="Course Title" />
                      <Textarea value={displayCourse?.description || ""} onChange={e => setEditingCourse({
                    ...course,
                    description: e.target.value
                  })} className="bg-[#202020] border-white/10 text-white" placeholder="Course Description" />
                      {isEditing && <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveCourse(course.id, {
                      title: displayCourse?.title,
                      description: displayCourse?.description
                    })} disabled={loading}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingCourse(null)}>
                            Cancel
                          </Button>
                        </div>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)} className="text-white/60">
                      {expandedCourse === course.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteCourse(course.id)} className="text-destructive/60 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                {expandedCourse === course.id && <CardContent className="space-y-4">
                    <Button onClick={() => addModule(course.id)} disabled={loading} className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Module
                    </Button>

                    <Accordion type="single" collapsible className="space-y-2">
                      {modules[course.id]?.map((module, index) => {
                  const isEditingModule = editingModule?.id === module.id;
                  const displayModule = isEditingModule ? editingModule : module;
                  return <AccordionItem key={module.id} value={module.id} className="bg-[#202020] border-white/10 rounded-lg px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-white/60 text-sm whitespace-nowrap">Module {index + 1}</span>
                              <AccordionTrigger className="flex-1 hover:no-underline py-3">
                                <span className="text-white font-medium truncate text-left">
                                  {displayModule?.title || "Untitled Module"}
                                </span>
                              </AccordionTrigger>
                              <Button size="icon" variant="ghost" onClick={() => deleteModule(module.id)} className="text-destructive/60 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <AccordionContent className="space-y-4 pt-2 pb-4">
                              <div className="space-y-2">
                                <Label className="text-white text-sm">Module Title</Label>
                                <Input value={displayModule?.title || ""} onChange={e => setEditingModule({
                          ...module,
                          title: e.target.value
                        })} className="bg-[#191919] border-white/10 text-white" placeholder="Enter module title" />
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-white text-sm">Video Embed (YouTube, Vimeo, Wistia, etc.)</Label>
                                <Textarea 
                                  value={displayModule?.video_url || ""} 
                                  onChange={e => setEditingModule({
                                    ...module,
                                    video_url: e.target.value
                                  })} 
                                  className="bg-[#191919] border-white/10 text-white font-mono text-xs" 
                                  placeholder="Paste embed code or URL here..."
                                  rows={4}
                                />
                                <p className="text-xs text-white/40">
                                  You can paste a URL (YouTube, Vimeo) or full embed code (Wistia, etc.)
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-white text-sm flex items-center gap-2">
                                  <LinkIcon className="h-4 w-4" />
                                  Assets
                                </Label>
                                {(displayModule?.assets || []).map((asset, assetIndex) => (
                                  <div key={assetIndex} className="flex gap-2">
                                    <Input
                                      value={asset.title}
                                      onChange={(e) => {
                                        const newAssets = [...(displayModule?.assets || [])];
                                        newAssets[assetIndex] = { ...asset, title: e.target.value };
                                        setEditingModule({
                                          ...module,
                                          assets: newAssets
                                        });
                                      }}
                                      className="bg-[#191919] border-white/10 text-white"
                                      placeholder="Asset title"
                                    />
                                    <Input
                                      value={asset.url}
                                      onChange={(e) => {
                                        const newAssets = [...(displayModule?.assets || [])];
                                        newAssets[assetIndex] = { ...asset, url: e.target.value };
                                        setEditingModule({
                                          ...module,
                                          assets: newAssets
                                        });
                                      }}
                                      className="bg-[#191919] border-white/10 text-white"
                                      placeholder="https://..."
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        const newAssets = (displayModule?.assets || []).filter((_, i) => i !== assetIndex);
                                        setEditingModule({
                                          ...module,
                                          assets: newAssets
                                        });
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
                                    const newAssets = [...(displayModule?.assets || []), { title: "", url: "" }];
                                    setEditingModule({
                                      ...module,
                                      assets: newAssets
                                    });
                                  }}
                                  className="w-full border-white/10 text-white/60 hover:text-white"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Asset Link
                                </Button>
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-white text-sm">Content</Label>
                                <RichTextEditor content={displayModule?.content || ""} onChange={content => setEditingModule({
                          ...module,
                          content
                        })} placeholder="Write your course content here..." />
                              </div>
                              
                              {isEditingModule && <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveModule(module.id, {
                          title: displayModule?.title,
                          video_url: displayModule?.video_url,
                          content: displayModule?.content,
                          assets: displayModule?.assets || []
                        })} disabled={loading}>
                                    Save Module
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingModule(null)}>
                                    Cancel
                                  </Button>
                                </div>}
                            </AccordionContent>
                          </AccordionItem>;
                })}
                    </Accordion>
                  </CardContent>}
              </Card>;
        })}
        </div>
      </DialogContent>
    </Dialog>;
}