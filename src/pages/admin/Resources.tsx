import { useState, useEffect } from "react";
import { Plus, MoreVertical, Trash2, Edit2, Eye, EyeOff, ExternalLink, GraduationCap, FileText, Newspaper, Pencil, X, Play, Link2, Video, Upload } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ManageTrainingDialog } from "@/components/ManageTrainingDialog";

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

type ResourceType = "templates" | "blog" | "courses" | "scope";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ScopeVideo {
  id: string;
  brand_id: string;
  platform: string;
  username: string | null;
  video_url: string;
  file_url: string | null;
  thumbnail_url: string | null;
  views: number;
  caption: string | null;
  created_at: string;
  brands?: { name: string; logo_url: string | null };
}

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

  // Scope state
  const [scopeVideos, setScopeVideos] = useState<ScopeVideo[]>([]);
  const [scopeLoading, setScopeLoading] = useState(true);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [editingScopeVideo, setEditingScopeVideo] = useState<ScopeVideo | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [scopeFormData, setScopeFormData] = useState({
    brand_id: "",
    platform: "tiktok",
    username: "",
    video_url: "",
    thumbnail_url: "",
    views: 0,
    caption: "",
    is_example: false,
    file: null as File | null
  });
  const [scopeSaving, setScopeSaving] = useState(false);

  const platforms = ["tiktok", "instagram", "youtube", "x"];

  useEffect(() => {
    fetchTemplates();
    fetchPosts();
    fetchCourses();
    fetchBrands();
    fetchScopeVideos();
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

  // ===================== SCOPE VIDEOS =====================
  const fetchBrands = async () => {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, logo_url")
      .order("name");

    if (error) {
      console.error("Error fetching brands:", error);
    } else {
      setBrands(data || []);
    }
  };

  const fetchScopeVideos = async () => {
    setScopeLoading(true);
    const { data, error } = await supabase
      .from("scope_videos")
      .select("*, brands(name, logo_url)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching scope videos:", error);
      toast.error("Failed to load scope videos");
    } else {
      setScopeVideos(data || []);
    }
    setScopeLoading(false);
  };

  const openCreateScopeDialog = () => {
    setEditingScopeVideo(null);
    setScopeFormData({
      brand_id: brands[0]?.id || "",
      platform: "tiktok",
      username: "",
      video_url: "",
      thumbnail_url: "",
      views: 0,
      caption: "",
      is_example: false,
      file: null
    });
    setScopeDialogOpen(true);
  };

  const openEditScopeDialog = (video: ScopeVideo) => {
    setEditingScopeVideo(video);
    setScopeFormData({
      brand_id: video.brand_id,
      platform: video.platform,
      username: video.username || "",
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || "",
      views: video.views || 0,
      caption: video.caption || "",
      is_example: false,
      file: null
    });
    setScopeDialogOpen(true);
  };

  const handleSaveScope = async () => {
    if (!scopeFormData.brand_id) {
      toast.error("Please select a brand");
      return;
    }
    
    if (!scopeFormData.video_url && !scopeFormData.file) {
      toast.error("Please provide a video URL or upload a file");
      return;
    }

    setScopeSaving(true);

    try {
      let fileUrl = null;
      
      // Upload video file if provided
      if (scopeFormData.file) {
        const fileExt = scopeFormData.file.name.split('.').pop();
        const fileName = `${scopeFormData.brand_id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('scope-videos')
          .upload(fileName, scopeFormData.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('scope-videos')
          .getPublicUrl(fileName);
          
        fileUrl = urlData.publicUrl;
      }

      const scopeData = {
        brand_id: scopeFormData.brand_id,
        platform: scopeFormData.platform,
        username: scopeFormData.username || null,
        video_url: scopeFormData.video_url || fileUrl || '',
        file_url: fileUrl,
        thumbnail_url: scopeFormData.thumbnail_url || null,
        views: scopeFormData.views || 0,
        caption: scopeFormData.caption || null,
        is_example: scopeFormData.is_example
      };

      if (editingScopeVideo) {
        const { error } = await supabase
          .from("scope_videos")
          .update(scopeData)
          .eq("id", editingScopeVideo.id);

        if (error) throw error;
        toast.success("Scope video updated");
      } else {
        const { error } = await supabase
          .from("scope_videos")
          .insert(scopeData);

        if (error) throw error;
        toast.success("Scope video added");
      }
      
      fetchScopeVideos();
      setScopeDialogOpen(false);
    } catch (error) {
      console.error('Error saving scope video:', error);
      toast.error("Failed to save scope video");
    } finally {
      setScopeSaving(false);
    }
  };

  const deleteScopeVideo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scope video?")) return;

    const { error } = await supabase
      .from("scope_videos")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete scope video");
    } else {
      toast.success("Scope video deleted");
      fetchScopeVideos();
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
    } else if (activeTab === "scope") {
      openCreateScopeDialog();
    }
  };

  const getCreateButtonLabel = () => {
    switch (activeTab) {
      case "templates": return "New Template";
      case "blog": return "New Post";
      case "courses": return "Manage Courses";
      case "scope": return "Add Video";
      default: return "Create";
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground font-inter tracking-[-0.5px]">Resources</h1>
            <p className="text-sm text-muted-foreground mt-1 font-inter tracking-[-0.5px]">
              Manage templates, blog posts, and training courses
            </p>
          </div>
          <Button 
            onClick={handleCreateResource}
            className="gap-2 text-white border-t border-t-[#4b85f7] font-geist font-medium text-sm tracking-[-0.5px] rounded-[10px] bg-[#2060df]"
          >
            <Plus className="h-4 w-4" />
            {getCreateButtonLabel()}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResourceType)} className="w-full">
          <TabsList className="w-fit bg-card rounded-full p-1">
            <TabsTrigger value="templates" className="rounded-full px-4 gap-2 data-[state=active]:bg-[#1C1C1C]">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="blog" className="rounded-full px-4 gap-2 data-[state=active]:bg-[#1C1C1C]">
              <Newspaper className="h-4 w-4" />
              Blog Posts
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-full px-4 gap-2 data-[state=active]:bg-[#1C1C1C]">
              <GraduationCap className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="scope" className="rounded-full px-4 gap-2 data-[state=active]:bg-[#1C1C1C]">
              <Video className="h-4 w-4" />
              Scope
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            {templatesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <Card className="p-12 text-center border-border/50 bg-card/30">
                <p className="text-muted-foreground font-inter tracking-[-0.5px]">No templates yet. Create your first template.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <Card 
                    key={template.id} 
                    className="group border-border/50 bg-card/30 hover:bg-card/50 transition-colors overflow-hidden"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-[15px] truncate text-foreground font-inter tracking-[-0.5px]">
                            {template.title}
                          </h3>
                          {template.category && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
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
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteTemplate(template.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 font-inter tracking-[-0.5px]">
                          {template.description}
                        </p>
                      )}

                      {template.platforms && template.platforms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {template.platforms.map(platform => (
                            <Badge key={platform} variant="outline" className="text-xs capitalize">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/30">
                        <span>{template.hooks?.length || 0} hooks</span>
                        <span>{template.talking_points?.length || 0} talking points</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Blog Posts Tab */}
          <TabsContent value="blog" className="mt-6">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-inter tracking-[-0.5px]">Title</TableHead>
                    <TableHead className="font-inter tracking-[-0.5px]">Category</TableHead>
                    <TableHead className="font-inter tracking-[-0.5px]">Status</TableHead>
                    <TableHead className="font-inter tracking-[-0.5px]">Date</TableHead>
                    <TableHead className="font-inter tracking-[-0.5px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : posts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No posts yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-inter tracking-[-0.5px] font-medium max-w-[300px] truncate">
                          {post.title}
                        </TableCell>
                        <TableCell className="font-inter tracking-[-0.5px] text-muted-foreground">
                          {post.category || "-"}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => togglePublish(post)}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-inter tracking-[-0.5px] ${
                              post.is_published
                                ? "bg-green-500/20 text-green-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {post.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {post.is_published ? "Published" : "Draft"}
                          </button>
                        </TableCell>
                        <TableCell className="font-inter tracking-[-0.5px] text-muted-foreground text-sm">
                          {new Date(post.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/blog`, '_blank')}
                              className="h-8 w-8"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditBlogDialog(post)}
                              className="h-8 w-8"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePost(post.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="mt-6">
            {coursesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : courses.length === 0 ? (
              <Card className="p-12 text-center border-border/50 bg-card/30">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-inter tracking-[-0.5px]">
                  No courses yet. Click "Manage Courses" to add courses.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {courses.map((course, index) => (
                  <Card key={course.id} className="border-border/50 bg-card/30 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Course {index + 1}</Badge>
                          <h3 className="font-semibold text-lg font-inter tracking-[-0.5px]">{course.title}</h3>
                        </div>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-1 font-inter tracking-[-0.5px]">
                            {course.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCourseId(course.id);
                          setCourseDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    {modules[course.id] && modules[course.id].length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-muted">
                        <p className="text-sm text-muted-foreground mb-2 font-inter tracking-[-0.5px]">
                          {modules[course.id].length} {modules[course.id].length === 1 ? 'module' : 'modules'}:
                        </p>
                        <ul className="space-y-1">
                          {modules[course.id].map((module, moduleIndex) => (
                            <li key={module.id} className="text-sm font-inter tracking-[-0.5px]">
                              {moduleIndex + 1}. {module.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Scope Tab */}
          <TabsContent value="scope" className="mt-6">
            {scopeLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : scopeVideos.length === 0 ? (
              <Card className="p-12 text-center border-border/50 bg-card/30">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-inter tracking-[-0.5px]">
                  No scope videos yet. Add videos to brand scope libraries.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {scopeVideos.map(video => (
                  <Card key={video.id} className="group border-border/50 bg-card/30 hover:bg-card/50 transition-colors overflow-hidden">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted/30">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                      {video.views > 0 && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded text-xs text-white">
                          <Eye className="w-3 h-3" />
                          {video.views.toLocaleString()}
                        </div>
                      )}
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#2060df] flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </a>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {video.brands?.logo_url ? (
                            <img src={video.brands.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                              {video.brands?.name?.[0] || 'B'}
                            </div>
                          )}
                          <span className="text-sm font-medium truncate max-w-[100px]">{video.brands?.name}</span>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">
                          {video.platform}
                        </Badge>
                      </div>
                      
                      {video.username && (
                        <p className="text-sm text-muted-foreground">@{video.username}</p>
                      )}
                      
                      {video.caption && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{video.caption}</p>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">
                          {new Date(video.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigator.clipboard.writeText(video.video_url).then(() => toast.success('Copied!'))}
                            className="h-7 w-7"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditScopeDialog(video)}
                            className="h-7 w-7"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteScopeVideo(video.id)}
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
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
              <Label className="font-inter tracking-[-0.5px]">Image URL</Label>
              <Input
                value={blogFormData.image_url}
                onChange={(e) => setBlogFormData({ ...blogFormData, image_url: e.target.value })}
                placeholder="https://..."
                className="font-inter tracking-[-0.5px]"
              />
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
              <Label className="font-inter tracking-[-0.5px]">Content * (Markdown supported)</Label>
              <Textarea
                value={blogFormData.content}
                onChange={(e) => setBlogFormData({ ...blogFormData, content: e.target.value })}
                placeholder="Write your blog post content here..."
                rows={12}
                className="font-inter tracking-[-0.5px] font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={blogFormData.is_published}
                onCheckedChange={(checked) => setBlogFormData({ ...blogFormData, is_published: checked })}
              />
              <Label className="font-inter tracking-[-0.5px]">Publish immediately</Label>
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

      {/* Scope Video Dialog */}
      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">
              {editingScopeVideo ? "Edit Scope Video" : "Add Scope Video"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Brand *</Label>
              <Select
                value={scopeFormData.brand_id}
                onValueChange={(value) => setScopeFormData({ ...scopeFormData, brand_id: value })}
              >
                <SelectTrigger className="font-inter tracking-[-0.5px]">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id} className="font-inter tracking-[-0.5px]">
                      <div className="flex items-center gap-2">
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
                        ) : (
                          <div className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[8px]">
                            {brand.name[0]}
                          </div>
                        )}
                        {brand.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video File Upload */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Upload Video</Label>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
                {scopeFormData.file ? (
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    <span className="text-sm truncate max-w-[200px]">{scopeFormData.file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setScopeFormData({ ...scopeFormData, file: null });
                      }}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-2 pb-3">
                    <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Click to upload video</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">MP4, MOV, WebM</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setScopeFormData({ ...scopeFormData, file });
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground">or add by URL</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Video URL</Label>
              <Input
                value={scopeFormData.video_url}
                onChange={(e) => setScopeFormData({ ...scopeFormData, video_url: e.target.value })}
                placeholder="https://tiktok.com/@user/video/..."
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Platform</Label>
                <Select
                  value={scopeFormData.platform}
                  onValueChange={(value) => setScopeFormData({ ...scopeFormData, platform: value })}
                >
                  <SelectTrigger className="font-inter tracking-[-0.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(platform => (
                      <SelectItem key={platform} value={platform} className="capitalize font-inter tracking-[-0.5px]">
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Username</Label>
                <Input
                  value={scopeFormData.username}
                  onChange={(e) => setScopeFormData({ ...scopeFormData, username: e.target.value })}
                  placeholder="@username"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Thumbnail URL</Label>
              <Input
                value={scopeFormData.thumbnail_url}
                onChange={(e) => setScopeFormData({ ...scopeFormData, thumbnail_url: e.target.value })}
                placeholder="https://..."
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Views</Label>
              <Input
                type="number"
                value={scopeFormData.views}
                onChange={(e) => setScopeFormData({ ...scopeFormData, views: parseInt(e.target.value) || 0 })}
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Caption</Label>
              <Textarea
                value={scopeFormData.caption}
                onChange={(e) => setScopeFormData({ ...scopeFormData, caption: e.target.value })}
                placeholder="Video caption or description..."
                rows={3}
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={scopeFormData.is_example}
                onCheckedChange={(checked) => setScopeFormData({ ...scopeFormData, is_example: checked })}
              />
              <Label className="font-inter tracking-[-0.5px]">Mark as example</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setScopeDialogOpen(false)} className="font-inter tracking-[-0.5px]">
              Cancel
            </Button>
            <Button onClick={handleSaveScope} disabled={scopeSaving} className="font-inter tracking-[-0.5px]">
              {scopeSaving ? "Saving..." : editingScopeVideo ? "Save Changes" : "Add Video"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
