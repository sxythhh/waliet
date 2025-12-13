import { useState, useEffect } from "react";
import { Plus, MoreVertical, Trash2, Edit2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";

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

export default function Templates() {
  const [templates, setTemplates] = useState<BlueprintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BlueprintTemplate | null>(null);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
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
    setDialogOpen(true);
  };

  const openEditDialog = (template: BlueprintTemplate) => {
    setEditingTemplate(template);
    setFormData({
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
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const templateData = {
      title: formData.title,
      description: formData.description || null,
      content: formData.content || null,
      category: formData.category || null,
      platforms: formData.platforms,
      is_active: formData.is_active,
      hooks: formData.hooks,
      talking_points: formData.talking_points,
      dos_and_donts: formData.dos_and_donts,
      call_to_action: formData.call_to_action || null,
      hashtags: formData.hashtags,
      brand_voice: formData.brand_voice || null
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from("blueprint_templates")
        .update(templateData)
        .eq("id", editingTemplate.id);

      if (error) {
        console.error("Error updating template:", error);
        toast.error("Failed to update template");
        return;
      }
      toast.success("Template updated");
    } else {
      const { error } = await supabase
        .from("blueprint_templates")
        .insert(templateData);

      if (error) {
        console.error("Error creating template:", error);
        toast.error("Failed to create template");
        return;
      }
      toast.success("Template created");
    }

    setDialogOpen(false);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from("blueprint_templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
      return;
    }
    toast.success("Template deleted");
    fetchTemplates();
  };

  const toggleActive = async (template: BlueprintTemplate) => {
    const { error } = await supabase
      .from("blueprint_templates")
      .update({ is_active: !template.is_active })
      .eq("id", template.id);

    if (error) {
      console.error("Error toggling template:", error);
      toast.error("Failed to update template");
      return;
    }
    fetchTemplates();
  };

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const addHook = () => {
    if (!newHook.trim()) return;
    setFormData(prev => ({ ...prev, hooks: [...prev.hooks, newHook.trim()] }));
    setNewHook("");
  };

  const removeHook = (index: number) => {
    setFormData(prev => ({ ...prev, hooks: prev.hooks.filter((_, i) => i !== index) }));
  };

  const addTalkingPoint = () => {
    if (!newTalkingPoint.trim()) return;
    setFormData(prev => ({ ...prev, talking_points: [...prev.talking_points, newTalkingPoint.trim()] }));
    setNewTalkingPoint("");
  };

  const removeTalkingPoint = (index: number) => {
    setFormData(prev => ({ ...prev, talking_points: prev.talking_points.filter((_, i) => i !== index) }));
  };

  const addDo = () => {
    if (!newDo.trim()) return;
    setFormData(prev => ({ 
      ...prev, 
      dos_and_donts: { ...prev.dos_and_donts, dos: [...prev.dos_and_donts.dos, newDo.trim()] } 
    }));
    setNewDo("");
  };

  const removeDo = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      dos_and_donts: { ...prev.dos_and_donts, dos: prev.dos_and_donts.dos.filter((_, i) => i !== index) } 
    }));
  };

  const addDont = () => {
    if (!newDont.trim()) return;
    setFormData(prev => ({ 
      ...prev, 
      dos_and_donts: { ...prev.dos_and_donts, donts: [...prev.dos_and_donts.donts, newDont.trim()] } 
    }));
    setNewDont("");
  };

  const removeDont = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      dos_and_donts: { ...prev.dos_and_donts, donts: prev.dos_and_donts.donts.filter((_, i) => i !== index) } 
    }));
  };

  const addHashtag = () => {
    if (!newHashtag.trim()) return;
    const tag = newHashtag.startsWith("#") ? newHashtag.trim() : `#${newHashtag.trim()}`;
    setFormData(prev => ({ ...prev, hashtags: [...prev.hashtags, tag] }));
    setNewHashtag("");
  };

  const removeHashtag = (index: number) => {
    setFormData(prev => ({ ...prev, hashtags: prev.hashtags.filter((_, i) => i !== index) }));
  };

  const platforms = ["tiktok", "instagram", "youtube", "x"];

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white font-inter tracking-[-0.5px]">Blueprint Templates</h1>
              <p className="text-sm text-muted-foreground mt-1 font-inter tracking-[-0.5px]">
                Create and manage reusable blueprint templates for brands
              </p>
            </div>
            <Button 
              onClick={openCreateDialog}
              className="gap-2 text-white border-t border-t-[#4b85f7] font-geist font-medium text-sm tracking-[-0.5px] rounded-[10px] bg-[#2060df]"
            >
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </div>

          {/* Templates Grid */}
          {loading ? (
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
                            <DropdownMenuItem onClick={() => openEditDialog(template)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(template)}>
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
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-inter tracking-[-0.5px]">
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="font-inter tracking-[-0.5px]">Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Product Review Template"
                    className="font-inter tracking-[-0.5px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-inter tracking-[-0.5px]">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this template..."
                    rows={2}
                    className="font-inter tracking-[-0.5px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-inter tracking-[-0.5px]">Category</Label>
                    <Input
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., E-commerce, SaaS"
                      className="font-inter tracking-[-0.5px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-inter tracking-[-0.5px]">Active</Label>
                    <div className="pt-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Platforms</Label>
                <div className="flex gap-2 flex-wrap">
                  {platforms.map(platform => (
                    <Button
                      key={platform}
                      type="button"
                      variant={formData.platforms.includes(platform) ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePlatform(platform)}
                      className="capitalize font-inter tracking-[-0.5px]"
                    >
                      {platform}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Brief Content */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Brief Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Main content/instructions for the brief..."
                  rows={4}
                  className="font-inter tracking-[-0.5px]"
                />
              </div>

              {/* Brand Voice */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Brand Voice</Label>
                <Textarea
                  value={formData.brand_voice}
                  onChange={e => setFormData(prev => ({ ...prev, brand_voice: e.target.value }))}
                  placeholder="Describe the brand voice and tone..."
                  rows={2}
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
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHook())}
                    className="font-inter tracking-[-0.5px]"
                  />
                  <Button type="button" variant="outline" onClick={addHook}>Add</Button>
                </div>
                {formData.hooks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.hooks.map((hook, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {hook}
                        <button onClick={() => removeHook(i)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Talking Points */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Talking Points</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTalkingPoint}
                    onChange={e => setNewTalkingPoint(e.target.value)}
                    placeholder="Add a talking point..."
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTalkingPoint())}
                    className="font-inter tracking-[-0.5px]"
                  />
                  <Button type="button" variant="outline" onClick={addTalkingPoint}>Add</Button>
                </div>
                {formData.talking_points.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.talking_points.map((point, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {point}
                        <button onClick={() => removeTalkingPoint(i)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Do's */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Do's</Label>
                <div className="flex gap-2">
                  <Input
                    value={newDo}
                    onChange={e => setNewDo(e.target.value)}
                    placeholder="Add a do..."
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDo())}
                    className="font-inter tracking-[-0.5px]"
                  />
                  <Button type="button" variant="outline" onClick={addDo}>Add</Button>
                </div>
                {formData.dos_and_donts.dos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.dos_and_donts.dos.map((item, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1 bg-green-500/10 text-green-500">
                        ✓ {item}
                        <button onClick={() => removeDo(i)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Don'ts */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Don'ts</Label>
                <div className="flex gap-2">
                  <Input
                    value={newDont}
                    onChange={e => setNewDont(e.target.value)}
                    placeholder="Add a don't..."
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDont())}
                    className="font-inter tracking-[-0.5px]"
                  />
                  <Button type="button" variant="outline" onClick={addDont}>Add</Button>
                </div>
                {formData.dos_and_donts.donts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.dos_and_donts.donts.map((item, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1 bg-red-500/10 text-red-500">
                        ✗ {item}
                        <button onClick={() => removeDont(i)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Call to Action */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Call to Action</Label>
                <Input
                  value={formData.call_to_action}
                  onChange={e => setFormData(prev => ({ ...prev, call_to_action: e.target.value }))}
                  placeholder="e.g., Visit our website, Use code SAVE20"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Hashtags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newHashtag}
                    onChange={e => setNewHashtag(e.target.value)}
                    placeholder="Add a hashtag..."
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                    className="font-inter tracking-[-0.5px]"
                  />
                  <Button type="button" variant="outline" onClick={addHashtag}>Add</Button>
                </div>
                {formData.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button onClick={() => removeHashtag(i)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-inter tracking-[-0.5px]">
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="text-white border-t border-t-[#4b85f7] font-geist font-medium text-sm tracking-[-0.5px] rounded-[10px] bg-[#2060df]"
              >
                {editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
