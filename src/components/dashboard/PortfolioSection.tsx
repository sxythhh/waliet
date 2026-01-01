import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  Plus,
  Trash2,
  Upload,
  GripVertical,
  ExternalLink,
  Loader2,
} from "lucide-react";

export interface PortfolioItem {
  id: string;
  type: "image" | "video" | "pdf" | "link";
  url: string;
  title: string;
  description?: string;
  order_index: number;
}

interface PortfolioSectionProps {
  userId: string;
  portfolioItems: PortfolioItem[];
  resumeUrl: string | null;
  onUpdate: (items: PortfolioItem[], resumeUrl: string | null) => void;
}

export function PortfolioSection({
  userId,
  portfolioItems,
  resumeUrl,
  onUpdate,
}: PortfolioSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<PortfolioItem>>({
    type: "link",
    title: "",
    url: "",
    description: "",
  });
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF only)
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = "pdf";
      const fileName = `${userId}/resume.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolios")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("portfolios")
        .getPublicUrl(fileName);

      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ resume_url: urlWithTimestamp })
        .eq("id", userId);

      if (updateError) throw updateError;

      onUpdate(portfolioItems, urlWithTimestamp);
      toast.success("Resume uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading resume:", error);
      toast.error(error.message || "Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveResume = async () => {
    try {
      const fileName = `${userId}/resume.pdf`;
      await supabase.storage.from("portfolios").remove([fileName]);

      const { error } = await supabase
        .from("profiles")
        .update({ resume_url: null })
        .eq("id", userId);

      if (error) throw error;

      onUpdate(portfolioItems, null);
      toast.success("Resume removed");
    } catch (error: any) {
      console.error("Error removing resume:", error);
      toast.error("Failed to remove resume");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      toast.error("Please upload an image or PDF file");
      return;
    }

    const maxSize = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File must be less than ${isPdf ? "10MB" : "5MB"}`);
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileId = crypto.randomUUID();
      const fileName = `${userId}/portfolio/${fileId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolios")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("portfolios")
        .getPublicUrl(fileName);

      const newPortfolioItem: PortfolioItem = {
        id: fileId,
        type: isPdf ? "pdf" : "image",
        url: publicUrl,
        title: newItem.title || file.name,
        description: newItem.description,
        order_index: portfolioItems.length,
      };

      const updatedItems = [...portfolioItems, newPortfolioItem];

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ portfolio_items: updatedItems })
        .eq("id", userId);

      if (updateError) throw updateError;

      onUpdate(updatedItems, resumeUrl);
      setAddDialogOpen(false);
      setNewItem({ type: "link", title: "", url: "", description: "" });
      toast.success("Portfolio item added");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!newItem.url || !newItem.title) {
      toast.error("Please provide a title and URL");
      return;
    }

    // Validate URL
    try {
      new URL(newItem.url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      const newPortfolioItem: PortfolioItem = {
        id: crypto.randomUUID(),
        type: newItem.type as PortfolioItem["type"],
        url: newItem.url,
        title: newItem.title,
        description: newItem.description,
        order_index: portfolioItems.length,
      };

      const updatedItems = [...portfolioItems, newPortfolioItem];

      const { error } = await supabase
        .from("profiles")
        .update({ portfolio_items: updatedItems })
        .eq("id", userId);

      if (error) throw error;

      onUpdate(updatedItems, resumeUrl);
      setAddDialogOpen(false);
      setNewItem({ type: "link", title: "", url: "", description: "" });
      toast.success("Portfolio item added");
    } catch (error: any) {
      console.error("Error adding link:", error);
      toast.error("Failed to add portfolio item");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const item = portfolioItems.find((i) => i.id === itemId);
      const updatedItems = portfolioItems.filter((i) => i.id !== itemId);

      // If it's a file, remove from storage
      if (item && (item.type === "image" || item.type === "pdf")) {
        const urlPath = new URL(item.url).pathname;
        const fileName = urlPath.split("/portfolios/")[1];
        if (fileName) {
          await supabase.storage.from("portfolios").remove([fileName]);
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({ portfolio_items: updatedItems })
        .eq("id", userId);

      if (error) throw error;

      onUpdate(updatedItems, resumeUrl);
      toast.success("Portfolio item removed");
    } catch (error: any) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4" />;
      default:
        return <Link2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Resume Section */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium tracking-[-0.5px]">Resume / CV</CardTitle>
          <CardDescription className="text-xs tracking-[-0.5px]">
            Upload your resume to share with brands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={resumeInputRef}
            type="file"
            accept=".pdf"
            onChange={handleResumeUpload}
            className="hidden"
          />
          {resumeUrl ? (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Resume.pdf</p>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resumeInputRef.current?.click()}
                  disabled={uploading}
                >
                  Replace
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveResume}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => resumeInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-20 border-dashed"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Resume (PDF, max 10MB)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Items Section */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium tracking-[-0.5px]">Portfolio</CardTitle>
              <CardDescription className="text-xs tracking-[-0.5px]">
                Showcase your best work
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Portfolio Item</DialogTitle>
                  <DialogDescription>
                    Add a link, image, or PDF to your portfolio
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newItem.type}
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, type: value as PortfolioItem["type"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">
                          <span className="flex items-center gap-2">
                            <Link2 className="h-4 w-4" /> Link
                          </span>
                        </SelectItem>
                        <SelectItem value="video">
                          <span className="flex items-center gap-2">
                            <Video className="h-4 w-4" /> Video Link
                          </span>
                        </SelectItem>
                        <SelectItem value="image">
                          <span className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> Image Upload
                          </span>
                        </SelectItem>
                        <SelectItem value="pdf">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> PDF Upload
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="My Project"
                    />
                  </div>

                  {(newItem.type === "link" || newItem.type === "video") && (
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <Input
                        value={newItem.url}
                        onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Brief description"
                    />
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={newItem.type === "image" ? "image/*" : ".pdf"}
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    {newItem.type === "image" || newItem.type === "pdf" ? (
                      <Button
                        className="flex-1"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || !newItem.title}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload File
                      </Button>
                    ) : (
                      <Button
                        className="flex-1"
                        onClick={handleAddLink}
                        disabled={!newItem.title || !newItem.url}
                      >
                        Add Link
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {portfolioItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No portfolio items yet</p>
              <p className="text-xs">Add links, images, or PDFs to showcase your work</p>
            </div>
          ) : (
            <div className="space-y-2">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
                >
                  <div className="p-2 bg-muted rounded-md">{getItemIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-muted rounded"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 hover:bg-destructive/10 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
