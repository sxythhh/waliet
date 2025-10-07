import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, Plus, GripVertical, Trash2, Pencil, Upload, Link as LinkIcon, X } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContentVideoPlayer } from "@/components/ContentVideoPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
interface ContentStyle {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  phase: string;
  order_index: number;
  color: string;
  video_url: string | null;
}
const PHASES = [{
  id: "testing",
  title: "Testing",
  color: "#F59E0B"
}, {
  id: "active",
  title: "Active",
  color: "#10B981"
}, {
  id: "archive",
  title: "Archive",
  color: "#6B7280"
}];
const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444"];
export default function BrandLibrary() {
  const {
    slug
  } = useParams();
  const sidebar = useSidebar();
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [contentStyles, setContentStyles] = useState<ContentStyle[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentStyle | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    color: COLORS[0],
    phase: "testing",
    video_url: ""
  });
  const [draggedItem, setDraggedItem] = useState<ContentStyle | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (slug) fetchBrandData();
  }, [slug]);
  const fetchBrandData = async () => {
    try {
      setLoading(true);
      const {
        data: brandData
      } = await supabase.from("brands").select("id").eq("slug", slug).single();
      if (brandData) {
        setBrandId(brandData.id);
        await fetchContentStyles(brandData.id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load brand data");
    } finally {
      setLoading(false);
    }
  };
  const fetchContentStyles = async (brandId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from("content_styles").select("*").eq("brand_id", brandId).order("order_index");
      if (error) throw error;
      setContentStyles(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load content styles");
    }
  };
  const handleDragStart = (e: React.DragEvent, content: ContentStyle) => {
    setDraggedItem(content);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = async (e: React.DragEvent, newPhase: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.phase === newPhase) {
      setDraggedItem(null);
      return;
    }
    try {
      const {
        error
      } = await supabase.from("content_styles").update({
        phase: newPhase
      }).eq("id", draggedItem.id);
      if (error) throw error;
      setContentStyles(prev => prev.map(c => c.id === draggedItem.id ? {
        ...c,
        phase: newPhase
      } : c));
      toast.success(`Moved to ${PHASES.find(p => p.id === newPhase)?.title}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update");
    }
    setDraggedItem(null);
  };
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brandId) return;

    if (!file.type.startsWith('video/')) {
      toast.error("Please upload a video file");
      return;
    }

    setUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${brandId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('content-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content-videos')
        .getPublicUrl(fileName);

      setFormData({ ...formData, video_url: publicUrl });
      toast.success("Video uploaded");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to upload video");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!brandId || !formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    try {
      if (editingContent) {
        const {
          error
        } = await supabase.from("content_styles").update({
          title: formData.title,
          description: formData.description,
          color: formData.color,
          video_url: formData.video_url || null
        }).eq("id", editingContent.id);
        if (error) throw error;
        toast.success("Updated");
      } else {
        const {
          error
        } = await supabase.from("content_styles").insert({
          brand_id: brandId,
          title: formData.title,
          description: formData.description,
          color: formData.color,
          phase: formData.phase,
          video_url: formData.video_url || null,
          order_index: contentStyles.filter(c => c.phase === formData.phase).length
        });
        if (error) throw error;
        toast.success("Created");
      }
      await fetchContentStyles(brandId);
      setDialogOpen(false);
      setEditingContent(null);
      setFormData({
        title: "",
        description: "",
        color: COLORS[0],
        phase: "testing",
        video_url: ""
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to save");
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this content style?")) return;
    try {
      const {
        error
      } = await supabase.from("content_styles").delete().eq("id", id);
      if (error) throw error;
      setContentStyles(prev => prev.filter(c => c.id !== id));
      toast.success("Deleted");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to delete");
    }
  };
  if (loading) {
    return <div className="h-screen w-full bg-[#191919] flex flex-col p-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 rounded-lg" />)}
        </div>
      </div>;
  }
  return <div className="h-screen w-full bg-[#191919] flex flex-col">
      <div className="md:hidden p-4">
        <Button variant="ghost" size="icon" onClick={() => sidebar.setOpenMobile(true)} className="text-white/60 hover:text-white hover:bg-white/10">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Content Planner</h1>
          <p className="text-sm text-white/60 mt-1">Drag cards between phases to organize your content</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PHASES.map(phase => {
          const phaseContent = contentStyles.filter(c => c.phase === phase.id);
          return <div key={phase.id} onDragOver={handleDragOver} onDrop={e => handleDrop(e, phase.id)}>
                <Card className="bg-[#202020] ">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{
                      backgroundColor: phase.color
                    }} />
                        <CardTitle className="text-white text-lg">
                          {phase.title}
                          <span className="ml-2 text-sm text-white/60">({phaseContent.length})</span>
                        </CardTitle>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => {
                    setEditingContent(null);
                    setFormData({
                      title: "",
                      description: "",
                      color: COLORS[0],
                      phase: phase.id,
                      video_url: ""
                    });
                    setDialogOpen(true);
                  }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 min-h-[400px]">
                    {phaseContent.length === 0 ? <div className="text-center py-8 text-white/40 text-sm">Drop cards here</div> : phaseContent.map(content => <div key={content.id} draggable onDragStart={e => handleDragStart(e, content)} className="group bg-[#191919] border border-white/10 rounded-lg p-3 hover:border-white/20 transition-colors cursor-move">
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 mt-1 text-white/40" />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{
                          backgroundColor: content.color
                        }} />
                                <h4 className="text-white font-medium text-sm truncate">
                                  {content.title}
                                </h4>
                              </div>
                              {content.description && <p className="text-white/60 text-xs line-clamp-2">
                                  {content.description}
                                </p>}
                              {content.video_url && (
                                <ContentVideoPlayer 
                                  videoUrl={content.video_url}
                                  className="h-32"
                                />
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10" onClick={() => {
                        setEditingContent(content);
                        setFormData({
                          title: content.title,
                          description: content.description || "",
                          color: content.color,
                          phase: content.phase,
                          video_url: content.video_url || ""
                        });
                        setDialogOpen(true);
                      }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-red-400 hover:bg-red-400/10" onClick={() => handleDelete(content.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>)}
                  </CardContent>
                </Card>
              </div>;
        })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#202020] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editingContent ? "Edit" : "New"} Content Style</DialogTitle>
            <DialogDescription className="text-white/60">
              {editingContent ? "Update" : "Create"} a content style
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/80 mb-1 block">Title</label>
              <Input placeholder="e.g., Product Showcase" value={formData.title} onChange={e => setFormData({
              ...formData,
              title: e.target.value
            })} className="bg-[#191919] border-white/10 text-white" />
            </div>
            <div>
              <label className="text-sm text-white/80 mb-1 block">Description (optional)</label>
              <Textarea placeholder="Brief description..." value={formData.description} onChange={e => setFormData({
              ...formData,
              description: e.target.value
            })} className="bg-[#191919] border-white/10 text-white resize-none" rows={3} />
            </div>
            <div>
              <label className="text-sm text-white/80 mb-2 block">Video (optional)</label>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#191919]">
                  <TabsTrigger value="upload" className="data-[state=active]:bg-white/10">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="url" className="data-[state=active]:bg-white/10">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    URL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="w-full bg-[#191919] border-white/10 text-white hover:bg-white/10"
                  >
                    {uploadingVideo ? "Uploading..." : "Choose Video File"}
                  </Button>
                </TabsContent>
                <TabsContent value="url" className="mt-3">
                  <Input
                    placeholder="Enter video URL"
                    value={formData.video_url}
                    onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                    className="bg-[#191919] border-white/10 text-white"
                  />
                </TabsContent>
              </Tabs>
              {formData.video_url && (
                <div className="mt-3 relative">
                  <ContentVideoPlayer videoUrl={formData.video_url} className="h-40" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormData({ ...formData, video_url: "" })}
                    className="absolute top-2 right-2 h-8 w-8 bg-black/60 hover:bg-black/80 text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-white/80 mb-2 block">Color</label>
              <div className="flex gap-2">
                {COLORS.map(color => <button key={color} className={`w-8 h-8 rounded-full transition-transform ${formData.color === color ? "scale-110 ring-2 ring-white/60" : ""}`} style={{
                backgroundColor: color
              }} onClick={() => setFormData({
                ...formData,
                color
              })} />)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
            setDialogOpen(false);
            setEditingContent(null);
          }} className="text-white/60 hover:text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button onClick={handleCreateOrUpdate}>{editingContent ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}