import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

export default function BlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    author: "Virality Team",
    category: "",
    image_url: "",
    read_time: "",
    is_published: false,
  });

  useEffect(() => {
    fetchPosts();
  }, []);

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
    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const openCreateDialog = () => {
    setEditingPost(null);
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      author: "Virality Team",
      category: "",
      image_url: "",
      read_time: "",
      is_published: false,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      author: post.author,
      category: post.category || "",
      image_url: post.image_url || "",
      read_time: post.read_time || "",
      is_published: post.is_published,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    const slug = formData.slug || generateSlug(formData.title);

    const postData = {
      title: formData.title,
      slug,
      excerpt: formData.excerpt || null,
      content: formData.content,
      author: formData.author,
      category: formData.category || null,
      image_url: formData.image_url || null,
      read_time: formData.read_time || null,
      is_published: formData.is_published,
      published_at: formData.is_published ? new Date().toISOString() : null,
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
        setDialogOpen(false);
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
        setDialogOpen(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
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

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-inter tracking-[-0.5px] font-semibold">Blog Posts</h1>
            <p className="text-muted-foreground text-sm font-inter tracking-[-0.5px]">
              Manage blog content
            </p>
          </div>
          <Button onClick={openCreateDialog} className="font-inter tracking-[-0.5px]">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>

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
              {loading ? (
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
                          onClick={() => openEditDialog(post)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(post.id)}
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
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      title: e.target.value,
                      slug: formData.slug || generateSlug(e.target.value)
                    });
                  }}
                  placeholder="Post title"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="post-slug"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Creator Tips"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Read Time</Label>
                <Input
                  value={formData.read_time}
                  onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                  placeholder="e.g., 5 min read"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Author</Label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Image URL</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Excerpt</Label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief description for previews..."
                rows={2}
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Content * (Markdown supported)</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your blog post content here...

Use ## for headings
Use **text** for bold
Use - for lists"
                rows={12}
                className="font-inter tracking-[-0.5px] font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label className="font-inter tracking-[-0.5px]">Publish immediately</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-inter tracking-[-0.5px]">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="font-inter tracking-[-0.5px]">
              {saving ? "Saving..." : editingPost ? "Save Changes" : "Create Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
