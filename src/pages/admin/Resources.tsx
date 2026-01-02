import { useState, useEffect, useRef } from "react";
import { Plus, MoreVertical, Trash2, Edit2, Eye, EyeOff, ExternalLink, GraduationCap, FileText, Newspaper, Pencil, ImageIcon, X, Sparkles, MessageSquare, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/loading-bar";
import { ManageTrainingDialog } from "@/components/ManageTrainingDialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";

interface BlueprintTemplate {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  platforms: string[] | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hooks: string[];
  talking_points: string[];
  dos_and_donts: { dos: string[]; donts: string[] };
  call_to_action: string | null;
  hashtags: string[] | null;
  brand_voice: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  author: string;
  category: string | null;
  image_url: string | null;
  read_time: string | null;
  is_published: boolean;
  hidden_from_listing: boolean;
  published_at: string | null;
  created_at: string;
  tags: string[] | null;
  content_type: string | null;
}

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

type ResourceType = "templates" | "blog" | "courses";

export default function Resources() {
  const [activeTab, setActiveTab] = useState<ResourceType>("templates");
  
  // Templates state
  const [templates, setTemplates] = useState<BlueprintTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BlueprintTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: "",
    platforms: [] as string[],
    is_active: true,
    hooks: [] as string[],
    talking_points: [] as string[],
    dos_and_donts: { dos: [] as string[], donts: [] as string[] },
    call_to_action: "",
    hashtags: [] as string[],
    brand_voice: ""
  });
  const [newHook, setNewHook] = useState("");
  const [newTalkingPoint, setNewTalkingPoint] = useState("");
  const [newDo, setNewDo] = useState("");
  const [newDont, setNewDont] = useState("");
  const [newHashtag, setNewHashtag] = useState("");

  // Blog state
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogImageUploading, setBlogImageUploading] = useState(false);
  const blogImageInputRef = useRef<HTMLInputElement>(null);
  const [blogFormData, setBlogFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    author: "Virality Team",
    category: "",
    image_url: "",
    read_time: "",
    is_published: false,
    hidden_from_listing: false,
    tags: [] as string[],
    content_type: "guide",
  });
  const [newTag, setNewTag] = useState("");

  // Courses state
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);


  const platforms = ["tiktok", "instagram", "youtube", "x"];

  useEffect(() => {
    fetchTemplates();
    fetchPosts();
    fetchCourses();
  }, []);

  // ===================== TEMPLATES =====================
  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    const { data, error } = await supabase
      .from("blueprint_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } else {
      setTemplates((data || []).map(t => ({
        ...t,
        hooks: (t.hooks as string[]) || [],
        talking_points: (t.talking_points as string[]) || [],
        dos_and_donts: (t.dos_and_donts as { dos: string[]; donts: string[] }) || { dos: [], donts: [] }
      })));
    }
    setTemplatesLoading(false);
  };

  const openCreateTemplateDialog = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      title: "",
      description: "",
      content: "",
      category: "",
      platforms: [],
      is_active: true,
      hooks: [],
      talking_points: [],
      dos_and_donts: { dos: [], donts: [] },
      call_to_action: "",
      hashtags: [],
      brand_voice: ""
    });
    setTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (template: BlueprintTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      title: template.title,
      description: template.description || "",
      content: template.content || "",
      category: template.category || "",
      platforms: template.platforms || [],
      is_active: template.is_active,
      hooks: template.hooks || [],
      talking_points: template.talking_points || [],
      dos_and_donts: template.dos_and_donts || { dos: [], donts: [] },
      call_to_action: template.call_to_action || "",
      hashtags: template.hashtags || [],
      brand_voice: template.brand_voice || ""
    });
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateFormData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const templateData = {
      title: templateFormData.title,
      description: templateFormData.description || null,
      content: templateFormData.content || null,
      category: templateFormData.category || null,
      platforms: templateFormData.platforms,
      is_active: templateFormData.is_active,
      hooks: templateFormData.hooks,
      talking_points: templateFormData.talking_points,
      dos_and_donts: templateFormData.dos_and_donts,
      call_to_action: templateFormData.call_to_action || null,
      hashtags: templateFormData.hashtags,
      brand_voice: templateFormData.brand_voice || null
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from("blueprint_templates")
        .update(templateData)
        .eq("id", editingTemplate.id);

      if (error) {
        toast.error("Failed to update template");
        return;
      }
      toast.success("Template updated");
    } else {
      const { error } = await supabase
        .from("blueprint_templates")
        .insert(templateData);

      if (error) {
        toast.error("Failed to create template");
        return;
      }
      toast.success("Template created");
    }

    setTemplateDialogOpen(false);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from("blueprint_templates")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete template");
      return;
    }
    toast.success("Template deleted");
    fetchTemplates();
  };

  const toggleTemplateActive = async (template: BlueprintTemplate) => {
    const { error } = await supabase
      .from("blueprint_templates")
      .update({ is_active: !template.is_active })
      .eq("id", template.id);

    if (error) {
      toast.error("Failed to update template");
      return;
    }
    fetchTemplates();
  };

  const togglePlatform = (platform: string) => {
    setTemplateFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const addHook = () => {
    if (!newHook.trim()) return;
    setTemplateFormData(prev => ({ ...prev, hooks: [...prev.hooks, newHook.trim()] }));
    setNewHook("");
  };

  const removeHook = (index: number) => {
    setTemplateFormData(prev => ({ ...prev, hooks: prev.hooks.filter((_, i) => i !== index) }));
  };

  const addTalkingPoint = () => {
    if (!newTalkingPoint.trim()) return;
    setTemplateFormData(prev => ({ ...prev, talking_points: [...prev.talking_points, newTalkingPoint.trim()] }));
    setNewTalkingPoint("");
  };

  const removeTalkingPoint = (index: number) => {
    setTemplateFormData(prev => ({ ...prev, talking_points: prev.talking_points.filter((_, i) => i !== index) }));
  };

  const addDo = () => {
    if (!newDo.trim()) return;
    setTemplateFormData(prev => ({ 
      ...prev, 
      dos_and_donts: { ...prev.dos_and_donts, dos: [...prev.dos_and_donts.dos, newDo.trim()] } 
    }));
    setNewDo("");
  };

  const removeDo = (index: number) => {
    setTemplateFormData(prev => ({ 
      ...prev, 
      dos_and_donts: { ...prev.dos_and_donts, dos: prev.dos_and_donts.dos.filter((_, i) => i !== index) } 
    }));
  };

  const addDont = () => {
    if (!newDont.trim()) return;
    setTemplateFormData(prev => ({ 
      ...prev, 
      dos_and_donts: { ...prev.dos_and_donts, donts: [...prev.dos_and_donts.donts, newDont.trim()] } 
    }));
    setNewDont("");
  };

  const removeDont = (index: number) => {
    setTemplateFormData(prev => ({ 
      ...prev, 
      dos_and_donts: { ...prev.dos_and_donts, donts: prev.dos_and_donts.donts.filter((_, i) => i !== index) } 
    }));
  };

  const addHashtag = () => {
    if (!newHashtag.trim()) return;
    const tag = newHashtag.startsWith("#") ? newHashtag.trim() : `#${newHashtag.trim()}`;
    setTemplateFormData(prev => ({ ...prev, hashtags: [...prev.hashtags, tag] }));
    setNewHashtag("");
  };

  const removeHashtag = (index: number) => {
    setTemplateFormData(prev => ({ ...prev, hashtags: prev.hashtags.filter((_, i) => i !== index) }));
  };

  // ===================== BLOG POSTS =====================
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error("Failed to fetch posts");
    } else {
      setPosts(data || []);
    }
    setPostsLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const openCreateBlogDialog = () => {
    setEditingPost(null);
    setBlogFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      author: "Virality Team",
      category: "",
      image_url: "",
      read_time: "",
      is_published: false,
      hidden_from_listing: false,
      tags: [],
      content_type: "guide",
    });
    setNewTag("");
    setBlogDialogOpen(true);
  };

  const openEditBlogDialog = (post: BlogPost) => {
    setEditingPost(post);
    setBlogFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      author: post.author,
      category: post.category || "",
      image_url: post.image_url || "",
      read_time: post.read_time || "",
      is_published: post.is_published,
      hidden_from_listing: post.hidden_from_listing || false,
      tags: post.tags || [],
      content_type: post.content_type || "guide",
    });
    setNewTag("");
    setBlogDialogOpen(true);
  };

  const handleSaveBlog = async () => {
    if (!blogFormData.title || !blogFormData.content) {
      toast.error("Title and content are required");
      return;
    }

    setBlogSaving(true);
    const slug = blogFormData.slug || generateSlug(blogFormData.title);

    const postData = {
      title: blogFormData.title,
      slug,
      excerpt: blogFormData.excerpt || null,
      content: blogFormData.content,
      author: blogFormData.author,
      category: blogFormData.category || null,
      image_url: blogFormData.image_url || null,
      read_time: blogFormData.read_time || null,
      is_published: blogFormData.is_published,
      hidden_from_listing: blogFormData.hidden_from_listing,
      published_at: blogFormData.is_published ? new Date().toISOString() : null,
      tags: blogFormData.tags.length > 0 ? blogFormData.tags : null,
      content_type: blogFormData.content_type || "guide",
    };

    if (editingPost) {
      const { error } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', editingPost.id);

      if (error) {
        toast.error("Failed to update post");
      } else {
        toast.success("Post updated");
        fetchPosts();
        setBlogDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('blog_posts')
        .insert(postData);

      if (error) {
        toast.error("Failed to create post");
      } else {
        toast.success("Post created");
        fetchPosts();
        setBlogDialogOpen(false);
      }
    }
    setBlogSaving(false);
  };

  const handleBlogImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBlogImageUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `blog-images/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-images')
        .getPublicUrl(fileName);

      setBlogFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setBlogImageUploading(false);
      if (blogImageInputRef.current) {
        blogImageInputRef.current.value = '';
      }
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted");
      fetchPosts();
    }
  };

  const togglePublish = async (post: BlogPost) => {
    const { error } = await supabase
      .from('blog_posts')
      .update({
        is_published: !post.is_published,
        published_at: !post.is_published ? new Date().toISOString() : null,
      })
      .eq('id', post.id);

    if (error) {
      toast.error("Failed to update post");
    } else {
      fetchPosts();
    }
  };

  // ===================== COURSES =====================
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
      setCoursesLoading(false);
    }
  };

  const handleCreateResource = () => {
    if (activeTab === "templates") {
      openCreateTemplateDialog();
    } else if (activeTab === "blog") {
      openCreateBlogDialog();
    } else if (activeTab === "courses") {
      setEditingCourseId(null);
      setCourseDialogOpen(true);
    }
  };

  const getCreateButtonLabel = () => {
    switch (activeTab) {
      case "templates": return "New Template";
      case "blog": return "New Post";
      case "courses": return "Manage Courses";
      default: return "Create";
    }
  };

  // Stats for header
  const activeTemplates = templates.filter(t => t.is_active).length;
  const publishedPosts = posts.filter(p => p.is_published).length;
  const totalModules = Object.values(modules).flat().length;

  return (
    <AdminPermissionGuard resource="resources">
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResourceType)} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList className="w-fit bg-muted/50 rounded-lg p-1">
            <TabsTrigger value="templates" className="rounded-md px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm font-inter tracking-[-0.3px]">
              <FileText className="h-4 w-4" />
              Templates
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-muted">{templates.length}</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="rounded-md px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm font-inter tracking-[-0.3px]">
              <Newspaper className="h-4 w-4" />
              Blog Posts
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-muted">{posts.length}</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-md px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm font-inter tracking-[-0.3px]">
              <GraduationCap className="h-4 w-4" />
              Courses
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-muted">{courses.length}</span>
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={handleCreateResource}
            className="gap-2 font-inter font-medium text-sm tracking-[-0.3px]"
          >
            <Plus className="h-4 w-4" />
            {getCreateButtonLabel()}
          </Button>
          </div>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            {templatesLoading ? (
              <PageLoading text="Loading templates..." />
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-violet-500/60" />
                </div>
                <h3 className="font-semibold text-base mb-1 font-inter tracking-[-0.5px]">No templates yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm tracking-[-0.3px]">
                  Create your first blueprint template to help brands get started quickly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="group relative rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-card hover:border-border hover:shadow-md transition-all duration-200"
                  >
                    {/* Status indicator bar */}
                    <div className={`absolute top-0 left-4 right-4 h-0.5 rounded-full ${template.is_active ? 'bg-emerald-500' : 'bg-muted'}`} />

                    <div className="p-5 pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${template.is_active ? 'bg-gradient-to-br from-violet-500/20 to-violet-500/5' : 'bg-muted/50'}`}>
                            <FileText className={`w-5 h-5 ${template.is_active ? 'text-violet-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm truncate font-inter tracking-[-0.3px]">
                              {template.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {template.category && (
                                <span className="text-[10px] text-muted-foreground">{template.category}</span>
                              )}
                              <Badge variant={template.is_active ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                                {template.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditTemplateDialog(template)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleTemplateActive(template)}>
                              {template.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                              {template.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteTemplate(template.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 tracking-[-0.2px]">
                          {template.description}
                        </p>
                      )}

                      {template.platforms && template.platforms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {template.platforms.map(platform => (
                            <Badge key={platform} variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Stats chips */}
                      <div className="flex flex-wrap items-center gap-2">
                        {(template.hooks?.length || 0) > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <Sparkles className="h-3 w-3" />
                            <span className="text-[10px] font-medium">{template.hooks.length} hooks</span>
                          </div>
                        )}
                        {(template.talking_points?.length || 0) > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <MessageSquare className="h-3 w-3" />
                            <span className="text-[10px] font-medium">{template.talking_points.length} points</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground/70">
                        <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                        <span>{(template.dos_and_donts?.dos?.length || 0) + (template.dos_and_donts?.donts?.length || 0)} do's & don'ts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Blog Posts Tab */}
          <TabsContent value="blog" className="mt-6">
            {postsLoading ? (
              <PageLoading text="Loading posts..." />
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center mb-4">
                  <Newspaper className="h-8 w-8 text-blue-500/60" />
                </div>
                <h3 className="font-semibold text-base mb-1 font-inter tracking-[-0.5px]">No blog posts yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm tracking-[-0.3px]">
                  Create your first blog post to share guides and updates with creators.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-border transition-all duration-200"
                  >
                    {/* Image thumbnail */}
                    {post.image_url ? (
                      <img src={post.image_url} alt="" className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center flex-shrink-0">
                        <Newspaper className="h-6 w-6 text-blue-500/40" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate font-inter tracking-[-0.3px]">{post.title}</h3>
                        <button
                          onClick={() => togglePublish(post)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                            post.is_published
                              ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                              : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                          }`}
                        >
                          {post.is_published ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                          {post.is_published ? "Published" : "Draft"}
                        </button>
                        {post.hidden_from_listing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                            <EyeOff className="w-2.5 h-2.5" />
                            SEO Only
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {post.category && <span className="px-1.5 py-0.5 rounded bg-muted/50">{post.category}</span>}
                        {post.content_type && <span className="capitalize">{post.content_type.replace('_', ' ')}</span>}
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        {post.read_time && <span>{post.read_time}</span>}
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          {post.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                          ))}
                          {post.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{post.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => window.open(`/blog/${post.slug}`, '_blank')} className="h-8 w-8">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditBlogDialog(post)} className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="mt-6">
            {coursesLoading ? (
              <PageLoading text="Loading courses..." />
            ) : courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-4">
                  <GraduationCap className="h-8 w-8 text-emerald-500/60" />
                </div>
                <h3 className="font-semibold text-base mb-1 font-inter tracking-[-0.5px]">No courses yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm tracking-[-0.3px]">
                  Click "Manage Courses" to create training courses for creators.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course, index) => (
                  <div
                    key={course.id}
                    className="group relative rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-card hover:border-border hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    {/* Course number badge */}
                    <div className="absolute top-3 left-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{index + 1}</span>
                      </div>
                    </div>

                    <div className="p-5 pl-14">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-base font-inter tracking-[-0.3px]">{course.title}</h3>
                          {course.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 tracking-[-0.2px]">
                              {course.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8"
                          onClick={() => {
                            setEditingCourseId(course.id);
                            setCourseDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                      </div>

                      {modules[course.id] && modules[course.id].length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {modules[course.id].length} {modules[course.id].length === 1 ? 'module' : 'modules'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-border/40">
                            {modules[course.id].slice(0, 4).map((module, moduleIndex) => (
                              <div key={module.id} className="flex items-center gap-2 text-xs">
                                <span className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                                  {moduleIndex + 1}
                                </span>
                                <span className="truncate text-muted-foreground tracking-[-0.2px]">{module.title}</span>
                              </div>
                            ))}
                            {modules[course.id].length > 4 && (
                              <span className="text-[10px] text-muted-foreground/60 pl-7">
                                +{modules[course.id].length - 4} more modules
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>No modules added yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Title *</Label>
                <Input
                  value={templateFormData.title}
                  onChange={e => setTemplateFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Product Review Template"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Description</Label>
                <Textarea
                  value={templateFormData.description}
                  onChange={e => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this template..."
                  rows={2}
                  className="font-inter tracking-[-0.5px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-inter tracking-[-0.5px]">Category</Label>
                  <Input
                    value={templateFormData.category}
                    onChange={e => setTemplateFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., E-commerce, SaaS"
                    className="font-inter tracking-[-0.5px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter tracking-[-0.5px]">Active</Label>
                  <div className="pt-2">
                    <Switch
                      checked={templateFormData.is_active}
                      onCheckedChange={checked => setTemplateFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Platforms</Label>
              <div className="flex gap-2 flex-wrap">
                {platforms.map(platform => (
                  <Button
                    key={platform}
                    type="button"
                    variant={templateFormData.platforms.includes(platform) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePlatform(platform)}
                    className="capitalize font-inter tracking-[-0.5px]"
                  >
                    {platform}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Brief Content</Label>
              <Textarea
                value={templateFormData.content}
                onChange={e => setTemplateFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Main content/instructions for the brief..."
                rows={4}
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Brand Voice</Label>
              <Textarea
                value={templateFormData.brand_voice}
                onChange={e => setTemplateFormData(prev => ({ ...prev, brand_voice: e.target.value }))}
                placeholder="Describe the brand voice/tone..."
                rows={2}
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Call to Action</Label>
              <Input
                value={templateFormData.call_to_action}
                onChange={e => setTemplateFormData(prev => ({ ...prev, call_to_action: e.target.value }))}
                placeholder="e.g., Visit our website, Use code X..."
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            {/* Hooks */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Hooks</Label>
              <div className="flex gap-2">
                <Input
                  value={newHook}
                  onChange={e => setNewHook(e.target.value)}
                  placeholder="Add a hook..."
                  className="font-inter tracking-[-0.5px]"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHook())}
                />
                <Button type="button" variant="outline" onClick={addHook}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {templateFormData.hooks.map((hook, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeHook(i)}>
                    {hook} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Talking Points */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Talking Points</Label>
              <div className="flex gap-2">
                <Input
                  value={newTalkingPoint}
                  onChange={e => setNewTalkingPoint(e.target.value)}
                  placeholder="Add a talking point..."
                  className="font-inter tracking-[-0.5px]"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTalkingPoint())}
                />
                <Button type="button" variant="outline" onClick={addTalkingPoint}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {templateFormData.talking_points.map((point, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTalkingPoint(i)}>
                    {point} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Do's */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Do's</Label>
              <div className="flex gap-2">
                <Input
                  value={newDo}
                  onChange={e => setNewDo(e.target.value)}
                  placeholder="Add a do..."
                  className="font-inter tracking-[-0.5px]"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDo())}
                />
                <Button type="button" variant="outline" onClick={addDo}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {templateFormData.dos_and_donts.dos.map((item, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer bg-green-500/20 text-green-400" onClick={() => removeDo(i)}>
                    ✓ {item} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Don'ts */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Don'ts</Label>
              <div className="flex gap-2">
                <Input
                  value={newDont}
                  onChange={e => setNewDont(e.target.value)}
                  placeholder="Add a don't..."
                  className="font-inter tracking-[-0.5px]"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDont())}
                />
                <Button type="button" variant="outline" onClick={addDont}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {templateFormData.dos_and_donts.donts.map((item, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer bg-red-500/20 text-red-400" onClick={() => removeDont(i)}>
                    ✗ {item} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Hashtags</Label>
              <div className="flex gap-2">
                <Input
                  value={newHashtag}
                  onChange={e => setNewHashtag(e.target.value)}
                  placeholder="Add a hashtag..."
                  className="font-inter tracking-[-0.5px]"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                />
                <Button type="button" variant="outline" onClick={addHashtag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {templateFormData.hashtags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="gap-1 cursor-pointer" onClick={() => removeHashtag(i)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blog Dialog */}
      <Dialog open={blogDialogOpen} onOpenChange={setBlogDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">
              {editingPost ? "Edit Post" : "Create Post"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Title *</Label>
                <Input
                  value={blogFormData.title}
                  onChange={(e) => {
                    setBlogFormData({ 
                      ...blogFormData, 
                      title: e.target.value,
                      slug: blogFormData.slug || generateSlug(e.target.value)
                    });
                  }}
                  placeholder="Post title"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Slug</Label>
                <Input
                  value={blogFormData.slug}
                  onChange={(e) => setBlogFormData({ ...blogFormData, slug: e.target.value })}
                  placeholder="post-slug"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Content Type *</Label>
                <div className="flex gap-2">
                  {[
                    { value: "guide", label: "Guide" },
                    { value: "case_study", label: "Case Study" },
                    { value: "news", label: "News" },
                  ].map((type) => (
                    <Button
                      key={type.value}
                      type="button"
                      variant={blogFormData.content_type === type.value ? "default" : "outline"}
                      size="sm"
                      className="font-inter tracking-[-0.5px] flex-1"
                      onClick={() => setBlogFormData({ ...blogFormData, content_type: type.value })}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Category</Label>
                <Input
                  value={blogFormData.category}
                  onChange={(e) => setBlogFormData({ ...blogFormData, category: e.target.value })}
                  placeholder="e.g., Creator Tips"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  className="font-inter tracking-[-0.5px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTag.trim()) {
                      e.preventDefault();
                      if (!blogFormData.tags.includes(newTag.trim())) {
                        setBlogFormData({ ...blogFormData, tags: [...blogFormData.tags, newTag.trim()] });
                      }
                      setNewTag("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-inter tracking-[-0.5px]"
                  onClick={() => {
                    if (newTag.trim() && !blogFormData.tags.includes(newTag.trim())) {
                      setBlogFormData({ ...blogFormData, tags: [...blogFormData.tags, newTag.trim()] });
                      setNewTag("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {blogFormData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {blogFormData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="font-inter tracking-[-0.5px] gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => setBlogFormData({ 
                          ...blogFormData, 
                          tags: blogFormData.tags.filter((_, i) => i !== index) 
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Read Time</Label>
                <Input
                  value={blogFormData.read_time}
                  onChange={(e) => setBlogFormData({ ...blogFormData, read_time: e.target.value })}
                  placeholder="e.g., 5 min read"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Author</Label>
                <Input
                  value={blogFormData.author}
                  onChange={(e) => setBlogFormData({ ...blogFormData, author: e.target.value })}
                  placeholder="Author name"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Cover Image</Label>
              {blogFormData.image_url ? (
                <div className="relative">
                  <img 
                    src={blogFormData.image_url} 
                    alt="Cover" 
                    className="w-full h-40 object-cover rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => setBlogFormData({ ...blogFormData, image_url: "" })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
                  {blogImageUploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-2 pb-3">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload cover image</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG, WebP</p>
                    </div>
                  )}
                  <input
                    ref={blogImageInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleBlogImageUpload}
                    disabled={blogImageUploading}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Excerpt</Label>
              <Textarea
                value={blogFormData.excerpt}
                onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })}
                placeholder="Brief description for previews..."
                rows={2}
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Content *</Label>
              <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                <RichTextEditor
                  content={blogFormData.content}
                  onChange={(content) => setBlogFormData({ ...blogFormData, content })}
                  placeholder="Write your blog post content here..."
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  checked={blogFormData.is_published}
                  onCheckedChange={(checked) => setBlogFormData({ ...blogFormData, is_published: checked })}
                />
                <Label className="font-inter tracking-[-0.5px]">Publish immediately</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={blogFormData.hidden_from_listing}
                  onCheckedChange={(checked) => setBlogFormData({ ...blogFormData, hidden_from_listing: checked })}
                />
                <Label className="font-inter tracking-[-0.5px] text-muted-foreground">
                  Hide from resources page (SEO only)
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setBlogDialogOpen(false)} className="font-inter tracking-[-0.5px]">
              Cancel
            </Button>
            <Button onClick={handleSaveBlog} disabled={blogSaving} className="font-inter tracking-[-0.5px]">
              {blogSaving ? "Saving..." : editingPost ? "Save Changes" : "Create Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Dialog */}
      <ManageTrainingDialog 
        open={courseDialogOpen}
        onOpenChange={(open) => {
          setCourseDialogOpen(open);
          if (!open) {
            setEditingCourseId(null);
          }
        }}
        onSuccess={() => {
          fetchCourses();
        }}
        initialExpandedCourseId={editingCourseId}
      />

    </div>
    </AdminPermissionGuard>
  );
}
