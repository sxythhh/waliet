import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, X, Trash2, Copy, DollarSign, Users, Calendar, Tag } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

// Task categories matching the schema
const TASK_CATEGORIES = [
  { value: "writing", label: "Writing" },
  { value: "design", label: "Design" },
  { value: "development", label: "Development" },
  { value: "marketing", label: "Marketing" },
  { value: "data", label: "Data Entry" },
  { value: "research", label: "Research" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "translation", label: "Translation" },
  { value: "other", label: "Other" },
];

// Task types
const TASK_TYPES = [
  { value: "one_time", label: "One-time" },
  { value: "recurring", label: "Recurring" },
  { value: "milestone", label: "Milestone-based" },
];

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.string().trim().max(2000).optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]*$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
  category: z.string().optional(),
  task_type: z.string().default("one_time"),
  reward_amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Reward amount must be a positive number"
  }),
  max_participants: z.string().optional(),
  deadline: z.string().optional(),
  requirements: z.string().trim().max(2000).optional(),
  tags: z.string().optional(),
  is_private: z.boolean().default(false),
  access_code: z.string().trim().optional(),
  is_featured: z.boolean().default(false),
  requires_approval: z.boolean().default(true),
}).refine(data => {
  if (data.is_private) {
    return data.access_code && data.access_code.length >= 6;
  }
  return true;
}, {
  message: "Access code must be at least 6 characters for private tasks",
  path: ["access_code"]
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface Task {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  category: string | null;
  task_type: string | null;
  reward_amount: number | null;
  max_participants: number | null;
  current_participants: number | null;
  deadline: string | null;
  requirements: string | null;
  tags: string[] | null;
  banner_url: string | null;
  is_private: boolean | null;
  access_code: string | null;
  is_featured: boolean | null;
  status: string | null;
}

interface CreateTaskDialogProps {
  businessId: string;
  businessName: string;
  onSuccess?: () => void;
  task?: Task;
  trigger?: React.ReactNode;
  onDelete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateTaskDialog({
  businessId,
  businessName,
  onSuccess,
  task,
  trigger,
  onDelete,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: CreateTaskDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(task?.banner_url || null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isTaskEnded, setIsTaskEnded] = useState(task?.status === "completed" || task?.status === "cancelled");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      slug: task?.slug || "",
      category: task?.category || "",
      task_type: task?.task_type || "one_time",
      reward_amount: task?.reward_amount?.toString() || "",
      max_participants: task?.max_participants?.toString() || "",
      deadline: task?.deadline ? task.deadline.split('T')[0] : "",
      requirements: task?.requirements || "",
      tags: task?.tags?.join(", ") || "",
      is_private: task?.is_private || false,
      access_code: task?.access_code || "",
      is_featured: task?.is_featured || false,
      requires_approval: true,
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadBanner = async (): Promise<string | null> => {
    if (!bannerFile) return task?.banner_url || null;
    const fileExt = bannerFile.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `tasks/${fileName}`;
    const { error: uploadError } = await supabase.storage.from("task-banners").upload(filePath, bannerFile);
    if (uploadError) {
      // Try campaign-banners bucket as fallback
      const { error: fallbackError } = await supabase.storage.from("campaign-banners").upload(filePath, bannerFile);
      if (fallbackError) throw fallbackError;
      const { data: { publicUrl } } = supabase.storage.from("campaign-banners").getPublicUrl(filePath);
      return publicUrl;
    }
    const { data: { publicUrl } } = supabase.storage.from("task-banners").getPublicUrl(filePath);
    return publicUrl;
  };

  const onSubmit = async (values: TaskFormValues) => {
    setIsSubmitting(true);
    try {
      const bannerUrl = await uploadBanner();

      // Generate slug from title (only for new tasks)
      const generateSlug = (title: string) => {
        const baseSlug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        return `${baseSlug}-${randomSuffix}`;
      };

      // Parse tags from comma-separated string
      const parsedTags = values.tags
        ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : null;

      // For updates, use form value; for new tasks, generate from title
      const slug = task ? values.slug : generateSlug(values.title);

      const taskData = {
        title: values.title,
        description: values.description || null,
        slug: slug || null,
        category: values.category || null,
        task_type: values.task_type || "one_time",
        reward_amount: Number(values.reward_amount) || 0,
        max_participants: values.max_participants ? Number(values.max_participants) : 0,
        deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
        requirements: values.requirements || null,
        tags: parsedTags,
        business_id: businessId,
        banner_url: bannerUrl,
        status: isTaskEnded ? "completed" : "active",
        is_private: values.is_private,
        access_code: values.is_private ? values.access_code?.toUpperCase() : null,
        is_featured: values.is_featured,
      };

      if (task) {
        // Update existing task
        const { error } = await supabase.from("tasks").update(taskData).eq("id", task.id);
        if (error) throw error;
        toast.success("Task updated successfully!");
      } else {
        // Create new task
        const { error } = await supabase.from("tasks").insert(taskData);
        if (error) throw error;
        toast.success("Task created successfully!");
      }

      setOpen(false);
      form.reset();
      setBannerFile(null);
      setBannerPreview(null);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error(`Failed to ${task ? "update" : "create"} task. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Watch form values for preview
  const watchedValues = form.watch();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 p-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] h-full max-h-[90vh]">
          {/* Left Column - Form */}
          <div className="overflow-y-auto p-6 lg:p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-white text-2xl">
                {task ? "Edit Task" : "Create New Task"}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {task ? `Edit task details for ${businessName}` : `Create a new task for ${businessName}`}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Banner Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white">Task Banner</label>
                  <div className="flex flex-col gap-3">
                    {bannerPreview ? (
                      <div className="relative w-full h-56 rounded-xl overflow-hidden bg-[#191919]">
                        <img src={bannerPreview} alt="Task banner" className="w-full h-full object-cover" />
                        <Button type="button" size="icon" className="absolute top-3 right-3 bg-[#191919]/80 hover:bg-destructive" onClick={removeBanner}>
                          <X className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full h-56 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors bg-[#191919]" onClick={() => fileInputRef.current?.click()}>
                        <div className="text-center">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                            <Upload className="h-8 w-8 text-white/60" />
                          </div>
                          <p className="text-sm text-white/80 font-medium mb-1">
                            Click to upload task banner
                          </p>
                          <p className="text-xs text-white/40">
                            Recommended: 1200x400px
                          </p>
                        </div>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>
                </div>

                {/* Title */}
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Task Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" className="bg-[#191919] text-white placeholder:text-white/40 border-white/10" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>
                )} />

                {/* Slug (only for editing) */}
                {task && (
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Task Slug (URL)</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder="task-slug" className="bg-[#191919] text-white placeholder:text-white/40 font-mono border-white/10" {...field} />
                        </FormControl>
                        <Button type="button" size="icon" variant="ghost" className="h-10 w-10 text-white/60 hover:text-white hover:bg-white/10 shrink-0" onClick={() => {
                          navigator.clipboard.writeText(field.value || "");
                          toast.success("Slug copied!");
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-white/40">URL: waliet.app/tasks/{field.value}</p>
                      <FormMessage className="text-destructive/80" />
                    </FormItem>
                  )} />
                )}

                {/* Description */}
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe what needs to be done..." className="resize-none bg-[#191919] text-white placeholder:text-white/40 border-white/10 focus:ring-0" rows={4} {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>
                )} />

                {/* Category and Type */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-[#191919] text-white border-white/10">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#191919] border-white/10">
                          {TASK_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value} className="text-white">{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-destructive/80" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="task_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Task Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-[#191919] text-white border-white/10">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#191919] border-white/10">
                          {TASK_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value} className="text-white">{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-destructive/80" />
                    </FormItem>
                  )} />
                </div>

                {/* Reward and Max Participants */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="reward_amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Reward Amount ($) *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" step="0.01" min="0" className="bg-[#191919] text-white placeholder:text-white/40 border-white/10" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive/80" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="max_participants" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Max Participants</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Unlimited" min="0" className="bg-[#191919] text-white placeholder:text-white/40 border-white/10" {...field} />
                      </FormControl>
                      <p className="text-xs text-white/40">Leave empty for unlimited</p>
                      <FormMessage className="text-destructive/80" />
                    </FormItem>
                  )} />
                </div>

                {/* Deadline */}
                <FormField control={form.control} name="deadline" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-[#191919] text-white placeholder:text-white/40 border-white/10" {...field} />
                    </FormControl>
                    <p className="text-xs text-white/40">Leave empty for no deadline</p>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>
                )} />

                {/* Requirements */}
                <FormField control={form.control} name="requirements" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Requirements</FormLabel>
                    <FormControl>
                      <Textarea placeholder="List any specific requirements or qualifications..." className="resize-none bg-[#191919] text-white placeholder:text-white/40 border-white/10 focus:ring-0" rows={3} {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>
                )} />

                {/* Tags */}
                <FormField control={form.control} name="tags" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="writing, beginner, remote" className="bg-[#191919] text-white placeholder:text-white/40 border-white/10" {...field} />
                    </FormControl>
                    <p className="text-xs text-white/40">Separate tags with commas</p>
                    <FormMessage className="text-destructive/80" />
                  </FormItem>
                )} />

                {/* Settings */}
                <div className="space-y-4 p-4 bg-[#191919]/50 rounded-lg">
                  <FormField control={form.control} name="requires_approval" render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={!field.value} onCheckedChange={checked => field.onChange(!checked)} className="border-white/20 data-[state=checked]:bg-primary" />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="text-white font-normal cursor-pointer">
                          Allow instant applications
                        </FormLabel>
                        <p className="text-xs text-white/40">
                          Users can apply instantly without manual approval
                        </p>
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="is_private" render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-white/20 data-[state=checked]:bg-primary" />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="text-white font-normal cursor-pointer">
                          Make this task private
                        </FormLabel>
                        <p className="text-xs text-white/40">
                          Private tasks require an access code and won't appear publicly
                        </p>
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="is_featured" render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-white/20 data-[state=checked]:bg-primary" />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="text-white font-normal cursor-pointer">
                          Feature this task
                        </FormLabel>
                        <p className="text-xs text-white/40">
                          Featured tasks appear first with a special badge
                        </p>
                      </div>
                    </FormItem>
                  )} />

                  {watchedValues.is_private && (
                    <FormField control={form.control} name="access_code" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Access Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter access code (min 6 characters)" className="bg-[#191919] text-white placeholder:text-white/40 uppercase font-mono tracking-wider border-white/10" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                        </FormControl>
                        <FormMessage className="text-destructive/80" />
                      </FormItem>
                    )} />
                  )}
                </div>

                {/* Mark as Ended Toggle */}
                {task && (
                  <div className="flex items-center justify-between rounded-lg p-4 bg-[#191919]">
                    <div>
                      <p className="text-white font-medium">Mark Task as Completed</p>
                      <p className="text-xs text-white/40 mt-1">
                        Completed tasks will be visible but not accepting new applicants
                      </p>
                    </div>
                    <Switch checked={isTaskEnded} onCheckedChange={setIsTaskEnded} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between gap-3 pt-4">
                  <div>
                    {task && onDelete && (
                      <Button type="button" variant="ghost" onClick={() => setDeleteDialogOpen(true)} disabled={isSubmitting} className="text-destructive/60 hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Task
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => {
                      setOpen(false);
                      form.reset();
                      setBannerFile(null);
                      setBannerPreview(null);
                    }} disabled={isSubmitting} className="text-white/60 hover:text-white hover:bg-white/10">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white min-w-[140px]">
                      {isSubmitting ? (task ? "Updating..." : "Creating...") : (task ? "Update Task" : "Create Task")}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </div>

          {/* Right Column - Preview */}
          <div className="hidden lg:flex flex-col bg-muted p-6 overflow-y-auto">
            <div className="flex items-center gap-2 text-white/40 mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm font-medium">Preview</span>
            </div>

            {/* Task Summary Card */}
            <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4 mb-6">
              <h4 className="text-sm font-medium text-white/60 mb-4">Task Summary</h4>
              <div className="space-y-3">
                {/* Reward */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Reward</span>
                  <span className="text-sm font-semibold text-green-400">
                    {watchedValues.reward_amount ? `$${Number(watchedValues.reward_amount).toLocaleString()}` : "—"}
                  </span>
                </div>
                {/* Category */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Category</span>
                  <span className="text-sm font-medium text-white capitalize">
                    {watchedValues.category || "—"}
                  </span>
                </div>
                {/* Type */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Type</span>
                  <span className="text-sm font-medium text-white capitalize">
                    {watchedValues.task_type?.replace("_", " ") || "One-time"}
                  </span>
                </div>
                {/* Divider */}
                <div className="border-t border-white/10 my-2" />
                {/* Max Participants */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Spots</span>
                  <span className="text-sm font-medium text-white">
                    {watchedValues.max_participants ? `${watchedValues.max_participants} max` : "Unlimited"}
                  </span>
                </div>
                {/* Deadline */}
                {watchedValues.deadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/40">Deadline</span>
                    <span className="text-sm font-medium text-white">
                      {format(new Date(watchedValues.deadline), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Task Preview Card */}
            <div className="rounded-xl overflow-hidden bg-muted">
              {/* Banner */}
              <div className="relative w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5">
                {bannerPreview || task?.banner_url ? (
                  <img src={bannerPreview || task?.banner_url || ''} alt="Task banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Upload className="h-12 w-12 text-white/20" />
                  </div>
                )}
              </div>

              {/* Task Info */}
              <div className="p-4 space-y-4 bg-[#0a0a0a]">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {watchedValues.is_featured && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Featured
                    </Badge>
                  )}
                  {watchedValues.is_private && (
                    <Badge variant="outline" className="bg-white/5 text-white/60 border-white/10">
                      Private
                    </Badge>
                  )}
                  {watchedValues.category && (
                    <Badge variant="secondary" className="capitalize">
                      {watchedValues.category}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white line-clamp-2">
                  {watchedValues.title || "Task Title"}
                </h3>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-green-400">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold">
                      {watchedValues.reward_amount ? `$${Number(watchedValues.reward_amount).toLocaleString()}` : "—"}
                    </span>
                  </div>
                  {watchedValues.max_participants && (
                    <div className="flex items-center gap-1.5 text-white/60">
                      <Users className="w-4 h-4" />
                      <span>{watchedValues.max_participants} spots</span>
                    </div>
                  )}
                  {watchedValues.deadline && (
                    <div className="flex items-center gap-1.5 text-white/60">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(watchedValues.deadline), "MMM d")}</span>
                    </div>
                  )}
                </div>

                {/* Tags Preview */}
                {watchedValues.tags && (
                  <div className="flex flex-wrap gap-1.5">
                    {watchedValues.tags.split(',').slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-white/5 border-white/10">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Description Preview */}
                {watchedValues.description && (
                  <p className="text-sm text-white/60 line-clamp-3">
                    {watchedValues.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#202020] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete <strong className="text-white">{task?.title}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setDeleteDialogOpen(false);
              setOpen(false);
              onDelete?.();
            }} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
